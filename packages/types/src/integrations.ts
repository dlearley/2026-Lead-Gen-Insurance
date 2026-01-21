// ========================================
// INSURANCE CARRIER & BROKER INTEGRATION TYPES
// ========================================

export type IntegrationType =
  | 'REST_API'
  | 'SOAP_API'
  | 'WEBHOOK'
  | 'FTP'
  | 'SFTP'
  | 'FILE_IMPORT'
  | 'FILE_EXPORT';

export type IntegrationConfigType =
  | 'API_ENDPOINTS'
  | 'MAPPING_RULES'
  | 'VALIDATION_RULES'
  | 'TRANSFORMATION_RULES'
  | 'NOTIFICATION_SETTINGS'
  | 'RATE_LIMITING'
  | 'AUTHENTICATION';

export type IntegrationEntityType =
  | 'INSURANCE_CARRIER'
  | 'BROKER'
  | 'LEAD'
  | 'POLICY'
  | 'CLAIM'
  | 'QUOTE';

export type IntegrationAction =
  | 'LEAD_SUBMITTED'
  | 'LEAD_STATUS_UPDATE'
  | 'QUOTE_REQUESTED'
  | 'QUOTE_RECEIVED'
  | 'POLICY_CREATED'
  | 'POLICY_UPDATED'
  | 'CLAIM_SUBMITTED'
  | 'CLAIM_STATUS_UPDATE'
  | 'WEBHOOK_RECEIVED'
  | 'DATA_SYNC'
  | 'VALIDATION_CHECK'
  | 'ERROR_RETRY';

export type Direction = 'INBOUND' | 'OUTBOUND';

// ========================================
// INSURANCE CARRIER TYPES
// ========================================

export interface InsuranceCarrier {
  id: string;
  name: string;
  code: string;
  website?: string;
  logoUrl?: string;
  contactEmail?: string;
  contactPhone?: string;
  supportedProducts: string[];
  apiEndpoint?: string;
  webhookUrl?: string;
  documentationUrl?: string;
  integrationType: IntegrationType;
  apiKey?: string;
  apiSecret?: string;
  apiVersion?: string;
  isActive: boolean;
  isPrimary: boolean;
  priority: number;
  rateLimit: number;
  rateLimitWindow: number;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateInsuranceCarrierDto {
  name: string;
  code: string;
  website?: string;
  logoUrl?: string;
  contactEmail?: string;
  contactPhone?: string;
  supportedProducts: string[];
  apiEndpoint?: string;
  webhookUrl?: string;
  documentationUrl?: string;
  integrationType?: IntegrationType;
  apiKey?: string;
  apiSecret?: string;
  apiVersion?: string;
  isActive?: boolean;
  isPrimary?: boolean;
  priority?: number;
  rateLimit?: number;
  rateLimitWindow?: number;
  metadata?: Record<string, unknown>;
}

export interface UpdateInsuranceCarrierDto {
  name?: string;
  code?: string;
  website?: string;
  logoUrl?: string;
  contactEmail?: string;
  contactPhone?: string;
  supportedProducts?: string[];
  apiEndpoint?: string;
  webhookUrl?: string;
  documentationUrl?: string;
  integrationType?: IntegrationType;
  apiKey?: string;
  apiSecret?: string;
  apiVersion?: string;
  isActive?: boolean;
  isPrimary?: boolean;
  priority?: number;
  rateLimit?: number;
  rateLimitWindow?: number;
  metadata?: Record<string, unknown>;
}

export interface InsuranceCarrierFilterParams {
  code?: string;
  isActive?: boolean;
  integrationType?: IntegrationType;
  supportedProduct?: string;
  isPrimary?: boolean;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

// ========================================
// BROKER TYPES
// ========================================

export interface Broker {
  id: string;
  name: string;
  code: string;
  website?: string;
  logoUrl?: string;
  contactEmail?: string;
  contactPhone?: string;
  licenseNumber?: string;
  ein?: string;
  businessAddress?: Record<string, unknown>;
  carrierId?: string;
  carrier?: InsuranceCarrier;
  integrationType: IntegrationType;
  apiKey?: string;
  apiSecret?: string;
  apiVersion?: string;
  isActive: boolean;
  priority: number;
  rateLimit: number;
  rateLimitWindow: number;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateBrokerDto {
  name: string;
  code: string;
  website?: string;
  logoUrl?: string;
  contactEmail?: string;
  contactPhone?: string;
  licenseNumber?: string;
  ein?: string;
  businessAddress?: Record<string, unknown>;
  carrierId?: string;
  integrationType?: IntegrationType;
  apiKey?: string;
  apiSecret?: string;
  apiVersion?: string;
  isActive?: boolean;
  priority?: number;
  rateLimit?: number;
  rateLimitWindow?: number;
  metadata?: Record<string, unknown>;
}

export interface UpdateBrokerDto {
  name?: string;
  code?: string;
  website?: string;
  logoUrl?: string;
  contactEmail?: string;
  contactPhone?: string;
  licenseNumber?: string;
  ein?: string;
  businessAddress?: Record<string, unknown>;
  carrierId?: string;
  integrationType?: IntegrationType;
  apiKey?: string;
  apiSecret?: string;
  apiVersion?: string;
  isActive?: boolean;
  priority?: number;
  rateLimit?: number;
  rateLimitWindow?: number;
  metadata?: Record<string, unknown>;
}

export interface BrokerFilterParams {
  code?: string;
  carrierId?: string;
  isActive?: boolean;
  integrationType?: IntegrationType;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

// ========================================
// INTEGRATION CONFIG TYPES
// ========================================

export interface IntegrationConfig {
  id: string;
  name: string;
  description?: string;
  carrierId?: string;
  carrier?: InsuranceCarrier;
  brokerId?: string;
  broker?: Broker;
  configType: IntegrationConfigType;
  config: Record<string, unknown>;
  isActive: boolean;
  isEnabled: boolean;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateIntegrationConfigDto {
  name: string;
  description?: string;
  carrierId?: string;
  brokerId?: string;
  configType: IntegrationConfigType;
  config: Record<string, unknown>;
  isActive?: boolean;
  isEnabled?: boolean;
  metadata?: Record<string, unknown>;
}

export interface UpdateIntegrationConfigDto {
  name?: string;
  description?: string;
  carrierId?: string;
  brokerId?: string;
  configType?: IntegrationConfigType;
  config?: Record<string, unknown>;
  isActive?: boolean;
  isEnabled?: boolean;
  metadata?: Record<string, unknown>;
}

export interface IntegrationConfigFilterParams {
  carrierId?: string;
  brokerId?: string;
  configType?: IntegrationConfigType;
  isActive?: boolean;
  isEnabled?: boolean;
  page?: number;
  limit?: number;
}

// ========================================
// INTEGRATION LOG TYPES
// ========================================

export interface IntegrationLog {
  id: string;
  entityType: IntegrationEntityType;
  entityId: string;
  carrierId?: string;
  carrier?: InsuranceCarrier;
  brokerId?: string;
  broker?: Broker;
  configId?: string;
  config?: IntegrationConfig;
  action: IntegrationAction;
  direction: Direction;
  requestData?: Record<string, unknown>;
  responseData?: Record<string, unknown>;
  statusCode?: number;
  success: boolean;
  error?: string;
  duration?: number;
  metadata?: Record<string, unknown>;
  createdAt: Date;
}

export interface CreateIntegrationLogDto {
  entityType: IntegrationEntityType;
  entityId: string;
  carrierId?: string;
  brokerId?: string;
  configId?: string;
  action: IntegrationAction;
  direction?: Direction;
  requestData?: Record<string, unknown>;
  responseData?: Record<string, unknown>;
  statusCode?: number;
  success: boolean;
  error?: string;
  duration?: number;
  metadata?: Record<string, unknown>;
}

export interface IntegrationLogFilterParams {
  entityType?: IntegrationEntityType;
  entityId?: string;
  carrierId?: string;
  brokerId?: string;
  configId?: string;
  action?: IntegrationAction;
  direction?: Direction;
  success?: boolean;
  dateFrom?: Date;
  dateTo?: Date;
  page?: number;
  limit?: number;
}

// ========================================
// API REQUEST/RESPONSE TYPES
// ========================================

export interface ApiRequestOptions {
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  url: string;
  headers?: Record<string, string>;
  body?: Record<string, unknown> | string;
  query?: Record<string, string>;
  timeout?: number;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
  statusCode?: number;
  headers?: Record<string, string>;
  duration?: number;
}

export interface IntegrationRequestResult {
  success: boolean;
  data?: Record<string, unknown>;
  error?: string;
  statusCode?: number;
  duration: number;
  logId?: string;
}

// ========================================
// WEBHOOK TYPES
// ========================================

export interface WebhookPayload {
  eventType: string;
  entityId: string;
  entityType: string;
  timestamp: string;
  data: Record<string, unknown>;
  signature?: string;
}

export interface WebhookValidationResult {
  isValid: boolean;
  error?: string;
  payload?: WebhookPayload;
}

// ========================================
// LEAD SUBMISSION TYPES
// ========================================

export interface LeadSubmissionRequest {
  leadId: string;
  carrierId?: string;
  brokerId?: string;
  submissionData: Record<string, unknown>;
  priority?: 'low' | 'medium' | 'high';
  scheduledFor?: Date;
}

export interface LeadSubmissionResult {
  submissionId: string;
  leadId: string;
  targetCarrier?: string;
  targetBroker?: string;
  success: boolean;
  externalId?: string;
  status?: string;
  error?: string;
  submittedAt: Date;
}

// ========================================
// QUOTE REQUEST TYPES
// ========================================

export interface QuoteRequest {
  leadId: string;
  insuranceType: string;
  coverageData: Record<string, unknown>;
  carrierIds?: string[];
  brokerId?: string;
  effectiveDate?: Date;
}

export interface QuoteResponse {
  quoteId: string;
  leadId: string;
  carrierId: string;
  premium: number;
  coverage: Record<string, unknown>;
  validUntil: Date;
  terms: string[];
  receivedAt: Date;
}

// ========================================
// INTEGRATION HEALTH TYPES
// ========================================

export interface IntegrationHealth {
  entityType: IntegrationEntityType;
  entityId: string;
  name: string;
  status: 'healthy' | 'degraded' | 'unhealthy';
  lastSuccessfulAt?: Date;
  lastFailedAt?: Date;
  consecutiveFailures: number;
  averageResponseTime?: number;
  totalRequests: number;
  successRate: number;
  lastCheckAt: Date;
}

export interface HealthCheckResult {
  healthy: boolean;
  checks: IntegrationHealth[];
  overallStatus: 'healthy' | 'degraded' | 'unhealthy';
  checkedAt: Date;
}

// ========================================
// PAGINATED RESPONSE TYPE
// ========================================

// PaginatedResponse is imported from api-ecosystem.ts

// ========================================
// ERROR TYPES
// ========================================

export interface IntegrationError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
  entityType?: IntegrationEntityType;
  entityId?: string;
  timestamp: Date;
}

export class IntegrationException extends Error {
  code: string;
  details?: Record<string, unknown>;

  constructor(message: string, code: string, details?: Record<string, unknown>) {
    super(message);
    this.name = 'IntegrationException';
    this.code = code;
    this.details = details;
  }
}
