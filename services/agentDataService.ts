import type { AgentId, CaseMessage, UiItem, UiItemKind, WorkflowCase } from '../types';

async function fetchJson<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {})
    }
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`${res.status} ${res.statusText}${text ? `: ${text.slice(0, 200)}` : ''}`);
  }
  return res.json();
}

export async function getUiItems(agentId: AgentId, kind: UiItemKind, groupKey?: string): Promise<UiItem[]> {
  const qs = new URLSearchParams({ agentId, kind });
  if (groupKey) qs.set('groupKey', groupKey);
  return fetchJson<UiItem[]>(`/api/ui-items?${qs.toString()}`);
}

export async function getCases(userId: string, agentId: AgentId): Promise<WorkflowCase[]> {
  const qs = new URLSearchParams({ userId, agentId });
  return fetchJson<WorkflowCase[]>(`/api/cases?${qs.toString()}`);
}

export async function createWorkflowCase(input: Pick<WorkflowCase, 'userId' | 'agentId' | 'caseType'> & { title?: string | null; payload?: any }): Promise<WorkflowCase> {
  return fetchJson<WorkflowCase>('/api/cases', { method: 'POST', body: JSON.stringify(input) });
}

export async function updateWorkflowCase(id: string, updates: Partial<Pick<WorkflowCase, 'status' | 'title' | 'payload'>>): Promise<void> {
  const qs = new URLSearchParams({ id });
  await fetchJson(`/api/cases?${qs.toString()}`, { method: 'PATCH', body: JSON.stringify(updates) });
}

export async function getCaseMessages(caseId: string): Promise<CaseMessage[]> {
  const qs = new URLSearchParams({ caseId });
  return fetchJson<CaseMessage[]>(`/api/case-messages?${qs.toString()}`);
}

export async function postCaseMessage(input: Pick<CaseMessage, 'caseId' | 'authorRole' | 'message'> & { authorUserId?: string | null }): Promise<CaseMessage> {
  return fetchJson<CaseMessage>('/api/case-messages', { method: 'POST', body: JSON.stringify(input) });
}

