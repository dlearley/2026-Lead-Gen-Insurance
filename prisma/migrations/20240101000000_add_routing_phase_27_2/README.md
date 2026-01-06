# Phase 27.2: Intelligent Lead Prioritization & Real-Time Routing Migration

## Overview

This migration adds database schema changes required for Phase 27.2: Intelligent Lead Prioritization & Real-Time Routing.

## New Tables

### 1. AgentSpecialization
Tracks agent capabilities, specializations, and expertise levels.
- Insurance line specialization
- Customer segment expertise
- Proficiency level (1-5)
- Languages and territories supported

### 2. AgentAvailability
Real-time tracking of agent status and capacity.
- Current status (Available, In_Call, Break, Training, Offline)
- Current load vs max capacity
- Last updated timestamp

### 3. LeadRoutingHistory
Complete audit trail of all routing decisions.
- Routing strategy used
- Lead score at time of routing
- Assignment reasons and factors
- Conversion outcomes

### 4. AgentPerformanceMetrics
Materialized performance data for agents.
- Conversion rates by tier
- Average handling time
- Customer satisfaction ratings
- Cross-sell/upsell rates

### 5. RoutingExperiment
A/B testing framework for routing strategies.
- Multiple variants with traffic allocation
- Success metrics tracking
- Statistical significance testing

### 6. RoutingExperimentVariant
Experiment variants with strategy parameters.
- Strategy and parameters
- Traffic allocation percentage

### 7. LeadExperimentAssignment
Mapping of leads to experiment variants.
- Tracks which variant a lead was assigned to

### 8. AssignmentQueue
Queue management for leads.
- Multiple queue types (hot, active, nurture, waiting, reassignment)
- SLA tracking
- Queue position management

### 9. RoutingRule
Custom routing rules engine.
- Condition-based routing
- Priority-based execution
- Multiple rule types

### 10. RoutingEvent
Event logging for audit and monitoring.
- All routing-related events
- Event data and timestamps

## Foreign Keys

### To Agent Model
- AgentSpecialization.agentId
- AgentAvailability.agentId
- LeadRoutingHistory.assignedAgentId
- AgentPerformanceMetrics.agentId

### To Lead Model
- LeadRoutingHistory.leadId
- AssignmentQueue.leadId
- RoutingEvent.leadId

### Self-Referencing
- RoutingExperiment.controlStrategyId (references RoutingExperiment)

### Experiment Relationships
- RoutingExperimentVariant.experimentId
- LeadExperimentAssignment.experimentId
- LeadExperimentAssignment.variantId

## Indexes

### Performance Indexes
- AgentSpecialization: agentId, insuranceLine, customerSegment
- AgentAvailability: agentId, status, currentLoad
- LeadRoutingHistory: leadId, assignedAgentId, routingTimestamp
- AgentPerformanceMetrics: agentId, periodDate
- AssignmentQueue: queueType, leadScore, slaExpiry
- RoutingRule: priority DESC, isActive
- RoutingEvent: leadId, timestamp DESC, eventType

### Unique Constraints
- AgentSpecialization: (agentId, insuranceLine, customerSegment)
- AgentAvailability: agentId
- AgentPerformanceMetrics: (agentId, periodDate)
- LeadExperimentAssignment: leadId

## Rollback

To rollback this migration, run:

```sql
-- Drop foreign keys first
ALTER TABLE "AgentSpecialization" DROP CONSTRAINT "AgentSpecialization_agentId_fkey";
ALTER TABLE "AgentAvailability" DROP CONSTRAINT "AgentAvailability_agentId_fkey";
ALTER TABLE "LeadRoutingHistory" DROP CONSTRAINT "LeadRoutingHistory_assignedAgentId_fkey";
ALTER TABLE "LeadRoutingHistory" DROP CONSTRAINT "LeadRoutingHistory_leadId_fkey";
ALTER TABLE "AgentPerformanceMetrics" DROP CONSTRAINT "AgentPerformanceMetrics_agentId_fkey";
ALTER TABLE "AssignmentQueue" DROP CONSTRAINT "AssignmentQueue_leadId_fkey";
ALTER TABLE "RoutingEvent" DROP CONSTRAINT "RoutingEvent_leadId_fkey";
ALTER TABLE "RoutingExperiment" DROP CONSTRAINT "RoutingExperiment_controlStrategyId_fkey";
ALTER TABLE "RoutingExperimentVariant" DROP CONSTRAINT "RoutingExperimentVariant_experimentId_fkey";
ALTER TABLE "LeadExperimentAssignment" DROP CONSTRAINT "LeadExperimentAssignment_experimentId_fkey";
ALTER TABLE "LeadExperimentAssignment" DROP CONSTRAINT "LeadExperimentAssignment_variantId_fkey";

-- Drop indexes
DROP INDEX IF EXISTS "AgentSpecialization_agentId_insuranceLine_customerSegment_key";
DROP INDEX IF EXISTS "AgentSpecialization_agentId_idx";
DROP INDEX IF EXISTS "AgentSpecialization_insuranceLine_idx";
DROP INDEX IF EXISTS "AgentSpecialization_customerSegment_idx";
DROP INDEX IF EXISTS "AgentAvailability_agentId_idx";
DROP INDEX IF EXISTS "AgentAvailability_status_currentLoad_idx";
DROP INDEX IF EXISTS "LeadRoutingHistory_leadId_idx";
DROP INDEX IF EXISTS "LeadRoutingHistory_assignedAgentId_idx";
DROP INDEX IF EXISTS "LeadRoutingHistory_routingTimestamp_idx";
DROP INDEX IF EXISTS "AgentPerformanceMetrics_agentId_periodDate_key";
DROP INDEX IF EXISTS "AgentPerformanceMetrics_agentId_periodDate_idx";
DROP INDEX IF EXISTS "RoutingExperiment_status_idx";
DROP INDEX IF EXISTS "RoutingExperiment_startDate_endDate_idx";
DROP INDEX IF EXISTS "RoutingExperimentVariant_experimentId_idx";
DROP INDEX IF EXISTS "LeadExperimentAssignment_leadId_idx";
DROP INDEX IF EXISTS "LeadExperimentAssignment_experimentId_variantId_idx";
DROP INDEX IF EXISTS "AssignmentQueue_queueType_leadScore_idx";
DROP INDEX IF EXISTS "AssignmentQueue_slaExpiry_idx";
DROP INDEX IF EXISTS "RoutingRule_priority_isActive_idx";
DROP INDEX IF EXISTS "RoutingEvent_leadId_timestamp_idx";
DROP INDEX IF EXISTS "RoutingEvent_eventType_idx";

-- Drop tables
DROP TABLE IF EXISTS "RoutingEvent";
DROP TABLE IF EXISTS "RoutingRule";
DROP TABLE IF EXISTS "AssignmentQueue";
DROP TABLE IF EXISTS "LeadExperimentAssignment";
DROP TABLE IF EXISTS "RoutingExperimentVariant";
DROP TABLE IF EXISTS "RoutingExperiment";
DROP TABLE IF EXISTS "AgentPerformanceMetrics";
DROP TABLE IF EXISTS "LeadRoutingHistory";
DROP TABLE IF EXISTS "AgentAvailability";
DROP TABLE IF EXISTS "AgentSpecialization";
```

## Notes

- All new tables use UUID primary keys
- Foreign key constraints ensure referential integrity
- CASCADE DELETE on child records to maintain consistency
- JSONB fields for flexible data storage (languages, territories, parameters)
- INTERVAL type for timeInQueue in AssignmentQueue

## Post-Migration Steps

After running this migration:

1. Initialize agent specializations for existing agents
2. Create agent availability records
3. Configure initial routing rules
4. Set up default experiments if needed

## Verification

To verify the migration was successful:

```sql
-- Check table counts
SELECT
  'AgentSpecialization' as table_name, COUNT(*) as count
FROM "AgentSpecialization"
UNION ALL
SELECT
  'AgentAvailability', COUNT(*)
FROM "AgentAvailability"
UNION ALL
SELECT
  'LeadRoutingHistory', COUNT(*)
FROM "LeadRoutingHistory"
UNION ALL
SELECT
  'AgentPerformanceMetrics', COUNT(*)
FROM "AgentPerformanceMetrics"
UNION ALL
SELECT
  'RoutingExperiment', COUNT(*)
FROM "RoutingExperiment"
UNION ALL
SELECT
  'RoutingExperimentVariant', COUNT(*)
FROM "RoutingExperimentVariant"
UNION ALL
SELECT
  'LeadExperimentAssignment', COUNT(*)
FROM "LeadExperimentAssignment"
UNION ALL
SELECT
  'AssignmentQueue', COUNT(*)
FROM "AssignmentQueue"
UNION ALL
SELECT
  'RoutingRule', COUNT(*)
FROM "RoutingRule"
UNION ALL
SELECT
  'RoutingEvent', COUNT(*)
FROM "RoutingEvent";
```
