// ========================================
// AI UNDERWRITING TYPES - Phase 11.1
// ========================================

import type { InsuranceType, MoneyAmount } from './index.js';

export type UnderwritingDecision = 'approve' | 'refer' | 'decline';
export type UnderwritingRiskLevel = 'low' | 'medium' | 'high' | 'critical';

export interface UnderwritingPremiumAdjustment {
  multiplier: number; // e.g. 1.1 => +10%
  notes?: string;
  suggestedPremium?: MoneyAmount;
}

export interface UnderwritingResult {
  decision: UnderwritingDecision;
  riskScore: number; // 0-100 (higher = riskier)
  riskLevel: UnderwritingRiskLevel;
  confidence: number; // 0-1
  reasons: string[];
  requiredDocuments: string[];
  recommendedActions: string[];
  premiumAdjustment?: UnderwritingPremiumAdjustment;
  evaluatedAt: Date;
  model?: string;
}

export type UnderwritingCaseStatus = 'pending' | 'completed' | 'error';

export interface UnderwritingCase {
  id: string;
  leadId: string;
  policyId?: string;
  insuranceType: InsuranceType;
  status: UnderwritingCaseStatus;
  result?: UnderwritingResult;
  error?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface RunUnderwritingRequest {
  leadId: string;
  policyId?: string;
  insuranceType?: InsuranceType;
  applicantData?: Record<string, unknown>;
  policyData?: Record<string, unknown>;
}
