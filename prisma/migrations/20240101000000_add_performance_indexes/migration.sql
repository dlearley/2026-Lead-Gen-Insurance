-- Performance Optimization Indexes
-- Phase 14.4: Add composite indexes for frequently queried columns

-- Lead table indexes
CREATE INDEX IF NOT EXISTS "Lead_status_createdAt_idx" ON "Lead"("status", "createdAt");
CREATE INDEX IF NOT EXISTS "Lead_insuranceType_qualityScore_idx" ON "Lead"("insuranceType", "qualityScore");
CREATE INDEX IF NOT EXISTS "Lead_zipCode_insuranceType_idx" ON "Lead"("zipCode", "insuranceType");
CREATE INDEX IF NOT EXISTS "Lead_source_status_idx" ON "Lead"("source", "status");

-- Agent table indexes
CREATE INDEX IF NOT EXISTS "Agent_isActive_currentLeadCount_idx" ON "Agent"("isActive", "currentLeadCount");
CREATE INDEX IF NOT EXISTS "Agent_state_city_specializations_idx" ON "Agent"("state", "city", "specializations");
CREATE INDEX IF NOT EXISTS "Agent_rating_isActive_idx" ON "Agent"("rating", "isActive");

-- LeadAssignment table indexes
CREATE INDEX IF NOT EXISTS "LeadAssignment_status_assignedAt_idx" ON "LeadAssignment"("status", "assignedAt");
CREATE INDEX IF NOT EXISTS "LeadAssignment_agentId_status_idx" ON "LeadAssignment"("agentId", "status");
CREATE INDEX IF NOT EXISTS "LeadAssignment_leadId_status_idx" ON "LeadAssignment"("leadId", "status");

-- Event table indexes
CREATE INDEX IF NOT EXISTS "Event_entityType_entityId_timestamp_idx" ON "Event"("entityType", "entityId", "timestamp");
CREATE INDEX IF NOT EXISTS "Event_type_timestamp_idx" ON "Event"("type", "timestamp");
CREATE INDEX IF NOT EXISTS "Event_source_timestamp_idx" ON "Event"("source", "timestamp");

-- Carrier table indexes
CREATE INDEX IF NOT EXISTS "Carrier_isActive_partnershipStatus_idx" ON "Carrier"("isActive", "partnershipStatus");
CREATE INDEX IF NOT EXISTS "Carrier_partnershipTier_performanceScore_idx" ON "Carrier"("partnershipTier", "performanceScore");
