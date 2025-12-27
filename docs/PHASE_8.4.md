# Phase 8.4: Policy Lifecycle & Administration

This phase adds a **Policy** domain to the platform so that a converted lead can be administered through an insurance policy lifecycle.

## What’s included

### New shared Types
Added to `@insurance-lead-gen/types`:

- `Policy`
- `PolicyStatus`
- `PolicyBillingFrequency`
- `PolicyEndorsement`
- `PolicyInvoice`
- `PolicyInvoiceStatus`
- `MoneyAmount`

### In-memory storage
`apps/api/src/storage/in-memory.ts` now includes:

- `store.policies: Map<string, Policy>`
- `resetStore()` helper for tests

### API Endpoints
Policies are scoped under a lead:

Base path:

- `/api/v1/leads/:leadId/policies`

#### Create policy
`POST /api/v1/leads/:leadId/policies`

Creates a draft policy.

Request body:

```json
{
  "insuranceType": "AUTO",
  "carrier": "Acme Insurance",
  "productName": "Acme Auto",
  "effectiveDate": "2025-01-01T00:00:00.000Z",
  "expirationDate": "2026-01-01T00:00:00.000Z",
  "premium": { "amount": 1200, "currency": "USD" },
  "billingFrequency": "MONTHLY",
  "coverage": { "liability": 100000 }
}
```

#### List policies
`GET /api/v1/leads/:leadId/policies`

Query params:

- `status` (optional): `DRAFT | PENDING_PAYMENT | ACTIVE | CANCELLED | LAPSED | EXPIRED | NON_RENEWED`
- `page` (default: 1)
- `limit` (default: 20)

#### Get policy
`GET /api/v1/leads/:leadId/policies/:policyId`

#### Update policy
`PUT /api/v1/leads/:leadId/policies/:policyId`

#### Activate policy
`POST /api/v1/leads/:leadId/policies/:policyId/activate`

- Sets policy status to `active`
- Updates the lead status to `converted` (if not already)

#### Cancel policy
`POST /api/v1/leads/:leadId/policies/:policyId/cancel`

#### Endorsements

- `GET /api/v1/leads/:leadId/policies/:policyId/endorsements`
- `POST /api/v1/leads/:leadId/policies/:policyId/endorsements`

#### Billing / invoices

- `GET /api/v1/leads/:leadId/policies/:policyId/invoices`
- `POST /api/v1/leads/:leadId/policies/:policyId/invoices`
- `POST /api/v1/leads/:leadId/policies/:policyId/invoices/:invoiceId/pay`

#### Renewal
`POST /api/v1/leads/:leadId/policies/:policyId/renew`

Creates a new draft policy linked via `renewalOfPolicyId` and updates the source policy’s `renewedToPolicyId`.

## Notes

- The implementation is currently **in-memory** (consistent with other API modules in this repo). Persisting policies to PostgreSQL via Prisma can be added in a future phase.
