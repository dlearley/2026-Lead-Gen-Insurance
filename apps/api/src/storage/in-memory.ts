import { randomUUID } from 'crypto';
import type {
  ActivityLog,
  Agent,
  Email,
  Lead,
  LeadAssignment,
  Note,
  Notification,
  OnboardingFeedbackResponse,
  OnboardingSession,
  Policy,
  Task,
  User,
} from '@insurance-lead-gen/types';

export interface EmailTemplateRecord {
  id: string;
  name: string;
  subject: string;
  body: string;
  bodyHtml?: string;
  variables: string[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface InMemoryStore {
  users: Map<string, User>;
  leads: Map<string, Lead>;
  agents: Map<string, Agent>;
  assignments: Map<string, LeadAssignment>;
  notes: Map<string, Note>;
  tasks: Map<string, Task>;
  emails: Map<string, Email>;
  activities: Map<string, ActivityLog>;
  notifications: Map<string, Notification>;
  onboardingSessions: Map<string, OnboardingSession>;
  onboardingFeedback: Map<string, OnboardingFeedbackResponse>;
  emailTemplates: Map<string, EmailTemplateRecord>;
  policies: Map<string, Policy>;
  underwritingCases: Map<string, UnderwritingCase>;
}

const now = () => new Date();

export const store: InMemoryStore = {
  users: new Map<string, User>([
    [
      '00000000-0000-0000-0000-000000000001',
      {
        id: '00000000-0000-0000-0000-000000000001',
        email: 'dev@example.com',
        firstName: 'Dev',
        lastName: 'Admin',
        role: 'ADMIN',
        isActive: true,
        createdAt: now(),
        updatedAt: now(),
      },
    ],
  ]),
  leads: new Map(),
  agents: new Map(),
  assignments: new Map(),
  notes: new Map(),
  tasks: new Map(),
  emails: new Map(),
  activities: new Map(),
  notifications: new Map(),
  onboardingSessions: new Map(),
  onboardingFeedback: new Map(),
  policies: new Map(),
  underwritingCases: new Map(),
  emailTemplates: new Map([
    [
      '00000000-0000-0000-0000-00000000a001',
      {
        id: '00000000-0000-0000-0000-00000000a001',
        name: 'Default Follow-up',
        subject: 'Following up on your insurance inquiry',
        body: 'Hi {{firstName}},\n\nThanks for reaching out. When would be a good time to talk?\n\nBest,\n{{agentName}}',
        variables: ['firstName', 'agentName'],
        isActive: true,
        createdAt: now(),
        updatedAt: now(),
      },
    ],
  ]),
};

export function generateId(): string {
  return randomUUID();
}

export function sanitizeHtml(html: string): string {
  return html.replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '');
}

export function extractMentions(text: string): string[] {
  const matches = text.match(/@[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g);
  if (!matches) return [];
  return [...new Set(matches.map((m) => m.substring(1)))];
}

export function resetStore(): void {
  store.leads.clear();
  store.agents.clear();
  store.assignments.clear();
  store.notes.clear();
  store.tasks.clear();
  store.emails.clear();
  store.activities.clear();
  store.notifications.clear();
  store.onboardingSessions.clear();
  store.onboardingFeedback.clear();
  store.policies.clear();
  store.underwritingCases.clear();
}
