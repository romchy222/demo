import React, { useEffect, useMemo, useState } from 'react';
import { formatSalary, HhVacancy, searchVacancies } from '../services/hhService';
import { useI18n } from '../i18n/i18n';

interface VacanciesPanelProps {
  defaultQuery?: string;
}

export const VacanciesPanel: React.FC<VacanciesPanelProps> = ({ defaultQuery = 'Кызылорда' }) => {
  const { t, locale } = useI18n();
  const [draft, setDraft] = useState(defaultQuery);
  const [query, setQuery] = useState(defaultQuery);
  const [reloadNonce, setReloadNonce] = useState(0);
  const [items, setItems] = useState<HhVacancy[]>([]);
  const [found, setFound] = useState<number | null>(null);
  const [page, setPage] = useState(0);
  const [pages, setPages] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canLoadMore = useMemo(() => {
    if (pages == null) return false;
    return page < pages - 1;
  }, [page, pages]);

  useEffect(() => {
    const controller = new AbortController();
    const run = async () => {
      if (!query.trim()) return;
      setIsLoading(true);
      setError(null);
      try {
        const res = await searchVacancies({
          text: query.trim(),
          page,
          perPage: 20,
          signal: controller.signal
        });
        setFound(res.found);
        setPages(res.pages);
        setItems(prev => (page === 0 ? res.items : [...prev, ...res.items]));
      } catch (e: any) {
        if (e?.name === 'AbortError') return;
        setError(e?.message || t('vacancies.err.loadFailed'));
      } finally {
        setIsLoading(false);
      }
    };
    run();
    return () => controller.abort();
  }, [query, page, reloadNonce]);

  const submit = () => {
    const next = draft.trim();
    if (!next) return;
    setItems([]);
    setFound(null);
    setPages(null);
    setPage(0);
    setQuery(next);
    setReloadNonce(n => n + 1);
  };

  const quickSearch = (text: string) => {
    const next = text.trim();
    if (!next) return;
    setDraft(next);
    setItems([]);
    setFound(null);
    setPages(null);
    setPage(0);
    setQuery(next);
    setReloadNonce(n => n + 1);
  };

  return (
    <div className="flex flex-col h-full bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden animate-fade-in">
      <div className="p-4 border-b bg-rose-50/60 backdrop-blur-md bg-opacity-90">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-white text-rose-600 shadow-sm flex items-center justify-center text-xl">
              <i className="fas fa-briefcase"></i>
            </div>
            <div className="overflow-hidden">
              <h2 className="font-bold text-slate-800 text-lg leading-none">{t('vacancies.title')}</h2>
              <p className="text-xs text-slate-600 font-medium truncate">
                {found == null ? t('vacancies.searchByQuery') : t('vacancies.found', { count: found.toLocaleString(locale) })}
              </p>
            </div>
          </div>
          <button
            onClick={() => submit()}
            className="px-3 py-2 rounded-xl text-xs font-bold bg-slate-900 text-white hover:bg-rose-600 transition-colors shadow-sm"
            title={t('vacancies.refreshTitle')}
          >
            <i className="fas fa-rotate-right mr-2"></i>
            {t('vacancies.refresh')}
          </button>
        </div>

        <div className="mt-3 flex gap-2">
          <div className="flex-1 bg-white rounded-2xl p-2 border border-slate-200 focus-within:ring-2 ring-rose-500/20 transition-all flex items-center gap-2">
            <i className="fas fa-magnifying-glass text-slate-400 ml-2"></i>
            <input
              value={draft}
              onChange={e => setDraft(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), submit())}
              placeholder={t('vacancies.searchPlaceholder')}
              className="w-full bg-transparent border-none outline-none text-sm font-medium text-slate-700 py-2"
            />
          </div>
        </div>

        <div className="mt-2 flex gap-2 flex-wrap">
          {['Кызылорда', 'Алматы', 'Астана', 'стажировка', 'junior frontend'].map(s => (
            <button
              key={s}
              onClick={() => quickSearch(s)}
              className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-white/70 border border-white text-slate-600 hover:text-rose-600 hover:bg-white transition-colors"
              title={`${t('vacancies.searchByQuery')}: ${s}`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto bg-slate-50/50 p-4 space-y-3">
        {error && (
          <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-sm font-medium">
            <div className="flex items-start gap-3">
              <i className="fas fa-triangle-exclamation mt-0.5"></i>
              <div className="min-w-0">
                <p className="font-bold">{t('vacancies.err.title')}</p>
                <p className="text-xs mt-1 break-words">{error}</p>
                <p className="text-[10px] mt-2 text-rose-700/80 font-bold uppercase tracking-widest">
                  {t('vacancies.err.hint')}
                </p>
              </div>
            </div>
          </div>
        )}

        {!error && items.length === 0 && !isLoading && (
          <div className="flex flex-col items-center justify-center text-slate-400 opacity-70 py-10">
            <i className="fas fa-briefcase text-5xl mb-4"></i>
            <p className="text-sm font-medium">{t('vacancies.none')}</p>
          </div>
        )}

        {items.map(v => {
          const salary = formatSalary(v.salary, { locale, fromLabel: t('common.from'), toLabel: t('common.to') });
          const published = v.publishedAt ? new Date(v.publishedAt).toLocaleDateString(locale) : null;
          return (
            <a
              key={v.id}
              href={v.url || undefined}
              target="_blank"
              rel="noreferrer"
              className="block bg-white rounded-2xl border border-slate-200 p-4 shadow-sm hover:shadow-md transition-all group"
              title={t('vacancies.openOnHh')}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="text-sm font-black text-slate-800 leading-snug line-clamp-2 group-hover:text-rose-600 transition-colors">
                    {v.name}
                  </h3>
                  <p className="text-xs text-slate-500 font-medium mt-1 truncate">
                    {v.employerName || t('vacancies.companyUnknown')}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {salary && (
                      <span className="px-2 py-1 rounded-full bg-emerald-50 border border-emerald-100 text-emerald-700 text-[10px] font-black">
                        {salary}
                      </span>
                    )}
                    {v.areaName && (
                      <span className="px-2 py-1 rounded-full bg-slate-50 border border-slate-200 text-slate-600 text-[10px] font-black">
                        {v.areaName}
                      </span>
                    )}
                    {published && (
                      <span className="px-2 py-1 rounded-full bg-amber-50 border border-amber-100 text-amber-700 text-[10px] font-black">
                        {published}
                      </span>
                    )}
                  </div>
                </div>
                <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center group-hover:bg-slate-900 group-hover:text-white transition-colors shrink-0">
                  <i className="fas fa-arrow-up-right-from-square text-[10px]"></i>
                </div>
              </div>
            </a>
          );
        })}

        {isLoading && (
          <div className="flex items-center justify-center py-6 text-slate-400">
            <div className="flex items-center gap-3 bg-white px-4 py-3 rounded-2xl border border-slate-200 shadow-sm">
              <div className="flex gap-1">
                <div className="w-2 h-2 bg-rose-500 rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-rose-500 rounded-full animate-bounce delay-100"></div>
                <div className="w-2 h-2 bg-rose-500 rounded-full animate-bounce delay-200"></div>
              </div>
              <span className="text-xs font-bold uppercase tracking-widest">{t('vacancies.loading')}</span>
            </div>
          </div>
        )}
      </div>

      <div className="p-4 border-t bg-white">
        <button
          onClick={() => setPage(p => p + 1)}
          disabled={!canLoadMore || isLoading}
          className={`w-full py-2.5 rounded-2xl text-xs font-black uppercase tracking-widest transition-all ${
            !canLoadMore || isLoading
              ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
              : 'bg-rose-600 text-white hover:bg-rose-700 shadow-sm'
          }`}
          title={canLoadMore ? t('vacancies.showMoreTitle') : t('vacancies.noMorePages')}
        >
          {canLoadMore ? t('vacancies.showMore') : t('vacancies.end')}
        </button>
      </div>
    </div>
  );
};
