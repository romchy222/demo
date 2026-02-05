import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useT } from '../i18n/i18n';
import { LanguageSelect } from './LanguageSelect';

type MediaItem = {
  src: string;
  alt: string;
  heightClass: string;
  fallbackTitle: string;
  fallbackSubtitle: string;
};

const MediaCard: React.FC<{ item: MediaItem }> = ({ item }) => {
  const [failed, setFailed] = useState(false);

  return (
    <div className={`relative overflow-hidden rounded-2xl border border-white/10 bg-white/5 shadow-2xl ${item.heightClass}`}>
      {!failed ? (
        <img
          src={item.src}
          alt={item.alt}
          className="absolute inset-0 w-full h-full object-cover"
          onError={() => setFailed(true)}
        />
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-700/40 via-slate-900 to-rose-700/30" />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
      <div className="absolute inset-0 ring-1 ring-white/10 rounded-2xl pointer-events-none" />
      <div className="relative z-10 p-6 h-full flex flex-col justify-end">
        <p className="text-white font-black tracking-tight text-lg">{item.fallbackTitle}</p>
        <p className="text-white/70 text-xs font-medium mt-1 leading-relaxed">{item.fallbackSubtitle}</p>
      </div>
    </div>
  );
};

const SectionTitle: React.FC<{ icon: string; title: string }> = ({ icon, title }) => (
  <div className="flex items-center gap-3 mt-8">
    <div className="w-9 h-9 rounded-full bg-white/5 ring-1 ring-white/10 flex items-center justify-center text-white/90">
      <i className={`fas ${icon}`}></i>
    </div>
    <h3 className="text-xl font-black text-indigo-200 tracking-tight">{title}</h3>
  </div>
);

export const Home: React.FC = () => {
  const t = useT();
  const isAuthed = useMemo(() => {
    try {
      const raw = localStorage.getItem('bolashak_auth_session');
      if (!raw) return false;
      const parsed = JSON.parse(raw);
      return Boolean(parsed?.id);
    } catch {
      return false;
    }
  }, []);

  const media = useMemo<MediaItem[]>(
    () => [
      {
        src: '/ai-sana/cover.jpg',
        alt: 'AI-Sana',
        heightClass: 'h-56',
        fallbackTitle: t('home.aiSanaTitle'),
        fallbackSubtitle: t('home.aiSanaSubtitle')
      },
      {
        src: '/ai-sana/event.jpg',
        alt: 'AI-Sana event',
        heightClass: 'h-72',
        fallbackTitle: t('home.communityTitle'),
        fallbackSubtitle: t('home.communitySubtitle')
      }
    ],
    [t]
  );

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-slate-950">
      {/* Background */}
      <div className="absolute inset-0 bg-slate-950" />
      <div
        className="absolute inset-0 opacity-40"
        style={{
          backgroundImage: 'radial-gradient(rgba(255,255,255,0.18) 1px, transparent 1px)',
          backgroundSize: '42px 42px',
          backgroundPosition: '0 0'
        }}
      />
      <div
        className="absolute inset-0 opacity-20"
        style={{
          backgroundImage: 'radial-gradient(rgba(255,255,255,0.20) 1px, transparent 1px)',
          backgroundSize: '160px 160px',
          backgroundPosition: '20px 35px'
        }}
      />
      <div className="absolute inset-0 bg-gradient-to-b from-black via-slate-950/80 to-indigo-950/40" />
      <div className="absolute -top-40 -right-40 w-[520px] h-[520px] rounded-full bg-indigo-600/10 blur-3xl" />
      <div className="absolute -bottom-48 -left-40 w-[560px] h-[560px] rounded-full bg-rose-600/10 blur-3xl" />

      {/* Content */}
      <div className="relative z-10 max-w-7xl mx-auto px-8 py-12">
        <div className="flex items-center justify-between gap-4 mb-10">
          <div className="flex items-center gap-3 text-white/90">
            <div className="w-11 h-11 rounded-2xl bg-white/5 ring-1 ring-white/10 flex items-center justify-center">
              <i className="fas fa-graduation-cap text-white"></i>
            </div>
            <div className="leading-tight">
              <p className="text-sm font-black tracking-tight text-white">BOLASHAK</p>
              <p className="text-[10px] font-bold uppercase tracking-widest text-white/60">AI ECOSYSTEM</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <LanguageSelect variant="light" />
            <Link
              to="/app"
              className="px-4 py-2.5 rounded-2xl bg-white text-slate-900 text-xs font-black uppercase tracking-widest hover:bg-indigo-100 transition-colors"
              title={t('home.goAi')}
            >
              <i className="fas fa-wand-magic-sparkles mr-2"></i>
              {t('home.ai')}
            </Link>
            <Link
              to="/auth"
              className="px-4 py-2.5 rounded-2xl bg-white/10 ring-1 ring-white/15 text-white text-xs font-black uppercase tracking-widest hover:bg-white/15 transition-colors"
              title={isAuthed ? t('home.switchUser') : t('home.auth')}
            >
              <i className="fas fa-right-to-bracket mr-2"></i>
              {isAuthed ? t('home.switch') : t('home.enter')}
            </Link>
          </div>
        </div>

        <div className="text-center mb-10">
          <h1 className="text-4xl md:text-6xl font-black tracking-tight text-white">
            {t('home.about')}{' '}
            <span className="bg-gradient-to-r from-indigo-300 via-white to-indigo-300 bg-clip-text text-transparent">
              {t('home.aiSanaTitle')}
            </span>
          </h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_460px] gap-10 items-start">
          <div className="text-white/90">
            <p className="text-sm md:text-base leading-relaxed text-white/80 max-w-2xl">
              {t('home.programText')}
            </p>

            <SectionTitle icon="fa-bullseye" title={t('home.programGoals')} />
            <ul className="mt-4 space-y-2 text-sm text-white/80">
              <li className="flex gap-3">
                <span className="mt-2 w-1.5 h-1.5 rounded-full bg-white/60 shrink-0"></span>
                {t('home.goal1')}
              </li>
              <li className="flex gap-3">
                <span className="mt-2 w-1.5 h-1.5 rounded-full bg-white/60 shrink-0"></span>
                {t('home.goal2')}
              </li>
              <li className="flex gap-3">
                <span className="mt-2 w-1.5 h-1.5 rounded-full bg-white/60 shrink-0"></span>
                {t('home.goal3')}
              </li>
              <li className="flex gap-3">
                <span className="mt-2 w-1.5 h-1.5 rounded-full bg-white/60 shrink-0"></span>
                {t('home.goal4')}
              </li>
            </ul>

            <SectionTitle icon="fa-lightbulb" title={t('home.mainDirections')} />
            <ol className="mt-4 space-y-2 text-sm text-white/80 list-decimal pl-5">
              <li>{t('home.dir1')}</li>
              <li>{t('home.dir2')}</li>
              <li>{t('home.dir3')}</li>
              <li>{t('home.dir4')}</li>
            </ol>

            <SectionTitle icon="fa-chart-line" title={t('home.expectedEffects')} />
            <p className="mt-4 text-sm leading-relaxed text-white/80 max-w-2xl">
              {t('home.effectsText')}
            </p>
          </div>

          <div className="space-y-6">
            {media.map(item => (
              <MediaCard key={item.src} item={item} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
