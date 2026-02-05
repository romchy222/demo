import React, { useMemo, useRef, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, LineChart, Line } from 'recharts';
import { AGENTS } from '../constants';
import { Role, User } from '../types';
import { db } from '../services/dbService';
import { makeId } from '../services/id';
import { hashPassword } from '../services/password';

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
  const [activeTab, setActiveTab] = useState<Tab>('stats');
  const [refreshTick, setRefreshTick] = useState(0);

  const [userQuery, setUserQuery] = useState('');
  const [newUserName, setNewUserName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('password');
  const [newUserRole, setNewUserRole] = useState<Role>('STUDENT');
  const [newUserDept, setNewUserDept] = useState('');

  const [broadcastTitle, setBroadcastTitle] = useState('Объявление');
  const [broadcastMessage, setBroadcastMessage] = useState('');
  const [broadcastSeverity, setBroadcastSeverity] = useState<'INFO' | 'WARN' | 'ALERT'>('INFO');

  const importFileRef = useRef<HTMLInputElement>(null);

  const analytics = useMemo(() => {
    const users = db.users.findAll();
    const messages = db.messages.findAll();
    const feedback = db.feedback.findAll();
    const docs = db.docs.findAll();
    const notifications = db.notifications.findAll();

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
        agentName: a.name,
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
  }, [refreshTick]);

  const users = useMemo(() => {
    const all = db.users.findAll();
    const q = userQuery.trim().toLowerCase();
    if (!q) return all;
    return all.filter(u => `${u.name} ${u.email} ${u.role} ${u.department ?? ''}`.toLowerCase().includes(q));
  }, [refreshTick, userQuery]);

  const audit = useMemo(() => db.audit.list().slice(0, 80), [refreshTick]);

  const makeRefresh = () => setRefreshTick(x => x + 1);

  const updateUser = (id: string, updates: Partial<User>) => {
    db.users.update(id, updates);
    db.audit.log({ type: 'admin_user_update', details: { id, updates } });
    makeRefresh();
  };

  const createUser = () => {
    if (!newUserEmail.trim() || !newUserName.trim()) return;
    if (!newUserPassword || newUserPassword.length < 6) return alert('Пароль должен быть минимум 6 символов.');
    const existing = db.users.findByEmail(newUserEmail.trim());
    if (existing) return alert('Пользователь с таким email уже существует.');

    const user: User = {
      id: makeId('u_'),
      email: newUserEmail.trim(),
      name: newUserName.trim(),
      role: newUserRole,
      department: newUserDept.trim() || undefined,
      passwordHash: hashPassword(newUserPassword),
      joinedAt: new Date().toISOString()
    };
    db.users.create(user);
    db.audit.log({ type: 'admin_user_create', details: { id: user.id, email: user.email, role: user.role } });
    setNewUserEmail('');
    setNewUserName('');
    setNewUserPassword('password');
    setNewUserDept('');
    setNewUserRole('STUDENT');
    makeRefresh();
  };

  const sendBroadcast = () => {
    if (!broadcastTitle.trim() || !broadcastMessage.trim()) return;
    db.notifications.broadcast(broadcastTitle.trim(), broadcastMessage.trim(), { severity: broadcastSeverity, createdBy: 'ADMIN' });
    db.audit.log({ type: 'admin_broadcast', details: { severity: broadcastSeverity } });
    setBroadcastMessage('');
    makeRefresh();
    alert('Уведомление отправлено всем пользователям.');
  };

  const exportBackup = () => {
    const bundle = db.exportAll();
    download(`bolashak_ai_backup_${bundle.exportedAt.replace(/[:.]/g, '-')}.json`, JSON.stringify(bundle, null, 2));
    db.audit.log({ type: 'admin_backup_export' });
    makeRefresh();
  };

  const importBackup = async (file: File, mode: 'replace' | 'merge') => {
    const text = await file.text();
    const bundle = JSON.parse(text);
    db.importAll(bundle, { mode });
    db.audit.log({ type: 'admin_backup_import', details: { mode, filename: file.name } });
    makeRefresh();
    alert('Импорт выполнен. Если интерфейс не обновился, перезагрузите страницу.');
  };

  return (
    <div className="p-6 space-y-8 overflow-y-auto h-full animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Система управления Bolashak AI</h1>
          <p className="text-slate-500 text-sm">Мониторинг, пользователи, уведомления, аудит и резервные копии.</p>
        </div>
        <div className="flex bg-white p-1 rounded-xl border border-slate-200 shadow-sm flex-wrap gap-1">
          {(
            [
              { id: 'stats', label: 'Аналитика' },
              { id: 'users', label: 'Пользователи' },
              { id: 'broadcast', label: 'Рассылка' },
              { id: 'audit', label: 'Аудит' },
              { id: 'backup', label: 'Бэкап' }
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
              { label: 'Запросов', value: `${analytics.totalRequests}`, sub: 'Всего (user-msg)', icon: 'fa-comments', color: 'text-blue-600' },
              {
                label: 'SLA (avg)',
                value: analytics.avgLatencyMs ? `${Math.round(analytics.avgLatencyMs)}ms` : '—',
                sub: 'Средняя задержка',
                icon: 'fa-gauge-high',
                color: 'text-amber-500'
              },
              {
                label: 'Satisfaction',
                value: analytics.satisfaction != null ? `${analytics.satisfaction}%` : '—',
                sub: `Оценок: ${analytics.feedbackTotal}`,
                icon: 'fa-heart',
                color: 'text-rose-500'
              },
              { label: 'Пользователи', value: `${analytics.usersCount}`, sub: `Docs: ${analytics.docsCount}`, icon: 'fa-users', color: 'text-emerald-500' }
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
                <i className="fas fa-chart-bar text-amber-500"></i> Запросы по агентам
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
                <i className="fas fa-chart-line text-indigo-600"></i> Динамика (14 дней)
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
            <h3 className="text-sm font-bold text-slate-800 mb-6">Статус нейро-узлов</h3>
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
              <h3 className="text-lg font-bold text-slate-800">Пользователи</h3>
              <p className="text-xs text-slate-500 mt-1">Поиск, роли и департаменты (локально в браузере).</p>
            </div>
            <div className="flex-1 lg:max-w-md">
              <input
                value={userQuery}
                onChange={e => setUserQuery(e.target.value)}
                placeholder="Поиск по имени, email, роли…"
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
                      <th className="text-left p-3">Имя</th>
                      <th className="text-left p-3">Email</th>
                      <th className="text-left p-3">Роль</th>
                      <th className="text-left p-3">Департамент</th>
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
                <i className="fas fa-user-plus text-emerald-600"></i> Добавить пользователя
              </h3>
              <div className="space-y-3">
                <input
                  value={newUserName}
                  onChange={e => setNewUserName(e.target.value)}
                  placeholder="ФИО"
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
                  placeholder="Пароль"
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
                  placeholder="Департамент (опц.)"
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
                  Создать
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
              <h3 className="text-lg font-bold text-slate-800">Рассылка уведомлений</h3>
              <p className="text-xs text-slate-500 mt-1">Отправляет сообщение всем пользователям (localStorage).</p>
            </div>
            <div className="px-3 py-2 bg-slate-50 rounded-xl border border-slate-100 text-xs font-black text-slate-500">
              Всего уведомлений: {analytics.notificationsCount}
            </div>
          </div>

          <div className="p-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-3">
              <input
                value={broadcastTitle}
                onChange={e => setBroadcastTitle(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-slate-50 border-none focus:ring-2 ring-amber-500/20 outline-none text-sm font-black"
                placeholder="Заголовок"
              />
              <textarea
                value={broadcastMessage}
                onChange={e => setBroadcastMessage(e.target.value)}
                rows={8}
                className="w-full px-4 py-3 rounded-xl bg-slate-50 border-none focus:ring-2 ring-amber-500/20 outline-none text-sm font-medium resize-y"
                placeholder="Текст сообщения…"
              />
            </div>
            <div className="bg-slate-50 rounded-2xl p-5 border border-slate-100 space-y-3">
              <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Параметры</p>
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
                <i className="fas fa-paper-plane mr-2"></i> Отправить всем
              </button>
              <p className="text-[10px] font-bold text-slate-400">
                Совет: покажите комиссии, как уведомление появляется у студента (раздел «Уведомления»).
              </p>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'audit' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-100 flex items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-bold text-slate-800">Аудит (последние события)</h3>
              <p className="text-xs text-slate-500 mt-1">Локальный журнал действий (чат, документы, админ-панель).</p>
            </div>
            <button
              onClick={() => {
                if (!confirm('Очистить аудит?')) return;
                db.audit.clear();
                makeRefresh();
              }}
              className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-rose-600 hover:bg-slate-50"
            >
              <i className="fas fa-trash mr-2"></i> Очистить
            </button>
          </div>
          <div className="max-h-[560px] overflow-y-auto custom-scrollbar divide-y divide-slate-50">
            {audit.length === 0 ? (
              <div className="p-12 text-center text-slate-400">
                <i className="fas fa-clipboard-list text-6xl mb-4"></i>
                <p className="text-sm font-bold">Событий пока нет</p>
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
              <h3 className="text-lg font-bold text-slate-800">Резервные копии</h3>
              <p className="text-xs text-slate-500 mt-1">Экспорт/импорт данных (users/messages/docs/notifications/feedback/audit).</p>
            </div>
            <button
              onClick={exportBackup}
              className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-amber-500 hover:text-slate-900 transition-shadow shadow-lg shadow-slate-900/20"
            >
              <i className="fas fa-download mr-2"></i> Экспорт JSON
            </button>
          </div>

          <div className="p-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-slate-50 rounded-2xl p-5 border border-slate-100">
              <h4 className="text-sm font-black text-slate-800 mb-3">Импорт</h4>
              <p className="text-xs text-slate-500 mb-4">
                Выберите файл бэкапа. Можно <span className="font-bold">заменить</span> данные или{' '}
                <span className="font-bold">объединить</span> (merge).
              </p>
              <input ref={importFileRef} type="file" accept=".json" className="hidden" onChange={() => {}} />
              <div className="flex gap-3">
                <button
                  onClick={() => importFileRef.current?.click()}
                  className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold hover:bg-slate-100"
                >
                  <i className="fas fa-file-import mr-2"></i> Выбрать файл
                </button>
              </div>
              <div className="mt-4 flex gap-3">
                <button
                  onClick={async () => {
                    const f = importFileRef.current?.files?.[0];
                    if (!f) return alert('Сначала выберите файл.');
                    await importBackup(f, 'replace');
                  }}
                  className="px-4 py-2 bg-rose-600 text-white rounded-xl text-xs font-bold hover:bg-rose-700"
                >
                  Replace
                </button>
                <button
                  onClick={async () => {
                    const f = importFileRef.current?.files?.[0];
                    if (!f) return alert('Сначала выберите файл.');
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
                <h4 className="text-sm font-black text-slate-800">Сводка</h4>
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
