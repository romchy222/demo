const HH_BASE = 'https://api.hh.ru';

const pick = (q: any, key: string) => {
  const v = q?.[key];
  if (Array.isArray(v)) return v[0];
  return v;
};

export default async function handler(req: any, res: any) {
  try {
    const text = pick(req.query, 'text') ?? '';
    const area = pick(req.query, 'area') ?? undefined;
    const page = pick(req.query, 'page') ?? undefined;
    const perPage = pick(req.query, 'per_page') ?? pick(req.query, 'perPage') ?? undefined;

    const url = new URL('/vacancies', HH_BASE);
    url.searchParams.set('text', String(text));
    if (area != null) url.searchParams.set('area', String(area));
    if (page != null) url.searchParams.set('page', String(page));
    if (perPage != null) url.searchParams.set('per_page', String(perPage));

    const upstream = await fetch(url.toString(), {
      headers: {
        Accept: 'application/json',
        'User-Agent': 'bolashak-ai/1.0 (vercel)'
      }
    });

    const body = await upstream.text();
    res.status(upstream.status);
    res.setHeader('Content-Type', upstream.headers.get('content-type') ?? 'application/json; charset=utf-8');
    res.send(body);
  } catch (e: any) {
    res.status(500).json({ error: e?.message ?? 'proxy_error' });
  }
}

