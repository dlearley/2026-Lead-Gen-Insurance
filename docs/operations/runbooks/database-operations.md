# Runbook: Database Operations (PostgreSQL)

## Overview

This runbook covers common operational tasks for the platform's primary PostgreSQL database, including health checks, safe migrations, backup/restore, and incident troubleshooting.

For deeper guidance, see:

- [Database Setup](../../DATABASE_SETUP.md)
- [Database Monitoring](../../DATABASE_MONITORING.md)
- [Database Migration](../../DATABASE_MIGRATION.md)
- [Database Backup & Recovery](../../DATABASE_BACKUP_RECOVERY.md)

## Key Concepts

- **Primary DB**: PostgreSQL (OLTP) for leads, agents, routing, audit logs, etc.
- **Migration tooling**:
  - TypeScript services use **Prisma** (`apps/data-service/prisma`)
  - Python backend uses **Alembic** (`apps/backend/alembic`)
- **Preferred operational interface**: Kubernetes `kubectl exec` into an admin/debug pod, or use the scripts in `scripts/db/`.

## Prerequisites

- Access to the target cluster/namespace (typically `production`)
- `kubectl` configured
- DB credentials available via secret manager / Kubernetes secret

Environment variables (examples):

```bash
export PGHOST=<db-host>
export PGPORT=5432
export PGDATABASE=insurance_lead_gen
export PGUSER=<db-user>
export PGPASSWORD=<db-password>
```

## 1) Health Checks

### Quick connectivity check

```bash
psql -h "$PGHOST" -p "$PGPORT" -U "$PGUSER" -d "$PGDATABASE" -c "SELECT 1;"
```

### Connection pressure

```bash
psql -h "$PGHOST" -p "$PGPORT" -U "$PGUSER" -d "$PGDATABASE" -c "SELECT count(*) AS connections FROM pg_stat_activity;"
```

### Long-running queries (5+ minutes)

```bash
psql -h "$PGHOST" -p "$PGPORT" -U "$PGUSER" -d "$PGDATABASE" -c "SELECT pid, now() - query_start AS runtime, state, wait_event_type, wait_event, left(query, 200) AS query FROM pg_stat_activity WHERE state <> 'idle' AND now() - query_start > interval '5 minutes' ORDER BY runtime DESC;"
```

### Disk usage (DB size)

```bash
psql -h "$PGHOST" -p "$PGPORT" -U "$PGUSER" -d "$PGDATABASE" -c "SELECT pg_size_pretty(pg_database_size(current_database())) AS db_size;"
```

## 2) Backups

### Standard backup (recommended)

Use the repo scripts which support multi-DB backups and optional S3 uploads:

```bash
cd /home/engine/project/scripts/db
./backup.sh
```

If you need a config file:

```bash
cd /home/engine/project/scripts/db
cp backup-config.sh.example backup-config.sh
# Edit backup-config.sh, then:
DB_CONFIG=./backup-config.sh ./backup.sh
```

### Manual Postgres backup (last resort)

```bash
pg_dump -h "$PGHOST" -p "$PGPORT" -U "$PGUSER" -d "$PGDATABASE" -Fc -f "backup-$(date +%Y%m%d-%H%M%S).dump"
```

## 3) Restore / Recovery

### Scripted restore (recommended)

```bash
cd /home/engine/project/scripts/db
./restore.sh postgres
```

### Post-restore validation checklist

1. Run a sanity query (row counts, recent data)
2. Verify app pods can connect (error rates drop)
3. Verify background jobs / routing workflows resume
4. Monitor DB CPU, connections, and slow queries for 30–60 minutes

## 4) Migrations

### Pre-migration safety checklist (production)

1. Confirm an up-to-date backup exists
2. Ensure a rollback plan exists (prefer forward-fix migrations)
3. Confirm maintenance window / comms if user-impacting
4. Verify DB health (connections, CPU, replication if applicable)

### Run migrations using the repo script (recommended)

```bash
cd /home/engine/project/scripts/db
./migrate.sh production
```

### Prisma migrations (TypeScript)

If running manually (use with caution in production):

```bash
cd /home/engine/project/apps/data-service
npx prisma migrate deploy
```

### Alembic migrations (Python backend)

```bash
cd /home/engine/project/apps/backend
alembic upgrade head
```

## 5) Incident Troubleshooting

### Symptom: Elevated DB errors / connection failures

- Check whether connections are exhausted:
  ```bash
  psql -h "$PGHOST" -U "$PGUSER" -d "$PGDATABASE" -c "SELECT count(*) AS connections, sum(CASE WHEN state='active' THEN 1 ELSE 0 END) AS active FROM pg_stat_activity;"
  ```
- Identify top offending clients:
  ```bash
  psql -h "$PGHOST" -U "$PGUSER" -d "$PGDATABASE" -c "SELECT application_name, usename, client_addr, count(*) AS connections FROM pg_stat_activity GROUP BY 1,2,3 ORDER BY connections DESC LIMIT 20;"
  ```
- Consider temporarily scaling down noisy consumers (or scaling the DB) while investigating.

### Symptom: Slow API / timeouts

- Check slow queries via `pg_stat_statements` (if enabled):
  ```bash
  psql -h "$PGHOST" -U "$PGUSER" -d "$PGDATABASE" -c "SELECT calls, round(mean_exec_time::numeric,2) AS mean_ms, left(query, 200) AS query FROM pg_stat_statements ORDER BY mean_exec_time DESC LIMIT 20;"
  ```
- Correlate with recent deploys and traffic spikes.

### Symptom: Suspected lock contention

```bash
psql -h "$PGHOST" -U "$PGUSER" -d "$PGDATABASE" -c "SELECT locktype, mode, granted, pid, relation::regclass, now() - a.query_start AS runtime, left(a.query, 120) AS query FROM pg_locks l JOIN pg_stat_activity a USING (pid) WHERE a.datname = current_database() ORDER BY granted DESC, runtime DESC;"
```

## Escalation

- Follow [Incident Response SOP](../sops/incident-response.md) and [Escalation Procedures](../sops/escalation-procedures.md)
- If data integrity is in question, treat as SEV-1/SEV-2 depending on impact and involve a DBA immediately
