-- Migration: Add Compliance Framework
-- Description: Create comprehensive compliance framework tables for GDPR, HIPAA, CCPA, GLBA, and Insurance regulations

-- Compliance Policies and Rules
CREATE TABLE IF NOT EXISTS "CompliancePolicy" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "domain" TEXT NOT NULL,
    "jurisdiction" TEXT,
    "riskLevel" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'Active',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CompliancePolicy_pkey" PRIMARY KEY ("id")
);

-- Required Fields for Policies
CREATE TABLE IF NOT EXISTS "RequiredField" (
    "id" TEXT NOT NULL,
    "policyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "validationRule" TEXT NOT NULL,
    "enforcementLevel" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RequiredField_pkey" PRIMARY KEY ("id")
);

-- Compliance Violations
CREATE TABLE IF NOT EXISTS "ComplianceViolation" (
    "id" TEXT NOT NULL,
    "policyId" TEXT NOT NULL,
    "leadId" TEXT,
    "agentId" TEXT,
    "violationType" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'Open',
    "description" TEXT NOT NULL,
    "detectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),
    "resolution" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ComplianceViolation_pkey" PRIMARY KEY ("id")
);

-- Immutable Audit Trail
CREATE TABLE IF NOT EXISTS "ComplianceAuditLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "changes" TEXT NOT NULL,
    "compliancePolicies" TEXT,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ComplianceAuditLog_pkey" PRIMARY KEY ("id")
);

-- Compliance Status Dashboard
CREATE TABLE IF NOT EXISTS "ComplianceStatus" (
    "id" TEXT NOT NULL,
    "domain" TEXT NOT NULL,
    "jurisdiction" TEXT,
    "totalPolicies" INTEGER NOT NULL,
    "activePolicies" INTEGER NOT NULL,
    "openViolations" INTEGER NOT NULL,
    "resolvedViolations" INTEGER NOT NULL,
    "complianceScore" DOUBLE PRECISION NOT NULL,
    "lastAssessment" TIMESTAMP(3) NOT NULL,
    "nextAssessment" TIMESTAMP(3) NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ComplianceStatus_pkey" PRIMARY KEY ("id")
);

-- Data Subject Requests (GDPR DSAR, CCPA)
CREATE TABLE IF NOT EXISTS "DataSubjectRequest" (
    "id" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "requestType" TEXT NOT NULL,
    "jurisdiction" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'Pending',
    "requestDate" TIMESTAMP(3) NOT NULL,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "completionDate" TIMESTAMP(3),
    "documents" TEXT[],
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DataSubjectRequest_pkey" PRIMARY KEY ("id")
);

-- Regulatory Requirements
CREATE TABLE IF NOT EXISTS "RegulatoryRequirement" (
    "id" TEXT NOT NULL,
    "domain" TEXT NOT NULL,
    "jurisdiction" TEXT NOT NULL,
    "requirement" TEXT NOT NULL,
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'NotStarted',
    "implementedDate" TIMESTAMP(3),
    "lastVerified" TIMESTAMP(3),
    "verificationNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RegulatoryRequirement_pkey" PRIMARY KEY ("id")
);

-- Indexes for Performance

-- Compliance Policy Indexes
CREATE INDEX IF NOT EXISTS "CompliancePolicy_domain_idx" ON "CompliancePolicy"("domain");
CREATE INDEX IF NOT EXISTS "CompliancePolicy_jurisdiction_idx" ON "CompliancePolicy"("jurisdiction");
CREATE INDEX IF NOT EXISTS "CompliancePolicy_status_idx" ON "CompliancePolicy"("status");

-- Required Field Indexes
CREATE INDEX IF NOT EXISTS "RequiredField_policyId_idx" ON "RequiredField"("policyId");

-- Compliance Violation Indexes
CREATE INDEX IF NOT EXISTS "ComplianceViolation_policyId_idx" ON "ComplianceViolation"("policyId");
CREATE INDEX IF NOT EXISTS "ComplianceViolation_leadId_idx" ON "ComplianceViolation"("leadId");
CREATE INDEX IF NOT EXISTS "ComplianceViolation_agentId_idx" ON "ComplianceViolation"("agentId");
CREATE INDEX IF NOT EXISTS "ComplianceViolation_severity_idx" ON "ComplianceViolation"("severity");
CREATE INDEX IF NOT EXISTS "ComplianceViolation_status_idx" ON "ComplianceViolation"("status");
CREATE INDEX IF NOT EXISTS "ComplianceViolation_detectedAt_idx" ON "ComplianceViolation"("detectedAt");

-- Compliance Audit Log Indexes
CREATE INDEX IF NOT EXISTS "ComplianceAuditLog_userId_idx" ON "ComplianceAuditLog"("userId");
CREATE INDEX IF NOT EXISTS "ComplianceAuditLog_entityId_idx" ON "ComplianceAuditLog"("entityId");
CREATE INDEX IF NOT EXISTS "ComplianceAuditLog_timestamp_idx" ON "ComplianceAuditLog"("timestamp");
CREATE INDEX IF NOT EXISTS "ComplianceAuditLog_action_idx" ON "ComplianceAuditLog"("action");

-- Compliance Status Indexes
CREATE INDEX IF NOT EXISTS "ComplianceStatus_domain_idx" ON "ComplianceStatus"("domain");
CREATE INDEX IF NOT EXISTS "ComplianceStatus_jurisdiction_idx" ON "ComplianceStatus"("jurisdiction");

-- Data Subject Request Indexes
CREATE INDEX IF NOT EXISTS "DataSubjectRequest_leadId_idx" ON "DataSubjectRequest"("leadId");
CREATE INDEX IF NOT EXISTS "DataSubjectRequest_status_idx" ON "DataSubjectRequest"("status");
CREATE INDEX IF NOT EXISTS "DataSubjectRequest_requestDate_idx" ON "DataSubjectRequest"("requestDate");
CREATE INDEX IF NOT EXISTS "DataSubjectRequest_jurisdiction_idx" ON "DataSubjectRequest"("jurisdiction");

-- Regulatory Requirement Indexes
CREATE INDEX IF NOT EXISTS "RegulatoryRequirement_domain_idx" ON "RegulatoryRequirement"("domain");
CREATE INDEX IF NOT EXISTS "RegulatoryRequirement_jurisdiction_idx" ON "RegulatoryRequirement"("jurisdiction");
CREATE INDEX IF NOT EXISTS "RegulatoryRequirement_status_idx" ON "RegulatoryRequirement"("status");

-- Foreign Key Constraints

-- RequiredField -> CompliancePolicy
ALTER TABLE "RequiredField" ADD CONSTRAINT "RequiredField_policyId_fkey" 
    FOREIGN KEY ("policyId") REFERENCES "CompliancePolicy"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ComplianceViolation -> CompliancePolicy
ALTER TABLE "ComplianceViolation" ADD CONSTRAINT "ComplianceViolation_policyId_fkey" 
    FOREIGN KEY ("policyId") REFERENCES "CompliancePolicy"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Comments for Documentation

COMMENT ON TABLE "CompliancePolicy" IS 'Main compliance policies for GDPR, HIPAA, CCPA, GLBA, Insurance regulations';
COMMENT ON TABLE "RequiredField" IS 'Required fields and validation rules for each compliance policy';
COMMENT ON TABLE "ComplianceViolation" IS 'Track compliance violations detected in the system';
COMMENT ON TABLE "ComplianceAuditLog" IS 'Immutable audit trail for all compliance-related actions';
COMMENT ON TABLE "ComplianceStatus" IS 'Dashboard data for compliance status tracking';
COMMENT ON TABLE "DataSubjectRequest" IS 'GDPR DSAR and CCPA data subject requests';
COMMENT ON TABLE "RegulatoryRequirement" IS 'Track implementation status of regulatory requirements';

COMMENT ON COLUMN "CompliancePolicy.domain" IS 'Compliance domain: GDPR, HIPAA, CCPA, GLBA, Insurance, Other';
COMMENT ON COLUMN "CompliancePolicy.jurisdiction" IS 'Geographic jurisdiction: EU, US, CA, NY, TX, FL, State, Federal, International';
COMMENT ON COLUMN "CompliancePolicy.riskLevel" IS 'Risk level: Critical, High, Medium, Low';
COMMENT ON COLUMN "CompliancePolicy.status" IS 'Policy status: Active, Draft, Archived';
COMMENT ON COLUMN "RequiredField.enforcementLevel" IS 'Enforcement level: Mandatory, Recommended';
COMMENT ON COLUMN "ComplianceViolation.severity" IS 'Violation severity: Critical, High, Medium, Low';
COMMENT ON COLUMN "ComplianceViolation.status" IS 'Violation status: Open, Resolved, Waived';
COMMENT ON COLUMN "ComplianceAuditLog.timestamp" IS 'Immutable timestamp for audit trail integrity';
COMMENT ON COLUMN "DataSubjectRequest.requestType" IS 'Request type: AccessRequest, DeletionRequest, PortabilityRequest, CorrectionRequest';
COMMENT ON COLUMN "DataSubjectRequest.status" IS 'Request status: Pending, InProgress, Completed, Denied';
COMMENT ON COLUMN "RegulatoryRequirement.status" IS 'Implementation status: NotStarted, InProgress, Completed';