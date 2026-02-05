import React from 'react';
import { Lang, useI18n } from '../i18n/i18n';

const OPTIONS: Array<{ value: Lang; labelKey: string }> = [
  { value: 'ru', labelKey: 'lang.ru' },
  { value: 'en', labelKey: 'lang.en' },
  { value: 'kk', labelKey: 'lang.kk' }
];

export const LanguageSelect: React.FC<{ className?: string; variant?: 'light' | 'dark' }> = ({
  className,
  variant = 'dark'
}) => {
  const { lang, setLang, t } = useI18n();

  const base =
    variant === 'dark'
      ? 'bg-slate-800 text-white border-white/10 hover:bg-slate-700'
      : 'bg-white/10 text-white border-white/15 hover:bg-white/15';

  return (
    <div className={className}>
      <label className="sr-only" htmlFor="lang">
        {t('lang.label')}
      </label>
      <select
        id="lang"
        value={lang}
        onChange={e => setLang(e.target.value as Lang)}
        className={`px-3 py-2 rounded-xl text-xs font-black uppercase tracking-widest border outline-none transition-colors ${base}`}
        title={t('lang.label')}
      >
        {OPTIONS.map(o => (
          <option key={o.value} value={o.value} className="text-slate-900">
            {t(o.labelKey)}
          </option>
        ))}
      </select>
    </div>
  );
};

