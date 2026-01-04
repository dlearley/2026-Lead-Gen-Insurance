# Data Classification

The platform supports field-level data classification to drive access control, retention, and masking.

## Levels

- `public`
- `internal`
- `confidential`
- `highly_confidential`
- `pii`
- `phi`
- `payment_card`
- `trade_secret`

## Default classification matrix

The default matrix is implemented in `packages/core/src/security/data-classification.ts`.

Examples:

- User email/name/phone/address → `pii`
- Lead source/status → `internal`
- Policy number / claim amounts → `confidential`
- Date of birth / medical records → `phi`

## Discovery

Use `discoverSensitiveFields()` to detect unclassified sensitive fields by:

- Key name heuristics (`email`, `phone`, `address`, `name`, ...)
- Value patterns (emails, SSNs, credit cards)

This is intended for continuous monitoring and CI validation.
