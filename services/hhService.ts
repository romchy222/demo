export interface HhSalary {
  from: number | null;
  to: number | null;
  currency: string | null;
  gross: boolean | null;
}

export interface HhVacancy {
  id: string;
  name: string;
  employerName: string | null;
  areaName: string | null;
  publishedAt: string | null;
  url: string | null;
  salary: HhSalary | null;
}

export interface HhVacancySearchResult {
  items: HhVacancy[];
  found: number;
  page: number;
  pages: number;
  perPage: number;
}

export interface SearchVacanciesParams {
  text: string;
  area?: string;
  page?: number;
  perPage?: number;
  signal?: AbortSignal;
}

const DEFAULT_BASE = '/api/hh';
const DEFAULT_AREA = '40';

const getBaseUrl = () => {
  const raw = (import.meta as any)?.env?.VITE_HH_API_BASE as string | undefined;
  return raw?.trim() ? raw.trim().replace(/\/+$/, '') : DEFAULT_BASE;
};

const getDefaultArea = () => {
  const raw = (import.meta as any)?.env?.VITE_HH_AREA as string | undefined;
  return raw?.trim() ? raw.trim() : DEFAULT_AREA;
};

const toQuery = (params: Record<string, string | number | boolean | null | undefined>) => {
  const qp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null || v === '') continue;
    qp.set(k, String(v));
  }
  const s = qp.toString();
  return s ? `?${s}` : '';
};

export const formatSalary = (
  salary: HhSalary | null,
  opts?: { locale?: string; fromLabel?: string; toLabel?: string; rangeSeparator?: string }
) => {
  if (!salary) return null;
  const from = salary.from ?? null;
  const to = salary.to ?? null;
  const cur = salary.currency ?? '';
  const locale = opts?.locale ?? 'ru-RU';
  const fromLabel = opts?.fromLabel ?? 'от';
  const toLabel = opts?.toLabel ?? 'до';
  const rangeSeparator = opts?.rangeSeparator ?? '–';

  if (from == null && to == null) return null;
  if (from != null && to != null) return `${from.toLocaleString(locale)}${rangeSeparator}${to.toLocaleString(locale)} ${cur}`.trim();
  if (from != null) return `${fromLabel} ${from.toLocaleString(locale)} ${cur}`.trim();
  return `${toLabel} ${to!.toLocaleString(locale)} ${cur}`.trim();
};

export async function searchVacancies(params: SearchVacanciesParams): Promise<HhVacancySearchResult> {
  const base = getBaseUrl();
  const page = params.page ?? 0;
  const perPage = params.perPage ?? 20;
  const area = params.area ?? getDefaultArea();

  const url =
    `${base}/vacancies` +
    toQuery({
      text: params.text,
      area,
      page,
      per_page: perPage
    });

  const res = await fetch(url, {
    method: 'GET',
    headers: { Accept: 'application/json' },
    signal: params.signal
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`HH request failed: ${res.status} ${res.statusText}${body ? ` — ${body.slice(0, 200)}` : ''}`);
  }

  const data = await res.json();

  const items: HhVacancy[] = (data.items ?? []).map((v: any) => ({
    id: String(v.id),
    name: String(v.name ?? ''),
    employerName: v.employer?.name ?? null,
    areaName: v.area?.name ?? null,
    publishedAt: v.published_at ?? null,
    url: v.alternate_url ?? v.url ?? null,
    salary: v.salary
      ? {
          from: v.salary.from ?? null,
          to: v.salary.to ?? null,
          currency: v.salary.currency ?? null,
          gross: v.salary.gross ?? null
        }
      : null
  }));

  return {
    items,
    found: Number(data.found ?? items.length),
    page: Number(data.page ?? page),
    pages: Number(data.pages ?? 0),
    perPage
  };
}
