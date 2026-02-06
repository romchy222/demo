import { getSql, initializeTables } from './_db';
import type { AuditEvent, Doc, Message, MessageFeedback, Notification, User } from '../types';

type Mode = 'replace' | 'merge';

type Bundle = {
  version: 1;
  exportedAt: string;
  tables: {
    tbl_users: User[];
    tbl_messages: Message[];
    tbl_notifications: Notification[];
    tbl_docs: Doc[];
    tbl_feedback: MessageFeedback[];
    tbl_audit: AuditEvent[];
  };
};

function isMode(x: any): x is Mode {
  return x === 'replace' || x === 'merge';
}

export default async function handler(req: any, res: any) {
  try {
    await initializeTables();
    const sql = await getSql();

    if (req.method === 'GET') {
      const users = (await sql`
        SELECT id, email, name, role, avatar, department,
               password_hash as "passwordHash", joined_at as "joinedAt"
        FROM tbl_users
        ORDER BY joined_at DESC
      `) as User[];

      const messages = (await sql`
        SELECT id, user_id as "userId", agent_id as "agentId", role, content, attachment,
               latency_ms as "latencyMs", timestamp
        FROM tbl_messages
        ORDER BY timestamp ASC
      `) as Message[];

      const notifications = (await sql`
        SELECT id, user_id as "userId", title, message, is_read as "isRead", severity,
               link, created_by as "createdBy", created_at as "createdAt"
        FROM tbl_notifications
        ORDER BY created_at DESC
      `) as Notification[];

      const docs = (await sql`
        SELECT id, user_id as "userId", title, content, created_at as "createdAt", updated_at as "updatedAt"
        FROM tbl_docs
        ORDER BY created_at DESC
      `) as Doc[];

      const feedback = (await sql`
        SELECT id, message_id as "messageId", user_id as "userId", agent_id as "agentId",
               rating, comment, created_at as "createdAt"
        FROM tbl_feedback
        ORDER BY created_at DESC
      `) as MessageFeedback[];

      const audit = (await sql`
        SELECT id, actor_user_id as "actorUserId", type, details, at
        FROM tbl_audit
        ORDER BY at DESC
        LIMIT 500
      `) as AuditEvent[];

      const bundle: Bundle = {
        version: 1,
        exportedAt: new Date().toISOString(),
        tables: {
          tbl_users: users,
          tbl_messages: messages,
          tbl_notifications: notifications,
          tbl_docs: docs,
          tbl_feedback: feedback,
          tbl_audit: audit
        }
      };

      return res.status(200).json(bundle);
    }

    if (req.method === 'POST') {
      const modeRaw = req.query.mode != null ? String(req.query.mode) : 'replace';
      const mode: Mode = isMode(modeRaw) ? modeRaw : 'replace';

      const bundle = (req.body ?? null) as Bundle | null;
      if (!bundle || bundle.version !== 1 || !bundle.tables) return res.status(400).json({ error: 'invalid bundle' });

      const t = bundle.tables;

      if (mode === 'replace') {
        await sql`TRUNCATE tbl_feedback, tbl_messages, tbl_docs, tbl_notifications, tbl_audit, tbl_users RESTART IDENTITY CASCADE`;
      }

      // Users
      for (const u of t.tbl_users ?? []) {
        await sql`
          INSERT INTO tbl_users (id, email, name, role, avatar, password_hash, department, joined_at)
          VALUES (${u.id}, ${u.email}, ${u.name}, ${u.role}, ${u.avatar || null}, ${u.passwordHash || null}, ${u.department || null}, ${u.joinedAt})
          ON CONFLICT (id) DO UPDATE SET
            email = EXCLUDED.email,
            name = EXCLUDED.name,
            role = EXCLUDED.role,
            avatar = EXCLUDED.avatar,
            password_hash = EXCLUDED.password_hash,
            department = EXCLUDED.department,
            joined_at = EXCLUDED.joined_at
        `;
      }

      // Docs
      for (const d of t.tbl_docs ?? []) {
        await sql`
          INSERT INTO tbl_docs (id, user_id, title, content, created_at, updated_at)
          VALUES (${d.id}, ${d.userId}, ${d.title}, ${d.content}, ${d.createdAt}, ${d.updatedAt || d.createdAt})
          ON CONFLICT (id) DO UPDATE SET
            title = EXCLUDED.title,
            content = EXCLUDED.content,
            updated_at = EXCLUDED.updated_at
        `;
      }

      // Messages
      for (const m of t.tbl_messages ?? []) {
        await sql`
          INSERT INTO tbl_messages (id, user_id, agent_id, role, content, attachment, latency_ms, timestamp)
          VALUES (${m.id}, ${m.userId}, ${m.agentId}, ${m.role}, ${m.content}, ${m.attachment || null}, ${m.latencyMs || null}, ${m.timestamp})
          ON CONFLICT (id) DO NOTHING
        `;
      }

      // Notifications
      for (const n of t.tbl_notifications ?? []) {
        await sql`
          INSERT INTO tbl_notifications (id, user_id, title, message, is_read, severity, link, created_by, created_at)
          VALUES (${n.id}, ${n.userId}, ${n.title}, ${n.message}, ${n.isRead}, ${n.severity || 'INFO'}, ${n.link || null}, ${n.createdBy || null}, ${n.createdAt})
          ON CONFLICT (id) DO UPDATE SET
            title = EXCLUDED.title,
            message = EXCLUDED.message,
            is_read = EXCLUDED.is_read,
            severity = EXCLUDED.severity,
            link = EXCLUDED.link,
            created_by = EXCLUDED.created_by,
            created_at = EXCLUDED.created_at
        `;
      }

      // Feedback (unique by message_id)
      for (const f of t.tbl_feedback ?? []) {
        await sql`
          INSERT INTO tbl_feedback (id, message_id, user_id, agent_id, rating, comment, created_at)
          VALUES (${f.id}, ${f.messageId}, ${f.userId}, ${f.agentId}, ${f.rating}, ${f.comment || null}, ${f.createdAt})
          ON CONFLICT (message_id) DO UPDATE SET
            rating = EXCLUDED.rating,
            comment = EXCLUDED.comment
        `;
      }

      // Audit
      for (const e of t.tbl_audit ?? []) {
        await sql`
          INSERT INTO tbl_audit (id, actor_user_id, type, details, at)
          VALUES (${e.id}, ${e.actorUserId || null}, ${e.type}, ${e.details ? JSON.stringify(e.details) : null}, ${e.at})
          ON CONFLICT (id) DO NOTHING
        `;
      }

      return res.status(200).json({ success: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (e: any) {
    console.error('backup error:', e);
    return res.status(500).json({ error: e?.message ?? 'unknown' });
  }
}

