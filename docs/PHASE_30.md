# Phase 30: Partner Ecosystem & Integrations

## Overview

Phase 30 establishes a comprehensive partner ecosystem and integration platform that enables third-party developers, technology providers, and insurance industry partners to build on, extend, and integrate with the core insurance lead generation platform.

## Architecture

### Core Components

1. **Partner Management** - Partner onboarding, verification, and lifecycle management
2. **API Platform** - RESTful APIs with versioning, rate limiting, and documentation
3. **Authentication & Authorization** - OAuth 2.0, API keys, JWT tokens
4. **Application Registry** - Application submission, review, and approval workflows
5. **Integration Management** - Integration configuration, monitoring, and health checks
6. **Webhook System** - Real-time event delivery with retry logic
7. **Event Sourcing** - Platform events for audit trails and integration triggers
8. **Marketplace** - Discovery, installation, and rating of integrations
9. **Billing & Revenue** - Usage tracking, invoicing, and revenue sharing
10. **Analytics & Monitoring** - Integration performance and health monitoring

## Database Schema

### Partner Models

#### Partner
- **Purpose**: Stores third-party partner information
- **Fields**:
  - `id` (UUID) - Unique identifier
  - `partnerName` (String) - Partner company name
  - `partnerType` (Enum) - Technology, Service, Data, Channel, Strategic, Verification
  - `status` (Enum) - Active, Inactive, Suspended, Pending
  - `tier` (Enum) - Basic, Premium, Enterprise
- **Relationships**: Has many contacts, agreements, applications, API keys

#### PartnerContact
- **Purpose**: Contact information for partners
- **Fields**: contactName, email, phone, role, isPrimary
- **Relationships**: Belongs to Partner

#### PartnerAgreement
- **Purpose**: Legal agreements and terms
- **Fields**: agreementType, signedDate, effectiveDate, expirationDate, terms, status
- **Relationships**: Belongs to Partner

### Application Models

#### PartnerApplication
- **Purpose**: Partner applications and integrations
- **Fields**:
  - `appName` - Application name
  - `status` - Draft, Submitted, Approved, Rejected, Published, Suspended, Deprecated
  - `permissions` - Array of permission scopes
  - `dataAccess` - Data access requirements
  - `securityInfo` - Security practices and certifications
- **Relationships**: Belongs to Partner, has many API keys, integrations, listings

### Authentication Models

#### ApiKey
- **Purpose**: API key management
- **Fields**:
  - `keyValue` - Hashed API key
  - `keyPrefix` - First 8 chars for identification
  - `scopes` - Permission scopes
  - `rateLimit` - Requests per hour
  - `status` - Active, Rotated, Revoked, Expired
- **Relationships**: Belongs to Partner and Application

#### OAuthClient
- **Purpose**: OAuth 2.0 clients
- **Fields**:
  - `clientId`, `clientSecret` - OAuth credentials
  - `redirectUris` - Allowed redirect URIs
  - `allowedFlows` - Supported OAuth flows
  - `tokenLifetime` - Access token lifetime
- **Relationships**: Belongs to Partner and Application, has many tokens

#### OAuthToken
- **Purpose**: Issued OAuth tokens
- **Fields**: accessToken, refreshToken, scopes, expiresAt, revoked
- **Relationships**: Belongs to OAuthClient

### Integration Models

#### Integration
- **Purpose**: Active partner integrations
- **Fields**:
  - `integrationName` - Integration name
  - `integrationType` - Type of integration
  - `status` - Active, Inactive, Error, Maintenance
  - `healthStatus` - Current health status
  - `config` - Configuration JSON
- **Relationships**: Belongs to Partner and Application, has mappings, webhooks, metrics

#### IntegrationMapping
- **Purpose**: Field mappings for data transformation
- **Fields**: sourceField, targetField, transformation
- **Relationships**: Belongs to Integration

### Event & Webhook Models

#### EventType
- **Purpose**: Catalog of available event types
- **Fields**: eventName, description, eventCategory, payloadSchema
- **Standard Events**: lead.created, policy.created, claim.filed, etc.

#### PlatformEvent
- **Purpose**: Platform events for event sourcing
- **Fields**: eventTypeId, entityType, entityId, payload
- **Relationships**: Belongs to EventType, has many webhook deliveries

#### WebhookEndpoint
- **Purpose**: Webhook endpoints for event delivery
- **Fields**:
  - `endpointUrl` - Webhook URL
  - `webhookSecret` - HMAC signature secret
  - `subscribedEvents` - Array of event names
  - `active` - Enable/disable webhook
- **Relationships**: Belongs to Integration, has many deliveries

#### WebhookDelivery
- **Purpose**: Tracks webhook delivery attempts
- **Fields**:
  - `status` - Pending, Delivered, Failed
  - `attemptNumber` - Retry attempt number
  - `responseStatus` - HTTP response status
  - `nextRetryAt` - Next retry timestamp
- **Retry Logic**: Exponential backoff (2^attempt minutes)

### Billing Models

#### PartnerUsage
- **Purpose**: Tracks usage metrics
- **Fields**: metricName, metricValue, unit, usageDate
- **Metrics**: api_calls, data_processed, response_time

#### PartnerPricing
- **Purpose**: Partner pricing configuration
- **Pricing Models**:
  - Revenue Share - Percentage of transaction value
  - Flat Fee - Monthly or annual fee
  - Usage Based - Tiered pricing per API call
  - Hybrid - Combination of flat fee and usage

#### PartnerInvoice
- **Purpose**: Partner invoices
- **Fields**: billingPeriodStart, billingPeriodEnd, usage, subtotal, taxes, totalAmount
- **Status**: Draft, Sent, Paid, Overdue

#### PartnerPayout
- **Purpose**: Revenue share payouts
- **Fields**: totalRevenue, revenueShareAmount, deductions, netPayout
- **Status**: Pending, Processing, Completed, Failed

### Marketplace Models

#### MarketplaceListing
- **Purpose**: Integration marketplace listings
- **Fields**:
  - `listingTitle`, `listingDescription`
  - `categories` - Array of categories
  - `features` - Array of features
  - `averageRating`, `reviewCount`, `downloads`
- **Relationships**: Belongs to Application, has many reviews

#### MarketplaceReview
- **Purpose**: User reviews and ratings
- **Fields**: rating (1-5), reviewText, helpfulCount
- **Relationships**: Belongs to Listing

## Services

### 1. PartnerService

**Purpose**: Partner lifecycle management

**Methods**:
- `createPartner(data)` - Create new partner
- `getPartnerById(id)` - Get partner details
- `listPartners(filters)` - List partners with filters
- `updatePartner(id, data)` - Update partner
- `activatePartner(id)` - Activate partner account
- `suspendPartner(id, reason)` - Suspend partner
- `addContact(partnerId, contact)` - Add contact
- `createAgreement(partnerId, agreement)` - Create agreement
- `signAgreement(agreementId, date)` - Sign agreement
- `getPartnerStatistics(partnerId)` - Get partner stats

### 2. APIManagementService

**Purpose**: API key management and rate limiting

**Methods**:
- `generateApiKey(partnerId, request)` - Generate new API key
- `validateApiKey(rawKey)` - Validate API key
- `checkRateLimit(apiKeyId)` - Check rate limit
- `recordApiCall(partnerId, appId, endpoint, responseTime)` - Track usage
- `rotateApiKey(apiKeyId)` - Rotate API key
- `revokeApiKey(apiKeyId)` - Revoke API key

**Security**:
- API keys are hashed using SHA-256
- Rate limiting: Token bucket algorithm
- Usage tracking per hour
- Auto-expiration support

### 3. OAuth2Service

**Purpose**: OAuth 2.0 authentication flows

**Supported Flows**:
- Authorization Code Flow (for web apps)
- Client Credentials Flow (for machine-to-machine)
- Refresh Token Flow

**Methods**:
- `createClient(partnerId, appId, redirectUris)` - Create OAuth client
- `generateAuthorizationCode(request, userId)` - Generate auth code
- `exchangeAuthorizationCode(code, clientId, secret)` - Exchange for token
- `clientCredentialsGrant(clientId, secret)` - M2M authentication
- `refreshToken(refreshToken, clientId, secret)` - Refresh access token
- `validateAccessToken(token)` - Validate token
- `revokeToken(token)` - Revoke token
- `introspectToken(token)` - Get token details

**Token Lifetimes**:
- Access Token: 1 hour (3600 seconds)
- Refresh Token: 30 days (2592000 seconds)
- Authorization Code: 10 minutes

### 4. ApplicationService

**Purpose**: Application submission and approval workflows

**Methods**:
- `createApplication(partnerId, request)` - Create application
- `submitForApproval(id, request)` - Submit for review
- `approveApplication(id, approverId)` - Approve (admin)
- `rejectApplication(id, approverId, reason)` - Reject (admin)
- `publishApplication(id)` - Publish to marketplace
- `suspendApplication(id, reason)` - Suspend application
- `deprecateApplication(id, sunsetDate)` - Deprecate
- `runSecurityValidation(id)` - Run security checks

**Approval Workflow**:
1. Partner creates application (Draft)
2. Partner submits for approval (Submitted)
3. Admin reviews application
4. Admin approves/rejects (Approved/Rejected)
5. Partner publishes to marketplace (Published)

### 5. IntegrationService

**Purpose**: Integration management and monitoring

**Methods**:
- `createIntegration(request)` - Create integration
- `getIntegrationById(id)` - Get integration details
- `listIntegrations(filters)` - List integrations
- `activateIntegration(id)` - Activate integration
- `deactivateIntegration(id)` - Deactivate
- `testConnection(id)` - Test integration connection
- `checkIntegrationHealth(id)` - Health check
- `recordMetrics(integrationId, metrics)` - Record metrics
- `recordError(integrationId, error)` - Record error
- `getErrors(integrationId, filters)` - Get error history

**Health Monitoring**:
- Uptime percentage
- Error rate
- Average response time
- Data processed

**Health Thresholds**:
- Uptime < 95%: Error status
- Error rate > 5%: Error status
- Response time > 5000ms: Maintenance status

### 6. WebhookService

**Purpose**: Webhook delivery and retry logic

**Methods**:
- `registerWebhook(request)` - Register webhook
- `updateWebhook(id, updates)` - Update webhook
- `deleteWebhook(id)` - Delete webhook
- `testWebhook(id, request)` - Test webhook delivery
- `deliverEvent(eventId)` - Deliver event to webhooks
- `retryDelivery(deliveryId)` - Retry failed delivery
- `getDeliveries(webhookId, filters)` - Get delivery history
- `processPendingDeliveries()` - Background worker

**Delivery Features**:
- HMAC signature verification
- Automatic retry with exponential backoff
- Dead letter queue for failed deliveries
- At-least-once delivery guarantee

**Retry Schedule**:
- Attempt 1: Immediate
- Attempt 2: +2 minutes
- Attempt 3: +4 minutes
- Attempt 4: +8 minutes
- Attempt 5: +16 minutes
- After 5 attempts: Marked as failed

### 7. EventService

**Purpose**: Platform event management

**Methods**:
- `publishEvent(eventName, entityType, entityId, payload)` - Publish event
- `getEventById(id)` - Get event details
- `listEvents(filters)` - List events
- `replayEvent(eventId)` - Replay event to webhooks
- `listEventTypes(category)` - List event types
- `getEventStatistics(startDate, endDate)` - Event stats
- `initializeStandardEvents()` - Initialize standard event types

**Standard Event Types**:
- **Lead Events**: lead.created, lead.updated, lead.qualified, lead.assigned, lead.converted
- **Policy Events**: policy.created, policy.updated, policy.renewed, policy.cancelled
- **Claim Events**: claim.filed, claim.approved, claim.denied, claim.paid
- **User Events**: user.created, user.updated, user.role_changed
- **Integration Events**: integration.connected, integration.disconnected, integration.failed
- **Billing Events**: billing.usage_updated, billing.invoice_generated, billing.payment_received

### 8. MarketplaceService

**Purpose**: Integration marketplace and discovery

**Methods**:
- `createListing(appId, data)` - Create listing
- `publishListing(listingId)` - Publish listing
- `searchListings(filters)` - Search marketplace
- `installIntegration(listingId, organizationId)` - Install integration
- `addReview(listingId, reviewerId, rating, text)` - Add review
- `updateReview(reviewId, rating, text)` - Update review
- `getTrendingIntegrations(limit)` - Get trending
- `getFeaturedIntegrations()` - Get featured
- `getRecommendedIntegrations(organizationId)` - Get recommendations

**Discovery Features**:
- Full-text search
- Category filtering
- Rating filtering
- Sort by rating, downloads, recent, alphabetical
- Trending integrations (based on recent downloads)
- Featured integrations (high ratings + downloads)
- AI-powered recommendations

### 9. BillingService

**Purpose**: Usage tracking and revenue management

**Methods**:
- `setPricing(partnerId, pricing)` - Set pricing configuration
- `getCurrentPricing(partnerId)` - Get active pricing
- `trackUsage(partnerId, appId, metricName, value, unit)` - Track usage
- `getUsageSummary(partnerId, startDate, endDate)` - Usage summary
- `generateInvoice(partnerId, start, end)` - Generate invoice
- `markInvoicePaid(invoiceId, paymentDate)` - Mark as paid
- `generatePayout(partnerId, start, end, revenue)` - Generate payout
- `processPayout(payoutId, paymentMethodId)` - Process payout
- `getRevenueForecast(partnerId, months)` - Revenue forecast

**Pricing Models**:

1. **Flat Fee**
   - Fixed monthly or annual fee
   - No usage-based charges
   - Example: $500/month

2. **Revenue Share**
   - Percentage of transaction value
   - No upfront costs
   - Example: 15% of revenue

3. **Usage Based**
   - Tiered pricing per API call
   - Pay as you go
   - Example:
     - 0-10,000 calls: $0.01/call
     - 10,001-50,000 calls: $0.005/call
     - 50,001+ calls: $0.002/call

4. **Hybrid**
   - Combination of flat fee and usage
   - Base monthly fee + overage charges
   - Example: $200/month + $0.005/call over 20,000

## API Endpoints

### Partner Management

```
GET    /api/partners              # List partners
GET    /api/partners/:id          # Get partner
POST   /api/partners              # Create partner (admin)
PUT    /api/partners/:id          # Update partner
DELETE /api/partners/:id          # Delete partner (admin)
POST   /api/partners/:id/activate # Activate partner
POST   /api/partners/:id/suspend  # Suspend partner

GET    /api/partners/:id/contacts           # Get contacts
POST   /api/partners/:id/contacts           # Add contact
GET    /api/partners/:id/agreements         # Get agreements
POST   /api/partners/:id/agreements         # Create agreement
PUT    /api/partners/:id/agreements/:aid/sign # Sign agreement
GET    /api/partners/:id/statistics         # Get statistics
```

### Applications

```
GET    /api/applications              # List applications
GET    /api/applications/:id          # Get application
POST   /api/applications              # Create application
PUT    /api/applications/:id          # Update application
DELETE /api/applications/:id          # Delete application
POST   /api/applications/:id/submit   # Submit for approval
PUT    /api/applications/:id/approve  # Approve (admin)
PUT    /api/applications/:id/reject   # Reject (admin)
POST   /api/applications/:id/publish  # Publish to marketplace
POST   /api/applications/:id/suspend  # Suspend application
POST   /api/applications/:id/validate # Run security validation
GET    /api/applications/:id/statistics # Get statistics
```

### API Keys & OAuth

```
POST   /api/keys                     # Generate API key
GET    /api/keys                     # List API keys
POST   /api/keys/:id/rotate          # Rotate API key
DELETE /api/keys/:id                 # Revoke API key
PUT    /api/keys/:id/scopes          # Update scopes
PUT    /api/keys/:id/rate-limit      # Update rate limit

POST   /api/oauth/clients            # Create OAuth client
GET    /api/oauth/authorize          # Authorization endpoint
POST   /api/oauth/token              # Token endpoint
POST   /api/oauth/token/introspect   # Introspect token
POST   /api/oauth/token/revoke       # Revoke token
```

### Webhooks & Events

```
POST   /api/webhooks                           # Register webhook
GET    /api/webhooks                           # List webhooks
GET    /api/webhooks/:id                       # Get webhook
PUT    /api/webhooks/:id                       # Update webhook
DELETE /api/webhooks/:id                       # Delete webhook
POST   /api/webhooks/:id/test                  # Test webhook
GET    /api/webhooks/:id/deliveries            # Get deliveries
POST   /api/webhooks/:id/deliveries/:did/retry # Retry delivery

GET    /api/events                     # List events
GET    /api/events/:id                 # Get event
GET    /api/event-types                # List event types
POST   /api/events/:id/replay          # Replay event
GET    /api/events/statistics          # Event statistics
```

### Marketplace

```
GET    /api/marketplace                   # Search marketplace
GET    /api/marketplace/search            # Search (alias)
GET    /api/marketplace/trending          # Trending integrations
GET    /api/marketplace/featured          # Featured integrations
GET    /api/marketplace/recommended       # Recommended
GET    /api/marketplace/:id               # Get listing
POST   /api/marketplace/:id/install       # Install integration
POST   /api/marketplace/:id/reviews       # Add review
GET    /api/marketplace/:id/reviews       # Get reviews
PUT    /api/marketplace/reviews/:rid      # Update review
DELETE /api/marketplace/reviews/:rid      # Delete review
POST   /api/marketplace/reviews/:rid/helpful # Mark helpful

POST   /api/marketplace/listings          # Create listing
PUT    /api/marketplace/listings/:id      # Update listing
POST   /api/marketplace/listings/:id/publish # Publish listing
POST   /api/marketplace/listings/:id/remove  # Remove listing
```

## Authentication & Authorization

### API Key Authentication

```typescript
// Request header
Authorization: Bearer sk_abc123...

// Rate limiting headers (response)
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 2024-01-01T12:00:00Z
```

### OAuth 2.0 Flows

#### Authorization Code Flow

```
1. Redirect user to /api/oauth/authorize
2. User approves access
3. Redirect back with authorization code
4. Exchange code for access token at /api/oauth/token
5. Use access token for API calls
```

#### Client Credentials Flow

```
1. POST /api/oauth/token with client_id and client_secret
2. Receive access token
3. Use access token for API calls
```

### Permission Scopes

```typescript
- read:leads       // Read lead data
- write:leads      // Create/update leads
- read:agents      // Read agent data
- write:agents     // Create/update agents
- read:policies    // Read policy data
- write:policies   // Create/update policies
- read:claims      // Read claim data
- write:claims     // Create/update claims
- read:analytics   // Read analytics data
- manage:webhooks  // Manage webhooks
- admin            // Admin access (should not be requested)
```

## Webhook Payload Format

```json
{
  "id": "evt_abc123",
  "event": "lead.created",
  "timestamp": "2024-01-01T12:00:00Z",
  "data": {
    "id": "lead_123",
    "email": "john@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "insuranceType": "auto",
    "status": "received"
  },
  "signature": "sha256=abcdef123456..."
}
```

### Signature Verification

```typescript
const crypto = require('crypto');

function verifyWebhookSignature(payload, signature, secret) {
  const expected = crypto
    .createHmac('sha256', secret)
    .update(JSON.stringify(payload))
    .digest('hex');
  
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(`sha256=${expected}`)
  );
}
```

## Usage Examples

### Generate API Key

```typescript
const response = await fetch('/api/keys', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    partnerId: 'partner_123',
    appId: 'app_456',
    scopes: ['read:leads', 'write:leads'],
    rateLimit: 5000,
  }),
});

const { data } = await response.json();
// data.fullKey is only returned once!
console.log('API Key:', data.fullKey);
```

### Register Webhook

```typescript
const webhook = await fetch('/api/webhooks', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer sk_abc123...',
  },
  body: JSON.stringify({
    integrationId: 'int_789',
    endpointUrl: 'https://partner.com/webhooks',
    subscribedEvents: ['lead.created', 'policy.created'],
  }),
});
```

### Search Marketplace

```typescript
const { data } = await fetch(
  '/api/marketplace/search?query=CRM&categories=crm,sales&minRating=4'
).then(r => r.json());

console.log(`Found ${data.length} integrations`);
```

## Best Practices

### For Partners

1. **API Keys**
   - Store API keys securely (use environment variables)
   - Never commit API keys to version control
   - Rotate keys regularly (every 90 days)
   - Use separate keys for dev/staging/production

2. **Rate Limiting**
   - Respect rate limits
   - Implement exponential backoff for retries
   - Monitor usage to avoid hitting limits
   - Request higher limits if needed

3. **Webhooks**
   - Always verify webhook signatures
   - Respond with 200 status code quickly
   - Process webhooks asynchronously
   - Implement idempotency for duplicate events

4. **Error Handling**
   - Log all errors for debugging
   - Implement proper error recovery
   - Monitor integration health
   - Set up alerts for critical errors

### For Platform Admins

1. **Partner Onboarding**
   - Verify partner identity (KYC)
   - Review security practices
   - Set appropriate tier and rate limits
   - Provide onboarding documentation

2. **Application Review**
   - Check requested permissions
   - Verify security certifications
   - Test in sandbox environment
   - Review privacy policy

3. **Monitoring**
   - Monitor API usage patterns
   - Track integration health
   - Review webhook delivery rates
   - Analyze error patterns

4. **Revenue Management**
   - Review pricing configurations
   - Monitor usage vs. billing
   - Generate invoices on time
   - Process payouts promptly

## Monitoring & Observability

### Key Metrics

1. **API Performance**
   - Request rate (requests/second)
   - Response time (p50, p95, p99)
   - Error rate (%)
   - Rate limit hit rate

2. **Integration Health**
   - Uptime percentage
   - Error count and types
   - Data processed (bytes)
   - Active integrations

3. **Webhook Delivery**
   - Delivery success rate
   - Retry rate
   - Failed deliveries
   - Average delivery time

4. **Business Metrics**
   - Active partners
   - Total API calls
   - Revenue (MRR, ARR)
   - Marketplace installations

### Alerting

Set up alerts for:
- API error rate > 5%
- Integration downtime > 5 minutes
- Webhook delivery failure rate > 10%
- Rate limit exhaustion
- Suspicious activity patterns

## Security Considerations

1. **Authentication**
   - All API keys are hashed (SHA-256)
   - OAuth client secrets are hashed
   - Tokens have expiration dates
   - Support for token revocation

2. **Authorization**
   - Scope-based permissions
   - Partner tier restrictions
   - Rate limiting per key
   - IP whitelisting (optional)

3. **Data Protection**
   - All API calls over HTTPS/TLS
   - Webhook signature verification
   - PII data masking in logs
   - Encryption at rest

4. **Audit Trail**
   - All API calls logged
   - Event sourcing for changes
   - Webhook delivery logs
   - Partner activity tracking

## Performance Optimization

1. **Caching**
   - Cache partner/application metadata
   - Cache event types
   - Use Redis for rate limiting
   - CDN for marketplace assets

2. **Database**
   - Index all foreign keys
   - Partition usage tables by date
   - Archive old events/deliveries
   - Use read replicas for analytics

3. **Background Jobs**
   - Process webhooks asynchronously
   - Generate invoices in background
   - Run health checks periodically
   - Clean up expired tokens

## Migration Guide

### From Existing System

If migrating from an existing partner system:

1. **Export Partner Data**
   - Partner profiles
   - API keys (re-generate recommended)
   - Agreements and contracts
   - Usage history

2. **Import to New System**
   ```typescript
   // Run migration script
   npm run migrate:partners
   ```

3. **Update API Endpoints**
   - Update partner API calls to new endpoints
   - Test in sandbox environment
   - Update webhook URLs

4. **Verify Data**
   - Check partner configurations
   - Verify billing data
   - Test integrations

## Testing

### Unit Tests

```bash
npm test packages/core/src/partner
```

### Integration Tests

```bash
npm test:integration apps/api/src/routes/partners.test.ts
```

### End-to-End Tests

```bash
npm test:e2e partner-ecosystem
```

## Deployment

### Environment Variables

```bash
# OAuth
OAUTH_ISSUER=https://api.yourplatform.com
OAUTH_TOKEN_LIFETIME=3600
OAUTH_REFRESH_TOKEN_LIFETIME=2592000

# Rate Limiting
DEFAULT_RATE_LIMIT=1000
PREMIUM_RATE_LIMIT=10000

# Webhooks
WEBHOOK_MAX_RETRIES=5
WEBHOOK_RETRY_BACKOFF=exponential

# Billing
INVOICE_DUE_DAYS=30
PAYOUT_SCHEDULE=monthly
```

### Database Migrations

```bash
npx prisma migrate deploy
```

### Initialize Standard Events

```bash
npm run init:events
```

## Troubleshooting

### Common Issues

1. **API Key Invalid**
   - Check key hasn't expired
   - Verify key is active (not revoked/rotated)
   - Ensure partner is active

2. **Rate Limit Exceeded**
   - Check current usage
   - Increase rate limit if justified
   - Implement caching on partner side

3. **Webhook Not Delivering**
   - Verify endpoint URL is accessible
   - Check signature verification
   - Review retry logs
   - Test webhook endpoint

4. **OAuth Token Expired**
   - Use refresh token to get new access token
   - Check token expiration times
   - Implement token refresh logic

## Future Enhancements

1. **GraphQL API** - Alternative to REST
2. **WebSocket Support** - Real-time bidirectional communication
3. **SDK Auto-generation** - Generate SDKs for popular languages
4. **Advanced Analytics** - ML-powered insights
5. **Partner Portal UI** - Self-service web interface
6. **API Versioning** - Support multiple API versions
7. **Sandbox Environment** - Isolated testing environment
8. **Compliance Tools** - GDPR, CCPA compliance helpers

## Support

For questions or issues:
- Documentation: https://docs.yourplatform.com
- Community Forum: https://community.yourplatform.com
- Support Email: partners@yourplatform.com
- Status Page: https://status.yourplatform.com

## License

Copyright © 2024 Insurance Platform. All rights reserved.
