/**
 * Vendor & Partner Integration Coordination
 * 
 * This module defines the types for coordinating integrations between
 * marketplace vendors (service/product providers) and platform partners
 * (integration/application builders).
 */

// ============================================================================
// Core Coordination Types
// ============================================================================

/**
 * Relationship between a vendor and a partner
 */
export enum VendorPartnerRelationshipType {
  INTEGRATION = 'INTEGRATION',     // Partner builds integration for vendor's service
  RESELLER = 'RESELLER',           // Partner resells vendor's products
  REFERRAL = 'REFERRAL',           // Partner refers customers to vendor
  COLLABORATION = 'COLLABORATION', // Joint development/marketing
  API_CONSUMPTION = 'API_CONSUMPTION', // Partner consumes vendor's API
}

/**
 * Status of the vendor-partner relationship
 */
export enum RelationshipStatus {
  PENDING = 'PENDING',
  ACTIVE = 'ACTIVE',
  SUSPENDED = 'SUSPENDED',
  TERMINATED = 'TERMINATED',
}

/**
 * Coordination workflow types
 */
export enum WorkflowType {
  INTEGRATION_SETUP = 'INTEGRATION_SETUP',
  API_ACCESS_GRANT = 'API_ACCESS_GRANT',
  RESOURCE_SHARING = 'RESOURCE_SHARING',
  DATA_SYNC = 'DATA_SYNC',
  TESTING_VALIDATION = 'TESTING_VALIDATION',
  PRODUCTION_DEPLOYMENT = 'PRODUCTION_DEPLOYMENT',
}

/**
 * Workflow step status
 */
export enum WorkflowStepStatus {
  NOT_STARTED = 'NOT_STARTED',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  SKIPPED = 'SKIPPED',
}

/**
 * Dependency type between integrations
 */
export enum IntegrationDependencyType {
  REQUIRES = 'REQUIRES',         // Integration A requires Integration B
  CONFLICTS = 'CONFLICTS',       // Integration A conflicts with Integration B
  ENHANCES = 'ENHANCES',         // Integration A enhances Integration B
  DEPENDS_ON_DATA = 'DEPENDS_ON_DATA', // Integration A depends on data from Integration B
}

/**
 * Shared resource types
 */
export enum SharedResourceType {
  API_ENDPOINT = 'API_ENDPOINT',
  WEBHOOK = 'WEBHOOK',
  DATABASE_TABLE = 'DATABASE_TABLE',
  CACHE_KEY = 'CACHE_KEY',
  QUEUE_TOPIC = 'QUEUE_TOPIC',
  STORAGE_BUCKET = 'STORAGE_BUCKET',
}

// ============================================================================
// Main Domain Models
// ============================================================================

/**
 * Vendor-Partner Relationship
 * Defines the relationship between a marketplace vendor and a platform partner
 */
export interface VendorPartnerRelationship {
  id: string;
  vendorId: string;
  partnerId: string;
  relationshipType: VendorPartnerRelationshipType;
  status: RelationshipStatus;
  startDate: Date;
  endDate?: Date;
  agreementDetails?: {
    terms?: string;
    commissionRate?: number;
    revenueSharePercentage?: number;
    slaRequirements?: Record<string, any>;
  };
  configuration?: Record<string, any>;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Integration Workflow
 * Defines a multi-step workflow for setting up or managing integrations
 */
export interface IntegrationWorkflow {
  id: string;
  name: string;
  description?: string;
  workflowType: WorkflowType;
  vendorId?: string;
  partnerId?: string;
  integrationId?: string;
  status: WorkflowStepStatus;
  currentStep?: number;
  steps: WorkflowStep[];
  dependencies?: string[]; // IDs of workflows that must complete first
  estimatedDuration?: number; // in minutes
  actualDuration?: number; // in minutes
  startedAt?: Date;
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Workflow Step
 * Individual step within a workflow
 */
export interface WorkflowStep {
  id: string;
  workflowId: string;
  stepNumber: number;
  name: string;
  description?: string;
  status: WorkflowStepStatus;
  estimatedDuration?: number; // in minutes
  actualDuration?: number; // in minutes
  startedAt?: Date;
  completedAt?: Date;
  errorMessage?: string;
  retryCount?: number;
  maxRetries?: number;
  dependencies?: number[]; // Step numbers that must complete first
  configuration?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Integration Dependency
 * Defines dependencies or conflicts between integrations
 */
export interface IntegrationDependency {
  id: string;
  integrationId: string;
  dependsOnIntegrationId: string;
  dependencyType: IntegrationDependencyType;
  condition?: string; // Condition under which dependency applies
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Shared Resource
 * Resources that can be shared between vendors and partners
 */
export interface SharedResource {
  id: string;
  resourceId: string; // The actual resource identifier
  resourceType: SharedResourceType;
  ownerId: string;
  ownerType: 'vendor' | 'partner';
  name: string;
  description?: string;
  configuration?: Record<string, any>;
  accessControl?: {
    allowedPartners?: string[];
    allowedVendors?: string[];
    accessLevel: 'read' | 'write' | 'admin';
  };
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Resource Access Grant
 * Grants access to a shared resource
 */
export interface ResourceAccessGrant {
  id: string;
  resourceId: string;
  grantedToId: string;
  grantedToType: 'vendor' | 'partner';
  accessLevel: 'read' | 'write' | 'admin';
  grantedBy: string;
  grantedAt: Date;
  expiresAt?: Date;
  isActive: boolean;
  conditions?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Cross-Integration Event
 * Events that coordinate across multiple integrations
 */
export interface CrossIntegrationEvent {
  id: string;
  eventName: string;
  sourceIntegrationId: string;
  targetIntegrationIds: string[];
  payload: Record<string, any>;
  eventCategory: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: 'pending' | 'processing' | 'completed' | 'failed';
  processedAt?: Date;
  errorMessage?: string;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Coordination Health Check
 * Health status of coordination systems
 */
export interface CoordinationHealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: Date;
  checks: {
    workflowEngine: {
      status: 'pass' | 'fail';
      message?: string;
    };
    dependencyResolution: {
      status: 'pass' | 'fail';
      message?: string;
    };
    resourceSharing: {
      status: 'pass' | 'fail';
      message?: string;
    };
    eventCoordination: {
      status: 'pass' | 'fail';
      message?: string;
    };
  };
  activeWorkflows: number;
  pendingEvents: number;
  activeResources: number;
}

// ============================================================================
// Request/Response DTOs
// ============================================================================

/**
 * Create vendor-partner relationship request
 */
export interface CreateVendorPartnerRelationshipRequest {
  vendorId: string;
  partnerId: string;
  relationshipType: VendorPartnerRelationshipType;
  agreementDetails?: {
    terms?: string;
    commissionRate?: number;
    revenueSharePercentage?: number;
    slaRequirements?: Record<string, any>;
  };
  configuration?: Record<string, any>;
}

/**
 * Update vendor-partner relationship request
 */
export interface UpdateVendorPartnerRelationshipRequest {
  status?: RelationshipStatus;
  endDate?: Date;
  agreementDetails?: {
    terms?: string;
    commissionRate?: number;
    revenueSharePercentage?: number;
    slaRequirements?: Record<string, any>;
  };
  configuration?: Record<string, any>;
}

/**
 * Create workflow request
 */
export interface CreateWorkflowRequest {
  name: string;
  description?: string;
  workflowType: WorkflowType;
  vendorId?: string;
  partnerId?: string;
  integrationId?: string;
  steps: Omit<WorkflowStep, 'id' | 'workflowId' | 'createdAt' | 'updatedAt'>[];
  dependencies?: string[];
  estimatedDuration?: number;
}

/**
 * Execute workflow step request
 */
export interface ExecuteWorkflowStepRequest {
  stepId: string;
  configuration?: Record<string, any>;
  retry?: boolean;
}

/**
 * Create integration dependency request
 */
export interface CreateIntegrationDependencyRequest {
  integrationId: string;
  dependsOnIntegrationId: string;
  dependencyType: IntegrationDependencyType;
  condition?: string;
}

/**
 * Create shared resource request
 */
export interface CreateSharedResourceRequest {
  resourceId: string;
  resourceType: SharedResourceType;
  name: string;
  description?: string;
  configuration?: Record<string, any>;
  accessControl?: {
    allowedPartners?: string[];
    allowedVendors?: string[];
    accessLevel: 'read' | 'write' | 'admin';
  };
}

/**
 * Grant resource access request
 */
export interface GrantResourceAccessRequest {
  resourceId: string;
  grantedToId: string;
  grantedToType: 'vendor' | 'partner';
  accessLevel: 'read' | 'write' | 'admin';
  expiresAt?: Date;
  conditions?: Record<string, any>;
}

/**
 * Publish cross-integration event request
 */
export interface PublishCrossIntegrationEventRequest {
  eventName: string;
  sourceIntegrationId: string;
  targetIntegrationIds: string[];
  payload: Record<string, any>;
  eventCategory: string;
  priority?: 'low' | 'medium' | 'high' | 'critical';
  metadata?: Record<string, any>;
}

/**
 * Get vendor-partner relationships filter
 */
export interface GetVendorPartnerRelationshipsFilter {
  vendorId?: string;
  partnerId?: string;
  relationshipType?: VendorPartnerRelationshipType;
  status?: RelationshipStatus;
  limit?: number;
  offset?: number;
}

/**
 * Get workflows filter
 */
export interface GetWorkflowsFilter {
  workflowType?: WorkflowType;
  vendorId?: string;
  partnerId?: string;
  integrationId?: string;
  status?: WorkflowStepStatus;
  limit?: number;
  offset?: number;
}

/**
 * Get shared resources filter
 */
export interface GetSharedResourcesFilter {
  resourceType?: SharedResourceType;
  ownerId?: string;
  ownerType?: 'vendor' | 'partner';
  isActive?: boolean;
  limit?: number;
  offset?: number;
}

// ============================================================================
// Analytics & Metrics
// ============================================================================

/**
 * Coordination metrics
 */
export interface CoordinationMetrics {
  period: {
    start: Date;
    end: Date;
  };
  relationships: {
    total: number;
    active: number;
    pending: number;
    suspended: number;
    new: number;
  };
  workflows: {
    total: number;
    completed: number;
    failed: number;
    inProgress: number;
    averageCompletionTime: number; // in minutes
  };
  resources: {
    total: number;
    active: number;
    shared: number;
    averageUtilization: number; // percentage
  };
  events: {
    total: number;
    processed: number;
    failed: number;
    averageProcessingTime: number; // in milliseconds
  };
  dependencies: {
    total: number;
    critical: number;
    resolved: number;
    blocked: number;
  };
}

/**
 * Integration dependency analysis
 */
export interface DependencyAnalysis {
  integrationId: string;
  integrationName: string;
  dependencies: {
    id: string;
    name: string;
    type: IntegrationDependencyType;
    status: 'active' | 'inactive' | 'error';
  }[];
  dependents: {
    id: string;
    name: string;
    type: IntegrationDependencyType;
  }[];
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  issues: string[];
  recommendations: string[];
}
