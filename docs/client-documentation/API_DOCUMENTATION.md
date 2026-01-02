# CRM-Ultra API Documentation

## Technical Integration Guide

**Version:** 2.0  
**Last Updated:** January 2025  
**API Version:** v1  
**Base URL:** `https://api.crm-ultra.com/v1`

---

## Table of Contents

1. [Getting Started](#getting-started)
2. [Authentication](#authentication)
3. [Rate Limiting](#rate-limiting)
4. [API Endpoints](#api-endpoints)
5. [Webhooks](#webhooks)
6. [Error Handling](#error-handling)
7. [Code Examples](#code-examples)
8. [Best Practices](#best-practices)
9. [Changelog](#changelog)

---

## Getting Started

### Overview

The CRM-Ultra API provides comprehensive access to lead management, communication, and analytics features. Use this API to integrate CRM-Ultra with your existing systems, automate workflows, and build custom applications.

**Base URL:**
```
https://api.crm-ultra.com/v1
```

### API Conventions

- All endpoints return JSON responses
- Dates are in ISO 8601 format: `2024-01-15T14:30:00Z`
- All requests must include proper authentication
- Use HTTPS for all API calls
- UTF-8 encoding for all content

### Quick Start Checklist

- [ ] Obtain API credentials from your administrator
- [ ] Review authentication requirements
- [ ] Test API connection with simple GET request
- [ ] Review rate limits for your use case
- [ ] Implement error handling
- [ ] Set up webhook endpoints (if needed)
- [ ] Review the complete API documentation

---

## Authentication

### API Key Authentication

Most endpoints require API key authentication using the `X-API-Key` header.

**Obtaining API Key:**
1. Log into CRM-Ultra dashboard
2. Navigate to **Settings → API → API Keys**
3. Click **Generate New Key**
4. Copy the key immediately (shown only once)
5. Store securely - treat as a password

**Using API Key:**
```bash
curl -X GET https://api.crm-ultra.com/v1/leads \
  -H "X-API-Key: your_api_key_here" \
  -H "Content-Type: application/json"
```

### OAuth 2.0 Authentication

For user-level access and third-party integrations, use OAuth 2.0.

**Authorization Flow:**

1. **Redirect user to authorization URL:**
   ```
   GET https://api.crm-ultra.com/oauth/authorize
     ?client_id=YOUR_CLIENT_ID
     &redirect_uri=YOUR_REDIRECT_URI
     &response_type=code
     &scope=read write
     &state=RANDOM_STATE_STRING
   ```

2. **User grants access** and is redirected to your callback

3. **Exchange authorization code for access token:**
   ```bash
   POST https://api.crm-ultra.com/oauth/token \
     -d client_id=YOUR_CLIENT_ID \
     -d client_secret=YOUR_CLIENT_SECRET \
     -d code=AUTHORIZATION_CODE \
     -d grant_type=authorization_code \
     -d redirect_uri=YOUR_REDIRECT_URI
   ```

4. **Use access token in API requests:**
   ```bash
   curl -X GET https://api.crm-ultra.com/v1/leads \
     -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
     -H "Content-Type: application/json"
   ```

### Token Refresh

Access tokens expire after 2 hours. Use refresh tokens to obtain new access tokens.

```bash
POST https://api.crm-ultra.com/oauth/token \
  -d grant_type=refresh_token \
  -d refresh_token=YOUR_REFRESH_TOKEN \
  -d client_id=YOUR_CLIENT_ID \
  -d client_secret=YOUR_CLIENT_SECRET
```

---

## Rate Limiting

### Rate Limit Tiers

| Tier | Requests per Minute | Requests per Hour | Use Case |
|------|-------------------|-------------------|----------|
| **Free** | 60 | 1,000 | Testing, small integrations |
| **Basic** | 300 | 10,000 | Small business operations |
| **Professional** | 1,000 | 50,000 | Medium business operations |
| **Enterprise** | 5,000 | Unlimited | Large scale operations |

### Rate Limit Headers

Each API response includes rate limit information:

```http
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 1705324800
X-RateLimit-Retry-After: 0
```

### Handling Rate Limits

When you hit the rate limit, the API returns `429 Too Many Requests`:

```json
{
  "error": {
    "code": "rate_limit_exceeded",
    "message": "API rate limit exceeded. Try again in 15 seconds.",
    "retry_after": 15
  }
}
```

**Best Practices:**
- Implement exponential backoff
- Cache responses when appropriate
- Use webhooks instead of polling
- Monitor rate limit headers
- Request tier upgrade if consistently hitting limits

---

## API Endpoints

### Leads

#### Create Lead
```http
POST /leads
```

Creates a new lead in the system.

**Request Body:**
```json
{
  "source": "facebook_ads",
  "email": "john.doe@example.com",
  "phone": "+15551234567",
  "firstName": "John",
  "lastName": "Doe",
  "city": "New York",
  "state": "NY",
  "insuranceType": "AUTO",
  "tags": ["high-value", "referral"],
  "customFields": {
    "campaignId": "camp_001",
    "landingPage": "summer-promo"
  }
}
```

**Response:**
```json
{
  "id": "lead_123456789",
  "status": "new",
  "score": 65,
  "createdAt": "2024-01-15T14:30:00Z",
  "updatedAt": "2024-01-15T14:30:00Z",
  "assignedTo": null,
  "source": "facebook_ads",
  "email": "john.doe@example.com",
  "phone": "+15551234567",
  "firstName": "John",
  "lastName": "Doe",
  "city": "New York",
  "state": "NY",
  "insuranceType": "AUTO"
}
```

**Validation Rules:**
- `email` or `phone` required (minimum)
- `source` must be from approved list
- `insuranceType` must be: AUTO, HOME, LIFE, HEALTH, COMMERCIAL, BUNDLE
- `state` must be valid US state code

#### Get Lead
```http
GET /leads/{lead_id}
```

Retrieves a specific lead by ID.

**Response:**
```json
{
  "id": "lead_123456789",
  "status": "qualified",
  "score": 78,
  "createdAt": "2024-01-15T14:30:00Z",
  "updatedAt": "2024-01-16T09:15:30Z",
  "assignedTo": {
    "id": "user_abc123",
    "name": "Jane Smith",
    "email": "jane@company.com"
  },
  "source": "facebook_ads",
  "email": "john.doe@example.com",
  "phone": "+15551234567",
  "firstName": "John",
  "lastName": "Doe",
  "city": "New York",
  "state": "NY",
  "insuranceType": "AUTO",
  "notesCount": 3,
  "tasksCount": 2,
  "emailsCount": 4,
  "lastActivity": "2024-01-16T09:15:30Z"
}
```

#### List Leads
```http
GET /leads
```

Retrieves a paginated list of leads.

**Query Parameters:**
- `page` - Page number (default: 1)
- `limit` - Results per page (default: 20, max: 100)
- `status` - Filter by status
- `source` - Filter by source
- `assignedTo` - Filter by assignee
- `insuranceType` - Filter by insurance type
- `dateFrom` - Filter by creation date (ISO 8601)
- `dateTo` - Filter by creation date (ISO 8601)
- `search` - Search in name, email, phone
- `sortBy` - Sort field (createdAt, updatedAt, score)
- `sortOrder` - asc or desc

**Example Request:**
```bash
GET /leads?status=new&assignedTo=user_abc123&page=1&limit=50
```

**Response:**
```json
{
  "data": [
    {
      "id": "lead_123456789",
      "status": "new",
      "score": 65,
      "createdAt": "2024-01-15T14:30:00Z",
      "updatedAt": "2024-01-15T14:30:00Z",
      "assignedTo": null,
      "source": "facebook_ads",
      "email": "john.doe@example.com",
      "phone": "+15551234567",
      "firstName": "John",
      "lastName": "Doe",
      "insuranceType": "AUTO"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 1250,
    "totalPages": 25,
    "hasNext": true,
    "hasPrev": false
  }
}
```

#### Update Lead
```http
PUT /leads/{lead_id}
```

Updates lead information.

**Request Body:**
```json
{
  "status": "qualified",
  "priority": "high",
  "score": 85,
  "assignedTo": "user_xyz789"
}
```

**Response:** Returns updated lead object

#### Delete Lead
```http
DELETE /leads/{lead_id}
```

Deletes a lead from the system.

**Response:**
```json
{
  "id": "lead_123456789",
  "deleted": true,
  "deletedAt": "2024-01-16T10:30:00Z"
}
```

### Notes

#### Create Note
```http
POST /leads/{lead_id}/notes
```

Adds a note to a lead.

**Request Body:**
```json
{
  "content": "Customer called to discuss auto insurance options. Interested in comprehensive coverage with roadside assistance.",
  "visibility": "TEAM"
}
```

**Visibility Options:**
- `PRIVATE` - Only visible to creator
- `TEAM` - Visible to all team members (default)
- `PUBLIC` - Visible across organization

**Response:**
```json
{
  "id": "note_abc123",
  "content": "Customer called to discuss auto insurance options...",
  "visibility": "TEAM",
  "createdAt": "2024-01-16T10:30:00Z",
  "createdBy": {
    "id": "user_abc123",
    "name": "Jane Smith",
    "email": "jane@company.com"
  },
  "leadId": "lead_123456789"
}
```

#### List Notes
```http
GET /leads/{lead_id}/notes
```

**Query Parameters:**
- `page` - Page number
- `limit` - Results per page
- `visibility` - Filter by visibility
- `createdBy` - Filter by creator
- `dateFrom` - Filter by date
- `dateTo` - Filter by date

**Response:** Paginated list of notes

### Tasks

#### Create Task
```http
POST /leads/{lead_id}/tasks
```

Creates a task for a lead.

**Request Body:**
```json
{
  "title": "Follow up on quote",
  "description": "Customer requested email with detailed quote. Send by end of day.",
  "priority": "HIGH",
  "dueDate": "2024-01-17T17:00:00Z",
  "assigneeId": "user_abc123",
  "type": "FOLLOW_UP"
}
```

**Priority Levels:** LOW, MEDIUM, HIGH, URGENT  
**Task Types:** FOLLOW_UP, CALL, MEETING, EMAIL, QUOTE, OTHER

**Response:**
```json
{
  "id": "task_xyz789",
  "title": "Follow up on quote",
  "description": "Customer requested email with detailed quote...",
  "priority": "HIGH",
  "status": "OPEN",
  "dueDate": "2024-01-17T17:00:00Z",
  "assignee": {
    "id": "user_abc123",
    "name": "Jane Smith"
  },
  "createdAt": "2024-01-16T10:30:00Z",
  "leadId": "lead_123456789"
}
```

#### Update Task Status
```http
PUT /tasks/{task_id}
```

**Request Body:**
```json
{
  "status": "COMPLETED"
}
```

**Status Options:** OPEN, IN_PROGRESS, COMPLETED, CANCELLED

### Emails

#### Send Email
```http
POST /leads/{lead_id}/emails
```

Sends an email to the lead.

**Request Body:**
```json
{
  "to": ["john.doe@example.com"],
  "subject": "Your Auto Insurance Quote",
  "body": "Hi John, Here's the quote we discussed...",
  "templateId": "template_quote_followup",
  "scheduledFor": "2024-01-17T09:00:00Z"
}
```

**Response:**
```json
{
  "id": "email_456def",
  "status": "SENT",
  "to": ["john.doe@example.com"],
  "subject": "Your Auto Insurance Quote",
  "sentAt": "2024-01-16T10:30:00Z",
  "opened": false,
  "openedAt": null
}
```

**Note:** If `scheduledFor` is provided, email will be sent at that time. Otherwise, sent immediately.

#### Get Email Templates
```http
GET /emails/templates
```

Retrieves available email templates.

**Response:**
```json
{
  "templates": [
    {
      "id": "template_quote_followup",
      "name": "Quote Follow-up",
      "subject": "Your Insurance Quote",
      "body": "Hi {{firstName}}, regarding your quote...",
      "variables": ["firstName", "lastName", "quoteAmount"]
    }
  ]
}
```

### Activities

#### Get Activity Timeline
```http
GET /leads/{lead_id}/activities
```

Retrieves activity history for a lead.

**Query Parameters:**
- `page` - Page number
- `limit` - Results per page
- `activityType` - Filter by type
- `dateFrom` - Start date
- `dateTo` - End date

**Response:**
```json
{
  "activities": [
    {
      "id": "act_123",
      "type": "EMAIL_SENT",
      "description": "Quote follow-up email sent",
      "createdAt": "2024-01-16T10:30:00Z",
      "createdBy": {
        "id": "user_abc123",
        "name": "Jane Smith"
      },
      "metadata": {
        "emailId": "email_456def",
        "template": "quote_followup"
      }
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 25
  }
}
```

**Activity Types:**
- LEAD_CREATED
- STATUS_CHANGED
- NOTE_ADDED
- TASK_CREATED
- TASK_COMPLETED
- EMAIL_SENT
- EMAIL_OPENED
- CALL_MADE
- MEETING_SCHEDULED
- QUOTE_GENERATED
- WON
- LOST

### Reports

#### Lead Conversion Report
```http
GET /reports/conversion
```

**Query Parameters:**
- `dateFrom` - Start date
- `dateTo` - End date
- `groupBy` - Dimension: source, assignedTo, insuranceType

**Response:**
```json
{
  "summary": {
    "totalLeads": 1250,
    "convertedLeads": 287,
    "conversionRate": 22.96,
    "avgTimeToConversion": 8.5
  },
  "bySource": [
    {
      "source": "facebook_ads",
      "total": 450,
      "converted": 112,
      "rate": 24.89
    }
  ]
}
```

### Users

#### Get Current User
```http
GET /users/me
```

Returns information about the authenticated user.

**Response:**
```json
{
  "id": "user_abc123",
  "name": "Jane Smith",
  "email": "jane@company.com",
  "role": "SALES_MANAGER",
  "permissions": ["read:leads", "write:leads", "read:reports"],
  "createdAt": "2023-06-15T08:30:00Z"
}
```

---

## Webhooks

### Overview

Webhooks allow CRM-Ultra to notify your system of events in real-time.

### Available Events

- `lead.created` - New lead entered system
- `lead.updated` - Lead information changed
- `lead.assigned` - Lead assigned to user
- `lead.converted` - Lead status changed to WON
- `note.created` - Note added to lead
- `task.created` - Task created
- `task.completed` - Task marked complete
- `email.sent` - Email sent to lead
- `email.opened` - Lead opened email

### Setting Up Webhooks

1. **Create webhook endpoint** in your system
2. **Register webhook** in CRM-Ultra:
   ```bash
   POST /webhooks \
     -H "X-API-Key: your_api_key" \
     -d '{
       "url": "https://your-domain.com/webhook",
       "events": ["lead.created", "lead.assigned"],
       "secret": "your_webhook_secret"
     }'
   ```

3. **Verify webhook signature** to ensure authenticity

### Webhook Payload Example

```json
{
  "event": "lead.created",
  "timestamp": "2024-01-16T10:30:00Z",
  "data": {
    "id": "lead_123456789",
    "status": "new",
    "source": "facebook_ads",
    "email": "john.doe@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "insuranceType": "AUTO"
  }
}
```

### Webhook Security

**Signature Verification:**
```javascript
const crypto = require('crypto');

function verifyWebhookSignature(payload, signature, secret) {
  const computedSignature = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');
  
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(computedSignature)
  );
}
```

**Best Practices:**
- Always verify webhook signatures
- Use HTTPS endpoints only
- Respond quickly (within 5 seconds)
- Implement retry logic for failures
- Log all webhook events

---

## Error Handling

### Error Response Format

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "details": {
      "field": "specific error detail"
    },
    "request_id": "req_123456789"
  }
}
```

### HTTP Status Codes

| Code | Description | Retry? |
|------|-------------|--------|
| 200 | Success | N/A |
| 201 | Created | N/A |
| 400 | Bad Request | No - fix request |
| 401 | Unauthorized | After authentication |
| 403 | Forbidden | No - permissions issue |
| 404 | Not Found | No - check ID |
| 422 | Validation Error | No - fix data |
| 429 | Rate Limited | Yes - with backoff |
| 500 | Server Error | Yes - exponential backoff |
| 503 | Service Unavailable | Yes - with backoff |

### Common Error Codes

| Code | Description | Resolution |
|------|-------------|------------|
| `invalid_api_key` | API key is invalid or expired | Verify API key |
| `insufficient_permissions` | Not authorized for this action | Check user permissions |
| `resource_not_found` | Requested resource doesn't exist | Verify ID/endpoint |
| `validation_error` | Request data is invalid | Check request body |
| `rate_limit_exceeded` | Too many requests | Slow down requests |
| `conflict` | Resource state conflict | Refresh and retry |

---

## Code Examples

### Node.js/JavaScript

```javascript
const axios = require('axios');

class CRMUltraAPI {
  constructor(apiKey) {
    this.client = axios.create({
      baseURL: 'https://api.crm-ultra.com/v1',
      headers: {
        'X-API-Key': apiKey,
        'Content-Type': 'application/json'
      }
    });
  }

  async createLead(leadData) {
    try {
      const response = await this.client.post('/leads', leadData);
      return response.data;
    } catch (error) {
      this.handleError(error);
    }
  }

  async getLead(leadId) {
    try {
      const response = await this.client.get(`/leads/${leadId}`);
      return response.data;
    } catch (error) {
      this.handleError(error);
    }
  }

  handleError(error) {
    if (error.response) {
      console.error('API Error:', error.response.data);
      console.error('Status:', error.response.status);
    }
    throw error;
  }
}

// Usage
const api = new CRMUltraAPI('your_api_key_here');

api.createLead({
  source: 'website',
  email: 'customer@example.com',
  firstName: 'John',
  lastName: 'Doe',
  insuranceType: 'AUTO'
}).then(lead => {
  console.log('Lead created:', lead.id);
});
```

### Python

```python
import requests
import time
from typing import Dict, List, Optional

class CRMUltraAPI:
    def __init__(self, api_key: str):
        self.base_url = 'https://api.crm-ultra.com/v1'
        self.headers = {
            'X-API-Key': api_key,
            'Content-Type': 'application/json'
        }
    
    def create_lead(self, lead_data: Dict) -> Dict:
        """Create a new lead"""
        response = requests.post(
            f'{self.base_url}/leads',
            json=lead_data,
            headers=self.headers
        )
        response.raise_for_status()
        return response.json()
    
    def get_lead(self, lead_id: str) -> Dict:
        """Get lead by ID"""
        response = requests.get(
            f'{self.base_url}/leads/{lead_id}',
            headers=self.headers
        )
        response.raise_for_status()
        return response.json()
    
    def list_leads(self, params: Optional[Dict] = None) -> Dict:
        """List leads with optional filters"""
        response = requests.get(
            f'{self.base_url}/leads',
            headers=self.headers,
            params=params or {}
        )
        response.raise_for_status()
        return response.json()
    
    def handle_rate_limit(self, response):
        """Handle rate limiting with exponential backoff"""
        if response.status_code == 429:
            retry_after = int(response.headers.get('Retry-After', 60))
            time.sleep(retry_after)
            return True
        return False

# Usage
api = CRMUltraAPI('your_api_key_here')

lead = api.create_lead({
    'source': 'website',
    'email': 'customer@example.com',
    'firstName': 'John',
    'lastName': 'Doe',
    'insuranceType': 'AUTO'
})

print(f"Lead created: {lead['id']}")
```

### Webhook Handler (Node.js/Express)

```javascript
const express = require('express');
const crypto = require('crypto');

const app = express();
app.use(express.json());

const WEBHOOK_SECRET = 'your_webhook_secret_here';

function verifyWebhookSignature(req) {
  const signature = req.headers['x-crm-ultra-signature'];
  const payload = JSON.stringify(req.body);
  
  const computedSignature = crypto
    .createHmac('sha256', WEBHOOK_SECRET)
    .update(payload)
    .digest('hex');
  
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(computedSignature)
  );
}

app.post('/webhooks/crm-ultra', (req, res) => {
  try {
    // Verify webhook signature
    if (!verifyWebhookSignature(req)) {
      return res.status(401).send('Invalid signature');
    }
    
    const event = req.body;
    
    // Handle different event types
    switch (event.event) {
      case 'lead.created':
        console.log('New lead created:', event.data.id);
        // Your business logic here
        break;
        
      case 'lead.assigned':
        console.log('Lead assigned:', event.data.id);
        // Notify assigned user
        break;
        
      case 'email.opened':
        console.log('Email opened by:', event.data.leadId);
        // Trigger follow-up actions
        break;
        
      default:
        console.log('Unhandled event:', event.event);
    }
    
    res.status(200).send('OK');
    
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(500).send('Error processing webhook');
  }
});

app.listen(3000, () => {
  console.log('Webhook server running on port 3000');
});
```

---

## Best Practices

### 1. API Usage

**Do:**
- Cache responses when appropriate
- Use webhooks instead of polling
- Implement exponential backoff for retries
- Monitor rate limit headers
- Use batch operations when available

**Don't:**
- Hardcode API keys in client-side code
- Expose API keys in public repositories
- Make unnecessary API calls
- Ignore error responses
- Exceed rate limits consistently

### 2. Data Management

**Best Practices:**
- Validate data before API submission
- Store only necessary data locally
- Encrypt sensitive data at rest
- Use appropriate data types
- Sanitize user inputs

### 3. Security

**Recommendations:**
- Rotate API keys regularly
- Use environment variables for secrets
- Implement proper access controls
- Audit API usage regularly
- Use HTTPS only
- Verify webhook signatures

### 4. Error Handling

**Implementation:**
```javascript
class APIError extends Error {
  constructor(message, code, status, requestId) {
    super(message);
    this.name = 'APIError';
    this.code = code;
    this.status = status;
    this.requestId = requestId;
  }
}

function handleAPIError(error) {
  if (error.response) {
    // Server responded with error
    const { code, message, details } = error.response.data.error;
    throw new APIError(message, code, error.response.status);
  } else if (error.request) {
    // Request made but no response
    throw new APIError('Network error - no response received', 'NETWORK_ERROR');
  } else {
    // Other errors
    throw new APIError(error.message, 'UNKNOWN_ERROR');
  }
}
```

### 5. Testing

**Testing Checklist:**
- [ ] Test authentication (valid and invalid)
- [ ] Test rate limiting behavior
- [ ] Test error handling for all endpoints
- [ ] Test webhook signature verification
- [ ] Test retry logic with exponential backoff
- [ ] Test with various data types and edge cases
- [ ] Test concurrent API calls
- [ ] Test in different environments

---

## Changelog

### Version 2.0 (Current)

**New Features:**
- OAuth 2.0 authentication
- Webhook support
- Batch operations
- Custom fields in lead creation
- Enhanced filtering options
- Improved error messages

**Breaking Changes:**
- Changed authentication header from `Authorization: Bearer` to `X-API-Key`
- Renamed endpoint `/activities` to `/activities/timeline`
- Removed deprecated `/leads/bulk` endpoint (use batch operations)

**Deprecations:**
- Legacy API keys (migrate to new format)
- `assignedTo` field in responses (use `assignedTo.id`)

### Version 1.5

- Added support for custom fields
- Enhanced search capabilities
- Improved rate limiting headers
- Added `totalPages` to pagination responses

### Version 1.0

- Initial API release
- Basic CRUD operations for leads
- Notes, tasks, and email functionality
- Basic reporting endpoints

---

## Support

**Technical Support:**
- Email: api-support@crm-ultra.com
- Response Time: 24 hours (business days)

**Premium Support:**
- Phone: 1-800-CRM-ULTRA (option 3)
- Slack Channel: #api-support (enterprise customers)
- Response Time: 4 hours (business days)

**Documentation Issues:**
- GitHub: github.com/crm-ultra/api-docs/issues
- Email: docs@crm-ultra.com

**Resources:**
- [SDK Repository](https://github.com/crm-ultra/sdk)
- [Postman Collection](https://docs.crm-ultra.com/postman)
- [Community Forum](https://community.crm-ultra.com)
- [Status Page](https://status.crm-ultra.com)

---

## License

This API documentation is part of the CRM-Ultra platform. Usage is subject to the terms of your CRM-Ultra subscription agreement.

**Last Updated:** January 2025  
**Next Review:** April 2025  
**Document Version:** 2.0  

---

*For the most up-to-date documentation, visit https://docs.crm-ultra.com/api*