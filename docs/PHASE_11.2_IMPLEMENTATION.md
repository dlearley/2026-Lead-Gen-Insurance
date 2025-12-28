# Phase 11.2: Customer Data Platform (CDP) - Foundation for Personalization

## 📋 Overview

Phase 11.2 implements a comprehensive Customer Data Platform (CDP) that serves as the foundation for all personalization efforts. The CDP provides unified customer profiles, behavioral tracking, identity resolution, trait management, and customer 360-degree views.

## 🎯 Objectives

- **Identity Resolution**: Unify customer identities across multiple touchpoints
- **Behavioral Tracking**: Capture and store all customer interactions and events
- **Customer Traits**: Store and compute customer attributes and characteristics
- **Consent Management**: Track customer privacy preferences and consents
- **Customer 360 View**: Provide a unified view of all customer data
- **Analytics Foundation**: Enable advanced segmentation and personalization

## 🏗️ Architecture

### Database Models

The CDP introduces the following Prisma models:

#### Customer Portal Models (from Phase 9.1)
- **Customer**: Core customer account and authentication
- **CustomerProfile**: Profile information and preferences
- **CustomerDocument**: Document management
- **CustomerMessage**: Customer communication

#### Identity Resolution
- **CustomerIdentity**: Multiple identity types per customer
  - Email, Phone, Device ID, Session ID, External ID, Cookie ID, IP Address
  - Primary identity designation
  - Verification tracking

#### Behavioral Events
- **CustomerEvent**: All customer interactions and behaviors
  - Event types: Page views, clicks, form submits, logins, purchases, etc.
  - Anonymous and authenticated tracking
  - Session management
  - Device, browser, and location tracking
  - Rich event properties and context

#### Traits & Attributes
- **CustomerTrait**: Customer attributes and characteristics
  - Trait types: Demographic, Behavioral, Computed, Transactional, Preference, Engagement, Risk, Lifecycle
  - Computed and static traits
  - Expiration support
  - Source tracking

#### Segmentation
- **CustomerSegment**: Customer segment definitions
  - Segment types: Static, Dynamic, Behavioral, Predictive, Lifecycle, RFM
  - Rule-based segmentation
- **CustomerSegmentMembership**: Segment membership tracking

#### Consent & Privacy
- **CustomerConsent**: Privacy and marketing consent tracking
  - Consent types: Marketing (Email, SMS, Push), Data Processing, Third-party Sharing, Analytics, Personalization, Profiling
  - Grant/revoke tracking
  - Expiration support

#### Analytics & Insights
- **CustomerJourneyStep**: Customer journey tracking
- **CustomerEngagementScore**: Multi-dimensional engagement scoring
  - Overall, Email, Web, Portal, Recency, Frequency, Monetary scores
- **CustomerLifetimeValue**: LTV calculation and prediction
  - Current and predicted value
  - Purchase metrics
  - Churn probability

## 📁 Files Created

### Database Schema
- `apps/data-service/prisma/schema.prisma` - Updated with CDP models

### Type Definitions
- `packages/types/src/cdp.ts` - CDP TypeScript types
- `packages/types/src/index.ts` - Updated to export CDP types

### Services
- `apps/data-service/src/services/cdp-identity.service.ts` - Identity resolution
- `apps/data-service/src/services/cdp-events.service.ts` - Event tracking
- `apps/data-service/src/services/cdp-traits.service.ts` - Trait management
- `apps/data-service/src/services/cdp-consent.service.ts` - Consent management
- `apps/data-service/src/services/cdp-customer360.service.ts` - Customer 360 view

### Routes
- `apps/data-service/src/routes/cdp.routes.ts` - CDP API endpoints

### Integration
- `apps/data-service/src/index.ts` - Updated to register CDP routes

## 🔌 API Endpoints

### Identity Management

#### Create Identity
```
POST /api/v1/cdp/identities/:customerId
```
**Request Body:**
```json
{
  "identityType": "EMAIL" | "PHONE" | "DEVICE_ID" | "SESSION_ID" | "EXTERNAL_ID" | "COOKIE_ID" | "IP_ADDRESS",
  "identityValue": "string",
  "provider": "string (optional)",
  "verifiedAt": "date (optional)",
  "isPrimary": "boolean (optional)",
  "metadata": "object (optional)"
}
```

#### Get Customer Identities
```
GET /api/v1/cdp/identities/:customerId
```

#### Resolve Customer by Identity
```
GET /api/v1/cdp/identity/resolve?identityType=EMAIL&identityValue=customer@example.com
```

#### Merge Customer Identities
```
POST /api/v1/cdp/identities/merge
```
**Request Body:**
```json
{
  "sourceCustomerId": "uuid",
  "targetCustomerId": "uuid",
  "mergeStrategy": "merge" | "replace"
}
```

#### Verify Identity
```
POST /api/v1/cdp/identities/:customerId/verify
```

#### Set Primary Identity
```
POST /api/v1/cdp/identities/:customerId/set-primary
```

### Event Tracking

#### Track Event
```
POST /api/v1/cdp/events/track
```
**Request Body:**
```json
{
  "customerId": "uuid (optional)",
  "anonymousId": "string (optional)",
  "sessionId": "string (optional)",
  "eventType": "PAGE_VIEW" | "BUTTON_CLICK" | "FORM_SUBMIT" | "QUOTE_REQUEST" | "QUOTE_VIEW" | "DOCUMENT_UPLOAD" | "DOCUMENT_VIEW" | "MESSAGE_SENT" | "MESSAGE_READ" | "PROFILE_UPDATE" | "LOGIN" | "LOGOUT" | "PURCHASE" | "POLICY_VIEW" | "CLAIM_SUBMIT" | "SEARCH" | "CUSTOM",
  "eventName": "string",
  "eventCategory": "string (optional)",
  "properties": "object (optional)",
  "context": "object (optional)",
  "timestamp": "date (optional)",
  "deviceType": "string (optional)",
  "browser": "string (optional)",
  "os": "string (optional)",
  "ipAddress": "string (optional)",
  "userAgent": "string (optional)",
  "country": "string (optional)",
  "region": "string (optional)",
  "city": "string (optional)",
  "metadata": "object (optional)"
}
```

#### List Events
```
GET /api/v1/cdp/events?customerId=uuid&eventType=PAGE_VIEW&startDate=2024-01-01&endDate=2024-12-31&page=1&limit=50
```

#### Get Recent Events
```
GET /api/v1/cdp/events/:customerId/recent?limit=25
```

### Trait Management

#### Set Trait
```
POST /api/v1/cdp/traits/:customerId
```
**Request Body:**
```json
{
  "traitKey": "string",
  "traitValue": "any",
  "traitType": "DEMOGRAPHIC" | "BEHAVIORAL" | "COMPUTED" | "TRANSACTIONAL" | "PREFERENCE" | "ENGAGEMENT" | "RISK" | "LIFECYCLE",
  "source": "string (optional)",
  "computedAt": "date (optional)",
  "expiresAt": "date (optional)",
  "metadata": "object (optional)"
}
```

#### Set Multiple Traits
```
POST /api/v1/cdp/traits/:customerId/batch
```

#### Get Customer Traits
```
GET /api/v1/cdp/traits/:customerId
```

#### Get Specific Trait
```
GET /api/v1/cdp/traits/:customerId/:traitKey
```

#### Delete Trait
```
DELETE /api/v1/cdp/traits/:customerId/:traitKey
```

#### Compute Engagement Traits
```
POST /api/v1/cdp/traits/:customerId/compute-engagement
```

### Consent Management

#### Set Consent
```
POST /api/v1/cdp/consents/:customerId
```
**Request Body:**
```json
{
  "consentType": "MARKETING_EMAIL" | "MARKETING_SMS" | "MARKETING_PUSH" | "DATA_PROCESSING" | "THIRD_PARTY_SHARING" | "ANALYTICS_TRACKING" | "PERSONALIZATION" | "PROFILING",
  "granted": "boolean",
  "source": "string (optional)",
  "ipAddress": "string (optional)",
  "expiresAt": "date (optional)",
  "metadata": "object (optional)"
}
```

#### Get Customer Consents
```
GET /api/v1/cdp/consents/:customerId
```

#### Get Specific Consent
```
GET /api/v1/cdp/consents/:customerId/:consentType
```

### Customer 360 View

#### Get Customer 360 View
```
GET /api/v1/cdp/customer360/:customerId
```
**Response:**
```json
{
  "customer": {
    "id": "uuid",
    "email": "string",
    "phoneNumber": "string",
    "isVerified": "boolean",
    "lastLoginAt": "date",
    "createdAt": "date"
  },
  "profile": {
    "dateOfBirth": "date",
    "preferredContact": "string",
    "address": "object",
    "emergencyContact": "object",
    "preferences": "object"
  },
  "identities": [],
  "traits": [],
  "segments": [],
  "consents": [],
  "engagementScore": {
    "overallScore": 75,
    "emailScore": 80,
    "webScore": 70,
    "portalScore": 85,
    "recencyScore": 90,
    "frequencyScore": 65,
    "monetaryScore": 60,
    "computedAt": "date"
  },
  "lifetimeValue": {
    "currentValue": 5000,
    "predictedValue": 15000,
    "totalPurchases": 3,
    "averagePurchaseValue": 1666.67,
    "purchaseFrequency": 0.25,
    "customerTenure": 365,
    "churnProbability": 0.15,
    "computedAt": "date"
  },
  "recentEvents": [],
  "journeySteps": []
}
```

#### Compute Engagement Score
```
POST /api/v1/cdp/customer360/:customerId/compute-engagement
```

#### Compute Lifetime Value
```
POST /api/v1/cdp/customer360/:customerId/compute-ltv
```

## 🚀 Usage Examples

### Track a Page View Event
```typescript
await fetch('http://localhost:3002/api/v1/cdp/events/track', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    customerId: 'customer-uuid',
    sessionId: 'session-123',
    eventType: 'PAGE_VIEW',
    eventName: 'Quote Request Page Viewed',
    eventCategory: 'Quote',
    properties: {
      pageUrl: '/quotes/request',
      insuranceType: 'auto',
      referrer: '/home'
    },
    deviceType: 'desktop',
    browser: 'Chrome',
    os: 'Windows'
  })
});
```

### Set Customer Traits
```typescript
await fetch('http://localhost:3002/api/v1/cdp/traits/customer-uuid/batch', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    traits: [
      {
        traitKey: 'preferred_insurance_type',
        traitValue: 'auto',
        traitType: 'PREFERENCE'
      },
      {
        traitKey: 'risk_score',
        traitValue: 85,
        traitType: 'RISK',
        source: 'computed'
      },
      {
        traitKey: 'customer_segment',
        traitValue: 'high_value',
        traitType: 'LIFECYCLE'
      }
    ]
  })
});
```

### Update Consent Preferences
```typescript
await fetch('http://localhost:3002/api/v1/cdp/consents/customer-uuid', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    consentType: 'MARKETING_EMAIL',
    granted: true,
    source: 'customer_portal',
    ipAddress: '192.168.1.1'
  })
});
```

### Get Customer 360 View
```typescript
const response = await fetch('http://localhost:3002/api/v1/cdp/customer360/customer-uuid');
const customer360 = await response.json();
```

## 🔄 Database Migration

Run the Prisma migration to create the CDP tables:

```bash
cd apps/data-service
npx prisma migrate dev --name add_cdp_models
npx prisma generate
```

## 🎯 Use Cases

### 1. Identity Resolution
- Link anonymous sessions to authenticated customers
- Merge duplicate customer profiles
- Track customers across devices and channels

### 2. Behavioral Analytics
- Track customer journey through the platform
- Analyze feature usage and engagement
- Identify drop-off points and optimization opportunities

### 3. Personalization Foundation
- Use traits and engagement scores for personalized experiences
- Segment customers based on behavior and attributes
- Deliver targeted content and offers

### 4. Compliance & Privacy
- Track and honor customer consent preferences
- Support GDPR/CCPA compliance
- Audit trail for data processing

### 5. Customer Intelligence
- Calculate engagement scores and LTV
- Predict churn risk
- Identify high-value customers

## 🔮 Future Enhancements

### Phase 11.3: Advanced Personalization
- Real-time recommendation engine
- Dynamic content personalization
- A/B testing framework
- Predictive next-best-action

### Phase 11.4: Machine Learning Integration
- Churn prediction models
- LTV prediction models
- Propensity scoring
- Automated segmentation

### Phase 11.5: Real-time Personalization
- Real-time event processing with streaming
- In-session personalization
- Dynamic pricing
- Real-time offers

## 🧪 Testing

### Manual Testing

1. **Track Events:**
```bash
curl -X POST http://localhost:3002/api/v1/cdp/events/track \
  -H "Content-Type: application/json" \
  -d '{
    "customerId": "customer-id",
    "eventType": "PAGE_VIEW",
    "eventName": "Dashboard Viewed"
  }'
```

2. **Set Traits:**
```bash
curl -X POST http://localhost:3002/api/v1/cdp/traits/customer-id \
  -H "Content-Type: application/json" \
  -d '{
    "traitKey": "engagement_level",
    "traitValue": "high",
    "traitType": "ENGAGEMENT"
  }'
```

3. **Get Customer 360:**
```bash
curl http://localhost:3002/api/v1/cdp/customer360/customer-id
```

## 📊 Metrics & Monitoring

Monitor these CDP metrics:
- Event ingestion rate (events/second)
- Event processing latency
- Identity resolution success rate
- Trait computation time
- Customer 360 view response time

## 🔐 Security Considerations

- Customer data is sensitive - ensure proper access controls
- Encrypt PII data at rest
- Audit all data access
- Respect consent preferences in all operations
- Implement data retention policies
- Support data deletion requests (GDPR right to be forgotten)

## ✅ Completion Checklist

- [x] Database schema with CDP models
- [x] Identity resolution service
- [x] Event tracking service
- [x] Trait management service
- [x] Consent management service
- [x] Customer 360 view service
- [x] API endpoints for all CDP operations
- [x] TypeScript type definitions
- [x] Route registration in data-service
- [x] Comprehensive documentation

## 📚 Additional Resources

- [Segment CDP Documentation](https://segment.com/docs/)
- [Customer Data Platform Guide](https://www.gartner.com/en/marketing/topics/customer-data-platform)
- [GDPR Compliance](https://gdpr.eu/)
- [RFM Analysis](https://en.wikipedia.org/wiki/RFM_(market_research))

## 🎉 Success Criteria

- ✅ All CDP models created in database
- ✅ Services handle identity, events, traits, consents
- ✅ Customer 360 view aggregates all data
- ✅ API endpoints functional and documented
- ✅ Ready for personalization features in Phase 11.3

---

**Phase 11.2 Status**: ✅ **COMPLETE**

The CDP foundation is now in place and ready to power advanced personalization, segmentation, and customer intelligence features.
