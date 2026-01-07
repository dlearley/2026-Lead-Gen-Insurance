# Rollback Procedures

## When to Rollback
- sustained 5xx error rate > 5% for 5 minutes
- p95 latency > 500ms for 10 minutes
- data integrity issue detected
- security incident

## Rollback Types

### A) Application Rollback (no schema change)
1. revert deployment to last known good image tag
2. confirm readiness
3. run smoke tests
4. keep monitoring for 30 minutes

### B) Migration Rollback (schema change)
Prefer forward-fix when possible.

If rollback is mandatory:
1. enable maintenance mode
2. stop writes / pause jobs
3. restore DB from latest snapshot OR run down-migrations (only if verified)
4. rollback app deployments
5. run integrity checks

## Data Integrity Checks
- confirm foreign keys / constraints
- run a representative set of reads/writes
- validate audit logging still functioning

## Communication
- announce rollback start + reason
- provide status updates every 15 minutes
- publish postmortem within 48 hours
