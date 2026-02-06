import { clearAuditLog, getAuditLog, initializeTables, logAuditEvent } from './_db';
import type { AuditEvent } from '../types';

export default async function handler(req: any, res: any) {
  try {
    await initializeTables();

    if (req.method === 'GET') {
      return res.status(200).json(await getAuditLog());
    }

    if (req.method === 'POST') {
      const body = req.body ?? {};
      const event = body as Omit<AuditEvent, 'id'>;
      if (!event?.type) return res.status(400).json({ error: 'type required' });
      await logAuditEvent(event as any);
      return res.status(201).json({ success: true });
    }

    if (req.method === 'DELETE') {
      await clearAuditLog();
      return res.status(200).json({ success: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (e: any) {
    console.error('audit error:', e);
    return res.status(500).json({ error: e?.message ?? 'unknown' });
  }
}

