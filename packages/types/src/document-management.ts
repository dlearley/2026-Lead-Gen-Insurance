// ========================================
// DOCUMENT MANAGEMENT TYPES
// ========================================

// Enums
export type DocumentStatus = 'Active' | 'Archived' | 'Deleted' | 'PendingDeletion';
export type DocumentType = 'Quote' | 'Policy' | 'Claim' | 'ID' | 'ProofOfAddress' | 'IncomeVerification' | 'ConsentForm' | 'Disclosure' | 'Other';
export type DocumentCategory = 'Financial' | 'Identity' | 'Medical' | 'Legal' | 'Regulatory' | 'Operational';
export type DocumentSensitivity = 'Public' | 'Internal' | 'Confidential' | 'Secret';
export type StorageProvider = 'S3' | 'MinIO' | 'LocalStorage';
export type AccessAction = 'View' | 'Download' | 'Print' | 'Share' | 'Delete' | 'Restore';
export type SharePermission = 'View' | 'Download' | 'Edit' | 'Share';
export type ShareType = 'Direct' | 'Role' | 'Team' | 'Public';
export type PIIFieldType = 'Number' | 'Email' | 'Phone' | 'Address' | 'Name';
export type PIIFieldSeverity = 'Critical' | 'High' | 'Medium';
export type RedactionMethod = 'Mask' | 'Hash' | 'Remove' | 'Encrypt';
export type DeletionMethod = 'SecureDelete' | 'Shred' | 'Anonymize';
export type ArchiveFormat = 'TAR.GZ' | 'ZIP' | 'BAG';

// Core Document Interface
export interface Document {
  id: string;
  documentId: string;
  leadId?: string;
  agentId?: string;
  documentType: DocumentType;
  category: DocumentCategory;
  filename: string;
  fileSize: number;
  mimeType: string;
  storageLocation: string;
  storageProvider: StorageProvider;
  encryptionKey?: string;
  checksum: string;
  description?: string;
  tags: string[];
  jurisdiction?: string;
  status: DocumentStatus;
  uploadedDate: Date;
  uploadedBy: string;
  lastAccessedDate?: Date;
  archivedDate?: Date;
  deletionScheduledDate?: Date;
  deletionDate?: Date;
  retentionCategory: string;
  retentionPeriodDays?: number;
  expiryDate?: Date;
  legalHoldApplied: boolean;
  legalHoldReason?: string;
  version: number;
  parentDocumentId?: string;
  relatedDocuments: string[];
  sensitivity: DocumentSensitivity;
  piiDetected: boolean;
  piiFields: string[];
  requiresRedaction: boolean;
  redacted: boolean;
  complianceRelevant: boolean;
  regulations: string[];
  createdAt: Date;
  updatedAt: Date;
}

// Document Metadata Interface
export interface DocumentMetadata {
  documentType: DocumentType;
  category: DocumentCategory;
  sensitivity: DocumentSensitivity;
  tags: string[];
  jurisdiction?: string;
  description?: string;
  leadId?: string;
  agentId?: string;
}

// Document Access Log Interface
export interface DocumentAccessLog {
  id: string;
  documentId: string;
  userId: string;
  action: AccessAction;
  ipAddress?: string;
  userAgent?: string;
  accessReason?: string;
  timestamp: Date;
  success: boolean;
  failureReason?: string;
}

// Document Version Interface
export interface DocumentVersion {
  id: string;
  documentId: string;
  versionNumber: number;
  storageLocation: string;
  checksum: string;
  uploadedDate: Date;
  uploadedBy: string;
  changeDescription?: string;
  changes?: string;
  fileSize: number;
}

// Document Classification Rule Interface
export interface DocumentClassificationRule {
  id: string;
  name: string;
  description?: string;
  pattern: string; // Regex pattern
  documentType?: DocumentType;
  category: DocumentCategory;
  sensitivity: DocumentSensitivity;
  requiresRedaction: boolean;
  retentionCategory?: string;
  jurisdiction: string[];
  status: string;
  createdAt: Date;
  updatedAt: Date;
}

// PII Detection Rule Interface
export interface PIIDetectionRule {
  id: string;
  fieldName: string;
  pattern: string;
  dataType: PIIFieldType;
  severity: PIIFieldSeverity;
  redactionMethod: RedactionMethod;
  redactionFormat?: string;
  createdAt: Date;
  updatedAt: Date;
}

// Document Retention Policy Interface
export interface DocumentRetentionPolicy {
  id: string;
  policyName: string;
  documentTypes: string[];
  retentionDays: number;
  archiveDays?: number;
  jurisdiction: string;
  reason: string;
  regulations: string[];
  legalHolds: string[];
  deletionMethod: DeletionMethod;
  notificationDays: number;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}

// Encryption Key Interface
export interface EncryptionKey {
  id: string;
  keyId: string;
  keyType: string; // "AES256", "RSA2048", "RSA4096"
  algorithm: string; // "AES-GCM", "RSA-OAEP"
  creationDate: Date;
  expiryDate?: Date;
  status: string;
  rotationDate?: Date;
  lastUsedDate?: Date;
  keySource: string;
  metadata?: string;
  createdAt: Date;
  updatedAt: Date;
}

// Document Share Interface
export interface DocumentShare {
  id: string;
  documentId: string;
  grantedToUserId: string;
  grantedBy: string;
  permission: SharePermission;
  shareType: ShareType;
  expiryDate?: Date;
  requiresPassword: boolean;
  password?: string;
  accessCount: number;
  status: string;
  grantedDate: Date;
  revokedDate?: Date;
  revokedReason?: string;
  createdAt: Date;
  updatedAt: Date;
}

// Document Search Index Interface
export interface DocumentIndex {
  id: string;
  documentId: string;
  content: string;
  extractedText?: string;
  keywords: string[];
  entities: string[];
  lastIndexedDate: Date;
  createdAt: Date;
}

// Document Deletion Request Interface
export interface DocumentDeletionRequest {
  id: string;
  documentId: string;
  documentType: string;
  requestedBy: string;
  requestReason: string;
  status: string;
  requestDate: Date;
  approvedDate?: Date;
  approvedBy?: string;
  executionDate?: Date;
  completionDetails?: string;
  createdAt: Date;
  updatedAt: Date;
}

// Archived Document Interface
export interface ArchivedDocument {
  id: string;
  documentId: string;
  originalStorageLocation: string;
  archiveLocation: string;
  archiveFormat: ArchiveFormat;
  archiveDate: Date;
  archivedBy: string;
  checksum: string;
  retrievalInstructions?: string;
  expiryDate?: Date;
  createdAt: Date;
}

// Litigation Hold Interface
export interface LitigationHold {
  id: string;
  holdId: string;
  caseNumber?: string;
  description: string;
  reason: string;
  appliedDate: Date;
  appliedBy: string;
  targetDocuments: string[];
  jurisdiction?: string;
  status: string;
  liftedDate?: Date;
  liftedBy?: string;
  liftReason?: string;
  createdAt: Date;
  updatedAt: Date;
}

// Document Integrity Check Interface
export interface DocumentIntegrityCheck {
  id: string;
  documentId: string;
  checkDate: Date;
  storedChecksum: string;
  currentChecksum: string;
  isIntact: boolean;
  encryptionValid: boolean;
  accessible: boolean;
  issues: string[];
}

// Document Expiration Event Interface
export interface DocumentExpirationEvent {
  id: string;
  documentId: string;
  eventType: string;
  scheduledDate: Date;
  executedDate?: Date;
  status: string;
  notificationSent: boolean;
  createdAt: Date;
}

// ========================================
// Document Management DTOs and Filters
// ========================================

export interface UploadDocumentDto {
  file: File;
  metadata: DocumentMetadata;
}

export interface DocumentFilters {
  documentType?: DocumentType;
  category?: DocumentCategory;
  status?: DocumentStatus;
  leadId?: string;
  agentId?: string;
  sensitivity?: DocumentSensitivity;
  uploadedBy?: string;
  dateFrom?: Date;
  dateTo?: Date;
  tags?: string[];
  jurisdiction?: string;
  hasPII?: boolean;
  legalHold?: boolean;
  page?: number;
  limit?: number;
}

export interface SearchFilters extends DocumentFilters {
  query: string;
  keywords?: string[];
  entities?: string[];
}

export interface DocumentClassification {
  documentType: DocumentType;
  category: DocumentCategory;
  sensitivity: DocumentSensitivity;
  piiDetected: boolean;
  requiresRedaction: boolean;
  confidence: number;
}

export interface PIIPdetectionResult {
  hasPII: boolean;
  detectedFields: {
    fieldName: string;
    pattern: string;
    severity: PIIFieldSeverity;
    positions: number[];
    redactedValue?: string;
  }[];
  summary: {
    critical: number;
    high: number;
    medium: number;
  };
}

export interface RetentionStatus {
  documentId: string;
  policyName: string;
  expiryDate: Date;
  daysRemaining: number;
  legalHoldApplied: boolean;
  canBeDeleted: boolean;
  canBeArchived: boolean;
  lastAccessedDaysAgo?: number;
}

export interface AccessLog {
  documentId: string;
  userId: string;
  action: AccessAction;
  timestamp: Date;
  ipAddress?: string;
  success: boolean;
  accessReason?: string;
}

export interface ShareResult {
  success: boolean;
  shareId: string;
  documentId: string;
  grantedToUserId: string;
  permission: SharePermission;
  expiryDate?: Date;
  requiresPassword: boolean;
  message?: string;
}

export interface AccessResult {
  allowed: boolean;
  documentId: string;
  userId: string;
  action: AccessAction;
  permission: SharePermission;
  reason?: string;
}

export interface IntegrityResult {
  documentId: string;
  isIntact: boolean;
  encryptionValid: boolean;
  accessible: boolean;
  storedChecksum: string;
  currentChecksum: string;
  issues: string[];
  checkDate: Date;
}

export interface SearchResults {
  documents: Document[];
  totalCount: number;
  page: number;
  limit: number;
  hasMore: boolean;
  executionTime: number;
}

export interface VersioningResult {
  success: boolean;
  documentId: string;
  versionNumber: number;
  versionId: string;
  message?: string;
}

export interface RedactionResult {
  success: boolean;
  documentId: string;
  redactedDocumentId?: string;
  redactedFields: string[];
  originalFileSize: number;
  redactedFileSize: number;
  method: RedactionMethod;
}

// ========================================
// Service Response Types
// ========================================

export interface ProcessingResult {
  success: boolean;
  processedCount: number;
  failedCount: number;
  errors: string[];
  executionTime: number;
}

export interface StorageResult {
  success: boolean;
  documentId: string;
  storageLocation: string;
  storageProvider: StorageProvider;
  fileSize: number;
  checksum: string;
}

export interface EncryptionResult {
  success: boolean;
  documentId: string;
  keyId: string;
  algorithm: string;
  encryptedSize: number;
}

export interface ArchiveResult {
  success: boolean;
  documentId: string;
  archiveLocation: string;
  archiveFormat: ArchiveFormat;
  compressedSize: number;
  originalSize: number;
}

export interface DeletionResult {
  success: boolean;
  documentId: string;
  deletionMethod: DeletionMethod;
  auditProof: string;
  deletedAt: Date;
}

export interface ClassificationResult {
  success: boolean;
  documentId: string;
  classification: DocumentClassification;
  ruleApplied?: string;
  confidence: number;
}

export interface PIIReport {
  period: {
    start: Date;
    end: Date;
  };
  totalDocumentsScanned: number;
  documentsWithPII: number;
  piiFieldCounts: {
    critical: number;
    high: number;
    medium: number;
  };
  topPIIFields: {
    fieldName: string;
    count: number;
  }[];
  documentsWithRedaction: number;
  complianceIssues: string[];
}

export interface ComplianceReport {
  period: {
    start: Date;
    end: Date;
  };
  totalDocuments: number;
  documentsByStatus: {
    active: number;
    archived: number;
    deleted: number;
    pendingDeletion: number;
  };
  documentsBySensitivity: {
    public: number;
    internal: number;
    confidential: number;
    secret: number;
  };
  retentionCompliance: {
    compliant: number;
    nonCompliant: number;
    underLegalHold: number;
  };
  encryptionStatus: {
    encrypted: number;
    unencrypted: number;
  };
  piiExposure: {
    hasPII: number;
    redacted: number;
    requiresRedaction: number;
  };
  auditLogSize: number;
  lastRetentionCheck: Date;
}

export interface StorageReport {
  totalSize: number;
  totalDocuments: number;
  averageFileSize: number;
  largestFiles: {
    documentId: string;
    filename: string;
    size: number;
  }[];
  unusedDocuments: {
    documentId: string;
    filename: string;
    daysSinceLastAccess: number;
  }[];
  storageByProvider: {
    provider: StorageProvider;
    size: number;
    count: number;
  }[];
  growthRate: {
    daily: number;
    weekly: number;
    monthly: number;
  };
}

// Query Parameters
export interface DocumentQueryParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  filters?: DocumentFilters;
  search?: string;
}

export interface DocumentVersionQueryParams {
  documentId: string;
  versionNumber?: number;
}

export interface ClassificationQueryParams {
  ruleId?: string;
  documentType?: DocumentType;
  category?: DocumentCategory;
  status?: string;
  page?: number;
  limit?: number;
}

export interface RetentionQueryParams {
  policyId?: string;
  jurisdiction?: string;
  status?: string;
  page?: number;
  limit?: number;
}

export interface AccessQueryParams {
  documentId?: string;
  userId?: string;
  action?: AccessAction;
  dateFrom?: Date;
  dateTo?: Date;
  page?: number;
  limit?: number;
}