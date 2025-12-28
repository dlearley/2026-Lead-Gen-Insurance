# Phase 11.4: API Ecosystem - Enable Partner Innovation

## Overview

Phase 11.4 implements a comprehensive API ecosystem that enables external partners to integrate with the Insurance Lead Generation platform. This implementation provides secure API access, webhook notifications, usage tracking, and rate limiting to foster partner innovation.

## Objectives

- Provide secure API access for external partners
- Enable real-time event notifications via webhooks
- Track API usage and provide analytics
- Implement flexible rate limiting based on tiers
- Offer comprehensive developer documentation

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     API Ecosystem Layer                        │
├─────────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐        │
│  │ API Clients  │  │  API Keys    │  │   Webhooks   │        │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘        │
│         │                 │                 │                   │
│         └─────────────────┼─────────────────┘                   │
│                           │                                   │
│                    ┌──────▼──────┐                            │
│                    │ Rate Limiter │                            │
│                    └──────┬──────┘                            │
│                           │                                   │
│                    ┌──────▼──────┐                            │
│                    │  API Usage   │                            │
│                    │  Tracking    │                            │
│                    └──────┬──────┘                            │
│                           │                                   │
│         ┌─────────────────┼─────────────────┐                 │
│         │                 │                 │                 │
│  ┌──────▼──────┐  ┌────▼──────────┐  ┌──▼──────────┐     │
│  │ Leads API   │  │ Quotes API    │  │ Analytics  │     │
│  └─────────────┘  └───────────────┘  └────────────┘     │
└─────────────────────────────────────────────────────────────────┘
```

## Database Models

### ApiClient

Represents an external partner application that consumes the API.

```prisma
model ApiClient {
  id                  String     @id @default(uuid())
  name                String
  description         String?
  redirectUris        String[]
  website             String?
  logoUrl             String?
  contactEmail        String
  status              ApiClientStatus @default(ACTIVE)
  rateLimitTier       RateLimitTier @default(BASIC)
  webhookUrl          String?
  webhookSecret       String?
  scopes              String[]
  metadata            Json?
  createdAt           DateTime   @default(now())
  updatedAt           DateTime   @updatedAt

  apiKeys             ApiKey[]
  webhookSubscriptions WebhookSubscription[]
  apiUsageLogs        ApiUsageLog[]
  apiRateLimits       ApiRateLimit[]
}
```

### ApiKey

Authentication keys for API access.

```prisma
model ApiKey {
  id                  String     @id @default(uuid())
  clientId            String
  keyId               String     @unique
  keyHash             String
  keyPrefix           String
  name                String
  status              ApiKeyStatus @default(ACTIVE)
  lastUsedAt          DateTime?
  expiresAt           DateTime?
  scopes              String[]
  rateLimitOverride   Int?
  metadata            Json?
  createdAt           DateTime   @default(now())
  updatedAt           DateTime   @updatedAt

  apiClient           ApiClient   @relation(fields: [clientId], references: [id], onDelete: Cascade)
}
```

### WebhookSubscription

Subscriptions to real-time event notifications.

```prisma
model WebhookSubscription {
  id                  String     @id @default(uuid())
  clientId            String
  url                 String
  secret              String
  events              String[]
  status              WebhookStatus @default(ACTIVE)
  retryConfig         Json?
  metadata            Json?
  createdAt           DateTime   @default(now())
  updatedAt           DateTime   @updatedAt

  apiClient           ApiClient   @relation(fields: [clientId], references: [id], onDelete: Cascade)
  deliveries          WebhookDelivery[]
}
```

### WebhookDelivery

Tracking of webhook delivery attempts.

```prisma
model WebhookDelivery {
  id                  String     @id @default(uuid())
  subscriptionId      String
  eventType           String
  payload             Json
  responseCode        Int?
  responseBody        String?
  attemptCount        Int        @default(0)
  status              DeliveryStatus @default(PENDING)
  scheduledFor        DateTime   @default(now())
  deliveredAt         DateTime?
  nextRetryAt         DateTime?
  errorMessage        String?
  metadata            Json?
  createdAt           DateTime   @default(now())
  updatedAt           DateTime   @updatedAt

  subscription        WebhookSubscription @relation(fields: [subscriptionId], references: [id], onDelete: Cascade)
}
```

### ApiUsageLog

Usage tracking for analytics and billing.

```prisma
model ApiUsageLog {
  id                  String     @id @default(uuid())
  clientId            String
  apiKeyId            String?
  endpoint            String
  method              String
  statusCode          Int
  responseTimeMs      Int
  requestIp           String?
  userAgent           String?
  requestSize         Int?
  responseSize        Int?
  timestamp           DateTime   @default(now())

  apiClient           ApiClient   @relation(fields: [clientId], references: [id], onDelete: Cascade)
}
```

### ApiRateLimit

Rate limiting tracking per client.

```prisma
model ApiRateLimit {
  id                  String     @id @default(uuid())
  clientId            String
  window              String
  requestCount        Int        @default(0)
  requestLimit        Int
  resetAt             DateTime
  createdAt           DateTime   @default(now())
  updatedAt           DateTime   @updatedAt

  apiClient           ApiClient   @relation(fields: [clientId], references: [id], onDelete: Cascade)
}
```

## Rate Limiting Tiers

### Basic
- Requests per minute: 60
- Requests per hour: 1,000
- Requests per day: 10,000
- Burst limit: 10

### Standard
- Requests per minute: 120
- Requests per hour: 5,000
- Requests per day: 50,000
- Burst limit: 20

### Premium
- Requests per minute: 300
- Requests per hour: 15,000
- Requests per day: 150,000
- Burst limit: 50

### Enterprise
- Requests per minute: 600
- Requests per hour: 50,000
- Requests per day: 500,000
- Burst limit: 100

## API Endpoints

### API Client Management

#### Create API Client
```
POST /api/v1/api-clients
```

Request Body:
```json
{
  "name": "My Partner Application",
  "description": "Integration for lead management",
  "redirectUris": ["https://example.com/callback"],
  "website": "https://example.com",
  "contactEmail": "tech@example.com",
  "rateLimitTier": "standard",
  "scopes": ["leads:read", "leads:write"]
}
```

#### List API Clients
```
GET /api/v1/api-clients
```

Query Parameters:
- `status` (optional): Filter by status
- `rateLimitTier` (optional): Filter by tier
- `contactEmail` (optional): Search by email
- `search` (optional): Search by name or email
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 20)

#### Get API Client
```
GET /api/v1/api-clients/:id
```

#### Update API Client
```
PUT /api/v1/api-clients/:id
```

#### Delete API Client
```
DELETE /api/v1/api-clients/:id
```

#### Get API Client Dashboard
```
GET /api/v1/api-clients/:id/dashboard
```

Returns usage statistics, webhook status, and rate limit information.

### API Key Management

#### Create API Key
```
POST /api/v1/api-keys
```

Request Body:
```json
{
  "clientId": "uuid",
  "name": "Production Key",
  "expiresAt": "2025-12-31T23:59:59Z",
  "scopes": ["leads:read", "leads:write"],
  "rateLimitOverride": 200
}
```

Response:
```json
{
  "id": "uuid",
  "keyId": "ins_abc123...",
  "keyPrefix": "ins_abc1",
  "key": "ins_abc123_xxxxxxxxxxxxxxxxxxxxxx", // Only returned on creation
  "name": "Production Key",
  "status": "active",
  "expiresAt": "2025-12-31T23:59:59Z",
  "scopes": ["leads:read", "leads:write"],
  "createdAt": "2024-01-15T10:00:00Z"
}
```

#### List API Keys
```
GET /api/v1/api-clients/:clientId/api-keys
```

#### Revoke API Key
```
DELETE /api/v1/api-clients/:clientId/api-keys/:apiKeyId
```

### Webhook Management

#### Create Webhook Subscription
```
POST /api/v1/api-clients/:clientId/webhooks
```

Request Body:
```json
{
  "url": "https://example.com/webhooks",
  "events": ["lead.created", "lead.converted"],
  "retryConfig": {
    "maxRetries": 3,
    "retryDelay": 60,
    "backoffMultiplier": 2,
    "timeout": 30
  }
}
```

#### List Webhooks
```
GET /api/v1/api-clients/:clientId/webhooks
```

#### Update Webhook
```
PUT /api/v1/api-clients/:clientId/webhooks/:webhookId
```

#### Delete Webhook
```
DELETE /api/v1/api-clients/:clientId/webhooks/:webhookId
```

#### Get Webhook Deliveries
```
GET /api/v1/api-clients/:clientId/webhooks/:webhookId/deliveries
```

### API Usage

#### Get Usage Statistics
```
GET /api/v1/api-clients/:clientId/usage
```

Query Parameters:
- `dateFrom` (optional): Start date
- `dateTo` (optional): End date
- `groupBy` (optional): Grouping strategy ('hour' or 'day')

Response:
```json
{
  "totalRequests": 12500,
  "successfulRequests": 12000,
  "failedRequests": 500,
  "averageResponseTime": 150,
  "requestsByEndpoint": [
    {
      "endpoint": "/api/v1/leads",
      "count": 8000,
      "avgResponseTime": 120
    }
  ],
  "requestsByTime": [
    {
      "time": "2024-01-15",
      "count": 450
    }
  ],
  "topErrorCodes": [
    {
      "statusCode": 400,
      "count": 300
    }
  ]
}
```

### Rate Limit Information

#### Get Rate Limit Tiers
```
GET /api/v1/rate-limits
```

Response:
```json
{
  "data": {
    "basic": {
      "requestsPerMinute": 60,
      "requestsPerHour": 1000,
      "requestsPerDay": 10000
    },
    "standard": {
      "requestsPerMinute": 120,
      "requestsPerHour": 5000,
      "requestsPerDay": 50000
    },
    "premium": {
      "requestsPerMinute": 300,
      "requestsPerHour": 15000,
      "requestsPerDay": 150000
    },
    "enterprise": {
      "requestsPerMinute": 600,
      "requestsPerHour": 50000,
      "requestsPerDay": 500000
    }
  }
}
```

#### Get Available Webhook Events
```
GET /api/v1/webhook-events
```

Response:
```json
{
  "data": [
    "lead.created",
    "lead.updated",
    "lead.qualified",
    "lead.converted",
    "lead.rejected",
    "assignment.created",
    "assignment.accepted",
    "assignment.rejected",
    "policy.created",
    "policy.updated",
    "policy.activated",
    "policy.cancelled",
    "quote.created",
    "quote.sent",
    "quote.accepted",
    "quote.rejected",
    "proposal.created",
    "proposal.sent",
    "proposal.accepted",
    "proposal.rejected"
  ]
}
```

## Authentication

### API Key Authentication

All API requests must include an `Authorization` header with the API key:

```
Authorization: Bearer ins_abc123_xxxxxxxxxxxxxxxxxxxxxx
```

### Rate Limiting Headers

API responses include rate limit headers:

```
X-RateLimit-Limit: 120
X-RateLimit-Remaining: 115
X-RateLimit-Reset: 2024-01-15T11:00:00Z
```

## Webhook Events

### Event Structure

All webhooks follow this structure:

```json
{
  "id": "webhook-event-uuid",
  "eventType": "lead.created",
  "timestamp": "2024-01-15T10:30:00Z",
  "data": {
    "leadId": "lead-uuid",
    "email": "john@example.com",
    "status": "received"
  },
  "version": "1.0"
}
```

### Webhook Headers

Webhook requests include these headers for signature verification:

```
Content-Type: application/json
X-Webhook-Id: webhook-event-uuid
X-Webhook-Event: lead.created
X-Webhook-Timestamp: 2024-01-15T10:30:00Z
X-Webhook-Signature: t=1705303800,v1=abc123...
```

### Signature Verification

To verify webhook authenticity:

```javascript
const crypto = require('crypto');

function verifyWebhook(payload, signature, secret) {
  const [timestamp, hash] = signature.substring(2).split(',v1=');
  const expectedHash = crypto
    .createHmac('sha256', secret)
    .update(`${timestamp}.${JSON.stringify(payload)}`)
    .digest('hex');

  return hash === expectedHash;
}
```

## API Scopes

The following scopes are available for fine-grained permission control:

- `leads:read` - Read lead information
- `leads:write` - Create and update leads
- `leads:delete` - Delete leads
- `agents:read` - Read agent information
- `agents:write` - Create and update agents
- `policies:read` - Read policy information
- `policies:write` - Create and update policies
- `webhooks:read` - Read webhook subscriptions
- `webhooks:write` - Create and update webhooks
- `analytics:read` - Access analytics data
- `customers:read` - Read customer information
- `customers:write` - Create and update customers
- `quotes:read` - Read quote information
- `quotes:write` - Create and update quotes
- `proposals:read` - Read proposal information
- `proposals:write` - Create and update proposals

## Integration Examples

### Node.js Example

```javascript
const API_KEY = 'ins_abc123_xxxxxxxxxxxxxxxxxxxxxx';

async function createLead(leadData) {
  const response = await fetch('http://localhost:3001/api/v1/leads', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(leadData),
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  return response.json();
}

// Usage
const lead = await createLead({
  source: 'partner_integration',
  email: 'john@example.com',
  firstName: 'John',
  lastName: 'Doe',
  insuranceType: 'AUTO',
});

console.log('Created lead:', lead);
```

### Python Example

```python
import requests

API_KEY = 'ins_abc123_xxxxxxxxxxxxxxxxxxxxxx'
BASE_URL = 'http://localhost:3001/api/v1'

def create_lead(lead_data):
    headers = {
        'Authorization': f'Bearer {API_KEY}',
        'Content-Type': 'application/json',
    }
    
    response = requests.post(
        f'{BASE_URL}/leads',
        headers=headers,
        json=lead_data
    )
    
    response.raise_for_status()
    return response.json()

# Usage
lead = create_lead({
    'source': 'partner_integration',
    'email': 'john@example.com',
    'firstName': 'John',
    'lastName': 'Doe',
    'insuranceType': 'AUTO',
})

print(f'Created lead: {lead}')
```

### Webhook Handler Example (Express.js)

```javascript
const express = require('express');
const crypto = require('crypto');
const app = express();

const WEBHOOK_SECRET = 'your-webhook-secret';

app.post('/webhooks', express.raw({ type: 'application/json' }), (req, res) => {
  const signature = req.headers['x-webhook-signature'];
  const payload = JSON.parse(req.body);

  // Verify signature
  if (!verifyWebhook(payload, signature, WEBHOOK_SECRET)) {
    return res.status(401).json({ error: 'Invalid signature' });
  }

  // Handle event
  console.log(`Received event: ${payload.eventType}`, payload.data);

  res.status(200).send('OK');
});

function verifyWebhook(payload, signature, secret) {
  const [timestamp, hash] = signature.substring(2).split(',v1=');
  const expectedHash = crypto
    .createHmac('sha256', secret)
    .update(`${timestamp}.${JSON.stringify(payload)}`)
    .digest('hex');

  return hash === expectedHash;
}

app.listen(3000, () => console.log('Webhook server running on port 3000'));
```

## Files Created

### Database Schema
- `prisma/schema.prisma` - Added API ecosystem models

### Type Definitions
- `packages/types/src/api-ecosystem.ts` - Complete TypeScript types for API ecosystem
- `packages/types/src/index.ts` - Exported API ecosystem types

### Data Service
- `apps/data-service/src/services/api-client-repository.ts` - Database operations for API ecosystem
- `apps/data-service/src/services/api-ecosystem.service.ts` - Business logic for API ecosystem
- `apps/data-service/src/routes/api-ecosystem.routes.ts` - API endpoints for ecosystem management
- `apps/data-service/src/index.ts` - Registered API ecosystem routes

## Next Steps

1. **Generate and run database migrations**:
   ```bash
   pnpm db:generate
   pnpm db:push
   ```

2. **Test the API endpoints**:
   - Create API clients
   - Generate API keys
   - Set up webhooks
   - Test rate limiting

3. **Create developer portal**:
   - Interactive API documentation
   - Getting started guide
   - Code examples
   - Testing console

4. **Implement OAuth2 flows** (optional enhancement):
   - Authorization code flow
   - Refresh token mechanism
   - PKCE support

5. **Add monitoring and alerting**:
   - Monitor webhook delivery success rate
   - Track API usage patterns
   - Alert on rate limit breaches

## Success Metrics

- API clients successfully created and authenticated
- Webhook events delivered reliably
- Rate limiting enforced correctly
- Usage analytics accurately tracked
- Partners able to integrate independently

## Timeline

- **Week 1**: Database schema, types, repository layer
- **Week 2**: Service layer and API routes
- **Week 3**: Webhook system and rate limiting
- **Week 4**: Testing, documentation, and deployment

---

**Phase Status**: ✅ Implementation Complete

This implementation provides a complete API ecosystem that enables partners to integrate securely and effectively with the platform, fostering innovation and extending the platform's capabilities.
