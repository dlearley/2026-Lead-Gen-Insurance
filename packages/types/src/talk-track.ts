/**
 * Type definitions for AI Talk Track Generator
 * Sales conversation script generation system
 */

export enum TalkTrackType {
  DISCOVERY = 'DISCOVERY',
  DEMO = 'DEMO',
  CLOSING = 'CLOSING',
  FOLLOW_UP = 'FOLLOW_UP',
  NEGOTIATION = 'NEGOTIATION',
  OBJECTION_HANDLING = 'OBJECTION_HANDLING',
  COLD_CALL = 'COLD_CALL',
  WARM_CALL = 'WARM_CALL',
  PARTNERSHIP = 'PARTNERSHIP',
  RENEWAL = 'RENEWAL',
}

export enum TalkTrackTone {
  PROFESSIONAL = 'PROFESSIONAL',
  FRIENDLY = 'FRIENDLY',
  FORMAL = 'FORMAL',
  CASUAL = 'CASUAL',
  DIRECT = 'DIRECT',
  CONSULTATIVE = 'CONSULTATIVE',
}

export enum TalkTrackStatus {
  DRAFT = 'DRAFT',
  APPROVED = 'APPROVED',
  ARCHIVED = 'ARCHIVED',
}

export enum ObjectionType {
  PRICE = 'PRICE',
  TIMING = 'TIMING',
  AUTHORITY = 'AUTHORITY',
  NEED = 'NEED',
  COMPETITION = 'COMPETITION',
  TRUST = 'TRUST',
  FEATURE = 'FEATURE',
  IMPLEMENTATION = 'IMPLEMENTATION',
  CONTRACT = 'CONTRACT',
  SUPPORT = 'SUPPORT',
}

export enum SalesStage {
  LEAD = 'LEAD',
  QUALIFIED = 'QUALIFIED',
  PROPOSAL = 'PROPOSAL',
  NEGOTIATION = 'NEGOTIATION',
  CLOSED = 'CLOSED',
}

// Core talk track interfaces
export interface TalkTrack {
  id: string;
  organizationId: string;
  name: string;
  type: TalkTrackType;
  tone: TalkTrackTone;
  status: TalkTrackStatus;
  targetAudience?: string[];
  industry?: string[];
  productFocus?: string[];
  estimatedDuration?: number; // in minutes
  tags: string[];
  sections: TalkTrackSection[];
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  version: number;
  parentId?: string;
  isTemplate: boolean;
  usageCount?: number;
}

export interface TalkTrackSection {
  id: string;
  talkTrackId: string;
  title: string;
  order: number;
  content: string;
  tips?: string[];
  keyPoints?: string[];
  requiredFields?: string[]; // Lead fields that should be referenced
  createdAt: Date;
}

export interface TalkTrackTemplate {
  id: string;
  name: string;
  type: TalkTrackType;
  tone: TalkTrackTone;
  description: string;
  targetAudience?: string[];
  industry?: string[];
  estimatedDuration?: number;
  sections: TalkTrackSectionTemplate[];
  tags: string[];
}

export interface TalkTrackSectionTemplate {
  title: string;
  order: number;
  content: string;
  tips?: string[];
  keyPoints?: string[];
  requiredFields?: string[];
}

// AI generation interfaces
export interface GenerateTalkTrackInput {
  organizationId: string;
  type: TalkTrackType;
  tone?: TalkTrackTone;
  targetAudience?: string[];
  industry?: string;
  productFocus?: string[];
  leadContext?: LeadContext;
  competitorContext?: CompetitorContext;
  customInstructions?: string;
  sections?: string[]; // Specific sections to include
  excludeSections?: string[];
  maxDuration?: number; // Maximum talk track length in minutes
}

export interface LeadContext {
  leadId?: string;
  leadName?: string;
  company?: string;
  industry?: string;
  size?: 'small' | 'medium' | 'large' | 'enterprise';
  painPoints?: string[];
  budgetRange?: string;
  timeline?: string;
  decisionMaker?: boolean;
  previousInteractions?: string[];
  currentStage?: SalesStage;
  source?: 'inbound' | 'outbound' | 'referral' | 'partner';
}

export interface CompetitorContext {
  competitorId?: string;
  competitorName?: string;
  battleCardUsed?: boolean;
  competitorStrengths?: string[];
  competitorWeaknesses?: string[];
  knownObjections?: string[];
}

export interface GeneratedTalkTrack {
  talkTrack: TalkTrack;
  metadata: GenerationMetadata;
  confidence: number; // 0-1
  alternatives?: TalkTrack[];
}

export interface GenerationMetadata {
  model: string;
  generatedAt: Date;
  promptTokens: number;
  completionTokens: number;
  totalTime: number; // milliseconds
  sources: string[]; // Data sources used (templates, battle cards, etc.)
  customizations: string[]; // What was customized
}

// Objection handling interfaces
export interface ObjectionHandler {
  id: string;
  talkTrackId?: string;
  objectionType: ObjectionType;
  objection: string; // The actual objection text or pattern
  response: string;
  techniques: string[]; // Techniques used (e.g., "Feel-Felt-Found", "Reframe", "Clarify")
  fallbackResponses?: string[];
  confidence: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface GenerateObjectionHandlersInput {
  organizationId: string;
  objectionType: ObjectionType;
  customObjection?: string;
  context?: {
    industry?: string;
    productFocus?: string[];
    competitor?: string;
  };
  tone?: TalkTrackTone;
  generateAlternatives?: boolean;
}

// Usage and analytics interfaces
export interface TalkTrackUsage {
  id: string;
  talkTrackId: string;
  agentId: string;
  leadId?: string;
  context: UsageContext;
  feedback?: UsageFeedback;
  usedAt: Date;
}

export interface UsageContext {
  stage: SalesStage;
  duration?: number; // Actual time spent using talk track
  sectionsUsed?: string[]; // Which sections were accessed
  modifications?: string[]; // Any manual changes made
  outcome?: 'scheduled' | 'no_interest' | 'follow_up' | 'closed' | 'not_qualified';
}

export interface UsageFeedback {
  rating?: number; // 1-5
  helpful?: boolean;
  comments?: string;
  whatWorked?: string[];
  whatDidntWork?: string[];
  suggestions?: string;
}

export interface TalkTrackAnalytics {
  talkTrackId: string;
  totalUsage: number;
  avgRating: number;
  successRate: number; // Conversion rate when talk track was used
  avgDuration: number;
  mostUsedSections: string[];
  leastUsedSections: string[];
  feedbackTrends: FeedbackTrend[];
  topObjections: ObjectionStats[];
}

export interface FeedbackTrend {
  date: Date;
  avgRating: number;
  usageCount: number;
}

export interface ObjectionStats {
  objectionType: ObjectionType;
  count: number;
  successRate: number; // How well the handler worked
  mostUsedResponse: string;
}

// Favorites and customization interfaces
export interface TalkTrackFavorite {
  id: string;
  talkTrackId: string;
  agentId: string;
  notes?: string;
  addedAt: Date;
}

export interface TalkTrackCustomization {
  id: string;
  talkTrackId: string;
  agentId: string;
  customizations: Customization[];
  createdAt: Date;
  updatedAt: Date;
}

export interface Customization {
  sectionId?: string;
  originalContent: string;
  customContent: string;
  reason?: string;
  createdAt: Date;
}

// Search and filter interfaces
export interface TalkTrackSearchFilters {
  type?: TalkTrackType;
  tone?: TalkTrackTone;
  status?: TalkTrackStatus;
  industry?: string[];
  targetAudience?: string[];
  tags?: string[];
  createdBy?: string;
  isTemplate?: boolean;
  dateRange?: {
    start: Date;
    end: Date;
  };
  minRating?: number;
  maxDuration?: number;
}

export interface TalkTrackSearchParams {
  organizationId: string;
  filters?: TalkTrackSearchFilters;
  searchTerm?: string;
  sortBy?: 'createdAt' | 'updatedAt' | 'name' | 'usageCount' | 'rating';
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

// Batch generation interfaces
export interface BatchGenerateTalkTracksInput {
  organizationId: string;
  inputs: GenerateTalkTrackInput[];
  priority?: 'low' | 'normal' | 'high';
  notifyOnComplete?: boolean;
}

export interface BatchGenerationJob {
  id: string;
  organizationId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  total: number;
  completed: number;
  failed: number;
  results?: GeneratedTalkTrack[];
  errors?: BatchError[];
  createdAt: Date;
  completedAt?: Date;
}

export interface BatchError {
  inputIndex: number;
  error: string;
  details?: any;
}

// Integration interfaces
export interface CRMMapping {
  talkTrackId: string;
  crmStage: string; // Salesforce stage, HubSpot deal stage, etc.
  crmObjectType: string; // Opportunity, Deal, etc.
  autoTrigger: boolean;
  createdAt: Date;
}

export interface TalkTrackExport {
  format: 'pdf' | 'word' | 'html' | 'json';
  includeMetadata?: boolean;
  includeAnalytics?: boolean;
  customBranding?: boolean;
}
