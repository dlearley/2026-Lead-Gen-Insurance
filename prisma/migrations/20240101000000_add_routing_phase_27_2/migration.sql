-- Migration: Add Routing Tables (Phase 27.2)

-- Agent Specializations
CREATE TABLE IF NOT EXISTS "AgentSpecialization" (
    "id" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "insuranceLine" TEXT NOT NULL,
    "customerSegment" TEXT NOT NULL,
    "proficiencyLevel" INTEGER NOT NULL DEFAULT 1,
    "maxConcurrentLeads" INTEGER NOT NULL DEFAULT 5,
    "languages" JSONB NOT NULL,
    "territories" JSONB NOT NULL,
    "isEliteAgent" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AgentSpecialization_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "AgentSpecialization_agentId_insuranceLine_customerSegment_key" ON "AgentSpecialization"("agentId", "insuranceLine", "customerSegment");
CREATE INDEX IF NOT EXISTS "AgentSpecialization_agentId_idx" ON "AgentSpecialization"("agentId");
CREATE INDEX IF NOT EXISTS "AgentSpecialization_insuranceLine_idx" ON "AgentSpecialization"("insuranceLine");
CREATE INDEX IF NOT EXISTS "AgentSpecialization_customerSegment_idx" ON "AgentSpecialization"("customerSegment");

-- Agent Availability
CREATE TABLE IF NOT EXISTS "AgentAvailability" (
    "id" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'Available',
    "currentLoad" INTEGER NOT NULL DEFAULT 0,
    "maxCapacity" INTEGER NOT NULL,
    "lastUpdated" TIMESTAMP(3) NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AgentAvailability_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "AgentAvailability_agentId_key" UNIQUE ("agentId")
);

CREATE INDEX IF NOT EXISTS "AgentAvailability_agentId_idx" ON "AgentAvailability"("agentId");
CREATE INDEX IF NOT EXISTS "AgentAvailability_status_currentLoad_idx" ON "AgentAvailability"("status", "currentLoad");

-- Lead Routing History
CREATE TABLE IF NOT EXISTS "LeadRoutingHistory" (
    "id" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "assignedAgentId" TEXT NOT NULL,
    "routingStrategy" TEXT NOT NULL DEFAULT 'greedy',
    "leadScore" DOUBLE PRECISION NOT NULL,
    "assignmentReason" JSONB NOT NULL,
    "routingTimestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "assignmentDurationHours" DOUBLE PRECISION,
    "conversionOutcome" BOOLEAN,
    "assignmentQualityScore" DOUBLE PRECISION,
    "feedback" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LeadRoutingHistory_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "LeadRoutingHistory_leadId_idx" ON "LeadRoutingHistory"("leadId");
CREATE INDEX IF NOT EXISTS "LeadRoutingHistory_assignedAgentId_idx" ON "LeadRoutingHistory"("assignedAgentId");
CREATE INDEX IF NOT EXISTS "LeadRoutingHistory_routingTimestamp_idx" ON "LeadRoutingHistory"("routingTimestamp");

-- Agent Performance Metrics
CREATE TABLE IF NOT EXISTS "AgentPerformanceMetrics" (
    "id" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "periodDate" TIMESTAMP(3) NOT NULL,
    "leadsAssigned" INTEGER NOT NULL DEFAULT 0,
    "leadsConverted" INTEGER NOT NULL DEFAULT 0,
    "conversionRate" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "avgHandlingTimeMinutes" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "customerSatisfactionRating" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "crossSellRate" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "upsellRate" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "repeatCustomerRate" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "avgLeadScore" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "tier1ConversionRate" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "tier2ConversionRate" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "tier3ConversionRate" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AgentPerformanceMetrics_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "AgentPerformanceMetrics_agentId_periodDate_key" ON "AgentPerformanceMetrics"("agentId", "periodDate");
CREATE INDEX IF NOT EXISTS "AgentPerformanceMetrics_agentId_periodDate_idx" ON "AgentPerformanceMetrics"("agentId", "periodDate" DESC);

-- Routing Experiments
CREATE TABLE IF NOT EXISTS "RoutingExperiment" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "strategyType" TEXT NOT NULL,
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "trafficPercentage" DOUBLE PRECISION NOT NULL DEFAULT 50.0,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "controlStrategyId" TEXT,
    "successMetric" TEXT NOT NULL DEFAULT 'conversion_rate',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RoutingExperiment_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "RoutingExperiment_controlStrategyId_fkey" FOREIGN KEY ("controlStrategyId") REFERENCES "RoutingExperiment"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "RoutingExperiment_status_idx" ON "RoutingExperiment"("status");
CREATE INDEX IF NOT EXISTS "RoutingExperiment_startDate_endDate_idx" ON "RoutingExperiment"("startDate", "endDate");

-- Routing Experiment Variants
CREATE TABLE IF NOT EXISTS "RoutingExperimentVariant" (
    "id" TEXT NOT NULL,
    "experimentId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "strategy" TEXT NOT NULL,
    "parameters" JSONB NOT NULL,
    "trafficAllocation" DOUBLE PRECISION NOT NULL DEFAULT 50.0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RoutingExperimentVariant_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "RoutingExperimentVariant_experimentId_idx" ON "RoutingExperimentVariant"("experimentId");

-- Lead Experiment Assignments
CREATE TABLE IF NOT EXISTS "LeadExperimentAssignment" (
    "id" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "experimentId" TEXT NOT NULL,
    "variantId" TEXT NOT NULL,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LeadExperimentAssignment_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "LeadExperimentAssignment_leadId_key" UNIQUE ("leadId")
);

CREATE INDEX IF NOT EXISTS "LeadExperimentAssignment_leadId_idx" ON "LeadExperimentAssignment"("leadId");
CREATE INDEX IF NOT EXISTS "LeadExperimentAssignment_experimentId_variantId_idx" ON "LeadExperimentAssignment"("experimentId", "variantId");

-- Assignment Queues
CREATE TABLE IF NOT EXISTS "AssignmentQueue" (
    "id" TEXT NOT NULL,
    "queueType" TEXT NOT NULL DEFAULT 'active',
    "leadId" TEXT NOT NULL,
    "leadScore" DOUBLE PRECISION NOT NULL,
    "timeInQueue" INTERVAL NOT NULL DEFAULT '0 seconds',
    "assignmentAttempts" INTEGER NOT NULL DEFAULT 0,
    "lastAttempted" TIMESTAMP(3),
    "estimatedWaitMinutes" INTEGER NOT NULL,
    "slaExpiry" TIMESTAMP(3),
    "queuePosition" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AssignmentQueue_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "AssignmentQueue_leadId_key" UNIQUE ("leadId")
);

CREATE INDEX IF NOT EXISTS "AssignmentQueue_queueType_leadScore_idx" ON "AssignmentQueue"("queueType", "leadScore" DESC);
CREATE INDEX IF NOT EXISTS "AssignmentQueue_slaExpiry_idx" ON "AssignmentQueue"("slaExpiry");

-- Routing Rules
CREATE TABLE IF NOT EXISTS "RoutingRule" (
    "id" TEXT NOT NULL,
    "ruleName" TEXT NOT NULL,
    "ruleType" TEXT NOT NULL,
    "condition" JSONB NOT NULL,
    "action" TEXT NOT NULL,
    "priority" INTEGER NOT NULL DEFAULT 50,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RoutingRule_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "RoutingRule_priority_isActive_idx" ON "RoutingRule"("priority" DESC, "isActive");

-- Routing Events
CREATE TABLE IF NOT EXISTS "RoutingEvent" (
    "id" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "agentId" TEXT,
    "eventData" JSONB NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RoutingEvent_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "RoutingEvent_leadId_timestamp_idx" ON "RoutingEvent"("leadId", "timestamp" DESC);
CREATE INDEX IF NOT EXISTS "RoutingEvent_eventType_idx" ON "RoutingEvent"("eventType");

-- Foreign Keys for Agent model
ALTER TABLE "AgentSpecialization" ADD CONSTRAINT "AgentSpecialization_agentId_fkey"
    FOREIGN KEY ("agentId") REFERENCES "Agent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "AgentAvailability" ADD CONSTRAINT "AgentAvailability_agentId_fkey"
    FOREIGN KEY ("agentId") REFERENCES "Agent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "LeadRoutingHistory" ADD CONSTRAINT "LeadRoutingHistory_assignedAgentId_fkey"
    FOREIGN KEY ("assignedAgentId") REFERENCES "Agent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "AgentPerformanceMetrics" ADD CONSTRAINT "AgentPerformanceMetrics_agentId_fkey"
    FOREIGN KEY ("agentId") REFERENCES "Agent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Foreign Keys for Lead model
ALTER TABLE "LeadRoutingHistory" ADD CONSTRAINT "LeadRoutingHistory_leadId_fkey"
    FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "AssignmentQueue" ADD CONSTRAINT "AssignmentQueue_leadId_fkey"
    FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "RoutingEvent" ADD CONSTRAINT "RoutingEvent_leadId_fkey"
    FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Foreign Keys for experiments
ALTER TABLE "RoutingExperimentVariant" ADD CONSTRAINT "RoutingExperimentVariant_experimentId_fkey"
    FOREIGN KEY ("experimentId") REFERENCES "RoutingExperiment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "LeadExperimentAssignment" ADD CONSTRAINT "LeadExperimentAssignment_experimentId_fkey"
    FOREIGN KEY ("experimentId") REFERENCES "RoutingExperiment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "LeadExperimentAssignment" ADD CONSTRAINT "LeadExperimentAssignment_variantId_fkey"
    FOREIGN KEY ("variantId") REFERENCES "RoutingExperimentVariant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
