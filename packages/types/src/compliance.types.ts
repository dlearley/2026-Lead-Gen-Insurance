// Compliance Framework Type Definitions
// This file contains all TypeScript interfaces and types for the compliance framework

export type ComplianceDomain = 'GDPR' | 'HIPAA' | 'CCPA' | 'GLBA' | 'Insurance' | 'Other';
export type Jurisdiction = 'EU' | 'US' | 'CA' | 'NY' | 'TX' | 'FL' | 'State' | 'Federal' | 'International';
export type RiskLevel = 'Critical' | 'High' | 'Medium' | 'Low';
export type PolicyStatus = 'Active' | 'Draft' | 'Archived';
export type ViolationStatus = 'Open' | 'Resolved' | 'Waived';
export type Severity = 'Critical' | 'High' | 'Medium' | 'Low';
export type EnforcementLevel = 'Mandatory' | 'Recommended';
export type DSARType = 'AccessRequest' | 'DeletionRequest' | 'PortabilityRequest' | 'CorrectionRequest';
export type DSARStatus = 'Pending' | 'InProgress' | 'Completed' | 'Denied';
export type RequirementStatus = 'NotStarted' | 'InProgress' | 'Completed';

export interface CompliancePolicy {
  id: string;
  name: string;
  description?: string;
  domain: ComplianceDomain;
  jurisdiction?: Jurisdiction;
  riskLevel: RiskLevel;
  status: PolicyStatus;
  requirements: RequiredField[];
  createdAt: Date;
  updatedAt: Date;
}

export interface RequiredField {
  id: string;
  policyId: string;
  name: string;
  description?: string;
  validationRule: string; // JSON schema or custom validation logic
  enforcementLevel: EnforcementLevel;
  createdAt: Date;
}

export interface ComplianceViolation {
  id: string;
  policyId: string;
  policy?: CompliancePolicy;
  leadId?: string;
  agentId?: string;
  violationType: string;
  severity: Severity;
  status: ViolationStatus;
  description: string;
  detectedAt: Date;
  resolvedAt?: Date;
  resolution?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ComplianceAuditLog {
  id: string;
  userId: string;
  action: string;
  entityType: string;
  entityId: string;
  changes: Record<string, any>;
  compliancePolicies?: string; // JSON array of policies involved
  ipAddress?: string;
  userAgent?: string;
  timestamp: Date; // Immutable
  createdAt: Date;
}

export interface ComplianceStatus {
  id?: string;
  domain: ComplianceDomain;
  jurisdiction?: Jurisdiction;
  totalPolicies: number;
  activePolicies: number;
  openViolations: number;
  resolvedViolations: number;
  complianceScore: number; // 0-100
  lastAssessment: Date;
  nextAssessment: Date;
  updatedAt: Date;
}

export interface DataSubjectRequest {
  id: string;
  leadId: string;
  requestType: DSARType;
  jurisdiction: string;
  status: DSARStatus;
  requestDate: Date;
  dueDate: Date;
  completionDate?: Date;
  documents: string[]; // JSON array of document paths for fulfillment
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface RegulatoryRequirement {
  id: string;
  domain: ComplianceDomain;
  jurisdiction: Jurisdiction;
  requirement: string; // Specific requirement text
  description?: string;
  status: RequirementStatus;
  implementedDate?: Date;
  lastVerified?: Date;
  verificationNotes?: string;
  createdAt: Date;
  updatedAt: Date;
}

// API Request/Response Types
export interface CreatePolicyRequest {
  name: string;
  description?: string;
  domain: ComplianceDomain;
  jurisdiction?: Jurisdiction;
  riskLevel: RiskLevel;
  status?: PolicyStatus;
  requirements: CreateRequiredFieldRequest[];
}

export interface CreateRequiredFieldRequest {
  name: string;
  description?: string;
  validationRule: string;
  enforcementLevel: EnforcementLevel;
}

export interface UpdatePolicyRequest extends Partial<CreatePolicyRequest> {
  id: string;
}

export interface ComplianceViolationFilter {
  policyId?: string;
  leadId?: string;
  agentId?: string;
  severity?: Severity;
  status?: ViolationStatus;
  dateFrom?: Date;
  dateTo?: Date;
}

export interface ComplianceAuditLogFilter {
  userId?: string;
  entityId?: string;
  action?: string;
  entityType?: string;
  dateFrom?: Date;
  dateTo?: Date;
  limit?: number;
  offset?: number;
}

export interface ComplianceReportRequest {
  domain?: ComplianceDomain;
  jurisdiction?: Jurisdiction;
  dateFrom: Date;
  dateTo: Date;
  includeViolations?: boolean;
  includeAuditLogs?: boolean;
  format?: 'json' | 'csv' | 'pdf';
}

export interface ComplianceReport {
  domain: ComplianceDomain;
  jurisdiction?: Jurisdiction;
  period: {
    from: Date;
    to: Date;
  };
  summary: {
    totalPolicies: number;
    activePolicies: number;
    totalViolations: number;
    openViolations: number;
    resolvedViolations: number;
    complianceScore: number;
  };
  violations: ComplianceViolation[];
  auditLogs: ComplianceAuditLog[];
  generatedAt: Date;
}

// Policy Validation Types
export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

export interface ValidationError {
  field: string;
  message: string;
  code: string;
}

export interface ValidationWarning {
  field: string;
  message: string;
  suggestion?: string;
}

export interface PolicyEvaluationContext {
  entityId: string;
  entityType: 'Lead' | 'Agent' | 'Document' | 'User';
  data: Record<string, any>;
  userId: string;
  jurisdiction?: Jurisdiction;
  timestamp: Date;
}

export interface PolicyEvaluationResult {
  policyId: string;
  policyName: string;
  isCompliant: boolean;
  violations: string[];
  warnings: string[];
  score: number; // 0-100 compliance score for this policy
}

// Service Interfaces
export interface IComplianceService {
  validateLeadCompliance(leadData: any): Promise<ValidationResult>;
  registerPolicy(policyConfig: CreatePolicyRequest): Promise<CompliancePolicy>;
  getPoliciesByDomain(domain: ComplianceDomain): Promise<CompliancePolicy[]>;
  checkViolations(entityType: string, entityId: string): Promise<ComplianceViolation[]>;
  getComplianceScore(): Promise<number>;
  generateComplianceReport(request: ComplianceReportRequest): Promise<ComplianceReport>;
  archivePolicy(policyId: string): Promise<void>;
  evaluatePolicy(policyId: string, context: PolicyEvaluationContext): Promise<PolicyEvaluationResult>;
}

export interface ICompliancePolicyEngine {
  validateData(data: any, validationRules: string): Promise<ValidationResult>;
  evaluatePolicies(policies: CompliancePolicy[], context: PolicyEvaluationContext): Promise<PolicyEvaluationResult[]>;
  applyOverrides(policyId: string, context: PolicyEvaluationContext): Promise<boolean>;
  calculateComplianceScore(violations: ComplianceViolation[]): number;
}

export interface IAuditTrailService {
  logAction(
    userId: string,
    action: string,
    entityType: string,
    entityId: string,
    changes: Record<string, any>,
    compliancePolicies?: string[]
  ): Promise<void>;
  getAuditTrail(filters: ComplianceAuditLogFilter): Promise<ComplianceAuditLog[]>;
  generateAuditReport(dateRange: { from: Date; to: Date }): Promise<ComplianceAuditLog[]>;
  validateAuditIntegrity(): Promise<boolean>;
}

export interface IComplianceMonitoringService {
  scanLeadsForViolations(): Promise<ComplianceViolation[]>;
  monitorPolicyCompliance(policyId: string): Promise<ComplianceStatus>;
  detectAnomalies(): Promise<any[]>;
  alertOnViolation(violation: ComplianceViolation): Promise<void>;
  generateComplianceTrends(): Promise<any[]>;
}

// Database-specific types
export interface CompliancePolicyDb {
  id: string;
  name: string;
  description: string | null;
  domain: string;
  jurisdiction: string | null;
  riskLevel: string;
  status: string;
  createdAt: Date;
  updatedAt: Date;
  requirements: RequiredFieldDb[];
  violations: ComplianceViolationDb[];
}

export interface RequiredFieldDb {
  id: string;
  policyId: string;
  name: string;
  description: string | null;
  validationRule: string;
  enforcementLevel: string;
  createdAt: Date;
}

export interface ComplianceViolationDb {
  id: string;
  policyId: string;
  leadId: string | null;
  agentId: string | null;
  violationType: string;
  severity: string;
  status: string;
  description: string;
  detectedAt: Date;
  resolvedAt: Date | null;
  resolution: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ComplianceAuditLogDb {
  id: string;
  userId: string;
  action: string;
  entityType: string;
  entityId: string;
  changes: string;
  compliancePolicies: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  timestamp: Date;
  createdAt: Date;
}

export interface ComplianceStatusDb {
  id: string;
  domain: string;
  jurisdiction: string | null;
  totalPolicies: number;
  activePolicies: number;
  openViolations: number;
  resolvedViolations: number;
  complianceScore: number;
  lastAssessment: Date;
  nextAssessment: Date;
  updatedAt: Date;
}

export interface DataSubjectRequestDb {
  id: string;
  leadId: string;
  requestType: string;
  jurisdiction: string;
  status: string;
  requestDate: Date;
  dueDate: Date;
  completionDate: Date | null;
  documents: string[];
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface RegulatoryRequirementDb {
  id: string;
  domain: string;
  jurisdiction: string;
  requirement: string;
  description: string | null;
  status: string;
  implementedDate: Date | null;
  lastVerified: Date | null;
  verificationNotes: string | null;
  createdAt: Date;
  updatedAt: Date;
}