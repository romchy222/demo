
import React, { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Agent, Doc, Message, User } from '../types';
import { GEMINI_MODEL_NAME, getAgentResponse, hasGeminiApiKey } from '../services/geminiService';
import { makeId } from '../services/id';
import { useI18n } from '../i18n/i18n';
import { neonApi } from '../services/neonApi';

interface ChatWindowProps {
  agent: Agent;
}

const ChatWindow: React.FC<ChatWindowProps> = ({ agent }) => {
  const { t, locale } = useI18n();
  const agentName = t(agent.nameKey ?? '', undefined, agent.name);
  const agentFullName = t(agent.fullNameKey ?? '', undefined, agent.fullName);
  const [messages, setMessages] = useState<Message[]>([]);
  const [feedbackByMessageId, setFeedbackByMessageId] = useState<Record<string, 1 | -1>>({});
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [attachment, setAttachment] = useState<string | null>(null);
  const [useDocs, setUseDocs] = useState(true);
  const [docs, setDocs] = useState<Doc[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const sendRef = useRef<(override?: { text?: string; attachment?: string | null }) => void>(() => {});
  
  const user: User = JSON.parse(localStorage.getItem('bolashak_auth_session') || '{}');
  const hasApiKey = hasGeminiApiKey();

  useEffect(() => {
    let canceled = false;
    (async () => {
      try {
        const history = await neonApi.messages.listByUserAndAgent(user.id, agent.id);
        if (!canceled) setMessages(history);
      } catch (e) {
        console.error(e);
        if (!canceled) setMessages([]);
      }
    })();
    return () => {
      canceled = true;
    };
  }, [agent.id, user.id]);

  useEffect(() => {
    let canceled = false;
    (async () => {
      try {
        const list = await neonApi.docs.listByUser(user.id);
        if (!canceled) setDocs(list);
      } catch (e) {
        console.error(e);
        if (!canceled) setDocs([]);
      }
    })();
    return () => {
      canceled = true;
    };
  }, [user.id]);

  useEffect(() => {
    let canceled = false;
    (async () => {
      try {
        const candidates = messages.filter(m => m.role === 'model').slice(-40).map(m => m.id);
        const uniq = [...new Set(candidates)].filter(Boolean);
        const rows = await Promise.all(
          uniq.map(async (id) => {
            try {
              const fb = await neonApi.feedback.getByMessage(id);
              return fb ? ([id, fb.rating] as const) : null;
            } catch {
              return null;
            }
          })
        );
        if (canceled) return;
        const next: Record<string, 1 | -1> = {};
        for (const r of rows) {
          if (!r) continue;
          next[r[0]] = r[1];
        }
        setFeedbackByMessageId(prev => ({ ...prev, ...next }));
      } catch {
        // ignore
      }
    })();
    return () => {
      canceled = true;
    };
  }, [messages]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
    }
  }, [messages, isLoading, attachment]);

  useEffect(() => {
    const onPrompt = (e: any) => {
      const detail = e?.detail;
      if (!detail || detail.agentId !== agent.id) return;
      const text = String(detail.text || '').trim();
      if (!text) return;
      sendRef.current({ text });
    };

    window.addEventListener('bolashak:agent-prompt', onPrompt as any);
    return () => window.removeEventListener('bolashak:agent-prompt', onPrompt as any);
  }, [agent.id]);

  const download = (filename: string, content: string, mime = 'text/plain;charset=utf-8') => {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const exportChatMarkdown = () => {
    const now = new Date().toISOString();
    const lines: string[] = [];
    lines.push(`# ${t('chat.export.md.title', { agent: agentName })}`);
    lines.push(`- ${t('chat.export.md.user')}: ${user.name} (${user.email})`);
    lines.push(`- ${t('chat.export.md.exportedAt')}: ${now}`);
    lines.push('');

    for (const m of messages) {
      const ts = new Date(m.timestamp).toLocaleString(locale);
      const who = m.role === 'user' ? 'USER' : 'AI';
      const latency = m.role === 'model' && m.latencyMs != null ? ` (latency ${Math.round(m.latencyMs)}ms)` : '';
      lines.push(`## ${ts} — ${who}${latency}`);
      lines.push(m.content || '');
      if (m.attachment) lines.push(`\n${t('chat.export.md.attachment')}`);
      lines.push('');
    }

    download(`chat_${agent.id}_${now.replace(/[:.]/g, '-')}.md`, lines.join('\n'), 'text/markdown;charset=utf-8');
    void neonApi.audit.log({ actorUserId: user.id, type: 'chat_export', details: { agentId: agent.id, format: 'md' } });
  };

  const clearChat = () => {
    if (!confirm(t('chat.confirm.clear', { name: agentName }))) return;
    void neonApi.messages.clear(user.id, agent.id);
    setMessages([]);
    void neonApi.audit.log({ actorUserId: user.id, type: 'chat_clear', details: { agentId: agent.id } });
  };

  const scoreDoc = (query: string, doc: Doc): number => {
    const q = query.toLowerCase();
    const text = `${doc.title}\n${doc.content}`.toLowerCase();
    const tokens = q.split(/[\s,.;:!?()[\]{}"“”'’]+/g).filter(t => t.length >= 3);
    let score = 0;
    for (const t of tokens) {
      if (text.includes(t)) score += 1;
    }
    return score;
  };

  const buildDocsContext = (query: string, allDocs: Doc[]): string | null => {
    if (!query.trim() || allDocs.length === 0) return null;

    const ranked = [...allDocs]
      .map(d => ({ d, score: scoreDoc(query, d) }))
      .filter(x => x.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 2)
      .map(x => x.d);

    if (ranked.length === 0) return null;

    const maxChars = 3500;
    let out = '';
    for (const d of ranked) {
      const chunk = d.content.length > 1600 ? `${d.content.slice(0, 1600)}\n…` : d.content;
      const block = `### ${d.title}\n${chunk}\n\n`;
      if ((out + block).length > maxChars) break;
      out += block;
    }
    return out.trim() || null;
  };

  const setRating = (messageId: string, rating: 1 | -1) => {
    void neonApi.feedback.upsert({
      id: makeId('f_'),
      messageId,
      userId: user.id,
      agentId: agent.id,
      rating,
      createdAt: new Date().toISOString()
    });
    void neonApi.audit.log({ actorUserId: user.id, type: 'feedback', details: { agentId: agent.id, messageId, rating } });
    setFeedbackByMessageId(prev => ({ ...prev, [messageId]: rating }));
  };

  // Голосовой ввод (Web Speech API)
  const toggleListening = () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      alert(t('chat.alert.voiceUnsupported'));
      return;
    }
    
    if (isListening) {
      setIsListening(false);
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.lang = locale;
    recognition.interimResults = false;

    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);
    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setInput(prev => prev + (prev ? ' ' : '') + transcript);
    };

    recognition.start();
  };

  // Синтез речи (TTS)
  const speakText = (text: string) => {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = locale;
    utterance.rate = 1.1;
    window.speechSynthesis.speak(utterance);
  };

  // Обработка файла
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setAttachment(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSend = async (override?: { text?: string; attachment?: string | null }) => {
    const text = override?.text ?? input;
    const att = override?.attachment ?? attachment;
    if ((!text.trim() && !att) || isLoading) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      userId: user.id,
      agentId: agent.id,
      role: 'user',
      content: text,
      attachment: att || undefined,
      timestamp: new Date().toISOString()
    };

    setMessages(prev => [...prev, userMsg]);
    void neonApi.messages.save(userMsg);
    if (!override?.text) setInput('');
    if (!override?.attachment) setAttachment(null);
    setIsLoading(true);

    const historyForAi = messages.slice(-8).map(m => ({
      role: m.role,
      content: m.content
    }));

    const docsContext = useDocs ? buildDocsContext(userMsg.content, docs) : null;
    const promptForAi = docsContext
      ? `${userMsg.content}\n\n---\n${t('chat.docsContextHeader')}\n${docsContext}`
      : userMsg.content;

    if (docsContext) {
      void neonApi.audit.log({ actorUserId: user.id, type: 'docs_context_used', details: { agentId: agent.id } });
    }

    const startedAt = performance.now();
    const aiResponse = await getAgentResponse(agent.instruction, historyForAi, promptForAi, userMsg.attachment);
    const latencyMs = Math.round(performance.now() - startedAt);

    const botMsg: Message = {
      id: (Date.now() + 1).toString(),
      userId: user.id,
      agentId: agent.id,
      role: 'model',
      content: aiResponse,
      latencyMs,
      timestamp: new Date().toISOString()
    };

    setMessages(prev => [...prev, botMsg]);
    void neonApi.messages.save(botMsg);
    void neonApi.audit.log({ actorUserId: user.id, type: 'ai_response', details: { agentId: agent.id, latencyMs } });
    setIsLoading(false);
  };

  sendRef.current = handleSend;

  return (
    <div className="flex flex-col h-full bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden animate-fade-in relative">
      {/* Header */}
      <div className={`p-4 border-b flex items-center justify-between ${agent.bgColor} backdrop-blur-md bg-opacity-90`}>
        <div className="flex items-center gap-4">
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-xl shadow-sm bg-white ${agent.color} relative`}>
            <i className={`fas ${agent.icon}`}></i>
            <div className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-500 rounded-full border-2 border-white animate-pulse"></div>
          </div>
          <div>
            <h2 className="font-bold text-slate-800 text-lg flex items-center gap-2">
              {agentName}
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] uppercase tracking-widest border ${hasApiKey ? 'bg-white/50 text-slate-600 border-slate-200' : 'bg-rose-50 text-rose-600 border-rose-200'}`}
                title={hasApiKey ? `Model: ${GEMINI_MODEL_NAME}` : t('chat.noKey')}
              >
                {hasApiKey ? GEMINI_MODEL_NAME : 'NO KEY'}
              </span>
            </h2>
            <p className="text-xs text-slate-600 font-medium">{agentFullName}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
            <button
              onClick={() => setUseDocs(v => !v)}
              disabled={docs.length === 0}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold border shadow-sm transition-all flex items-center gap-2 ${
                useDocs && docs.length > 0
                  ? 'bg-emerald-600 text-white border-emerald-700'
                  : 'bg-white/50 hover:bg-white text-slate-700 border border-white'
              } ${docs.length === 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
              title={docs.length > 0 ? t('chat.useDocsTitle', { count: docs.length }) : t('chat.useDocsNoneTitle')}
            >
              <i className="fas fa-file-lines"></i> {t('chat.docsButton')}
            </button>

            <button
              onClick={exportChatMarkdown}
              className="px-3 py-1.5 bg-white/50 hover:bg-white rounded-xl text-xs font-bold text-slate-700 border border-white shadow-sm transition-all flex items-center gap-2"
              title={t('chat.export.title')}
            >
              <i className="fas fa-download"></i> {t('chat.export.button')}
            </button>

            <button
              onClick={clearChat}
              className="px-3 py-1.5 bg-white/50 hover:bg-white rounded-xl text-xs font-bold text-rose-600 border border-white shadow-sm transition-all flex items-center gap-2"
              title={t('chat.clearTitle')}
            >
              <i className="fas fa-trash-alt"></i>
            </button>
        </div>
      </div>

      {/* Messages Area */}
      <div ref={scrollRef} className="flex-1 min-h-0 overflow-y-auto p-6 space-y-8 bg-slate-50/50">
        {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-slate-400 opacity-50">
                <i className={`fas ${agent.icon} text-6xl mb-4`}></i>
                <p className="text-sm font-medium">{t('chat.startDialog', { name: agentName })}</p>
            </div>
        )}
        {messages.map((m) => (
          <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'} group`}>
            <div className="flex flex-col gap-1 max-w-[85%]">
                <div className={`rounded-2xl px-6 py-4 shadow-sm relative ${
                m.role === 'user' 
                    ? 'bg-slate-900 text-white rounded-tr-sm' 
                    : 'bg-white text-slate-800 border border-slate-200 rounded-tl-sm'
                }`}>
                {m.attachment && (
                    <div className="mb-3 rounded-xl overflow-hidden border border-white/20">
                        <img src={m.attachment} alt="attachment" className="max-h-48 w-auto object-cover" />
                    </div>
                )}
                <div className="prose prose-slate prose-sm max-w-none dark:prose-invert">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{m.content}</ReactMarkdown>
                </div>
                {m.role === 'model' && (
                    <div className="absolute -bottom-9 left-0 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                        <button 
                            onClick={() => speakText(m.content)}
                            className="text-slate-400 hover:text-amber-500 p-2 transition-colors rounded-lg hover:bg-slate-50"
                            title={t('chat.speak')}
                        >
                            <i className="fas fa-volume-up"></i>
                        </button>
                        <button
                            onClick={() => navigator.clipboard.writeText(m.content || '')}
                            className="text-slate-400 hover:text-indigo-600 p-2 transition-colors rounded-lg hover:bg-slate-50"
                            title={t('chat.copyAnswer')}
                        >
                            <i className="fas fa-copy"></i>
                        </button>
                        {(() => {
                            const fb = feedbackByMessageId[m.id] ? { rating: feedbackByMessageId[m.id] } : undefined;
                            const upActive = fb?.rating === 1;
                            const downActive = fb?.rating === -1;
                            return (
                                <>
                                    <button
                                        onClick={() => setRating(m.id, 1)}
                                        className={`p-2 transition-colors rounded-lg hover:bg-slate-50 ${
                                            upActive ? 'text-emerald-600' : 'text-slate-400 hover:text-emerald-600'
                                        }`}
                                        title={t('chat.helpful')}
                                    >
                                        <i className="fas fa-thumbs-up"></i>
                                    </button>
                                    <button
                                        onClick={() => setRating(m.id, -1)}
                                        className={`p-2 transition-colors rounded-lg hover:bg-slate-50 ${
                                            downActive ? 'text-rose-600' : 'text-slate-400 hover:text-rose-600'
                                        }`}
                                        title={t('chat.notHelpful')}
                                    >
                                        <i className="fas fa-thumbs-down"></i>
                                    </button>
                                </>
                            );
                        })()}
                    </div>
                )}
                </div>
                <span className={`text-[10px] font-bold text-slate-300 px-1 ${m.role === 'user' ? 'text-right' : 'text-left'}`}>
                    {new Date(m.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                    {m.role === 'model' && m.latencyMs != null && <span className="ml-2 text-slate-300/70">• {Math.round(m.latencyMs / 10) / 100}s</span>}
                </span>
            </div>
          </div>
        ))}
        {isLoading && (
            <div className="flex justify-start">
                <div className="bg-white px-6 py-4 rounded-2xl rounded-tl-sm border border-slate-200 shadow-sm flex items-center gap-3">
                    <div className="flex gap-1">
                        <div className="w-2 h-2 bg-amber-500 rounded-full animate-bounce"></div>
                        <div className="w-2 h-2 bg-amber-500 rounded-full animate-bounce delay-100"></div>
                        <div className="w-2 h-2 bg-amber-500 rounded-full animate-bounce delay-200"></div>
                    </div>
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">{t('chat.processing')}</span>
                </div>
            </div>
        )}
      </div>

      {/* Input Area */}
      <div className="p-4 bg-white border-t border-slate-100">
        {attachment && (
            <div className="mb-2 flex items-center gap-2 bg-slate-100 px-3 py-2 rounded-lg w-fit">
                <i className="fas fa-image text-slate-500"></i>
                <span className="text-xs text-slate-600 font-bold">{t('chat.attachmentAdded')}</span>
                <button onClick={() => setAttachment(null)} className="text-rose-500 hover:text-rose-700 ml-2">
                    <i className="fas fa-times"></i>
                </button>
            </div>
        )}
        <div className="flex gap-3 bg-slate-50 rounded-2xl p-2 border border-slate-200 focus-within:ring-2 ring-amber-500/20 transition-all">
          <button 
             onClick={() => fileInputRef.current?.click()}
             className="w-10 h-10 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition-all flex items-center justify-center"
             title={t('chat.attachTitle')}
          >
            <i className="fas fa-paperclip"></i>
          </button>
          <input 
            type="file" 
            ref={fileInputRef} 
            className="hidden" 
            accept="image/*"
            onChange={handleFileChange}
          />
          
          <textarea 
            rows={1}
            placeholder={isListening ? t('chat.listening') : t('chat.writeMessage')}
            className="flex-1 bg-transparent border-none px-2 py-2.5 outline-none text-sm font-medium resize-none"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleSend())}
          />

          <button 
             onClick={toggleListening}
             className={`w-10 h-10 rounded-xl transition-all flex items-center justify-center ${
                 isListening ? 'bg-rose-500 text-white animate-pulse' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-200'
             }`}
             title={t('chat.voiceInput')}
          >
            <i className={`fas ${isListening ? 'fa-microphone-slash' : 'fa-microphone'}`}></i>
          </button>

          <button 
            onClick={() => handleSend()}
            disabled={(!input.trim() && !attachment) || isLoading}
            className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-md transition-all ${
                (!input.trim() && !attachment) || isLoading 
                ? 'bg-slate-200 text-slate-400' 
                : 'bg-slate-900 text-white hover:bg-amber-500 hover:text-slate-900'
            }`}
          >
            <i className="fas fa-arrow-up"></i>
          </button>
        </div>
        <div className="text-center mt-2">
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                {hasApiKey ? `AI: ${GEMINI_MODEL_NAME}` : 'AI: OFFLINE (NO KEY)'}
            </p>
        </div>
      </div>
    </div>
  );
};

export default ChatWindow;
