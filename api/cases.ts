import { createCase, getCasesByUserAndAgent, initializeTables, updateCase } from './_db';
import type { AgentId, WorkflowCase } from '../types';

function uuid() {
  // Node 18+ / Vercel has crypto.randomUUID()
  return (globalThis.crypto as any)?.randomUUID?.() ?? `c_${Math.random().toString(16).slice(2)}_${Date.now()}`;
}

export default async function handler(req: any, res: any) {
  try {
    await initializeTables();

    if (req.method === 'GET') {
      const userId = String(req.query.userId || '');
      const agentId = String(req.query.agentId || '') as AgentId;
      if (!userId || !agentId) return res.status(400).json({ error: 'userId and agentId required' });
      const items = await getCasesByUserAndAgent(userId, agentId);
      return res.status(200).json(items);
    }

    if (req.method === 'POST') {
      const body = req.body ?? {};
      const userId = String(body.userId || '');
      const agentId = String(body.agentId || '') as AgentId;
      const caseType = String(body.caseType || '');
      const title = body.title != null ? String(body.title) : null;
      const payload = body.payload != null ? (body.payload as any) : null;

      if (!userId || !agentId || !caseType) return res.status(400).json({ error: 'userId, agentId, caseType required' });

      const now = new Date().toISOString();
      const item: WorkflowCase = {
        id: uuid(),
        userId,
        agentId,
        caseType,
        title,
        status: 'OPEN',
        payload,
        createdAt: now,
        updatedAt: now
      };

      await createCase(item);
      return res.status(201).json(item);
    }

    if (req.method === 'PATCH') {
      const id = String(req.query.id || '');
      if (!id) return res.status(400).json({ error: 'id required' });

      const body = req.body ?? {};
      const status = body.status != null ? String(body.status) : undefined;
      const title = body.title != null ? String(body.title) : undefined;
      const payload = body.payload != null ? (body.payload as any) : undefined;

      await updateCase(id, { status: status as any, title, payload });
      return res.status(200).json({ success: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (e: any) {
    console.error('cases error:', e);
    return res.status(500).json({ error: e?.message ?? 'unknown' });
  }
}

