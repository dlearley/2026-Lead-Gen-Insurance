# Carrier Service

The Carrier Service provides comprehensive management of insurance carrier relationships and performance tracking.

## Overview

This service handles:
- **Carrier Management**: CRUD operations for insurance carriers
- **Performance Tracking**: Monthly performance metrics and scoring
- **Partnership Management**: Tier and status management
- **Performance Analysis**: Top performers, attention needed, trends

## Features

### Carrier Management
- Create, read, update, and delete carrier records
- Comprehensive carrier information storage
- Partnership tier and status tracking
- Contract management with renewal alerts

### Performance Tracking
- Monthly performance metrics recording
- Conversion rate tracking
- Response time monitoring
- Customer satisfaction scoring
- On-time delivery tracking

### Performance Analysis
- Automated performance score calculation
- Top performer identification
- Underperforming carrier alerts
- Historical trend analysis
- Carrier comparison reports

## Usage

### Basic Carrier Operations

```typescript
import { CarrierService } from './services/carrier-service.js';
import { CarrierRepository } from './repositories/carrier.repository.js';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const carrierRepository = new CarrierRepository(prisma);
const carrierService = new CarrierService(carrierRepository);

// Create a new carrier
const newCarrier = await carrierService.createCarrier({
  name: 'Acme Insurance',
  description: 'National insurance provider',
  website: 'https://acme-insurance.com',
  contactEmail: 'partners@acme-insurance.com',
  contactPhone: '+1-555-123-4567',
  address: '123 Insurance Way',
  city: 'New York',
  state: 'NY',
  zipCode: '10001',
  country: 'US',
  partnershipTier: 'PREMIUM',
  partnershipStatus: 'ACTIVE',
  contractStartDate: new Date('2025-01-01'),
  contractEndDate: new Date('2025-12-31'),
  commissionRate: 15.5,
  isActive: true,
  integrationEnabled: true,
  apiEndpoint: 'https://api.acme-insurance.com/v1',
  apiKey: 'secure-api-key',
});

// Get a carrier by ID
const carrier = await carrierService.getCarrierById(newCarrier.id);

// Update a carrier
const updatedCarrier = await carrierService.updateCarrier(newCarrier.id, {
  partnershipTier: 'ELITE',
  commissionRate: 18.0,
});

// Get all carriers
const allCarriers = await carrierService.getAllCarriers({
  partnershipStatus: 'ACTIVE',
  isActive: true,
});
```

### Performance Tracking

```typescript
// Record monthly performance metrics
const performanceMetric = await carrierService.createPerformanceMetric({
  carrierId: newCarrier.id,
  month: 1,
  year: 2025,
  leadsReceived: 150,
  leadsConverted: 45,
  conversionRate: 30.0,
  averageResponseTime: 2.5, // hours
  averageQuoteValue: 1250.0, // dollars
  customerSatisfaction: 85.0, // percentage
  onTimeDeliveryRate: 95.0, // percentage
});

// Get performance metrics for a carrier
const metrics = await carrierService.getPerformanceMetrics(newCarrier.id);

// Calculate performance score (automatically updates carrier)
const score = await carrierService.calculatePerformanceScore(newCarrier.id);
console.log(`Performance score: ${score}`);
```

### Performance Analysis

```typescript
// Get top performing carriers
const topCarriers = await carrierService.getTopPerformingCarriers(5);
console.log('Top 5 carriers:', topCarriers.map(c => `${c.name} (${c.performanceScore})`));

// Get carriers needing attention
const attentionCarriers = await carrierService.getCarriersNeedingAttention();
console.log('Carriers needing attention:', attentionCarriers.map(c => c.name));

// Get performance trends
const trends = await carrierService.getCarrierPerformanceTrends(newCarrier.id, 6);
console.log('6-month trends:', trends);

// Compare multiple carriers
const comparison = await carrierService.getCarrierComparisonReport([
  'carrier-1',
  'carrier-2',
  'carrier-3',
]);
console.log('Carrier comparison:', comparison);
```

### Partnership Management

```typescript
// Update partnership tier
const updatedTierCarrier = await carrierService.updateCarrierPartnershipTier(
  newCarrier.id,
  'ELITE'
);

// Update partnership status
const updatedStatusCarrier = await carrierService.updateCarrierPartnershipStatus(
  newCarrier.id,
  'RENEWAL_NEEDED'
);

// Update conversion metrics
const updatedMetricsCarrier = await carrierService.updateConversionMetrics(
  newCarrier.id,
  50, // new leads received
  15  // new leads converted
);
```

## Performance Score Calculation

The performance score is calculated using a weighted algorithm:

```
Performance Score = (
  (Conversion Rate / 100) * 40% +
  (1 - Response Time / 24) * 20% +
  (Customer Satisfaction / 100) * 20% +
  (On-Time Delivery / 100) * 20%
) * 100
```

### Weight Factors
- **Conversion Rate (40%)**: Most important factor
- **Response Time (20%)**: Speed of service (normalized to 24-hour max)
- **Customer Satisfaction (20%)**: Quality of service
- **On-Time Delivery (20%)**: Reliability

### Example Calculation

For a carrier with:
- Conversion Rate: 40%
- Response Time: 2 hours
- Customer Satisfaction: 90%
- On-Time Delivery: 95%

```
= (0.40 * 0.40) + ((1 - 2/24) * 0.20) + (0.90 * 0.20) + (0.95 * 0.20)
= (0.16) + (0.1833) + (0.18) + (0.19)
= 0.7133 * 100
= 71.33
```

## API Integration

The service integrates with the following API endpoints:

### REST API
- `POST /api/v1/carriers` - Create carrier
- `GET /api/v1/carriers` - List carriers
- `GET /api/v1/carriers/:id` - Get carrier
- `PUT /api/v1/carriers/:id` - Update carrier
- `DELETE /api/v1/carriers/:id` - Delete carrier

### Performance Endpoints
- `POST /api/v1/carriers/:id/performance` - Record performance
- `GET /api/v1/carriers/:id/performance/metrics` - Get performance metrics
- `POST /api/v1/carriers/:id/performance/calculate` - Calculate score

### Analysis Endpoints
- `GET /api/v1/carriers/top-performing` - Top performers
- `GET /api/v1/carriers/needing-attention` - Attention needed
- `GET /api/v1/carriers/:id/performance/trends` - Performance trends
- `POST /api/v1/carriers/compare` - Compare carriers

## Error Handling

The service handles errors gracefully:

```typescript
try {
  const carrier = await carrierService.getCarrierById('non-existent-id');
  if (!carrier) {
    console.log('Carrier not found');
  }
} catch (error) {
  console.error('Failed to get carrier:', error);
}
```

## Testing

Comprehensive tests are provided:
- Unit tests for repository methods
- Unit tests for service methods
- Integration tests for API routes

Run tests with:

```bash
npm test
```

## Performance Considerations

- **Database Indexes**: Proper indexing on frequently queried fields
- **Query Optimization**: Efficient database queries with proper filtering
- **Caching**: Consider caching for frequently accessed data
- **Batch Operations**: Support for bulk operations where appropriate

## Future Enhancements

- **Automated Tier Management**: AI-driven tier recommendations
- **Contract Management**: Digital contract signing and storage
- **Integration Testing**: Automated carrier API testing
- **Performance Alerts**: Real-time performance monitoring
- **Carrier Portal**: Self-service portal for carriers

## Dependencies

- `@prisma/client`: Database client
- `@insurance-lead-gen/core`: Core utilities and logging
- `@insurance-lead-gen/types`: Type definitions

## Configuration

No special configuration required. Uses standard Prisma and database setup.