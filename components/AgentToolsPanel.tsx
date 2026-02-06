import React, { useEffect, useMemo, useState } from 'react';
import type { Agent, AgentId, CaseMessage, UiItem, WorkflowCase } from '../types';
import { useI18n } from '../i18n/i18n';
import { createWorkflowCase, getCaseMessages, getCases, getUiItems, postCaseMessage, updateWorkflowCase } from '../services/agentDataService';

type PanelProps = {
  agent: Agent;
  userId: string;
};

function sendToChat(agentId: AgentId, text: string) {
  window.dispatchEvent(new CustomEvent('bolashak:agent-prompt', { detail: { agentId, text, autoSend: true } }));
}

function statusLabel(t: (key: string, params?: any, fallback?: string) => string, status: WorkflowCase['status']) {
  switch (status) {
    case 'OPEN':
      return t('case.status.OPEN', undefined, 'Открыто');
    case 'IN_PROGRESS':
      return t('case.status.IN_PROGRESS', undefined, 'В работе');
    case 'RESOLVED':
      return t('case.status.RESOLVED', undefined, 'Решено');
    case 'CLOSED':
      return t('case.status.CLOSED', undefined, 'Закрыто');
  }
}

export const AgentToolsPanel: React.FC<PanelProps> = ({ agent, userId }) => {
  const { t } = useI18n();
  const [loading, setLoading] = useState(false);

  const [categories, setCategories] = useState<UiItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [quick, setQuick] = useState<UiItem[]>([]);
  const [reference, setReference] = useState<UiItem[]>([]);

  const [topics, setTopics] = useState<UiItem[]>([]);
  const [selectedTopic, setSelectedTopic] = useState<string>('');
  const [procedures, setProcedures] = useState<UiItem[]>([]);

  const [requests, setRequests] = useState<UiItem[]>([]);
  const [selectedRequest, setSelectedRequest] = useState<string>('');
  const [schedules, setSchedules] = useState<UiItem[]>([]);

  const [directions, setDirections] = useState<UiItem[]>([]);
  const [selectedDirection, setSelectedDirection] = useState<string>('');
  const [resumeTips, setResumeTips] = useState<UiItem[]>([]);

  const [cases, setCases] = useState<WorkflowCase[]>([]);
  const [activeCaseId, setActiveCaseId] = useState<string | null>(null);
  const [caseMessages, setCaseMessages] = useState<CaseMessage[]>([]);
  const [caseInput, setCaseInput] = useState('');

  const activeCase = useMemo(() => cases.find(c => c.id === activeCaseId) || null, [cases, activeCaseId]);

  const refresh = async () => {
    setLoading(true);
    try {
      if (agent.id === 'abitur') {
        const cats = await getUiItems(agent.id, 'category');
        setCategories(cats);
        const defaultCat = cats[0]?.title ?? '';
        setSelectedCategory(prev => prev || defaultCat);
        setReference(await getUiItems(agent.id, 'reference'));
      }

      if (agent.id === 'kadr') {
        const tops = await getUiItems(agent.id, 'topic');
        setTopics(tops);
        const defaultTopic = tops[0]?.title ?? '';
        setSelectedTopic(prev => prev || defaultTopic);
        setQuick(await getUiItems(agent.id, 'quick'));
      }

      if (agent.id === 'nav') {
        const reqs = await getUiItems(agent.id, 'request');
        setRequests(reqs);
        setSelectedRequest(prev => prev || (reqs[0]?.title ?? ''));
        setSchedules(await getUiItems(agent.id, 'schedule'));
        setCases(await getCases(userId, agent.id));
      }

      if (agent.id === 'career') {
        const dirs = await getUiItems(agent.id, 'direction');
        setDirections(dirs);
        setSelectedDirection(prev => prev || (dirs[0]?.title ?? ''));
        setResumeTips(await getUiItems(agent.id, 'resume_tip'));
      }

      if (agent.id === 'room') {
        const reqs = await getUiItems(agent.id, 'request');
        setRequests(reqs);
        setSelectedRequest(prev => prev || (reqs[0]?.title ?? ''));
        setCases(await getCases(userId, agent.id));
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [agent.id, userId]);

  useEffect(() => {
    if (agent.id !== 'abitur') return;
    (async () => setQuick(await getUiItems(agent.id, 'quick', selectedCategory)))();
  }, [agent.id, selectedCategory]);

  useEffect(() => {
    if (agent.id !== 'kadr') return;
    (async () => setProcedures(await getUiItems(agent.id, 'procedure', selectedTopic)))();
  }, [agent.id, selectedTopic]);

  useEffect(() => {
    if (!activeCaseId) {
      setCaseMessages([]);
      return;
    }
    (async () => setCaseMessages(await getCaseMessages(activeCaseId)))();
  }, [activeCaseId]);

  const createCaseFromSelection = async () => {
    const caseType = selectedRequest || 'Обращение';
    const created = await createWorkflowCase({
      userId,
      agentId: agent.id,
      caseType,
      title: caseType,
      payload: { source: 'ui' }
    });
    setCases(prev => [created, ...prev]);
    setActiveCaseId(created.id);
    sendToChat(agent.id, `Создай обращение: ${caseType}. Я только что открыл(а) обращение в системе, помоги оформить текст обращения (кратко, по пунктам).`);
  };

  const postUserCaseMessage = async () => {
    if (!activeCase || !caseInput.trim()) return;
    const msg = await postCaseMessage({
      caseId: activeCase.id,
      authorRole: 'USER',
      authorUserId: userId,
      message: caseInput.trim()
    });
    setCaseMessages(prev => [...prev, msg]);
    setCaseInput('');
  };

  const markCaseClosed = async () => {
    if (!activeCase) return;
    await updateWorkflowCase(activeCase.id, { status: 'CLOSED' });
    setCases(prev => prev.map(c => (c.id === activeCase.id ? { ...c, status: 'CLOSED', updatedAt: new Date().toISOString() } : c)));
  };

  return (
    <div className="h-full bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden flex flex-col">
      <div className="p-4 border-b border-slate-100 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-black text-slate-800 tracking-tight">{t('agent.tools.title', undefined, 'Инструменты')}</h3>
          <p className="text-[11px] text-slate-500 font-bold uppercase tracking-widest">{agent.name}</p>
        </div>
        <button
          onClick={refresh}
          disabled={loading}
          className={`px-3 py-2 rounded-xl text-xs font-bold border shadow-sm transition-all ${
            loading ? 'bg-slate-100 text-slate-400 border-slate-200' : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200'
          }`}
          title={t('agent.tools.refreshTitle', undefined, 'Обновить')}
        >
          <i className={`fas fa-rotate ${loading ? 'animate-spin' : ''}`}></i>
        </button>
      </div>

      <div className="p-4 overflow-auto space-y-6">
        {agent.id === 'abitur' && (
          <>
            <div>
              <div className="text-xs font-black text-slate-700 mb-2">{t('agent.tools.abitur.category', undefined, 'Категория вопроса')}</div>
              <select
                value={selectedCategory}
                onChange={e => setSelectedCategory(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-sm font-semibold text-slate-700"
              >
                {categories.map(c => (
                  <option key={c.id} value={c.title}>
                    {c.title}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <div className="text-xs font-black text-slate-700 mb-2">{t('agent.tools.quick', undefined, 'Быстрые запросы')}</div>
              <div className="flex flex-wrap gap-2">
                {quick.map(q => (
                  <button
                    key={q.id}
                    onClick={() => sendToChat(agent.id, q.content || q.title)}
                    className="px-3 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-amber-500 hover:text-slate-900 transition-all"
                    title={q.content || q.title}
                  >
                    {q.title}
                  </button>
                ))}
                {quick.length === 0 && <div className="text-xs text-slate-400 font-bold">{t('agent.tools.noneQuick', undefined, 'Нет быстрых кнопок')}</div>}
              </div>
            </div>

            <div>
              <div className="text-xs font-black text-slate-700 mb-2">{t('agent.tools.reference', undefined, 'Справка')}</div>
              <div className="space-y-2">
                {reference.map(r => (
                  <div key={r.id} className="border border-slate-200 rounded-xl p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="text-sm font-black text-slate-800">{r.title}</div>
                      <button
                        onClick={() => sendToChat(agent.id, `Используй справку ниже и ответь структурированно.\n\n${r.title}\n${r.content || ''}`)}
                        className="text-xs font-bold text-amber-600 hover:text-amber-700"
                        title={t('agent.tools.toChatTitle', undefined, 'В чат')}
                      >
                        {t('agent.tools.toChat', undefined, 'В чат')}
                      </button>
                    </div>
                    {r.content && <div className="text-xs text-slate-600 mt-2 whitespace-pre-wrap">{r.content}</div>}
                  </div>
                ))}
                {reference.length === 0 && <div className="text-xs text-slate-400 font-bold">{t('agent.tools.noneReference', undefined, 'Справки нет')}</div>}
              </div>
            </div>
          </>
        )}

        {agent.id === 'kadr' && (
          <>
            <div>
              <div className="text-xs font-black text-slate-700 mb-2">{t('agent.tools.kadr.topic', undefined, 'Кадровая тема')}</div>
              <select
                value={selectedTopic}
                onChange={e => setSelectedTopic(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-sm font-semibold text-slate-700"
              >
                {topics.map(c => (
                  <option key={c.id} value={c.title}>
                    {c.title}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <div className="text-xs font-black text-slate-700 mb-2">{t('agent.tools.kadr.procedures', undefined, 'Разъяснения по процедурам')}</div>
              <div className="space-y-2">
                {procedures.map(p => (
                  <div key={p.id} className="border border-slate-200 rounded-xl p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="text-sm font-black text-slate-800">{p.title}</div>
                      <button
                        onClick={() => sendToChat(agent.id, `Объясни процедуру: ${p.title}\n\n${p.content || ''}\n\nЗадай 2–3 уточняющих вопроса по моему случаю.`)}
                        className="text-xs font-bold text-emerald-600 hover:text-emerald-700"
                        title={t('agent.tools.askInChatTitle', undefined, 'Уточнить в чате')}
                      >
                        {t('agent.tools.toChat', undefined, 'В чат')}
                      </button>
                    </div>
                    {p.content && <div className="text-xs text-slate-600 mt-2 whitespace-pre-wrap">{p.content}</div>}
                  </div>
                ))}
                {procedures.length === 0 && <div className="text-xs text-slate-400 font-bold">{t('agent.tools.noneProcedures', undefined, 'Нет процедур')}</div>}
              </div>
            </div>

            <div>
              <div className="text-xs font-black text-slate-700 mb-2">{t('agent.tools.quick', undefined, 'Быстрые запросы')}</div>
              <div className="flex flex-wrap gap-2">
                {quick.map(q => (
                  <button
                    key={q.id}
                    onClick={() => sendToChat(agent.id, q.content || q.title)}
                    className="px-3 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-emerald-500 hover:text-slate-900 transition-all"
                    title={q.content || q.title}
                  >
                    {q.title}
                  </button>
                ))}
                {quick.length === 0 && <div className="text-xs text-slate-400 font-bold">{t('agent.tools.noneQuick', undefined, 'Нет быстрых кнопок')}</div>}
              </div>
            </div>
          </>
        )}

        {(agent.id === 'nav' || agent.id === 'room') && (
          <>
            <div>
              <div className="text-xs font-black text-slate-700 mb-2">
                {agent.id === 'nav'
                  ? t('agent.tools.nav.request', undefined, 'Учебный запрос')
                  : t('agent.tools.room.caseType', undefined, 'Тип обращения')}
              </div>
              <select
                value={selectedRequest}
                onChange={e => setSelectedRequest(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-sm font-semibold text-slate-700"
              >
                {requests.map(r => (
                  <option key={r.id} value={r.title}>
                    {r.title}
                  </option>
                ))}
              </select>
              <button
                onClick={createCaseFromSelection}
                className="mt-3 w-full px-3 py-2 rounded-xl bg-slate-900 text-white text-xs font-black hover:bg-amber-500 hover:text-slate-900 transition-all"
              >
                <i className="fas fa-plus mr-2"></i>
                {agent.id === 'nav'
                  ? t('agent.tools.nav.startScenario', undefined, 'Запустить сценарий / подать заявление')
                  : t('agent.tools.room.createCase', undefined, 'Создать обращение')}
              </button>
            </div>

            {agent.id === 'nav' && (
              <div>
                <div className="text-xs font-black text-slate-700 mb-2">{t('agent.tools.info', undefined, 'Справочная информация')}</div>
                <div className="space-y-2">
                  {schedules.map(s => (
                    <div key={s.id} className="border border-slate-200 rounded-xl p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="text-sm font-black text-slate-800">{s.title}</div>
                        <button
                          onClick={() => sendToChat(agent.id, `Помоги по теме: ${s.title}\n\n${s.content || ''}`)}
                          className="text-xs font-bold text-amber-600 hover:text-amber-700"
                        >
                          {t('agent.tools.toChat', undefined, 'В чат')}
                        </button>
                      </div>
                      {s.content && <div className="text-xs text-slate-600 mt-2 whitespace-pre-wrap">{s.content}</div>}
                    </div>
                  ))}
                  {schedules.length === 0 && <div className="text-xs text-slate-400 font-bold">{t('agent.tools.noneData', undefined, 'Нет данных')}</div>}
                </div>
              </div>
            )}

            <div>
              <div className="text-xs font-black text-slate-700 mb-2">{t('agent.tools.cases.status', undefined, 'Статус обращений')}</div>
              <div className="space-y-2">
                {cases.map(c => (
                  <button
                    key={c.id}
                    onClick={() => setActiveCaseId(c.id)}
                    className={`w-full text-left border rounded-xl p-3 transition-all ${
                      activeCaseId === c.id ? 'border-amber-400 bg-amber-50' : 'border-slate-200 hover:bg-slate-50'
                    }`}
                    title={c.id}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="text-sm font-black text-slate-800 truncate">{c.title || c.caseType}</div>
                      <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{statusLabel(t, c.status)}</div>
                    </div>
                    <div className="text-[11px] text-slate-500 font-semibold mt-1">{new Date(c.createdAt).toLocaleString()}</div>
                  </button>
                ))}
                {cases.length === 0 && <div className="text-xs text-slate-400 font-bold">{t('agent.tools.cases.none', undefined, 'Обращений пока нет')}</div>}
              </div>
            </div>

            {activeCase && (
              <div className="border border-slate-200 rounded-2xl overflow-hidden">
                <div className="p-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                  <div>
                    <div className="text-xs font-black text-slate-800">{t('agent.tools.cases.case', undefined, 'Обращение')}</div>
                    <div className="text-[11px] text-slate-500 font-semibold truncate">{activeCase.title || activeCase.caseType}</div>
                  </div>
                  <button onClick={markCaseClosed} className="text-xs font-black text-rose-600 hover:text-rose-700">
                    {t('agent.tools.cases.close', undefined, 'Закрыть')}
                  </button>
                </div>
                <div className="p-3 space-y-2 max-h-56 overflow-auto">
                  {caseMessages.map(m => (
                    <div key={m.id} className={`text-xs rounded-xl px-3 py-2 ${m.authorRole === 'ADMIN' ? 'bg-emerald-50 text-emerald-900' : 'bg-slate-100 text-slate-800'}`}>
                      <div className="font-black text-[10px] uppercase tracking-widest opacity-70 mb-1">
                        {m.authorRole === 'ADMIN' ? t('case.role.ADMIN', undefined, 'ADMIN') : t('case.role.USER', undefined, 'USER')}
                      </div>
                      <div className="whitespace-pre-wrap">{m.message}</div>
                    </div>
                  ))}
                  {caseMessages.length === 0 && <div className="text-xs text-slate-400 font-bold">{t('agent.tools.cases.noMessages', undefined, 'Сообщений нет')}</div>}
                </div>
                <div className="p-3 border-t border-slate-200 bg-white">
                  <textarea
                    rows={2}
                    value={caseInput}
                    onChange={e => setCaseInput(e.target.value)}
                    placeholder={t('agent.tools.cases.placeholder', undefined, 'Уточнение / сообщение...')}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm font-medium resize-none"
                  />
                  <div className="flex gap-2 mt-2">
                    <button
                      onClick={postUserCaseMessage}
                      disabled={!caseInput.trim()}
                      className={`flex-1 px-3 py-2 rounded-xl text-xs font-black transition-all ${
                        caseInput.trim() ? 'bg-slate-900 text-white hover:bg-amber-500 hover:text-slate-900' : 'bg-slate-200 text-slate-400'
                      }`}
                    >
                      {t('agent.tools.cases.send', undefined, 'Отправить')}
                    </button>
                    <button
                      onClick={() => sendToChat(agent.id, `Помоги сформулировать уточнение по обращению «${activeCase.title || activeCase.caseType}». Текст черновика: ${caseInput || '(пусто)'} `)}
                      className="px-3 py-2 rounded-xl text-xs font-black border border-slate-200 text-slate-700 hover:bg-slate-50"
                      title={t('agent.tools.cases.aiTitle', undefined, 'Попросить ИИ помочь сформулировать')}
                    >
                      {t('agent.tools.cases.ai', undefined, 'ИИ')}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {agent.id === 'career' && (
          <>
            <div>
              <div className="text-xs font-black text-slate-700 mb-2">{t('agent.tools.career.direction', undefined, 'Карьерное направление')}</div>
              <select
                value={selectedDirection}
                onChange={e => setSelectedDirection(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-sm font-semibold text-slate-700"
              >
                {directions.map(d => (
                  <option key={d.id} value={d.title}>
                    {d.title}
                  </option>
                ))}
              </select>
              <button
                onClick={() =>
                  sendToChat(
                    agent.id,
                    `Я хочу развиваться в направлении: ${selectedDirection || 'не выбрано'}. Дай 5 конкретных шагов на 2 недели, и 3 идеи проектов/портфолио.`
                  )
                }
                className="mt-3 w-full px-3 py-2 rounded-xl bg-slate-900 text-white text-xs font-black hover:bg-rose-500 hover:text-slate-900 transition-all"
              >
                {t('agent.tools.career.getPlan', undefined, 'Получить план')}
              </button>
            </div>

            <div>
              <div className="text-xs font-black text-slate-700 mb-2">{t('agent.tools.career.resumeTips', undefined, 'Подсказки по резюме')}</div>
              <div className="space-y-2">
                {resumeTips.map(tip => (
                  <div key={tip.id} className="border border-slate-200 rounded-xl p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="text-sm font-black text-slate-800">{tip.title}</div>
                      <button
                        onClick={() => sendToChat(agent.id, `Применим этот совет к моему резюме. Совет: ${tip.content || tip.title}\n\nЗадай вопросы, какие данные тебе нужны.`)}
                        className="text-xs font-bold text-rose-600 hover:text-rose-700"
                      >
                        В чат
                      </button>
                    </div>
                    {tip.content && <div className="text-xs text-slate-600 mt-2 whitespace-pre-wrap">{tip.content}</div>}
                  </div>
                ))}
                {resumeTips.length === 0 && <div className="text-xs text-slate-400 font-bold">{t('agent.tools.career.noTips', undefined, 'Нет подсказок')}</div>}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
