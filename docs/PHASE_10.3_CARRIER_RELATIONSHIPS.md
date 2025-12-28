# Phase 10.3: Carrier Relationships - Strengthen Partnerships

## Overview

Phase 10.3 implements a comprehensive carrier relationship management system for the Insurance Lead Generation AI Platform. This phase introduces features to track, manage, and strengthen partnerships with insurance carriers, providing performance insights and partnership management capabilities.

## Implementation Date

January 2025

## Features Implemented

### 1. Carrier Management System

#### Carrier Information
- **Basic Information**: Name, description, contact details, address
- **Partnership Details**: Tier, status, contract dates, commission rates
- **Integration Capabilities**: API endpoints, keys, integration status
- **Performance Metrics**: Conversion rates, response times, satisfaction scores

#### Carrier Tiers
- **BASIC**: Entry-level partnership
- **STANDARD**: Standard partnership with basic benefits
- **PREMIUM**: Enhanced partnership with additional benefits
- **ELITE**: High-value partnership with premium benefits
- **STRATEGIC**: Strategic alliance with maximum benefits

#### Partnership Statuses
- **ACTIVE**: Currently active partnership
- **PENDING**: Partnership awaiting activation
- **SUSPENDED**: Temporarily suspended partnership
- **TERMINATED**: Ended partnership
- **RENEWAL_NEEDED**: Partnership requiring renewal

### 2. Performance Tracking System

#### Performance Metrics
- **Leads Received**: Total leads sent to carrier
- **Leads Converted**: Total leads converted by carrier
- **Conversion Rate**: Percentage of leads converted
- **Average Response Time**: Time taken to respond to leads
- **Average Quote Value**: Average value of quotes provided
- **Customer Satisfaction**: Customer satisfaction scores
- **On-Time Delivery Rate**: Percentage of on-time deliveries

#### Performance Score Calculation
- **Weighted Algorithm**: Combines multiple metrics into a single score
- **Conversion Rate (40%)**: Most important factor
- **Response Time (20%)**: Speed of service
- **Customer Satisfaction (20%)**: Quality of service
- **On-Time Delivery (20%)**: Reliability

### 3. Partnership Management Features

#### Tier Management
- **Automatic Tier Updates**: Based on performance metrics
- **Manual Tier Adjustments**: Admin-controlled tier changes
- **Tier Benefits**: Different benefits per tier level

#### Status Management
- **Contract Monitoring**: Track contract expiration dates
- **Renewal Alerts**: Notifications for upcoming renewals
- **Status Transitions**: Manage partnership lifecycle

#### Performance Insights
- **Top Performers**: Identify best-performing carriers
- **Attention Needed**: Flag underperforming carriers
- **Trend Analysis**: Historical performance trends
- **Comparison Reports**: Compare multiple carriers

## API Endpoints

### Carrier Management Endpoints

#### Create Carrier
```
POST /api/v1/carriers
```

**Request Body:**
```json
{
  "name": "Acme Insurance",
  "description": "National insurance provider",
  "website": "https://acme-insurance.com",
  "contactEmail": "partners@acme-insurance.com",
  "contactPhone": "+1-555-123-4567",
  "address": "123 Insurance Way",
  "city": "New York",
  "state": "NY",
  "zipCode": "10001",
  "country": "US",
  "partnershipTier": "PREMIUM",
  "partnershipStatus": "ACTIVE",
  "contractStartDate": "2025-01-01T00:00:00Z",
  "contractEndDate": "2025-12-31T23:59:59Z",
  "commissionRate": 15.5,
  "isActive": true,
  "integrationEnabled": true,
  "apiEndpoint": "https://api.acme-insurance.com/v1",
  "apiKey": "secure-api-key-123"
}
```

#### Get All Carriers
```
GET /api/v1/carriers
```

**Query Parameters:**
- `name`: Filter by carrier name
- `partnershipStatus`: Filter by status (ACTIVE, PENDING, etc.)
- `partnershipTier`: Filter by tier (BASIC, STANDARD, etc.)
- `isActive`: Filter by active status
- `integrationEnabled`: Filter by integration status
- `search`: Search across multiple fields

#### Get Carrier by ID
```
GET /api/v1/carriers/:id
```

#### Get Carrier with Performance
```
GET /api/v1/carriers/:id/performance
```

#### Update Carrier
```
PUT /api/v1/carriers/:id
```

**Request Body:**
```json
{
  "name": "Updated Carrier Name",
  "partnershipTier": "ELITE",
  "commissionRate": 18.0
}
```

#### Delete Carrier
```
DELETE /api/v1/carriers/:id
```

### Performance Metrics Endpoints

#### Create Performance Metric
```
POST /api/v1/carriers/:id/performance
```

**Request Body:**
```json
{
  "month": 1,
  "year": 2025,
  "leadsReceived": 150,
  "leadsConverted": 45,
  "conversionRate": 30.0,
  "averageResponseTime": 2.5,
  "averageQuoteValue": 1250.0,
  "customerSatisfaction": 85.0,
  "onTimeDeliveryRate": 95.0
}
```

#### Get Performance Metrics
```
GET /api/v1/carriers/:id/performance/metrics
```

**Query Parameters:**
- `year`: Filter by year
- `month`: Filter by month

#### Update Performance Metric
```
PUT /api/v1/carriers/:id/performance/metrics/:metricId
```

**Request Body:**
```json
{
  "leadsConverted": 50,
  "conversionRate": 33.3
}
```

#### Calculate Performance Score
```
POST /api/v1/carriers/:id/performance/calculate
```

**Response:**
```json
{
  "carrierId": "carrier-123",
  "performanceScore": 87.5
}
```

### Partnership Management Endpoints

#### Get Top Performing Carriers
```
GET /api/v1/carriers/top-performing
```

**Query Parameters:**
- `limit`: Number of carriers to return (default: 5)

#### Get Carriers Needing Attention
```
GET /api/v1/carriers/needing-attention
```

#### Update Partnership Tier
```
PUT /api/v1/carriers/:id/partnership-tier
```

**Request Body:**
```json
{
  "tier": "ELITE"
}
```

#### Update Partnership Status
```
PUT /api/v1/carriers/:id/partnership-status
```

**Request Body:**
```json
{
  "status": "RENEWAL_NEEDED"
}
```

#### Get Performance Trends
```
GET /api/v1/carriers/:id/performance/trends
```

**Query Parameters:**
- `months`: Number of months to include (default: 6)

#### Get Carrier Comparison Report
```
POST /api/v1/carriers/compare
```

**Request Body:**
```json
{
  "carrierIds": ["carrier-123", "carrier-456", "carrier-789"]
}
```

## File Structure

### New Files Created

```
packages/types/src/
└── index.ts                          # Added carrier type definitions

apps/data-service/src/
├── repositories/
│   └── carrier.repository.ts        # Carrier data access layer
├── services/
│   └── carrier-service.ts           # Carrier business logic
├── routes/
│   └── carriers.routes.ts           # Carrier API routes
└── prisma/schema.prisma             # Added Carrier and CarrierPerformanceMetric models

apps/api/src/routes/
└── carriers.ts                      # Carrier API proxy routes

docs/
└── PHASE_10.3_CARRIER_RELATIONSHIPS.md # Documentation
```

### Modified Files

```
packages/types/src/
└── index.ts                          # Added carrier type exports

apps/data-service/
├── src/index.ts                      # Integrated carrier routes
└── package.json                      # Added dependencies

apps/api/src/
├── app.ts                            # Added carrier routes
└── package.json                      # Added http-proxy-middleware dependency

prisma/schema.prisma                 # Added carrier models and enums
```

## Database Models

### Carrier Model
```prisma
model Carrier {
  id                  String
  name                String
  description         String?
  website             String?
  contactEmail        String
  contactPhone        String
  address             String?
  city                String?
  state               String?
  zipCode             String?
  country             String?
  partnershipTier     PartnershipTier
  partnershipStatus   PartnershipStatus
  contractStartDate   DateTime
  contractEndDate     DateTime?
  commissionRate      Float
  isActive            Boolean
  integrationEnabled  Boolean
  apiEndpoint         String?
  apiKey              String?
  performanceScore    Float
  conversionRate      Float
  averageResponseTime Float
  totalLeadsReceived  Int
  totalLeadsConverted Int
  createdAt           DateTime
  updatedAt           DateTime

  performanceMetrics CarrierPerformanceMetric[]
}
```

### CarrierPerformanceMetric Model
```prisma
model CarrierPerformanceMetric {
  id                    String
  carrierId             String
  month                 Int
  year                  Int
  leadsReceived         Int
  leadsConverted        Int
  conversionRate        Float
  averageResponseTime   Float
  averageQuoteValue     Float
  customerSatisfaction  Float
  onTimeDeliveryRate    Float
  createdAt             DateTime

  carrier               Carrier
}
```

### Enums
```prisma
enum PartnershipTier {
  BASIC
  STANDARD
  PREMIUM
  ELITE
  STRATEGIC
}

enum PartnershipStatus {
  ACTIVE
  PENDING
  SUSPENDED
  TERMINATED
  RENEWAL_NEEDED
}
```

## Type Definitions

### Partnership Types
```typescript
export type PartnershipTier = 'basic' | 'standard' | 'premium' | 'elite' | 'strategic';
export type PartnershipStatus = 'active' | 'pending' | 'suspended' | 'terminated' | 'renewal_needed';
```

### Carrier Interface
```typescript
export interface Carrier {
  id: string;
  name: string;
  description?: string;
  website?: string;
  contactEmail: string;
  contactPhone: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  country?: string;
  partnershipTier: PartnershipTier;
  partnershipStatus: PartnershipStatus;
  contractStartDate: Date;
  contractEndDate?: Date;
  commissionRate: number;
  isActive: boolean;
  integrationEnabled: boolean;
  apiEndpoint?: string;
  apiKey?: string;
  performanceScore: number;
  conversionRate: number;
  averageResponseTime: number;
  totalLeadsReceived: number;
  totalLeadsConverted: number;
  createdAt: Date;
  updatedAt: Date;
}
```

## Usage Examples

### Create a New Carrier

```typescript
const carrierData = {
  name: "Global Insurance Corp",
  description: "International insurance provider",
  contactEmail: "contact@global-insurance.com",
  contactPhone: "+1-800-555-1234",
  partnershipTier: "STRATEGIC",
  contractStartDate: new Date('2025-01-01'),
  contractEndDate: new Date('2026-12-31'),
  commissionRate: 20.0,
  integrationEnabled: true,
  apiEndpoint: "https://api.global-insurance.com/v2"
};

const response = await fetch('/api/v1/carriers', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(carrierData)
});

const carrier = await response.json();
console.log('Created carrier:', carrier.id);
```

### Record Performance Metrics

```typescript
const performanceData = {
  month: 1,
  year: 2025,
  leadsReceived: 200,
  leadsConverted: 80,
  conversionRate: 40.0,
  averageResponseTime: 1.8,
  averageQuoteValue: 1500.0,
  customerSatisfaction: 92.0,
  onTimeDeliveryRate: 98.0
};

const response = await fetch('/api/v1/carriers/carrier-123/performance', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(performanceData)
});

const metric = await response.json();
console.log('Performance metric recorded:', metric.id);
```

### Calculate Performance Score

```typescript
const response = await fetch('/api/v1/carriers/carrier-123/performance/calculate', {
  method: 'POST'
});

const { performanceScore } = await response.json();
console.log('Performance score:', performanceScore);
```

### Get Top Performing Carriers

```typescript
const response = await fetch('/api/v1/carriers/top-performing?limit=10');
const topCarriers = await response.json();

console.log('Top 10 carriers:');
topCarriers.forEach((carrier, index) => {
  console.log(`${index + 1}. ${carrier.name} - Score: ${carrier.performanceScore}`);
});
```

### Get Carriers Needing Attention

```typescript
const response = await fetch('/api/v1/carriers/needing-attention');
const carriers = await response.json();

console.log('Carriers needing attention:');
carriers.forEach(carrier => {
  console.log(`${carrier.name} - Status: ${carrier.partnershipStatus}`);
  if (carrier.contractEndDate) {
    const daysLeft = Math.ceil((carrier.contractEndDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
    console.log(`  Contract expires in ${daysLeft} days`);
  }
});
```

### Update Partnership Tier

```typescript
const response = await fetch('/api/v1/carriers/carrier-123/partnership-tier', {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ tier: 'ELITE' })
});

const updatedCarrier = await response.json();
console.log('Updated partnership tier:', updatedCarrier.partnershipTier);
```

### Get Performance Trends

```typescript
const response = await fetch('/api/v1/carriers/carrier-123/performance/trends?months=12');
const trends = await response.json();

console.log('12-month performance trends:');
trends.forEach(metric => {
  console.log(`${metric.year}-${metric.month.toString().padStart(2, '0')}: ` +
              `Conversion: ${metric.conversionRate}%, ` +
              `Response: ${metric.averageResponseTime}h`);
});
```

### Compare Multiple Carriers

```typescript
const response = await fetch('/api/v1/carriers/compare', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    carrierIds: ['carrier-123', 'carrier-456', 'carrier-789']
  })
});

const comparison = await response.json();
console.log('Carrier comparison:');
comparison.forEach(carrier => {
  console.log(`${carrier.name}: Score=${carrier.performanceScore}, ` +
              `Conversion=${carrier.conversionRate}%, ` +
              `Tier=${carrier.partnershipTier}`);
});
```

## Configuration

### Environment Variables

No new environment variables required. Uses existing configuration from `@insurance-lead-gen/config`.

### Database Migration

Run the following command to apply database migrations:

```bash
npx prisma migrate dev --name add_carrier_models
```

## Monitoring Metrics

### Carrier Metrics
- Number of active carriers
- Carriers by partnership tier
- Average performance score
- Conversion rate trends
- Response time trends

### Performance Metrics
- Top-performing carriers
- Underperforming carriers
- Contract renewal alerts
- Integration success rates

## Performance Considerations

### Database Performance
- Indexes on frequently queried fields (name, status, tier)
- Efficient queries with proper filtering
- Pagination for large result sets

### API Performance
- Asynchronous performance calculations
- Caching for frequently accessed data
- Optimized database queries

### Scalability
- Designed to handle hundreds of carriers
- Performance metrics stored efficiently
- Historical data retention policies

## Future Enhancements

### Phase 10.4 Potential Features
1. **Automated Tier Management**: AI-driven tier recommendations
2. **Contract Management**: Digital contract signing and storage
3. **Integration Testing**: Automated carrier API testing
4. **Performance Alerts**: Real-time performance monitoring
5. **Carrier Portal**: Self-service portal for carriers
6. **Commission Tracking**: Detailed commission calculations
7. **Lead Distribution**: Intelligent lead routing to carriers
8. **Performance Benchmarking**: Industry comparison metrics

## Testing

### Manual Testing

1. **Create Carrier**
```bash
curl -X POST http://localhost:3000/api/v1/carriers \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Insurance",
    "contactEmail": "test@insurance.com",
    "contactPhone": "+1-555-123-4567",
    "contractStartDate": "2025-01-01T00:00:00Z",
    "partnershipTier": "STANDARD"
  }'
```

2. **Get All Carriers**
```bash
curl http://localhost:3000/api/v1/carriers
```

3. **Record Performance**
```bash
curl -X POST http://localhost:3000/api/v1/carriers/carrier-123/performance \
  -H "Content-Type: application/json" \
  -d '{
    "month": 1,
    "year": 2025,
    "leadsReceived": 100,
    "leadsConverted": 30,
    "conversionRate": 30.0,
    "averageResponseTime": 3.5
  }'
```

4. **Calculate Performance Score**
```bash
curl -X POST http://localhost:3000/api/v1/carriers/carrier-123/performance/calculate
```

5. **Get Top Performers**
```bash
curl http://localhost:3000/api/v1/carriers/top-performing
```

## Dependencies

### New Dependencies Added

**apps/api:**
- `http-proxy-middleware`: ^2.0.6 - HTTP proxy middleware for API routing

## Rollout Plan

1. **Development Testing**: Test all endpoints in development environment
2. **Staging Deployment**: Deploy to staging for integration testing
3. **Data Migration**: Migrate existing carrier data if applicable
4. **User Acceptance**: Allow key users to test carrier management features
5. **Production Rollout**: Gradual rollout with monitoring
6. **Documentation**: Share user guides and API documentation

## Success Metrics

- Carrier management adoption rate > 80%
- Performance tracking completeness > 95%
- Average performance score calculation time < 2 seconds
- Carrier comparison report generation time < 1 second
- User satisfaction with partnership management features > 90%

## Conclusion

Phase 10.3 successfully implements a comprehensive carrier relationship management system that enables the Insurance Lead Generation AI Platform to:

1. **Track Carrier Performance**: Monitor key performance metrics over time
2. **Manage Partnerships**: Maintain and update partnership details
3. **Strengthen Relationships**: Identify top performers and areas for improvement
4. **Make Data-Driven Decisions**: Use performance insights to optimize partnerships
5. **Automate Processes**: Streamline carrier management workflows

This system provides the foundation for building strong, data-driven partnerships with insurance carriers, ultimately improving lead conversion rates and business performance.