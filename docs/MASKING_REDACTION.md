# Masking & Redaction

Masking utilities live in `packages/core/src/security/masking.ts`.

## Strategies

- Email: `***@example.com`
- Phone: `***-***-1234`
- SSN: `***-**-1234`
- Credit card: `****-****-****-1234`
- Name: `J***`
- Address: `*****, CITY, STATE`

## Where masking is applied

- Audit snapshots (`old_values` / `new_values`) are masked before persistence
- Privacy exports return masked data by default
- Audit log exports always return masked data

## Goal

No unmasked PII should be emitted to logs, exports, or non-production environments.
