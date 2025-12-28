// ========================================
// CUSTOMER RETENTION TYPES
// ========================================

export type PolicyStatus = 'active' | 'pending_renewal' | 'expired' | 'cancelled' | 'lapsed';
export type PolicyType = 'auto' | 'home' | 'life' | 'health' | 'commercial';
export type RenewalStatus = 'upcoming' | 'overdue' | 'renewed' | 'churned';
export type ChurnRisk = 'low' | 'medium' | 'high' | 'critical';
export type CampaignType =
  | 'renewal_reminder'
  | 'engagement'
  | 'winback'
  | 'cross_sell'
  | 'upsell'
  | 'loyalty';
export type CampaignStatus =
  | 'draft'
  | 'scheduled'
  | 'active'
  | 'paused'
  | 'completed'
  | 'cancelled';
export type TouchpointType = 'email' | 'sms' | 'call' | 'notification' | 'mail';
export type TouchpointStatus =
  | 'pending'
  | 'sent'
  | 'delivered'
  | 'opened'
  | 'clicked'
  | 'responded'
  | 'failed';

// RetentionCustomer model - converted leads (renamed to avoid conflict with portal Customer)
export interface RetentionCustomer {
  id: string;
  leadId: string;
  agentId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  dateOfBirth?: Date;
  address?: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };
  customerSince: Date;
  totalPolicies: number;
  activePolicies: number;
  lifetimeValue: number;
  satisfactionScore?: number;
  healthScore: number;
  churnRisk: ChurnRisk;
  lastContactDate?: Date;
  nextRenewalDate?: Date;
  preferredContactMethod?: string;
  tags: string[];
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

// RetentionPolicy model (renamed to avoid conflict with main Policy type)
export interface RetentionPolicy {
  id: string;
  customerId: string;
  agentId: string;
  policyNumber: string;
  policyType: PolicyType;
  status: PolicyStatus;
  premium: {
    amount: number;
    frequency: 'monthly' | 'quarterly' | 'semi_annual' | 'annual';
    currency: string;
  };
  coverage: {
    type: string;
    amount: number;
    deductible?: number;
    limits?: Record<string, number>;
  };
  effectiveDate: Date;
  expirationDate: Date;
  renewalDate: Date;
  lastRenewalDate?: Date;
  renewalCount: number;
  totalPaid: number;
  claimsCount: number;
  totalClaimAmount: number;
  underwriter?: string;
  documents: string[];
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

// Customer Health Score
export interface CustomerHealthScore {
  customerId: string;
  overallScore: number; // 0-100
  components: {
    engagement: {
      score: number;
      lastInteractionDays: number;
      interactionFrequency: number;
      emailOpenRate: number;
      responseRate: number;
    };
    financial: {
      score: number;
      paymentHistory: number;
      premiumGrowth: number;
      crossSellOpportunities: number;
    };
    satisfaction: {
      score: number;
      nps?: number;
      complaintCount: number;
      resolutionRate: number;
    };
    lifecycle: {
      score: number;
      tenure: number;
      policyCount: number;
      renewalRate: number;
      churnIndicators: number;
    };
  };
  churnRisk: ChurnRisk;
  churnProbability: number; // 0-1
  riskFactors: Array<{
    factor: string;
    impact: 'low' | 'medium' | 'high';
    description: string;
  }>;
  recommendations: string[];
  calculatedAt: Date;
}

// Lifetime Value (LTV) Calculation
export interface CustomerLTV {
  customerId: string;
  currentLTV: number;
  projectedLTV: number;
  averageRevenue: {
    monthly: number;
    annual: number;
  };
  retentionRate: number;
  averageLifespan: number; // in months
  acquisitionCost: number;
  profitMargin: number;
  breakdown: {
    totalRevenue: number;
    totalCost: number;
    netProfit: number;
    policyRevenue: Record<PolicyType, number>;
  };
  segments: {
    tier: 'bronze' | 'silver' | 'gold' | 'platinum';
    category: 'new' | 'growing' | 'stable' | 'declining' | 'at_risk';
  };
  calculatedAt: Date;
}

// Retention Campaign
export interface RetentionCampaign {
  id: string;
  name: string;
  description?: string;
  type: CampaignType;
  status: CampaignStatus;
  targetSegment: {
    churnRisk?: ChurnRisk[];
    policyTypes?: PolicyType[];
    healthScoreRange?: { min: number; max: number };
    tenure?: { min: number; max: number };
    customFilters?: Record<string, unknown>;
  };
  schedule: {
    startDate: Date;
    endDate?: Date;
    frequency?: string; // cron expression
    timezone?: string;
  };
  touchpoints: Array<{
    type: TouchpointType;
    template: string;
    delay: number; // minutes from campaign start or previous touchpoint
    conditions?: Record<string, unknown>;
  }>;
  goals: {
    targetCustomers: number;
    expectedRetention: number;
    expectedRevenue: number;
  };
  performance: {
    customersTargeted: number;
    customersReached: number;
    customersEngaged: number;
    customersRetained: number;
    revenueGenerated: number;
    roi: number;
  };
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

// Campaign Touchpoint (individual customer interaction)
export interface CampaignTouchpoint {
  id: string;
  campaignId: string;
  customerId: string;
  type: TouchpointType;
  status: TouchpointStatus;
  content: {
    subject?: string;
    body: string;
    template?: string;
    personalization?: Record<string, unknown>;
  };
  scheduledFor: Date;
  sentAt?: Date;
  deliveredAt?: Date;
  openedAt?: Date;
  clickedAt?: Date;
  respondedAt?: Date;
  response?: string;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

// Retention Event
export interface RetentionEvent {
  id: string;
  customerId: string;
  policyId?: string;
  eventType:
    | 'policy_renewed'
    | 'policy_cancelled'
    | 'policy_lapsed'
    | 'payment_missed'
    | 'payment_late'
    | 'claim_filed'
    | 'complaint_filed'
    | 'satisfaction_survey'
    | 'engagement_decline'
    | 'contact_attempted'
    | 'contact_successful'
    | 'cross_sell_opportunity'
    | 'upsell_opportunity'
    | 'churn_risk_increased'
    | 'churn_risk_decreased';
  severity: 'info' | 'warning' | 'critical';
  data: Record<string, unknown>;
  triggeredActions?: string[];
  timestamp: Date;
  metadata?: Record<string, unknown>;
}

// Retention Metrics
export interface RetentionMetrics {
  period: {
    startDate: Date;
    endDate: Date;
  };
  customerMetrics: {
    totalCustomers: number;
    newCustomers: number;
    activeCustomers: number;
    churnedCustomers: number;
    retainedCustomers: number;
    retentionRate: number;
    churnRate: number;
    growthRate: number;
    byChurnRisk: Record<ChurnRisk, number>;
  };
  policyMetrics: {
    totalPolicies: number;
    activePolicies: number;
    renewedPolicies: number;
    cancelledPolicies: number;
    lapsedPolicies: number;
    renewalRate: number;
    byPolicyType: Record<
      PolicyType,
      {
        count: number;
        renewalRate: number;
        avgPremium: number;
      }
    >;
  };
  revenueMetrics: {
    totalRevenue: number;
    newCustomerRevenue: number;
    renewalRevenue: number;
    expansionRevenue: number; // cross-sell, upsell
    churnedRevenue: number;
    netRevenueRetention: number;
    averageLTV: number;
    bySegment: Record<string, number>;
  };
  campaignMetrics: {
    activeCampaigns: number;
    totalTouchpoints: number;
    engagementRate: number;
    conversionRate: number;
    roi: number;
  };
  healthMetrics: {
    averageHealthScore: number;
    averageSatisfactionScore: number;
    healthScoreDistribution: {
      excellent: number; // 80-100
      good: number; // 60-79
      fair: number; // 40-59
      poor: number; // 0-39
    };
  };
  trends: Array<{
    date: string;
    retention: number;
    churn: number;
    revenue: number;
    healthScore: number;
  }>;
}

// DTOs
export interface CreateRetentionCustomerDto {
  leadId: string;
  agentId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  dateOfBirth?: Date;
  address?: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };
  preferredContactMethod?: string;
  tags?: string[];
  metadata?: Record<string, unknown>;
}

export interface CreateRetentionPolicyDto {
  customerId: string;
  agentId: string;
  policyNumber: string;
  policyType: PolicyType;
  premium: {
    amount: number;
    frequency: 'monthly' | 'quarterly' | 'semi_annual' | 'annual';
    currency: string;
  };
  coverage: {
    type: string;
    amount: number;
    deductible?: number;
    limits?: Record<string, number>;
  };
  effectiveDate: Date;
  expirationDate: Date;
  underwriter?: string;
  metadata?: Record<string, unknown>;
}

export interface CreateRetentionCampaignDto {
  name: string;
  description?: string;
  type: CampaignType;
  targetSegment: {
    churnRisk?: ChurnRisk[];
    policyTypes?: PolicyType[];
    healthScoreRange?: { min: number; max: number };
    tenure?: { min: number; max: number };
    customFilters?: Record<string, unknown>;
  };
  schedule: {
    startDate: Date;
    endDate?: Date;
    frequency?: string;
    timezone?: string;
  };
  touchpoints: Array<{
    type: TouchpointType;
    template: string;
    delay: number;
    conditions?: Record<string, unknown>;
  }>;
  goals: {
    targetCustomers: number;
    expectedRetention: number;
    expectedRevenue: number;
  };
}

export interface UpdateRetentionCustomerDto {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  dateOfBirth?: Date;
  address?: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };
  satisfactionScore?: number;
  preferredContactMethod?: string;
  tags?: string[];
  metadata?: Record<string, unknown>;
}

export interface UpdateRetentionPolicyDto {
  status?: PolicyStatus;
  premium?: {
    amount: number;
    frequency: 'monthly' | 'quarterly' | 'semi_annual' | 'annual';
    currency: string;
  };
  coverage?: {
    type: string;
    amount: number;
    deductible?: number;
    limits?: Record<string, number>;
  };
  expirationDate?: Date;
  renewalDate?: Date;
  metadata?: Record<string, unknown>;
}

export interface RetentionQueryParams {
  startDate?: string;
  endDate?: string;
  churnRisk?: ChurnRisk;
  policyType?: PolicyType;
  status?: PolicyStatus;
  healthScoreMin?: number;
  healthScoreMax?: number;
  agentId?: string;
  page?: number;
  limit?: number;
}

export interface ChurnPredictionInput {
  customerId: string;
  features?: {
    tenure?: number;
    policyCount?: number;
    claimsRatio?: number;
    paymentHistory?: number;
    engagementScore?: number;
    satisfactionScore?: number;
    lastContactDays?: number;
    premiumChanges?: number;
  };
}

export interface ChurnPredictionResult {
  customerId: string;
  churnProbability: number;
  churnRisk: ChurnRisk;
  confidence: number;
  factors: Array<{
    name: string;
    impact: number;
    direction: 'positive' | 'negative';
  }>;
  recommendations: Array<{
    action: string;
    priority: 'low' | 'medium' | 'high';
    expectedImpact: string;
  }>;
  predictedAt: Date;
}
