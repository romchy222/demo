import { addCaseMessage, getCaseMessages, initializeTables } from './_db.ts';
import type { CaseMessage } from '../types';

function uuid() {
  return (globalThis.crypto as any)?.randomUUID?.() ?? `m_${Math.random().toString(16).slice(2)}_${Date.now()}`;
}

export default async function handler(req: any, res: any) {
  try {
    await initializeTables();

    if (req.method === 'GET') {
      const caseId = String(req.query.caseId || '');
      if (!caseId) return res.status(400).json({ error: 'caseId required' });
      const items = await getCaseMessages(caseId);
      return res.status(200).json(items);
    }

    if (req.method === 'POST') {
      const body = req.body ?? {};
      const caseId = String(body.caseId || '');
      const authorUserId = body.authorUserId != null ? String(body.authorUserId) : null;
      const authorRole = String(body.authorRole || 'USER');
      const message = String(body.message || '');

      if (!caseId || !message) return res.status(400).json({ error: 'caseId and message required' });

      const now = new Date().toISOString();
      const m: CaseMessage = {
        id: uuid(),
        caseId,
        authorUserId,
        authorRole: authorRole === 'ADMIN' ? 'ADMIN' : 'USER',
        message,
        createdAt: now
      };

      await addCaseMessage(m);
      return res.status(201).json(m);
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (e: any) {
    console.error('case-messages error:', e);
    return res.status(500).json({ error: e?.message ?? 'unknown' });
  }
}

