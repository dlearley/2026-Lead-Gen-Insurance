// ========================================
// API ECOSYSTEM TYPES
// ========================================

// API Client Types
export type ApiClientStatus = 'active' | 'suspended' | 'revoked' | 'pending_verification';
export type ApiKeyStatus = 'active' | 'suspended' | 'revoked' | 'expired';
export type WebhookStatus = 'active' | 'paused' | 'disabled';
export type DeliveryStatus = 'pending' | 'delivered' | 'failed' | 'retrying' | 'max_retries_exceeded';
export type RateLimitTier = 'basic' | 'standard' | 'premium' | 'enterprise';

export interface ApiClient {
  id: string;
  name: string;
  description?: string;
  redirectUris: string[];
  website?: string;
  logoUrl?: string;
  contactEmail: string;
  status: ApiClientStatus;
  rateLimitTier: RateLimitTier;
  webhookUrl?: string;
  webhookSecret?: string;
  scopes: string[];
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
  apiKeys?: ApiKey[];
  webhookSubscriptions?: WebhookSubscription[];
  apiUsageStats?: ApiUsageStats;
}

export interface CreateApiClientDto {
  name: string;
  description?: string;
  redirectUris: string[];
  website?: string;
  logoUrl?: string;
  contactEmail: string;
  rateLimitTier?: RateLimitTier;
  webhookUrl?: string;
  scopes?: string[];
  metadata?: Record<string, unknown>;
}

export interface UpdateApiClientDto {
  name?: string;
  description?: string;
  redirectUris?: string[];
  website?: string;
  logoUrl?: string;
  contactEmail?: string;
  status?: ApiClientStatus;
  rateLimitTier?: RateLimitTier;
  webhookUrl?: string;
  scopes?: string[];
  metadata?: Record<string, unknown>;
}

export interface ApiKey {
  id: string;
  clientId: string;
  keyId: string;
  keyPrefix: string;
  name: string;
  status: ApiKeyStatus;
  lastUsedAt?: Date;
  expiresAt?: Date;
  scopes: string[];
  rateLimitOverride?: number;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
  apiClient?: ApiClient;
}

export interface CreateApiKeyDto {
  clientId: string;
  name: string;
  expiresAt?: Date;
  scopes?: string[];
  rateLimitOverride?: number;
  metadata?: Record<string, unknown>;
}

export interface ApiKeyResponse {
  id: string;
  keyId: string;
  keyPrefix: string;
  key: string; // Only returned on creation
  name: string;
  status: ApiKeyStatus;
  expiresAt?: Date;
  scopes: string[];
  createdAt: Date;
}

// Webhook Subscription Types
export interface WebhookSubscription {
  id: string;
  clientId: string;
  url: string;
  secret: string;
  events: string[];
  status: WebhookStatus;
  retryConfig?: WebhookRetryConfig;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
  apiClient?: ApiClient;
  deliveries?: WebhookDelivery[];
}

export interface CreateWebhookSubscriptionDto {
  url: string;
  events: string[];
  retryConfig?: WebhookRetryConfig;
  metadata?: Record<string, unknown>;
}

export interface UpdateWebhookSubscriptionDto {
  url?: string;
  events?: string[];
  status?: WebhookStatus;
  retryConfig?: WebhookRetryConfig;
  metadata?: Record<string, unknown>;
}

export interface WebhookRetryConfig {
  maxRetries: number;
  retryDelay: number; // in seconds
  backoffMultiplier: number;
  timeout: number; // in seconds
}

export interface WebhookDelivery {
  id: string;
  subscriptionId: string;
  eventType: string;
  payload: Record<string, unknown>;
  responseCode?: number;
  responseBody?: string;
  attemptCount: number;
  status: DeliveryStatus;
  scheduledFor: Date;
  deliveredAt?: Date;
  nextRetryAt?: Date;
  errorMessage?: string;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
  subscription?: WebhookSubscription;
}

// API Usage Types
export interface ApiUsageLog {
  id: string;
  clientId: string;
  apiKeyId?: string;
  endpoint: string;
  method: string;
  statusCode: number;
  responseTimeMs: number;
  requestIp?: string;
  userAgent?: string;
  requestSize?: number;
  responseSize?: number;
  timestamp: Date;
}

export interface ApiUsageStats {
  clientId: string;
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageResponseTime: number;
  totalErrors: number;
  errorRate: number;
  requestsByEndpoint: Array<{
    endpoint: string;
    count: number;
    averageResponseTime: number;
  }>;
  requestsByHour: Array<{
    hour: string;
    count: number;
  }>;
  topErrorCodes: Array<{
    statusCode: number;
    count: number;
  }>;
}

export interface ApiUsageFilterParams {
  clientId?: string;
  endpoint?: string;
  method?: string;
  statusCode?: number;
  dateFrom?: Date;
  dateTo?: Date;
  groupBy?: 'hour' | 'day' | 'week';
  page?: number;
  limit?: number;
}

// Rate Limit Types
export interface TierRateLimitConfig {
  tier: RateLimitTier;
  requestsPerMinute: number;
  requestsPerHour: number;
  requestsPerDay: number;
  burstLimit: number;
}

export const RATE_LIMIT_TIERS: Record<RateLimitTier, TierRateLimitConfig> = {
  basic: {
    tier: 'basic',
    requestsPerMinute: 60,
    requestsPerHour: 1000,
    requestsPerDay: 10000,
    burstLimit: 10,
  },
  standard: {
    tier: 'standard',
    requestsPerMinute: 120,
    requestsPerHour: 5000,
    requestsPerDay: 50000,
    burstLimit: 20,
  },
  premium: {
    tier: 'premium',
    requestsPerMinute: 300,
    requestsPerHour: 15000,
    requestsPerDay: 150000,
    burstLimit: 50,
  },
  enterprise: {
    tier: 'enterprise',
    requestsPerMinute: 600,
    requestsPerHour: 50000,
    requestsPerDay: 500000,
    burstLimit: 100,
  },
};

export interface ApiRateLimit {
  id: string;
  clientId: string;
  window: string; // '1m', '1h', '1d'
  requestCount: number;
  requestLimit: number;
  resetAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

// API Scope Types
export const API_SCOPES = {
  LEADS_READ: 'leads:read',
  LEADS_WRITE: 'leads:write',
  LEADS_DELETE: 'leads:delete',
  AGENTS_READ: 'agents:read',
  AGENTS_WRITE: 'agents:write',
  POLICIES_READ: 'policies:read',
  POLICIES_WRITE: 'policies:write',
  WEBHOOKS_READ: 'webhooks:read',
  WEBHOOKS_WRITE: 'webhooks:write',
  ANALYTICS_READ: 'analytics:read',
  CUSTOMERS_READ: 'customers:read',
  CUSTOMERS_WRITE: 'customers:write',
  QUOTES_READ: 'quotes:read',
  QUOTES_WRITE: 'quotes:write',
  PROPOSALS_READ: 'proposals:read',
  PROPOSALS_WRITE: 'proposals:write',
} as const;

export type ApiScope = (typeof API_SCOPES)[keyof typeof API_SCOPES];

// OAuth Types
export interface OAuthAuthorizationRequest {
  clientId: string;
  redirectUri: string;
  responseType: 'code';
  scope: string[];
  state?: string;
}

export interface OAuthAuthorizationResponse {
  code: string;
  state?: string;
}

export interface OAuthTokenRequest {
  grantType: 'authorization_code' | 'refresh_token' | 'client_credentials';
  code?: string;
  redirectUri?: string;
  refreshToken?: string;
  clientId?: string;
  clientSecret?: string;
}

export interface OAuthTokenResponse {
  accessToken: string;
  tokenType: 'Bearer';
  expiresIn: number;
  refreshToken?: string;
  scope: string[];
}

export interface OAuthErrorResponse {
  error: string;
  error_description?: string;
}

// Webhook Event Types
export interface WebhookEventPayload {
  id: string;
  eventType: string;
  timestamp: Date;
  data: Record<string, unknown>;
  version: string;
}

export type WebhookEventType =
  | 'lead.created'
  | 'lead.updated'
  | 'lead.qualified'
  | 'lead.converted'
  | 'lead.rejected'
  | 'assignment.created'
  | 'assignment.accepted'
  | 'assignment.rejected'
  | 'policy.created'
  | 'policy.updated'
  | 'policy.activated'
  | 'policy.cancelled'
  | 'quote.created'
  | 'quote.sent'
  | 'quote.accepted'
  | 'quote.rejected'
  | 'proposal.created'
  | 'proposal.sent'
  | 'proposal.accepted'
  | 'proposal.rejected';

export const WEBHOOK_EVENT_TYPES: WebhookEventType[] = [
  'lead.created',
  'lead.updated',
  'lead.qualified',
  'lead.converted',
  'lead.rejected',
  'assignment.created',
  'assignment.accepted',
  'assignment.rejected',
  'policy.created',
  'policy.updated',
  'policy.activated',
  'policy.cancelled',
  'quote.created',
  'quote.sent',
  'quote.accepted',
  'quote.rejected',
  'proposal.created',
  'proposal.sent',
  'proposal.accepted',
  'proposal.rejected',
];

// Filter & Pagination Types
export interface ApiFilterParams {
  status?: ApiClientStatus | ApiClientStatus[];
  rateLimitTier?: RateLimitTier | RateLimitTier[];
  contactEmail?: string;
  search?: string;
  dateFrom?: Date;
  dateTo?: Date;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface ApiKeyFilterParams {
  clientId?: string;
  status?: ApiKeyStatus | ApiKeyStatus[];
  search?: string;
  page?: number;
  limit?: number;
}

export interface WebhookFilterParams {
  clientId?: string;
  status?: WebhookStatus | WebhookStatus[];
  eventType?: string;
  page?: number;
  limit?: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrevious: boolean;
}

// API Client Dashboard Types
export interface ApiClientDashboard {
  client: ApiClient;
  usageStats: ApiUsageStats;
  activeWebhooks: number;
  totalWebhooks: number;
  recentActivity: ApiUsageLog[];
  rateLimitStatus: {
    tier: RateLimitTier;
    remaining: number;
    limit: number;
    resetAt: Date;
  };
}
