/**
 * Phase 30: Partner Ecosystem & Integrations
 * Type definitions for the partner ecosystem
 */

// ============================================================================
// Partner Types
// ============================================================================

export enum PartnerType {
  TECHNOLOGY = 'TECHNOLOGY',     // SaaS platforms, software providers
  SERVICE = 'SERVICE',           // Integration services, consulting
  DATA = 'DATA',                 // Data providers, enrichment services
  CHANNEL = 'CHANNEL',           // Resellers, referral partners
  STRATEGIC = 'STRATEGIC',       // Co-marketing, OEM partners
  VERIFICATION = 'VERIFICATION', // Compliance, security, industry partners
}

export enum PartnerStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  SUSPENDED = 'SUSPENDED',
  PENDING = 'PENDING',
}

export enum PartnerTier {
  BASIC = 'BASIC',
  PREMIUM = 'PREMIUM',
  ENTERPRISE = 'ENTERPRISE',
}

export interface Partner {
  id: string;
  organizationId?: string;
  partnerName: string;
  description?: string;
  partnerType: PartnerType;
  website?: string;
  logoUrl?: string;
  status: PartnerStatus;
  tier: PartnerTier;
  createdAt: Date;
  updatedAt: Date;
}

export interface PartnerContact {
  id: string;
  partnerId: string;
  contactName: string;
  email: string;
  phone?: string;
  role?: string;
  isPrimary: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export enum AgreementStatus {
  DRAFT = 'DRAFT',
  SIGNED = 'SIGNED',
  EXPIRED = 'EXPIRED',
  TERMINATED = 'TERMINATED',
}

export interface PartnerAgreement {
  id: string;
  partnerId: string;
  agreementType: string;
  signedDate?: Date;
  effectiveDate: Date;
  expirationDate?: Date;
  terms?: Record<string, any>;
  documentUrl?: string;
  status: AgreementStatus;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================================================
// Application Types
// ============================================================================

export enum ApplicationStatus {
  DRAFT = 'DRAFT',
  SUBMITTED = 'SUBMITTED',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  PUBLISHED = 'PUBLISHED',
  SUSPENDED = 'SUSPENDED',
  DEPRECATED = 'DEPRECATED',
}

export interface PartnerApplication {
  id: string;
  partnerId: string;
  appName: string;
  description?: string;
  appVersion: string;
  status: ApplicationStatus;
  permissions?: string[];
  dataAccess?: Record<string, any>;
  securityInfo?: Record<string, any>;
  approvalStatus?: string;
  submittedDate?: Date;
  approvedDate?: Date;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================================================
// API Key & OAuth Types
// ============================================================================

export enum ApiKeyStatus {
  ACTIVE = 'ACTIVE',
  ROTATED = 'ROTATED',
  REVOKED = 'REVOKED',
  EXPIRED = 'EXPIRED',
}

export interface ApiKey {
  id: string;
  partnerId: string;
  appId?: string;
  keyValue: string;  // Hashed
  keyPrefix: string; // First 8 chars for identification
  scopes?: string[];
  rateLimit: number;
  lastUsedAt?: Date;
  expiresAt?: Date;
  status: ApiKeyStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface ApiKeyCreateRequest {
  appId?: string;
  scopes?: string[];
  rateLimit?: number;
  expiresAt?: Date;
}

export interface ApiKeyResponse {
  id: string;
  keyPrefix: string;
  fullKey?: string; // Only returned on creation
  scopes?: string[];
  rateLimit: number;
  expiresAt?: Date;
  status: ApiKeyStatus;
  createdAt: Date;
}

export enum OAuthClientStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
}

export interface OAuthClient {
  id: string;
  partnerId: string;
  appId: string;
  clientId: string;
  clientSecret: string; // Hashed
  redirectUris: string[];
  allowedFlows: string[];
  tokenLifetime: number;
  refreshTokenLifetime: number;
  status: OAuthClientStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface OAuthToken {
  id: string;
  clientId: string;
  userId?: string;
  tokenType: string;
  accessToken: string;
  refreshToken?: string;
  scopes?: string[];
  expiresAt: Date;
  refreshExpiresAt?: Date;
  revoked: boolean;
  createdAt: Date;
}

export interface OAuthAuthorizationRequest {
  responseType: 'code' | 'token';
  clientId: string;
  redirectUri: string;
  scope?: string;
  state?: string;
}

export interface OAuthTokenRequest {
  grantType: 'authorization_code' | 'client_credentials' | 'refresh_token';
  code?: string;
  clientId: string;
  clientSecret: string;
  redirectUri?: string;
  refreshToken?: string;
  scope?: string;
}

export interface OAuthTokenResponse {
  accessToken: string;
  tokenType: string;
  expiresIn: number;
  refreshToken?: string;
  scope?: string;
}

// ============================================================================
// Integration Types
// ============================================================================

export enum IntegrationStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  ERROR = 'ERROR',
  MAINTENANCE = 'MAINTENANCE',
}

export interface Integration {
  id: string;
  partnerId: string;
  appId: string;
  organizationId?: string;
  integrationName: string;
  integrationType: string;
  status: IntegrationStatus;
  lastHealthCheck?: Date;
  healthStatus?: string;
  config?: Record<string, any>;
  apiKeyId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface IntegrationMapping {
  id: string;
  integrationId: string;
  sourceField: string;
  targetField: string;
  transformation?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface IntegrationHealthStatus {
  integrationId: string;
  status: IntegrationStatus;
  lastCheck: Date;
  uptime: number; // percentage
  errorRate: number; // percentage
  avgResponseTime: number; // milliseconds
  issues: string[];
}

// ============================================================================
// Event & Webhook Types
// ============================================================================

export interface EventType {
  id: string;
  eventName: string;
  description?: string;
  eventCategory: string;
  payloadSchema?: Record<string, any>;
  version: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface PlatformEvent {
  id: string;
  eventTypeId: string;
  organizationId?: string;
  entityType: string;
  entityId: string;
  payload: Record<string, any>;
  createdAt: Date;
}

export enum WebhookDeliveryStatus {
  PENDING = 'PENDING',
  DELIVERED = 'DELIVERED',
  FAILED = 'FAILED',
}

export interface WebhookEndpoint {
  id: string;
  integrationId: string;
  endpointUrl: string;
  webhookSecret: string; // Hashed
  subscribedEvents: string[];
  active: boolean;
  testMode: boolean;
  lastTestedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface WebhookDelivery {
  id: string;
  webhookId: string;
  eventId: string;
  payload: Record<string, any>;
  attemptNumber: number;
  status: WebhookDeliveryStatus;
  responseStatus?: number;
  responseBody?: string;
  nextRetryAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface WebhookPayload {
  id: string;
  event: string;
  timestamp: string;
  data: Record<string, any>;
  signature: string;
}

// ============================================================================
// Usage & Billing Types
// ============================================================================

export interface PartnerUsage {
  id: string;
  partnerId: string;
  appId?: string;
  usageDate: Date;
  metricName: string;
  metricValue: bigint;
  unit: string;
  createdAt: Date;
}

export enum PricingModel {
  REVENUE_SHARE = 'REVENUE_SHARE',
  FLAT_FEE = 'FLAT_FEE',
  USAGE_BASED = 'USAGE_BASED',
  HYBRID = 'HYBRID',
}

export interface UsageTier {
  minUsage: number;
  maxUsage?: number;
  pricePerUnit: number;
}

export interface PartnerPricing {
  id: string;
  partnerId: string;
  pricingModel: PricingModel;
  revenueSharePercentage?: number;
  flatFeeMonthly?: number;
  flatFeeAnnual?: number;
  usageTiers?: UsageTier[];
  currency: string;
  effectiveDate: Date;
  expirationDate?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export enum InvoiceStatus {
  DRAFT = 'DRAFT',
  SENT = 'SENT',
  PAID = 'PAID',
  OVERDUE = 'OVERDUE',
}

export interface PartnerInvoice {
  id: string;
  partnerId: string;
  billingPeriodStart: Date;
  billingPeriodEnd: Date;
  usage?: Record<string, any>;
  subtotal: number;
  taxes: number;
  totalAmount: number;
  status: InvoiceStatus;
  dueDate: Date;
  paymentDate?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export enum PayoutStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
}

export interface PartnerPayout {
  id: string;
  partnerId: string;
  payoutPeriodStart: Date;
  payoutPeriodEnd: Date;
  totalRevenue: number;
  revenueShareAmount: number;
  deductions: number;
  netPayout: number;
  status: PayoutStatus;
  paymentMethodId?: string;
  paidDate?: Date;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================================================
// Analytics & Monitoring Types
// ============================================================================

export interface IntegrationMetric {
  id: string;
  integrationId: string;
  timestamp: Date;
  apiCalls: number;
  errorCount: number;
  avgResponseTime: number;
  uptimePercentage: number;
  dataProcessedBytes: bigint;
  createdAt: Date;
}

export interface IntegrationError {
  id: string;
  integrationId: string;
  errorCode: string;
  errorMessage: string;
  stackTrace?: string;
  requestDetails?: Record<string, any>;
  responseDetails?: Record<string, any>;
  occurrenceCount: number;
  firstOccurrence: Date;
  lastOccurrence: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface PartnerAnalytics {
  partnerId: string;
  period: {
    start: Date;
    end: Date;
  };
  metrics: {
    totalApiCalls: number;
    totalDataProcessed: bigint;
    averageResponseTime: number;
    errorRate: number;
    uptime: number;
  };
  revenue: {
    totalRevenue: number;
    revenueShare: number;
    netPayout: number;
  };
  usage: {
    activeIntegrations: number;
    activeApplications: number;
    totalUsers: number;
  };
}

// ============================================================================
// Support Types
// ============================================================================

export enum TicketPriority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

export enum TicketStatus {
  OPEN = 'OPEN',
  IN_PROGRESS = 'IN_PROGRESS',
  PENDING = 'PENDING',
  RESOLVED = 'RESOLVED',
  CLOSED = 'CLOSED',
}

export interface SupportTicket {
  id: string;
  partnerId: string;
  appId?: string;
  title: string;
  description: string;
  priority: TicketPriority;
  status: TicketStatus;
  category?: string;
  assignedToId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface TicketComment {
  id: string;
  ticketId: string;
  commenterId: string;
  comment: string;
  attachments?: Record<string, any>;
  createdAt: Date;
}

// ============================================================================
// Marketplace Types
// ============================================================================

export enum ListingStatus {
  DRAFT = 'DRAFT',
  PUBLISHED = 'PUBLISHED',
  REMOVED = 'REMOVED',
  ARCHIVED = 'ARCHIVED',
}

export interface MarketplaceListing {
  id: string;
  appId: string;
  listingTitle: string;
  listingDescription: string;
  shortDescription?: string;
  categories: string[];
  features?: string[];
  documentationUrl?: string;
  supportUrl?: string;
  pricingInfo?: string;
  averageRating: number;
  reviewCount: number;
  downloads: number;
  status: ListingStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface MarketplaceReview {
  id: string;
  listingId: string;
  reviewerId: string;
  rating: number;
  reviewText?: string;
  helpfulCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface MarketplaceSearchFilters {
  query?: string;
  categories?: string[];
  minRating?: number;
  partnerType?: PartnerType;
  status?: ListingStatus;
  sortBy?: 'rating' | 'downloads' | 'recent' | 'alphabetical';
}

// ============================================================================
// Request/Response Types
// ============================================================================

export interface CreatePartnerRequest {
  partnerName: string;
  description?: string;
  partnerType: PartnerType;
  website?: string;
  tier?: PartnerTier;
  contacts: {
    contactName: string;
    email: string;
    phone?: string;
    role?: string;
    isPrimary?: boolean;
  }[];
}

export interface UpdatePartnerRequest {
  partnerName?: string;
  description?: string;
  website?: string;
  logoUrl?: string;
  status?: PartnerStatus;
  tier?: PartnerTier;
}

export interface CreateApplicationRequest {
  appName: string;
  description?: string;
  permissions?: string[];
  dataAccess?: Record<string, any>;
  securityInfo?: Record<string, any>;
}

export interface SubmitApplicationRequest {
  securityCertifications?: string[];
  complianceDocuments?: string[];
  testResults?: Record<string, any>;
}

export interface CreateIntegrationRequest {
  appId: string;
  integrationName: string;
  integrationType: string;
  config?: Record<string, any>;
  mappings?: Array<{
    sourceField: string;
    targetField: string;
    transformation?: Record<string, any>;
  }>;
}

export interface CreateWebhookRequest {
  integrationId: string;
  endpointUrl: string;
  subscribedEvents: string[];
  testMode?: boolean;
}

export interface TestWebhookRequest {
  eventType: string;
  payload?: Record<string, any>;
}

export interface CreateSupportTicketRequest {
  appId?: string;
  title: string;
  description: string;
  priority?: TicketPriority;
  category?: string;
}

export interface RateLimitInfo {
  limit: number;
  remaining: number;
  reset: Date;
  retryAfter?: number;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  rateLimit?: RateLimitInfo;
}

// ============================================================================
// Scope & Permission Types
// ============================================================================

export enum ApiScope {
  // Read scopes
  READ_LEADS = 'read:leads',
  READ_AGENTS = 'read:agents',
  READ_POLICIES = 'read:policies',
  READ_CLAIMS = 'read:claims',
  READ_ANALYTICS = 'read:analytics',
  
  // Write scopes
  WRITE_LEADS = 'write:leads',
  WRITE_AGENTS = 'write:agents',
  WRITE_POLICIES = 'write:policies',
  WRITE_CLAIMS = 'write:claims',
  
  // Webhook scopes
  MANAGE_WEBHOOKS = 'manage:webhooks',
  
  // Admin scopes
  ADMIN = 'admin',
}

export interface ScopePermission {
  scope: ApiScope;
  description: string;
  requiresApproval: boolean;
  tier: PartnerTier[];
}
