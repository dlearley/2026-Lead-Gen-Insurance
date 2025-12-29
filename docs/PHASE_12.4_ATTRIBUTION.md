# Phase 12.4: Attribution System

## 📋 Overview

Phase 12.4 implements a comprehensive multi-touch attribution system for the Insurance Lead Generation AI Platform. This system tracks and credits various marketing channels, partners, and brokers for their contributions to lead generation and conversions, enabling accurate ROI calculation and optimization of marketing spend.

## 🎯 Objectives

1. **Multi-Touch Tracking**: Track every customer interaction across all channels
2. **Attribution Modeling**: Support multiple attribution models for flexible credit allocation
3. **Revenue Attribution**: Accurately attribute revenue and commissions to touchpoints
4. **Partner & Broker Attribution**: Track attribution for partners and brokers separately
5. **Reporting & Analytics**: Generate comprehensive attribution reports and insights
6. **Dispute Resolution**: Handle attribution disputes with evidence-based resolution

## 🏗️ Architecture

### Data Flow

```
Lead Interaction → Touchpoint → Conversion → Attribution Calculation → Report/Analytics
                      ↓              ↓               ↓                    ↓
              Channel/Source    Revenue       Credit Allocation        Insights
              Partner/Broker    Policy        Commission Tracking       Trends
              Campaign          Type          Status Management         ROI
```

### Components

1. **Touchpoint Service**: Captures and manages customer interactions
2. **Conversion Service**: Tracks lead-to-customer conversions
3. **Attribution Engine**: Calculates attribution using various models
4. **Report Generator**: Creates comprehensive attribution reports
5. **Analytics Service**: Provides insights and trend analysis

## 📊 Attribution Models Supported

| Model | Description | Use Case |
|-------|-------------|----------|
| **First Touch** | 100% credit to first interaction | Brand awareness campaigns |
| **Last Touch** | 100% credit to last interaction | Direct response campaigns |
| **Linear** | Equal credit to all touchpoints | Customer journey analysis |
| **Time Decay** | More credit to recent touchpoints | Short sales cycles |
| **Position Based** | 40% first, 20% middle, 40% last | Balanced approach |
| **Data Driven** | ML-based weight distribution | Advanced optimization |

## 📱 Touchpoint Types

| Type | Description | Example |
|------|-------------|---------|
| `organic_search` | Unpaid search results | Google search |
| `paid_search` | Paid search ads | Google Ads |
| `social_media` | Social media interactions | Facebook, LinkedIn |
| `email` | Email campaigns | Newsletter, promotional |
| `display_ad` | Display/banner ads | Google Display Network |
| `referral` | Word-of-mouth referrals | Customer referrals |
| `direct` | Direct website visits | Direct URL entry |
| `partner_referral` | Partner-sourced leads | Partner network |
| `broker_referral` | Broker-sourced leads | Insurance brokers |
| `affiliate` | Affiliate marketing | Affiliate partners |
| `webinar` | Webinar registrations | Educational content |
| `event` | Offline events | Conferences, meetups |
| `phone_call` | Phone inquiries | Call tracking |
| `chat` | Live chat interactions | Website chat |
| `other` | Miscellaneous | Other channels |

## 🗄️ Database Schema

### Touchpoint Model
```prisma
model Touchpoint {
  id                 String        @id @default(uuid())
  leadId             String
  sessionId          String?
  channel            TouchpointType
  source             String?
  medium             String?
  campaign           String?
  content            String?
  term               String?
  referralCode       String?
  partnerId          String?
  brokerId           String?
  timestamp          DateTime      @default(now())
  converted          Boolean       @default(false)
  conversionValue    Float?
  conversionTimestamp DateTime?
}
```

### Conversion Model
```prisma
model Conversion {
  id               String            @id @default(uuid())
  leadId           String
  type             ConversionType
  value            Float
  currency         String            @default("USD")
  policyId         String?
  policyNumber     String?
  commissionRate   Float?
  commissionAmount Float?
  occurredAt       DateTime          @default(now())
  attributions     AttributionRecord[]
}
```

### AttributionRecord Model
```prisma
model AttributionRecord {
  id               String            @id @default(uuid())
  leadId           String
  conversionId     String?
  touchpointId     String
  channel          TouchpointType
  model            AttributionModel
  credit           Float
  percentage       Float
  revenueAttributed Float?
  commissionAmount Float?
  partnerId        String?
  brokerId         String?
  campaignId       String?
  calculatedAt     DateTime          @default(now())
  status           AttributionStatus @default(PENDING)
}
```

## 🔧 API Endpoints

### Touchpoints
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/attribution/touchpoints` | Create touchpoint |
| GET | `/api/v1/attribution/touchpoints/:id` | Get touchpoint by ID |
| GET | `/api/v1/attribution/touchpoints` | List touchpoints |
| PUT | `/api/v1/attribution/touchpoints/:id` | Update touchpoint |
| DELETE | `/api/v1/attribution/touchpoints/:id` | Delete touchpoint |
| GET | `/api/v1/attribution/leads/:leadId/touchpoints` | Get lead touchpoints |

### Conversions
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/attribution/conversions` | Create conversion |
| GET | `/api/v1/attribution/conversions/:id` | Get conversion by ID |
| GET | `/api/v1/attribution/conversions` | List conversions |
| PUT | `/api/v1/attribution/conversions/:id` | Update conversion |

### Attribution
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/attribution/attribution/calculate` | Calculate attribution |
| POST | `/api/v1/attribution/attribution/calculate-and-save` | Calculate and save |
| POST | `/api/v1/attribution/attribution/batch` | Batch processing |
| GET | `/api/v1/attribution/attributions/:id` | Get attribution by ID |
| GET | `/api/v1/attribution/attributions` | List attributions |
| PUT | `/api/v1/attribution/attributions/:id` | Update attribution |

### Reports & Analytics
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/attribution/reports/attribution` | Generate report |
| GET | `/api/v1/attribution/analytics/attribution` | Get analytics |
| GET | `/api/v1/attribution/attribution/models/:model/config` | Get model config |
| POST | `/api/v1/attribution/attribution/models/config` | Set model config |

### Disputes
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/attribution/disputes` | Create dispute |
| GET | `/api/v1/attribution/disputes` | List disputes |
| PUT | `/api/v1/attribution/disputes/:id/resolve` | Resolve dispute |

## 💻 TypeScript Types

### Core Types

```typescript
// Attribution Models
type AttributionModel = 
  | 'first_touch'
  | 'last_touch'
  | 'linear'
  | 'time_decay'
  | 'position_based'
  | 'data_driven';

// Touchpoint Types
type TouchpointType = 
  | 'organic_search' | 'paid_search' | 'social_media' | 'email'
  | 'display_ad' | 'referral' | 'direct' | 'partner_referral'
  | 'broker_referral' | 'affiliate' | 'webinar' | 'event'
  | 'phone_call' | 'chat' | 'other';

// Conversion Types
type ConversionType = 
  | 'sale' | 'signup' | 'quote_request' | 'policy_bound' | 'renewal';

// Attribution Status
type AttributionStatus = 
  | 'pending' | 'calculated' | 'approved' | 'disputed' | 'paid';
```

### Key Interfaces

```typescript
interface Touchpoint {
  id: string;
  leadId: string;
  sessionId?: string;
  channel: TouchpointType;
  source?: string;
  medium?: string;
  campaign?: string;
  referralCode?: string;
  partnerId?: string;
  brokerId?: string;
  timestamp: Date;
  converted: boolean;
  conversionValue?: number;
}

interface Conversion {
  id: string;
  leadId: string;
  type: ConversionType;
  value: number;
  currency: string;
  policyId?: string;
  commissionRate?: number;
  commissionAmount?: number;
  occurredAt: Date;
}

interface AttributionRecord {
  id: string;
  leadId: string;
  conversionId?: string;
  touchpointId: string;
  channel: TouchpointType;
  model: AttributionModel;
  credit: number;
  percentage: number;
  revenueAttributed?: number;
  commissionAmount?: number;
  partnerId?: string;
  brokerId?: string;
  status: AttributionStatus;
}

interface AttributionReport {
  reportId: string;
  period: { start: Date; end: Date };
  model: AttributionModel;
  summary: {
    totalConversions: number;
    totalRevenue: number;
    totalCommission: number;
    attributedRevenue: number;
  };
  byChannel: ChannelAttributionSummary[];
  byPartner: PartnerAttributionSummary[];
  byBroker: BrokerAttributionSummary[];
}
```

## 🚀 Usage Examples

### 1. Creating a Touchpoint

```typescript
// Track a new touchpoint
const touchpoint = await attributionService.createTouchpoint({
  leadId: 'lead-123',
  sessionId: 'sess-456',
  channel: 'paid_search',
  source: 'google',
  medium: 'cpc',
  campaign: 'home-insurance-q4',
  term: 'home insurance quotes',
  referralCode: 'PARTNER001',
  partnerId: 'partner-abc',
});
```

### 2. Creating a Conversion

```typescript
// Record a conversion
const conversion = await attributionService.createConversion({
  leadId: 'lead-123',
  type: 'policy_bound',
  value: 1500.00,
  currency: 'USD',
  policyId: 'policy-789',
  policyNumber: 'POL-2024-001',
  commissionRate: 0.10,
});
```

### 3. Calculating Attribution

```typescript
// Calculate attribution for a lead
const calculation = await attributionService.calculateAttribution({
  leadId: 'lead-123',
  model: 'position_based',
  conversionValue: 1500.00,
  commissionRate: 0.10,
});

// Result:
// {
//   leadId: 'lead-123',
//   conversionValue: 1500,
//   attributions: [
//     { touchpointId: 'tp-1', channel: 'paid_search', percentage: 40, revenue: 600 },
//     { touchpointId: 'tp-2', channel: 'email', percentage: 20, revenue: 300 },
//     { touchpointId: 'tp-3', channel: 'direct', percentage: 40, revenue: 600 }
//   ],
//   calculatedAt: 2024-01-15T10:30:00Z
// }
```

### 4. Generating Reports

```typescript
// Generate attribution report
const report = await attributionService.generateAttributionReport({
  startDate: new Date('2024-01-01'),
  endDate: new Date('2024-01-31'),
  model: 'position_based',
  channel: 'paid_search',
});

// Report includes:
// - Summary statistics
// - Channel performance breakdown
// - Partner attribution summary
// - Broker attribution summary
// - Campaign performance
// - Trend analysis
```

### 5. Handling Disputes

```typescript
// Create an attribution dispute
const dispute = await attributionService.createDispute({
  attributionId: 'attr-123',
  disputeType: 'partner',
  reason: 'Incorrect channel attribution',
  evidence: {
    originalSource: 'partner_referral',
    attributedChannel: 'direct',
    timestamps: [...],
  },
});

// Resolve dispute
await attributionService.resolveDispute(dispute.id, {
  status: 'resolved',
  resolution: 'Adjusted attribution to correct channel',
  resolvedBy: 'admin-user',
});
```

## 📈 Analytics & Insights

### Channel Performance
```typescript
interface ChannelAttributionSummary {
  channel: TouchpointType;
  totalTouchpoints: number;
  convertingTouchpoints: number;
  conversionRate: number;
  totalRevenue: number;
  attributionPercentage: number;
}
```

### Partner Attribution
```typescript
interface PartnerAttributionSummary {
  partnerId: string;
  partnerName: string;
  totalTouchpoints: number;
  conversions: number;
  totalRevenue: number;
  totalCommission: number;
  topChannels: Array<{
    channel: TouchpointType;
    count: number;
    revenue: number;
  }>;
}
```

### Trend Analysis
```typescript
interface AttributionTrend {
  date: string;
  conversions: number;
  revenue: number;
  commission: number;
}
```

## 🔒 Security & Compliance

### Data Privacy
- PII protection for customer touchpoints
- GDPR/CCPA compliance for data retention
- Secure handling of partner/broker information

### Access Control
- Role-based access to attribution data
- Partner/Broker isolation for sensitive data
- Audit logging for all attribution changes

## 📊 Performance Metrics

| Metric | Target | Description |
|--------|--------|-------------|
| Attribution Calculation Time | < 100ms | Per lead calculation |
| Report Generation Time | < 5s | For 30-day report |
| Touchpoint Ingestion Rate | 1000/sec | Peak throughput |
| Data Retention | 24 months | Historical data |

## 🧪 Testing Strategy

### Unit Tests
- Attribution model calculations
- Weight distribution accuracy
- Commission calculations

### Integration Tests
- Touchpoint → Conversion → Attribution flow
- API endpoint responses
- Database operations

### E2E Tests
- Complete attribution workflow
- Report generation and accuracy
- Dispute resolution process

## 🚀 Deployment Considerations

### Database Migrations
```bash
# Generate migration
npx prisma generate

# Apply migrations
npx prisma migrate deploy

# Push schema changes
npx prisma db push
```

### Scaling
- Read replicas for analytics queries
- Caching for frequently accessed attributions
- Batch processing for large datasets

### Monitoring
- Attribution calculation latency
- Touchpoint ingestion rate
- Dispute resolution time

## 📝 Files Created/Modified

### New Files
- `packages/types/src/attribution.ts` - TypeScript type definitions
- `apps/data-service/src/services/attribution.service.ts` - Attribution service
- `apps/data-service/src/routes/attribution.routes.ts` - API routes
- `apps/api/src/routes/attribution.ts` - API proxy routes
- `docs/PHASE_12.4.md` - This documentation

### Modified Files
- `packages/types/src/index.ts` - Export attribution types
- `prisma/schema.prisma` - Add attribution models
- `apps/data-service/src/index.ts` - Register attribution routes
- `apps/api/src/app.ts` - Register API routes

## ✅ Acceptance Criteria

- [x] Touchpoint tracking for all channels
- [x] Multi-touch attribution with 6 models
- [x] Partner & Broker attribution tracking
- [x] Conversion tracking with commission
- [x] Comprehensive reporting & analytics
- [x] Attribution dispute resolution
- [x] API endpoints for all operations
- [x] TypeScript types for all entities
- [x] Database schema with indexes
- [x] Documentation complete

## 🎯 Business Value

1. **Marketing ROI**: Understand which channels drive the most value
2. **Partner Compensation**: Accurate commission tracking for partners
3. **Broker Attribution**: Proper credit for broker-sourced leads
4. **Budget Optimization**: Data-driven marketing budget allocation
5. **Channel Performance**: Identify best-performing channels
6. **Conversion Insights**: Understand customer journey patterns

## 📅 Timeline

| Week | Deliverable |
|------|-------------|
| Week 1 | Schema, Types, Service Foundation |
| Week 2 | Attribution Calculation Engine |
| Week 3 | API Routes & Integration |
| Week 4 | Reporting & Analytics |
| Week 5 | Testing & Documentation |

---

**Phase 12.4 Attribution System** enables accurate tracking and credit allocation for all customer interactions, providing the foundation for data-driven marketing decisions and fair partner/broker compensation.
