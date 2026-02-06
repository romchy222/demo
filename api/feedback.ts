import { getFeedback, getFeedbackByMessage, initializeTables, upsertFeedback } from './_db.ts';
import type { MessageFeedback } from '../types';

export default async function handler(req: any, res: any) {
  try {
    await initializeTables();

    if (req.method === 'GET') {
      const messageId = req.query.messageId != null ? String(req.query.messageId) : null;
      if (messageId) return res.status(200).json(await getFeedbackByMessage(messageId));
      return res.status(200).json(await getFeedback());
    }

    if (req.method === 'POST') {
      const fb = (req.body ?? {}) as MessageFeedback;
      if (!fb?.id || !fb?.messageId || !fb?.userId || !fb?.agentId || !fb?.rating) return res.status(400).json({ error: 'invalid feedback' });
      await upsertFeedback(fb);
      return res.status(201).json({ success: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (e: any) {
    console.error('feedback error:', e);
    return res.status(500).json({ error: e?.message ?? 'unknown' });
  }
}

