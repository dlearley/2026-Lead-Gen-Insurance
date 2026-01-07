# API Documentation

Complete reference for the Insurance Lead Generation AI Platform REST API.

## Table of Contents

- [Introduction](#introduction)
- [Authentication](#authentication)
- [Base URLs](#base-urls)
- [Rate Limiting](#rate-limiting)
- [Errors](#errors)
- [Pagination](#pagination)
- [Webhooks](#webhooks)
- [SDKs](#sdks)

---

## Introduction

The Insurance Lead Generation AI Platform provides a RESTful API for programmatic access to all platform features.

### Key Features

- **Full CRUD Operations**: Create, read, update, and delete resources
- **Webhooks**: Real-time notifications for events
- **Pagination**: Efficient retrieval of large datasets
- **Filtering**: Powerful query parameters for filtering and sorting
- **Rate Limiting**: Fair usage limits with appropriate headers
- **Authentication**: Secure authentication with API keys and OAuth

### Use Cases

- **Custom Integrations**: Connect with custom systems
- **Data Migration**: Import/export lead data
- **Automated Workflows**: Trigger actions from external systems
- **Custom Applications**: Build custom applications on platform
- **Data Synchronization**: Keep external systems in sync

---

## Authentication

All API requests require authentication.

### API Key Authentication

Use API key for simple integrations.

**How to Get an API Key**:

1. Log in to platform
2. Navigate to Settings > API Keys
3. Click "Generate New Key"
4. Name the key (e.g., "CRM Integration")
5. Copy the key (only shown once)
6. Save key securely

**Using API Key**:

```bash
curl -H "X-API-Key: your-api-key" \
  https://api.insurance-leads-platform.com/v1/leads
```

**In Code**:

```javascript
const headers = {
  'X-API-Key': 'your-api-key',
  'Content-Type': 'application/json'
};

fetch('https://api.insurance-leads-platform.com/v1/leads', {
  headers: headers
})
```

### OAuth 2.0 Authentication

Use OAuth 2.0 for user-context integrations.

**OAuth Flow**:

1. **Authorization Code Flow** (recommended for server-side apps)
   - Redirect user to authorization endpoint
   - User grants permissions
   - Receive authorization code
   - Exchange code for access token
   - Use access token for API calls

2. **Client Credentials Flow** (for service accounts)
   - Authenticate with client ID and secret
   - Receive access token
   - Use token for API calls

**Getting OAuth Credentials**:

1. Navigate to Settings > OAuth Applications
2. Create new application
3. Define redirect URIs
4. Get client ID and secret
5. Configure scopes

**Using OAuth Token**:

```bash
curl -H "Authorization: Bearer your-access-token" \
  https://api.insurance-leads-platform.com/v1/leads
```

**Token Expiration**:
- Access tokens expire in 1 hour
- Refresh tokens are available (when using authorization code flow)
- Implement token refresh in your application

### Scopes

Scopes define permissions granted to OAuth tokens:

| Scope | Description |
|-------|-------------|
| `leads:read` | Read lead information |
| `leads:write` | Create and update leads |
| `leads:delete` | Delete leads |
| `users:read` | Read user information |
| `teams:read` | Read team information |
| `activities:read` | Read activity logs |
| `webhooks:write` | Create and manage webhooks |
| `all` | All permissions (use with caution) |

---

## Base URLs

### Production

```
https://api.insurance-leads-platform.com/v1
```

### Staging

```
https://api-staging.insurance-leads-platform.com/v1
```

### Regional Endpoints

For lower latency, use regional endpoints:

- **US East**: `https://api-us-east.insurance-leads-platform.com/v1`
- **US West**: `https://api-us-west.insurance-leads-platform.com/v1`
- **EU**: `https://api-eu.insurance-leads-platform.com/v1`

---

## Rate Limiting

API requests are rate limited to ensure fair usage.

### Rate Limits

| Plan | Requests per Hour | Requests per Minute |
|------|-------------------|---------------------|
| Starter | 1,000 | 20 |
| Professional | 10,000 | 100 |
| Enterprise | 100,000 | 500 |
| Custom | Negotiated | Negotiated |

### Rate Limit Headers

All API responses include rate limit headers:

```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1640995200
```

### Handling Rate Limits

**When Limit Reached**:

```http
HTTP 429 Too Many Requests
{
  "error": "rate_limit_exceeded",
  "message": "Rate limit exceeded. Try again in 60 seconds.",
  "retry_after": 60
}
```

**Best Practices**:
- Respect `Retry-After` header
- Implement exponential backoff
- Cache responses when appropriate
- Use webhooks for real-time updates instead of polling

---

## Errors

All API errors follow a consistent format.

### Error Response Format

```json
{
  "error": "error_type",
  "message": "Human-readable error message",
  "details": {
    "field": "Additional error details"
  },
  "request_id": "req_1234567890"
}
```

### Common Error Codes

| Status | Error Type | Description |
|--------|------------|-------------|
| 400 | `bad_request` | Invalid request parameters |
| 401 | `unauthorized` | Missing or invalid authentication |
| 403 | `forbidden` | Insufficient permissions |
| 404 | `not_found` | Resource not found |
| 409 | `conflict` | Resource conflict (e.g., duplicate) |
| 422 | `validation_error` | Validation failed |
| 429 | `rate_limit_exceeded` | Rate limit exceeded |
| 500 | `server_error` | Internal server error |
| 503 | `service_unavailable` | Service temporarily unavailable |

### Error Handling Example

```javascript
async function createLead(leadData) {
  try {
    const response = await fetch('/api/v1/leads', {
      method: 'POST',
      headers: {
        'X-API-Key': apiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(leadData)
    });

    if (!response.ok) {
      const error = await response.json();
      throw new APIError(error.error, error.message, error.request_id);
    }

    return await response.json();
  } catch (error) {
    // Handle error
    console.error('Error creating lead:', error);
    throw error;
  }
}
```

---

## Pagination

List endpoints support pagination for efficient data retrieval.

### Pagination Parameters

| Parameter | Type | Description | Default |
|-----------|------|-------------|---------|
| `page` | integer | Page number | 1 |
| `limit` | integer | Items per page (1-100) | 20 |
| `sort` | string | Sort field and order (e.g., `createdAt:desc`) | createdAt:desc |

**Example Request**:

```bash
curl -H "X-API-Key: your-api-key" \
  "https://api.insurance-leads-platform.com/v1/leads?page=2&limit=50&sort=score:desc"
```

### Pagination Response

```json
{
  "data": [...],
  "pagination": {
    "page": 2,
    "limit": 50,
    "total": 1250,
    "totalPages": 25,
    "next": "https://api.../leads?page=3&limit=50",
    "prev": "https://api.../leads?page=1&limit=50",
    "first": "https://api.../leads?page=1&limit=50",
    "last": "https://api.../leads?page=25&limit=50"
  }
}
```

### Best Practices

1. **Use reasonable limits**: Don't request more data than needed
2. **Follow pagination links**: Use provided links for navigation
3. **Cache pagination info**: Store total pages for UI
4. **Parallel requests**: Request multiple pages if needed

---

## Webhooks

Webhooks provide real-time notifications for platform events.

### Creating Webhooks

```bash
curl -X POST \
  -H "X-API-Key: your-api-key" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://your-app.com/webhook",
    "events": ["lead.created", "lead.status_changed"],
    "secret": "your-webhook-secret"
  }' \
  https://api.insurance-leads-platform.com/v1/webhooks
```

### Webhook Events

| Event | Description | Payload |
|-------|-------------|---------|
| `lead.created` | New lead created | Lead object |
| `lead.updated` | Lead updated | Lead object + changes |
| `lead.status_changed` | Lead status changed | Lead object + old/new status |
| `lead.deleted` | Lead deleted | Lead ID |
| `note.created` | Note created | Note object |
| `email.sent` | Email sent | Email object |
| `task.completed` | Task completed | Task object |

### Webhook Payload

```json
{
  "event": "lead.created",
  "timestamp": "2024-01-15T10:30:00Z",
  "data": {
    "id": "lead_123",
    "firstName": "John",
    "lastName": "Doe",
    "email": "john@example.com",
    "score": 85,
    "status": "NEW",
    "createdAt": "2024-01-15T10:30:00Z"
  },
  "signature": "sha256=..."
}
```

### Webhook Signature

Verify webhook signatures for security:

```javascript
const crypto = require('crypto');

function verifyWebhookSignature(payload, signature, secret) {
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(payload);
  const expectedSignature = `sha256=${hmac.digest('hex')}`;
  return signature === expectedSignature;
}
```

### Responding to Webhooks

Always respond quickly:

```http
HTTP 200 OK
{
  "received": true
}
```

**Note**: Timeout is 5 seconds. Return 200 quickly, process asynchronously.

### Webhook Retry Policy

- **Retries**: 3 times
- **Backoff**: Exponential (1s, 2s, 4s)
- **Max Duration**: 7 seconds total

Disable webhook after 10 consecutive failures.

---

## SDKs

Official SDKs available for popular languages and frameworks.

### JavaScript/TypeScript SDK

```bash
npm install @insurance-leads/sdk
```

```javascript
const InsuranceLeads = require('@insurance-leads/sdk');

const client = new InsuranceLeads.Client({
  apiKey: 'your-api-key'
});

// Create lead
const lead = await client.leads.create({
  firstName: 'John',
  lastName: 'Doe',
  email: 'john@example.com',
  insuranceType: 'AUTO'
});

// List leads
const leads = await client.leads.list({
  status: 'NEW',
  limit: 50
});

// Update lead
const updated = await client.leads.update(lead.id, {
  score: 90,
  status: 'QUALIFIED'
});
```

### Python SDK

```bash
pip install insurance-leads-sdk
```

```python
from insurance_leads import Client

client = Client(api_key='your-api-key')

# Create lead
lead = client.leads.create(
    first_name='John',
    last_name='Doe',
    email='john@example.com',
    insurance_type='AUTO'
)

# List leads
leads = client.leads.list(
    status='NEW',
    limit=50
)

# Update lead
updated = client.leads.update(
    lead.id,
    score=90,
    status='QUALIFIED'
)
```

### PHP SDK

```bash
composer require insurance-leads/sdk
```

```php
use InsuranceLeads\Client;

$client = new Client(['apiKey' => 'your-api-key']);

// Create lead
$lead = $client->leads->create([
    'firstName' => 'John',
    'lastName' => 'Doe',
    'email' => 'john@example.com',
    'insuranceType' => 'AUTO'
]);

// List leads
$leads = $client->leads->list([
    'status' => 'NEW',
    'limit' => 50
]);

// Update lead
$updated = $client->leads->update($lead->id, [
    'score' => 90,
    'status' => 'QUALIFIED'
]);
```

---

## API Endpoints

### Leads

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/leads` | List leads with pagination and filtering |
| POST | `/leads` | Create new lead |
| GET | `/leads/:id` | Get lead by ID |
| PUT | `/leads/:id` | Update lead |
| DELETE | `/leads/:id` | Delete lead |
| GET | `/leads/:id/notes` | List lead notes |
| POST | `/leads/:id/notes` | Add note to lead |
| GET | `/leads/:id/activity` | Get lead activity log |
| GET | `/leads/:id/emails` | List lead emails |
| POST | `/leads/:id/emails/send` | Send email to lead |
| GET | `/leads/:id/tasks` | List lead tasks |
| POST | `/leads/:id/tasks` | Create task for lead |

### Users

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/users` | List users |
| GET | `/users/:id` | Get user by ID |
| PUT | `/users/:id` | Update user |

### Teams

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/teams` | List teams |
| GET | `/teams/:id` | Get team by ID |
| GET | `/teams/:id/members` | List team members |

### Campaigns

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/campaigns` | List campaigns |
| POST | `/campaigns` | Create campaign |
| GET | `/campaigns/:id` | Get campaign by ID |
| PUT | `/campaigns/:id` | Update campaign |
| DELETE | `/campaigns/:id` | Delete campaign |
| GET | `/campaigns/:id/analytics` | Get campaign analytics |

### Activities

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/activities` | List activities with filtering |
| GET | `/activities/:id` | Get activity by ID |

### Webhooks

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/webhooks` | List webhooks |
| POST | `/webhooks` | Create webhook |
| GET | `/webhooks/:id` | Get webhook by ID |
| PUT | `/webhooks/:id` | Update webhook |
| DELETE | `/webhooks/:id` | Delete webhook |
| POST | `/webhooks/:id/test` | Test webhook |

See detailed API reference for complete endpoint documentation.

---

## Best Practices

### Authentication

1. **Secure your API keys**: Never expose in client-side code
2. **Use environment variables**: Store keys securely
3. **Rotate keys regularly**: Update keys periodically
4. **Revoke unused keys**: Delete keys that are no longer needed

### Error Handling

1. **Always handle errors**: Never ignore error responses
2. **Implement retry logic**: For transient failures
3. **Use exponential backoff**: Don't retry immediately
4. **Log errors**: Track errors for debugging

### Performance

1. **Use pagination**: Don't request too many items at once
2. **Filter effectively**: Use query parameters to limit data
3. **Cache responses**: Cache static or rarely-changing data
4. **Use webhooks**: Avoid polling for real-time updates

### Security

1. **Use HTTPS**: Never use HTTP for API calls
2. **Validate inputs**: Always validate user input
3. **Sanitize outputs**: Escape output to prevent XSS
4. **Verify webhooks**: Always verify webhook signatures

---

## Support

For API support:

- **Documentation**: Browse full API reference
- **SDK Support**: GitHub repositories for each SDK
- **Status Page**: Check API status
- **Contact Support**: Submit a support ticket

**API Support**:
- **Email**: api-support@insurance-leads-platform.com
- **Slack**: #api-support (Enterprise plan)
- **Response Time**: < 2 hours for critical issues

When reporting issues, include:
- Request ID from response headers
- Request and response details
- Timestamp of request
- Expected vs actual behavior
