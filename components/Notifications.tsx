import React, { useMemo, useState } from 'react';
import { Notification, User } from '../types';
import { db } from '../services/dbService';
import { useT } from '../i18n/i18n';

interface NotificationsProps {
  user: User;
}

function severityBadge(severity?: Notification['severity']) {
  if (severity === 'ALERT') return 'bg-rose-100 text-rose-700';
  if (severity === 'WARN') return 'bg-amber-100 text-amber-700';
  return 'bg-slate-100 text-slate-700';
}

export const Notifications: React.FC<NotificationsProps> = ({ user }) => {
  const t = useT();
  const [items, setItems] = useState<Notification[]>(() => db.notifications.findByUser(user.id));

  const unreadCount = useMemo(() => items.filter(n => !n.isRead).length, [items]);

  const refresh = () => setItems(db.notifications.findByUser(user.id));

  const markRead = (id: string) => {
    db.notifications.markRead(id);
    db.audit.log({ actorUserId: user.id, type: 'notification_read', details: { id } });
    refresh();
  };

  const markAllRead = () => {
    for (const n of items) {
      if (!n.isRead) db.notifications.markRead(n.id);
    }
    db.audit.log({ actorUserId: user.id, type: 'notification_read_all' });
    refresh();
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-fade-in pb-10">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight">{t('notifications.title')}</h1>
          <p className="text-sm text-slate-500 font-medium mt-1">
            {t('notifications.subtitle')}{' '}
            <span className="font-black">{unreadCount}</span>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={markAllRead}
            disabled={unreadCount === 0}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              unreadCount === 0 ? 'bg-slate-200 text-slate-400' : 'bg-slate-900 text-white hover:bg-amber-500 hover:text-slate-900'
            }`}
          >
            <i className="fas fa-check-double mr-2"></i> {t('notifications.markAllRead')}
          </button>
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        {items.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            <i className="fas fa-bell-slash text-6xl mb-4"></i>
            <p className="text-sm font-bold">{t('notifications.none')}</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-50">
            {items.map(n => (
              <div key={n.id} className={`p-5 flex items-start justify-between gap-4 hover:bg-slate-50 transition-colors ${!n.isRead ? 'bg-amber-50/30' : ''}`}>
                <div className="flex items-start gap-4 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-500 shrink-0">
                    <i className={`fas ${n.severity === 'ALERT' ? 'fa-triangle-exclamation' : n.severity === 'WARN' ? 'fa-circle-exclamation' : 'fa-bell'}`}></i>
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-black text-slate-800 truncate">{n.title}</p>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest ${severityBadge(n.severity)}`}>
                        {n.severity ?? 'INFO'}
                      </span>
                      {!n.isRead && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest bg-emerald-100 text-emerald-700">
                          NEW
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-600 font-medium mt-2 whitespace-pre-wrap">{n.message}</p>
                    <p className="text-[10px] font-bold text-slate-400 uppercase mt-3">
                      {new Date(n.createdAt).toLocaleString()}
                      {n.createdBy ? ` • ${n.createdBy}` : ''}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {!n.isRead && (
                    <button
                      onClick={() => markRead(n.id)}
                      className="px-3 py-2 bg-emerald-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-emerald-700"
                    >
                      {t('notifications.read')}
                    </button>
                  )}
                  {n.link && (
                    <a
                      href={n.link}
                      target="_blank"
                      rel="noreferrer"
                      className="px-3 py-2 bg-indigo-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-700"
                    >
                      {t('notifications.open')}
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

