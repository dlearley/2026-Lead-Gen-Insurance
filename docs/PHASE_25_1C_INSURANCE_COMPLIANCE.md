# Phase 25.1C: Insurance-Specific Compliance

## Overview
This phase implements comprehensive insurance industry-specific compliance features, including license verification, carrier appointments, fair lending (ECOA/FHA), product regulations, and state-specific insurance rules.

## Key Components

### 1. Insurance License Management
Handles verification of agent licenses with external registries like NIPR and state boards.
- **Service**: `InsuranceLicenseService`
- **Models**: `InsuranceLicense`, `AgentComplianceRecord`

### 2. Carrier Appointment Management
Tracks and validates that agents are properly appointed by insurance carriers to sell specific products.
- **Service**: `CarrierAppointmentService`
- **Model**: `CarrierAppointment`

### 3. Product Compliance
Enforces product-specific rules (e.g., minimum premiums, state-specific requirements) during the quoting process.
- **Service**: `ProductComplianceService`
- **Model**: `InsuranceProductRule`

### 4. Fair Lending Compliance
Implements monitoring for ECOA and FHA compliance, including disparate impact testing using the 80% rule.
- **Service**: `FairLendingService`, `DisparateImpactService`
- **Models**: `FairLendingRule`, `DisparateImpactMonitor`

### 5. Disclosure Management
Tracks delivery and acknowledgment of required disclosures (Privacy, CCPA, etc.) by state and product.
- **Service**: `DisclosureService`
- **Models**: `RequiredDisclosure`, `DisclosureDelivery`

### 6. Underwriting Compliance
Validates underwriting decisions against established rules and maintains an audit trail.
- **Service**: `UnderwritingComplianceService`
- **Model**: `UnderwritingRule`

## API Routes
All compliance routes are available under `/api/v1/compliance/`.

### License Management
- `GET /api/v1/compliance/licenses`
- `POST /api/v1/compliance/licenses`
- `GET /api/v1/compliance/licenses/:agentId/verify`

### Product Rules
- `GET /api/v1/compliance/products/rules`
- `POST /api/v1/compliance/quotes/validate`

### Fair Lending
- `POST /api/v1/compliance/fair-lending/check`
- `GET /api/v1/compliance/fair-lending/metrics`

### Disclosures
- `GET /api/v1/compliance/disclosures/:state/:product`
- `POST /api/v1/compliance/disclosures/deliver`
- `PUT /api/v1/compliance/disclosures/:leadId/acknowledge`

## Scheduled Jobs
- **Daily**: License and appointment expiration checks.
- **Monthly**: Disparate impact analysis and reporting.

## Setup & Seeding
To seed the compliance regulations:
```bash
npx ts-node scripts/seed-insurance-regulations.ts
```

## Testing
Unit tests are located in `apps/api/src/services/__tests__/`.
Integration tests are located in `apps/api/src/routes/__tests__/`.
