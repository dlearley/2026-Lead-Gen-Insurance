# Lead Prioritization & Routing Services

Phase 27.2: Intelligent Lead Prioritization & Real-Time Routing

## Overview

This package provides comprehensive services for intelligent lead routing, agent matching, capacity management, and A/B testing of routing strategies.

## Services

### 1. LeadPrioritizationService

Handles lead scoring, tier assignment, and SLA tracking.

```typescript
const leadPrioritization = new LeadPrioritizationService(prisma);

// Calculate lead score (0-100)
const score = await leadPrioritization.calculateLeadScore(leadId);

// Get full scoring details
const leadScore = await leadPrioritization.getLeadScore(leadId);

// Assign tier based on score
const tier = leadPrioritization.assignLeadTier(score); // Tier1, Tier2, Tier3, Tier4

// Get SLA status
const slaStatus = await leadPrioritization.getSLAStatus(leadId);
```

### 2. AgentMatchingService

Finds and scores agents based on lead requirements.

```typescript
const agentMatching = new AgentMatchingService(prisma);

// Find matching agents for a lead
const matches = await agentMatching.findMatchingAgents(leadId);

// Get agent capability profile
const capability = await agentMatching.getAgentCapability(agentId);

// Update agent specializations
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

### 3. CapacityManagementService

Manages real-time agent capacity and load balancing.

```typescript
const capacityManagement = new CapacityManagementService(prisma);

// Get agent available capacity
const available = await capacityManagement.getAvailableCapacity(agentId);

// Update agent status
await capacityManagement.updateAgentStatus(agentId, 'Available', 5);

// Get capacity heatmap
const heatmap = await capacityManagement.getCapacityHeatmap();

// Get capacity forecast
const forecast = await capacityManagement.getCapacityForecast(8); // 8 hours
```

### 4. RoutingEngineService

Main routing engine with multiple strategies.

```typescript
const routingEngine = new RoutingEngineService(
  prisma,
  leadPrioritization,
  agentMatching,
  capacityManagement
);

// Route lead using greedy strategy
const result = await routingEngine.routeLead(leadId, 'greedy');

// Route lead using optimal batch strategy
const results = await routingEngine.batchRouteLeads(leadIds, 'optimal');

// Reassign lead to new agent
const rerouteResult = await routingEngine.rerouteLead(leadId, 'Agent unavailable');

// Get routing explanation
const explanation = await routingEngine.getRoutingExplanation(leadId);
```

### 5. QueueManagementService

Manages lead queues and automatic processing.

```typescript
const queueManagement = new QueueManagementService(
  prisma,
  leadPrioritization,
  routingEngine
);

// Add lead to queue
await queueManagement.enqueueLeadForAssignment(leadId, 'hot');

// Process queue
const assignedCount = await queueManagement.processQueue('hot', 10);

// Get queue metrics
const metrics = await queueManagement.getQueueMetrics('hot');

// Get leads approaching SLA breach
const atRiskLeads = await queueManagement.getApproachingSLALeads(60);

// Escalate stale leads
const escalatedCount = await queueManagement.escalateStaleLeads(24);
```

### 6. RoutingAnalyticsService

Provides analytics and performance metrics.

```typescript
const routingAnalytics = new RoutingAnalyticsService(prisma);

// Get overall routing metrics
const metrics = await routingAnalytics.getRoutingMetrics({
  start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
  end: new Date(),
});

// Get agent assignment quality
const quality = await routingAnalytics.getAssignmentQuality(agentId, {
  start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
  end: new Date(),
});

// Compare routing strategies
const comparison = await routingAnalytics.compareRoutingStrategies({
  start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
  end: new Date(),
});

// Identify improvements
const improvements = await routingAnalytics.identifyImprovements();
```

### 7. ABTestingService

A/B testing framework for routing strategies.

```typescript
const abTesting = new ABTestingService(prisma);

// Create experiment
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

// Assign lead to variant
const variantId = await abTesting.assignLeadToVariant(leadId, experiment.id);

// Get experiment metrics
const metrics = await abTesting.getExperimentMetrics(experiment.id);

// Determine winner
const winner = await abTesting.determineWinner(experiment.id);

// Promote winner to production
await abTesting.promoteWinner(experiment.id);
```

## Quick Start

### 1. Initialize Services

```typescript
import { PrismaClient } from '@prisma/client';
import {
  LeadPrioritizationService,
  AgentMatchingService,
  CapacityManagementService,
  RoutingEngineService,
  QueueManagementService,
  RoutingAnalyticsService,
  ABTestingService,
} from '@insurance-lead-gen/core';

const prisma = new PrismaClient();

// Initialize services
const leadPrioritization = new LeadPrioritizationService(prisma);
const agentMatching = new AgentMatchingService(prisma);
const capacityManagement = new CapacityManagementService(prisma);
const routingEngine = new RoutingEngineService(
  prisma,
  leadPrioritization,
  agentMatching,
  capacityManagement
);
const queueManagement = new QueueManagementService(
  prisma,
  leadPrioritization,
  routingEngine
);
const routingAnalytics = new RoutingAnalyticsService(prisma);
const abTesting = new ABTestingService(prisma);
```

### 2. Route a Lead

```typescript
// Route lead to best agent
const result = await routingEngine.routeLead(leadId, 'greedy');

if (result.success) {
  console.log(`Lead assigned to agent: ${result.assignedAgentId}`);
  console.log(`SLA met: ${result.slaMet}`);
  console.log(`Score: ${result.score}`);
} else {
  console.log(`Lead added to queue: ${result.queueType}`);
}
```

### 3. Process Queues

```typescript
// Process hot queue (assign up to 10 leads)
const assignedCount = await queueManagement.processQueue('hot', 10);

console.log(`Assigned ${assignedCount} leads from hot queue`);
```

### 4. Monitor Performance

```typescript
// Get routing metrics for last 30 days
const metrics = await routingAnalytics.getRoutingMetrics({
  start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
  end: new Date(),
});

console.log(`Total assignments: ${metrics.totalAssignments}`);
console.log(`First attempt success rate: ${metrics.firstAttemptSuccessRate}%`);
console.log(`Routing efficiency score: ${metrics.routingEfficiencyScore}`);
```

## Configuration

### Lead Scoring Weights

Default weights can be customized:

```typescript
const scoringWeights = {
  contactCompleteness: 0.15,
  engagementLevel: 0.25,
  budgetAlignment: 0.20,
  timelineUrgency: 0.20,
  insuranceKnowledge: 0.10,
  competitivePosition: 0.10,
};
```

### Agent Matching Weights

Default fitness score weights:

```typescript
const matchingWeights = {
  specializationMatch: 0.35,
  performanceScore: 0.35,
  availabilityBonus: 0.10,
  capacityUtilization: 0.20,
};
```

### Tier Thresholds

Lead tiers based on score (0-100):

- Tier 1 (Premium): 85-100 - SLA: 2 hours
- Tier 2 (High): 70-85 - SLA: 24 hours
- Tier 3 (Medium): 50-70 - SLA: 48 hours
- Tier 4 (Nurture): 0-50 - SLA: 168 hours

### Capacity Settings

Default capacity limits:

- Elite agents: 8 concurrent leads
- Standard agents: 5 concurrent leads
- Target utilization: 75-85%

## Error Handling

All services throw errors for invalid operations:

```typescript
try {
  await routingEngine.routeLead(leadId, 'greedy');
} catch (error) {
  if (error.message.includes('Lead not found')) {
    // Handle lead not found
  } else if (error.message.includes('Agent not found')) {
    // Handle agent not found
  } else {
    // Handle other errors
  }
}
```

## API Integration

Services are integrated into the API via `apps/api/src/routes/routing-enhanced.ts`.

Register routes:

```typescript
import routingEnhanced from './routes/routing-enhanced.js';

app.use('/api/v1/routing', routingEnhanced);
```

## Testing

Run tests:

```bash
# Unit tests
npm test -- packages/core/src/services

# Integration tests
npm test -- apps/api/src/routes/routing-enhanced
```

## Migration

Run database migration:

```bash
# Apply migration
psql -U postgres -d insurance_db \
  -f prisma/migrations/20240101000000_add_routing_phase_27_2/migration.sql
```

## Documentation

Full documentation available in `docs/PHASE_27.2.md`.

## Support

For issues or questions:
- Check `docs/PHASE_27.2.md` for detailed documentation
- Review `PHASE_27.2_IMPLEMENTATION_SUMMARY.md` for implementation details
- Check logs for detailed error messages
