import { AuditEvent, Doc, Message, MessageFeedback, Notification, User } from '../types';
import { makeId } from './id';
import { hashPassword } from './password';

const SCHEMA_VERSION = 1;

type DbExportBundle = {
  version: number;
  exportedAt: string;
  tables: Record<string, unknown>;
};

// Константы имен таблиц
const TABLES = {
  USERS: 'tbl_users',
  MESSAGES: 'tbl_messages',
  NOTIFICATIONS: 'tbl_notifications',
  DOCS: 'tbl_docs',
  FEEDBACK: 'tbl_feedback',
  AUDIT: 'tbl_audit'
} as const;

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeJson<T>(key: string, value: T) {
  localStorage.setItem(key, JSON.stringify(value));
}

export const db = {
  // Инициализация "Базы данных" начальными значениями (Seeds)
  init: () => {
    if (!localStorage.getItem(TABLES.USERS)) {
      const defaultUsers: User[] = [
        {
          id: '1',
          email: 'admin@bolashak.kz',
          name: 'Администратор системы',
          role: 'ADMIN',
          passwordHash: hashPassword('password'),
          joinedAt: new Date().toISOString()
        },
        {
          id: '2',
          email: 'student@bolashak.kz',
          name: 'Иван Иванов',
          role: 'STUDENT',
          passwordHash: hashPassword('password'),
          department: 'Информационные системы',
          joinedAt: new Date().toISOString()
        },
        {
          id: '3',
          email: 'profi@bolashak.kz',
          name: 'Д-р Ахметов',
          role: 'FACULTY',
          passwordHash: hashPassword('password'),
          department: 'Кафедра права',
          joinedAt: new Date().toISOString()
        }
      ];
      writeJson(TABLES.USERS, defaultUsers);
    }

    // Migration: ensure users have passwordHash (legacy installs -> default "password")
    const users = readJson<User[]>(TABLES.USERS, []);
    const migrated = users.map(u => (u.passwordHash ? u : { ...u, passwordHash: hashPassword('password') }));
    if (migrated.some((u, i) => u.passwordHash !== users[i]?.passwordHash)) {
      writeJson(TABLES.USERS, migrated);
    }

    if (!localStorage.getItem(TABLES.MESSAGES)) writeJson(TABLES.MESSAGES, [] as Message[]);
    if (!localStorage.getItem(TABLES.DOCS)) writeJson(TABLES.DOCS, [] as Doc[]);
    if (!localStorage.getItem(TABLES.FEEDBACK)) writeJson(TABLES.FEEDBACK, [] as MessageFeedback[]);
    if (!localStorage.getItem(TABLES.AUDIT)) writeJson(TABLES.AUDIT, [] as AuditEvent[]);

    if (!localStorage.getItem(TABLES.NOTIFICATIONS)) {
      const seed: Notification[] = [
        {
          id: makeId('n_'),
          userId: '2',
          title: 'Добро пожаловать в Bolashak AI',
          message: 'Здесь появятся важные уведомления: приказы, дедлайны, объявления кафедры.',
          isRead: false,
          severity: 'INFO',
          createdAt: new Date().toISOString()
        },
        {
          id: makeId('n_'),
          userId: '2',
          title: 'Приказ №124',
          message: 'Ознакомьтесь с новым приказом и подтвердите прочтение в личном кабинете.',
          isRead: false,
          severity: 'WARN',
          createdAt: new Date(Date.now() - 1000 * 60 * 60 * 20).toISOString()
        }
      ];
      writeJson(TABLES.NOTIFICATIONS, seed);
    }
  },

  users: {
    findAll: (): User[] => readJson<User[]>(TABLES.USERS, []),
    findByEmail: (email: string): User | undefined => db.users.findAll().find(u => u.email === email),
    create: (user: User) => {
      const users = db.users.findAll();
      users.push(user);
      writeJson(TABLES.USERS, users);
    },
    update: (id: string, updates: Partial<User>) => {
      const users = db.users.findAll().map(u => (u.id === id ? { ...u, ...updates } : u));
      writeJson(TABLES.USERS, users);
    }
  },

  messages: {
    findAll: (): Message[] => readJson<Message[]>(TABLES.MESSAGES, []),
    findByUserAndAgent: (userId: string, agentId: string): Message[] => {
      const all = db.messages.findAll();
      return all.filter(m => m.userId === userId && m.agentId === agentId);
    },
    save: (message: Message) => {
      const all = db.messages.findAll();
      all.push(message);
      writeJson(TABLES.MESSAGES, all);
    },
    clear: (userId: string, agentId: string) => {
      const all = db.messages.findAll();
      const filtered = all.filter(m => !(m.userId === userId && m.agentId === agentId));
      writeJson(TABLES.MESSAGES, filtered);
    }
  },

  notifications: {
    findAll: (): Notification[] => readJson<Notification[]>(TABLES.NOTIFICATIONS, []),
    findByUser: (userId: string): Notification[] => {
      const all = db.notifications.findAll();
      return all.filter(n => n.userId === userId).sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
    },
    countUnread: (userId: string): number => db.notifications.findByUser(userId).filter(n => !n.isRead).length,
    markRead: (id: string) => {
      const all = readJson<Notification[]>(TABLES.NOTIFICATIONS, []);
      writeJson(
        TABLES.NOTIFICATIONS,
        all.map(n => (n.id === id ? { ...n, isRead: true } : n))
      );
    },
    create: (notification: Notification) => {
      const all = readJson<Notification[]>(TABLES.NOTIFICATIONS, []);
      all.push(notification);
      writeJson(TABLES.NOTIFICATIONS, all);
    },
    broadcast: (
      title: string,
      message: string,
      opts?: { severity?: Notification['severity']; createdBy?: string; link?: string }
    ) => {
      const users = db.users.findAll();
      const now = new Date().toISOString();
      const all = readJson<Notification[]>(TABLES.NOTIFICATIONS, []);
      for (const u of users) {
        all.push({
          id: makeId('n_'),
          userId: u.id,
          title,
          message,
          isRead: false,
          severity: opts?.severity ?? 'INFO',
          createdBy: opts?.createdBy,
          link: opts?.link,
          createdAt: now
        });
      }
      writeJson(TABLES.NOTIFICATIONS, all);
    }
  },

  docs: {
    findAll: (): Doc[] => readJson<Doc[]>(TABLES.DOCS, []),
    findByUser: (userId: string): Doc[] => {
      const all = db.docs.findAll();
      return all.filter(d => d.userId === userId).sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
    },
    create: (doc: Doc) => {
      const all = readJson<Doc[]>(TABLES.DOCS, []);
      all.push(doc);
      writeJson(TABLES.DOCS, all);
    },
    update: (id: string, updates: Partial<Doc>) => {
      const all = readJson<Doc[]>(TABLES.DOCS, []);
      writeJson(TABLES.DOCS, all.map(d => (d.id === id ? { ...d, ...updates, updatedAt: new Date().toISOString() } : d)));
    },
    remove: (id: string) => {
      const all = readJson<Doc[]>(TABLES.DOCS, []);
      writeJson(TABLES.DOCS, all.filter(d => d.id !== id));
    }
  },

  feedback: {
    findAll: (): MessageFeedback[] => readJson<MessageFeedback[]>(TABLES.FEEDBACK, []),
    findByMessage: (messageId: string): MessageFeedback | undefined => {
      const all = db.feedback.findAll();
      return all.find(f => f.messageId === messageId);
    },
    upsert: (feedback: MessageFeedback) => {
      const all = db.feedback.findAll();
      const next = all.filter(f => f.messageId !== feedback.messageId);
      next.push(feedback);
      writeJson(TABLES.FEEDBACK, next);
    }
  },

  audit: {
    list: (): AuditEvent[] => readJson<AuditEvent[]>(TABLES.AUDIT, []).sort((a, b) => (a.at < b.at ? 1 : -1)),
    log: (event: Omit<AuditEvent, 'id' | 'at'> & { at?: string }) => {
      const all = readJson<AuditEvent[]>(TABLES.AUDIT, []);
      all.push({
        id: makeId('a_'),
        at: event.at ?? new Date().toISOString(),
        actorUserId: event.actorUserId,
        type: event.type,
        details: event.details
      });
      writeJson(TABLES.AUDIT, all.slice(-500));
    },
    clear: () => writeJson(TABLES.AUDIT, [] as AuditEvent[])
  },

  exportAll: (): DbExportBundle => {
    const tables: Record<string, unknown> = {};
    for (const key of Object.values(TABLES)) {
      tables[key] = readJson(key, null as any);
    }
    return { version: SCHEMA_VERSION, exportedAt: new Date().toISOString(), tables };
  },

  importAll: (bundle: DbExportBundle, opts?: { mode?: 'replace' | 'merge' }) => {
    if (!bundle || typeof bundle !== 'object') throw new Error('Invalid bundle');
    if (bundle.version !== SCHEMA_VERSION) throw new Error(`Unsupported bundle version: ${bundle.version}`);

    const mode = opts?.mode ?? 'replace';
    const incoming = bundle.tables ?? {};

    for (const key of Object.values(TABLES)) {
      if (!(key in incoming)) continue;

      if (mode === 'replace') {
        writeJson(key, (incoming as any)[key]);
        continue;
      }

      const current = readJson<any[]>(key, []);
      const next = Array.isArray(current) && Array.isArray((incoming as any)[key])
        ? [...current, ...(incoming as any)[key]]
        : (incoming as any)[key];
      writeJson(key, next);
    }
  }
};
