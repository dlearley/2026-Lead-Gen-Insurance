// ========================================
// ONBOARDING, ACTIVATION & FEEDBACK TYPES
// ========================================

export const ONBOARDING_STEPS = {
  SignedUp: 'signed_up',
  ConfiguredAgent: 'configured_agent',
  FirstLead: 'first_lead',
  FirstConversion: 'first_conversion',
} as const;

export type OnboardingStep = (typeof ONBOARDING_STEPS)[keyof typeof ONBOARDING_STEPS];

export const ONBOARDING_MILESTONES = {
  SignedUp: 'signed_up',
  ConfiguredAgent: 'configured_agent',
  FirstLead: 'first_lead',
  FirstConversion: 'first_conversion',
} as const;

export type ActivationMilestone = (typeof ONBOARDING_MILESTONES)[keyof typeof ONBOARDING_MILESTONES];

export type OnboardingStatus = 'on_track' | 'at_risk' | 'completed';

export type OnboardingRiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface OnboardingStepState {
  step: OnboardingStep;
  startedAt: Date;
  completedAt?: Date;
}

export interface OnboardingSession {
  id: string;
  customerId: string;
  startedAt: Date;
  lastActivityAt: Date;
  completedAt?: Date;

  steps: Record<OnboardingStep, OnboardingStepState>;

  completionPercentage: number;
  currentStep: OnboardingStep;

  milestones: {
    firstLeadAt?: Date;
    firstConversionAt?: Date;
  };

  engagement: {
    leadCount: number;
    conversionCount: number;
    averageLeadQuality?: number;
  };

  risk: {
    status: OnboardingStatus;
    score: number; // 0..1
    level: OnboardingRiskLevel;
    reasons: string[];
    churnProbability: number; // 0..1
  };

  recommendations: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface OnboardingFeedbackSubmission {
  customerId: string;
  npsScore: number; // 0..10
  satisfactionScore: number; // 1..5
  painPoints?: string[];
  featureRequests?: string;
  comments?: string;
  source?: 'onboarding' | 'post_onboarding';
}

export interface OnboardingFeedbackResponse {
  id: string;
  customerId: string;
  submittedAt: Date;
  npsScore: number;
  satisfactionScore: number;
  npsCategory: 'detractor' | 'passive' | 'promoter';
  painPoints?: string[];
  featureRequests?: string;
  comments?: string;
  sentimentScore: number; // -1..1
  followUpRequired: boolean;
}
