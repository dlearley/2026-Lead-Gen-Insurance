export enum VIPTier {
  SILVER = 'SILVER',
  GOLD = 'GOLD',
  PLATINUM = 'PLATINUM',
  DIAMOND = 'DIAMOND',
}

export interface AgentVIPStatus {
  id: string;
  agentId: string;
  tier: VIPTier;
  points: number;
  joinedAt: Date;
  updatedAt: Date;
  expiresAt?: Date | null;
}

export interface VIPProgramBenefits {
  tier: VIPTier;
  leadPriorityMultiplier: number;
  commissionBonus: number;
  exclusiveFeatures: string[];
}

export const TIER_BENEFITS: Record<VIPTier, VIPProgramBenefits> = {
  [VIPTier.SILVER]: {
    tier: VIPTier.SILVER,
    leadPriorityMultiplier: 1.0,
    commissionBonus: 0,
    exclusiveFeatures: [],
  },
  [VIPTier.GOLD]: {
    tier: VIPTier.GOLD,
    leadPriorityMultiplier: 1.2,
    commissionBonus: 0.05,
    exclusiveFeatures: ['priority_support'],
  },
  [VIPTier.PLATINUM]: {
    tier: VIPTier.PLATINUM,
    leadPriorityMultiplier: 1.5,
    commissionBonus: 0.1,
    exclusiveFeatures: ['priority_support', 'advanced_analytics'],
  },
  [VIPTier.DIAMOND]: {
    tier: VIPTier.DIAMOND,
    leadPriorityMultiplier: 2.0,
    commissionBonus: 0.2,
    exclusiveFeatures: ['priority_support', 'advanced_analytics', 'dedicated_account_manager'],
  },
};
