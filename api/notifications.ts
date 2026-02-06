import { broadcastNotification, countUnreadNotifications, createNotification, getNotifications, getNotificationsByUser, initializeTables, markNotificationAsRead } from './_db';
import type { Notification } from '../types';

export default async function handler(req: any, res: any) {
  try {
    await initializeTables();

    if (req.method === 'GET') {
      const userId = req.query.userId != null ? String(req.query.userId) : null;
      const mode = String(req.query.mode || '');
      if (mode === 'count' && userId) {
        const count = await countUnreadNotifications(userId);
        return res.status(200).json({ count });
      }
      if (userId) return res.status(200).json(await getNotificationsByUser(userId));
      return res.status(200).json(await getNotifications());
    }

    if (req.method === 'PATCH') {
      const id = String(req.query.id || '');
      if (!id) return res.status(400).json({ error: 'id required' });
      await markNotificationAsRead(id);
      return res.status(200).json({ success: true });
    }

    if (req.method === 'POST') {
      const mode = String(req.query.mode || '');
      const body = req.body ?? {};

      if (mode === 'broadcast') {
        const title = String(body.title || '').trim();
        const message = String(body.message || '').trim();
        const severity = body.severity != null ? String(body.severity) : undefined;
        const link = body.link != null ? String(body.link) : undefined;
        if (!title || !message) return res.status(400).json({ error: 'title and message required' });
        await broadcastNotification(title, message, { severity, createdBy: 'ADMIN', link });
        return res.status(201).json({ success: true });
      }

      const n = body as Notification;
      if (!n?.id || !n?.userId || !n?.title || !n?.message) return res.status(400).json({ error: 'invalid notification' });
      await createNotification(n);
      return res.status(201).json({ success: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (e: any) {
    console.error('notifications error:', e);
    return res.status(500).json({ error: e?.message ?? 'unknown' });
  }
}

