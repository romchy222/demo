import { createUser, getUserByEmail, initializeTables } from './_db.ts';
import type { User } from '../types';
import { hashPassword, verifyPassword } from '../services/password.ts';

function uuid() {
  return (globalThis.crypto as any)?.randomUUID?.() ?? `u_${Math.random().toString(16).slice(2)}_${Date.now()}`;
}

function strip(user: User) {
  const { passwordHash, ...rest } = user;
  return rest;
}

export default async function handler(req: any, res: any) {
  try {
    await initializeTables();

    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    const mode = String(req.query.mode || 'login');
    const body = req.body ?? {};

    const email = String(body.email || '').trim().toLowerCase();
    const password = String(body.password || '');

    if (!email || !password) return res.status(400).json({ error: 'email and password required' });

    if (mode === 'register') {
      const name = String(body.name || '').trim();
      if (!name) return res.status(400).json({ error: 'name required' });
      if (password.length < 6) return res.status(400).json({ error: 'password too short' });

      const existing = await getUserByEmail(email);
      if (existing) return res.status(409).json({ error: 'email already exists' });

      const user: User = {
        id: uuid(),
        email,
        name,
        role: 'STUDENT',
        passwordHash: hashPassword(password),
        joinedAt: new Date().toISOString()
      };

      await createUser(user);
      return res.status(201).json(strip(user));
    }

    // login
    const user = await getUserByEmail(email);
    if (!user) return res.status(404).json({ error: 'user not found' });
    if (!verifyPassword(password, user.passwordHash)) return res.status(401).json({ error: 'invalid password' });
    return res.status(200).json(strip(user));
  } catch (e: any) {
    console.error('auth error:', e);
    return res.status(500).json({ error: e?.message ?? 'unknown' });
  }
}

