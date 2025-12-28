import type { UnderwritingResult } from './underwriting.js';

export const EVENT_SUBJECTS = {
  LeadReceived: 'lead.received',
  LeadProcessed: 'lead.processed',
  LeadGet: 'lead.get',
  LeadAssign: 'lead.assign',
  AgentGet: 'agent.get',
  AgentsMatch: 'agents.match',
  RoutingConfigUpdate: 'routing.config.update',
  UnderwritingRequested: 'underwriting.requested',
  UnderwritingCompleted: 'underwriting.completed',
} as const;

export type EventSubject = (typeof EVENT_SUBJECTS)[keyof typeof EVENT_SUBJECTS];

export interface EventEnvelope<TType extends string, TData> {
  id: string;
  type: TType;
  source: string;
  data: TData;
  timestamp: string;
  metadata?: Record<string, unknown>;
}

export interface LeadCreatePayload {
  source: string;
  email?: string;
  phone?: string;
  firstName?: string;
  lastName?: string;
  address?: {
    street?: string;
    city?: string;
    state?: string;
    zipCode?: string;
    country?: string;
  };
  insuranceType?: 'auto' | 'home' | 'life' | 'health' | 'commercial';
  metadata?: Record<string, unknown>;
}

export type LeadReceivedEvent = EventEnvelope<
  typeof EVENT_SUBJECTS.LeadReceived,
  {
    leadId: string;
    lead: LeadCreatePayload;
  }
>;

export type LeadProcessedEvent = EventEnvelope<
  typeof EVENT_SUBJECTS.LeadProcessed,
  {
    leadId: string;
  }
>;

export type UnderwritingRequestedEvent = EventEnvelope<
  typeof EVENT_SUBJECTS.UnderwritingRequested,
  {
    leadId: string;
    policyId?: string;
    context?: Record<string, unknown>;
  }
>;

export type UnderwritingCompletedEvent = EventEnvelope<
  typeof EVENT_SUBJECTS.UnderwritingCompleted,
  {
    leadId: string;
    policyId?: string;
    result: UnderwritingResult;
  }
>;

export type LeadGetRequest = {
  leadId: string;
};

export type LeadGetResponse = {
  lead: any; // Using any for now to avoid circular dependency or complex types
  error?: string;
};

export type AgentsMatchRequest = {
  insuranceType?: string;
  state?: string;
  limit?: number;
};

export type AgentsMatchResponse = {
  agents: any[];
  error?: string;
};

export type LeadAssignRequest = {
  leadId: string;
  agentId: string;
  strategy?: string;
  metadata?: Record<string, unknown>;
};

export type LeadAssignResponse = {
  assignmentId: string;
  success: boolean;
  error?: string;
};
