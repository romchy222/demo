
import { AuditEvent, Doc, Message, MessageFeedback, Notification, User, Agent, WorkflowCase, CaseMessage } from '../types';

const API_BASE = '/api';

async function fetchJson<T>(url: string, options?: RequestInit): Promise<T> {
  const headers = {
    'Content-Type': 'application/json',
    ...options?.headers,
  };

  // Inject current user ID if available (simulated auth)
  const currentUserId = localStorage.getItem('currentUserId');
  if (currentUserId) {
    (headers as any)['x-user-id'] = currentUserId;
  }

  const response = await fetch(`${API_BASE}${url}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error || `Request failed: ${response.statusText}`);
  }

  return response.json();
}

export const db = {
  // Config / Session
  setSessionUser: (userId: string) => {
    localStorage.setItem('currentUserId', userId);
  },

  getSessionUser: () => localStorage.getItem('currentUserId'),

  // Users
  users: {
    findAll: () => fetchJson<User[]>('/users'),
    findByEmail: (email: string) => fetchJson<User>(`/users?email=${encodeURIComponent(email)}`).then((r: any) => Array.isArray(r) ? r[0] : r), // Check if returns array
    findById: (id: string) => fetchJson<User>(`/users/${id}`),
    create: (user: User) => fetchJson<User>('/users', {
      method: 'POST',
      body: JSON.stringify(user)
    }),
    update: (id: string, updates: Partial<User>) => fetchJson<void>(`/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates)
    }),
    import: (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      return fetch(`${API_BASE}/import`, {
        method: 'POST',
        headers: {
          'x-user-id': localStorage.getItem('currentUserId') || ''
        },
        body: formData
      }).then(r => r.json());
    }
  },

  // Messages
  messages: {
    findAll: (agentId: string) => fetchJson<Message[]>(`/messages?agentId=${agentId}`),
    listAll: () => fetchJson<Message[]>('/messages'), // For Admin
    save: (message: Message) => fetchJson<void>('/messages', {
      method: 'POST',
      body: JSON.stringify(message)
    }),
    clear: (userId: string, agentId: string) => fetchJson<void>(`/messages?agentId=${agentId}`, {
      method: 'DELETE'
    })
  },

  // Notifications
  notifications: {
    findAll: () => fetchJson<Notification[]>('/notifications'), // This might return all for admin? Or unfiltered?
    // Current implementation of /notifications usually filters by user if not admin.
    // Need to check server implementation if we want ADMIN to see ALL.
    findByUser: (userId: string) => fetchJson<Notification[]>(`/notifications?userId=${userId}`), // Server usually filters by x-user-id header anyway.

    countUnread: (userId?: string) => fetchJson<{ count: number }>('/notifications/unread-count').then(r => r.count),
    markRead: (id: string) => fetchJson<void>(`/notifications/${id}/read`, { method: 'PATCH' }),
    create: (n: Notification) => fetchJson<void>('/notifications', {
      method: 'POST',
      body: JSON.stringify(n)
    }),
    broadcast: (title: string, message: string, opts?: any) => fetchJson<void>('/broadcasts', {
      method: 'POST',
      body: JSON.stringify({ title, message, ...opts })
    })
  },

  // Docs
  docs: {
    findAll: () => fetchJson<Doc[]>('/docs'),
    findByUser: (userId: string) => fetchJson<Doc[]>(`/docs?userId=${userId}`),
    create: (doc: Doc) => fetchJson<{ success: true, id: string }>('/docs', {
      method: 'POST',
      body: JSON.stringify(doc)
    }),
    update: (id: string, updates: Partial<Doc>) => fetchJson<void>(`/docs/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates)
    }),
    remove: (id: string) => fetchJson<void>(`/docs/${id}`, { method: 'DELETE' })
  },

  // Feedback
  feedback: {
    findAll: () => fetchJson<MessageFeedback[]>('/feedback'),
    upsert: (f: MessageFeedback) => fetchJson<void>('/feedback', {
      method: 'POST',
      body: JSON.stringify(f)
    })
  },

  // Audit
  audit: {
    list: () => fetchJson<AuditEvent[]>('/audit'),
    log: (event: any) => fetchJson<void>('/audit', {
      method: 'POST',
      body: JSON.stringify(event)
    }),
    clear: () => fetchJson<void>('/audit', { method: 'DELETE' })
  },

  // Dashboard & Analytics
  dashboard: {
    getStats: () => fetchJson<any>('/dashboard/stats')
  },

  analytics: {
    getOverview: () => fetchJson<any>('/analytics')
  },

  // Knowledge Base
  knowledge: {
    getAll: (agentId?: string) => fetchJson<any[]>(`/knowledge${agentId ? `?agentId=${agentId}` : ''}`),
    create: (entry: any) => fetchJson<any>('/knowledge', {
      method: 'POST',
      body: JSON.stringify(entry)
    })
  },

  // Agents
  agents: {
    getAll: () => fetchJson<Agent[]>('/agents'),
    upsert: (agent: any) => fetchJson<void>('/agents', {
      method: 'POST',
      body: JSON.stringify(agent)
    })
  },

  // Settings
  settings: {
    getAll: () => fetchJson<Record<string, any>>('/settings'),
    update: (key: string, value: any, description?: string) => fetchJson<void>('/settings', {
      method: 'POST',
      body: JSON.stringify({ key, value, description })
    })
  },

  exportAll: () => fetchJson<any>('/import/export'),
  importAll: (data: any, opts: any) => fetchJson<void>('/import', {
    method: 'POST',
    body: JSON.stringify({ data, ...opts })
  })

};
