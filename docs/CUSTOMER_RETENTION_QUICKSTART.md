# Customer Retention - Quick Start Guide

This guide provides quick examples of using the Customer Retention features.

## Prerequisites

```bash
# Generate Prisma client after schema changes
pnpm prisma generate

# Run database migration
pnpm prisma migrate dev --name customer_retention
```

## Quick Examples

### 1. Convert Lead to Customer

```typescript
// When a lead converts, create customer record
const response = await fetch('http://localhost:3001/api/v1/retention/customers', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    leadId: 'lead-123',
    agentId: 'agent-456',
    firstName: 'John',
    lastName: 'Doe',
    email: 'john.doe@example.com',
    phone: '+1234567890',
    address: {
      street: '123 Main St',
      city: 'Springfield',
      state: 'IL',
      zipCode: '62701',
      country: 'USA',
    },
  }),
});

const { data: customer } = await response.json();
```

### 2. Add Policy

```typescript
const response = await fetch('http://localhost:3001/api/v1/retention/policies', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    customerId: customer.id,
    agentId: 'agent-456',
    policyNumber: 'POL-2024-001',
    policyType: 'auto',
    premium: {
      amount: 1200,
      frequency: 'annual',
      currency: 'USD',
    },
    coverage: {
      type: 'comprehensive',
      amount: 50000,
      deductible: 500,
    },
    effectiveDate: '2024-01-01',
    expirationDate: '2025-01-01',
  }),
});
```

### 3. Calculate Health Score

```typescript
const response = await fetch(
  `http://localhost:3001/api/v1/retention/customers/${customerId}/health-score`,
  { method: 'POST' }
);

const { data: healthScore } = await response.json();
console.log('Health Score:', healthScore.overallScore);
console.log('Churn Risk:', healthScore.churnRisk);
```

### 4. Calculate LTV

```typescript
const response = await fetch(`http://localhost:3001/api/v1/retention/customers/${customerId}/ltv`, {
  method: 'POST',
});

const { data: ltv } = await response.json();
console.log('Current LTV:', ltv.currentLTV);
console.log('Projected LTV:', ltv.projectedLTV);
console.log('Tier:', ltv.segments.tier);
```

### 5. Predict Churn

```typescript
const response = await fetch(
  `http://localhost:3001/api/v1/retention/customers/${customerId}/churn-prediction`,
  { method: 'POST' }
);

const { data: prediction } = await response.json();
console.log('Churn Probability:', prediction.churnProbability);
console.log('Risk Level:', prediction.churnRisk);
console.log('Recommendations:', prediction.recommendations);
```

### 6. Get At-Risk Customers

```typescript
const response = await fetch('http://localhost:3001/api/v1/retention/at-risk?limit=50');

const { data: atRisk } = await response.json();
atRisk.forEach((customer) => {
  console.log(`${customer.firstName} ${customer.lastName} - Risk: ${customer.churnRisk}`);
});
```

### 7. Create Retention Campaign

```typescript
const response = await fetch('http://localhost:3001/api/v1/retention/campaigns', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-User-Id': 'user-123',
  },
  body: JSON.stringify({
    name: 'Q1 2024 Renewal Campaign',
    type: 'renewal_reminder',
    targetSegment: {
      churnRisk: ['medium', 'high'],
      policyTypes: ['auto', 'home'],
    },
    schedule: {
      startDate: '2024-01-01T00:00:00Z',
      endDate: '2024-03-31T23:59:59Z',
    },
    touchpoints: [
      {
        type: 'email',
        template: 'renewal_reminder',
        delay: 0, // Send immediately
      },
      {
        type: 'sms',
        template: 'renewal_reminder',
        delay: 10080, // 7 days later (in minutes)
      },
    ],
    goals: {
      targetCustomers: 500,
      expectedRetention: 475,
      expectedRevenue: 750000,
    },
  }),
});

const { data: campaign } = await response.json();
```

### 8. Activate Campaign

```typescript
const response = await fetch(
  `http://localhost:3001/api/v1/retention/campaigns/${campaignId}/activate`,
  { method: 'POST' }
);

const { data: campaign } = await response.json();
console.log('Campaign activated:', campaign.name);
```

### 9. Get Retention Metrics

```typescript
const response = await fetch(
  'http://localhost:3001/api/v1/retention/metrics?startDate=2024-01-01&endDate=2024-01-31'
);

const { data: metrics } = await response.json();
console.log('Retention Rate:', metrics.customerMetrics.retentionRate + '%');
console.log('Churn Rate:', metrics.customerMetrics.churnRate + '%');
console.log('Average LTV:', '$' + metrics.revenueMetrics.averageLTV);
```

### 10. Get Upcoming Renewals

```typescript
const response = await fetch('http://localhost:3001/api/v1/retention/renewals/upcoming?days=30');

const { data: renewals } = await response.json();
renewals.forEach((policy) => {
  console.log(`Policy ${policy.policyNumber} - Renewal: ${policy.renewalDate}`);
});
```

## Background Jobs

### Health Score Updates (Daily)

```typescript
// Run this as a cron job daily
async function updateHealthScores() {
  const response = await fetch('http://localhost:3001/api/v1/retention/customers');
  const { data: customers } = await response.json();

  for (const customer of customers) {
    await fetch(`http://localhost:3001/api/v1/retention/customers/${customer.id}/health-score`, {
      method: 'POST',
    });
  }
}
```

### Process Campaign Touchpoints

```typescript
// Run this every 5 minutes
async function processTouchpoints() {
  const response = await fetch(
    'http://localhost:3001/api/v1/retention/touchpoints/pending?limit=100'
  );
  const { data: touchpoints } = await response.json();

  for (const touchpoint of touchpoints) {
    try {
      // Send via appropriate channel
      if (touchpoint.type === 'email') {
        await sendEmail(touchpoint);
      } else if (touchpoint.type === 'sms') {
        await sendSMS(touchpoint);
      }

      // Update status
      await fetch(`http://localhost:3001/api/v1/retention/touchpoints/${touchpoint.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'sent' }),
      });
    } catch (error) {
      // Mark as failed
      await fetch(`http://localhost:3001/api/v1/retention/touchpoints/${touchpoint.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'failed',
          metadata: { error: error.message },
        }),
      });
    }
  }
}
```

## API Endpoints Summary

### Customers

- `POST /api/v1/retention/customers` - Create customer
- `GET /api/v1/retention/customers/:id` - Get customer
- `PATCH /api/v1/retention/customers/:id` - Update customer
- `GET /api/v1/retention/customers` - List customers

### Policies

- `POST /api/v1/retention/policies` - Create policy
- `GET /api/v1/retention/policies/:id` - Get policy
- `PATCH /api/v1/retention/policies/:id` - Update policy
- `POST /api/v1/retention/policies/:id/renew` - Renew policy

### Health & LTV

- `POST /api/v1/retention/customers/:id/health-score` - Calculate health score
- `GET /api/v1/retention/customers/:id/health-score` - Get health score history
- `POST /api/v1/retention/customers/:id/ltv` - Calculate LTV
- `GET /api/v1/retention/customers/:id/ltv` - Get LTV history

### Churn & Metrics

- `POST /api/v1/retention/customers/:id/churn-prediction` - Predict churn
- `GET /api/v1/retention/metrics` - Get retention metrics
- `GET /api/v1/retention/at-risk` - Get at-risk customers
- `GET /api/v1/retention/renewals/upcoming` - Get upcoming renewals

### Campaigns

- `POST /api/v1/retention/campaigns` - Create campaign
- `GET /api/v1/retention/campaigns/:id` - Get campaign
- `GET /api/v1/retention/campaigns` - List campaigns
- `PATCH /api/v1/retention/campaigns/:id/status` - Update campaign status
- `POST /api/v1/retention/campaigns/:id/activate` - Activate campaign
- `POST /api/v1/retention/campaigns/:id/pause` - Pause campaign
- `GET /api/v1/retention/campaigns/:id/performance` - Get campaign performance

### Touchpoints

- `GET /api/v1/retention/campaigns/:id/touchpoints` - Get campaign touchpoints
- `GET /api/v1/retention/touchpoints/pending` - Get pending touchpoints
- `PATCH /api/v1/retention/touchpoints/:id/status` - Update touchpoint status
- `POST /api/v1/retention/touchpoints/:id/response` - Record touchpoint response

## Environment Variables

```bash
# Required for data-service
DATABASE_URL="postgresql://user:password@localhost:5432/insurance_leads"
PORT=3001
```

## Database Setup

```bash
# Create migration
cd /home/engine/project
pnpm prisma migrate dev --name customer_retention

# Or push schema directly (dev only)
pnpm prisma db push
```

## See Also

- [Full Documentation](./PHASE_9.6_CUSTOMER_RETENTION.md)
- [API Documentation](./API.md)
- [User Guide](./USER_GUIDE.md)
