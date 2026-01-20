# Branch Merge Strategy

## Current State
- **Main branch**: Up to date with origin/main
- **Total branches to merge**: 22
- **Working directory**: Clean (changes stashed)

## Branch Analysis Summary

### Branches with No Conflicts (13 branches)
These branches modify completely unique files and can be merged safely:

1. **docs-phase-13-8-runbooks-operations** - Documentation only (4 files)
2. **feat-phase-10-1-frontend-build-core-ui-pages** - Frontend pages (6 files)
3. **feat-task-3-3-laptop-power-ui-advanced-finder** - Advanced finder UI (7 files)
4. **feat/phase-1-core-nav-module-access** - Navigation & auth (29 files)
5. **run-6-7-docs-runbooks** - Documentation site (41 files)
6. **run-phase-4-advanced-features** - Orchestrator routing (5 files)
7. **run-phase-5-observability-operations** - Observability (6 files)
8. **run-phase-13-7** - AI compliance (6 files)
9. **phase-10-2-testing-suite** - Testing framework (19 files, shares package.json)
10. **perf-10-6-testing-optimization** - Performance testing (12 files, shares package.json)
11. **security-phase-10-3-hardening-compliance** - Security & GDPR (9 files, shares app.ts)
12. **task-3-4-bulk-operations** - Bulk lead operations (3 files)
13. **run-task-10-8-advanced-monitoring-cost-optimization** - Monitoring (11 files, shares multiple)

### Branches with Shared Files (9 branches)
These branches modify common configuration files by adding routes/imports:

**Shared File: apps/api/src/app.ts** (8 branches add different routes)
- feat/task-3-2-timeline-notes
- feat/task-6-1-ai-talk-track-generator
- phase-13-9-support-sla-incident-response
- run-phase-13-1-api-gateway-auth-request-mgmt
- run-task-1-2-business-data-ingestion-pipeline
- run-task-10-8-advanced-monitoring-cost-optimization
- security-phase-10-3-hardening-compliance
- task-2-3-territory-management

**Shared File: apps/data-service/src/index.ts** (8 branches add different routes)
- feat/task-3-2-timeline-notes
- feat/task-6-1-ai-talk-track-generator
- perf-10-6-testing-optimization
- phase-13-9-support-sla-incident-response
- run-phase-13-6-performance-tuning
- run-task-1-2-business-data-ingestion-pipeline
- task-1-3-deduplication-engine
- task-2-3-territory-management

**Shared File: packages/types/src/index.ts** (10 branches add different exports)
- All branches above that add new type files

### Conflict Risk Assessment

**LOW RISK** - Additive changes only:
- Most branches add new imports/exports to index files
- Each branch adds unique route handlers
- Changes are non-overlapping

**MEDIUM RISK** - Potential conflicts:
1. **apps/data-service/prisma/schema.prisma** - 2 branches (both add tables)
2. **apps/data-service/src/middleware/validation.ts** - 2 branches
3. **Frontend pages** - 3 branches modify same pages differently

## Recommended Merge Order

### Phase 1: Documentation & Infrastructure (No conflicts)
1. docs-phase-13-8-runbooks-operations
2. run-6-7-docs-runbooks

### Phase 2: Frontend Features (Isolated changes)
3. feat-phase-10-1-frontend-build-core-ui-pages
4. feat-task-3-3-laptop-power-ui-advanced-finder
5. feat/phase-1-core-nav-module-access

### Phase 3: Backend Infrastructure (Additive)
6. run-phase-4-advanced-features (Orchestrator)
7. run-phase-5-observability-operations
8. run-phase-13-1-api-gateway-auth-request-mgmt

### Phase 4: Data & Business Logic (Some overlaps)
9. run-task-1-2-business-data-ingestion-pipeline (adds DB schema)
10. task-2-3-territory-management (adds DB schema)
11. task-1-3-deduplication-engine

### Phase 5: Feature APIs (Additive routes)
12. feat/task-3-2-timeline-notes
13. feat/task-6-1-ai-talk-track-generator
14. phase-13-9-support-sla-incident-response
15. task-3-4-bulk-operations

### Phase 6: Forms & Validation
16. feat/phase3-forms-data-entry-all-modules-validation
17. run-phase-13-7

### Phase 7: Performance & Testing
18. perf-10-6-testing-optimization
19. phase-10-2-testing-suite
20. run-phase-13-6-performance-tuning
21. run-task-10-8-advanced-monitoring-cost-optimization

### Phase 8: Security & Compliance
22. security-phase-10-3-hardening-compliance

## Merge Strategy

### Approach: Sequential Merge with Conflict Resolution

For each branch:
1. Checkout main and pull latest
2. Merge branch with `--no-ff` to preserve branch history
3. If conflicts occur:
   - For index/config files: Manual merge (additive)
   - For schema files: Combine both migrations
   - For other files: Analyze and merge carefully
4. Run build to verify no breaking changes
5. Commit merge
6. Continue to next branch

### Safety Measures
- Create backup branch before starting
- Test build after each merge
- Keep merge commits atomic (one branch per commit)
- Document any manual conflict resolutions

## Expected Conflicts

### High Probability
1. **packages/types/src/index.ts** - Multiple export additions (easy to merge)
2. **apps/api/src/app.ts** - Multiple route additions (easy to merge)
3. **apps/data-service/src/index.ts** - Multiple route additions (easy to merge)

### Medium Probability
1. **prisma/schema.prisma** - Two branches add tables (need to preserve both)
2. **package.json** - Dependency additions (should auto-merge)

### Resolution Strategy
- Index files: Combine all imports/exports alphabetically
- Route files: Preserve all route registrations
- Schema files: Include all table definitions
- Package.json: Include all dependencies

## Post-Merge Actions
1. Run full TypeScript build
2. Run linting
3. Run tests if available
4. Create comprehensive merge commit message
5. Push to origin/main
6. Delete merged remote branches (optional)

## Rollback Plan
If major issues occur:
```bash
git reset --hard origin/main
git push --force-with-lease origin main
```

## Estimated Impact
- **Files modified**: ~225 unique files
- **New features**: 22 distinct features/improvements
- **Risk level**: Low to Medium (mostly additive changes)
