// ========================================
// BROKER NETWORK TYPES
// ========================================

export type BrokerRelationshipType =
  | 'direct_referral'
  | 'cross_referral'
  | 'mentorship'
  | 'partnership'
  | 'team_member'
  | 'team_leader'
  | 'network_member';

export type NetworkTier = 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond';
export type NetworkMetric = 'referrals_sent' | 'referrals_received' | 'conversions' | 'revenue';

export interface BrokerNetwork {
  id: string;
  brokerId: string;
  networkTier: NetworkTier;
  totalConnections: number;
  activeConnections: number;
  networkValue: number;
  networkScore: number;
  referralMultiplier: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface BrokerConnection {
  id: string;
  brokerId: string;
  connectedBrokerId: string;
  relationshipType: BrokerRelationshipType;
  strength: number;
  isActive: boolean;
  referralCount: number;
  revenueGenerated: number;
  lastReferralAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface BrokerReferral {
  id: string;
  leadId: string;
  referringBrokerId: string;
  receivingBrokerId: string;
  status: 'pending' | 'accepted' | 'converted' | 'declined' | 'expired';
  commissionRate: number;
  commissionAmount?: number;
  referralReason?: string;
  notes?: string;
  expiresAt?: Date;
  convertedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface NetworkMetrics {
  brokerId: string;
  networkTier: NetworkTier;
  totalReferralsSent: number;
  totalReferralsReceived: number;
  totalConversions: number;
  totalRevenue: number;
  averageConversionRate: number;
  networkValue: number;
  networkScore: number;
  referralMultiplier: number;
  activeConnections: number;
  period: {
    start: Date;
    end: Date;
  };
}

export interface NetworkEffect {
  id: string;
  sourceBrokerId: string;
  affectedBrokerId: string;
  effectType: 'referral_boost' | 'knowledge_sharing' | 'resource_sharing' | 'market_expansion';
  value: number;
  description: string;
  timestamp: Date;
  metadata?: Record<string, unknown>;
}

export interface BrokerTeam {
  id: string;
  teamLeaderId: string;
  teamName: string;
  memberIds: string[];
  totalLeads: number;
  totalConversions: number;
  totalRevenue: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface CommissionSplit {
  id: string;
  referralId: string;
  brokerId: string;
  splitPercentage: number;
  amount: number;
  status: 'pending' | 'processed' | 'paid';
  processedAt?: Date;
  paidAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface NetworkGrowthMetric {
  brokerId: string;
  period: string;
  newConnections: number;
  lostConnections: number;
  netGrowth: number;
  totalReferrals: number;
  totalConversions: number;
  revenueGrowth: number;
  networkScoreChange: number;
}

export interface BrokerConnectionRequest {
  brokerId: string;
  connectedBrokerId: string;
  relationshipType: BrokerRelationshipType;
  message?: string;
}

export interface CreateBrokerReferralDto {
  leadId: string;
  receivingBrokerId: string;
  commissionRate?: number;
  referralReason?: string;
  notes?: string;
  expiresAt?: Date;
}

export interface UpdateBrokerConnectionDto {
  relationshipType?: BrokerRelationshipType;
  strength?: number;
  isActive?: boolean;
}

export interface NetworkAnalyticsParams {
  brokerId?: string;
  networkTier?: NetworkTier;
  relationshipType?: BrokerRelationshipType;
  startDate?: Date;
  endDate?: Date;
  period?: 'day' | 'week' | 'month' | 'quarter' | 'year';
  includeChildren?: boolean;
}

export interface NetworkLeaderboardEntry {
  rank: number;
  brokerId: string;
  brokerName: string;
  networkTier: NetworkTier;
  networkScore: number;
  totalConnections: number;
  totalReferrals: number;
  totalConversions: number;
  totalRevenue: number;
  referralMultiplier: number;
}

export interface NetworkValueCalculation {
  directValue: number;
  indirectValue: number;
  totalValue: number;
  networkMultiplier: number;
  connectionBreakdown: {
    direct: number;
    secondLevel: number;
    thirdLevel: number;
  };
}
