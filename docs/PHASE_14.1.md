# Phase 14.1: System Integration & API Orchestration

## Overview

Phase 14.1 implements a comprehensive API orchestration and system integration framework for the Insurance Lead Generation AI Platform. This framework enables complex multi-step workflows, external service integration with circuit breakers, data transformation, and advanced retry policies.

## Features Implemented

### 1. Workflow Management System

**Workflow Definition**
- Multi-step workflows with execution order
- Step types: HTTP requests, data transformations, conditionals, parallel execution, for-each loops, waits, webhook calls, validations
- Workflow triggers: webhooks, schedules, events, manual, API calls
- Error handling with dedicated error handler steps
- Timeout configuration per workflow

**Workflow Execution**
- Asynchronous workflow execution with status tracking
- Per-step execution logging
- Context passing between steps
- Variable substitution in URLs, headers, and bodies
- Automatic metric collection and reporting

### 2. API Orchestration Engine

**Step Types**

1. **HTTP_REQUEST** - Make HTTP calls to external APIs
   - Supports GET, POST, PUT, PATCH, DELETE methods
   - Custom headers and query parameters
   - Request/response data extraction
   - Timeout configuration

2. **DATA_TRANSFORM** - Transform data between steps
   - Field mapping and renaming
   - Calculate aggregate values (sum, avg, min, max, count)
   - Format transformations (uppercase, lowercase, trim)
   - Merge data from multiple sources

3. **CONDITIONAL** - Branch execution based on conditions
   - Multiple conditions with AND/OR logic
   - Operators: eq, ne, gt, lt, gte, lte, in, not_in, contains, regex
   - Nested field access support

4. **PARALLEL** - Execute multiple steps concurrently
   - Wait for all or continue immediately
   - Configurable concurrency limits
   - Step dependency management

5. **FOR_EACH** - Iterate over arrays
   - Execute steps for each item
   - Configurable batch size/concurrency
   - Result aggregation

6. **WAIT** - Pause execution
   - Duration in milliseconds, seconds, minutes, hours
   - Useful for delays between API calls

7. **WEBHOOK_CALL** - Send data to webhooks
   - POST/PUT/PATCH methods
   - Custom headers
   - Timeout configuration

8. **VALIDATION** - Validate data before proceeding
   - Required field checks
   - Type validation
   - Range validation
   - Pattern matching (regex)
   - Stop on first error or collect all errors

### 3. Circuit Breaker Pattern

**Circuit Breaker States**
- **CLOSED** - Normal operation, all requests pass through
- **OPEN** - Circuit is tripped, requests are blocked
- **HALF_OPEN** - Testing if service has recovered, limited requests allowed

**Features**
- Configurable failure threshold
- Configurable timeout before attempting recovery
- Automatic state transitions
- Per-service circuit breakers
- Half-open max calls configuration

**API Endpoints**
- `GET /api/v1/circuit-breakers` - List all circuit breakers
- `GET /api/v1/circuit-breakers/:serviceId` - Get circuit breaker status
- `PUT /api/v1/circuit-breakers/:serviceId/config` - Update configuration
- `POST /api/v1/circuit-breakers/:serviceId/reset` - Reset to CLOSED
- `DELETE /api/v1/circuit-breakers/:serviceId` - Delete circuit breaker

### 4. Retry Policies

**Retry Strategies**
- **LINEAR** - Delay increases linearly (delay * attempt)
- **EXPONENTIAL** - Delay increases exponentially (delay * multiplier^(attempt-1))
- **FIXED** - Same delay between attempts
- **NONE** - No retries

**Configuration**
- Max attempts (default: 3)
- Initial delay (default: 1000ms)
- Max delay cap (default: 30000ms)
- Backoff multiplier (default: 2)
- Retryable error codes

### 5. Workflow Metrics

**Tracked Metrics**
- Total executions
- Successful executions
- Failed executions
- Average execution time
- Average step execution time
- Success rate
- Last execution timestamp and status

**API Endpoint**
- `GET /api/v1/workflows/:id/metrics` - Get workflow metrics

### 6. API Endpoints

#### Workflows

```
POST   /api/v1/workflows                    # Create workflow
GET    /api/v1/workflows                    # List workflows (with filters)
GET    /api/v1/workflows/:id                # Get workflow details
PUT    /api/v1/workflows/:id                # Update workflow
DELETE /api/v1/workflows/:id                # Delete workflow
```

#### Workflow Execution

```
POST /api/v1/workflows/:id/execute          # Execute workflow
GET  /api/v1/executions                   # List executions
GET  /api/v1/executions/:id               # Get execution details
```

#### Circuit Breakers

```
GET    /api/v1/circuit-breakers                    # List all
GET    /api/v1/circuit-breakers/:serviceId         # Get status
PUT    /api/v1/circuit-breakers/:serviceId/config  # Update config
POST   /api/v1/circuit-breakers/:serviceId/reset   # Reset
DELETE /api/v1/circuit-breakers/:serviceId         # Delete
```

#### Orchestrator Service

```
POST /api/orchestration/execute              # Execute orchestration request
GET  /api/orchestration/active             # List active orchestrations
GET  /api/orchestration/active/:requestId  # Get specific orchestration
```

## Database Schema

### Workflow
```prisma
model Workflow {
  id          String          @id @default(uuid())
  name        String
  description String?
  version     Int             @default(1)
  status      WorkflowStatus
  category    String
  triggers    Json
  steps       Json
  errorHandlers Json?
  timeout     Int?
  metadata    Json?
  createdAt   DateTime        @default(now())
  updatedAt   DateTime        @updatedAt

  executions  WorkflowExecution[]
}
```

### WorkflowExecution
```prisma
model WorkflowExecution {
  id              String          @id @default(uuid())
  workflowId      String
  workflowVersion Int
  status          ExecutionStatus
  input           Json
  output          Json?
  currentStepId   String?
  startedAt       DateTime        @default(now())
  completedAt     DateTime?
  error           String?
  metadata        Json?

  stepsExecuted   StepExecution[]
}
```

### StepExecution
```prisma
model StepExecution {
  id            String          @id @default(uuid())
  executionId    String
  stepId        String
  stepName      String
  status        ExecutionStatus
  input         Json?
  output        Json?
  startedAt     DateTime        @default(now())
  completedAt   DateTime?
  duration      Int?
  attempt       Int             @default(1)
  error         String?
  logs          Json?
}
```

### CircuitBreaker
```prisma
model CircuitBreaker {
  id               String              @id @default(uuid())
  serviceId        String             @unique
  state            CircuitBreakerState
  failureCount     Int
  lastFailureTime  DateTime?
  lastSuccessTime  DateTime?
  threshold        Int
  timeout          Int
  halfOpenMaxCalls Int
  halfOpenCalls    Int
  createdAt        DateTime            @default(now())
  updatedAt        DateTime            @updatedAt
}
```

## Example Workflows

### 1. Lead Submission to Multiple Carriers

```json
{
  "name": "Submit Lead to Multiple Carriers",
  "category": "lead_distribution",
  "status": "ACTIVE",
  "triggers": [
    {
      "type": "EVENT",
      "config": {
        "eventType": "lead.qualified"
      },
      "isEnabled": true
    }
  ],
  "steps": [
    {
      "id": "step_1",
      "name": "Get Lead Details",
      "type": "HTTP_REQUEST",
      "order": 1,
      "config": {
        "method": "GET",
        "url": "https://api.internal.com/leads/{{leadId}}",
        "extractResponse": {
          "type": "JSON_PATH",
          "path": "data",
          "variableName": "leadData"
        }
      }
    },
    {
      "id": "step_2",
      "name": "Validate Lead",
      "type": "VALIDATION",
      "order": 2,
      "config": {
        "rules": [
          {
            "field": "leadData.email",
            "type": "required"
          },
          {
            "field": "leadData.insuranceType",
            "type": "required"
          }
        ],
        "failOnFirstError": true
      }
    },
    {
      "id": "step_3",
      "name": "Submit to Carriers",
      "type": "PARALLEL",
      "order": 3,
      "config": {
        "steps": ["step_3a", "step_3b", "step_3c"],
        "waitForAll": true,
        "maxConcurrency": 3
      }
    },
    {
      "id": "step_3a",
      "name": "Submit to Carrier A",
      "type": "HTTP_REQUEST",
      "order": 3,
      "config": {
        "method": "POST",
        "url": "https://carrier-a.com/api/leads",
        "headers": {
          "Authorization": "Bearer {{config.carrierA.apiKey}}"
        },
        "body": "{{leadData}}",
        "timeout": 30000
      },
      "retryPolicy": {
        "maxAttempts": 3,
        "strategy": "EXPONENTIAL",
        "initialDelay": 1000,
        "maxDelay": 30000,
        "backoffMultiplier": 2
      }
    },
    {
      "id": "step_3b",
      "name": "Submit to Carrier B",
      "type": "HTTP_REQUEST",
      "order": 3,
      "config": {
        "method": "POST",
        "url": "https://carrier-b.com/api/leads",
        "body": "{{leadData}}"
      }
    },
    {
      "id": "step_3c",
      "name": "Submit to Carrier C",
      "type": "HTTP_REQUEST",
      "order": 3,
      "config": {
        "method": "POST",
        "url": "https://carrier-c.com/api/leads",
        "body": "{{leadData}}"
      }
    },
    {
      "id": "step_4",
      "name": "Notify Webhook",
      "type": "WEBHOOK_CALL",
      "order": 4,
      "config": {
        "url": "https://webhook.site/notify",
        "method": "POST",
        "body": {
          "leadId": "{{leadId}}",
          "carriers": ["Carrier A", "Carrier B", "Carrier C"],
          "status": "submitted"
        }
      }
    }
  ],
  "timeout": 120000
}
```

### 2. Quote Comparison Workflow

```json
{
  "name": "Compare Quotes from Multiple Carriers",
  "category": "quote_management",
  "status": "ACTIVE",
  "steps": [
    {
      "id": "get_quotes",
      "name": "Request Quotes",
      "type": "PARALLEL",
      "order": 1,
      "config": {
        "steps": ["quote_a", "quote_b", "quote_c"],
        "waitForAll": true,
        "maxConcurrency": 5
      }
    },
    {
      "id": "transform_quotes",
      "name": "Standardize Quote Data",
      "type": "DATA_TRANSFORM",
      "order": 2,
      "config": {
        "inputVariable": "quotes",
        "outputVariable": "standardizedQuotes",
        "transformations": [
          {
            "type": "MAP",
            "config": {
              "mapping": {
                "premium": "totalPremium",
                "carrier": "insuranceCarrier"
              }
            }
          },
          {
            "type": "CALCULATE",
            "config": {
              "field": "totalPremium",
              "operation": "min"
            }
          }
        ]
      }
    },
    {
      "id": "select_best",
      "name": "Select Best Quote",
      "type": "CONDITIONAL",
      "order": 3,
      "config": {
        "conditions": [
          {
            "field": "standardizedQuotes.bestQuote",
            "operator": "gte",
            "value": 0
          }
        ]
      }
    }
  ]
}
```

### 3. Conditional Lead Routing

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
            "value": 80,
            "logic": "AND"
          },
          {
            "field": "lead.insuranceType",
            "operator": "eq",
            "value": "auto",
            "logic": "AND"
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
        "url": "https://api.internal.com/assignments",
        "body": {
          "leadId": "{{leadId}}",
          "agentType": "premium"
        }
      }
    },
    {
      "id": "route_standard",
      "name": "Route to Standard Agents",
      "type": "HTTP_REQUEST",
      "order": 2,
      "config": {
        "method": "POST",
        "url": "https://api.internal.com/assignments",
        "body": {
          "leadId": "{{leadId}}",
          "agentType": "standard"
        }
      }
    }
  ]
}
```

## Variable Substitution

Workflows support variable substitution using `{{variableName}}` syntax:

### Context Variables
- `{{leadId}}` - Lead ID from workflow input
- `{{stepName.output.field}}` - Output from previous steps
- `{{config.key}}` - Configuration values

### Nested Field Access
- `{{lead.contact.email}}` - Access nested fields
- `{{step_1.output.data.id}}` - Deep nested access

### Example
```json
{
  "url": "https://api.example.com/leads/{{leadId}}",
  "headers": {
    "Authorization": "Bearer {{config.apiKey}}",
    "X-Customer-ID": "{{lead.customerId}}"
  },
  "body": {
    "leadId": "{{leadId}}",
    "agentId": "{{step_1.output.recommendedAgent}}"
  }
}
```

## Circuit Breaker Example

### Creating a Circuit Breaker

```bash
# When a service is first called, a circuit breaker is automatically created
POST /api/v1/orchestration/execute
{
  "requestId": "req_123",
  "steps": [...],
  "context": {
    "serviceId": "carrier-a-api"
  },
  "options": {
    "stopOnFirstError": true
  }
}
```

### Updating Circuit Breaker Configuration

```bash
PUT /api/v1/circuit-breakers/carrier-a-api/config
{
  "threshold": 10,
  "timeout": 120000,
  "halfOpenMaxCalls": 5
}
```

### Manually Resetting Circuit Breaker

```bash
POST /api/v1/circuit-breakers/carrier-a-api/reset
```

## Error Handling

### Step-Level Error Handling
Each step can have a `retryPolicy`:
```json
{
  "retryPolicy": {
    "maxAttempts": 3,
    "strategy": "EXPONENTIAL",
    "initialDelay": 1000,
    "maxDelay": 30000,
    "backoffMultiplier": 2,
    "retryableErrors": ["ECONNREFUSED", "ETIMEDOUT", "5xx"]
  }
}
```

### Workflow-Level Error Handlers
```json
{
  "errorHandlers": [
    {
      "stepId": "submit_to_carrier",
      "errorTypes": ["NETWORK_ERROR", "TIMEOUT"],
      "handlerStepId": "notify_support",
      "shouldContinue": false
    }
  ]
}
```

## Monitoring & Observability

### Workflow Execution Logs
- Automatic logging of each step execution
- Input/output data capture
- Duration tracking
- Attempt tracking for retries

### Metrics Dashboard
- Success/failure rates per workflow
- Average execution times
- Step-level performance metrics
- Circuit breaker status dashboard

### Active Execution Monitoring
```bash
# Get all active orchestrations
GET /api/orchestration/active

# Get specific orchestration status
GET /api/orchestration/active/:requestId
```

## Testing

### Execute a Simple Workflow

```bash
curl -X POST http://localhost:3002/api/orchestration/execute \
  -H "Content-Type: application/json" \
  -d '{
    "requestId": "test_request_123",
    "steps": [
      {
        "id": "step_1",
        "name": "Fetch Data",
        "type": "HTTP_REQUEST",
        "config": {
          "method": "GET",
          "url": "https://jsonplaceholder.typicode.com/posts/1"
        }
      }
    ],
    "context": {},
    "options": {
      "enableLogging": true
    }
  }'
```

### Create a Workflow

```bash
curl -X POST http://localhost:3000/api/v1/workflows \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Workflow",
    "category": "test",
    "status": "ACTIVE",
    "triggers": [
      {
        "type": "MANUAL",
        "config": {},
        "isEnabled": true
      }
    ],
    "steps": []
  }'
```

### Execute a Workflow

```bash
curl -X POST http://localhost:3000/api/v1/workflows/{workflowId}/execute \
  -H "Content-Type: application/json" \
  -d '{
    "input": {
      "leadId": "lead_123"
    }
  }'
```

## Architecture

```
┌─────────────────┐
│   API Layer    │
│   (Express)    │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Data Service   │
│ - Workflow Mgmt│
│ - Execution    │
│ - Circuit      │
│   Breaker      │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Orchestrator  │
│ - Step Engine  │
│ - Dependency   │
│   Resolution  │
│ - Retry Logic  │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│External APIs    │
│ + Circuit      │
│   Breakers     │
└─────────────────┘
```

## Benefits

1. **Scalability** - Parallel step execution for high throughput
2. **Resilience** - Circuit breakers prevent cascading failures
3. **Observability** - Comprehensive logging and metrics
4. **Flexibility** - Support for complex workflow patterns
5. **Reusability** - Workflow templates for common patterns
6. **Reliability** - Automatic retry with exponential backoff
7. **Performance** - Dependency resolution and concurrent execution

## Future Enhancements

- Workflow templates library
- Visual workflow editor
- Workflow versioning and rollback
- Scheduled workflow execution
- Workflow export/import
- Advanced error recovery patterns
- Real-time workflow execution dashboard
- Workflow marketplace
