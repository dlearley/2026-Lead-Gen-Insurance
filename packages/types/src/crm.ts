// ========================================
// CRM INTEGRATION TYPES
// ========================================

export type CrmProvider = 
  | 'SALESFORCE'
  | 'HUBSPOT'
  | 'PIPEDRIVE'
  | 'ZOHO'
  | 'MICROSOFT_DYNAMICS';

export type SyncStatus = 
  | 'IDLE'
  | 'SYNCING'
  | 'SUCCESS'
  | 'ERROR'
  | 'PAUSED';

export type SyncDirection = 
  | 'INBOUND'
  | 'OUTBOUND'
  | 'BIDIRECTIONAL';

export type SyncType =
  | 'FULL'
  | 'INCREMENTAL'
  | 'MANUAL';

export type SyncLogStatus =
  | 'STARTED'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'FAILED'
  | 'CANCELLED';

export type FieldType =
  | 'STRING'
  | 'NUMBER'
  | 'BOOLEAN'
  | 'DATE'
  | 'DATETIME'
  | 'EMAIL'
  | 'PHONE'
  | 'URL'
  | 'JSON';

export type ImportType =
  | 'CSV'
  | 'EXCEL'
  | 'JSON'
  | 'CRM_SYNC'
  | 'API';

export type ImportStatus =
  | 'PENDING'
  | 'VALIDATING'
  | 'VALIDATED'
  | 'PROCESSING'
  | 'COMPLETED'
  | 'FAILED'
  | 'CANCELLED';

export type ImportRecordStatus =
  | 'PENDING'
  | 'SUCCESS'
  | 'FAILED'
  | 'SKIPPED'
  | 'DUPLICATE';

// ========================================
// CRM INTEGRATION
// ========================================

export interface CrmIntegration {
  id: string;
  name: string;
  provider: CrmProvider;
  isActive: boolean;
  isConnected: boolean;
  accessToken?: string;
  refreshToken?: string;
  tokenExpiresAt?: Date;
  instanceUrl?: string;
  apiKey?: string;
  apiSecret?: string;
  webhookSecret?: string;
  lastSyncAt?: Date;
  syncStatus: SyncStatus;
  syncDirection: SyncDirection;
  syncFrequency: number;
  autoSync: boolean;
  errorCount: number;
  lastError?: string;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateCrmIntegrationDto {
  name: string;
  provider: CrmProvider;
  isActive?: boolean;
  syncDirection?: SyncDirection;
  syncFrequency?: number;
  autoSync?: boolean;
  metadata?: Record<string, unknown>;
}

export interface UpdateCrmIntegrationDto {
  name?: string;
  isActive?: boolean;
  accessToken?: string;
  refreshToken?: string;
  tokenExpiresAt?: Date;
  instanceUrl?: string;
  apiKey?: string;
  apiSecret?: string;
  webhookSecret?: string;
  syncDirection?: SyncDirection;
  syncFrequency?: number;
  autoSync?: boolean;
  metadata?: Record<string, unknown>;
}

// ========================================
// FIELD MAPPING
// ========================================

export interface CrmFieldMapping {
  id: string;
  integrationId: string;
  sourceField: string;
  targetField: string;
  fieldType: FieldType;
  isRequired: boolean;
  defaultValue?: string;
  transformFunction?: string;
  validationRules?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateFieldMappingDto {
  integrationId: string;
  sourceField: string;
  targetField: string;
  fieldType: FieldType;
  isRequired?: boolean;
  defaultValue?: string;
  transformFunction?: string;
  validationRules?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

export interface UpdateFieldMappingDto {
  sourceField?: string;
  targetField?: string;
  fieldType?: FieldType;
  isRequired?: boolean;
  defaultValue?: string;
  transformFunction?: string;
  validationRules?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

export interface FieldMappingTemplate {
  provider: CrmProvider;
  mappings: Array<{
    sourceField: string;
    targetField: string;
    fieldType: FieldType;
    isRequired: boolean;
    description?: string;
  }>;
}

// ========================================
// SYNC LOG
// ========================================

export interface CrmSyncLog {
  id: string;
  integrationId: string;
  syncType: SyncType;
  direction: SyncDirection;
  status: SyncLogStatus;
  recordsProcessed: number;
  recordsSuccess: number;
  recordsFailed: number;
  recordsSkipped: number;
  startedAt: Date;
  completedAt?: Date;
  duration?: number;
  errorMessage?: string;
  errorDetails?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

export interface CreateSyncLogDto {
  integrationId: string;
  syncType: SyncType;
  direction: SyncDirection;
  metadata?: Record<string, unknown>;
}

export interface UpdateSyncLogDto {
  status?: SyncLogStatus;
  recordsProcessed?: number;
  recordsSuccess?: number;
  recordsFailed?: number;
  recordsSkipped?: number;
  completedAt?: Date;
  duration?: number;
  errorMessage?: string;
  errorDetails?: Record<string, unknown>;
}

// ========================================
// DATA IMPORT
// ========================================

export interface DataImportJob {
  id: string;
  integrationId?: string;
  name: string;
  importType: ImportType;
  status: ImportStatus;
  fileName?: string;
  fileUrl?: string;
  fileMimeType?: string;
  fileSize?: number;
  totalRows: number;
  processedRows: number;
  successRows: number;
  failedRows: number;
  skippedRows: number;
  duplicateRows: number;
  validationErrors?: Record<string, unknown>;
  fieldMapping?: Record<string, unknown>;
  options?: Record<string, unknown>;
  scheduledFor?: Date;
  startedAt?: Date;
  completedAt?: Date;
  duration?: number;
  errorMessage?: string;
  createdBy?: string;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateImportJobDto {
  integrationId?: string;
  name: string;
  importType: ImportType;
  fileName?: string;
  fileUrl?: string;
  fileMimeType?: string;
  fileSize?: number;
  fieldMapping?: Record<string, unknown>;
  options?: Record<string, unknown>;
  scheduledFor?: Date;
  createdBy?: string;
  metadata?: Record<string, unknown>;
}

export interface UpdateImportJobDto {
  status?: ImportStatus;
  totalRows?: number;
  processedRows?: number;
  successRows?: number;
  failedRows?: number;
  skippedRows?: number;
  duplicateRows?: number;
  validationErrors?: Record<string, unknown>;
  startedAt?: Date;
  completedAt?: Date;
  duration?: number;
  errorMessage?: string;
  metadata?: Record<string, unknown>;
}

export interface DataImportRecord {
  id: string;
  importJobId: string;
  rowNumber: number;
  status: ImportRecordStatus;
  leadId?: string;
  sourceData: Record<string, unknown>;
  transformedData?: Record<string, unknown>;
  validationErrors?: Record<string, unknown>;
  errorMessage?: string;
  isDuplicate: boolean;
  duplicateOfId?: string;
  createdAt: Date;
}

export interface ImportPreview {
  headers: string[];
  rows: Array<Record<string, unknown>>;
  totalRows: number;
  previewRows: number;
  detectedFieldTypes: Record<string, FieldType>;
  suggestedMappings: Array<{
    sourceField: string;
    targetField: string;
    confidence: number;
  }>;
  validationWarnings: Array<{
    row: number;
    field: string;
    message: string;
  }>;
}

export interface ImportProgress {
  jobId: string;
  status: ImportStatus;
  totalRows: number;
  processedRows: number;
  successRows: number;
  failedRows: number;
  skippedRows: number;
  duplicateRows: number;
  percentage: number;
  estimatedTimeRemaining?: number;
  errors: Array<{
    row: number;
    field: string;
    message: string;
  }>;
}

// ========================================
// OAUTH
// ========================================

export interface OAuthConfig {
  provider: CrmProvider;
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  scopes: string[];
  authorizationUrl: string;
  tokenUrl: string;
}

export interface OAuthTokenResponse {
  accessToken: string;
  refreshToken?: string;
  expiresIn: number;
  tokenType: string;
  scope?: string;
  instanceUrl?: string;
}

export interface OAuthState {
  integrationId?: string;
  returnUrl?: string;
  metadata?: Record<string, unknown>;
}

// ========================================
// DATA VALIDATION
// ========================================

export interface ValidationRule {
  field: string;
  type: 'required' | 'email' | 'phone' | 'date' | 'number' | 'regex' | 'enum' | 'custom';
  message: string;
  params?: Record<string, unknown>;
}

export interface ValidationResult {
  isValid: boolean;
  errors: Array<{
    field: string;
    message: string;
    value?: unknown;
  }>;
  warnings: Array<{
    field: string;
    message: string;
    value?: unknown;
  }>;
}

export interface DataCleansingOptions {
  normalizePhone?: boolean;
  normalizeEmail?: boolean;
  trimStrings?: boolean;
  removeSpecialChars?: boolean;
  capitalizeName?: boolean;
  validatePostalCode?: boolean;
}

export interface CleansingResult {
  original: Record<string, unknown>;
  cleaned: Record<string, unknown>;
  changes: Array<{
    field: string;
    from: unknown;
    to: unknown;
    reason: string;
  }>;
}

// ========================================
// DEDUPLICATION
// ========================================

export interface DuplicateCheckOptions {
  matchByEmail?: boolean;
  matchByPhone?: boolean;
  matchByName?: boolean;
  fuzzyMatchThreshold?: number;
  checkWindow?: number; // days
}

export interface DuplicateCheckResult {
  isDuplicate: boolean;
  duplicateOf?: string;
  matchScore: number;
  matchedFields: string[];
  duplicateCandidates: Array<{
    id: string;
    score: number;
    matchedFields: string[];
  }>;
}

// ========================================
// WEBHOOK
// ========================================

export interface CrmWebhookPayload {
  provider: CrmProvider;
  eventType: string;
  timestamp: string;
  data: Record<string, unknown>;
  signature?: string;
}

export interface WebhookValidationResult {
  isValid: boolean;
  error?: string;
  payload?: CrmWebhookPayload;
}

// ========================================
// SYNC OPERATIONS
// ========================================

export interface SyncOperation {
  integrationId: string;
  syncType: SyncType;
  direction: SyncDirection;
  filters?: Record<string, unknown>;
  options?: Record<string, unknown>;
}

export interface SyncResult {
  syncLogId: string;
  success: boolean;
  recordsProcessed: number;
  recordsSuccess: number;
  recordsFailed: number;
  recordsSkipped: number;
  duration: number;
  errors: Array<{
    recordId?: string;
    message: string;
    details?: Record<string, unknown>;
  }>;
}

// ========================================
// FILTER & PAGINATION
// ========================================

export interface CrmIntegrationFilters {
  provider?: CrmProvider;
  isActive?: boolean;
  isConnected?: boolean;
  syncStatus?: SyncStatus;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface SyncLogFilters {
  integrationId?: string;
  syncType?: SyncType;
  status?: SyncLogStatus;
  dateFrom?: Date;
  dateTo?: Date;
  page?: number;
  limit?: number;
}

export interface ImportJobFilters {
  integrationId?: string;
  importType?: ImportType;
  status?: ImportStatus;
  createdBy?: string;
  dateFrom?: Date;
  dateTo?: Date;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrevious: boolean;
  };
}

// ========================================
// STATISTICS & REPORTING
// ========================================

export interface CrmSyncStats {
  integrationId: string;
  totalSyncs: number;
  successfulSyncs: number;
  failedSyncs: number;
  totalRecordsProcessed: number;
  totalRecordsSuccess: number;
  totalRecordsFailed: number;
  averageDuration: number;
  lastSyncAt?: Date;
  uptime: number; // percentage
}

export interface ImportStats {
  totalImports: number;
  successfulImports: number;
  failedImports: number;
  totalRecordsImported: number;
  totalDuplicates: number;
  averageImportTime: number;
  importsByType: Record<ImportType, number>;
  importsByStatus: Record<ImportStatus, number>;
}

export interface DataQualityReport {
  totalRecords: number;
  completeRecords: number;
  incompleteRecords: number;
  invalidRecords: number;
  duplicateRecords: number;
  qualityScore: number; // 0-100
  fieldCompleteness: Record<string, number>; // percentage per field
  commonIssues: Array<{
    field: string;
    issueType: string;
    count: number;
    percentage: number;
  }>;
}

// ========================================
// CSV TEMPLATE
// ========================================

export interface CsvTemplate {
  name: string;
  description: string;
  headers: string[];
  requiredHeaders: string[];
  sampleData: Array<Record<string, string>>;
  validationRules: ValidationRule[];
  fieldDescriptions: Record<string, string>;
}
