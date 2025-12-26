import { logger } from '@insurance-lead-gen/core';

// Types for event payloads
export interface LeadCreatedEvent {
  leadId: string;
  source: string;
  email?: string;
  phone?: string;
  firstName?: string;
  lastName?: string;
  insuranceType?: string;
  createdAt: Date;
  metadata?: Record<string, unknown>;
}

export interface LeadUpdatedEvent {
  leadId: string;
  changes: Partial<LeadCreatedEvent>;
  updatedAt: Date;
}

export interface LeadStatusChangedEvent {
  leadId: string;
  previousStatus: string;
  newStatus: string;
  updatedAt: Date;
}

// Event types enum
export enum EventType {
  LEAD_CREATED = 'lead.created',
  LEAD_UPDATED = 'lead.updated',
  LEAD_STATUS_CHANGED = 'lead.status_changed',
  LEAD_QUALIFIED = 'lead.qualified',
  LEAD_ROUTED = 'lead.routed',
  LEAD_ASSIGNED = 'lead.assigned',
  LEAD_CONVERTED = 'lead.converted',
  LEAD_REJECTED = 'lead.rejected',
}

// NATS connection state
let natsConnection: any = null;
let isConnected = false;

// Connect to NATS (placeholder for actual connection)
export async function connectNATS(url: string): Promise<void> {
  try {
    // In production, use: import { connect } from 'nats';
    logger.info('NATS connection would be established', { url });
    isConnected = true;
    natsConnection = {}; // Placeholder
  } catch (error) {
    logger.error('Failed to connect to NATS', { error });
    throw error;
  }
}

// Disconnect from NATS
export async function disconnectNATS(): Promise<void> {
  if (natsConnection) {
    logger.info('NATS connection closed');
    natsConnection = null;
    isConnected = false;
  }
}

// Check if connected to NATS
export function isNATSConnected(): boolean {
  return isConnected;
}

// Publish event to NATS
export async function publishEvent(
  type: EventType,
  payload: LeadCreatedEvent | LeadUpdatedEvent | LeadStatusChangedEvent
): Promise<void> {
  if (!isConnected) {
    logger.warn('NATS not connected, event not published', { type });
    return;
  }

  const event = {
    id: `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    type,
    source: 'data-service',
    data: payload,
    timestamp: new Date(),
  };

  // In production, publish to NATS subject
  logger.info('Event published', { type, eventId: event.id });
}

// Publish lead created event
export async function publishLeadCreatedEvent(lead: LeadCreatedEvent): Promise<void> {
  await publishEvent(EventType.LEAD_CREATED, lead);
}

// Publish lead updated event
export async function publishLeadUpdatedEvent(leadId: string, changes: Partial<LeadCreatedEvent>): Promise<void> {
  await publishEvent(EventType.LEAD_UPDATED, {
    leadId,
    changes,
    updatedAt: new Date(),
  });
}

// Publish lead status changed event
export async function publishLeadStatusChangedEvent(
  leadId: string,
  previousStatus: string,
  newStatus: string
): Promise<void> {
  await publishEvent(EventType.LEAD_STATUS_CHANGED, {
    leadId,
    previousStatus,
    newStatus,
    updatedAt: new Date(),
  });
}

// Subscribe to events (placeholder)
export async function subscribeToEvents(
  subject: string,
  callback: (event: any) => Promise<void>
): Promise<void> {
  logger.info('Subscribed to NATS subject', { subject });
  // In production, set up subscription
}

// NATS subjects for the application
export const SUBJECTS = {
  LEAD_EVENTS: 'lead.events',
  LEAD_CREATED: 'lead.events.created',
  LEAD_UPDATED: 'lead.events.updated',
  LEAD_STATUS: 'lead.events.status',
  LEAD_QUALIFIED: 'lead.events.qualified',
  LEAD_ROUTED: 'lead.events.routed',
  ORCHESTRATOR_EVENTS: 'orchestrator.events',
  API_EVENTS: 'api.events',
} as const;
