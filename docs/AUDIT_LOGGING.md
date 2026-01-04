# Audit Logging

This project includes an append-only audit trail designed for compliance (7-year retention).

## What is audited

At a minimum we audit:

- Authentication failures (missing/invalid token)
- Authorization failures (role checks)
- Privacy/GDPR actions (data export, deletion requests, consent changes)
- Admin access to audit logs (query/export)
- All API requests via middleware (best-effort, batched)

## Storage

Audit logs are stored in a dedicated `audit_logs` table (PostgreSQL) created automatically on startup (best-effort):

- **Append-only**: database triggers prevent `UPDATE`/`DELETE`
- **Indexes**: `user_id`, `user_email`, `timestamp`, `(resource_type, resource_id)`, `action`
- **Retention**: configure `AUDIT_LOG_RETENTION_DAYS` (default: 2555 ≈ 7 years)
- **Archival**: configure `AUDIT_LOG_ARCHIVE_AFTER_DAYS` (default: 365) for downstream cold-storage workflows

## Configuration

Environment variables:

- `ENABLE_AUDIT_LOGGING` (default: true)
- `AUDIT_LOG_DB_ENABLED` (default: true; **disabled automatically in tests**)
- `AUDIT_LOG_RETENTION_DAYS` (default: 2555)
- `AUDIT_LOG_ARCHIVE_AFTER_DAYS` (default: 365)
- `AUDIT_LOG_BATCH_DELAY_MS` (default: 100)
- `AUDIT_LOG_BATCH_SIZE` (default: 100)

## API endpoints (admin-only)

- `GET /api/v1/audit-logs` – query audit logs
- `GET /api/v1/audit-logs/export?format=json|csv` – export masked audit logs

All audit log access is itself audited (`audit_log_query`, `audit_log_export`).

## Data snapshots & masking

`old_values` / `new_values` are masked before persistence using the shared masking utilities.

Notes:

- Snapshots are meant for **change reconstruction** and **incident investigations**.
- Highly sensitive fields should be masked or encrypted before being included.

## Guarantees

- Critical audits use synchronous writes (`logCritical`) before the response is sent.
- Non-critical audits are batched (≤100ms).
