import { createUser, getUsers, initializeTables, updateUser } from './_db';
import type { User } from '../types';
import { hashPassword } from '../services/password';

function strip(user: User) {
  const { passwordHash, ...rest } = user;
  return rest;
}

export default async function handler(req: any, res: any) {
  try {
    await initializeTables();

    if (req.method === 'GET') {
      const users = await getUsers();
      return res.status(200).json(users.map(strip));
    }

    if (req.method === 'POST') {
      const body = req.body ?? {};
      const email = String(body.email || '').trim().toLowerCase();
      const name = String(body.name || '').trim();
      const role = String(body.role || 'STUDENT');
      const department = body.department != null ? String(body.department) : undefined;
      const password = body.password != null ? String(body.password) : undefined;

      if (!email || !name) return res.status(400).json({ error: 'email and name required' });

      const user: User = {
        id: (globalThis.crypto as any)?.randomUUID?.() ?? `u_${Math.random().toString(16).slice(2)}_${Date.now()}`,
        email,
        name,
        role: (role as any) || 'STUDENT',
        department,
        passwordHash: password ? hashPassword(password) : undefined,
        joinedAt: new Date().toISOString()
      };

      await createUser(user);
      return res.status(201).json(strip(user));
    }

    if (req.method === 'PATCH') {
      const id = String(req.query.id || '');
      if (!id) return res.status(400).json({ error: 'id required' });

      const body = req.body ?? {};
      const updates: Partial<User> = {};
      if (body.email != null) updates.email = String(body.email).trim().toLowerCase();
      if (body.name != null) updates.name = String(body.name);
      if (body.role != null) updates.role = String(body.role) as any;
      if (body.avatar !== undefined) updates.avatar = body.avatar ? String(body.avatar) : undefined;
      if (body.department !== undefined) updates.department = body.department ? String(body.department) : undefined;
      if (body.password != null) updates.passwordHash = hashPassword(String(body.password));

      await updateUser(id, updates);
      return res.status(200).json({ success: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (e: any) {
    console.error('users error:', e);
    return res.status(500).json({ error: e?.message ?? 'unknown' });
  }
}

