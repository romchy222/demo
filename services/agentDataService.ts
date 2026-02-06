import type { AgentId, CaseMessage, UiItem, UiItemKind, WorkflowCase } from '../types';

type FetchJsonResult = unknown;

async function fetchJson(path: string, init?: RequestInit): Promise<FetchJsonResult> {
  const res = await fetch(path, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {})
    }
  });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return res.json();
}

const LS_CASES = 'bolashak_cases_fallback_v1';
const LS_CASE_MESSAGES = 'bolashak_case_messages_fallback_v1';

function readLs<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeLs<T>(key: string, value: T) {
  localStorage.setItem(key, JSON.stringify(value));
}

function fallbackUiItems(agentId: AgentId, kind: UiItemKind, groupKey?: string): UiItem[] {
  const now = new Date().toISOString();
  const mk = (id: string, title: string, content?: string | null, gk?: string | null, sort = 10): UiItem => ({
    id,
    agentId,
    kind,
    groupKey: gk ?? null,
    title,
    content: content ?? null,
    meta: null,
    sort,
    createdAt: now,
    updatedAt: now
  });

  if (agentId === 'abitur' && kind === 'category') {
    return [mk('fb_abitur_cat_1', 'Поступление', null, null, 10), mk('fb_abitur_cat_2', 'Документы', null, null, 20), mk('fb_abitur_cat_3', 'Сроки', null, null, 30)];
  }
  if (agentId === 'abitur' && kind === 'quick') {
    if (groupKey === 'Документы') return [mk('fb_abitur_quick_docs', 'Какие документы нужны?', 'Перечисли документы для поступления: оригиналы/копии и сроки подачи.', 'Документы', 10)];
    if (groupKey === 'Сроки') return [mk('fb_abitur_quick_deadlines', 'Какие сроки приема?', 'Назови ключевые сроки: прием документов, экзамены, зачисление.', 'Сроки', 10)];
    return [mk('fb_abitur_quick_adm', 'Как поступить?', 'Расскажи, как поступить в университет: шаги, требования и контакты.', 'Поступление', 10)];
  }
  if (agentId === 'abitur' && kind === 'reference') {
    return [mk('fb_abitur_ref_1', 'Справка: список документов', 'Обычно требуется: удостоверение личности, аттестат/диплом, фото 3×4, медсправка (если требуется), заявление. Уточните в приемной комиссии.', null, 10)];
  }

  if (agentId === 'kadr' && kind === 'topic') return [mk('fb_kadr_topic_1', 'Справки студентам', null, null, 10), mk('fb_kadr_topic_2', 'Кадровые документы', null, null, 20)];
  if (agentId === 'kadr' && kind === 'procedure') {
    if (groupKey === 'Справки студентам') return [mk('fb_kadr_proc_1', 'Справка с места учебы', 'Подайте запрос, укажите ФИО, группу, цель справки. Срок подготовки зависит от регламента.', 'Справки студентам', 10)];
    return [];
  }
  if (agentId === 'kadr' && kind === 'quick') return [mk('fb_kadr_quick_1', 'Нужна справка с места учебы', 'Мне нужна справка с места учебы. Какие данные вам нужны и сколько ждать?', null, 10)];

  if (agentId === 'nav' && kind === 'request') return [mk('fb_nav_req_1', 'Справка об обучении', null, null, 10), mk('fb_nav_req_2', 'Перевод/академический отпуск', null, null, 20)];
  if (agentId === 'nav' && kind === 'schedule') return [mk('fb_nav_sched_1', 'Как посмотреть расписание', 'Откройте раздел «Расписание» в ЛК или уточните у куратора. Здесь можно хранить ссылки/инструкции.', null, 10)];

  if (agentId === 'career' && kind === 'direction') return [mk('fb_career_dir_1', 'IT', null, null, 10), mk('fb_career_dir_2', 'Юриспруденция', null, null, 20)];
  if (agentId === 'career' && kind === 'resume_tip') return [mk('fb_career_tip_1', 'Совет по резюме', 'Добавьте 2–3 достижения с цифрами (результат, срок, вклад).', null, 10)];

  if (agentId === 'room' && kind === 'request') return [mk('fb_room_type_1', 'Заселение', null, null, 10), mk('fb_room_type_2', 'Бытовой вопрос', null, null, 20)];

  return [];
}

export async function getUiItems(agentId: AgentId, kind: UiItemKind, groupKey?: string): Promise<UiItem[]> {
  try {
    const qs = new URLSearchParams({ agentId, kind });
    if (groupKey) qs.set('groupKey', groupKey);
    const data = await fetchJson(`/api/ui-items?${qs.toString()}`);
    return Array.isArray(data) ? (data as UiItem[]) : [];
  } catch {
    return fallbackUiItems(agentId, kind, groupKey);
  }
}

export async function getCases(userId: string, agentId: AgentId): Promise<WorkflowCase[]> {
  try {
    const qs = new URLSearchParams({ userId, agentId });
    const data = await fetchJson(`/api/cases?${qs.toString()}`);
    return Array.isArray(data) ? (data as WorkflowCase[]) : [];
  } catch {
    const all = readLs<WorkflowCase[]>(LS_CASES, []);
    return all.filter(c => c.userId === userId && c.agentId === agentId).sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  }
}

export async function createWorkflowCase(input: Pick<WorkflowCase, 'userId' | 'agentId' | 'caseType'> & { title?: string | null; payload?: any }): Promise<WorkflowCase> {
  try {
    const data = await fetchJson('/api/cases', { method: 'POST', body: JSON.stringify(input) });
    return data as WorkflowCase;
  } catch {
    const now = new Date().toISOString();
    const c: WorkflowCase = {
      id: `fb_case_${Math.random().toString(16).slice(2)}_${Date.now()}`,
      userId: input.userId,
      agentId: input.agentId,
      caseType: input.caseType,
      title: input.title ?? null,
      status: 'OPEN',
      payload: input.payload ?? null,
      createdAt: now,
      updatedAt: now
    };
    const all = readLs<WorkflowCase[]>(LS_CASES, []);
    all.unshift(c);
    writeLs(LS_CASES, all.slice(0, 200));
    return c;
  }
}

export async function updateWorkflowCase(id: string, updates: Partial<Pick<WorkflowCase, 'status' | 'title' | 'payload'>>): Promise<void> {
  try {
    const qs = new URLSearchParams({ id });
    await fetchJson(`/api/cases?${qs.toString()}`, { method: 'PATCH', body: JSON.stringify(updates) });
  } catch {
    const all = readLs<WorkflowCase[]>(LS_CASES, []);
    const now = new Date().toISOString();
    writeLs(
      LS_CASES,
      all.map(c => (c.id === id ? { ...c, ...updates, updatedAt: now } : c))
    );
  }
}

export async function getCaseMessages(caseId: string): Promise<CaseMessage[]> {
  try {
    const qs = new URLSearchParams({ caseId });
    const data = await fetchJson(`/api/case-messages?${qs.toString()}`);
    return Array.isArray(data) ? (data as CaseMessage[]) : [];
  } catch {
    const all = readLs<CaseMessage[]>(LS_CASE_MESSAGES, []);
    return all.filter(m => m.caseId === caseId).sort((a, b) => (a.createdAt < b.createdAt ? -1 : 1));
  }
}

export async function postCaseMessage(input: Pick<CaseMessage, 'caseId' | 'authorRole' | 'message'> & { authorUserId?: string | null }): Promise<CaseMessage> {
  try {
    const data = await fetchJson('/api/case-messages', { method: 'POST', body: JSON.stringify(input) });
    return data as CaseMessage;
  } catch {
    const now = new Date().toISOString();
    const m: CaseMessage = {
      id: `fb_msg_${Math.random().toString(16).slice(2)}_${Date.now()}`,
      caseId: input.caseId,
      authorUserId: input.authorUserId ?? null,
      authorRole: input.authorRole,
      message: input.message,
      createdAt: now
    };
    const all = readLs<CaseMessage[]>(LS_CASE_MESSAGES, []);
    all.push(m);
    writeLs(LS_CASE_MESSAGES, all.slice(-1000));
    return m;
  }
}

