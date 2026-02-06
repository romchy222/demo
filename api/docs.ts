import { createDoc, getDocs, getDocsByUser, initializeTables, removeDoc, updateDoc } from './_db';
import type { Doc } from '../types';

export default async function handler(req: any, res: any) {
  try {
    await initializeTables();

    if (req.method === 'GET') {
      const userId = req.query.userId != null ? String(req.query.userId) : null;
      if (userId) return res.status(200).json(await getDocsByUser(userId));
      return res.status(200).json(await getDocs());
    }

    if (req.method === 'POST') {
      const doc = (req.body ?? {}) as Doc;
      if (!doc?.id || !doc?.userId || !doc?.title || !doc?.content) return res.status(400).json({ error: 'invalid doc' });
      await createDoc(doc);
      return res.status(201).json({ success: true });
    }

    if (req.method === 'PUT') {
      const id = String(req.query.id || '');
      if (!id) return res.status(400).json({ error: 'id required' });
      await updateDoc(id, req.body ?? {});
      return res.status(200).json({ success: true });
    }

    if (req.method === 'DELETE') {
      const id = String(req.query.id || '');
      if (!id) return res.status(400).json({ error: 'id required' });
      await removeDoc(id);
      return res.status(200).json({ success: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (e: any) {
    console.error('docs error:', e);
    return res.status(500).json({ error: e?.message ?? 'unknown' });
  }
}

