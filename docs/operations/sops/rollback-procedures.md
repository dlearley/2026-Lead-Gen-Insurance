# SOP: Rollback Procedures

## Purpose
To provide safe and reliable methods for reverting changes when a deployment causes issues in production.

## 1. Application Rollback (Helm)
The primary method for reverting service deployments.

### Procedure
1. **Identify the previous stable version**:
   ```bash
   helm history <release-name> -n production
   ```
2. **Execute rollback**:
   ```bash
   # Revert to previous revision
   helm rollback <release-name> 0 -n production
   ```
   *(Note: 0 rolls back to the immediate previous version)*
3. **Verify status**:
   ```bash
   kubectl rollout status deployment/<deployment-name> -n production
   ```

## 2. Database Rollback
Reverting database schema changes (migrations) or data.

### Procedure (Schema)
If using Prisma:
```bash
# This is destructive and should be avoided in production if possible.
# Better to apply a "forward" migration that reverts the changes.
npx prisma migrate resolve --rolled-back "migration_name"
```
*Always consult with a DBA before performing database rollbacks.*

### Procedure (Data Restore)
If data corruption occurred:
1. Scale down application services to prevent further corruption.
2. Restore from the latest snapshot (see Database Runbook).
3. Re-play lost transactions if possible from logs/NATS.

## 3. Configuration Rollback
Reverting changes to Kubernetes ConfigMaps or Secrets.

### Procedure
1. Locate the previous manifest in Git.
2. Apply the previous version:
   ```bash
   kubectl apply -f path/to/stable/config.yaml -n production
   ```
3. Restart dependent pods:
   ```bash
   kubectl rollout restart deployment/<deployment-name> -n production
   ```

## 4. Global Rollback (Infrastructure as Code)
Reverting Terraform or cluster-level changes.

### Procedure
1. Revert the commit in the GitOps repository.
2. Wait for the CI/CD pipeline to sync (e.g., ArgoCD or Terraform Cloud).
3. Monitor the cluster for stability.

## Rollback Decision Matrix
- **Roll back if**:
  - P0/P1 bugs discovered in production.
  - Significant performance degradation (>2x latency).
  - High error rates (>5%) not resolved within 15 mins.
- **Do NOT roll back if**:
  - The rollback is more risky than a hotfix (e.g., destructive DB changes).
  - The issue is external (3rd party API down).
  - The new version contains critical security patches that cannot be deferred.
