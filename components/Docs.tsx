import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Doc, User } from '../types';
import { db } from '../services/dbService';
import { makeId } from '../services/id';
import { useI18n } from '../i18n/i18n';

interface DocsProps {
  user: User;
}

export const Docs: React.FC<DocsProps> = ({ user }) => {
  const { t, locale } = useI18n();
  const location = useLocation();
  const [docs, setDocs] = useState<Doc[]>(() => db.docs.findByUser(user.id));
  const [query, setQuery] = useState('');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const lastDocParamRef = useRef<string | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return docs;
    return docs.filter(d => `${d.title}\n${d.content}`.toLowerCase().includes(q));
  }, [docs, query]);

  const refresh = () => setDocs(db.docs.findByUser(user.id));

  const createDoc = () => {
    if (!title.trim() || !content.trim()) return;
    const doc: Doc = {
      id: makeId('d_'),
      userId: user.id,
      title: title.trim(),
      content: content.trim(),
      createdAt: new Date().toISOString()
    };
    db.docs.create(doc);
    db.audit.log({ actorUserId: user.id, type: 'doc_create', details: { docId: doc.id, title: doc.title } });
    setTitle('');
    setContent('');
    refresh();
  };

  const removeDoc = (id: string) => {
    if (!confirm(t('docs.confirmDelete'))) return;
    db.docs.remove(id);
    db.audit.log({ actorUserId: user.id, type: 'doc_delete', details: { docId: id } });
    refresh();
  };

  const startEdit = (doc: Doc) => {
    setEditingId(doc.id);
    setEditTitle(doc.title);
    setEditContent(doc.content);
  };

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const q = params.get('q');
    if (q != null && q !== query) setQuery(q);

    const docId = params.get('doc');
    if (!docId) {
      lastDocParamRef.current = null;
      return;
    }
    if (lastDocParamRef.current === docId) return;
    const found = docs.find(d => d.id === docId);
    if (found) {
      lastDocParamRef.current = docId;
      startEdit(found);
    }
  }, [docs, location.search, query]);

  const saveEdit = () => {
    if (!editingId) return;
    db.docs.update(editingId, { title: editTitle.trim(), content: editContent.trim() });
    db.audit.log({ actorUserId: user.id, type: 'doc_update', details: { docId: editingId } });
    setEditingId(null);
    refresh();
  };

  const handleUpload = async (file: File) => {
    const text = await file.text();
    const doc: Doc = {
      id: makeId('d_'),
      userId: user.id,
      title: file.name,
      content: text,
      createdAt: new Date().toISOString()
    };
    db.docs.create(doc);
    db.audit.log({ actorUserId: user.id, type: 'doc_upload', details: { docId: doc.id, filename: file.name } });
    refresh();
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-fade-in pb-10">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight">{t('docs.title')}</h1>
          <p className="text-sm text-slate-500 font-medium mt-1">
            {t('docs.subtitle')}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold hover:bg-indigo-700 transition-shadow shadow-lg shadow-indigo-600/20"
          >
            <i className="fas fa-upload mr-2"></i> {t('docs.upload')}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            accept=".txt,.md,.markdown,.csv,.json"
            onChange={e => {
              const f = e.target.files?.[0];
              if (f) void handleUpload(f);
              e.currentTarget.value = '';
            }}
          />
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100">
          <div className="flex flex-col md:flex-row gap-3 md:items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-500">
                <i className="fas fa-database"></i>
              </div>
              <div>
                <p className="text-xs font-black text-slate-400 uppercase tracking-widest">{t('docs.total')}</p>
                <p className="text-xl font-black text-slate-800">{docs.length}</p>
              </div>
            </div>
            <div className="flex-1 md:max-w-md">
              <input
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder={t('docs.searchPlaceholder')}
                className="w-full px-5 py-3 rounded-2xl bg-slate-50 border-none focus:ring-2 ring-amber-500/20 outline-none text-sm font-bold transition-all"
              />
            </div>
          </div>
        </div>

        <div className="p-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-slate-50 rounded-2xl p-5 border border-slate-100">
            <h3 className="text-sm font-black text-slate-800 mb-4 flex items-center gap-2">
              <i className="fas fa-plus-circle text-emerald-600"></i> {t('docs.newDoc')}
            </h3>
            <div className="space-y-3">
              <input
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder={t('docs.docTitle')}
                className="w-full px-4 py-3 rounded-xl bg-white border border-slate-200 focus:ring-2 ring-amber-500/20 outline-none text-sm font-bold"
              />
              <textarea
                value={content}
                onChange={e => setContent(e.target.value)}
                placeholder={t('docs.docContentPlaceholder')}
                rows={10}
                className="w-full px-4 py-3 rounded-xl bg-white border border-slate-200 focus:ring-2 ring-amber-500/20 outline-none text-sm font-medium resize-y"
              />
              <button
                onClick={createDoc}
                disabled={!title.trim() || !content.trim()}
                className={`w-full py-3 rounded-xl font-black text-xs uppercase tracking-widest transition-all ${
                  !title.trim() || !content.trim()
                    ? 'bg-slate-200 text-slate-400'
                    : 'bg-slate-900 text-white hover:bg-amber-500 hover:text-slate-900'
                }`}
              >
                {t('docs.add')}
              </button>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-sm font-black text-slate-800 flex items-center gap-2">
                <i className="fas fa-file-lines text-indigo-600"></i> {t('docs.list')}
              </h3>
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                {t('docs.found', { count: filtered.length })}
              </span>
            </div>

            {filtered.length === 0 ? (
              <div className="p-10 text-center text-slate-400">
                <i className="fas fa-folder-open text-5xl mb-4"></i>
                <p className="text-sm font-bold">{t('docs.none')}</p>
                <p className="text-xs mt-2">{t('docs.emptyHelp')}</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-50 max-h-[540px] overflow-y-auto custom-scrollbar">
                {filtered.map(d => (
                  <div key={d.id} className="p-4 hover:bg-slate-50 transition-colors">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <p className="text-sm font-black text-slate-800 truncate">{d.title}</p>
                        <p className="text-[10px] font-bold text-slate-400 uppercase mt-1">
                          {t('docs.created', { date: new Date(d.createdAt).toLocaleDateString(locale) })}
                          {d.updatedAt ? ` • ${t('docs.updated', { date: new Date(d.updatedAt).toLocaleDateString(locale) })}` : ''}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={() => startEdit(d)}
                          className="text-slate-400 hover:text-indigo-600 p-2 rounded-lg hover:bg-white"
                          title={t('docs.edit')}
                        >
                          <i className="fas fa-pen"></i>
                        </button>
                        <button
                          onClick={() => removeDoc(d.id)}
                          className="text-slate-400 hover:text-rose-600 p-2 rounded-lg hover:bg-white"
                          title={t('docs.delete')}
                        >
                          <i className="fas fa-trash"></i>
                        </button>
                      </div>
                    </div>
                    <p className="text-xs text-slate-600 font-medium mt-3 line-clamp-3 whitespace-pre-wrap">
                      {d.content.slice(0, 320)}
                      {d.content.length > 320 ? '…' : ''}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {editingId && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-3xl bg-white rounded-3xl shadow-2xl overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-lg font-black text-slate-800">{t('docs.editing')}</h3>
              <button
                onClick={() => setEditingId(null)}
                className="w-10 h-10 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-50 transition-all flex items-center justify-center"
              >
                <i className="fas fa-times"></i>
              </button>
            </div>
            <div className="p-6 space-y-3">
              <input
                value={editTitle}
                onChange={e => setEditTitle(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-slate-50 border-none focus:ring-2 ring-amber-500/20 outline-none text-sm font-black"
                placeholder={t('docs.docTitle')}
              />
              <textarea
                value={editContent}
                onChange={e => setEditContent(e.target.value)}
                rows={14}
                className="w-full px-4 py-3 rounded-xl bg-slate-50 border-none focus:ring-2 ring-amber-500/20 outline-none text-sm font-medium resize-y"
                placeholder={t('docs.text')}
              />
            </div>
            <div className="p-6 border-t border-slate-100 flex justify-end gap-3">
              <button
                onClick={() => setEditingId(null)}
                className="px-5 py-3 rounded-xl text-xs font-black uppercase tracking-widest bg-slate-100 text-slate-600 hover:bg-slate-200"
              >
                {t('docs.cancel')}
              </button>
              <button
                onClick={saveEdit}
                className="px-5 py-3 rounded-xl text-xs font-black uppercase tracking-widest bg-slate-900 text-white hover:bg-amber-500 hover:text-slate-900"
              >
                {t('docs.save')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
