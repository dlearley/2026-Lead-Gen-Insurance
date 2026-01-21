// ========================================
// API GATEWAY, AUTHENTICATION & REQUEST MANAGEMENT
// Phase 13.1: Enhanced API Gateway with Advanced Authentication & Request Processing
// ========================================

import { UserRole, Permission } from './auth.js';

// ========================================
// API GATEWAY CORE TYPES
// ========================================

export interface APIGatewayConfig {
  id: string;
  name: string;
  version: string;
  environment: 'development' | 'staging' | 'production';
  enabled: boolean;
  rateLimits: RateLimitConfig;
  security: SecurityConfig;
  routing: RoutingConfig;
  caching: CachingConfig;
  monitoring: MonitoringConfig;
  createdAt: Date;
  updatedAt: Date;
}

export interface RateLimitConfig {
  global: RateLimitRule;
  perRoute: Record<string, RateLimitRule>;
  perUser: Record<string, RateLimitRule>;
  burstLimit: number;
  quotaResetInterval: 'minute' | 'hour' | 'day' | 'month';
  rateLimitHeaders: boolean;
  customErrorMessage?: string;
}

export interface RateLimitRule {
  requests: number;
  windowMs: number;
  strategy: 'sliding' | 'fixed' | 'token_bucket';
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
  keyGenerator?: (req: any) => string;
}

export interface SecurityConfig {
  jwt: JWTConfig;
  apiKeys: APIKeyConfig;
  oauth: OAuthConfig;
  cors: CORSConfig;
  csrf: CSRFConfig;
  headers: SecurityHeadersConfig;
  inputValidation: InputValidationConfig;
  auditLogging: boolean;
  encryptionAtRest: boolean;
}

export interface JWTConfig {
  secret: string;
  algorithm: 'HS256' | 'RS256' | 'ES256';
  expiresIn: string;
  refreshTokenExpiresIn: string;
  issuer: string;
  audience: string;
  enableBlacklisting: boolean;
  leeway: number;
}

export interface APIKeyConfig {
  enabled: boolean;
  headerName: string;
  prefix: string;
  hashAlgorithm: 'sha256' | 'sha512' | 'bcrypt';
  rotationInterval: number;
  allowedScopes: string[];
}

export interface OAuthConfig {
  providers: OAuthProvider[];
  redirectUris: string[];
  stateExpiry: number;
  enableStateValidation: boolean;
  enableNonceValidation: boolean;
}

export interface OAuthProvider {
  name: string;
  clientId: string;
  clientSecret: string;
  authorizationUrl: string;
  tokenUrl: string;
  userInfoUrl: string;
  scopes: string[];
  enabled: boolean;
}

export interface CORSConfig {
  origin: string | string[] | boolean;
  methods: string[];
  allowedHeaders: string[];
  exposedHeaders: string[];
  credentials: boolean;
  maxAge: number;
  preflightContinue: boolean;
  optionsSuccessStatus: number;
}

export interface CSRFConfig {
  enabled: boolean;
  headerName: string;
  cookieName: string;
  cookieOptions: {
    httpOnly: boolean;
    secure: boolean;
    sameSite: 'strict' | 'lax' | 'none';
    path: string;
  };
  tokenLength: number;
  excludedRoutes: string[];
}

export interface SecurityHeadersConfig {
  hsts: {
    enabled: boolean;
    maxAge: number;
    includeSubDomains: boolean;
    preload: boolean;
  };
  xssProtection: {
    enabled: boolean;
    mode: 'block' | 'sanitize';
  };
  contentTypeOptions: {
    enabled: boolean;
  };
  frameOptions: {
    enabled: boolean;
    policy: 'DENY' | 'SAMEORIGIN' | 'ALLOW-FROM';
  };
  referrerPolicy: {
    enabled: boolean;
    policy: 'no-referrer' | 'strict-origin-when-cross-origin' | 'same-origin';
  };
}

export interface InputValidationConfig {
  enabled: boolean;
  sanitizeInput: boolean;
  removeNullBytes: boolean;
  maxPayloadSize: number;
  allowedContentTypes: string[];
  blockedPatterns: string[];
  customValidators: string[];
}

export interface RoutingConfig {
  services: ServiceConfig[];
  loadBalancer: LoadBalancerConfig;
  circuitBreaker: CircuitBreakerConfig;
  requestTransformation: TransformationConfig;
  responseTransformation: TransformationConfig;
}

export interface ServiceConfig {
  id: string;
  name: string;
  url: string;
  healthCheckPath: string;
  timeout: number;
  retries: number;
  retryDelay: number;
  weight: number;
  tags: string[];
  metadata: Record<string, any>;
}

export interface LoadBalancerConfig {
  algorithm: 'round_robin' | 'least_connections' | 'weighted' | 'ip_hash';
  stickySession: boolean;
  sessionTimeout: number;
  healthCheck: HealthCheckConfig;
}

export interface HealthCheckConfig {
  enabled: boolean;
  interval: number;
  timeout: number;
  retries: number;
  path: string;
  expectedStatusCodes: number[];
  expectedResponsePattern?: string;
}

export interface CircuitBreakerConfig {
  enabled: boolean;
  failureThreshold: number;
  recoveryTimeout: number;
  halfOpenMaxCalls: number;
  monitoringPeriod: number;
  errorCodes: number[];
}

export interface TransformationConfig {
  enabled: boolean;
  rules: TransformationRule[];
  preserveHeaders: boolean;
  preserveCookies: boolean;
}

export interface TransformationRule {
  type: 'add' | 'remove' | 'modify' | 'conditional';
  target: 'header' | 'body' | 'query' | 'path';
  source: string;
  value?: string;
  condition?: string;
}

export interface CachingConfig {
  enabled: boolean;
  strategies: GatewayCacheStrategy[];
  redis: {
    host: string;
    port: number;
    password?: string;
    database: number;
    keyPrefix: string;
    ttl: number;
  };
  memory: {
    maxSize: number;
    ttl: number;
  };
}

export interface GatewayCacheStrategy {
  route: string;
  method: string;
  ttl: number;
  varyBy: string[];
  cacheKey: string;
  conditions: CacheCondition[];
}

export interface CacheCondition {
  type: 'header' | 'query' | 'body' | 'user' | 'ip';
  key: string;
  operator: 'equals' | 'contains' | 'starts_with' | 'ends_with';
  value: string;
}

export interface MonitoringConfig {
  enabled: boolean;
  metrics: GatewayMetricsConfig;
  logging: LoggingConfig;
  tracing: GatewayTracingConfig;
  alerting: AlertingConfig;
}

export interface GatewayMetricsConfig {
  enabled: boolean;
  interval: number;
  retentionPeriod: number;
  customMetrics: CustomMetric[];
  prometheus: {
    enabled: boolean;
    port: number;
    path: string;
  };
}

export interface CustomMetric {
  name: string;
  type: 'counter' | 'gauge' | 'histogram' | 'summary';
  description: string;
  labels: string[];
  source: 'request' | 'response' | 'custom';
  calculation: string;
}

export interface LoggingConfig {
  enabled: boolean;
  level: 'error' | 'warn' | 'info' | 'debug';
  format: 'json' | 'text';
  includeHeaders: boolean;
  includeBody: boolean;
  includeUser: boolean;
  redactSensitiveData: boolean;
  destinations: LogDestination[];
}

export interface LogDestination {
  type: 'console' | 'file' | 'elasticsearch' | 'datadog' | 'newrelic';
  config: Record<string, any>;
  enabled: boolean;
}

export interface GatewayTracingConfig {
  enabled: boolean;
  serviceName: string;
  jaeger: {
    enabled: boolean;
    endpoint: string;
  };
  zipkin: {
    enabled: boolean;
    endpoint: string;
  };
  datadog: {
    enabled: boolean;
    service: string;
    env: string;
  };
}

export interface AlertingConfig {
  enabled: boolean;
  rules: GatewayAlertRule[];
  channels: AlertChannel[];
}

export interface GatewayAlertRule {
  name: string;
  condition: string;
  threshold: number;
  window: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  enabled: boolean;
}

export interface AlertChannel {
  type: 'email' | 'slack' | 'webhook' | 'pagerduty';
  config: Record<string, any>;
  enabled: boolean;
}

// ========================================
// AUTHENTICATION TYPES
// ========================================

export interface AuthenticationRequest {
  provider: 'jwt' | 'api_key' | 'oauth' | 'saml' | 'basic';
  credentials: AuthCredentials;
  clientInfo?: ClientInfo;
  context?: Record<string, any>;
}

export interface AuthCredentials {
  token?: string;
  apiKey?: string;
  username?: string;
  password?: string;
  oauthCode?: string;
  refreshToken?: string;
  clientId?: string;
  clientSecret?: string;
}

export interface ClientInfo {
  ip: string;
  userAgent: string;
  platform?: string;
  version?: string;
  deviceType?: 'desktop' | 'mobile' | 'tablet' | 'api';
  location?: string;
}

export interface AuthenticationResult {
  success: boolean;
  user?: AuthenticatedUser;
  error?: AuthenticationError;
  metadata: AuthMetadata;
}

export interface AuthenticatedUser {
  id: string;
  email: string;
  username?: string;
  roles: UserRole[];
  permissions: Permission[];
  scopes: string[];
  attributes: Record<string, any>;
  sessionId: string;
  issuedAt: Date;
  expiresAt: Date;
  lastActivity: Date;
  ipAddress: string;
  userAgent: string;
}

export interface AuthenticationError {
  code: string;
  message: string;
  details?: Record<string, any>;
  retryAfter?: number;
}

export interface AuthMetadata {
  provider: string;
  method: string;
  sessionId: string;
  requestId: string;
  timestamp: Date;
  riskScore?: number;
  anomalies?: SecurityAnomaly[];
}

export interface SecurityAnomaly {
  type: 'unusual_location' | 'suspicious_timing' | 'failed_attempts' | 'velocity' | 'device_change';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  evidence: Record<string, any>;
  detectedAt: Date;
}

export interface Session {
  id: string;
  userId: string;
  createdAt: Date;
  lastActivity: Date;
  expiresAt: Date;
  ipAddress: string;
  userAgent: string;
  metadata: Record<string, any>;
  isActive: boolean;
  invalidatedAt?: Date;
  invalidationReason?: string;
}

export interface TokenBlacklist {
  jti: string;
  userId: string;
  tokenType: 'access' | 'refresh';
  blacklistedAt: Date;
  expiresAt: Date;
  reason: string;
}

// ========================================
// REQUEST MANAGEMENT TYPES
// ========================================

export interface RequestContext {
  id: string;
  method: string;
  path: string;
  url: string;
  headers: Record<string, string>;
  query: Record<string, any>;
  params: Record<string, any>;
  body: any;
  user?: AuthenticatedUser;
  client: ClientInfo;
  startTime: number;
  timeout: number;
  correlationId: string;
  traceId: string;
  spanId: string;
  parentSpanId?: string;
  attributes: Record<string, any>;
}

export interface RequestValidation {
  enabled: boolean;
  strict: boolean;
  schemas: RequestSchema[];
  customValidators: CustomValidator[];
  errorHandling: 'reject' | 'sanitize' | 'log';
  includeMetadata: boolean;
}

export interface RequestSchema {
  route: string;
  method: string;
  schema: any; // JSON Schema
  requiredFields: string[];
  optionalFields: string[];
  validationRules: ValidationRule[];
}

export interface ValidationRule {
  field: string;
  type: string;
  required: boolean;
  min?: number;
  max?: number;
  pattern?: string;
  enum?: any[];
  custom?: string;
  message?: string;
}

export interface CustomValidator {
  name: string;
  description: string;
  implementation: string;
  enabled: boolean;
}

export interface RequestThrottling {
  enabled: boolean;
  strategies: ThrottlingStrategy[];
  global: ThrottleConfig;
  perRoute: Record<string, ThrottleConfig>;
  perUser: Record<string, ThrottleConfig>;
}

export interface ThrottlingStrategy {
  name: string;
  type: 'adaptive' | 'fixed' | 'exponential' | 'token_bucket';
  config: any;
  conditions: ThrottleCondition[];
  enabled: boolean;
}

export interface ThrottleConfig {
  requestsPerSecond: number;
  burstSize: number;
  queueSize: number;
  priorityLevels: number;
  timeout: number;
}

export interface ThrottleCondition {
  type: 'route' | 'user' | 'ip' | 'header';
  key: string;
  operator: 'equals' | 'contains' | 'greater_than' | 'less_than';
  value: any;
}

export interface RequestCache {
  enabled: boolean;
  strategies: RequestGatewayCacheStrategy[];
  storage: CacheStorage;
  invalidation: CacheInvalidation;
}

export interface RequestGatewayCacheStrategy {
  route: string;
  method: string;
  ttl: number;
  varyBy: string[];
  conditions: CacheCondition[];
  storage: 'memory' | 'redis' | 'both';
  compression: boolean;
}

export interface CacheStorage {
  memory: {
    maxSize: number;
    ttl: number;
    maxEntries: number;
  };
  redis: {
    host: string;
    port: number;
    password?: string;
    database: number;
    keyPrefix: string;
    ttl: number;
  };
}

export interface CacheInvalidation {
  enabled: boolean;
  triggers: InvalidationTrigger[];
  patterns: InvalidationPattern[];
}

export interface InvalidationTrigger {
  type: 'route' | 'user' | 'time' | 'event';
  condition: string;
  pattern?: string;
  enabled: boolean;
}

export interface InvalidationPattern {
  pattern: string;
  routes: string[];
  timeToLive: number;
}

// ========================================
// RESPONSE PROCESSING TYPES
// ========================================

export interface ResponseContext {
  statusCode: number;
  headers: Record<string, string>;
  body: any;
  duration: number;
  cached: boolean;
  compressed: boolean;
  version?: string;
  metadata: ResponseMetadata;
}

export interface ResponseMetadata {
  requestId: string;
  timestamp: Date;
  server: string;
  version: string;
  rateLimitRemaining?: number;
  rateLimitReset?: number;
  cacheStatus?: 'hit' | 'miss' | 'bypass';
  compressionRatio?: number;
  validationResults?: ValidationResult[];
}

export interface ValidationResult {
  field: string;
  valid: boolean;
  errors: GatewayValidationError[];
  warnings: ValidationWarning[];
}

export interface GatewayValidationError {
  code: string;
  message: string;
  path: string;
}

export interface ValidationWarning {
  code: string;
  message: string;
  path: string;
  suggestion: string;
}

// ========================================
// API VERSIONING TYPES
// ========================================

export interface APIVersioning {
  enabled: boolean;
  strategies: VersioningStrategy[];
  defaultVersion: string;
  supportedVersions: string[];
  deprecationSchedule: DeprecationSchedule[];
}

export interface VersioningStrategy {
  type: 'header' | 'url' | 'query_param' | 'content_type';
  format: string;
  versionField: string;
  defaultVersion?: string;
  enabled: boolean;
}

export interface DeprecationSchedule {
  version: string;
  deprecationDate: Date;
  sunsetDate: Date;
  migrationGuide?: string;
  replacementVersion?: string;
}

// ========================================
// SECURITY AUDIT TYPES
// ========================================

export interface SecurityAudit {
  enabled: boolean;
  events: SecurityEvent[];
  retention: AuditRetention;
  alerts: SecurityAlert[];
  compliance: ComplianceConfig;
}

export interface SecurityEvent {
  id: string;
  type: 'authentication' | 'authorization' | 'rate_limit' | 'input_validation' | 'suspicious_activity';
  severity: 'low' | 'medium' | 'high' | 'critical';
  userId?: string;
  clientInfo: ClientInfo;
  context: RequestContext;
  details: Record<string, any>;
  timestamp: Date;
  resolved: boolean;
  resolvedAt?: Date;
  resolvedBy?: string;
}

export interface AuditRetention {
  enabled: boolean;
  retentionPeriod: number;
  archiveAfter: number;
  compressionEnabled: boolean;
  encryptionEnabled: boolean;
}

export interface SecurityAlert {
  id: string;
  name: string;
  condition: string;
  threshold: number;
  window: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  enabled: boolean;
  recipients: string[];
  channels: AlertChannel[];
}

export interface ComplianceConfig {
  standards: ('gdpr' | 'ccpa' | 'hipaa' | 'sox' | 'pci_dss')[];
  dataClassification: DataClassification;
  privacyControls: PrivacyControls;
  auditRequirements: AuditRequirement[];
}

export interface DataClassification {
  levels: DataClassificationLevel[];
  defaultLevel: string;
  labeling: boolean;
  protection: boolean;
}

export interface DataClassificationLevel {
  name: string;
  description: string;
  color: string;
  encryptionRequired: boolean;
  accessRestrictions: string[];
}

export interface PrivacyControls {
  dataMinimization: boolean;
  purposeLimitation: boolean;
  consentManagement: boolean;
  dataPortability: boolean;
  rightToDeletion: boolean;
}

export interface AuditRequirement {
  standard: string;
  requirement: string;
  description: string;
  evidence: string[];
  frequency: 'real_time' | 'daily' | 'weekly' | 'monthly' | 'quarterly';
}

// ========================================
// PERFORMANCE & MONITORING TYPES
// ========================================

export interface GatewayPerformanceMetrics {
  requests: RequestMetrics;
  responses: ResponseMetrics;
  latency: GatewayLatencyMetrics;
  throughput: ThroughputMetrics;
  errors: ErrorMetrics;
  custom: CustomMetrics;
}

export interface RequestMetrics {
  total: number;
  successful: number;
  failed: number;
  byMethod: Record<string, number>;
  byRoute: Record<string, number>;
  byUser: Record<string, number>;
  byClient: Record<string, number>;
}

export interface ResponseMetrics {
  total: number;
  byStatusCode: Record<string, number>;
  byContentType: Record<string, number>;
  compressed: number;
  cached: number;
  errors: number;
}

export interface GatewayLatencyMetrics {
  average: number;
  median: number;
  p50: number;
  p90: number;
  p95: number;
  p99: number;
  byRoute: Record<string, GatewayLatencyMetrics>;
}

export interface ThroughputMetrics {
  requestsPerSecond: number;
  bytesPerSecond: number;
  peakRPS: number;
  sustainedRPS: number;
  byRoute: Record<string, number>;
}

export interface ErrorMetrics {
  rate: number;
  byCode: Record<string, number>;
  byRoute: Record<string, number>;
  byUser: Record<string, number>;
  patterns: ErrorPattern[];
}

export interface ErrorPattern {
  signature: string;
  count: number;
  firstSeen: Date;
  lastSeen: Date;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
}

export interface CustomMetrics {
  business: BusinessMetrics;
  technical: TechnicalMetrics;
  security: SecurityMetrics;
}

export interface BusinessMetrics {
  conversions: ConversionMetrics;
  revenue: RevenueMetrics;
  userEngagement: EngagementMetrics;
}

export interface ConversionMetrics {
  total: number;
  rate: number;
  bySource: Record<string, number>;
  byUserType: Record<string, number>;
}

export interface RevenueMetrics {
  total: number;
  perRequest: number;
  byService: Record<string, number>;
  trends: RevenueTrend[];
}

export interface RevenueTrend {
  period: string;
  value: number;
  change: number;
  percentage: number;
}

export interface EngagementMetrics {
  sessionDuration: number;
  requestsPerSession: number;
  bounceRate: number;
  retention: RetentionMetric[];
}

export interface RetentionMetric {
  period: string;
  users: number;
  percentage: number;
}

export interface TechnicalMetrics {
  database: DatabaseMetrics;
  cache: GatewayCacheMetrics;
  external: ExternalServiceMetrics;
}

export interface DatabaseMetrics {
  queries: number;
  averageLatency: number;
  slowQueries: number;
  connectionPool: GatewayConnectionPoolMetrics;
}

export interface GatewayConnectionPoolMetrics {
  active: number;
  idle: number;
  waiting: number;
  poolSize: number;
}

export interface GatewayCacheMetrics {
  hits: number;
  misses: number;
  hitRate: number;
  evictions: number;
  memoryUsage: CacheMemoryUsage;
}

export interface CacheMemoryUsage {
  used: number;
  total: number;
  percentage: number;
}

export interface ExternalServiceMetrics {
  calls: number;
  latency: number;
  errors: number;
  availability: number;
  byService: Record<string, ExternalServiceMetrics>;
}

export interface SecurityMetrics {
  authentication: AuthMetrics;
  authorization: AuthzMetrics;
  threats: ThreatMetrics;
  compliance: ComplianceMetrics;
}

export interface AuthMetrics {
  attempts: number;
  successRate: number;
  averageLatency: number;
  failedAttempts: number;
  suspiciousAttempts: number;
}

export interface AuthzMetrics {
  checks: number;
  denied: number;
  averageLatency: number;
  byResource: Record<string, number>;
}

export interface ThreatMetrics {
  blocked: number;
  detected: number;
  mitigated: number;
  byType: Record<string, ThreatMetrics>;
}

export interface ComplianceMetrics {
  violations: number;
  alerts: number;
  auditsPassed: number;
  byStandard: Record<string, ComplianceMetrics>;
}