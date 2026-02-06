
export type Role = 'STUDENT' | 'FACULTY' | 'ADMIN' | 'ALUMNI';
export type AgentId = 'abitur' | 'kadr' | 'nav' | 'career' | 'room';

export interface User {
  id: string;
  email: string;
  name: string;
  role: Role;
  avatar?: string;
  joinedAt: string;
  department?: string;
  passwordHash?: string;
}

export interface Agent {
  id: AgentId;
  name: string;
  nameKey?: string;
  fullName: string;
  fullNameKey?: string;
  description: string;
  descriptionKey?: string;
  icon: string;
  color: string;
  bgColor: string;
  primaryFunc: string;
  primaryFuncKey?: string;
  instruction: string;
  minRole?: Role;
}

export interface Message {
  id: string;
  userId: string;
  agentId: AgentId;
  role: 'user' | 'model';
  content: string;
  attachment?: string; // Base64 string for images
  latencyMs?: number;
  timestamp: string;
}

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
  severity?: 'INFO' | 'WARN' | 'ALERT';
  link?: string;
  createdBy?: string;
}

export interface Doc {
  id: string;
  userId: string;
  title: string;
  content: string;
  createdAt: string;
  updatedAt?: string;
}

export interface MessageFeedback {
  id: string;
  messageId: string;
  userId: string;
  agentId: AgentId;
  rating: 1 | -1;
  comment?: string;
  createdAt: string;
}

export interface AuditEvent {
  id: string;
  at: string;
  actorUserId?: string;
  type: string;
  details?: Record<string, unknown>;
}

export type UiItemKind =
  | 'category'
  | 'quick'
  | 'reference'
  | 'topic'
  | 'procedure'
  | 'request'
  | 'schedule'
  | 'direction'
  | 'offer'
  | 'resume_tip';

export interface UiItem {
  id: string;
  agentId: AgentId;
  kind: UiItemKind;
  groupKey?: string | null;
  title: string;
  content?: string | null;
  meta?: Record<string, unknown> | null;
  sort: number;
  createdAt: string;
  updatedAt: string;
}

export type CaseStatus = 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';

export interface WorkflowCase {
  id: string;
  userId: string;
  agentId: AgentId;
  caseType: string;
  title?: string | null;
  status: CaseStatus;
  payload?: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
}

export interface CaseMessage {
  id: string;
  caseId: string;
  authorUserId?: string | null;
  authorRole: 'USER' | 'ADMIN';
  message: string;
  createdAt: string;
}
