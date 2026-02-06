import { AgentId, AuditEvent, CaseMessage, Doc, Message, MessageFeedback, Notification, UiItem, UiItemKind, User, WorkflowCase } from '../types';
import { hashPassword } from '../services/password';

let sqlInstance: any = null;

// This code should ONLY run on the server side (Node/Express API routes)
// It will throw an error if executed in the browser
export async function getSql() {
  if (typeof window !== 'undefined') {
    throw new Error('❌ Database functions can only be called from server-side API routes, not from the browser.\n\nSolution: Use fetch() to call your API endpoints instead.');
  }

  if (sqlInstance) return sqlInstance;
  
  const url = typeof process !== 'undefined' ? (process.env?.NEON_DATABASE_URL || process.env?.DATABASE_URL) : null;
  if (!url) {
    throw new Error('NEON_DATABASE_URL or DATABASE_URL environment variable is not set on the server');
  }
  
  // Use a simple dynamic import that works with both ESM and CJS
  const { neon } = await import('@neondatabase/serverless');
  sqlInstance = neon(url);
  return sqlInstance;
}

// Initialize database tables
export async function initializeTables() {
  const sql = await getSql();

  // Needed for gen_random_uuid() used across the API
  await sql`CREATE EXTENSION IF NOT EXISTS pgcrypto`;
  
  await sql`
    CREATE TABLE IF NOT EXISTS tbl_users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      role TEXT NOT NULL,
      avatar TEXT,
      password_hash TEXT,
      department TEXT,
      joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS tbl_messages (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES tbl_users(id) ON DELETE CASCADE,
      agent_id TEXT NOT NULL,
      role TEXT NOT NULL,
      content TEXT NOT NULL,
      attachment TEXT,
      latency_ms INTEGER,
      timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS tbl_notifications (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES tbl_users(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      is_read BOOLEAN DEFAULT FALSE,
      severity TEXT DEFAULT 'INFO',
      link TEXT,
      created_by TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS tbl_docs (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES tbl_users(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS tbl_feedback (
      id TEXT PRIMARY KEY,
      message_id TEXT NOT NULL,
      user_id TEXT NOT NULL REFERENCES tbl_users(id) ON DELETE CASCADE,
      agent_id TEXT NOT NULL,
      rating INTEGER NOT NULL,
      comment TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS tbl_audit (
      id TEXT PRIMARY KEY,
      actor_user_id TEXT REFERENCES tbl_users(id) ON DELETE SET NULL,
      type TEXT NOT NULL,
      details JSONB,
      at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS tbl_ui_items (
      id TEXT PRIMARY KEY,
      agent_id TEXT NOT NULL,
      kind TEXT NOT NULL,
      group_key TEXT,
      title TEXT NOT NULL,
      content TEXT,
      meta JSONB,
      sort INTEGER NOT NULL DEFAULT 0,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS tbl_cases (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES tbl_users(id) ON DELETE CASCADE,
      agent_id TEXT NOT NULL,
      case_type TEXT NOT NULL,
      title TEXT,
      status TEXT NOT NULL DEFAULT 'OPEN',
      payload JSONB,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS tbl_case_messages (
      id TEXT PRIMARY KEY,
      case_id TEXT NOT NULL REFERENCES tbl_cases(id) ON DELETE CASCADE,
      author_user_id TEXT REFERENCES tbl_users(id) ON DELETE SET NULL,
      author_role TEXT NOT NULL,
      message TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;

  // Create indexes
  await sql`CREATE INDEX IF NOT EXISTS idx_messages_user_agent ON tbl_messages(user_id, agent_id)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_notifications_user ON tbl_notifications(user_id)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_docs_user ON tbl_docs(user_id)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_audit_actor ON tbl_audit(actor_user_id)`;
  await sql`CREATE UNIQUE INDEX IF NOT EXISTS idx_feedback_message_unique ON tbl_feedback(message_id)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_ui_items_agent_kind ON tbl_ui_items(agent_id, kind)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_cases_user_agent ON tbl_cases(user_id, agent_id)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_case_messages_case ON tbl_case_messages(case_id)`;

  // Seed minimal UI items (safe, idempotent)
  const now = new Date().toISOString();

  // Seed demo users (safe, idempotent)
  const seedAdminHash = hashPassword('password');
  await sql`
    INSERT INTO tbl_users (id, email, name, role, password_hash, joined_at)
    VALUES
      ('1', 'admin@bolashak.kz', 'Администратор системы', 'ADMIN', ${seedAdminHash}, ${now}),
      ('2', 'student@bolashak.kz', 'Иван Иванов', 'STUDENT', ${seedAdminHash}, ${now}),
      ('3', 'profi@bolashak.kz', 'Д-р Ахметов', 'FACULTY', ${seedAdminHash}, ${now})
    ON CONFLICT (id) DO NOTHING
  `;

  // Seed demo notifications (safe, idempotent)
  await sql`
    INSERT INTO tbl_notifications (id, user_id, title, message, is_read, severity, created_by, created_at)
    VALUES
      ('seed_n1', '2', 'Добро пожаловать в Bolashak AI', 'Здесь появятся важные уведомления: приказы, дедлайны, объявления кафедры.', false, 'INFO', 'SYSTEM', ${now}),
      ('seed_n2', '2', 'Приказ №124', 'Ознакомьтесь с новым приказом и подтвердите прочтение в личном кабинете.', false, 'WARN', 'SYSTEM', ${now})
    ON CONFLICT (id) DO NOTHING
  `;
  await sql`
    INSERT INTO tbl_ui_items (id, agent_id, kind, group_key, title, content, meta, sort, created_at, updated_at)
    VALUES
      ('ui_abitur_cat_admission', 'abitur', 'category', null, 'Поступление', null, null, 10, ${now}, ${now}),
      ('ui_abitur_cat_docs', 'abitur', 'category', null, 'Документы', null, null, 20, ${now}, ${now}),
      ('ui_abitur_cat_deadlines', 'abitur', 'category', null, 'Сроки', null, null, 30, ${now}, ${now}),
      ('ui_abitur_quick_admission_1', 'abitur', 'quick', 'Поступление', 'Как поступить?', 'Расскажи, как поступить в университет: шаги, требования и контакты.', null, 10, ${now}, ${now}),
      ('ui_abitur_quick_docs_1', 'abitur', 'quick', 'Документы', 'Какие документы нужны?', 'Перечисли документы для поступления: оригиналы/копии и сроки подачи.', null, 10, ${now}, ${now}),
      ('ui_abitur_quick_deadlines_1', 'abitur', 'quick', 'Сроки', 'Какие сроки приема?', 'Назови ключевые сроки: прием документов, экзамены, зачисление.', null, 10, ${now}, ${now}),
      ('ui_abitur_ref_1', 'abitur', 'reference', null, 'Справка: список документов', 'Обычно требуется: удостоверение личности, аттестат/диплом, фото 3×4, медсправка (если требуется), заявление. Уточните в приемной комиссии.', null, 10, ${now}, ${now}),

      ('ui_kadr_topic_1', 'kadr', 'topic', null, 'Справки студентам', null, null, 10, ${now}, ${now}),
      ('ui_kadr_topic_2', 'kadr', 'topic', null, 'Кадровые документы', null, null, 20, ${now}, ${now}),
      ('ui_kadr_proc_1', 'kadr', 'procedure', 'Справки студентам', 'Справка с места учебы', 'Подайте запрос, укажите ФИО, группу, цель справки. Срок подготовки зависит от регламента.', null, 10, ${now}, ${now}),
      ('ui_kadr_quick_1', 'kadr', 'quick', null, 'Нужна справка с места учебы', 'Мне нужна справка с места учебы. Какие данные вам нужны и сколько ждать?', null, 10, ${now}, ${now}),

      ('ui_nav_req_1', 'nav', 'request', null, 'Справка об обучении', null, null, 10, ${now}, ${now}),
      ('ui_nav_req_2', 'nav', 'request', null, 'Перевод/академический отпуск', null, null, 20, ${now}, ${now}),
      ('ui_nav_schedule_1', 'nav', 'schedule', null, 'Как посмотреть расписание', 'Откройте раздел «Расписание» в ЛК или уточните у куратора. Здесь можно хранить ссылки/инструкции.', null, 10, ${now}, ${now}),

      ('ui_career_dir_1', 'career', 'direction', null, 'IT', null, null, 10, ${now}, ${now}),
      ('ui_career_dir_2', 'career', 'direction', null, 'Юриспруденция', null, null, 20, ${now}, ${now}),
      ('ui_career_tip_1', 'career', 'resume_tip', null, 'Совет по резюме', 'Добавьте 2–3 достижения с цифрами (результат, срок, вклад).', null, 10, ${now}, ${now}),

      ('ui_room_type_1', 'room', 'request', null, 'Заселение', null, null, 10, ${now}, ${now}),
      ('ui_room_type_2', 'room', 'request', null, 'Бытовой вопрос', null, null, 20, ${now}, ${now})
    ON CONFLICT (id) DO NOTHING
  `;
}

// User operations
export async function getUsers(): Promise<User[]> {
  const sql = await getSql();
  const result = await sql`
    SELECT 
      id, email, name, role, avatar, department,
      password_hash as "passwordHash", joined_at as "joinedAt"
    FROM tbl_users
    ORDER BY joined_at DESC
  `;
  return result as User[];
}

export async function getUserByEmail(email: string): Promise<User | null> {
  const sql = await getSql();
  const result = await sql`
    SELECT 
      id, email, name, role, avatar, department,
      password_hash as "passwordHash", joined_at as "joinedAt"
    FROM tbl_users WHERE email = ${email}
  `;
  return (result as User[])[0] || null;
}

export async function getUserById(id: string): Promise<User | null> {
  const sql = await getSql();
  const result = await sql`
    SELECT 
      id, email, name, role, avatar, department,
      password_hash as "passwordHash", joined_at as "joinedAt"
    FROM tbl_users WHERE id = ${id}
  `;
  return (result as User[])[0] || null;
}

export async function createUser(user: User): Promise<User> {
  const sql = await getSql();
  await sql`
    INSERT INTO tbl_users (id, email, name, role, avatar, password_hash, department, joined_at)
    VALUES (${user.id}, ${user.email}, ${user.name}, ${user.role}, ${user.avatar || null}, ${user.passwordHash}, ${user.department || null}, ${user.joinedAt})
  `;
  return user;
}

export async function updateUser(id: string, updates: Partial<User>): Promise<void> {
  const sql = await getSql();
  const updateParts: string[] = [];
  const values: any[] = [];

  if (updates.email !== undefined) {
    updateParts.push(`email = $${values.length + 1}`);
    values.push(updates.email);
  }
  if (updates.name !== undefined) {
    updateParts.push(`name = $${values.length + 1}`);
    values.push(updates.name);
  }
  if (updates.role !== undefined) {
    updateParts.push(`role = $${values.length + 1}`);
    values.push(updates.role);
  }
  if (updates.avatar !== undefined) {
    updateParts.push(`avatar = $${values.length + 1}`);
    values.push(updates.avatar);
  }
  if (updates.passwordHash !== undefined) {
    updateParts.push(`password_hash = $${values.length + 1}`);
    values.push(updates.passwordHash);
  }
  if (updates.department !== undefined) {
    updateParts.push(`department = $${values.length + 1}`);
    values.push(updates.department);
  }

  if (updateParts.length === 0) return;

  values.push(id);
  const query = `UPDATE tbl_users SET ${updateParts.join(', ')} WHERE id = $${values.length}`;
  await sql(query, values);
}

// Message operations
export async function getMessages(): Promise<Message[]> {
  const sql = await getSql();
  const result = await sql`
    SELECT 
      id, user_id as "userId", agent_id as "agentId", role, content, attachment,
      latency_ms as "latencyMs", timestamp
    FROM tbl_messages
    ORDER BY timestamp DESC
  `;
  return result as Message[];
}

export async function getMessagesByUserAndAgent(userId: string, agentId: string): Promise<Message[]> {
  const sql = await getSql();
  const result = await sql`
    SELECT 
      id, user_id as "userId", agent_id as "agentId", role, content, attachment,
      latency_ms as "latencyMs", timestamp
    FROM tbl_messages
    WHERE user_id = ${userId} AND agent_id = ${agentId}
    ORDER BY timestamp ASC
  `;
  return result as Message[];
}

export async function saveMessage(message: Message): Promise<void> {
  const sql = await getSql();
  await sql`
    INSERT INTO tbl_messages (id, user_id, agent_id, role, content, attachment, latency_ms, timestamp)
    VALUES (${message.id}, ${message.userId}, ${message.agentId}, ${message.role}, ${message.content}, ${message.attachment || null}, ${message.latencyMs || null}, ${message.timestamp})
  `;
}

export async function clearMessages(userId: string, agentId: string): Promise<void> {
  const sql = await getSql();
  await sql`
    DELETE FROM tbl_messages WHERE user_id = ${userId} AND agent_id = ${agentId}
  `;
}

// Notification operations
export async function getNotifications(): Promise<Notification[]> {
  const sql = await getSql();
  const result = await sql`
    SELECT 
      id, user_id as "userId", title, message, is_read as "isRead", severity,
      link, created_by as "createdBy", created_at as "createdAt"
    FROM tbl_notifications
    ORDER BY created_at DESC
  `;
  return result as Notification[];
}

export async function getNotificationsByUser(userId: string): Promise<Notification[]> {
  const sql = await getSql();
  const result = await sql`
    SELECT 
      id, user_id as "userId", title, message, is_read as "isRead", severity,
      link, created_by as "createdBy", created_at as "createdAt"
    FROM tbl_notifications
    WHERE user_id = ${userId}
    ORDER BY created_at DESC
  `;
  return result as Notification[];
}

export async function countUnreadNotifications(userId: string): Promise<number> {
  const sql = await getSql();
  const result = await sql`
    SELECT COUNT(*)::int as count FROM tbl_notifications
    WHERE user_id = ${userId} AND is_read = false
  `;
  return (result as any)[0]?.count || 0;
}

export async function markNotificationAsRead(id: string): Promise<void> {
  const sql = await getSql();
  await sql`
    UPDATE tbl_notifications SET is_read = true WHERE id = ${id}
  `;
}

export async function createNotification(notification: Notification): Promise<void> {
  const sql = await getSql();
  await sql`
    INSERT INTO tbl_notifications (id, user_id, title, message, is_read, severity, link, created_by, created_at)
    VALUES (${notification.id}, ${notification.userId}, ${notification.title}, ${notification.message}, ${notification.isRead}, ${notification.severity || 'INFO'}, ${notification.link || null}, ${notification.createdBy || null}, ${notification.createdAt})
  `;
}

export async function broadcastNotification(title: string, message: string, opts?: { severity?: string; createdBy?: string; link?: string }): Promise<void> {
  const sql = await getSql();
  const users = await getUsers();
  const now = new Date().toISOString();

  for (const user of users) {
    await sql`
      INSERT INTO tbl_notifications (id, user_id, title, message, is_read, severity, link, created_by, created_at)
      VALUES (gen_random_uuid()::text, ${user.id}, ${title}, ${message}, false, ${opts?.severity || 'INFO'}, ${opts?.link || null}, ${opts?.createdBy || null}, ${now})
    `;
  }
}

// Doc operations
export async function getDocs(): Promise<Doc[]> {
  const sql = await getSql();
  const result = await sql`
    SELECT 
      id, user_id as "userId", title, content, created_at as "createdAt", updated_at as "updatedAt"
    FROM tbl_docs
    ORDER BY created_at DESC
  `;
  return result as Doc[];
}

export async function getDocsByUser(userId: string): Promise<Doc[]> {
  const sql = await getSql();
  const result = await sql`
    SELECT 
      id, user_id as "userId", title, content, created_at as "createdAt", updated_at as "updatedAt"
    FROM tbl_docs
    WHERE user_id = ${userId}
    ORDER BY created_at DESC
  `;
  return result as Doc[];
}

export async function createDoc(doc: Doc): Promise<void> {
  const sql = await getSql();
  await sql`
    INSERT INTO tbl_docs (id, user_id, title, content, created_at, updated_at)
    VALUES (${doc.id}, ${doc.userId}, ${doc.title}, ${doc.content}, ${doc.createdAt}, ${doc.updatedAt || doc.createdAt})
  `;
}

export async function updateDoc(id: string, updates: Partial<Doc>): Promise<void> {
  const sql = await getSql();
  const now = new Date().toISOString();
  
  await sql`
    UPDATE tbl_docs SET 
      title = COALESCE(${updates.title}, title),
      content = COALESCE(${updates.content}, content),
      updated_at = ${now}
    WHERE id = ${id}
  `;
}

export async function removeDoc(id: string): Promise<void> {
  const sql = await getSql();
  await sql`DELETE FROM tbl_docs WHERE id = ${id}`;
}

// Feedback operations
export async function getFeedback(): Promise<MessageFeedback[]> {
  const sql = await getSql();
  const result = await sql`
    SELECT 
      id, message_id as "messageId", user_id as "userId", agent_id as "agentId",
      rating, comment, created_at as "createdAt"
    FROM tbl_feedback
    ORDER BY created_at DESC
  `;
  return result as MessageFeedback[];
}

export async function getFeedbackByMessage(messageId: string): Promise<MessageFeedback | null> {
  const sql = await getSql();
  const result = await sql`
    SELECT 
      id, message_id as "messageId", user_id as "userId", agent_id as "agentId",
      rating, comment, created_at as "createdAt"
    FROM tbl_feedback
    WHERE message_id = ${messageId}
  `;
  return (result as MessageFeedback[])[0] || null;
}

export async function upsertFeedback(feedback: MessageFeedback): Promise<void> {
  const sql = await getSql();
  await sql`
    INSERT INTO tbl_feedback (id, message_id, user_id, agent_id, rating, comment, created_at)
    VALUES (${feedback.id}, ${feedback.messageId}, ${feedback.userId}, ${feedback.agentId}, ${feedback.rating}, ${feedback.comment || null}, ${feedback.createdAt})
    ON CONFLICT (message_id) DO UPDATE SET
      rating = EXCLUDED.rating,
      comment = EXCLUDED.comment
  `;
}

// Audit operations
export async function getAuditLog(): Promise<AuditEvent[]> {
  const sql = await getSql();
  const result = await sql`
    SELECT 
      id, actor_user_id as "actorUserId", type, details, at
    FROM tbl_audit
    ORDER BY at DESC
    LIMIT 500
  `;
  return result as AuditEvent[];
}

export async function logAuditEvent(event: Omit<AuditEvent, 'id'> & { at?: string }): Promise<void> {
  const sql = await getSql();
  await sql`
    INSERT INTO tbl_audit (id, actor_user_id, type, details, at)
    VALUES (gen_random_uuid()::text, ${event.actorUserId || null}, ${event.type}, ${event.details ? JSON.stringify(event.details) : null}, ${event.at || new Date().toISOString()})
  `;
}

export async function clearAuditLog(): Promise<void> {
  const sql = await getSql();
  await sql`DELETE FROM tbl_audit`;
}

// UI items (categories, quick actions, reference/procedures/schedules/etc.)
export async function getUiItems(agentId: AgentId, kind: UiItemKind, groupKey?: string | null): Promise<UiItem[]> {
  const sql = await getSql();

  if (groupKey != null && groupKey !== '') {
    const result = await sql`
      SELECT
        id,
        agent_id as "agentId",
        kind,
        group_key as "groupKey",
        title,
        content,
        meta,
        sort,
        created_at as "createdAt",
        updated_at as "updatedAt"
      FROM tbl_ui_items
      WHERE agent_id = ${agentId} AND kind = ${kind} AND group_key = ${groupKey}
      ORDER BY sort ASC, title ASC
    `;
    return result as UiItem[];
  }

  const result = await sql`
    SELECT
      id,
      agent_id as "agentId",
      kind,
      group_key as "groupKey",
      title,
      content,
      meta,
      sort,
      created_at as "createdAt",
      updated_at as "updatedAt"
    FROM tbl_ui_items
    WHERE agent_id = ${agentId} AND kind = ${kind}
    ORDER BY sort ASC, title ASC
  `;
  return result as UiItem[];
}

// Workflow cases (applications/tickets) + messages
export async function getCasesByUserAndAgent(userId: string, agentId: AgentId): Promise<WorkflowCase[]> {
  const sql = await getSql();
  const result = await sql`
    SELECT
      id,
      user_id as "userId",
      agent_id as "agentId",
      case_type as "caseType",
      title,
      status,
      payload,
      created_at as "createdAt",
      updated_at as "updatedAt"
    FROM tbl_cases
    WHERE user_id = ${userId} AND agent_id = ${agentId}
    ORDER BY created_at DESC
    LIMIT 100
  `;
  return result as WorkflowCase[];
}

export async function createCase(c: WorkflowCase): Promise<WorkflowCase> {
  const sql = await getSql();
  await sql`
    INSERT INTO tbl_cases (id, user_id, agent_id, case_type, title, status, payload, created_at, updated_at)
    VALUES (${c.id}, ${c.userId}, ${c.agentId}, ${c.caseType}, ${c.title || null}, ${c.status}, ${c.payload ? JSON.stringify(c.payload) : null}, ${c.createdAt}, ${c.updatedAt})
  `;
  return c;
}

export async function updateCase(id: string, updates: Partial<Pick<WorkflowCase, 'status' | 'title' | 'payload'>>): Promise<void> {
  const sql = await getSql();
  const now = new Date().toISOString();
  await sql`
    UPDATE tbl_cases SET
      status = COALESCE(${updates.status ?? null}, status),
      title = COALESCE(${updates.title ?? null}, title),
      payload = COALESCE(${updates.payload === undefined ? null : (updates.payload === null ? null : JSON.stringify(updates.payload))}, payload),
      updated_at = ${now}
    WHERE id = ${id}
  `;
}

export async function getCaseMessages(caseId: string): Promise<CaseMessage[]> {
  const sql = await getSql();
  const result = await sql`
    SELECT
      id,
      case_id as "caseId",
      author_user_id as "authorUserId",
      author_role as "authorRole",
      message,
      created_at as "createdAt"
    FROM tbl_case_messages
    WHERE case_id = ${caseId}
    ORDER BY created_at ASC
    LIMIT 500
  `;
  return result as CaseMessage[];
}

export async function addCaseMessage(m: CaseMessage): Promise<void> {
  const sql = await getSql();
  await sql`
    INSERT INTO tbl_case_messages (id, case_id, author_user_id, author_role, message, created_at)
    VALUES (${m.id}, ${m.caseId}, ${m.authorUserId || null}, ${m.authorRole}, ${m.message}, ${m.createdAt})
  `;
}

