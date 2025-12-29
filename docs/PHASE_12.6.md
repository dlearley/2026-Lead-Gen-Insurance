# Phase 12.6: Marketplace Ecosystem Revenue

## Overview

Phase 12.6 implements a comprehensive ecosystem revenue tracking system for the insurance marketplace. This system enables the platform to track and manage various revenue streams, including platform fees, subscription revenue, and referral commissions.

## Features Implemented

### 1. Ecosystem Revenue Tracking
- **Revenue Types**:
  - `PLATFORM_FEE`: Commission taken from lead sales/transactions.
  - `SUBSCRIPTION`: Recurring revenue from brokers for premium features.
  - `SERVICE_FEE`: One-time fees for special marketplace services.
  - `REFERRAL_COMMISSION`: Revenue shared through the referral program.
  - `MARKET_ACCESS_FEE`: Fees for accessing specific high-value markets.
- **Revenue Lifecycle**: Tracks revenue from `PENDING` to `COMPLETED`, `FAILED`, or `REFUNDED`.
- **Source Tracking**: Links revenue to the specific source entity (Lead, Broker, Carrier, etc.).

### 2. Revenue Management Service
- **Record Revenue**: Service to record new revenue entries with metadata.
- **Status Management**: Update revenue status as payments are processed.
- **Auto-fee Generation**: Automated calculation and recording of platform fees based on transaction amounts.

### 3. Analytics & Metrics
- **Ecosystem Metrics**: Comprehensive view of platform revenue over time.
- **Revenue Breakdown**: View revenue by type and status.
- **Growth Analysis**: Track revenue growth rates across different periods.

## Database Schema

### New Model: EcosystemRevenue

```prisma
model EcosystemRevenue {
  id              String         @id @default(uuid())
  type            RevenueType
  amount          Float
  currency        String         @default("USD")
  status          RevenueStatus  @default(PENDING)
  sourceId        String
  sourceType      String
  brokerId        String?
  carrierId       String?
  metadata        Json?
  processedAt     DateTime?
  createdAt       DateTime       @default(now())
  updatedAt       DateTime       @updatedAt

  @@index([type])
  @@index([status])
  @@index([sourceId])
  @@index([brokerId])
  @@index([carrierId])
  @@index([createdAt])
  @@map("ecosystem_revenue")
}
```

## API Endpoints

### Revenue Management (`/api/v1/marketplace/revenue`)
- `GET /`: List all revenue entries with filtering (type, status, broker, etc.).
- `GET /:id`: Get detailed information for a specific revenue entry.
- `POST /`: Manually record a revenue entry.
- `PATCH /:id/status`: Update the status of a revenue entry.

### Metrics (`/api/v1/marketplace/metrics`)
- `GET /`: Get overall ecosystem revenue metrics and growth analysis.

### Fees (`/api/v1/marketplace/fees`)
- `POST /generate`: Trigger automated platform fee generation for a transaction.

## Technical Implementation

### Files Created
1. `packages/types/src/marketplace.ts`: Type definitions and Zod schemas.
2. `apps/data-service/src/repositories/ecosystem-revenue.repository.ts`: Data access layer.
3. `apps/data-service/src/services/marketplace.service.ts`: Business logic service.
4. `apps/data-service/src/routes/marketplace.routes.ts`: Data service API routes.
5. `apps/api/src/routes/marketplace.ts`: API Gateway proxy routes.

### Files Modified
1. `packages/types/src/index.ts`: Exported new marketplace types.
2. `apps/data-service/prisma/schema.prisma`: Added `EcosystemRevenue` model and enums.
3. `apps/data-service/src/index.ts`: Registered marketplace service and routes.
4. `apps/api/src/app.ts`: Registered marketplace API routes.

## Future Enhancements
- Automated billing integration (Stripe/PayPal).
- Dynamic fee calculation based on broker tiers.
- Revenue sharing dashboards for Diamond-tier brokers.
- Predictive revenue forecasting using BI service.
