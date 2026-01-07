-- Phase 25.1F: Regulatory Reporting & Submissions

-- CreateTable
CREATE TABLE "ComplianceReport" (
    "id" TEXT NOT NULL,
    "reportId" TEXT NOT NULL,
    "reportType" TEXT NOT NULL,
    "jurisdiction" TEXT NOT NULL,
    "reportPeriod" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "reportContent" TEXT NOT NULL,
    "attachments" TEXT[] NOT NULL,
    "metrics" TEXT NOT NULL,
    "keyFindings" TEXT[] NOT NULL,
    "violations" INTEGER NOT NULL DEFAULT 0,
    "violations_critical" INTEGER NOT NULL DEFAULT 0,
    "violations_high" INTEGER NOT NULL DEFAULT 0,
    "violations_medium" INTEGER NOT NULL DEFAULT 0,
    "violations_low" INTEGER NOT NULL DEFAULT 0,
    "remediationActions" TEXT,
    "completedRemediation" INTEGER NOT NULL DEFAULT 0,
    "pendingRemediation" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL,
    "generatedDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "approvedDate" TIMESTAMP(3),
    "approvedBy" TEXT,
    "submittedDate" TIMESTAMP(3),
    "submittedTo" TEXT,
    "submissionRef" TEXT,
    "generateType" TEXT NOT NULL,
    "generatedBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ComplianceReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RegulatorySubmission" (
    "id" TEXT NOT NULL,
    "submissionId" TEXT NOT NULL,
    "reportId" TEXT NOT NULL,
    "reportType" TEXT NOT NULL,
    "regulatoryBody" TEXT NOT NULL,
    "jurisdiction" TEXT NOT NULL,
    "submissionUrl" TEXT NOT NULL,
    "submissionMethod" TEXT NOT NULL,
    "submissionDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" TEXT NOT NULL,
    "referenceNumber" TEXT,
    "acknowledgmentDate" TIMESTAMP(3),
    "acknowledgmentDocument" TEXT,
    "regulatoryResponse" TEXT,
    "responseDate" TIMESTAMP(3),
    "requiredActions" TEXT,
    "deadline" TIMESTAMP(3),
    "submittedBy" TEXT NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RegulatorySubmission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DataBreachNotification" (
    "id" TEXT NOT NULL,
    "breachId" TEXT NOT NULL,
    "breachDate" TIMESTAMP(3) NOT NULL,
    "discoveryDate" TIMESTAMP(3) NOT NULL,
    "breachType" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "affectedDataTypes" TEXT[] NOT NULL,
    "affectedRecords" INTEGER NOT NULL,
    "affectedIndividuals" INTEGER NOT NULL,
    "systemsAffected" TEXT[] NOT NULL,
    "severity" TEXT NOT NULL,
    "potentialHarm" TEXT NOT NULL,
    "remediation" TEXT NOT NULL,
    "preventionMeasures" TEXT,
    "notificationSent" BOOLEAN NOT NULL DEFAULT false,
    "notificationDate" TIMESTAMP(3),
    "notificationMethod" TEXT,
    "templateUsed" TEXT,
    "individualsNotified" INTEGER NOT NULL DEFAULT 0,
    "regulatorNotified" BOOLEAN NOT NULL DEFAULT false,
    "regulatorNotificationDate" TIMESTAMP(3),
    "regulators" TEXT[] NOT NULL,
    "regulatoryRef" TEXT,
    "filingRequired" BOOLEAN NOT NULL DEFAULT true,
    "investigationStart" TIMESTAMP(3),
    "investigationComplete" TIMESTAMP(3),
    "rootCause" TEXT,
    "investigationNotes" TEXT,
    "resolutionDate" TIMESTAMP(3),
    "status" TEXT NOT NULL,
    "complianceRequirements" TEXT[] NOT NULL,
    "legalCounsel" TEXT,
    "insuranceClaim" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DataBreachNotification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BreachNotificationRecipient" (
    "id" TEXT NOT NULL,
    "breachId" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "mailingAddress" TEXT,
    "notificationSent" BOOLEAN NOT NULL DEFAULT false,
    "notificationMethod" TEXT,
    "notificationDate" TIMESTAMP(3),
    "readDate" TIMESTAMP(3),
    "responseDate" TIMESTAMP(3),
    "acknowledged" BOOLEAN NOT NULL DEFAULT false,
    "proof" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BreachNotificationRecipient_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RegulatoryReportTemplate" (
    "id" TEXT NOT NULL,
    "templateName" TEXT NOT NULL,
    "jurisdiction" TEXT NOT NULL,
    "reportType" TEXT NOT NULL,
    "description" TEXT,
    "sections" TEXT NOT NULL,
    "requiredMetrics" TEXT[] NOT NULL,
    "formatRequirements" TEXT,
    "frequency" TEXT NOT NULL,
    "dueDate" TEXT,
    "regulatoryBody" TEXT NOT NULL,
    "contactInfo" TEXT,
    "submissionURL" TEXT,
    "submissionEmail" TEXT,
    "status" TEXT NOT NULL DEFAULT 'Active',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RegulatoryReportTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScheduledReport" (
    "id" TEXT NOT NULL,
    "reportType" TEXT NOT NULL,
    "jurisdiction" TEXT NOT NULL,
    "schedule" TEXT NOT NULL,
    "frequency" TEXT NOT NULL,
    "nextRunDate" TIMESTAMP(3) NOT NULL,
    "lastRunDate" TIMESTAMP(3),
    "autoGenerate" BOOLEAN NOT NULL DEFAULT true,
    "autoSubmit" BOOLEAN NOT NULL DEFAULT false,
    "requireApproval" BOOLEAN NOT NULL DEFAULT true,
    "notifyOn" TEXT[] NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'Active',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ScheduledReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RegulatoryFilingChecklist" (
    "id" TEXT NOT NULL,
    "filingId" TEXT NOT NULL,
    "reportType" TEXT NOT NULL,
    "jurisdiction" TEXT NOT NULL,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "items" TEXT NOT NULL,
    "completionStatus" INTEGER NOT NULL,
    "status" TEXT NOT NULL,
    "submittedDate" TIMESTAMP(3),
    "notes" TEXT,
    "assignedTo" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RegulatoryFilingChecklist_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RegulatoryFilingArchive" (
    "id" TEXT NOT NULL,
    "filingId" TEXT NOT NULL,
    "reportId" TEXT NOT NULL,
    "reportType" TEXT NOT NULL,
    "jurisdiction" TEXT NOT NULL,
    "filingYear" INTEGER NOT NULL,
    "archivedDate" TIMESTAMP(3) NOT NULL,
    "archiveLocation" TEXT NOT NULL,
    "retention" TEXT NOT NULL,
    "retentionExpiry" TIMESTAMP(3),
    "checksum" TEXT NOT NULL,
    "retrievalInstructions" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RegulatoryFilingArchive_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RegulatoryDeadline" (
    "id" TEXT NOT NULL,
    "deadlineId" TEXT NOT NULL,
    "reportType" TEXT NOT NULL,
    "jurisdiction" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "reminderDates" TIMESTAMP(3)[] NOT NULL,
    "isRecurring" BOOLEAN NOT NULL DEFAULT false,
    "recurrencePattern" TEXT,
    "status" TEXT NOT NULL DEFAULT 'Upcoming',
    "completionDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RegulatoryDeadline_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ComplianceReportMetrics" (
    "id" TEXT NOT NULL,
    "reportId" TEXT NOT NULL,
    "metricType" TEXT NOT NULL,
    "data" TEXT NOT NULL,
    "trend" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ComplianceReportMetrics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RegulatoryCommLog" (
    "id" TEXT NOT NULL,
    "commId" TEXT NOT NULL,
    "regulatoryBody" TEXT NOT NULL,
    "jurisdiction" TEXT NOT NULL,
    "commType" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "sentDate" TIMESTAMP(3) NOT NULL,
    "sentBy" TEXT NOT NULL,
    "sentTo" TEXT NOT NULL,
    "deliveryProof" TEXT,
    "responseReceived" BOOLEAN NOT NULL DEFAULT false,
    "responseDate" TIMESTAMP(3),
    "responseContent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RegulatoryCommLog_pkey" PRIMARY KEY ("id")
);

-- Indexes & Constraints
CREATE UNIQUE INDEX "ComplianceReport_reportId_key" ON "ComplianceReport"("reportId");
CREATE INDEX "ComplianceReport_reportType_idx" ON "ComplianceReport"("reportType");
CREATE INDEX "ComplianceReport_jurisdiction_idx" ON "ComplianceReport"("jurisdiction");
CREATE INDEX "ComplianceReport_status_idx" ON "ComplianceReport"("status");
CREATE INDEX "ComplianceReport_startDate_idx" ON "ComplianceReport"("startDate");

CREATE UNIQUE INDEX "RegulatorySubmission_submissionId_key" ON "RegulatorySubmission"("submissionId");
CREATE INDEX "RegulatorySubmission_status_idx" ON "RegulatorySubmission"("status");
CREATE INDEX "RegulatorySubmission_submissionDate_idx" ON "RegulatorySubmission"("submissionDate");

CREATE UNIQUE INDEX "DataBreachNotification_breachId_key" ON "DataBreachNotification"("breachId");
CREATE INDEX "DataBreachNotification_breachDate_idx" ON "DataBreachNotification"("breachDate");
CREATE INDEX "DataBreachNotification_status_idx" ON "DataBreachNotification"("status");

CREATE UNIQUE INDEX "BreachNotificationRecipient_breachId_leadId_key" ON "BreachNotificationRecipient"("breachId", "leadId");

CREATE UNIQUE INDEX "RegulatoryReportTemplate_templateName_key" ON "RegulatoryReportTemplate"("templateName");

CREATE UNIQUE INDEX "ScheduledReport_reportType_jurisdiction_key" ON "ScheduledReport"("reportType", "jurisdiction");

CREATE UNIQUE INDEX "RegulatoryFilingChecklist_filingId_key" ON "RegulatoryFilingChecklist"("filingId");

CREATE UNIQUE INDEX "RegulatoryFilingArchive_filingId_key" ON "RegulatoryFilingArchive"("filingId");

CREATE UNIQUE INDEX "RegulatoryDeadline_deadlineId_key" ON "RegulatoryDeadline"("deadlineId");
CREATE INDEX "RegulatoryDeadline_dueDate_idx" ON "RegulatoryDeadline"("dueDate");

CREATE UNIQUE INDEX "RegulatoryCommLog_commId_key" ON "RegulatoryCommLog"("commId");
CREATE INDEX "RegulatoryCommLog_sentDate_idx" ON "RegulatoryCommLog"("sentDate");

-- Foreign keys
ALTER TABLE "RegulatorySubmission" ADD CONSTRAINT "RegulatorySubmission_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "ComplianceReport"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ComplianceReportMetrics" ADD CONSTRAINT "ComplianceReportMetrics_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "ComplianceReport"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RegulatoryFilingArchive" ADD CONSTRAINT "RegulatoryFilingArchive_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "ComplianceReport"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BreachNotificationRecipient" ADD CONSTRAINT "BreachNotificationRecipient_breachId_fkey" FOREIGN KEY ("breachId") REFERENCES "DataBreachNotification"("breachId") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BreachNotificationRecipient" ADD CONSTRAINT "BreachNotificationRecipient_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;
