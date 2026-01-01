// ========================================
// A/B TESTING & ORCHESTRATION TYPES
// ========================================

export type ExperimentStatus = 'DRAFT' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED';

export type ExperimentType =
  | 'OFFER'
  | 'MESSAGING'
  | 'CHANNEL_SEQUENCE'
  | 'TIMING'
  | 'AGENT_COACHING'
  | 'LEAD_ROUTING';

export interface Experiment {
  id: string;
  name: string;
  description?: string;
  hypothesis?: string;
  status: ExperimentStatus;
  type: ExperimentType;
  targetMetric: string;
  sampleSize?: number;
  durationDays?: number;
  startDate?: Date;
  endDate?: Date;
  trafficAllocation: number;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
  variants?: ExperimentVariant[];
}

export interface ExperimentVariant {
  id: string;
  experimentId: string;
  name: string;
  description?: string;
  configuration: Record<string, unknown>;
  allocationWeight: number;
  isControl: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ExperimentAssignment {
  id: string;
  experimentId: string;
  variantId: string;
  leadId: string;
  assignedAt: Date;
  metadata?: Record<string, unknown>;
}

export interface ExperimentResult {
  id: string;
  experimentId: string;
  variantId: string;
  metricName: string;
  metricValue: number;
  sampleSize: number;
  confidenceLevel?: number;
  pValue?: number;
  isSignificant: boolean;
  calculatedAt: Date;
}

export type CampaignStatus = 'DRAFT' | 'ACTIVE' | 'PAUSED' | 'ARCHIVED';

export type CampaignType = 'WELCOME' | 'NURTURE' | 'WIN_BACK' | 'FOLLOW_UP' | 'RETENTION';

export interface Campaign {
  id: string;
  name: string;
  description?: string;
  status: CampaignStatus;
  type: CampaignType;
  frequencyCap?: number;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
  steps?: CampaignStep[];
}

export type ChannelType = 'VOICE' | 'EMAIL' | 'SMS' | 'WEB' | 'IN_APP';

export interface CampaignStep {
  id: string;
  campaignId: string;
  order: number;
  channel: ChannelType;
  delaySeconds: number;
  messageTemplateId?: string;
  conditions?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export type EnrollmentStatus = 'ACTIVE' | 'PAUSED' | 'COMPLETED' | 'OPTED_OUT';

export interface CampaignLead {
  id: string;
  campaignId: string;
  leadId: string;
  status: EnrollmentStatus;
  currentStepOrder: number;
  lastActionAt?: Date;
  nextActionAt?: Date;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export type LeadStage =
  | 'NEW'
  | 'CONTACTED'
  | 'ENGAGED'
  | 'QUOTED'
  | 'ACCEPTED'
  | 'REJECTED'
  | 'CONVERTED'
  | 'CHURN_RISK';

export interface LeadState {
  id: string;
  leadId: string;
  stage: LeadStage;
  engagementScore: number;
  offersMade?: Record<string, unknown>;
  lastChannel?: ChannelType;
  lastContactAt?: Date;
  metadata?: Record<string, unknown>;
  updatedAt: Date;
}

export interface ChannelMessage {
  id: string;
  name: string;
  channel: ChannelType;
  content: string;
  subject?: string;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export type TouchpointType = 'FIRST_TOUCH' | 'INTERMEDIATE' | 'LAST_TOUCH';

export interface AttributionLog {
  id: string;
  leadId: string;
  channel: ChannelType;
  touchpointType: TouchpointType;
  weight: number;
  conversionValue?: number;
  metadata?: Record<string, unknown>;
  timestamp: Date;
}

export type OrchestrationEventType =
  | 'MESSAGE_SENT'
  | 'MESSAGE_OPENED'
  | 'MESSAGE_CLICKED'
  | 'OFFER_PRESENTED'
  | 'OFFER_ACCEPTED'
  | 'OFFER_REJECTED'
  | 'CONVERSION';

export interface OrchestrationEvent {
  id: string;
  leadId: string;
  type: OrchestrationEventType;
  channel?: ChannelType;
  campaignId?: string;
  stepId?: string;
  experimentId?: string;
  variantId?: string;
  data?: Record<string, unknown>;
  timestamp: Date;
}

// DTOs
export interface CreateExperimentDto {
  name: string;
  description?: string;
  hypothesis?: string;
  type: ExperimentType;
  targetMetric: string;
  sampleSize?: number;
  durationDays?: number;
  trafficAllocation?: number;
  metadata?: Record<string, unknown>;
  variants: Array<{
    name: string;
    description?: string;
    configuration: Record<string, unknown>;
    allocationWeight?: number;
    isControl?: boolean;
  }>;
}

export interface CreateCampaignDto {
  name: string;
  description?: string;
  type: CampaignType;
  frequencyCap?: number;
  metadata?: Record<string, unknown>;
  steps: Array<{
    order: number;
    channel: ChannelType;
    delaySeconds: number;
    messageTemplateId?: string;
    conditions?: Record<string, unknown>;
    metadata?: Record<string, unknown>;
  }>;
}
