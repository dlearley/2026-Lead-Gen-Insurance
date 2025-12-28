# Phase 11.2: CDP Quick Start Guide

## 🚀 Quick Start

This guide will help you get started with the Customer Data Platform (CDP) in under 10 minutes.

## Prerequisites

- Database running (PostgreSQL)
- Data service running on port 3002
- API service running on port 3000

## 1. Run Database Migration

```bash
cd apps/data-service
npx prisma migrate dev --name add_cdp_models
npx prisma generate
cd ../..
```

## 2. Start Services

```bash
# Terminal 1: Start data service
cd apps/data-service
pnpm dev

# Terminal 2: Start API service (optional, for proxied access)
cd apps/api
pnpm dev
```

## 3. Test CDP Endpoints

### Track an Event
```bash
curl -X POST http://localhost:3002/api/v1/cdp/events/track \
  -H "Content-Type: application/json" \
  -d '{
    "customerId": "test-customer-id",
    "eventType": "PAGE_VIEW",
    "eventName": "Homepage Viewed",
    "eventCategory": "Navigation",
    "properties": {
      "page": "/",
      "referrer": "https://google.com"
    },
    "deviceType": "desktop",
    "browser": "Chrome"
  }'
```

### Set Customer Traits
```bash
curl -X POST http://localhost:3002/api/v1/cdp/traits/test-customer-id \
  -H "Content-Type: application/json" \
  -d '{
    "traitKey": "preferred_insurance_type",
    "traitValue": "auto",
    "traitType": "PREFERENCE"
  }'
```

### Create Customer Identity
```bash
curl -X POST http://localhost:3002/api/v1/cdp/identities/test-customer-id \
  -H "Content-Type: application/json" \
  -d '{
    "identityType": "EMAIL",
    "identityValue": "customer@example.com",
    "isPrimary": true
  }'
```

### Set Customer Consent
```bash
curl -X POST http://localhost:3002/api/v1/cdp/consents/test-customer-id \
  -H "Content-Type: application/json" \
  -d '{
    "consentType": "MARKETING_EMAIL",
    "granted": true,
    "source": "customer_portal"
  }'
```

### Get Customer 360 View
```bash
curl http://localhost:3002/api/v1/cdp/customer360/test-customer-id
```

## 4. Common Use Cases

### Scenario 1: Anonymous to Authenticated User Journey

```typescript
// 1. Track anonymous user behavior
await fetch('http://localhost:3002/api/v1/cdp/events/track', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    anonymousId: 'anon-123',
    sessionId: 'session-456',
    eventType: 'PAGE_VIEW',
    eventName: 'Quote Page Viewed'
  })
});

// 2. User logs in - resolve identity
const customerId = 'customer-uuid';

// 3. Link anonymous events to customer
await fetch('http://localhost:3002/api/v1/cdp/identities/merge', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    sourceCustomerId: 'anon-123',
    targetCustomerId: customerId,
    mergeStrategy: 'merge'
  })
});

// 4. Continue tracking with customer ID
await fetch('http://localhost:3002/api/v1/cdp/events/track', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    customerId: customerId,
    eventType: 'PURCHASE',
    eventName: 'Policy Purchased'
  })
});
```

### Scenario 2: Personalization Based on Traits

```typescript
// 1. Set customer traits
await fetch(`http://localhost:3002/api/v1/cdp/traits/${customerId}/batch`, {
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
        traitKey: 'price_sensitivity',
        traitValue: 'high',
        traitType: 'BEHAVIORAL'
      },
      {
        traitKey: 'customer_segment',
        traitValue: 'budget_conscious',
        traitType: 'LIFECYCLE'
      }
    ]
  })
});

// 2. Get traits for personalization
const response = await fetch(`http://localhost:3002/api/v1/cdp/traits/${customerId}`);
const traits = await response.json();

// 3. Use traits to personalize experience
const preferredType = traits.find(t => t.traitKey === 'preferred_insurance_type')?.traitValue;
const priceSensitivity = traits.find(t => t.traitKey === 'price_sensitivity')?.traitValue;

// Show relevant offers based on traits
```

### Scenario 3: Engagement Score Calculation

```typescript
// 1. Compute engagement traits based on recent activity
await fetch(`http://localhost:3002/api/v1/cdp/traits/${customerId}/compute-engagement`, {
  method: 'POST'
});

// 2. Compute overall engagement score
await fetch(`http://localhost:3002/api/v1/cdp/customer360/${customerId}/compute-engagement`, {
  method: 'POST'
});

// 3. Get customer 360 view with engagement data
const response = await fetch(`http://localhost:3002/api/v1/cdp/customer360/${customerId}`);
const customer360 = await response.json();

console.log('Engagement Score:', customer360.engagementScore.overallScore);
console.log('Recency Score:', customer360.engagementScore.recencyScore);
console.log('Frequency Score:', customer360.engagementScore.frequencyScore);
```

### Scenario 4: Consent Management (GDPR/CCPA)

```typescript
// 1. Customer grants marketing consent
await fetch(`http://localhost:3002/api/v1/cdp/consents/${customerId}`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    consentType: 'MARKETING_EMAIL',
    granted: true,
    source: 'customer_portal',
    ipAddress: req.ip
  })
});

// 2. Before sending marketing email, check consent
const response = await fetch(`http://localhost:3002/api/v1/cdp/consents/${customerId}/MARKETING_EMAIL`);
const consent = await response.json();

if (consent.granted) {
  // Send marketing email
}

// 3. Customer revokes consent
await fetch(`http://localhost:3002/api/v1/cdp/consents/${customerId}`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    consentType: 'MARKETING_EMAIL',
    granted: false,
    source: 'customer_portal',
    ipAddress: req.ip
  })
});
```

## 5. Integration with Frontend

### React Example: Track Page Views

```typescript
// utils/cdp.ts
import { useEffect } from 'react';

export const useCDPPageTracking = (customerId: string | null) => {
  useEffect(() => {
    const trackPageView = async () => {
      await fetch('http://localhost:3002/api/v1/cdp/events/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId: customerId || undefined,
          anonymousId: !customerId ? getAnonymousId() : undefined,
          sessionId: getSessionId(),
          eventType: 'PAGE_VIEW',
          eventName: document.title,
          eventCategory: 'Navigation',
          properties: {
            pageUrl: window.location.pathname,
            referrer: document.referrer
          },
          deviceType: getDeviceType(),
          browser: getBrowserName(),
          userAgent: navigator.userAgent
        })
      });
    };

    trackPageView();
  }, [customerId]);
};

// components/Dashboard.tsx
import { useCDPPageTracking } from '../utils/cdp';

export function Dashboard() {
  const { user } = useAuth();
  useCDPPageTracking(user?.id || null);
  
  return <div>Dashboard Content</div>;
}
```

### React Example: Track Button Clicks

```typescript
// components/QuoteButton.tsx
export function QuoteButton({ insuranceType }: { insuranceType: string }) {
  const { user } = useAuth();
  
  const handleClick = async () => {
    // Track click event
    await fetch('http://localhost:3002/api/v1/cdp/events/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customerId: user?.id,
        eventType: 'BUTTON_CLICK',
        eventName: 'Get Quote Button Clicked',
        eventCategory: 'Quote',
        properties: {
          insuranceType,
          buttonLabel: 'Get Quote'
        }
      })
    });
    
    // Navigate to quote page
    router.push(`/quotes/${insuranceType}`);
  };
  
  return <button onClick={handleClick}>Get Quote</button>;
}
```

## 6. Next Steps

1. **Implement Frontend Tracking**: Add CDP event tracking to your frontend
2. **Create Segments**: Define customer segments based on traits and behaviors
3. **Build Personalization**: Use customer 360 data to personalize experiences
4. **Set Up Analytics**: Monitor engagement scores and customer journeys
5. **Implement ML Models**: Use CDP data for predictive models (Phase 11.4)

## 7. Troubleshooting

### Events not appearing?
```bash
# Check if events are being created
curl http://localhost:3002/api/v1/cdp/events?customerId=test-customer-id&limit=10
```

### Traits not updating?
```bash
# Get all traits for customer
curl http://localhost:3002/api/v1/cdp/traits/test-customer-id
```

### Customer 360 view empty?
Make sure you have:
- Created a customer account
- Tracked some events
- Set some traits
- Computed engagement scores

## 8. Performance Tips

- **Batch Event Tracking**: Send events in batches for high-traffic scenarios
- **Async Processing**: Track events asynchronously to avoid blocking user actions
- **Cache Customer 360**: Cache the 360 view for frequently accessed customers
- **Index Optimization**: Ensure database indexes are optimized for your query patterns

## 📚 Resources

- [Full Documentation](./PHASE_11.2_IMPLEMENTATION.md)
- [API Reference](./PHASE_11.2_IMPLEMENTATION.md#-api-endpoints)
- [Use Cases](./PHASE_11.2_IMPLEMENTATION.md#-use-cases)

---

**Happy CDP Building!**
