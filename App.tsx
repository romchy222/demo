
import React, { useMemo, useState, useEffect } from 'react';
import { HashRouter as Router, Routes, Route, Link, useLocation, useNavigate, Navigate } from 'react-router-dom';
import { AGENTS } from './constants';
import { AgentId, Doc, Notification, User } from './types';
import ChatWindow from './components/ChatWindow';
import AdminPanel from './components/AdminPanel';
import { Auth } from './components/Auth';
import { Profile } from './components/Profile';
import { Docs } from './components/Docs';
import { Notifications } from './components/Notifications';
import { VacanciesPanel } from './components/VacanciesPanel';
import { Home } from './components/Home';
import { AgentToolsPanel } from './components/AgentToolsPanel';
import { useI18n } from './i18n/i18n';
import { LanguageSelect } from './components/LanguageSelect';
import { neonApi } from './services/neonApi';

// Защищенный маршрут
const ProtectedRoute: React.FC<{ children: React.ReactNode; user: User | null; minRole?: string }> = ({ children, user, minRole }) => {
  const location = useLocation();
  if (!user) return <Navigate to="/auth" replace state={{ from: location }} />;
  
  if (minRole) {
    const roles = ['STUDENT', 'ALUMNI', 'FACULTY', 'ADMIN'];
    const userIdx = roles.indexOf(user.role);
    const minIdx = roles.indexOf(minRole);
    if (userIdx < minIdx) return <Navigate to="/" replace />;
  }
  
  return <>{children}</>;
};

const AuthRoute: React.FC<{ user: User | null; onLogin: (u: User) => void }> = ({ user, onLogin }) => {
  const location = useLocation() as any;
  if (user) {
    const from = location?.state?.from;
    const pathname = from?.pathname ?? '/app';
    const search = from?.search ?? '';
    const hash = from?.hash ?? '';
    return <Navigate to={`${pathname}${search}${hash}`} replace />;
  }
  return <Auth onLogin={onLogin} />;
};

const Sidebar: React.FC<{ user: User; activeAgentId?: string; onLogout: () => void }> = ({ user, activeAgentId, onLogout }) => {
  const { t } = useI18n();
  const [unreadNotifications, setUnreadNotifications] = useState(0);

  useEffect(() => {
    let canceled = false;
    (async () => {
      try {
        const count = await neonApi.notifications.countUnread(user.id);
        if (!canceled) setUnreadNotifications(count);
      } catch {
        if (!canceled) setUnreadNotifications(0);
      }
    })();
    return () => {
      canceled = true;
    };
  }, [user.id]);

  return (
    <div className="w-72 bg-slate-900 text-white flex flex-col h-full shrink-0 shadow-2xl relative z-20">
      <div className="p-8">
        <Link to="/" className="flex items-center gap-4 group">
          <div className="w-10 h-10 bg-amber-500 rounded-xl flex items-center justify-center shadow-lg shadow-amber-500/30 group-hover:scale-110 transition-transform">
            <img
              src="/ai-sana/bolashak_logo_smooth.svg"
              alt="Bolashak University"
              className="w-11 h-11 object-contain filter brightness-0"
            />
          </div>

          <div className="overflow-hidden">
            <h1 className="text-lg font-black tracking-tighter leading-none">BOLASHAK</h1>
            <p className="text-[10px] text-amber-500 font-bold tracking-widest mt-1">AI PLATFORM</p>
          </div>
        </Link>

      </div>
      
      <div className="flex-1 px-4 space-y-1 overflow-y-auto custom-scrollbar">
        <div className="px-4 pb-4">
            <div className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-2">{t('nav.navigation')}</div>
             <Link
              to="/app"
              className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all ${
                activeAgentId === 'app'
                  ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-slate-900 shadow-lg shadow-amber-500/20' 
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
                <i className="fas fa-th-large w-5"></i>
                {t('nav.dashboard')}
            </Link>

            <Link
              to="/notifications"
              className={`flex items-center justify-between gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all ${
                activeAgentId === 'notifications'
                  ? 'bg-white/10 text-white ring-1 ring-white/20'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <span className="flex items-center gap-3">
                <i className="fas fa-bell w-5"></i>
                {t('nav.notifications')}
              </span>
              {unreadNotifications > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-rose-500 text-white text-[10px] font-black">
                  {unreadNotifications}
                </span>
              )}
            </Link>

            <Link
              to="/docs"
              className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all ${
                activeAgentId === 'docs'
                  ? 'bg-white/10 text-white ring-1 ring-white/20'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <i className="fas fa-folder-open w-5"></i>
              {t('nav.docs')}
            </Link>
        </div>

        <p className="px-4 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-2 mt-4">{t('nav.neuroAgents')}</p>
        {AGENTS.map((agent) => {
          const roles = ['STUDENT', 'ALUMNI', 'FACULTY', 'ADMIN'];
          const userIdx = roles.indexOf(user.role);
          const minIdx = agent.minRole ? roles.indexOf(agent.minRole) : -1;
          const hasAccess = userIdx >= minIdx;
          const agentName = t(agent.nameKey ?? '', undefined, agent.name);

          return (
            <Link
              key={agent.id}
              to={hasAccess ? `/agent/${agent.id}` : '#'}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all group relative overflow-hidden ${
                !hasAccess ? 'opacity-30 cursor-not-allowed' :
                activeAgentId === agent.id 
                  ? 'bg-white/10 text-white ring-1 ring-white/20' 
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <div className={`w-6 h-6 rounded-md flex items-center justify-center transition-all ${
                activeAgentId === agent.id ? 'bg-amber-500 text-slate-900' : 'bg-slate-800 text-slate-500'
              }`}>
                <i className={`fas ${agent.icon} text-[10px]`}></i>
              </div>
              {agentName}
              {activeAgentId === agent.id && <div className="absolute right-0 top-0 h-full w-1 bg-amber-500"></div>}
            </Link>
          );
        })}
        
        {user.role === 'ADMIN' && (
          <div className="pt-8">
            <p className="px-4 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-4">{t('nav.management')}</p>
            <Link
              to="/admin"
              className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all ${
                activeAgentId === 'admin' 
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/30' 
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <i className="fas fa-server w-5"></i>
              {t('nav.systemMonitor')}
            </Link>
          </div>
        )}
      </div>

      <div className="p-6 border-t border-white/5 bg-slate-900/50 backdrop-blur-sm">
        <div className="flex items-center justify-between gap-3 mb-3">
          <LanguageSelect className="shrink-0" variant="dark" />
        </div>
        <Link to="/profile" className={`block bg-slate-800 rounded-2xl p-4 border border-white/5 hover:bg-slate-700 transition-all group`}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-slate-600 overflow-hidden border-2 border-slate-500 group-hover:border-amber-500 transition-colors">
                <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${user.id}`} alt="User" />
            </div>
            <div className="overflow-hidden">
              <p className="text-xs font-black truncate text-white">{user.name}</p>
              <p className="text-[10px] text-slate-400 font-bold uppercase">{user.role}</p>
            </div>
          </div>
        </Link>
        <button 
          onClick={onLogout}
          className="w-full mt-3 py-2 text-[10px] font-black text-slate-500 hover:text-rose-500 uppercase tracking-widest transition-colors flex items-center justify-center gap-2"
        >
          <i className="fas fa-sign-out-alt"></i> {t('nav.logout')}
        </button>
      </div>
    </div>
  );
};

// Новый компонент виджета для дашборда
const DashboardWidget: React.FC<{ 
    title: string; 
    icon: string; 
    value?: string; 
    subtext?: string;
    color: string;
    trend?: string;
    to?: string;
 }> = ({ title, icon, value, subtext, color, trend, to }) => {
    const widget = (
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm hover:shadow-lg transition-all group relative overflow-hidden">
        <div className={`absolute top-0 right-0 w-24 h-24 ${color} opacity-5 rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-110`}></div>
        <div className="flex justify-between items-start mb-4">
            <div className={`w-10 h-10 rounded-xl ${color} bg-opacity-10 flex items-center justify-center text-lg ${color.replace('bg-', 'text-')}`}>
                <i className={`fas ${icon}`}></i>
            </div>
            {trend && <span className="px-2 py-1 bg-emerald-50 text-emerald-600 text-[10px] font-black rounded-lg uppercase">{trend}</span>}
        </div>
        <h4 className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-1">{title}</h4>
        {value && <div className="text-2xl font-black text-slate-800">{value}</div>}
        {subtext && <p className="text-xs text-slate-400 font-medium mt-2">{subtext}</p>}
    </div>
    );

    if (to) return <Link to={to} className="block">{widget}</Link>;
    return widget;
 };

const Dashboard: React.FC<{ user: User }> = ({ user }) => {
    const { t } = useI18n();
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [docsCount, setDocsCount] = useState(0);

    useEffect(() => {
      let canceled = false;
      (async () => {
        try {
          const list = await neonApi.notifications.listByUser(user.id);
          if (!canceled) setNotifications(list);
        } catch {
          if (!canceled) setNotifications([]);
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
          const docs = await neonApi.docs.listByUser(user.id);
          if (!canceled) setDocsCount(docs.length);
        } catch {
          if (!canceled) setDocsCount(0);
        }
      })();
      return () => {
        canceled = true;
      };
    }, [user.id]);

    const unreadNotifications = notifications.filter(n => !n.isRead).length;
    const latestNotification = notifications[0];

    return (
        <div className="space-y-8 animate-fade-in pb-10">
            {/* Hero Section */}
            <div className="relative bg-slate-900 rounded-[2.5rem] p-10 overflow-hidden shadow-2xl">
                <div className="absolute top-0 right-0 w-full h-full opacity-20">
                    <div className="absolute top-[-50%] right-[-10%] w-[600px] h-[600px] bg-amber-500 rounded-full blur-[150px]"></div>
                    <div className="absolute bottom-[-50%] left-[-10%] w-[500px] h-[500px] bg-indigo-600 rounded-full blur-[150px]"></div>
                </div>
                <div className="relative z-10 flex flex-col md:flex-row justify-between items-end gap-6">
                    <div>
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/10 backdrop-blur-md mb-6">
                            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                            <span className="text-[10px] font-bold text-white uppercase tracking-widest">{t('dashboard.digitalCampusOnline')}</span>
                        </div>
                        <h1 className="text-4xl md:text-5xl font-black text-white tracking-tight leading-[1.1]">
                            {t('dashboard.welcome')}<br/>
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-orange-400">{user.name}</span>
                        </h1>
                        <p className="text-slate-400 mt-4 text-sm font-medium max-w-lg leading-relaxed">
                            {t('dashboard.heroText')}
                        </p>
                        
                        <div className="mt-8 flex gap-4">
                            <button className="px-6 py-3 bg-white text-slate-900 rounded-xl font-bold text-sm hover:bg-amber-400 transition-colors shadow-lg">
                                <i className="fas fa-play mr-2"></i> {t('dashboard.quickStart')}
                            </button>
                            <button className="px-6 py-3 bg-white/5 text-white border border-white/10 rounded-xl font-bold text-sm hover:bg-white/10 transition-colors">
                                <i className="fas fa-file-alt mr-2"></i> {t('dashboard.myCertificates')}
                            </button>
                        </div>
                    </div>
                    <div className="hidden lg:block">
                        <div className="bg-white/10 backdrop-blur-md border border-white/10 p-6 rounded-2xl w-64">
                            <h3 className="text-white text-xs font-bold uppercase tracking-widest mb-4">{t('dashboard.currentStatus')}</h3>
                            <div className="space-y-4">
                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-slate-300">GPA</span>
                                    <span className="font-bold text-white">3.85</span>
                                </div>
                                <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden">
                                    <div className="h-full bg-emerald-400 w-[92%]"></div>
                                </div>
                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-slate-300">{t('dashboard.attendance')}</span>
                                    <span className="font-bold text-white">96%</span>
                                </div>
                                <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden">
                                    <div className="h-full bg-amber-400 w-[96%]"></div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Widgets Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <DashboardWidget 
                    title={t('nav.notifications')} 
                    icon="fa-bell" 
                    value={unreadNotifications > 0 ? t('dashboard.widget.newCount', { count: unreadNotifications }) : t('dashboard.widget.none')} 
                    subtext={latestNotification ? latestNotification.title : t('dashboard.widget.noNotifications')} 
                    color={unreadNotifications > 0 ? 'bg-rose-500' : 'bg-emerald-500'} 
                    to="/notifications"
                />
                <DashboardWidget 
                    title={t('dashboard.widget.schedule')} 
                    icon="fa-calendar-alt" 
                    value="14:30" 
                    subtext={t('dashboard.widget.lectureExample')} 
                    color="bg-indigo-500" 
                />
                <DashboardWidget 
                    title={t('dashboard.widget.deadlines')} 
                    icon="fa-clock" 
                    value={t('dashboard.widget.days2')} 
                    subtext={t('dashboard.widget.courseworkExample')} 
                    color="bg-amber-500"
                    trend={t('dashboard.widget.important')}
                />
                 <DashboardWidget 
                    title={t('nav.docs')} 
                    icon="fa-folder-open" 
                    value={`${docsCount}`} 
                    subtext={docsCount > 0 ? t('dashboard.widget.docsAttachable') : t('dashboard.widget.docsAddToBase')} 
                    color="bg-sky-500" 
                    to="/docs"
                />
            </div>

            {/* Agents Grid */}
            <div>
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-bold text-slate-800">{t('dashboard.availableServices')}</h2>
                    <button className="text-xs font-bold text-slate-400 hover:text-amber-500 uppercase tracking-widest">{t('dashboard.showAll')}</button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {AGENTS.map(agent => (
                         <Link 
                            key={agent.id} 
                            to={`/agent/${agent.id}`}
                            className="group bg-white rounded-3xl p-6 border border-slate-200 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all cursor-pointer relative overflow-hidden flex flex-col"
                        >
                            <div className="flex justify-between items-start mb-4">
                                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-2xl shadow-sm ${agent.bgColor} ${agent.color}`}>
                                    <i className={`fas ${agent.icon}`}></i>
                                </div>
                                <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center group-hover:bg-slate-900 group-hover:text-white transition-colors">
                                    <i className="fas fa-arrow-right text-xs"></i>
                                </div>
                            </div>
                            <h3 className="text-lg font-black text-slate-800 tracking-tight mb-2">{t(agent.nameKey ?? '', undefined, agent.name)}</h3>
                            <p className="text-xs text-slate-500 leading-relaxed font-medium line-clamp-2 flex-1">{t(agent.descriptionKey ?? '', undefined, agent.description)}</p>
                            
                            {agent.id === 'kadr' && (
                                <div className="mt-4 inline-flex items-center gap-2 px-2 py-1 bg-emerald-50 rounded-lg border border-emerald-100 w-fit">
                                    <i className="fas fa-check-circle text-emerald-500 text-[10px]"></i>
                                    <span className="text-[10px] font-bold text-emerald-700">{t('dashboard.availableToStudents')}</span>
                                </div>
                            )}
                        </Link>
                    ))}
                </div>
            </div>
        </div>
    );
};

const Layout: React.FC<{ children: React.ReactNode; user: User; currentId?: string; onLogout: () => void; hideHeader?: boolean; contentClassName?: string }> = ({ children, user, currentId, onLogout, hideHeader, contentClassName }) => {
  const { t } = useI18n();
  const navigate = useNavigate();
  const [globalQuery, setGlobalQuery] = useState('');
  const [isGlobalOpen, setIsGlobalOpen] = useState(false);
  const [docsIndex, setDocsIndex] = useState<Doc[]>([]);
  const [usersIndex, setUsersIndex] = useState<User[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    let canceled = false;
    (async () => {
      try {
        const docs = await neonApi.docs.listByUser(user.id);
        if (!canceled) setDocsIndex(docs);
      } catch {
        if (!canceled) setDocsIndex([]);
      }
    })();
    return () => {
      canceled = true;
    };
  }, [user.id]);

  useEffect(() => {
    if (user.role !== 'ADMIN') {
      setUsersIndex([]);
      return;
    }

    let canceled = false;
    (async () => {
      try {
        const users = (await neonApi.users.list()) as any;
        if (!canceled) setUsersIndex(users);
      } catch {
        if (!canceled) setUsersIndex([]);
      }
    })();
    return () => {
      canceled = true;
    };
  }, [user.role]);

  useEffect(() => {
    let canceled = false;
    (async () => {
      try {
        const c = await neonApi.notifications.countUnread(user.id);
        if (!canceled) setUnreadCount(c);
      } catch {
        if (!canceled) setUnreadCount(0);
      }
    })();
    return () => {
      canceled = true;
    };
  }, [user.id, currentId]);

  const globalResults = useMemo(() => {
    const q = globalQuery.trim().toLowerCase();
    if (!q) return [] as { key: string; title: string; subtitle?: string; icon: string; to: string }[];

    const items: { key: string; title: string; subtitle?: string; icon: string; to: string }[] = [];

    const routes: Array<{ key: string; title: string; subtitle?: string; icon: string; to: string; when?: boolean }> = [
      { key: 'route_app', title: t('nav.dashboard'), subtitle: t('route.subtitle.dashboard'), icon: 'fa-th-large', to: '/app', when: true },
      { key: 'route_docs', title: t('nav.docs'), subtitle: t('route.subtitle.docs'), icon: 'fa-folder-open', to: `/docs?q=${encodeURIComponent(q)}`, when: true },
      { key: 'route_notifications', title: t('nav.notifications'), subtitle: t('route.subtitle.notifications'), icon: 'fa-bell', to: '/notifications', when: true },
      { key: 'route_profile', title: t('nav.profile'), subtitle: t('route.subtitle.profile'), icon: 'fa-user', to: '/profile', when: true },
      { key: 'route_admin', title: t('nav.systemMonitor'), subtitle: t('route.subtitle.admin'), icon: 'fa-server', to: '/admin', when: user.role === 'ADMIN' }
    ];

    for (const r of routes) {
      if (r.when === false) continue;
      const hay = `${r.title} ${r.subtitle ?? ''}`.toLowerCase();
      if (hay.includes(q)) items.push({ key: r.key, title: r.title, subtitle: r.subtitle, icon: r.icon, to: r.to });
    }

    for (const a of AGENTS) {
      const name = t(a.nameKey ?? '', undefined, a.name);
      const fullName = t(a.fullNameKey ?? '', undefined, a.fullName);
      const description = t(a.descriptionKey ?? '', undefined, a.description);
      const primaryFunc = t(a.primaryFuncKey ?? '', undefined, a.primaryFunc);
      const hay = `${name} ${fullName} ${description} ${primaryFunc}`.toLowerCase();
      if (!hay.includes(q)) continue;
      items.push({
        key: `agent_${a.id}`,
        title: name,
        subtitle: fullName,
        icon: a.icon,
        to: `/agent/${a.id}`
      });
    }

    for (const d of docsIndex) {
      const hay = `${d.title}\n${d.content}`.toLowerCase();
      if (!hay.includes(q)) continue;
      items.push({
        key: `doc_${d.id}`,
        title: d.title,
        subtitle: t('route.subtitle.document'),
        icon: 'fa-file-lines',
        to: `/docs?doc=${encodeURIComponent(d.id)}&q=${encodeURIComponent(q)}`
      });
    }

    if (user.role === 'ADMIN') {
      for (const u of usersIndex) {
        const hay = `${u.name} ${u.email} ${u.role} ${u.department ?? ''}`.toLowerCase();
        if (!hay.includes(q)) continue;
        items.push({
          key: `user_${u.id}`,
          title: u.name,
          subtitle: `${u.email} • ${u.role}`,
          icon: 'fa-user',
          to: '/admin'
        });
      }
    }

    return items.slice(0, 10);
  }, [globalQuery, t, user.id, user.role, docsIndex, usersIndex]);

  const runGlobalNavigate = (to: string) => {
    navigate(to);
    setGlobalQuery('');
    setIsGlobalOpen(false);
  };

  const mode = String((import.meta as any)?.env?.MODE ?? '');
  const modeTag = mode === 'development' ? 'DEV' : mode === 'production' ? 'PROD' : (mode ? mode.toUpperCase() : 'APP');

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden font-inter selection:bg-amber-200 selection:text-slate-900">
      <Sidebar user={user} activeAgentId={currentId} onLogout={onLogout} />
      <main className="flex-1 h-full overflow-hidden flex flex-col relative z-10">
        <header className={`h-20 bg-white/80 backdrop-blur-md border-b border-slate-200 flex items-center justify-between px-8 shrink-0 z-30 ${hideHeader ? 'hidden' : ''}`}>
          <div className="flex items-center gap-6">
             {/* Global Search */}
             <div className="relative w-96 hidden md:block">
                <i className="fas fa-search absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-sm"></i>
                <input 
                    type="text" 
                    placeholder={t('dashboard.searchPlaceholder')} 
                    value={globalQuery}
                    onFocus={() => setIsGlobalOpen(true)}
                    onBlur={() => setTimeout(() => setIsGlobalOpen(false), 120)}
                    onChange={e => {
                      setGlobalQuery(e.target.value);
                      setIsGlobalOpen(true);
                    }}
                    onKeyDown={e => {
                      if (e.key === 'Escape') setIsGlobalOpen(false);
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        if (globalResults[0]) runGlobalNavigate(globalResults[0].to);
                        else if (globalQuery.trim()) runGlobalNavigate(`/docs?q=${encodeURIComponent(globalQuery.trim())}`);
                      }
                    }}
                    className="w-full bg-slate-100 border-none rounded-xl py-3 pl-10 pr-4 text-sm font-medium text-slate-600 focus:ring-2 ring-amber-500/20 focus:bg-white transition-all"
                />

                {isGlobalOpen && globalQuery.trim() && (
                  <div
                    className="absolute left-0 right-0 mt-3 bg-white rounded-2xl border border-slate-200 shadow-2xl overflow-hidden"
                    onMouseDown={e => e.preventDefault()}
                  >
                    {globalResults.length === 0 ? (
                      <div className="p-4 text-sm text-slate-500 font-medium">
                        {t('dashboard.nothingFound')}
                      </div>
                    ) : (
                      <div className="divide-y divide-slate-50">
                        {globalResults.map(item => (
                          <button
                            key={item.key}
                            onClick={() => runGlobalNavigate(item.to)}
                            className="w-full text-left p-4 hover:bg-slate-50 transition-colors flex items-start gap-3"
                          >
                            <div className="w-9 h-9 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center shrink-0">
                              <i className={`fas ${item.icon} text-sm`}></i>
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-black text-slate-800 truncate">{item.title}</p>
                              {item.subtitle && <p className="text-xs text-slate-500 font-medium truncate mt-0.5">{item.subtitle}</p>}
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
             </div>
          </div>
          <div className="flex items-center gap-4">
             <Link to="/notifications" className="w-10 h-10 rounded-xl bg-white border border-slate-200 text-slate-500 hover:text-amber-500 hover:shadow-md transition-all flex items-center justify-center relative">
                 <i className="fas fa-bell"></i>
                 {unreadCount > 0 && (
                    <span className="absolute top-2 right-2 w-2 h-2 bg-rose-500 rounded-full border border-white"></span>
                 )}
             </Link>
             <div className="px-4 py-2 bg-emerald-50 rounded-xl border border-emerald-100 flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
                  <span className="text-[10px] font-black text-emerald-700 uppercase tracking-widest" title={`mode: ${mode}`}>{modeTag}</span>
              </div>
          </div>
        </header>

        <div className={`flex-1 overflow-y-auto overflow-x-hidden scroll-smooth custom-scrollbar ${contentClassName ?? 'p-8'}`}>
          {children}
        </div>
      </main>
    </div>
  );
};

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const saved = localStorage.getItem('bolashak_auth_session');
    if (saved) {
      setCurrentUser(JSON.parse(saved));
    }
    setLoading(false);
  }, []);

  const handleLogin = (user: User) => {
    setCurrentUser(user);
    localStorage.setItem('bolashak_auth_session', JSON.stringify(user));
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem('bolashak_auth_session');
  };

  if (loading) return null;

  return (
    <Router>
      <Routes>
        <Route path="/auth" element={<AuthRoute user={currentUser} onLogin={handleLogin} />} />
        
        <Route path="/" element={
            <Home />
        } />

        <Route path="/app" element={
            <ProtectedRoute user={currentUser}>
                <Layout user={currentUser!} currentId="app" onLogout={handleLogout}>
                    <Dashboard user={currentUser!} />
                </Layout>
            </ProtectedRoute>
        } />

        <Route path="/agent/:id" element={
            <ProtectedRoute user={currentUser}>
                <AgentView user={currentUser!} onLogout={handleLogout} />
            </ProtectedRoute>
        } />

        <Route path="/profile" element={
            <ProtectedRoute user={currentUser}>
                <Layout user={currentUser!} currentId="profile" onLogout={handleLogout}>
                    <Profile user={currentUser!} onUpdate={handleLogin} />
                </Layout>
            </ProtectedRoute>
        } />

        <Route path="/notifications" element={
            <ProtectedRoute user={currentUser}>
                <Layout user={currentUser!} currentId="notifications" onLogout={handleLogout}>
                    <Notifications user={currentUser!} />
                </Layout>
            </ProtectedRoute>
        } />

        <Route path="/docs" element={
            <ProtectedRoute user={currentUser}>
                <Layout user={currentUser!} currentId="docs" onLogout={handleLogout}>
                    <Docs user={currentUser!} />
                </Layout>
            </ProtectedRoute>
        } />

        <Route path="/admin" element={
            <ProtectedRoute user={currentUser} minRole="ADMIN">
                <Layout user={currentUser!} currentId="admin" onLogout={handleLogout}>
                    <AdminPanel />
                </Layout>
            </ProtectedRoute>
        } />
      </Routes>
    </Router>
  );
};

const AgentView: React.FC<{ user: User; onLogout: () => void }> = ({ user, onLogout }) => {
    const location = useLocation();
    const agentId = location.pathname.split('/').pop() as AgentId;
    const agent = AGENTS.find(a => a.id === agentId);

    if (!agent) return <Navigate to="/" replace />;

    return (
        <Layout user={user} currentId={agentId} onLogout={onLogout}>
            <div className="h-[calc(100vh-5rem-4rem)] min-h-0 grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_420px] gap-6 max-w-7xl mx-auto w-full overflow-hidden">
              <div className="h-full min-h-0">
                <ChatWindow agent={agent} />
              </div>
              <div className="h-full min-h-0 flex flex-col gap-6 overflow-hidden">
                {agent.id === 'career' && (
                  <div className="min-h-0 flex-1">
                    <VacanciesPanel />
                  </div>
                )}
                <div className="min-h-0 flex-1">
                  <AgentToolsPanel agent={agent} userId={user.id} />
                </div>
              </div>
            </div>
        </Layout>
    );
};

export default App;
