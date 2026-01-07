// ========================================
// FINANCIAL SERVICES TYPES
// ========================================

// ========================================
// FINANCIAL PRODUCTS
// ========================================

export type ProductType = 'BANKING' | 'INVESTMENT' | 'INSURANCE' | 'RETIREMENT' | 'WEALTH';
export type ProductStatus = 'ACTIVE' | 'INACTIVE' | 'ARCHIVED';
export type ApplicationStatus = 'DRAFT' | 'SUBMITTED' | 'UNDER_REVIEW' | 'APPROVED' | 'DECLINED' | 'ENROLLED';
export type CustomerProductStatus = 'ACTIVE' | 'INACTIVE' | 'CLOSED';

export interface FinancialProduct {
  id: string;
  organizationId?: string;
  productName: string;
  productType: ProductType;
  providerId: string;
  description?: string;
  category: string;
  subcategory?: string;
  status: ProductStatus;
  minInvestment?: number;
  maxInvestment?: number;
  fees?: Record<string, unknown>;
  terms?: Record<string, unknown>;
  regulatoryClassification?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export interface ProductVariant {
  id: string;
  productId: string;
  variantName: string;
  variantCode?: string;
  tierLevel?: number;
  features?: Record<string, unknown>;
  pricing?: Record<string, unknown>;
  requirements?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

// ========================================
// FINANCIAL ADVISORS
// ========================================

export type AdvisorStatus = 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
export type LicenseType = string;

export interface FinancialAdvisor {
  id: string;
  organizationId?: string;
  userId?: string;
  licenseNumber: string;
  licenseType: LicenseType[];
  specializations: string[];
  credentials?: {
    certifications?: string[];
    education?: string[];
    yearsExperience?: number;
  };
  maxClients: number;
  currentClients: number;
  aum?: number;
  status: AdvisorStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface AdvisorAvailability {
  advisorId: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  isAvailable: boolean;
}

export interface AdvisorPerformance {
  advisorId: string;
  month: number;
  year: number;
  clientsServed: number;
  revenueGenerated: number;
  customerSatisfaction: number;
  planCompletions: number;
  createdAt: Date;
}

// ========================================
// FINANCIAL PLANNING
// ========================================

export type PlanStatus = 'DRAFT' | 'IN_PROGRESS' | 'COMPLETED' | 'ARCHIVED';
export type GoalStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'ON_TRACK' | 'AT_RISK' | 'COMPLETED';

export interface FinancialPlan {
  id: string;
  customerId: string;
  advisorId?: string;
  planType?: string;
  status: PlanStatus;
  creationDate?: Date;
  lastReviewDate?: Date;
  nextReviewDate?: Date;
  planDocumentUrl?: string;
  recommendations?: Array<{
    recommendationType: string;
    description: string;
    priority: number;
    dueDate?: Date;
  }>;
  goals?: Array<{
    goalId: string;
    goalName: string;
    targetAmount: number;
    targetDate?: Date;
  }>;
  createdAt: Date;
  updatedAt: Date;
}

export interface FinancialGoal {
  id: string;
  customerId: string;
  goalType?: string;
  goalDescription?: string;
  targetAmount?: number;
  targetDate?: Date;
  currentProgress: number;
  priorityLevel: number;
  status: GoalStatus;
  createdAt: Date;
  updatedAt: Date;
}

// ========================================
// WEALTH MANAGEMENT
// ========================================

export type PortfolioType = 'MODEL' | 'ROBO' | 'DIRECT' | 'MANAGED';
export type PortfolioStatus = 'ACTIVE' | 'INACTIVE' | 'ARCHIVED';
export type AccountType = 
  | 'AUTO' 
  | 'HOME' 
  | 'LIFE' 
  | 'HEALTH' 
  | 'COMMERCIAL'
  | 'CHECKING'
  | 'SAVINGS'
  | 'MONEY_MARKET'
  | 'CD'
  | 'BROKERAGE'
  | 'IRA'
  | '401K'
  | '529'
  | 'TRUST';

export interface CustomerAccount {
  id: string;
  customerId: string;
  accountName?: string;
  accountType?: AccountType;
  externalAccountId?: string;
  institutionName?: string;
  balance: number;
  currency: string;
  isAggregated: boolean;
  aggregationSource?: string;
  lastSyncedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface Portfolio {
  id: string;
  customerId: string;
  portfolioName?: string;
  portfolioType?: PortfolioType;
  status: PortfolioStatus;
  totalValue: number;
  cashPosition: number;
  targetAllocation?: Record<string, number>;
  actualAllocation?: Record<string, number>;
  performanceYtd?: number;
  performance1yr?: number;
  riskScore?: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface PortfolioHolding {
  id: string;
  portfolioId: string;
  securityId?: string;
  symbol?: string;
  quantity?: number;
  costBasis?: number;
  currentValue: number;
  purchaseDate?: Date;
  unrealizedGainLoss?: number;
  allocationPercentage?: number;
  createdAt: Date;
  updatedAt: Date;
}

// ========================================
// OPEN BANKING & DATA AGGREGATION
// ========================================

export interface LinkedAccount {
  id: string;
  customerId: string;
  externalAccountId?: string;
  externalInstitutionId?: string;
  institutionName?: string;
  accountType?: AccountType;
  accountNumberMasked?: string;
  routingNumber?: string;
  balance: number;
  currency: string;
  isActive: boolean;
  lastSyncedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface FinancialTransaction {
  id: string;
  customerId: string;
  accountId?: string;
  transactionDate: Date;
  transactionType?: string;
  category?: string;
  amount: number;
  merchant?: string;
  description?: string;
  transactionIdExternal?: string;
  createdAt: Date;
}

export interface SpendingAnalytics {
  id: string;
  customerId: string;
  periodMonth: Date;
  totalSpending?: number;
  categoryBreakdown?: Record<string, number>;
  incomeTotal?: number;
  savingsRate?: number;
  debtPayments?: number;
  createdAt: Date;
}

// ========================================
// PRODUCT APPLICATIONS
// ========================================

export interface ProductApplication {
  id: string;
  customerId: string;
  productId?: string;
  variantId?: string;
  advisorId?: string;
  applicationDate: Date;
  status: ApplicationStatus;
  applicationData?: Record<string, unknown>;
  documents?: Array<{
    documentId: string;
    documentType: string;
    documentUrl: string;
    uploadedAt: Date;
  }>;
  approvedDate?: Date;
  enrollmentDate?: Date;
  decisionReason?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CustomerProduct {
  id: string;
  customerId: string;
  productId?: string;
  variantId?: string;
  enrollmentDate?: Date;
  accountNumber?: string;
  status: CustomerProductStatus;
  balance?: number;
  currentValue?: number;
  performance?: number;
  lastStatementDate?: Date;
  createdAt: Date;
  updatedAt: Date;
}

// ========================================
// RECOMMENDATIONS
// ========================================

export interface ProductRecommendation {
  id: string;
  customerId: string;
  productId?: string;
  recommendationType?: string;
  confidenceScore?: number;
  reason?: string;
  recommendedDate: Date;
  viewed: boolean;
  clicked: boolean;
  applied: boolean;
  createdAt: Date;
}

export interface RecommendationEngineConfig {
  modelType: string;
  minConfidence: number;
  maxRecommendations: number;
  enabled: boolean;
}

// ========================================
// FINANCIAL WELLNESS
// ========================================

export type WellnessStatus = 'ACTIVE' | 'INACTIVE' | 'COMPLETED';

export interface WellnessProgram {
  id: string;
  organizationId?: string;
  programName: string;
  description?: string;
  programType?: string;
  targetSegments?: Record<string, unknown>;
  status: WellnessStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface WellnessEnrollment {
  id: string;
  customerId: string;
  programId: string;
  enrollmentDate: Date;
  completionStatus?: number;
  score?: number;
  status: WellnessStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface WellnessActivity {
  id: string;
  enrollmentId: string;
  activityType?: string;
  activityName?: string;
  completedDate?: Date;
  pointsEarned: number;
  createdAt: Date;
}

// ========================================
// COMPLIANCE & REGULATORY
// ========================================

export type AuditActionType = 'CREATE' | 'UPDATE' | 'DELETE' | 'VIEW' | 'EXPORT';
export type EntityType = 'USER' | 'LEAD' | 'AGENT' | 'CUSTOMER' | 'ACCOUNT' | 'PRODUCT' | 'ADVISOR';

export interface ComplianceDocument {
  id: string;
  organizationId?: string;
  documentType?: string;
  documentVersion: number;
  effectiveDate?: Date;
  documentUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface AuditLog {
  id: string;
  organizationId?: string;
  userId?: string;
  actionType?: AuditActionType;
  entityType?: EntityType;
  entityId?: string;
  changes?: Record<string, unknown>;
  timestamp: Date;
  ipAddress?: string;
  createdAt: Date;
}

// ========================================
// PARTNERSHIPS & COMMISSIONS
// ========================================

export type PartnerStatus = 'ACTIVE' | 'INACTIVE';
export type CommissionStatus = 'PENDING' | 'EARNED' | 'PAID';

export interface FinancialPartner {
  id: string;
  organizationId?: string;
  partnerName: string;
  partnerType?: string;
  status: PartnerStatus;
  agreementDate?: Date;
  terms?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export interface CommissionTracking {
  id: string;
  partnerId: string;
  productId?: string;
  customerId?: string;
  applicationId?: string;
  commissionAmount?: number;
  commissionPercentage?: number;
  status: CommissionStatus;
  paymentDate?: Date;
  createdAt: Date;
}

// ========================================
// FINANCIAL ANALYTICS & INSIGHTS
// ========================================

export interface FinancialAnalytics {
  id: string;
  customerId: string;
  analysisDate: Date;
  netWorth?: number;
  assetAllocation?: Record<string, number>;
  debtToIncomeRatio?: number;
  savingsRate?: number;
  financialHealthScore?: number;
  riskProfile?: string;
  createdAt: Date;
}

export interface FinancialHealthScore {
  totalScore: number;
  categories: {
    savings: number;
    debt: number;
    spending: number;
    income: number;
    insurance: number;
  };
  recommendations: string[];
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
}

// ========================================
// REQUEST/RESPONSE TYPES
// ========================================

export interface CreateFinancialProductRequest {
  productName: string;
  productType: ProductType;
  providerId: string;
  description?: string;
  category: string;
  subcategory?: string;
  minInvestment?: number;
  maxInvestment?: number;
  fees?: Record<string, unknown>;
  terms?: Record<string, unknown>;
  regulatoryClassification?: Record<string, unknown>;
}

export interface CreateAdvisorRequest {
  userId?: string;
  licenseNumber: string;
  licenseType: LicenseType[];
  specializations: string[];
  credentials?: {
    certifications?: string[];
    education?: string[];
    yearsExperience?: number;
  };
  maxClients?: number;
}

export interface CreateFinancialPlanRequest {
  customerId: string;
  advisorId?: string;
  planType?: string;
  goals?: Array<{
    goalId: string;
    goalName: string;
    targetAmount: number;
    targetDate?: Date;
  }>;
}

export interface LinkAccountRequest {
  customerId: string;
  institutionName: string;
  accountType: AccountType;
  externalAccountId: string;
  externalInstitutionId?: string;
  accountNumber?: string;
  routingNumber?: string;
  balance: number;
  currency?: string;
}

export interface SubmitApplicationRequest {
  customerId: string;
  productId: string;
  variantId?: string;
  advisorId?: string;
  applicationData?: Record<string, unknown>;
  documents?: Array<{
    documentType: string;
    documentUrl: string;
  }>;
}

export interface CreateWellnessProgramRequest {
  programName: string;
  description?: string;
  programType?: string;
  targetSegments?: Record<string, unknown>;
}

export interface FinancialHealthAssessmentRequest {
  customerId: string;
  includeRecommendations?: boolean;
  assessmentDate?: Date;
}