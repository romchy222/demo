import { clearMessages, getMessages, getMessagesByUserAndAgent, initializeTables, saveMessage } from './_db';
import type { Message } from '../types';

export default async function handler(req: any, res: any) {
  try {
    await initializeTables();

    if (req.method === 'GET') {
      const userId = req.query.userId != null ? String(req.query.userId) : null;
      const agentId = req.query.agentId != null ? String(req.query.agentId) : null;
      if (userId && agentId) {
        const msgs = await getMessagesByUserAndAgent(userId, agentId);
        return res.status(200).json(msgs);
      }
      const all = await getMessages();
      return res.status(200).json(all);
    }

    if (req.method === 'POST') {
      const body = req.body ?? {};
      const message = body as Message;
      if (!message?.id || !message?.userId || !message?.agentId || !message?.role) {
        return res.status(400).json({ error: 'invalid message' });
      }
      await saveMessage(message);
      return res.status(201).json({ success: true });
    }

    if (req.method === 'DELETE') {
      const userId = String(req.query.userId || '');
      const agentId = String(req.query.agentId || '');
      if (!userId || !agentId) return res.status(400).json({ error: 'userId and agentId required' });
      await clearMessages(userId, agentId);
      return res.status(200).json({ success: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (e: any) {
    console.error('messages error:', e);
    return res.status(500).json({ error: e?.message ?? 'unknown' });
  }
}

