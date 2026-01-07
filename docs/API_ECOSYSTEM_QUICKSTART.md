# API Ecosystem Quick Start Guide

## Overview

The Insurance Lead Generation API provides a comprehensive set of endpoints for partners to integrate with our platform. This guide will help you get up and running quickly.

## Table of Contents

1. [Getting Started](#getting-started)
2. [Authentication](#authentication)
3. [Making Your First Request](#making-your-first-request)
4. [Working with Leads](#working-with-leads)
5. [Setting Up Webhooks](#setting-up-webhooks)
6. [Monitoring Usage](#monitoring-usage)
7. [Rate Limiting](#rate-limiting)

---

## Getting Started

### 1. Request API Access

Contact our team at `api-partners@insurance-leads.com` to request API access. Provide:

- Your company name and website
- Intended use case
- Expected monthly request volume
- Required API scopes

### 2. Create an API Client

Once approved, you'll receive access to the API portal where you can create your API client:

```bash
curl -X POST https://api.insurance-leads.com/api/v1/api-clients \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "My Partner App",
    "description": "Integration for lead management",
    "redirectUris": ["https://myapp.com/callback"],
    "website": "https://myapp.com",
    "contactEmail": "tech@myapp.com",
    "rateLimitTier": "standard",
    "scopes": ["leads:read", "leads:write", "webhooks:write"]
  }'
```

Response:
```json
{
  "id": "client-uuid",
  "name": "My Partner App",
  "status": "active",
  "rateLimitTier": "standard",
  "webhookUrl": null,
  "scopes": ["leads:read", "leads:write", "webhooks:write"],
  "createdAt": "2024-01-15T10:00:00Z"
}
```

### 3. Generate API Keys

Create an API key to authenticate your requests:

```bash
curl -X POST https://api.insurance-leads.com/api/v1/api-keys \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "clientId": "client-uuid",
    "name": "Production Key",
    "scopes": ["leads:read", "leads:write"]
  }'
```

Response:
```json
{
  "id": "key-uuid",
  "keyId": "ins_abc123def456",
  "keyPrefix": "ins_abc1",
  "key": "ins_abc123def456_xxxxxxxxxxxxxxxxxxxxxx",
  "name": "Production Key",
  "status": "active",
  "createdAt": "2024-01-15T10:00:00Z"
}
```

⚠️ **Important**: Store your API key securely. It will only be shown once!

---

## Authentication

All API requests must include an `Authorization` header with your API key:

```bash
Authorization: Bearer ins_abc123def456_xxxxxxxxxxxxxxxxxxxxxx
```

### Example cURL Request

```bash
curl https://api.insurance-leads.com/api/v1/leads \
  -H "Authorization: Bearer YOUR_API_KEY"
```

### Security Best Practices

1. **Never** expose your API key in client-side code
2. **Always** use HTTPS for API requests
3. **Rotate** your API keys regularly
4. **Revoke** unused keys immediately
5. **Use** different keys for development and production

---

## Making Your First Request

### Create a Lead

Let's create your first lead:

```bash
curl -X POST https://api.insurance-leads.com/api/v1/leads \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "source": "partner_integration",
    "email": "john.doe@example.com",
    "phone": "+1234567890",
    "firstName": "John",
    "lastName": "Doe",
    "address": {
      "street": "123 Main St",
      "city": "San Francisco",
      "state": "CA",
      "zipCode": "94102",
      "country": "USA"
    },
    "insuranceType": "AUTO"
  }'
```

Response:
```json
{
  "id": "lead-uuid",
  "source": "partner_integration",
  "email": "john.doe@example.com",
  "phone": "+1234567890",
  "firstName": "John",
  "lastName": "Doe",
  "status": "received",
  "qualityScore": 75,
  "insuranceType": "AUTO",
  "createdAt": "2024-01-15T10:30:00Z",
  "updatedAt": "2024-01-15T10:30:00Z"
}
```

### Retrieve a Lead

```bash
curl https://api.insurance-leads.com/api/v1/leads/lead-uuid \
  -H "Authorization: Bearer YOUR_API_KEY"
```

### List Leads

```bash
curl "https://api.insurance-leads.com/api/v1/leads?page=1&limit=20&status=received" \
  -H "Authorization: Bearer YOUR_API_KEY"
```

---

## Working with Leads

### Lead Lifecycle

```
received → processing → qualified → routed → converted
                      ↓
                    rejected
```

### Update Lead Status

```bash
curl -X PUT https://api.insurance-leads.com/api/v1/leads/lead-uuid \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "qualified",
    "qualityScore": 85
  }'
```

### Filter Leads

```bash
curl "https://api.insurance-leads.com/api/v1/leads?insuranceType=AUTO&qualityScore=80+&dateFrom=2024-01-01" \
  -H "Authorization: Bearer YOUR_API_KEY"
```

---

## Setting Up Webhooks

Webhooks allow your application to receive real-time notifications when events occur.

### Create a Webhook Subscription

```bash
curl -X POST https://api.insurance-leads.com/api/v1/api-clients/CLIENT_ID/webhooks \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://myapp.com/webhooks",
    "events": ["lead.created", "lead.converted", "policy.created"],
    "retryConfig": {
      "maxRetries": 3,
      "retryDelay": 60,
      "backoffMultiplier": 2,
      "timeout": 30
    }
  }'
```

Response:
```json
{
  "id": "webhook-uuid",
  "url": "https://myapp.com/webhooks",
  "events": ["lead.created", "lead.converted", "policy.created"],
  "status": "active",
  "secret": "webhook_secret_here",
  "createdAt": "2024-01-15T10:00:00Z"
}
```

### Webhook Payload

When an event occurs, your endpoint will receive a POST request:

```json
{
  "id": "evt_abc123",
  "eventType": "lead.created",
  "timestamp": "2024-01-15T10:30:00Z",
  "data": {
    "leadId": "lead-uuid",
    "email": "john.doe@example.com",
    "status": "received"
  },
  "version": "1.0"
}
```

### Verify Webhook Signature

To verify the webhook authenticity:

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

// Express.js example
app.post('/webhooks', express.raw({ type: 'application/json' }), (req, res) => {
  const signature = req.headers['x-webhook-signature'];
  const payload = JSON.parse(req.body);

  if (!verifyWebhook(payload, signature, WEBHOOK_SECRET)) {
    return res.status(401).json({ error: 'Invalid signature' });
  }

  // Process webhook
  console.log(`Received ${payload.eventType}`, payload.data);

  res.status(200).send('OK');
});
```

### Respond to Webhooks

- Return a `200 OK` status code to acknowledge receipt
- Return a `5xx` status code or timeout to trigger a retry
- Return a `4xx` status code to not retry

---

## Monitoring Usage

### Check Your Usage Statistics

```bash
curl "https://api.insurance-leads.com/api/v1/api-clients/CLIENT_ID/usage?dateFrom=2024-01-01&dateTo=2024-01-31&groupBy=day" \
  -H "Authorization: Bearer YOUR_API_KEY"
```

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

### View Dashboard

```bash
curl https://api.insurance-leads.com/api/v1/api-clients/CLIENT_ID/dashboard \
  -H "Authorization: Bearer YOUR_API_KEY"
```

---

## Rate Limiting

### Rate Limit Tiers

| Tier    | Requests/Min | Requests/Hour | Requests/Day |
|---------|---------------|----------------|---------------|
| Basic   | 60            | 1,000          | 10,000        |
| Standard| 120           | 5,000          | 50,000        |
| Premium | 300           | 15,000         | 150,000       |
| Enterprise | 600       | 50,000         | 500,000       |

### Rate Limit Headers

Each API response includes rate limit headers:

```
X-RateLimit-Limit: 120
X-RateLimit-Remaining: 115
X-RateLimit-Reset: 2024-01-15T11:00:00Z
```

### Handling Rate Limits

If you exceed your rate limit, you'll receive a `429 Too Many Requests` response:

```json
{
  "error": "RATE_LIMIT_EXCEEDED",
  "message": "API rate limit exceeded",
  "retryAfter": 45
}
```

Use the `retryAfter` value to wait before retrying.

### Exponential Backoff

Implement exponential backoff for handling rate limits:

```javascript
async function makeRequest(url, options, retries = 0) {
  try {
    const response = await fetch(url, options);

    if (response.status === 429) {
      const retryAfter = parseInt(response.headers.get('retry-after') || '60');
      const waitTime = retryAfter * Math.pow(2, retries);

      console.log(`Rate limited. Waiting ${waitTime} seconds...`);
      await new Promise(resolve => setTimeout(resolve, waitTime * 1000));

      return makeRequest(url, options, retries + 1);
    }

    return response;
  } catch (error) {
    if (retries < 3) {
      await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, retries)));
      return makeRequest(url, options, retries + 1);
    }
    throw error;
  }
}
```

---

## Code Examples

### Node.js Integration

```javascript
const API_KEY = 'your_api_key_here';
const BASE_URL = 'https://api.insurance-leads.com/api/v1';

async function apiRequest(endpoint, options = {}) {
  const response = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      'Authorization': `Bearer ${API_KEY}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'API request failed');
  }

  return response.json();
}

// Create a lead
async function createLead(leadData) {
  return apiRequest('/leads', {
    method: 'POST',
    body: JSON.stringify(leadData),
  });
}

// Get leads
async function getLeads(filters = {}) {
  const params = new URLSearchParams(filters).toString();
  return apiRequest(`/leads?${params}`);
}

// Usage
const lead = await createLead({
  source: 'my_integration',
  email: 'customer@example.com',
  firstName: 'John',
  lastName: 'Doe',
  insuranceType: 'AUTO',
});

console.log('Created lead:', lead);
```

### Python Integration

```python
import requests
import time
from typing import Dict, Any, Optional

class InsuranceLeadsAPI:
    def __init__(self, api_key: str, base_url: str = 'https://api.insurance-leads.com/api/v1'):
        self.api_key = api_key
        self.base_url = base_url
        self.session = requests.Session()
        self.session.headers.update({
            'Authorization': f'Bearer {api_key}',
            'Content-Type': 'application/json'
        })

    def request(self, method: str, endpoint: str, **kwargs) -> Dict[str, Any]:
        url = f'{self.base_url}{endpoint}'
        response = self.session.request(method, url, **kwargs)
        response.raise_for_status()
        return response.json()

    def create_lead(self, lead_data: Dict[str, Any]) -> Dict[str, Any]:
        return self.request('POST', '/leads', json=lead_data)

    def get_leads(self, **filters) -> Dict[str, Any]:
        params = '&'.join(f'{k}={v}' for k, v in filters.items())
        return self.request('GET', f'/leads?{params}')

    def get_lead(self, lead_id: str) -> Dict[str, Any]:
        return self.request('GET', f'/leads/{lead_id}')

    def update_lead(self, lead_id: str, data: Dict[str, Any]) -> Dict[str, Any]:
        return self.request('PUT', f'/leads/{lead_id}', json=data)

# Usage
api = InsuranceLeadsAPI('your_api_key_here')

lead = api.create_lead({
    'source': 'python_integration',
    'email': 'customer@example.com',
    'firstName': 'John',
    'lastName': 'Doe',
    'insuranceType': 'AUTO'
})

print(f'Created lead: {lead}')
```

---

## Common Errors

### 401 Unauthorized

**Cause**: Invalid or missing API key

**Solution**: Verify your API key is correct and included in the Authorization header

### 403 Forbidden

**Cause**: Insufficient permissions for the requested resource

**Solution**: Check your API scopes and ensure you have the required permissions

### 404 Not Found

**Cause**: Resource does not exist

**Solution**: Verify the resource ID is correct

### 429 Rate Limit Exceeded

**Cause**: Too many requests

**Solution**: Implement rate limiting in your application using exponential backoff

### 500 Internal Server Error

**Cause**: Server error

**Solution**: Retry the request with exponential backoff. If the issue persists, contact support

---

## Support

- **Documentation**: https://docs.insurance-leads.com
- **API Reference**: https://api.insurance-leads.com/docs
- **Email**: api-support@insurance-leads.com
- **Status Page**: https://status.insurance-leads.com

---

**Version**: 1.0.0
**Last Updated**: January 15, 2024
