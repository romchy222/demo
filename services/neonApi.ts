import type { AgentId, AuditEvent, Doc, Message, MessageFeedback, Notification, User } from '../types';

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {})
    }
  });
  if (!res.ok) {
    let extra = '';
    try {
      const data = await res.json();
      extra = data?.error ? `: ${data.error}` : '';
    } catch {
      // ignore
    }
    throw new Error(`${res.status} ${res.statusText}${extra}`);
  }
  return res.json();
}

export const neonApi = {
  auth: {
    login: (email: string, password: string) =>
      fetchJson<Omit<User, 'passwordHash'>>('/api/auth', { method: 'POST', body: JSON.stringify({ email, password }) }),
    register: (name: string, email: string, password: string) =>
      fetchJson<Omit<User, 'passwordHash'>>('/api/auth?mode=register', { method: 'POST', body: JSON.stringify({ name, email, password }) })
  },

  users: {
    list: () => fetchJson<Array<Omit<User, 'passwordHash'>>>('/api/users'),
    create: (input: { name: string; email: string; role?: string; department?: string; password?: string }) =>
      fetchJson<Omit<User, 'passwordHash'>>('/api/users', { method: 'POST', body: JSON.stringify(input) }),
    update: (id: string, updates: Partial<{ email: string; name: string; role: string; department: string; avatar: string; password: string }>) =>
      fetchJson<{ success: true }>(`/api/users?id=${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify(updates) })
  },

  messages: {
    listByUserAndAgent: (userId: string, agentId: AgentId) =>
      fetchJson<Message[]>(`/api/messages?userId=${encodeURIComponent(userId)}&agentId=${encodeURIComponent(agentId)}`),
    listAll: () => fetchJson<Message[]>('/api/messages'),
    save: (message: Message) => fetchJson<{ success: true }>('/api/messages', { method: 'POST', body: JSON.stringify(message) }),
    clear: (userId: string, agentId: AgentId) =>
      fetchJson<{ success: true }>(`/api/messages?userId=${encodeURIComponent(userId)}&agentId=${encodeURIComponent(agentId)}`, { method: 'DELETE' })
  },

  docs: {
    listByUser: (userId: string) => fetchJson<Doc[]>(`/api/docs?userId=${encodeURIComponent(userId)}`),
    listAll: () => fetchJson<Doc[]>('/api/docs'),
    create: (doc: Doc) => fetchJson<{ success: true }>('/api/docs', { method: 'POST', body: JSON.stringify(doc) }),
    update: (id: string, updates: Partial<Doc>) =>
      fetchJson<{ success: true }>(`/api/docs?id=${encodeURIComponent(id)}`, { method: 'PUT', body: JSON.stringify(updates) }),
    remove: (id: string) => fetchJson<{ success: true }>(`/api/docs?id=${encodeURIComponent(id)}`, { method: 'DELETE' })
  },

  notifications: {
    listByUser: (userId: string) => fetchJson<Notification[]>(`/api/notifications?userId=${encodeURIComponent(userId)}`),
    listAll: () => fetchJson<Notification[]>('/api/notifications'),
    countUnread: async (userId: string) => {
      const r = await fetchJson<{ count: number }>(`/api/notifications?mode=count&userId=${encodeURIComponent(userId)}`);
      return r.count;
    },
    markRead: (id: string) => fetchJson<{ success: true }>(`/api/notifications?id=${encodeURIComponent(id)}`, { method: 'PATCH' }),
    broadcast: (input: { title: string; message: string; severity?: string; link?: string }) =>
      fetchJson<{ success: true }>(`/api/notifications?mode=broadcast`, { method: 'POST', body: JSON.stringify(input) })
  },

  feedback: {
    listAll: () => fetchJson<MessageFeedback[]>('/api/feedback'),
    getByMessage: (messageId: string) => fetchJson<MessageFeedback | null>(`/api/feedback?messageId=${encodeURIComponent(messageId)}`),
    upsert: (fb: MessageFeedback) => fetchJson<{ success: true }>('/api/feedback', { method: 'POST', body: JSON.stringify(fb) })
  },

  audit: {
    list: () => fetchJson<AuditEvent[]>('/api/audit'),
    log: (event: Omit<AuditEvent, 'id' | 'at'> & { at?: string }) =>
      fetchJson<{ success: true }>('/api/audit', { method: 'POST', body: JSON.stringify(event) }),
    clear: () => fetchJson<{ success: true }>('/api/audit', { method: 'DELETE' })
  },

  backup: {
    export: () => fetchJson<any>('/api/backup'),
    import: (bundle: any, mode: 'replace' | 'merge') =>
      fetchJson<{ success: true }>(`/api/backup?mode=${encodeURIComponent(mode)}`, { method: 'POST', body: JSON.stringify(bundle) })
  }
};
