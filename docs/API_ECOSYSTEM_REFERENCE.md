# API Ecosystem Reference Documentation

## Base URL

```
Production: https://api.insurance-leads.com/api/v1
Staging: https://api-staging.insurance-leads.com/api/v1
Development: http://localhost:3001/api/v1
```

## Authentication

All API requests require authentication using Bearer token:

```
Authorization: Bearer YOUR_API_KEY
```

## Common Response Structure

### Success Response

```json
{
  "data": { ... },
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "totalPages": 5
  }
}
```

### Error Response

```json
{
  "error": "ERROR_CODE",
  "message": "Human-readable error message",
  "details": { ... }
}
```

### Error Codes

| Code | Description |
|------|-------------|
| `VALIDATION_ERROR` | Request validation failed |
| `UNAUTHORIZED` | Invalid or missing authentication |
| `FORBIDDEN` | Insufficient permissions |
| `NOT_FOUND` | Resource not found |
| `RATE_LIMIT_EXCEEDED` | Rate limit exceeded |
| `INTERNAL_SERVER_ERROR` | Server error |

---

## API Clients

### Create API Client

```http
POST /api-clients
```

Creates a new API client for a partner application.

**Request Body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| name | string | Yes | Client name (1-255 chars) |
| description | string | No | Client description |
| redirectUris | string[] | Yes | Valid redirect URIs |
| website | string | No | Client website URL |
| logoUrl | string | No | Client logo URL |
| contactEmail | string | Yes | Contact email address |
| rateLimitTier | enum | No | Rate limit tier (basic, standard, premium, enterprise) |
| webhookUrl | string | No | Default webhook URL |
| scopes | string[] | No | Permission scopes |
| metadata | object | No | Custom metadata |

**Example:**

```json
{
  "name": "My Partner App",
  "description": "Integration for lead management",
  "redirectUris": ["https://example.com/callback"],
  "website": "https://example.com",
  "contactEmail": "tech@example.com",
  "rateLimitTier": "standard",
  "scopes": ["leads:read", "leads:write", "webhooks:write"]
}
```

**Response:**

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "name": "My Partner App",
  "description": "Integration for lead management",
  "redirectUris": ["https://example.com/callback"],
  "website": "https://example.com",
  "logoUrl": null,
  "contactEmail": "tech@example.com",
  "status": "ACTIVE",
  "rateLimitTier": "STANDARD",
  "webhookUrl": null,
  "webhookSecret": null,
  "scopes": ["leads:read", "leads:write", "webhooks:write"],
  "metadata": null,
  "createdAt": "2024-01-15T10:00:00Z",
  "updatedAt": "2024-01-15T10:00:00Z",
  "apiKeys": [],
  "webhookSubscriptions": []
}
```

---

### List API Clients

```http
GET /api-clients
```

Lists API clients with filtering and pagination.

**Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| status | string | Filter by status |
| rateLimitTier | string | Filter by rate limit tier |
| contactEmail | string | Search by contact email |
| search | string | Search by name or email |
| page | integer | Page number (default: 1) |
| limit | integer | Items per page (default: 20, max: 100) |
| sortBy | string | Sort field |
| sortOrder | string | Sort direction (asc, desc) |

**Example:**

```
GET /api-clients?status=ACTIVE&rateLimitTier=STANDARD&page=1&limit=20
```

**Response:**

```json
{
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "name": "My Partner App",
      "status": "ACTIVE",
      "rateLimitTier": "STANDARD",
      "contactEmail": "tech@example.com",
      "createdAt": "2024-01-15T10:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 50,
    "totalPages": 3
  }
}
```

---

### Get API Client

```http
GET /api-clients/:id
```

Retrieves details of a specific API client.

**Example:**

```
GET /api-clients/550e8400-e29b-41d4-a716-446655440000
```

**Response:**

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "name": "My Partner App",
  "status": "ACTIVE",
  "rateLimitTier": "STANDARD",
  "contactEmail": "tech@example.com",
  "apiKeys": [
    {
      "id": "660f9511-f3ac-52e5-b827-557766551111",
      "keyId": "ins_abc123def456",
      "keyPrefix": "ins_abc1",
      "name": "Production Key",
      "status": "ACTIVE",
      "lastUsedAt": "2024-01-15T11:30:00Z",
      "expiresAt": "2025-01-15T10:00:00Z",
      "scopes": ["leads:read", "leads:write"],
      "createdAt": "2024-01-15T10:00:00Z"
    }
  ],
  "webhookSubscriptions": []
}
```

---

### Update API Client

```http
PUT /api-clients/:id
```

Updates an existing API client.

**Request Body:** Same as create (all fields optional)

**Example:**

```json
{
  "status": "SUSPENDED",
  "rateLimitTier": "PREMIUM"
}
```

---

### Delete API Client

```http
DELETE /api-clients/:id
```

Permanently deletes an API client and all associated keys and webhooks.

**Response:** `204 No Content`

---

### Get API Client Dashboard

```http
GET /api-clients/:id/dashboard
```

Retrieves dashboard information for an API client.

**Example:**

```
GET /api-clients/550e8400-e29b-41d4-a716-446655440000/dashboard
```

**Response:**

```json
{
  "client": { ... },
  "usageStats": {
    "totalRequests": 12500,
    "successfulRequests": 12000,
    "failedRequests": 500,
    "averageResponseTime": 150,
    "requestsByEndpoint": [ ... ],
    "requestsByTime": [ ... ],
    "topErrorCodes": [ ... ]
  },
  "activeWebhooks": 3,
  "totalWebhooks": 5,
  "rateLimitStatus": {
    "tier": "STANDARD",
    "remaining": 115,
    "limit": 120,
    "resetAt": "2024-01-15T11:00:00Z"
  }
}
```

---

## API Keys

### Create API Key

```http
POST /api-keys
```

Creates a new API key for a client.

**Request Body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| clientId | string | Yes | API client ID |
| name | string | Yes | Key name (1-255 chars) |
| expiresAt | datetime | No | Expiration date |
| scopes | string[] | No | Permission scopes |
| rateLimitOverride | integer | No | Custom rate limit |
| metadata | object | No | Custom metadata |

**Example:**

```json
{
  "clientId": "550e8400-e29b-41d4-a716-446655440000",
  "name": "Production Key",
  "expiresAt": "2025-12-31T23:59:59Z",
  "scopes": ["leads:read", "leads:write"],
  "rateLimitOverride": 200
}
```

**Response:**

```json
{
  "id": "660f9511-f3ac-52e5-b827-557766551111",
  "keyId": "ins_abc123def456",
  "keyPrefix": "ins_abc1",
  "key": "ins_abc123def456_xxxxxxxxxxxxxxxxxxxxxx",
  "name": "Production Key",
  "status": "ACTIVE",
  "expiresAt": "2025-12-31T23:59:59Z",
  "scopes": ["leads:read", "leads:write"],
  "createdAt": "2024-01-15T10:00:00Z"
}
```

⚠️ **Security Note:** The full API key (`key`) is only returned during creation. Save it securely!

---

### List API Keys

```http
GET /api-clients/:clientId/api-keys
```

Retrieves all API keys for a client.

**Response:**

```json
{
  "data": [
    {
      "id": "660f9511-f3ac-52e5-b827-557766551111",
      "keyId": "ins_abc123def456",
      "keyPrefix": "ins_abc1",
      "name": "Production Key",
      "status": "ACTIVE",
      "lastUsedAt": "2024-01-15T11:30:00Z",
      "expiresAt": "2025-01-15T10:00:00Z",
      "scopes": ["leads:read", "leads:write"],
      "createdAt": "2024-01-15T10:00:00Z"
    }
  ]
}
```

---

### Revoke API Key

```http
DELETE /api-clients/:clientId/api-keys/:apiKeyId
```

Revokes an API key immediately.

**Response:** `204 No Content`

---

## Webhooks

### Create Webhook Subscription

```http
POST /api-clients/:clientId/webhooks
```

Creates a webhook subscription for event notifications.

**Request Body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| url | string | Yes | Webhook endpoint URL |
| events | string[] | Yes | Event types to subscribe to |
| retryConfig | object | No | Retry configuration |
| retryConfig.maxRetries | integer | No | Maximum retry attempts (0-10) |
| retryConfig.retryDelay | integer | No | Initial retry delay in seconds |
| retryConfig.backoffMultiplier | number | No | Exponential backoff multiplier |
| retryConfig.timeout | integer | No | Request timeout in seconds |
| metadata | object | No | Custom metadata |

**Example:**

```json
{
  "url": "https://example.com/webhooks",
  "events": ["lead.created", "lead.converted", "policy.created"],
  "retryConfig": {
    "maxRetries": 3,
    "retryDelay": 60,
    "backoffMultiplier": 2,
    "timeout": 30
  }
}
```

**Response:**

```json
{
  "id": "770g0622-g4bd-63f6-c938-668877662222",
  "clientId": "550e8400-e29b-41d4-a716-446655440000",
  "url": "https://example.com/webhooks",
  "secret": "webhook_secret_abc123...",
  "events": ["lead.created", "lead.converted", "policy.created"],
  "status": "ACTIVE",
  "retryConfig": {
    "maxRetries": 3,
    "retryDelay": 60,
    "backoffMultiplier": 2,
    "timeout": 30
  },
  "createdAt": "2024-01-15T10:00:00Z",
  "updatedAt": "2024-01-15T10:00:00Z"
}
```

⚠️ **Security Note:** Save the `secret` securely to verify webhook signatures!

---

### List Webhook Subscriptions

```http
GET /api-clients/:clientId/webhooks
```

Retrieves webhook subscriptions for a client.

**Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| status | string | Filter by status |

**Example:**

```
GET /api-clients/550e8400-e29b-41d4-a716-446655440000/webhooks?status=ACTIVE
```

**Response:**

```json
{
  "data": [
    {
      "id": "770g0622-g4bd-63f6-c938-668877662222",
      "url": "https://example.com/webhooks",
      "events": ["lead.created", "lead.converted"],
      "status": "ACTIVE",
      "createdAt": "2024-01-15T10:00:00Z",
      "_count": {
        "deliveries": 1250
      }
    }
  ]
}
```

---

### Update Webhook Subscription

```http
PUT /api-clients/:clientId/webhooks/:webhookId
```

Updates a webhook subscription.

**Request Body:** Same as create (all fields optional)

**Example:**

```json
{
  "status": "PAUSED",
  "events": ["lead.created", "lead.converted", "policy.activated"]
}
```

---

### Delete Webhook Subscription

```http
DELETE /api-clients/:clientId/webhooks/:webhookId
```

Deletes a webhook subscription.

**Response:** `204 No Content`

---

### Get Webhook Deliveries

```http
GET /api-clients/:clientId/webhooks/:webhookId/deliveries
```

Retrieves delivery history for a webhook.

**Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| limit | integer | Number of deliveries to return (default: 50, max: 100) |

**Example:**

```
GET /api-clients/550e8400-e29b-41d4-a716-446655440000/webhooks/770g0622-g4bd-63f6-c938-668877662222/deliveries?limit=50
```

**Response:**

```json
{
  "data": [
    {
      "id": "880h1733-h5ce-74g7-d049-779988773333",
      "subscriptionId": "770g0622-g4bd-63f6-c938-668877662222",
      "eventType": "lead.created",
      "payload": { ... },
      "responseCode": 200,
      "attemptCount": 1,
      "status": "DELIVERED",
      "scheduledFor": "2024-01-15T10:30:00Z",
      "deliveredAt": "2024-01-15T10:30:01Z",
      "createdAt": "2024-01-15T10:30:00Z"
    }
  ]
}
```

---

## API Usage

### Get Usage Statistics

```http
GET /api-clients/:clientId/usage
```

Retrieves API usage statistics for a client.

**Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| dateFrom | datetime | Start date filter |
| dateTo | datetime | End date filter |
| groupBy | string | Grouping strategy (hour, day) |

**Example:**

```
GET /api-clients/550e8400-e29b-41d4-a716-446655440000/usage?dateFrom=2024-01-01T00:00:00Z&dateTo=2024-01-31T23:59:59Z&groupBy=day
```

**Response:**

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
    },
    {
      "endpoint": "/api/v1/policies",
      "count": 4500,
      "avgResponseTime": 180
    }
  ],
  "requestsByTime": [
    {
      "time": "2024-01-15",
      "count": 450
    },
    {
      "time": "2024-01-16",
      "count": 520
    }
  ],
  "topErrorCodes": [
    {
      "statusCode": 400,
      "count": 300
    },
    {
      "statusCode": 404,
      "count": 150
    },
    {
      "statusCode": 500,
      "count": 50
    }
  ]
}
```

---

## Rate Limits

### Get Rate Limit Tiers

```http
GET /rate-limits
```

Retrieves available rate limit tier configurations.

**Response:**

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

---

## Webhook Events

### Get Available Webhook Events

```http
GET /webhook-events
```

Retrieves list of available webhook event types.

**Response:**

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

---

## Rate Limit Headers

All API responses include rate limit headers:

| Header | Description |
|---------|-------------|
| `X-RateLimit-Limit` | Request limit for the current time window |
| `X-RateLimit-Remaining` | Remaining requests in current window |
| `X-RateLimit-Reset` | Time when the rate limit window resets (ISO 8601) |

**Example:**

```http
HTTP/1.1 200 OK
X-RateLimit-Limit: 120
X-RateLimit-Remaining: 115
X-RateLimit-Reset: 2024-01-15T11:00:00Z
```

---

## Rate Limit Error

When rate limit is exceeded:

**Response Code:** `429 Too Many Requests`

**Response Body:**

```json
{
  "error": "RATE_LIMIT_EXCEEDED",
  "message": "API rate limit exceeded",
  "retryAfter": 45
}
```

**Response Headers:**

```http
Retry-After: 45
```

---

## HTTP Status Codes

| Code | Description |
|------|-------------|
| 200 | Success |
| 201 | Created |
| 204 | No Content |
| 400 | Bad Request |
| 401 | Unauthorized |
| 403 | Forbidden |
| 404 | Not Found |
| 429 | Rate Limit Exceeded |
| 500 | Internal Server Error |
| 502 | Bad Gateway |
| 503 | Service Unavailable |

---

## Pagination

All list endpoints support pagination.

**Query Parameters:**

| Parameter | Type | Default | Max | Description |
|-----------|------|---------|------|-------------|
| page | integer | 1 | - | Page number |
| limit | integer | 20 | 100 | Items per page |

**Response Structure:**

```json
{
  "data": [ ... ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "totalPages": 5
  }
}
```

---

## Filtering

Most list endpoints support filtering.

**Common Filters:**

| Filter | Example | Description |
|--------|---------|-------------|
| status | `?status=ACTIVE` | Filter by status |
| dateFrom | `?dateFrom=2024-01-01T00:00:00Z` | Start date |
| dateTo | `?dateTo=2024-01-31T23:59:59Z` | End date |
| search | `?search=My+App` | Text search |

---

## Sorting

Most list endpoints support sorting.

**Query Parameters:**

| Parameter | Example | Description |
|-----------|---------|-------------|
| sortBy | `?sortBy=createdAt` | Sort field |
| sortOrder | `?sortOrder=desc` | Sort direction (asc, desc) |

**Example:**

```
GET /api-clients?sortBy=createdAt&sortOrder=desc
```

---

## Versioning

The API is versioned using the URL path: `/api/v1/`.

### Version Policy

- **Backwards compatibility**: Changes that don't break existing clients are made without version changes
- **Breaking changes**: Require a new version (e.g., `/api/v2/`)
- **Deprecation notice**: 6 months advance notice before removing deprecated features

---

## Changelog

### Version 1.0.0 (2024-01-15)
- Initial release
- API client management
- API key management
- Webhook subscriptions
- Usage tracking
- Rate limiting

---

## Support

For API support, contact:
- Email: api-support@insurance-leads.com
- Documentation: https://docs.insurance-leads.com
- Status: https://status.insurance-leads.com

---

**Last Updated:** January 15, 2024
