// Customer Success Types

export type CustomerTier =
  | 'ENTERPRISE'
  | 'MID_MARKET'
  | 'SMALL_BUSINESS'
  | 'TRIAL';

export type CustomerStatus =
  | 'ACTIVE'
  | 'ONBOARDING'
  | 'AT_RISK'
  | 'CHURNED'
  | 'PAUSED';

export type ChurnRiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export type HealthLevel = 'POOR' | 'FAIR' | 'GOOD' | 'EXCELLENT';
export type HealthTrend = 'IMPROVING' | 'STABLE' | 'DECLINING' | 'UNKNOWN';

export type OnboardingStatus =
  | 'NOT_STARTED'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'ON_HOLD'
  | 'CANCELLED';

export type DataMigrationStatus =
  | 'NOT_STARTED'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'FAILED';

export type SuccessPlanType =
  | 'ONBOARDING'
  | 'QUARTERLY'
  | 'ANNUAL'
  | 'EXPANSION'
  | 'RECOVERY';

export type SuccessPlanStatus =
  | 'DRAFT'
  | 'ACTIVE'
  | 'COMPLETED'
  | 'ON_HOLD'
  | 'CANCELLED';

export type MilestoneStatus =
  | 'PENDING'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'OVERDUE'
  | 'CANCELLED';

export type MilestonePriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export type BusinessReviewType =
  | 'WEEKLY'
  | 'MONTHLY'
  | 'QUARTERLY'
  | 'ANNUAL'
  | 'EXECUTIVE'
  | 'STRATEGIC';

export type AdvocacyType =
  | 'CASE_STUDY'
  | 'TESTIMONIAL'
  | 'REFERENCE_CALL'
  | 'SPEAKER_EVENT'
  | 'PRESS_RELEASE'
  | 'WEBINAR'
  | 'USER_GROUP'
  | 'ADVISORY_BOARD';

export type AdvocacyStatus =
  | 'PENDING'
  | 'REQUESTED'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'DECLINED'
  | 'CANCELLED';

export type PeriodType = 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'ANNUAL';

// Customer Model
export interface Customer {
  id: string;
  leadId?: string;
  name: string;
  companyName?: string;
  email: string;
  phone?: string;
  industry?: string;
  businessType?: string;
  employeeCount?: number;
  annualRevenue?: number;
  website?: string;
  billingAddress?: string;
  billingCity?: string;
  billingState?: string;
  billingZipCode?: string;
  billingCountry?: string;
  tier: CustomerTier;
  status: CustomerStatus;
  contractStartDate: Date;
  contractEndDate?: Date;
  annualContractValue: number;
  customerSince: Date;
  totalPolicies: number;
  activePolicies: number;
  lifetimeValue: number;
  healthScore: number;
  churnRiskLevel: ChurnRiskLevel;
  lastContactDate?: Date;
  nextRenewalDate?: Date;
  preferredContactMethod?: string;
  tags: string[];
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

// CustomerSuccessProfile
export interface CustomerSuccessProfile {
  id: string;
  customerId: string;
  csmId?: string;
  csmName?: string;
  csmEmail?: string;
  executiveSponsorId?: string;
  executiveSponsorName?: string;
  executiveSponsorEmail?: string;
  technicalContactId?: string;
  technicalContactName?: string;
  technicalContactEmail?: string;
  primaryObjective?: string;
  secondaryObjectives: string[];
  successCriteria?: Record<string, unknown>;
  baselineMetrics?: Record<string, unknown>;
  targetMetrics?: Record<string, unknown>;
  currentMetrics?: Record<string, unknown>;
  onboardingStartDate?: Date;
  onboardingEndDate?: Date;
  onboardingStatus: OnboardingStatus;
  goLiveDate?: Date;
  timeToValue?: number;
  integrationsEnabled: string[];
  dataMigrationStatus: DataMigrationStatus;
  usersTrained: number;
  totalUsers: number;
  trainingCompleted: boolean;
  trainingDate?: Date;
  adoptionRate: number;
  featureAdoption?: Record<string, unknown>;
  loginFrequency?: string;
  latestNPS?: number;
  latestCSAT?: number;
  latestCES?: number;
  npsHistory?: Record<string, unknown>;
  csatHistory?: Record<string, unknown>;
  complaintCount: number;
  expansionRevenue: number;
  expansionProbability?: number;
  csmNotes?: string;
  riskNotes?: string;
  opportunityNotes?: string;
  createdAt: Date;
  updatedAt: Date;
}

// SuccessPlan
export interface SuccessPlan {
  id: string;
  customerId: string;
  title: string;
  description?: string;
  planType: SuccessPlanType;
  status: SuccessPlanStatus;
  startDate: Date;
  endDate?: Date;
  businessObjectives: string[];
  successMetrics?: Record<string, unknown>;
  baselineValue?: Record<string, unknown>;
  stakeholders?: Record<string, unknown>;
  notes?: string;
  milestones: SuccessPlanMilestone[];
  createdAt: Date;
  updatedAt: Date;
}

// SuccessPlanMilestone
export interface SuccessPlanMilestone {
  id: string;
  successPlanId: string;
  title: string;
  description?: string;
  dueDate: Date;
  completedDate?: Date;
  status: MilestoneStatus;
  owner?: string;
  priority: MilestonePriority;
  deliverables: string[];
  createdAt: Date;
  updatedAt: Date;
}

// HealthScore
export interface HealthScore {
  id: string;
  customerId: string;
  score: number;
  healthLevel: HealthLevel;
  engagementScore: number;
  successScore: number;
  satisfactionScore: number;
  financialScore: number;
  factors?: Record<string, unknown>;
  notes?: string;
  trend: HealthTrend;
  recordedAt: Date;
  recordedBy?: string;
}

// BusinessReview
export interface BusinessReview {
  id: string;
  customerId: string;
  reviewType: BusinessReviewType;
  reviewDate: Date;
  attendeeNames: string[];
  attendeeTitles: string[];
  agenda: string[];
  achievements: string[];
  challenges: string[];
  metricsReview?: Record<string, unknown>;
  goalsProgress?: Record<string, unknown>;
  decisions: string[];
  actionItems?: Record<string, unknown>;
  nextSteps: string[];
  overallRating?: number;
  customerFeedback?: string;
  presentationUrl?: string;
  notes?: string;
  followUpDate?: Date;
  createdAt: Date;
  updatedAt: Date;
}

// AdvocacyActivity
export interface AdvocacyActivity {
  id: string;
  customerId: string;
  activityType: AdvocacyType;
  title: string;
  description?: string;
  status: AdvocacyStatus;
  date?: Date;
  contactPerson?: string;
  contactEmail?: string;
  outcome?: string;
  value?: string;
  caseStudyUrl?: string;
  testimonialUrl?: string;
  referenceNotes?: string;
  createdAt: Date;
  updatedAt: Date;
}

// CustomerSuccessMetrics
export interface CustomerSuccessMetrics {
  id: string;
  customerId: string;
  period: string;
  periodType: PeriodType;
  leadVolume: number;
  conversionRate: number;
  revenueGenerated: number;
  costSavings: number;
  timeSavings?: number;
  activeUsers: number;
  totalUsers: number;
  loginFrequency: number;
  featureUsage?: Record<string, unknown>;
  nps?: number;
  csat?: number;
  ces?: number;
  supportTickets: number;
  ticketResolutionTime?: number;
  firstResponseTime?: number;
  calculatedAt: Date;
}

// Create Customer DTO
export interface CreateCustomerDto {
  leadId?: string;
  name: string;
  companyName?: string;
  email: string;
  phone?: string;
  industry?: string;
  businessType?: string;
  employeeCount?: number;
  annualRevenue?: number;
  website?: string;
  billingAddress?: string;
  billingCity?: string;
  billingState?: string;
  billingZipCode?: string;
  billingCountry?: string;
  tier?: CustomerTier;
  contractStartDate: Date;
  contractEndDate?: Date;
  annualContractValue?: number;
  tags?: string[];
  metadata?: Record<string, unknown>;
}

// Update Customer DTO
export interface UpdateCustomerDto {
  name?: string;
  companyName?: string;
  email?: string;
  phone?: string;
  industry?: string;
  businessType?: string;
  employeeCount?: number;
  annualRevenue?: number;
  website?: string;
  billingAddress?: string;
  billingCity?: string;
  billingState?: string;
  billingZipCode?: string;
  billingCountry?: string;
  tier?: CustomerTier;
  status?: CustomerStatus;
  contractEndDate?: Date;
  annualContractValue?: number;
  totalPolicies?: number;
  activePolicies?: number;
  lifetimeValue?: number;
  healthScore?: number;
  churnRiskLevel?: ChurnRiskLevel;
  lastContactDate?: Date;
  nextRenewalDate?: Date;
  preferredContactMethod?: string;
  tags?: string[];
  metadata?: Record<string, unknown>;
}

// Create SuccessPlan DTO
export interface CreateSuccessPlanDto {
  customerId: string;
  title: string;
  description?: string;
  planType?: SuccessPlanType;
  status?: SuccessPlanStatus;
  startDate: Date;
  endDate?: Date;
  businessObjectives: string[];
  successMetrics?: Record<string, unknown>;
  baselineValue?: Record<string, unknown>;
  stakeholders?: Record<string, unknown>;
  milestones?: Omit<SuccessPlanMilestone, 'id' | 'successPlanId' | 'createdAt' | 'updatedAt'>[];
  notes?: string;
}

// Update SuccessPlan DTO
export interface UpdateSuccessPlanDto {
  title?: string;
  description?: string;
  status?: SuccessPlanStatus;
  endDate?: Date;
  businessObjectives?: string[];
  successMetrics?: Record<string, unknown>;
  stakeholders?: Record<string, unknown>;
  notes?: string;
}

// Create HealthScore DTO
export interface CreateHealthScoreDto {
  customerId: string;
  score: number;
  engagementScore?: number;
  successScore?: number;
  satisfactionScore?: number;
  financialScore?: number;
  factors?: Record<string, unknown>;
  notes?: string;
  recordedBy?: string;
}

// Create BusinessReview DTO
export interface CreateBusinessReviewDto {
  customerId: string;
  reviewType: BusinessReviewType;
  reviewDate: Date;
  attendeeNames: string[];
  attendeeTitles: string[];
  agenda?: string[];
  achievements?: string[];
  challenges?: string[];
  metricsReview?: Record<string, unknown>;
  goalsProgress?: Record<string, unknown>;
  decisions?: string[];
  actionItems?: Record<string, unknown>;
  nextSteps?: string[];
  overallRating?: number;
  customerFeedback?: string;
  presentationUrl?: string;
  notes?: string;
  followUpDate?: Date;
}

// Create AdvocacyActivity DTO
export interface CreateAdvocacyActivityDto {
  customerId: string;
  activityType: AdvocacyType;
  title: string;
  description?: string;
  status?: AdvocacyStatus;
  date?: Date;
  contactPerson?: string;
  contactEmail?: string;
  outcome?: string;
  value?: string;
  caseStudyUrl?: string;
  testimonialUrl?: string;
  referenceNotes?: string;
}

// Health Score Calculation
export interface HealthScoreInput {
  engagementScore: number;
  successScore: number;
  satisfactionScore: number;
  financialScore: number;
}

export interface HealthScoreResult {
  totalScore: number;
  healthLevel: HealthLevel;
  engagementScore: number;
  successScore: number;
  satisfactionScore: number;
  financialScore: number;
  trend?: HealthTrend;
}

// Customer Filter Params
export interface CustomerFilterParams {
  tier?: CustomerTier | CustomerTier[];
  status?: CustomerStatus | CustomerStatus[];
  healthScoreMin?: number;
  healthScoreMax?: number;
  churnRiskLevel?: ChurnRiskLevel | ChurnRiskLevel[];
  csmId?: string;
  onboardingStatus?: OnboardingStatus;
  search?: string;
  customerSinceFrom?: Date;
  customerSinceTo?: Date;
  contractRenewalFrom?: Date;
  contractRenewalTo?: Date;
  tags?: string[];
  page?: number;
  limit?: number;
}

// Business Review Filter Params
export interface BusinessReviewFilterParams {
  customerId?: string;
  reviewType?: BusinessReviewType | BusinessReviewType[];
  reviewDateFrom?: Date;
  reviewDateTo?: Date;
  page?: number;
  limit?: number;
}

// Advocacy Activity Filter Params
export interface AdvocacyActivityFilterParams {
  customerId?: string;
  activityType?: AdvocacyType | AdvocacyType[];
  status?: AdvocacyStatus | AdvocacyStatus[];
  dateFrom?: Date;
  dateTo?: Date;
  page?: number;
  limit?: number;
}

// Customer Statistics
export interface CustomerStatistics {
  totalCustomers: number;
  customersByTier: Record<CustomerTier, number>;
  customersByStatus: Record<CustomerStatus, number>;
  averageHealthScore: number;
  totalAnnualRevenue: number;
  totalLifetimeValue: number;
  atRiskCustomers: number;
  churnedCustomers: number;
  customersOnboarding: number;
  averageAdoptionRate: number;
  averageNPS: number;
  averageCSAT: number;
}

// Health Score Alert
export interface HealthScoreAlert {
  customerId: string;
  customerName: string;
  currentScore: number;
  previousScore: number;
  healthLevel: HealthLevel;
  trend: HealthTrend;
  alertType: 'SIGNIFICANT_DROP' | 'BELOW_THRESHOLD' | 'RED_ZONE';
  timestamp: Date;
  csmId?: string;
  csmEmail?: string;
}

// Onboarding Metrics
export interface OnboardingMetrics {
  totalOnboarding: number;
  completedOnboarding: number;
  averageTimeToValue: number;
  averageOnboardingDuration: number;
  trainingCompletionRate: number;
  onboardingSuccessRate: number;
}

// Advocacy Metrics
export interface AdvocacyMetrics {
  totalAdvocates: number;
  caseStudiesPublished: number;
  testimonialsCollected: number;
  referenceCallsCompleted: number;
  advocacyActivitiesInProgress: number;
  advocacySuccessRate: number;
}

// Expansion Opportunities
export interface ExpansionOpportunity {
  customerId: string;
  customerName: string;
  currentTier: CustomerTier;
  potentialTier: CustomerTier;
  reason: string;
  estimatedAdditionalRevenue: number;
  probability: number;
  suggestedActions: string[];
  lastReviewed: Date;
}
