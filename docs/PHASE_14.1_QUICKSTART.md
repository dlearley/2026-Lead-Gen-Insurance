# Phase 14.1 Quickstart Guide

## Prerequisites

- All services running (API, Data Service, Orchestrator)
- Database migrations applied
- Redis running for caching

## Database Migration

First, apply the new Prisma schema changes:

```bash
cd apps/data-service
npx prisma generate
npx prisma db push
```

## Starting Services

```bash
# Start infrastructure
docker compose up -d

# Start data service
cd apps/data-service
npm run dev

# Start API service (in new terminal)
cd apps/api
npm run dev

# Start orchestrator service (in new terminal)
cd apps/orchestrator
npm run dev
```

## Quick Start Examples

### 1. Create a Simple Workflow

```bash
curl -X POST http://localhost:3000/api/v1/workflows \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test HTTP Request",
    "category": "testing",
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
        "id": "step_1",
        "name": "Fetch Data",
        "type": "HTTP_REQUEST",
        "order": 1,
        "config": {
          "method": "GET",
          "url": "https://jsonplaceholder.typicode.com/posts/1"
        }
      }
    ]
  }'
```

### 2. Execute the Workflow

```bash
WORKFLOW_ID="<workflow_id_from_step_1>"

curl -X POST http://localhost:3000/api/v1/workflows/$WORKFLOW_ID/execute \
  -H "Content-Type: application/json" \
  -d '{
    "input": {
      "leadId": "test_lead_123"
    }
  }'
```

### 3. Check Execution Status

```bash
EXECUTION_ID="<execution_id_from_step_2>"

curl -X GET http://localhost:3000/api/v1/executions/$EXECUTION_ID
```

### 4. Get Workflow Metrics

```bash
curl -X GET http://localhost:3000/api/v1/workflows/$WORKFLOW_ID/metrics
```

### 5. Execute Orchestrated Request

```bash
curl -X POST http://localhost:3002/api/orchestration/execute \
  -H "Content-Type: application/json" \
  -d '{
    "requestId": "orch_test_123",
    "steps": [
      {
        "id": "step_1",
        "name": "Fetch Post",
        "type": "HTTP_REQUEST",
        "config": {
          "method": "GET",
          "url": "https://jsonplaceholder.typicode.com/posts/1"
        }
      },
      {
        "id": "step_2",
        "name": "Wait 1 Second",
        "type": "WAIT",
        "dependsOn": ["step_1"],
        "config": {
          "duration": 1,
          "unit": "SECONDS"
        }
      }
    ],
    "context": {},
    "options": {
      "enableLogging": true,
      "stopOnFirstError": true
    }
  }'
```

### 6. Check Circuit Breaker Status

```bash
# List all circuit breakers
curl -X GET http://localhost:3000/api/v1/circuit-breakers

# Get specific circuit breaker
curl -X GET http://localhost:3000/api/v1/circuit-breakers/service-a-api

# Reset a circuit breaker
curl -X POST http://localhost:3000/api/v1/circuit-breakers/service-a-api/reset

# Update circuit breaker config
curl -X PUT http://localhost:3000/api/v1/circuit-breakers/service-a-api/config \
  -H "Content-Type: application/json" \
  -d '{
    "threshold": 10,
    "timeout": 120000,
    "halfOpenMaxCalls": 5
  }'
```

## Real-World Example: Submit Lead to Multiple Carriers

```bash
# Create the workflow
curl -X POST http://localhost:3000/api/v1/workflows \
  -H "Content-Type: application/json" \
  -d '{
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
        "id": "validate_lead",
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
        "id": "submit_carriers",
        "name": "Submit to Carriers in Parallel",
        "type": "PARALLEL",
        "order": 3,
        "config": {
          "steps": ["submit_carrier_a", "submit_carrier_b", "submit_carrier_c"],
          "waitForAll": true,
          "maxConcurrency": 3
        }
      },
      {
        "id": "submit_carrier_a",
        "name": "Submit to Carrier A",
        "type": "HTTP_REQUEST",
        "order": 3,
        "config": {
          "method": "POST",
          "url": "https://carrier-a.example.com/api/leads",
          "headers": {
            "Content-Type": "application/json",
            "Authorization": "Bearer {{config.carrierA.apiKey}}"
          },
          "body": "{{leadData}}"
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
        "id": "submit_carrier_b",
        "name": "Submit to Carrier B",
        "type": "HTTP_REQUEST",
        "order": 3,
        "config": {
          "method": "POST",
          "url": "https://carrier-b.example.com/api/leads",
          "body": "{{leadData}}"
        }
      },
      {
        "id": "submit_carrier_c",
        "name": "Submit to Carrier C",
        "type": "HTTP_REQUEST",
        "order": 3,
        "config": {
          "method": "POST",
          "url": "https://carrier-c.example.com/api/leads",
          "body": "{{leadData}}"
        }
      },
      {
        "id": "notify_webhook",
        "name": "Notify Completion",
        "type": "WEBHOOK_CALL",
        "order": 4,
        "config": {
          "url": "https://webhook.site/notify",
          "method": "POST",
          "body": {
            "leadId": "{{leadId}}",
            "carriers": ["Carrier A", "Carrier B", "Carrier C"],
            "status": "submitted",
            "timestamp": "{{now}}"
          }
        }
      }
    ],
    "timeout": 120000
  }'
```

### Execute the workflow

```bash
WORKFLOW_ID="<workflow_id>"

curl -X POST http://localhost:3000/api/v1/workflows/$WORKFLOW_ID/execute \
  -H "Content-Type: application/json" \
  -d '{
    "input": {
      "leadId": "lead_123",
      "config": {
        "carrierA": {
          "apiKey": "your-api-key-here"
        }
      },
      "now": "2024-01-15T10:30:00Z"
    }
  }'
```

## Monitoring

### Health Checks

```bash
# Data service health
curl http://localhost:3001/health

# API service health
curl http://localhost:3000/health

# Orchestrator health
curl http://localhost:3002/health
```

### View Active Orchestrations

```bash
curl http://localhost:3002/api/orchestration/active
```

### List All Workflows

```bash
curl http://localhost:3000/api/v1/workflows
```

### Get Workflow Executions

```bash
curl http://localhost:3000/api/v1/executions?workflowId=<workflow_id>&status=COMPLETED&limit=10
```

## Common Issues

### Circuit Breaker is OPEN

If a circuit breaker is blocking requests:

1. Check the circuit breaker status
   ```bash
   curl http://localhost:3000/api/v1/circuit-breakers/service-id
   ```

2. Check if the external service is healthy

3. Reset the circuit breaker manually if needed
   ```bash
   curl -X POST http://localhost:3000/api/v1/circuit-breakers/service-id/reset
   ```

### Workflow Execution Failed

1. Check the execution details
   ```bash
   curl http://localhost:3000/api/v1/executions/<execution_id>
   ```

2. Review the failed step in the execution logs

3. Check if external APIs are accessible

4. Verify variable substitution is correct

### Steps Not Executing in Order

1. Check step dependencies (`dependsOn` field)
2. Ensure step IDs match in dependencies
3. Review workflow step order

## Next Steps

- Review [Phase 14.1 Documentation](./PHASE_14.1.md) for full API details
- Explore workflow examples
- Build custom workflows for your use cases
- Set up monitoring and alerts
- Configure circuit breakers for all external services
