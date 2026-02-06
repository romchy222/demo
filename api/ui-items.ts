import { getUiItems, initializeTables } from './_db';

export default async function handler(req: any, res: any) {
  try {
    if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

    await initializeTables();

    const agentId = String(req.query.agentId || '');
    const kind = String(req.query.kind || '');
    const groupKey = req.query.groupKey != null ? String(req.query.groupKey) : undefined;

    if (!agentId || !kind) {
      return res.status(400).json({ error: 'agentId and kind required' });
    }

    const items = await getUiItems(agentId as any, kind as any, groupKey);
    return res.status(200).json(items);
  } catch (e: any) {
    console.error('ui-items error:', e);
    return res.status(500).json({ error: e?.message ?? 'unknown' });
  }
}

