// Type definitions for compliance audit and validation

export enum ComplianceDomain {
  REGULATORY = 'regulatory',
  DATA_PRIVACY = 'data_privacy',
  FINANCIAL = 'financial',
  SECURITY = 'security',
  THIRD_PARTY = 'third_party',
  AUDIT_TRAIL = 'audit_trail',
}

export enum ComplianceStatus {
  COMPLIANT = 'compliant',
  NON_COMPLIANT = 'non_compliant',
  PARTIAL = 'partial',
  NOT_APPLICABLE = 'not_applicable',
  UNDER_REVIEW = 'under_review',
}

export enum ComplianceSeverity {
  CRITICAL = 'critical',
  HIGH = 'high',
  MEDIUM = 'medium',
  LOW = 'low',
  INFO = 'info',
}

export enum RegulationType {
  HIPAA = 'hipaa',
  GDPR = 'gdpr',
  CCPA = 'ccpa',
  SOX = 'sox',
  INSURANCE_STATE = 'insurance_state',
  INSURANCE_FEDERAL = 'insurance_federal',
  PCI_DSS = 'pci_dss',
}

export interface ComplianceRequirement {
  id: string;
  title: string;
  description: string;
  regulationType: RegulationType;
  domain: ComplianceDomain;
  severity: ComplianceSeverity;
  evidenceRequired: string[];
  controls: string[];
  testing: string[];
  documentation: string[];
}

export interface ComplianceFinding {
  id: string;
  requirementId: string;
  title: string;
  description: string;
  status: ComplianceStatus;
  severity: ComplianceSeverity;
  domain: ComplianceDomain;
  evidence: EvidenceRecord[];
  impact: string;
  recommendation: string;
  remediation: RemediationAction;
  discoveredAt: Date;
  validatedAt?: Date;
  verifiedAt?: Date;
}

export interface EvidenceRecord {
  id: string;
  type: 'document' | 'screenshot' | 'log' | 'configuration' | 'test' | 'code';
  description: string;
  location: string;
  timestamp: Date;
  valid: boolean;
  notes?: string;
}

export interface RemediationAction {
  id: string;
  title: string;
  description: string;
  owner: string;
  priority: ComplianceSeverity;
  status: 'pending' | 'in_progress' | 'completed' | 'deferred';
  dueDate?: Date;
  completedAt?: Date;
  verification?: VerificationRecord;
}

export interface VerificationRecord {
  verifiedBy: string;
  verifiedAt: Date;
  method: string;
  evidence: string[];
  result: ComplianceStatus;
  notes?: string;
}

export interface ComplianceReport {
  id: string;
  title: string;
  generatedAt: Date;
  reportingPeriod: {
    from: Date;
    to: Date;
  };
  summary: ComplianceSummary;
  findings: ComplianceFinding[];
  recommendations: string[];
  executiveSummary: string;
  nextSteps: string[];
}

export interface ComplianceSummary {
  totalRequirements: number;
  compliant: number;
  nonCompliant: number;
  partial: number;
  notApplicable: number;
  overallScore: number;
  criticalIssues: number;
  highIssues: number;
  mediumIssues: number;
  lowIssues: number;
}

export interface AuditTrailEntry {
  id: string;
  eventType: string;
  userId: string;
  userName: string;
  action: string;
  resource: string;
  resourceId?: string;
  timestamp: Date;
  ipAddress: string;
  userAgent: string;
  success: boolean;
  details?: Record<string, any>;
}

export interface ThirdPartyVendor {
  id: string;
  name: string;
  type: 'processor' | 'analytics' | 'cloud' | 'payment' | 'other';
  dataAccess: boolean;
  dataTypes: string[];
  contractStatus: 'active' | 'pending' | 'expired' | 'terminated';
  complianceCertifications: string[];
  riskLevel: ComplianceSeverity;
  lastAssessmentDate?: Date;
  nextAssessmentDate?: Date;
  contactInfo: {
    name: string;
    email: string;
    phone: string;
  };
}

export interface DataPrivacyAssessment {
  subjectTypes: string[];
  dataCategories: string[];
  processingPurposes: string[];
  legalBasis: string[];
  retentionPeriods: Record<string, number>;
  crossBorderTransfers: boolean;
  transferMechanisms: string[];
  dataSubjectRights: boolean;
  consentMechanism: boolean;
  automatedDecisionMaking: boolean;
  privacyImpactLevel: ComplianceSeverity;
}

export interface FinancialControl {
  id: string;
  name: string;
  description: string;
  controlType: 'preventive' | 'detective' | 'corrective';
  effectiveness: ComplianceStatus;
  testing: string;
  frequency: string;
  owner: string;
  evidence: EvidenceRecord[];
}

export interface RegulatoryMapping {
  regulation: RegulationType;
  requirements: string[];
  controls: string[];
  gaps: string[];
  actionItems: RemediationAction[];
}