# System Integration & API Orchestration

This directory contains the implementation of Phase 14.1: System Integration & API Orchestration for the Insurance Lead Generation AI Platform.

## What is API Orchestration?

API Orchestration is a system that enables complex multi-step workflows with external API integrations. It provides:

- **Workflow Management** - Define, store, and execute reusable workflows
- **Circuit Breakers** - Protect external services from cascading failures
- **Retry Policies** - Automatic retry with exponential backoff
- **Data Transformation** - Transform data between workflow steps
- **Conditional Branching** - Execute different steps based on conditions
- **Parallel Execution** - Run multiple steps concurrently
- **Variable Substitution** - Pass data between steps using `{{variable}}` syntax

## Quick Start

```bash
# 1. Apply database migrations
cd apps/data-service
npx prisma generate
npx prisma db push

# 2. Start services
cd ../..
docker compose up -d
pnpm dev:apps

# 3. Create a workflow
curl -X POST http://localhost:3000/api/v1/workflows \
  -H "Content-Type: application/json" \
  -d @examples/simple-workflow.json

# 4. Execute the workflow
curl -X POST http://localhost:3000/api/v1/workflows/{id}/execute \
  -H "Content-Type: application/json" \
  -d '{"input": {"leadId": "123"}}'
```

## Architecture

```
┌─────────────────┐
│   API Layer    │ (Port 3000)
│   (Express)    │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Data Service   │ (Port 3001)
│ - Workflow Mgmt│
│ - Execution    │
│ - Circuit      │
│   Breaker      │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Orchestrator  │ (Port 3002)
│ - Step Engine  │
│ - Dependency   │
│   Resolution  │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ External APIs    │
│ (protected by   │
│  circuit        │
│  breakers)      │
└─────────────────┘
```

## Key Components

### 1. Workflow Service (`apps/data-service/src/services/workflow.service.ts`)

Manages workflow definitions and execution:

- `createWorkflow()` - Create new workflow
- `getWorkflowById()` - Get workflow by ID
- `getWorkflows()` - List workflows with filters
- `updateWorkflow()` - Update workflow
- `deleteWorkflow()` - Delete workflow
- `executeWorkflow()` - Execute workflow asynchronously
- `getExecutionById()` - Get execution details
- `getExecutions()` - List executions
- `getWorkflowMetrics()` - Get workflow performance metrics

### 2. Circuit Breaker Service (`apps/data-service/src/services/circuit-breaker.service.ts`)

Implements circuit breaker pattern:

- `getCircuitBreaker()` - Get circuit breaker state
- `canRequest()` - Check if requests are allowed
- `recordSuccess()` - Record successful request
- `recordFailure()` - Record failed request
- `resetCircuitBreaker()` - Manual reset to CLOSED
- `updateConfig()` - Update circuit breaker configuration
- `executeWithCircuitBreaker()` - Execute request with protection

### 3. Orchestration Service (`apps/orchestrator/src/services/orchestration.service.ts`)

Advanced orchestration engine:

- `executeOrchestration()` - Execute orchestration request
- `executeStep()` - Execute single step with retry
- `buildExecutionGraph()` - Build dependency graph
- `topologicalSort()` - Resolve step dependencies

## Step Types

| Type | Description | Use Case |
|-------|-------------|-----------|
| `HTTP_REQUEST` | Make HTTP calls to external APIs | Fetch data, submit forms, integrate with 3rd parties |
| `DATA_TRANSFORM` | Transform data between steps | Map fields, calculate values, format strings |
| `CONDITIONAL` | Branch based on conditions | Route based on quality score, insurance type |
| `PARALLEL` | Execute steps concurrently | Submit to multiple carriers simultaneously |
| `FOR_EACH` | Iterate over arrays | Process multiple items, batch operations |
| `WAIT` | Pause execution | Rate limiting, delay between API calls |
| `WEBHOOK_CALL` | Send data to webhooks | Notify external systems of events |
| `VALIDATION` | Validate data | Check required fields, validate types, verify patterns |

## Variable Substitution

Workflows support variable substitution using `{{variableName}}` syntax:

```json
{
  "url": "https://api.example.com/leads/{{leadId}}",
  "headers": {
    "Authorization": "Bearer {{config.apiKey}}"
  },
  "body": {
    "leadId": "{{leadId}}",
    "agentId": "{{step_1.output.recommendedAgent}}"
  }
}
```

Available variables:
- `{{input.field}}` - Input to the workflow
- `{{stepId.output.field}}` - Output from previous steps
- `{{config.key}}` - Configuration values
- `{{now}}` - Current timestamp (when using templates)

## Circuit Breaker States

| State | Description | Behavior |
|--------|-------------|-----------|
| `CLOSED` | Normal operation | All requests pass through |
| `OPEN` | Circuit is tripped | Requests are blocked, waiting for recovery |
| `HALF_OPEN` | Testing recovery | Limited requests allowed to test if service recovered |

State transitions:
1. **CLOSED → OPEN**: When failure count exceeds threshold
2. **OPEN → HALF_OPEN**: After timeout period elapses
3. **HALF_OPEN → CLOSED**: After successful test calls complete
4. **HALF_OPEN → OPEN**: If any test call fails

## Example Workflows

### Simple HTTP Request

```json
{
  "name": "Fetch Lead Data",
  "category": "lead_management",
  "status": "ACTIVE",
  "triggers": [
    {
      "type": "MANUAL",
      "config": {},
      "isEnabled": true
    }
  ],
  "steps": [
    {
      "id": "fetch_lead",
      "name": "Fetch Lead",
      "type": "HTTP_REQUEST",
      "order": 1,
      "config": {
        "method": "GET",
        "url": "http://localhost:3000/api/v1/leads/{{leadId}}"
      }
    }
  ]
}
```

### Parallel Submission to Multiple Carriers

```json
{
  "name": "Submit to Multiple Carriers",
  "category": "lead_distribution",
  "status": "ACTIVE",
  "steps": [
    {
      "id": "get_lead",
      "name": "Get Lead Details",
      "type": "HTTP_REQUEST",
      "order": 1,
      "config": {
        "method": "GET",
        "url": "http://localhost:3000/api/v1/leads/{{leadId}}"
      }
    },
    {
      "id": "submit_all",
      "name": "Submit in Parallel",
      "type": "PARALLEL",
      "order": 2,
      "dependsOn": ["get_lead"],
      "config": {
        "steps": ["submit_a", "submit_b", "submit_c"],
        "waitForAll": true,
        "maxConcurrency": 3
      }
    },
    {
      "id": "submit_a",
      "name": "Submit to Carrier A",
      "type": "HTTP_REQUEST",
      "order": 2,
      "config": {
        "method": "POST",
        "url": "https://carrier-a.com/api/leads",
        "body": "{{leadData}}"
      }
    }
    // ... submit_b, submit_c similar
  ]
}
```

### Conditional Routing

```json
{
  "name": "Conditional Lead Routing",
  "category": "lead_routing",
  "status": "ACTIVE",
  "steps": [
    {
      "id": "check_quality",
      "name": "Check Lead Quality",
      "type": "CONDITIONAL",
      "order": 1,
      "config": {
        "conditions": [
          {
            "field": "lead.qualityScore",
            "operator": "gte",
            "value": 80
          }
        ],
        "trueStepId": "route_premium",
        "falseStepId": "route_standard"
      }
    },
    {
      "id": "route_premium",
      "name": "Route to Premium Agents",
      "type": "HTTP_REQUEST",
      "order": 2,
      "config": {
        "method": "POST",
        "url": "http://localhost:3000/api/v1/assignments",
        "body": {
          "leadId": "{{leadId}}",
          "agentType": "premium"
        }
      }
    }
  ]
}
```

## API Endpoints

### Workflows
- `POST /api/v1/workflows` - Create workflow
- `GET /api/v1/workflows` - List workflows
- `GET /api/v1/workflows/:id` - Get workflow
- `PUT /api/v1/workflows/:id` - Update workflow
- `DELETE /api/v1/workflows/:id` - Delete workflow
- `POST /api/v1/workflows/:id/execute` - Execute workflow
- `GET /api/v1/workflows/:id/metrics` - Get metrics

### Executions
- `GET /api/v1/executions` - List executions
- `GET /api/v1/executions/:id` - Get execution

### Circuit Breakers
- `GET /api/v1/circuit-breakers` - List circuit breakers
- `GET /api/v1/circuit-breakers/:serviceId` - Get circuit breaker
- `PUT /api/v1/circuit-breakers/:serviceId/config` - Update config
- `POST /api/v1/circuit-breakers/:serviceId/reset` - Reset breaker
- `DELETE /api/v1/circuit-breakers/:serviceId` - Delete breaker

### Orchestrator
- `POST /api/orchestration/execute` - Execute orchestration
- `GET /api/orchestration/active` - List active orchestrations
- `GET /api/orchestration/active/:requestId` - Get orchestration

## Documentation

- **[Phase 14.1 Documentation](../docs/PHASE_14.1.md)** - Complete API reference and examples
- **[Quickstart Guide](../docs/PHASE_14.1_QUICKSTART.md)** - Get started quickly
- **[Implementation Summary](../docs/PHASE_14.1_SUMMARY.md)** - What was implemented
- **[Checklist](../docs/PHASE_14.1_CHECKLIST.md)** - Implementation checklist

## Troubleshooting

### Circuit Breaker is OPEN
```bash
# Check circuit breaker status
curl http://localhost:3000/api/v1/circuit-breakers/service-a-api

# Reset if service is healthy
curl -X POST http://localhost:3000/api/v1/circuit-breakers/service-a-api/reset
```

### Workflow Execution Fails
```bash
# Get execution details with step-level errors
curl http://localhost:3000/api/v1/executions/{executionId}

# Check workflow metrics for success rate
curl http://localhost:3000/api/v1/workflows/{workflowId}/metrics
```

### Variable Substitution Not Working
1. Check variable names match context
2. Verify step IDs match in dependencies
3. Use correct syntax: `{{variableName}}`

## Contributing

When adding new features:

1. Update type definitions in `packages/types/src/orchestration.ts`
2. Add Prisma models to `apps/data-service/prisma/schema.prisma`
3. Implement service logic in `apps/data-service/src/services/`
4. Add API routes in `apps/data-service/src/routes/`
5. Update documentation

## License

MIT
