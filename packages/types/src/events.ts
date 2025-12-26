export const EVENT_SUBJECTS = {
  LeadReceived: 'lead.received',
  LeadProcessed: 'lead.processed',
  LeadGet: 'lead.get',
  LeadAssign: 'lead.assign',
  AgentGet: 'agent.get',
  AgentsMatch: 'agents.match',
  RoutingConfigUpdate: 'routing.config.update',
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
