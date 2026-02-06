import React, { useEffect, useMemo, useRef, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, LineChart, Line } from 'recharts';
import { AGENTS } from '../constants';
import { AuditEvent, Doc, Message, MessageFeedback, Notification, Role, User } from '../types';
import { useI18n } from '../i18n/i18n';
import { neonApi } from '../services/neonApi';

type Tab = 'stats' | 'users' | 'broadcast' | 'audit' | 'backup';

function download(filename: string, content: string, mime = 'application/json;charset=utf-8') {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

const AdminPanel: React.FC = () => {
  const { t } = useI18n();
  const [activeTab, setActiveTab] = useState<Tab>('stats');
  const [refreshTick, setRefreshTick] = useState(0);
  const [loading, setLoading] = useState(false);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [allMessages, setAllMessages] = useState<Message[]>([]);
  const [allFeedback, setAllFeedback] = useState<MessageFeedback[]>([]);
  const [allDocs, setAllDocs] = useState<Doc[]>([]);
  const [allNotifications, setAllNotifications] = useState<Notification[]>([]);
  const [auditEvents, setAuditEvents] = useState<AuditEvent[]>([]);

  const [userQuery, setUserQuery] = useState('');
  const [newUserName, setNewUserName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('password');
  const [newUserRole, setNewUserRole] = useState<Role>('STUDENT');
  const [newUserDept, setNewUserDept] = useState('');

  const [broadcastTitle, setBroadcastTitle] = useState(() => t('admin.broadcast.defaultTitle'));
  const [broadcastMessage, setBroadcastMessage] = useState('');
  const [broadcastSeverity, setBroadcastSeverity] = useState<'INFO' | 'WARN' | 'ALERT'>('INFO');

  const importFileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let canceled = false;
    setLoading(true);
    (async () => {
      try {
        const [users, messages, feedback, docs, notifications, audit] = await Promise.all([
          neonApi.users.list(),
          neonApi.messages.listAll(),
          neonApi.feedback.listAll(),
          neonApi.docs.listAll(),
          neonApi.notifications.listAll(),
          neonApi.audit.list()
        ]);

        if (canceled) return;
        setAllUsers(users as any);
        setAllMessages(messages);
        setAllFeedback(feedback);
        setAllDocs(docs);
        setAllNotifications(notifications);
        setAuditEvents(audit);
      } catch (e) {
        console.error(e);
        if (canceled) return;
        setAllUsers([]);
        setAllMessages([]);
        setAllFeedback([]);
        setAllDocs([]);
        setAllNotifications([]);
        setAuditEvents([]);
      } finally {
        if (!canceled) setLoading(false);
      }
    })();

    return () => {
      canceled = true;
    };
  }, [refreshTick]);

  const analytics = useMemo(() => {
    const users = allUsers;
    const messages = allMessages;
    const feedback = allFeedback;
    const docs = allDocs;
    const notifications = allNotifications;

    const userMessages = messages.filter(m => m.role === 'user');
    const modelMessages = messages.filter(m => m.role === 'model');

    const avgLatencyMs = modelMessages.length
      ? Math.round(
          modelMessages.reduce((sum, m) => sum + (m.latencyMs ?? 0), 0) / clamp(modelMessages.length, 1, Number.MAX_SAFE_INTEGER)
        )
      : 0;

    const up = feedback.filter(f => f.rating === 1).length;
    const down = feedback.filter(f => f.rating === -1).length;
    const satisfaction = up + down > 0 ? Math.round((up / (up + down)) * 1000) / 10 : null;

    const perAgent = AGENTS.map(a => {
      const agentUserMessages = userMessages.filter(m => m.agentId === a.id);
      const agentModelMessages = modelMessages.filter(m => m.agentId === a.id);
      const agentFeedback = feedback.filter(f => f.agentId === a.id);
      const agentUp = agentFeedback.filter(f => f.rating === 1).length;
      const agentDown = agentFeedback.filter(f => f.rating === -1).length;
      const agentSat = agentUp + agentDown > 0 ? Math.round((agentUp / (agentUp + agentDown)) * 100) : null;
      const agentAvgLatencyMs = agentModelMessages.length
        ? Math.round(agentModelMessages.reduce((sum, m) => sum + (m.latencyMs ?? 0), 0) / agentModelMessages.length)
        : null;
      return {
        agentId: a.id,
        agentName: t(a.nameKey ?? '', undefined, a.name),
        requests: agentUserMessages.length,
        responses: agentModelMessages.length,
        avgLatencyMs: agentAvgLatencyMs,
        satisfaction: agentSat
      };
    });

    const perDayMap = new Map<string, number>();
    for (const m of userMessages) {
      const day = new Date(m.timestamp).toISOString().slice(0, 10);
      perDayMap.set(day, (perDayMap.get(day) ?? 0) + 1);
    }
    const days = [...perDayMap.keys()].sort().slice(-14);
    const timeline = days.map(d => ({ day: d.slice(5), requests: perDayMap.get(d) ?? 0 }));

    return {
      usersCount: users.length,
      docsCount: docs.length,
      notificationsCount: notifications.length,
      totalRequests: userMessages.length,
      avgLatencyMs,
      satisfaction,
      feedbackTotal: up + down,
      perAgent,
      timeline
    };
  }, [allUsers, allMessages, allFeedback, allDocs, allNotifications, t]);

  const users = useMemo(() => {
    const all = allUsers;
    const q = userQuery.trim().toLowerCase();
    if (!q) return all;
    return all.filter(u => `${u.name} ${u.email} ${u.role} ${u.department ?? ''}`.toLowerCase().includes(q));
  }, [allUsers, userQuery]);

  const audit = useMemo(() => auditEvents.slice(0, 80), [auditEvents]);

  const makeRefresh = () => setRefreshTick(x => x + 1);

  const updateUser = async (id: string, updates: Partial<User>) => {
    await neonApi.users.update(id, updates as any);
    void neonApi.audit.log({ type: 'admin_user_update', details: { id, updates } });
    makeRefresh();
  };

  const createUser = async () => {
    if (!newUserEmail.trim() || !newUserName.trim()) return;
    if (!newUserPassword || newUserPassword.length < 6) return alert(t('admin.users.err.passwordMin'));

    try {
      const user = await neonApi.users.create({
        email: newUserEmail.trim(),
        name: newUserName.trim(),
        role: newUserRole,
        department: newUserDept.trim() || undefined,
        password: newUserPassword
      });
      void neonApi.audit.log({ type: 'admin_user_create', details: { id: (user as any).id, email: (user as any).email, role: (user as any).role } });
    } catch (e: any) {
      const msg = String(e?.message || '');
      if (msg.includes('409')) return alert(t('admin.users.err.emailExists'));
      return alert(msg);
    }
    setNewUserEmail('');
    setNewUserName('');
    setNewUserPassword('password');
    setNewUserDept('');
    setNewUserRole('STUDENT');
    makeRefresh();
  };

  const sendBroadcast = async () => {
    if (!broadcastTitle.trim() || !broadcastMessage.trim()) return;
    await neonApi.notifications.broadcast({ title: broadcastTitle.trim(), message: broadcastMessage.trim(), severity: broadcastSeverity });
    void neonApi.audit.log({ type: 'admin_broadcast', details: { severity: broadcastSeverity } });
    setBroadcastMessage('');
    makeRefresh();
    alert(t('admin.broadcast.sent'));
  };

  const exportBackup = async () => {
    const bundle = await neonApi.backup.export();
    download(`bolashak_ai_backup_${bundle.exportedAt.replace(/[:.]/g, '-')}.json`, JSON.stringify(bundle, null, 2));
    void neonApi.audit.log({ type: 'admin_backup_export' });
    makeRefresh();
  };

  const importBackup = async (file: File, mode: 'replace' | 'merge') => {
    const text = await file.text();
    const bundle = JSON.parse(text);
    await neonApi.backup.import(bundle, mode);
    void neonApi.audit.log({ type: 'admin_backup_import', details: { mode, filename: file.name } });
    makeRefresh();
    alert(t('admin.backup.importDone'));
  };

  return (
    <div className="p-6 space-y-8 overflow-y-auto h-full animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">{t('admin.title')}</h1>
          <p className="text-slate-500 text-sm">{t('admin.subtitle')}</p>
        </div>
        <div className="flex bg-white p-1 rounded-xl border border-slate-200 shadow-sm flex-wrap gap-1">
          {(
            [
              { id: 'stats', label: t('admin.tab.stats') },
              { id: 'users', label: t('admin.tab.users') },
              { id: 'broadcast', label: t('admin.tab.broadcast') },
              { id: 'audit', label: t('admin.tab.audit') },
              { id: 'backup', label: t('admin.tab.backup') }
            ] as const
          ).map(t => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                activeTab === t.id ? 'bg-amber-500 text-slate-900 shadow-sm' : 'text-slate-500 hover:bg-slate-50'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {activeTab === 'stats' && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[
              { label: t('admin.stat.requests'), value: `${analytics.totalRequests}`, sub: t('admin.stat.requestsSub'), icon: 'fa-comments', color: 'text-blue-600' },
              {
                label: 'SLA (avg)',
                value: analytics.avgLatencyMs ? `${Math.round(analytics.avgLatencyMs)}ms` : '—',
                sub: t('admin.stat.avgLatencySub'),
                icon: 'fa-gauge-high',
                color: 'text-amber-500'
              },
              {
                label: 'Satisfaction',
                value: analytics.satisfaction != null ? `${analytics.satisfaction}%` : '—',
                sub: t('admin.stat.ratings', { count: analytics.feedbackTotal }),
                icon: 'fa-heart',
                color: 'text-rose-500'
              },
              { label: t('admin.stat.users'), value: `${analytics.usersCount}`, sub: `Docs: ${analytics.docsCount}`, icon: 'fa-users', color: 'text-emerald-500' }
            ].map((stat, i) => (
              <div key={i} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">{stat.label}</p>
                    <h3 className="text-2xl font-bold text-slate-800 mt-1">{stat.value}</h3>
                    <p className="text-[10px] font-bold mt-2 text-slate-400">{stat.sub}</p>
                  </div>
                  <div className={`w-12 h-12 rounded-xl bg-slate-50 flex items-center justify-center text-xl ${stat.color}`}>
                    <i className={`fas ${stat.icon}`}></i>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
              <h3 className="text-sm font-bold text-slate-800 mb-6 flex items-center gap-2">
                <i className="fas fa-chart-bar text-amber-500"></i> {t('admin.chart.byAgents')}
              </h3>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={analytics.perAgent}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="agentName" axisLine={false} tickLine={false} fontSize={10} fontWeight="bold" />
                    <YAxis axisLine={false} tickLine={false} fontSize={10} />
                    <Tooltip
                      cursor={{ fill: '#f8fafc' }}
                      contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                    />
                    <Bar dataKey="requests" radius={[6, 6, 0, 0]} barSize={32}>
                      {analytics.perAgent.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={['#6366f1', '#10b981', '#f59e0b', '#f43f5e', '#0ea5e9'][index % 5]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
              <h3 className="text-sm font-bold text-slate-800 mb-6 flex items-center gap-2">
                <i className="fas fa-chart-line text-indigo-600"></i> {t('admin.chart.trend14')}
              </h3>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={analytics.timeline}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="day" axisLine={false} tickLine={false} fontSize={10} fontWeight="bold" />
                    <YAxis axisLine={false} tickLine={false} fontSize={10} />
                    <Tooltip
                      cursor={{ fill: '#f8fafc' }}
                      contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                    />
                    <Line type="monotone" dataKey="requests" stroke="#f59e0b" strokeWidth={3} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <h3 className="text-sm font-bold text-slate-800 mb-6">{t('admin.nodes.status')}</h3>
            <div className="space-y-3">
              {analytics.perAgent.map(agent => (
                <div
                  key={agent.agentId}
                  className="flex items-center justify-between p-4 rounded-xl border border-slate-100 bg-slate-50/50 hover:bg-slate-50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-white border border-slate-200 text-slate-700">
                      <i className="fas fa-microchip"></i>
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-800">{agent.agentName}</h4>
                      <p className="text-[10px] text-slate-500 uppercase font-bold tracking-tighter">
                        Lat: {agent.avgLatencyMs != null ? `${Math.round(agent.avgLatencyMs)}ms` : '—'} • Sat:{' '}
                        {agent.satisfaction != null ? `${agent.satisfaction}%` : '—'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="px-3 py-1 bg-emerald-100 text-emerald-700 text-[10px] font-bold rounded-full">ONLINE</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {activeTab === 'users' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-100 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-bold text-slate-800">{t('admin.users.title')}</h3>
              <p className="text-xs text-slate-500 mt-1">{t('admin.users.subtitle')}</p>
            </div>
            <div className="flex-1 lg:max-w-md">
              <input
                value={userQuery}
                onChange={e => setUserQuery(e.target.value)}
                placeholder={t('admin.users.searchPlaceholder')}
                className="w-full px-5 py-3 rounded-2xl bg-slate-50 border-none focus:ring-2 ring-amber-500/20 outline-none text-sm font-bold transition-all"
              />
            </div>
          </div>

          <div className="p-6 grid grid-cols-1 xl:grid-cols-3 gap-6">
            <div className="xl:col-span-2 overflow-hidden rounded-2xl border border-slate-100">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 text-slate-500 text-[10px] uppercase tracking-widest">
                    <tr>
                      <th className="text-left p-3">{t('admin.users.col.name')}</th>
                      <th className="text-left p-3">Email</th>
                      <th className="text-left p-3">{t('admin.users.col.role')}</th>
                      <th className="text-left p-3">{t('admin.users.col.department')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {users.map(u => (
                      <tr key={u.id} className="hover:bg-slate-50">
                        <td className="p-3 font-bold text-slate-800">{u.name}</td>
                        <td className="p-3 text-slate-600">{u.email}</td>
                        <td className="p-3">
                          <select
                            value={u.role}
                            onChange={e => updateUser(u.id, { role: e.target.value as Role })}
                            className="px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs font-black"
                          >
                            {(['STUDENT', 'FACULTY', 'ALUMNI', 'ADMIN'] as Role[]).map(r => (
                              <option key={r} value={r}>
                                {r}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="p-3">
                          <input
                            value={u.department ?? ''}
                            onChange={e => updateUser(u.id, { department: e.target.value })}
                            placeholder="—"
                            className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs font-bold"
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="bg-slate-50 rounded-2xl p-5 border border-slate-100">
              <h3 className="text-sm font-black text-slate-800 mb-4 flex items-center gap-2">
                <i className="fas fa-user-plus text-emerald-600"></i> {t('admin.users.add')}
              </h3>
              <div className="space-y-3">
                <input
                  value={newUserName}
                  onChange={e => setNewUserName(e.target.value)}
                  placeholder={t('admin.users.placeholder.fullName')}
                  className="w-full px-4 py-3 rounded-xl bg-white border border-slate-200 focus:ring-2 ring-amber-500/20 outline-none text-sm font-bold"
                />
                <input
                  value={newUserEmail}
                  onChange={e => setNewUserEmail(e.target.value)}
                  placeholder="Email"
                  className="w-full px-4 py-3 rounded-xl bg-white border border-slate-200 focus:ring-2 ring-amber-500/20 outline-none text-sm font-bold"
                />
                <input
                  type="password"
                  value={newUserPassword}
                  onChange={e => setNewUserPassword(e.target.value)}
                  placeholder={t('admin.users.placeholder.password')}
                  className="w-full px-4 py-3 rounded-xl bg-white border border-slate-200 focus:ring-2 ring-amber-500/20 outline-none text-sm font-bold"
                />
                <select
                  value={newUserRole}
                  onChange={e => setNewUserRole(e.target.value as Role)}
                  className="w-full px-4 py-3 rounded-xl bg-white border border-slate-200 text-sm font-black"
                >
                  {(['STUDENT', 'FACULTY', 'ALUMNI', 'ADMIN'] as Role[]).map(r => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
                <input
                  value={newUserDept}
                  onChange={e => setNewUserDept(e.target.value)}
                  placeholder={t('admin.users.placeholder.departmentOpt')}
                  className="w-full px-4 py-3 rounded-xl bg-white border border-slate-200 focus:ring-2 ring-amber-500/20 outline-none text-sm font-bold"
                />
                <button
                  onClick={createUser}
                  disabled={!newUserName.trim() || !newUserEmail.trim() || newUserPassword.length < 6}
                  className={`w-full py-3 rounded-xl font-black text-xs uppercase tracking-widest transition-all ${
                    !newUserName.trim() || !newUserEmail.trim() || newUserPassword.length < 6
                      ? 'bg-slate-200 text-slate-400'
                      : 'bg-slate-900 text-white hover:bg-amber-500 hover:text-slate-900'
                  }`}
                >
                  {t('admin.users.create')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'broadcast' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-slate-800">{t('admin.broadcast.title')}</h3>
              <p className="text-xs text-slate-500 mt-1">{t('admin.broadcast.subtitle')}</p>
            </div>
            <div className="px-3 py-2 bg-slate-50 rounded-xl border border-slate-100 text-xs font-black text-slate-500">
              {t('admin.broadcast.total', { count: analytics.notificationsCount })}
            </div>
          </div>

          <div className="p-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-3">
              <input
                value={broadcastTitle}
                onChange={e => setBroadcastTitle(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-slate-50 border-none focus:ring-2 ring-amber-500/20 outline-none text-sm font-black"
                placeholder={t('admin.broadcast.placeholder.title')}
              />
              <textarea
                value={broadcastMessage}
                onChange={e => setBroadcastMessage(e.target.value)}
                rows={8}
                className="w-full px-4 py-3 rounded-xl bg-slate-50 border-none focus:ring-2 ring-amber-500/20 outline-none text-sm font-medium resize-y"
                placeholder={t('admin.broadcast.placeholder.message')}
              />
            </div>
            <div className="bg-slate-50 rounded-2xl p-5 border border-slate-100 space-y-3">
              <p className="text-xs font-black text-slate-400 uppercase tracking-widest">{t('admin.broadcast.params')}</p>
              <select
                value={broadcastSeverity}
                onChange={e => setBroadcastSeverity(e.target.value as any)}
                className="w-full px-4 py-3 rounded-xl bg-white border border-slate-200 text-sm font-black"
              >
                <option value="INFO">INFO</option>
                <option value="WARN">WARN</option>
                <option value="ALERT">ALERT</option>
              </select>
              <button
                onClick={sendBroadcast}
                disabled={!broadcastTitle.trim() || !broadcastMessage.trim()}
                className={`w-full py-3 rounded-xl font-black text-xs uppercase tracking-widest transition-all ${
                  !broadcastTitle.trim() || !broadcastMessage.trim()
                    ? 'bg-slate-200 text-slate-400'
                    : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-lg shadow-indigo-600/20'
                }`}
              >
                <i className="fas fa-paper-plane mr-2"></i> {t('admin.broadcast.sendAll')}
              </button>
              <p className="text-[10px] font-bold text-slate-400">
                {t('admin.broadcast.tip')}
              </p>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'audit' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-100 flex items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-bold text-slate-800">{t('admin.audit.title')}</h3>
              <p className="text-xs text-slate-500 mt-1">{t('admin.audit.subtitle')}</p>
            </div>
            <button
              onClick={async () => {
                if (!confirm(t('admin.audit.confirmClear'))) return;
                await neonApi.audit.clear();
                makeRefresh();
              }}
              className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-rose-600 hover:bg-slate-50"
            >
              <i className="fas fa-trash mr-2"></i> {t('admin.audit.clear')}
            </button>
          </div>
          <div className="max-h-[560px] overflow-y-auto custom-scrollbar divide-y divide-slate-50">
            {audit.length === 0 ? (
              <div className="p-12 text-center text-slate-400">
                <i className="fas fa-clipboard-list text-6xl mb-4"></i>
                <p className="text-sm font-bold">{t('admin.audit.none')}</p>
              </div>
            ) : (
              audit.map(e => (
                <div key={e.id} className="p-4 hover:bg-slate-50 transition-colors">
                  <div className="flex items-center justify-between gap-4">
                    <div className="min-w-0">
                      <p className="text-sm font-black text-slate-800 truncate">{e.type}</p>
                      <p className="text-[10px] font-bold text-slate-400 uppercase mt-1">
                        {new Date(e.at).toLocaleString()}
                        {e.actorUserId ? ` • actor: ${e.actorUserId}` : ''}
                      </p>
                    </div>
                    <div className="text-[10px] font-bold text-slate-400 bg-slate-50 border border-slate-100 rounded-xl px-3 py-2 max-w-[420px] overflow-hidden text-ellipsis whitespace-nowrap">
                      {e.details ? JSON.stringify(e.details) : '—'}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {activeTab === 'backup' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-slate-800">{t('admin.backup.title')}</h3>
              <p className="text-xs text-slate-500 mt-1">{t('admin.backup.subtitle')}</p>
            </div>
            <button
              onClick={exportBackup}
              className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-amber-500 hover:text-slate-900 transition-shadow shadow-lg shadow-slate-900/20"
            >
              <i className="fas fa-download mr-2"></i> {t('admin.backup.exportJson')}
            </button>
          </div>

          <div className="p-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-slate-50 rounded-2xl p-5 border border-slate-100">
              <h4 className="text-sm font-black text-slate-800 mb-3">{t('admin.backup.import')}</h4>
              <p className="text-xs text-slate-500 mb-4">
                {t('admin.backup.instructions')}
              </p>
              <input ref={importFileRef} type="file" accept=".json" className="hidden" onChange={() => {}} />
              <div className="flex gap-3">
                <button
                  onClick={() => importFileRef.current?.click()}
                  className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold hover:bg-slate-100"
                >
                  <i className="fas fa-file-import mr-2"></i> {t('admin.backup.chooseFile')}
                </button>
              </div>
              <div className="mt-4 flex gap-3">
                <button
                  onClick={async () => {
                    const f = importFileRef.current?.files?.[0];
                    if (!f) return alert(t('admin.backup.selectFileFirst'));
                    await importBackup(f, 'replace');
                  }}
                  className="px-4 py-2 bg-rose-600 text-white rounded-xl text-xs font-bold hover:bg-rose-700"
                >
                  Replace
                </button>
                <button
                  onClick={async () => {
                    const f = importFileRef.current?.files?.[0];
                    if (!f) return alert(t('admin.backup.selectFileFirst'));
                    await importBackup(f, 'merge');
                  }}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold hover:bg-indigo-700"
                >
                  Merge
                </button>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
              <div className="p-5 border-b border-slate-100">
                <h4 className="text-sm font-black text-slate-800">{t('admin.backup.summary')}</h4>
              </div>
              <div className="p-5 space-y-3 text-sm">
                <div className="flex justify-between"><span className="text-slate-500">Users</span><span className="font-black text-slate-800">{analytics.usersCount}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Docs</span><span className="font-black text-slate-800">{analytics.docsCount}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Notifications</span><span className="font-black text-slate-800">{analytics.notificationsCount}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Requests</span><span className="font-black text-slate-800">{analytics.totalRequests}</span></div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPanel;
