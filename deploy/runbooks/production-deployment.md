# Production Deployment Runbook

## Scope
Applies to deploying the full platform (API, data-service, orchestrator, frontend) into production.

## Preconditions
- Change has been approved and merged to release branch
- Staging deployment has passed all checks
- Database migration has been validated in staging
- On-call rotation is active
- Incident channel and war room are open

## Pre-flight Checklist

### Infrastructure
- [ ] Kubernetes cluster healthy (nodes ready)
- [ ] Ingress controller healthy
- [ ] Database primary + replicas healthy
- [ ] Redis healthy
- [ ] Object storage available
- [ ] DNS ready (TTL lowered if doing cutover)

### Secrets & Config
- [ ] Secrets present in secret manager / K8s
- [ ] Carrier sandbox keys are NOT in production
- [ ] Production carrier credentials configured
- [ ] OTEL exporter endpoint configured
- [ ] Sentry / error tracking DSN configured

### Observability
- [ ] Prometheus scraping targets up
- [ ] Grafana dashboards available
- [ ] Loki receiving logs
- [ ] Jaeger receiving traces
- [ ] AlertManager routes configured

## Deployment Steps

### 1) Announce
Post in #launch-war-room:
- deployment start time
- expected duration
- rollback owner

### 2) Freeze writes (if required)
If schema changes are risky:
- enable maintenance mode (frontend)
- pause background jobs

### 3) Database migration
- apply migrations using the production migration job / prisma migrate deploy
- verify migration success
- verify application read/write sanity with smoke checks

### 4) Deploy services (rolling)
Recommended order:
1. data-service
2. orchestrator
3. api
4. frontend

### 5) Verification
#### Health checks
- /health endpoints
- readiness probes

#### Smoke tests
- create lead
- run quote request (sandbox disabled; mock in prod smoke env)
- create policy (draft)
- activate policy
- create claim
- export privacy report

### 6) Traffic ramp
- 10% traffic for 15 minutes
- 50% traffic for 30 minutes
- 100% traffic

## Post-deployment
- Monitor error rate, latency, DB health for 60 minutes
- Close war room only after stability confirmed

## Rollback
See `deploy/runbooks/rollback-procedures.md`.
