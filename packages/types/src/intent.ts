import { Lead } from './index.js';

export type IntentLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface IntentScore {
  id: string;
  leadId: string;
  score: number; // 0-100
  level: IntentLevel;
  confidence: number;
  topSignals: IntentSignal[];
  lastUpdated: string;
  trend: 'UP' | 'DOWN' | 'STABLE';
  lead?: Lead;
}

export interface IntentSignal {
  id: string;
  leadId: string;
  type: SignalType;
  category: SignalCategory;
  score: number;
  weight: number;
  description: string;
  timestamp: string;
  metadata?: Record<string, any>;
}

export type SignalType =
  | 'PRODUCT_PAGE_VISIT'
  | 'PRICING_PAGE_VISIT'
  | 'DEMO_REQUEST'
  | 'TRIAL_SIGNUP'
  | 'WHITEPAPER_DOWNLOAD'
  | 'EMAIL_OPEN'
  | 'EMAIL_CLICK'
  | 'EMAIL_REPLY'
  | 'CONTENT_ENGAGEMENT'
  | 'VELOCITY_SPIKE'
  | 'BUYING_KEYWORD'
  | 'CHURN_RISK_SIGNAL'
  | 'EXPANSION_SIGNAL';

export type SignalCategory =
  | 'WEBSITE'
  | 'EMAIL'
  | 'CONTENT'
  | 'VELOCITY'
  | 'BUYING'
  | 'CHURN'
  | 'EXPANSION';

export interface IntentCalculationWeights {
  websiteBehavior: number;
  emailEngagement: number;
  contentConsumption: number;
  engagementVelocity: number;
  buyingSignals: number;
}

export interface IntentSignalFilter {
  leadId?: string;
  category?: SignalCategory;
  type?: SignalType;
  minScore?: number;
  startDate?: string;
  endDate?: string;
}

export interface IntentScoreHistory {
  leadId: string;
  history: Array<{
    score: number;
    timestamp: string;
  }>;
}
