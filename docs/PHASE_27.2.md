# Phase 27.2: Intelligent Lead Prioritization & Real-Time Routing

## Overview

Phase 27.2 implements an intelligent lead prioritization and real-time routing system that dynamically assigns leads to agents/brokers based on ML predictions, agent specialization, current capacity, availability, performance history, and contextual factors.

## Implementation Summary

### Database Schema Extensions

#### New Models Added to Prisma Schema

1. **AgentSpecialization** - Tracks agent capabilities and specializations
   - Insurance line specialization (Auto, Home, Life, Health, Commercial)
   - Customer segment expertise (Individual, SMB, Enterprise)
   - Proficiency level (1-5)
   - Max concurrent leads
   - Languages and territories

2. **AgentAvailability** - Real-time agent status tracking
   - Current status (Available, In_Call, Break, Training, Offline)
   - Current load vs max capacity
   - Last updated timestamp

3. **LeadRoutingHistory** - Audit trail for all routing decisions
   - Routing strategy used
   - Lead score at time of routing
   - Assignment reasons and factors
   - Conversion outcomes

4. **AgentPerformanceMetrics** - Materialized performance data
   - Conversion rates by tier
   - Average handling time
   - Customer satisfaction ratings
   - Cross-sell/upsell rates

5. **RoutingExperiment** - A/B testing framework
   - Multiple variants with traffic allocation
   - Success metrics tracking
   - Statistical significance testing

6. **RoutingExperimentVariant** - Experiment variants
   - Strategy and parameters
   - Traffic allocation percentage

7. **LeadExperimentAssignment** - Lead to variant mapping
   - Tracks which variant a lead was assigned to

8. **AssignmentQueue** - Queue management
   - Multiple queue types (hot, active, nurture, waiting, reassignment)
   - SLA tracking
   - Queue position management

9. **RoutingRule** - Custom routing rules engine
   - Condition-based routing
   - Priority-based execution
   - Multiple rule types

10. **RoutingEvent** - Event logging for audit
    - All routing-related events
    - Event data and timestamps

### Core Services Implemented

#### 1. LeadPrioritizationService

**Location**: `packages/core/src/services/lead-prioritization.service.ts`

**Key Methods**:
- `calculateLeadScore(leadId)` - Calculates composite lead score (0-100)
- `getLeadScore(leadId)` - Gets full scoring details
- `assignLeadTier(score)` - Assigns lead to tier based on score
- `getDynamicAdjustments(leadId)` - Calculates time decay and market factors
- `prioritizeQueue(queueType)` - Reorders queue by updated scores
- `rescoreAllLeads()` - Bulk rescores all active leads
- `getLeadsByTier(tier, limit, offset)` - Gets leads filtered by tier
- `getSLAStatus(leadId)` - Gets SLA compliance status

**Scoring Formula**:
```
Lead_Score = (
  0.30 * Quality_Score +
  0.20 * Status_Score +
  0.15 * Source_Quality +
  0.20 * Contact_Completeness +
  0.10 * Time_Decay_Bonus
)
```

**Tier Assignment**:
- **Tier 1 (Premium)**: Score 85-100 - SLA: 2 hours
- **Tier 2 (High Priority)**: Score 70-85 - SLA: 24 hours
- **Tier 3 (Medium)**: Score 50-70 - SLA: 48 hours
- **Tier 4 (Nurture)**: Score 0-50 - SLA: 168 hours (1 week)

#### 2. AgentMatchingService

**Location**: `packages/core/src/services/agent-matching.service.ts`

**Key Methods**:
- `findMatchingAgents(leadId)` - Finds all agents matching lead requirements
- `calculateAgentMatchScore(...)` - Calculates fitness score for agent-lead pair
- `calculateSpecializationMatch(...)` - Calculates specialization compatibility
- `getPerformanceScore(agentId, insuranceLine)` - Gets agent performance
- `getAvailabilityScore(agentId)` - Gets agent availability score
- `getCapacityUtilization(agentId)` - Calculates current capacity usage
- `getAgentCapability(agentId)` - Gets full agent capability profile
- `updateAgentSpecializations(agentId, specializations)` - Updates agent skills

**Fitness Score Formula**:
```
Fitness = (
  0.35 * Specialization_Match +
  0.35 * Performance_Score +
  0.10 * Availability_Score +
  0.20 * (100 - Capacity_Utilization)
)
```

#### 3. CapacityManagementService

**Location**: `packages/core/src/services/capacity-management.service.ts`

**Key Methods**:
- `getAvailableCapacity(agentId)` - Gets available slots for agent
- `updateAgentStatus(agentId, status, maxCapacity)` - Updates agent status
- `canAcceptLead(agentId)` - Checks if agent can take new leads
- `getAgentsForLoadBalancing(specialization)` - Gets agents sorted by utilization
- `getPredictedCapacity(agentId, minutes)` - Predicts capacity in future
- `getCapacityHeatmap()` - Gets team-wide capacity view
- `updateAgentLoad(agentId, delta)` - Adjusts agent load
- `getTeamCapacity(teamIds)` - Gets aggregate team metrics
- `rebalanceLoad(targetUtilization)` - Suggests load rebalancing

**Capacity Targets**:
- Elite agents: 8 concurrent leads
- Standard agents: 5 concurrent leads
- Target utilization: 75-85%

#### 4. RoutingEngineService

**Location**: `packages/core/src/services/routing-engine.service.ts`

**Key Methods**:
- `routeLead(leadId, strategy, preferredAgentId, force)` - Main routing function
- `batchRouteLeads(leadIds, strategy)` - Batch routing (greedy/optimal)
- `rerouteLead(leadId, reason)` - Reassigns lead to new agent
- `getRoutingExplanation(leadId)` - Gets detailed routing explanation
- `applyRoutingRules(leadId)` - Applies custom business rules
- `validateRouting(leadId, agentId)` - Validates routing decision

**Routing Strategies**:
1. **Greedy** - Real-time, selects best available agent immediately
2. **Optimal** - Batch assignment using Hungarian algorithm
3. **Manual** - Forced assignment to specific agent
4. **Hybrid** - Combination of strategies

#### 5. QueueManagementService

**Location**: `packages/core/src/services/queue-management.service.ts`

**Key Methods**:
- `enqueueLeadForAssignment(leadId, queueType)` - Adds lead to queue
- `processQueue(queueType, maxAssignments)` - Processes queue and assigns
- `moveLeadToQueue(leadId, newQueueType, reason)` - Moves lead between queues
- `getQueueMetrics(queueType)` - Gets queue performance metrics
- `reorderQueue(queueType)` - Reorders queue by priority
- `getApproachingSLALeads(thresholdMinutes)` - Gets leads near SLA breach
- `escalateStaleLeads(staleThresholdHours)` - Escalates old leads
- `getAllQueueMetrics()` - Gets metrics for all queues
- `autoProcessSLABreaches()` - Auto-escalates SLA breaches

**Queue Types**:
- **Hot Queue** - Tier 1 leads (<2 hours)
- **Active Queue** - Tier 2-3 leads (<24-48 hours)
- **Nurture Queue** - Tier 4 leads (automated campaigns)
- **Waiting Queue** - Leads awaiting assignment
- **Reassignment Queue** - Leads needing re-routing

#### 6. RoutingAnalyticsService

**Location**: `packages/core/src/services/routing-analytics.service.ts`

**Key Methods**:
- `getRoutingMetrics(period)` - Gets comprehensive routing metrics
- `getAssignmentQuality(agentId, period)` - Gets agent quality metrics
- `calculateRoutingEfficiency()` - Calculates efficiency score
- `getSLACompliance(tier, period)` - Gets SLA compliance by tier
- `compareRoutingStrategies(period)` - Compares greedy vs optimal
- `getMatchQualityAnalysis(period)` - Analyzes lead-agent match quality
- `identifyImprovements()` - Identifies improvement opportunities

**Routing Efficiency Score**:
```
Efficiency = (
  0.30 * First_Attempt_Success_Rate +
  0.30 * Avg_SLA_Compliance +
  0.20 * Utilization_Score +
  0.20 * Assignment_Time_Score
)
```

#### 7. ABTestingService

**Location**: `packages/core/src/services/ab-testing.service.ts`

**Key Methods**:
- `createExperiment(config, variants)` - Creates A/B test
- `getExperiment(experimentId)` - Gets experiment details
- `getActiveExperiments()` - Lists active experiments
- `assignLeadToVariant(leadId, experimentId)` - Assigns lead to variant
- `getExperimentMetrics(experimentId)` - Gets experiment performance
- `determineWinner(experimentId)` - Determines winning variant
- `promoteWinner(experimentId)` - Promotes winner to production
- `performStatisticalTest(variants, successMetric)` - Runs significance test

**Statistical Tests**:
- Z-test for conversion rate comparisons
- T-test for mean comparisons
- 95% confidence level default
- Automatic winner determination

### API Routes

#### Lead Prioritization Endpoints

```
GET    /api/v1/routing/prioritization/score/:leadId
POST   /api/v1/routing/prioritization/rescore
GET    /api/v1/routing/prioritization/tier/:tier
GET    /api/v1/routing/prioritization/queue-status
```

#### Agent Management Endpoints

```
GET    /api/v1/routing/agents/:agentId/availability
PUT    /api/v1/routing/agents/:agentId/availability
GET    /api/v1/routing/agents/:agentId/specializations
POST   /api/v1/routing/agents/:agentId/specializations
GET    /api/v1/routing/agents/:agentId/performance
GET    /api/v1/routing/agents/matching/:leadId
```

#### Routing Endpoints

```
POST   /api/v1/routing/assign/:leadId
POST   /api/v1/routing/batch-assign
POST   /api/v1/routing/reroute/:leadId
GET    /api/v1/routing/explanation/:leadId
```

#### Queue Management Endpoints

```
GET    /api/v1/routing/queue/:queueType/status
GET    /api/v1/routing/queue/:queueType/leads
POST   /api/v1/routing/queue/:queueType/process
POST   /api/v1/routing/queue/lead/:leadId/move
```

#### Capacity Management Endpoints

```
GET    /api/v1/routing/capacity/agents
GET    /api/v1/routing/capacity/available/:agentId
GET    /api/v1/routing/capacity/forecast
```

#### Analytics Endpoints

```
GET    /api/v1/routing/metrics
GET    /api/v1/routing/sla-at-risk
```

#### A/B Testing Endpoints

```
POST   /api/v1/routing/experiments/create
GET    /api/v1/routing/experiments/active
GET    /api/v1/routing/experiments/:experimentId/metrics
POST   /api/v1/routing/experiments/:experimentId/promote
```

### Type Definitions

All types are defined in `packages/types/src/routing.ts`:

**Core Types**:
- `LeadTier` - 'Tier1' | 'Tier2' | 'Tier3' | 'Tier4'
- `AgentTier` - 'Elite' | 'Senior' | 'Standard' | 'Junior'
- `RoutingStrategy` - 'greedy' | 'optimal' | 'reinforcement' | 'manual' | 'hybrid'
- `AgentStatus` - 'Available' | 'In_Call' | 'Break' | 'Training' | 'Offline'
- `QueueType` - 'hot' | 'active' | 'nurture' | 'waiting' | 'reassignment'

**Data Structures**:
- `LeadScore` - Full scoring details
- `AgentMatch` - Agent matching result
- `RoutingResult` - Routing operation result
- `QueueMetrics` - Queue performance metrics
- `RoutingMetrics` - Overall routing performance
- `Experiment` - A/B test configuration
- `ExperimentMetrics` - Test performance data

### Integration Points

#### With Phase 27.1 (Predictive Analytics)
- Uses conversion probability for lead scoring
- Uses LTV predictions for prioritization
- Uses churn risk for retention routing

#### With Existing Services
- Integrates with Prisma for database operations
- Uses existing Lead and Agent models
- Extends LeadAssignment model
- Creates new relationships

### Usage Examples

#### Basic Lead Routing

```typescript
const result = await routingEngine.routeLead(
  'lead-123',
  'greedy'
);

if (result.success) {
  console.log(`Lead assigned to agent: ${result.assignedAgentId}`);
  console.log(`SLA met: ${result.slaMet}`);
}
```

#### Get Agent Matching

```typescript
const matches = await agentMatching.findMatchingAgents('lead-123');

matches.forEach(match => {
  console.log(`Agent ${match.agentId}: ${match.fitnessScore}`);
  console.log(`  Specialization: ${match.specializationMatch}`);
  console.log(`  Performance: ${match.performanceScore}`);
});
```

#### Process Queue

```typescript
const assignedCount = await queueManagement.processQueue('hot', 10);

console.log(`Assigned ${assignedCount} leads from hot queue`);
```

#### Create A/B Test

```typescript
const experiment = await abTesting.createExperiment(
  {
    name: 'Greedy vs Optimal Routing',
    strategyType: 'hybrid',
    trafficPercentage: 100,
    startDate: new Date(),
    successMetric: 'conversion_rate',
  },
  [
    {
      name: 'Greedy',
      strategy: 'greedy',
      trafficAllocation: 50,
      parameters: {},
    },
    {
      name: 'Optimal',
      strategy: 'optimal',
      trafficAllocation: 50,
      parameters: {},
    },
  ]
);
```

### Success Metrics

Based on the ticket requirements, the implementation targets:

1. **Assignment Efficiency**: 95%+ successful assignments on first attempt
2. **Queue Performance**: <2 hour wait time for Tier 1 leads (SLA 95%+ compliance)
3. **Conversion Improvement**: 3x higher conversion for matched assignments vs random
4. **Agent Utilization**: 75-85% utilization with balanced workload
5. **Routing Accuracy**: 90%+ of assignments meet specialization requirements
6. **Response Time**: Lead assigned within 30 seconds of entry
7. **SLA Compliance**: 95%+ for all tiers
8. **Queue Metrics**: <10% queue abandonment rate
9. **Cost Efficiency**: 15% reduction in handling time through better matching
10. **A/B Test Success**: Winner strategies show 5%+ improvement

### Configuration

Routing configuration can be customized via:

1. **SLA Limits** - Adjust tier-specific SLA thresholds
2. **Scoring Weights** - Customize scoring formula
3. **Agent Matching Weights** - Adjust fitness score components
4. **Capacity Settings** - Configure default and elite agent capacity
5. **Routing Rules** - Add custom business logic
6. **Queue Settings** - Configure queue types and priorities

### Monitoring & Observability

Key metrics to monitor:

- Queue depth by tier
- Average wait time per tier
- SLA compliance by tier
- Agent utilization rate
- Assignment success rate
- Lead conversion by assignment quality
- Routing efficiency score
- A/B test performance variance

### Future Enhancements

Potential improvements for future phases:

1. **Reinforcement Learning Routing** - Learn optimal routing from outcomes
2. **Real-time Streaming** - Use WebSocket for instant updates
3. **Advanced Analytics** - ML-based prediction of optimal routing
4. **Cross-lingual Matching** - Better language matching
5. **Geographic Optimization** - Consider timezone and location
6. **Integration with External Systems** - CRM, dialer, etc.

### Migration Notes

To use the new routing system:

1. Run Prisma migration to create new tables:
   ```bash
   npx prisma migrate dev --name add_routing_phase_27_2
   ```

2. Initialize agent specializations:
   ```typescript
   await agentMatching.updateAgentSpecializations(agentId, [
     {
       insuranceLine: 'Auto',
       customerSegment: 'Individual',
       proficiencyLevel: 4,
       languages: ['English'],
       territories: ['CA', 'NY'],
     },
   ]);
   ```

3. Set agent availability:
   ```typescript
   await capacityManagement.updateAgentStatus(agentId, 'Available', 5);
   ```

4. Start routing leads:
   ```typescript
   await routingEngine.routeLead(leadId, 'greedy');
   ```

### Testing

Unit tests should cover:
- Lead scoring calculations
- Agent matching algorithms
- Capacity management
- Routing decision logic
- Queue operations
- Analytics calculations

Integration tests should cover:
- End-to-end routing flow
- Queue processing
- SLA escalation
- A/B test execution

### Documentation Updates

- Update API documentation with new endpoints
- Document routing rules configuration
- Create agent onboarding guide
- Add monitoring dashboard documentation
- Update troubleshooting guides

---

**Implementation Date**: 2024
**Phase**: 27.2
**Status**: ✅ Complete
