# Semantic Versioning Strategy

## Overview

This document defines the semantic versioning strategy and release management process for the Insurance Lead Generation AI platform. The system uses automated version detection, changelog generation, and release creation to maintain consistent and predictable versioning across all components.

## Version Format

### Semantic Versioning (SemVer)

Our versioning follows the [Semantic Versioning 2.0.0](https://semver.org/) specification:

```
MAJOR.MINOR.PATCH[-PRERELEASE]

Examples:
- 1.2.3          # Stable release
- 1.2.3-alpha.1  # Pre-release
- 2.0.0-beta.2   # Beta release
- 1.3.0-rc.1     # Release candidate
```

### Version Components

- **MAJOR**: Breaking changes that are not backward compatible
- **MINOR**: New features that are backward compatible
- **PATCH**: Bug fixes that are backward compatible
- **PRERELEASE**: Optional pre-release identifier (alpha, beta, rc, dev)

### Version Strategy by Environment

| Environment | Version Strategy | Examples |
|-------------|------------------|----------|
| Development | Git SHA + timestamp | `abc1234-d20240115` |
| Staging | Branch + Git SHA | `staging-abc1234` |
| Production | Semantic Version | `1.2.3`, `2.0.0` |

## Commit Message Conventions

### Conventional Commits

We follow the [Conventional Commits](https://www.conventionalcommits.org/) specification to enable automated version detection:

```
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

### Commit Types

| Type | Description | Version Bump |
|------|-------------|--------------|
| `feat` | New feature | MINOR |
| `fix` | Bug fix | PATCH |
| `docs` | Documentation only | None |
| `style` | Code style changes | None |
| `refactor` | Code refactoring | None |
| `perf` | Performance improvements | PATCH |
| `test` | Adding or updating tests | None |
| `chore` | Build process or tooling | None |
| `BREAKING CHANGE` | Breaking changes | MAJOR |

### Examples

```bash
# Feature additions
feat(api): add lead scoring algorithm
feat(frontend): implement new dashboard widget
feat!: drop support for Node 16  # Breaking change

# Bug fixes
fix(api): resolve database connection timeout
fix(frontend): correct form validation error

# Documentation
docs(api): update authentication guide
docs: update installation instructions

# Breaking changes (trigger MAJOR version)
feat(api): redesign user authentication system
BREAKING CHANGE: The authentication API has been completely redesigned.
```

### Branch-Specific Commit Patterns

#### Main Branch
- All commit types are tracked
- Determines release versions
- Used for production deployments

#### Develop Branch
- Feature commits for testing
- Merged to main for releases
- Staging deployments

#### Feature Branches
- Individual feature development
- Merged to develop or main
- Development deployments

## Automated Version Detection

### Release Workflow Logic

The `release.yml` workflow automatically analyzes commits to determine the appropriate version bump:

```javascript
// Simplified version detection logic
function determineVersionBump(commits) {
  let hasBreakingChanges = false;
  let hasFeatures = false;
  let hasFixes = false;
  
  for (const commit of commits) {
    if (commit.message.includes('BREAKING CHANGE')) {
      hasBreakingChanges = true;
    }
    if (commit.type === 'feat') {
      hasFeatures = true;
    }
    if (commit.type === 'fix') {
      hasFixes = true;
    }
  }
  
  if (hasBreakingChanges) {
    return { bump: 'major', type: 'BREAKING CHANGE detected' };
  } else if (hasFeatures) {
    return { bump: 'minor', type: 'New features added' };
  } else if (hasFixes) {
    return { bump: 'patch', type: 'Bug fixes applied' };
  } else {
    return { bump: 'none', type: 'No significant changes' };
  }
}
```

### Commit Analysis Process

1. **Fetch Commits**: Get commits since last release
2. **Parse Messages**: Extract conventional commit information
3. **Classify Changes**: Categorize by type and impact
4. **Determine Bump**: Apply version bump rules
5. **Generate Changelog**: Create structured changelog entries

## Changelog Generation

### Changelog Format

Generated changelogs follow the [Keep a Changelog](https://keepachangelog.com/) format:

```markdown
# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.2.3] - 2024-01-15

### Added
- New lead scoring algorithm (feat/api)
- Dashboard widget for analytics (feat/frontend)

### Changed
- Improved API response times (perf/api)

### Fixed
- Resolved database connection timeout (fix/api)
- Fixed form validation error (fix/frontend)

### Security
- Updated dependencies with security patches (chore/deps)

## [1.2.2] - 2024-01-10

### Fixed
- Critical security vulnerability in authentication (fix/security)
```

### Changelog Categories

| Category | Description | Commit Types |
|----------|-------------|--------------|
| **Added** | New features | `feat` |
| **Changed** | Changes in existing functionality | `feat` (non-breaking), `refactor` |
| **Deprecated** | Soon-to-be removed features | `deprecate` |
| **Removed** | Removed features | `feat` (breaking), `remove` |
| **Fixed** | Bug fixes | `fix`, `perf` |
| **Security** | Security improvements | `security`, `fix` (security) |

### Automatic Changelog Generation

```bash
# Generate changelog from commits
git-chglog --output CHANGELOG.md

# Or use conventional-changelog-cli
conventional-changelog -p angular -i CHANGELOG.md -s
```

## Release Process

### Release Workflow Steps

1. **Version Analysis**
   ```yaml
   steps:
     - name: Analyze Version Bump
       run: |
         # Analyze commits since last release
         # Determine version bump (major/minor/patch/none)
         # Generate changelog entries
   ```

2. **Update Versions**
   ```yaml
   steps:
     - name: Update Package Versions
       run: |
         # Update root package.json
         # Update workspace package.json files
         # Update lockfile
   ```

3. **Create Release Commit**
   ```yaml
   steps:
     - name: Create Release Commit
       run: |
         git add .
         git commit -m "chore(release): v1.2.3"
         git tag -a "v1.2.3" -m "Release v1.2.3"
   ```

4. **Create GitHub Release**
   ```yaml
   steps:
     - name: Create GitHub Release
       uses: actions/create-release@v1
       with:
         tag_name: v1.2.3
         release_name: Release v1.2.3
         body: |
           ## What's Changed
           <!-- Changelog content -->
   ```

5. **Trigger Deployments**
   ```yaml
   steps:
     - name: Trigger Build Images
       run: |
         gh workflow run build-images.yml
   ```

### Release Types

#### Regular Releases
- **Trigger**: Merge to main branch
- **Version**: Auto-determined from commits
- **Deploy**: Automatic staging → production pipeline

#### Hotfix Releases
- **Trigger**: Manual release workflow dispatch
- **Version**: Manual version specification
- **Deploy**: Direct to production (with approval)

#### Pre-release
- **Trigger**: Feature branch or manual
- **Version**: Include pre-release identifier
- **Deploy**: Staging environment only

### Manual Release Override

```bash
# Manual major version bump
gh workflow run release.yml -f version_type=major

# Manual minor version bump
gh workflow run release.yml -f version_type=minor

# Manual patch version bump
gh workflow run release.yml -f version_type=patch

# Manual version override
gh workflow run release.yml -f version_override=v2.5.0

# Prerelease
gh workflow run release.yml -f version_type=prerelease -f prerelease_id=alpha
```

## Version Management Across Services

### Monorepo Version Strategy

In our monorepo structure, we maintain consistent versioning across all packages:

```
insurance-lead-gen/
├── package.json              # Root version: 1.2.3
├── apps/
│   ├── api/
│   │   └── package.json      # Version: 1.2.3
│   ├── frontend/
│   │   └── package.json      # Version: 1.2.3
│   └── backend/
│       └── package.json      # Version: 1.2.3
├── packages/
│   ├── core/
│   │   └── package.json      # Version: 1.2.3
│   └── types/
│       └── package.json      # Version: 1.2.3
└── CHANGELOG.md              # Unified changelog
```

### Version Synchronization

```bash
# Update all package.json files to new version
find . -name "package.json" -not -path "./node_modules/*" -exec \
  jq --arg version "1.2.3" '.version = $version' {} +

# Verify version consistency
jq -r '.version' package.json
jq -r '.version' apps/*/package.json
jq -r '.version' packages/*/package.json
```

### Independent Package Versioning

For packages that need independent versioning:

```json
{
  "name": "@company/core",
  "version": "2.1.0",
  "independent": true
}
```

## Docker Image Tagging Strategy

### Image Tag Patterns

| Tag Type | Pattern | Example | Usage |
|----------|---------|---------|-------|
| **Latest** | `latest` | `api:latest` | Default tag for main branch |
| **Version** | `v{major}.{minor}.{patch}` | `api:v1.2.3` | Specific release version |
| **Branch** | `{branch-name}` | `api:main` | Branch-specific builds |
| **SHA** | `{short-sha}` | `api:abc1234` | Git SHA for traceability |
| **Timestamp** | `{YYYYMMDD-HHMMSS}` | `api:20240115-143022` | Build time reference |
| **Environment** | `{env}-{version}` | `api:prod-v1.2.3` | Environment-specific |

### Multi-Stage Tagging

```yaml
# Build stage
docker build -t $ECR_REGISTRY/$REPO/api:$VERSION .
docker tag $ECR_REGISTRY/$REPO/api:$VERSION $ECR_REGISTRY/$REPO/api:latest

# Tag with multiple identifiers
docker tag $ECR_REGISTRY/$REPO/api:$VERSION \
  $ECR_REGISTRY/$REPO/api:$GITHUB_SHA
docker tag $ECR_REGISTRY/$REPO/api:$VERSION \
  $ECR_REGISTRY/$REPO/api:main
```

### Tag Management

```bash
# Clean up old tags
aws ecr batch-delete-image \
  --repository-name $REPO \
  --image-ids imageTag=old-version

# List all tags
aws ecr list-images --repository-name $REPO

# Tag image with multiple tags
for tag in latest v1.2.3 main abc1234; do
  docker tag $IMAGE $ECR_REGISTRY/$REPO:$tag
  docker push $ECR_REGISTRY/$REPO:$tag
done
```

## Pre-release and Beta Management

### Pre-release Identifiers

| Identifier | Stage | Description | Deploy Target |
|------------|-------|-------------|---------------|
| `alpha.X` | Alpha | Early testing, unstable | Development |
| `beta.X` | Beta | Feature complete, testing | Staging |
| `rc.X` | Release Candidate | Final testing | Staging + Production (optional) |

### Pre-release Workflow

```yaml
# Alpha release
gh workflow run release.yml \
  -f version_type=prerelease \
  -f prerelease_id=alpha

# Beta release
gh workflow run release.yml \
  -f version_type=prerelease \
  -f prerelease_id=beta

# Release candidate
gh workflow run release.yml \
  -f version_type=prerelease \
  -f prerelease_id=rc
```

### Pre-release Deployment

```yaml
# Deploy alpha to development
deploy:
  environment: development
  image_tag: v1.2.3-alpha.1

# Deploy beta to staging
deploy:
  environment: staging  
  image_tag: v1.2.3-beta.2

# Deploy RC to staging with production monitoring
deploy:
  environment: staging
  image_tag: v1.2.3-rc.1
  monitoring: production-level
```

## Version Validation and Quality Gates

### Pre-release Validation

```yaml
# Quality gates before release
validation:
  - name: "All Tests Pass"
    command: "pnpm test"
    
  - name: "Security Scan Clean"
    command: "pnpm audit --audit-level moderate"
    
  - name: "Code Quality Check"
    command: "pnpm lint && pnpm type-check"
    
  - name: "Build Success"
    command: "pnpm build"
    
  - name: "Changelog Generated"
    command: "conventional-changelog -p angular"
```

### Version Conflict Prevention

```bash
# Check for version conflicts
function check_version_conflicts() {
  local versions=($(jq -r '.version' **/package.json))
  local unique_versions=($(printf '%s\n' "${versions[@]}" | sort -u))
  
  if [[ ${#versions[@]} -ne ${#unique_versions[@]} ]]; then
    echo "❌ Version conflicts detected:"
    printf '%s\n' "${versions[@]}" | sort | uniq -c
    exit 1
  else
    echo "✅ All versions are consistent"
  fi
}
```

## Rollback and Hotfix Strategy

### Hotfix Release Process

```bash
# 1. Create hotfix branch from release tag
git checkout v1.2.3
git checkout -b hotfix/critical-bug-fix

# 2. Fix the issue
git commit -m "fix: resolve critical database connection issue

BREAKING CHANGE: None

Fixes:"

# 3. Merge to main and tag
git checkout main
git merge hotfix/critical-bug-fix
git tag v1.2.4

# 4. Deploy hotfix
gh workflow run deploy-prod.yml -f version=v1.2.4
```

### Version Rollback

```bash
# Rollback to previous version
./scripts/deploy/rollback.sh prod v1.2.2

# Verify rollback
curl -f https://api.insurance-lead-gen.com/health
```

## Migration and Compatibility

### Version Compatibility Matrix

| Service | v1.1.x | v1.2.x | v2.0.x |
|---------|--------|--------|--------|
| API | ✅ | ✅ | ⚠️ |
| Frontend | ✅ | ✅ | ❌ |
| Database | ✅ | ✅ | ⚠️ |

### Migration Guides

For major version updates, provide migration guides:

```markdown
# Migration Guide: v1.x to v2.0

## Breaking Changes

### API Changes
- Authentication endpoint changed from `/auth/login` to `/auth/v2/login`
- Response format updated for user profile data

### Database Changes
- New `user_preferences` table required
- Existing `users` table schema updated

## Migration Steps

1. **Backup Database**
   ```bash
   pg_dump backup_v1.sql
   ```

2. **Run Migration Script**
   ```bash
   npm run migrate:v2
   ```

3. **Update Configuration**
   ```yaml
   # environment variables
   AUTH_API_VERSION: v2
   DATABASE_SCHEMA_VERSION: 2
   ```

4. **Deploy Services**
   ```bash
   # Deploy in order:
   # 1. Database migration
   # 2. API service
   # 3. Frontend
   ```

## Verification

```bash
# Test migration
npm run test:migration

# Verify service health
curl -f https://api.insurance-lead-gen.com/health
```

## Version Deprecation

### Deprecation Timeline

```yaml
# v1.2.3 - January 15, 2024
deprecated_features:
  - "Legacy authentication (v1)"
  - "Old API response format"

# v1.3.0 - March 15, 2024  
deprecated_features:
  - "Legacy authentication (v1)" # Removed
  - "Old API response format"

# v2.0.0 - June 15, 2024
deprecated_features:
  - "Legacy authentication (v1)" # No longer supported
  - "Old API response format"    # No longer supported
```

### Deprecation Warnings

```javascript
// Add deprecation warnings
function deprecatedFeature() {
  console.warn('⚠️ This feature is deprecated and will be removed in v2.0.0');
  console.warn('Please use the new API endpoint: /api/v2/feature');
  
  // Continue with old implementation for backward compatibility
}
```

## Documentation and Communication

### Release Notes Template

```markdown
# Release v1.2.3 - "Enhanced Lead Scoring"

## 🎉 Highlights
- New AI-powered lead scoring algorithm
- Improved dashboard performance by 40%
- Enhanced security with rate limiting

## 📦 What's Changed

### New Features
- **Lead Scoring**: Advanced ML algorithms for better lead qualification
- **Dashboard**: Real-time analytics with customizable widgets
- **Security**: Rate limiting and DDoS protection

### Improvements  
- **Performance**: API response time reduced by 40%
- **UI/UX**: Modernized design with better accessibility
- **Monitoring**: Enhanced observability and alerting

### Bug Fixes
- Fixed database connection timeout issues
- Resolved authentication token refresh problems
- Corrected form validation errors

### Security
- Updated dependencies with security patches
- Implemented rate limiting on API endpoints
- Enhanced input validation and sanitization

## 🚀 Deployment
- **Staging**: Ready for testing
- **Production**: Scheduled for January 18, 2024
- **Rollback Plan**: Available if needed

## 🔗 Links
- [Full Changelog](CHANGELOG.md)
- [Migration Guide](docs/migration-v1.2.3.md)
- [API Documentation](https://docs.insurance-lead-gen.com)
```

### Stakeholder Communication

```bash
# Automated release notifications
# Slack notification
curl -X POST -H 'Content-type: application/json' \
  --data '{"text":"🚀 New Release: v1.2.3\nHighlights: Enhanced lead scoring, 40% performance improvement\nDeploy: Staging ready, Production Jan 18"}' \
  $SLACK_WEBHOOK_URL

# Email notification
# Send release notes to stakeholders

# GitHub release creation
# Automated with release workflow
```

## Metrics and Success Measurement

### Versioning Success Metrics

```yaml
# Track versioning effectiveness
metrics:
  deployment_success_rate: "> 95%"
  rollback_rate: "< 5%"
  version_conflicts: "0"
  release_automation: "100%"
  
  # Version distribution
  major_versions: "< 2 per year"
  minor_versions: "< 12 per year"  
  patch_versions: "< 24 per year"
  
  # Quality gates
  automated_tests: "> 95% pass rate"
  security_scans: "100% clean"
  performance_impact: "< 5% degradation"
```

### Continuous Improvement

```yaml
# Monthly review process
review:
  - analyze_version_bump_accuracy
  - assess_changelog_quality
  - review_release_frequency
  - optimize_workflow_performance
  
# Quarterly assessment
assessment:
  - version_strategy_effectiveness
  - automation_coverage
  - stakeholder_satisfaction
  - process_improvements
```

## Tools and Automation

### Version Management Tools

| Tool | Purpose | Integration |
|------|---------|-------------|
| `conventional-changelog` | Changelog generation | GitHub Actions |
| `semantic-release` | Automated versioning | CI/CD pipeline |
| `changesets` | Multi-package versioning | Monorepo support |
| `release-it` | Release automation | NPM scripts |

### Automation Scripts

```bash
# Version consistency check
#!/bin/bash
check_versions() {
  echo "Checking version consistency..."
  local versions=$(find . -name "package.json" -not -path "./node_modules/*" -exec jq -r '.version' {} \; | sort -u)
  if [[ $(echo "$versions" | wc -l) -eq 1 ]]; then
    echo "✅ All versions are consistent: $versions"
  else
    echo "❌ Version conflicts found:"
    echo "$versions"
    exit 1
  fi
}

# Changelog validation
validate_changelog() {
  echo "Validating changelog..."
  if [[ -f "CHANGELOG.md" ]]; then
    echo "✅ Changelog exists"
    # Add validation rules
  else
    echo "❌ CHANGELOG.md missing"
    exit 1
  fi
}

# Pre-release checks
pre_release_checks() {
  check_versions
  validate_changelog
  # Add more checks...
}
```

## Conclusion

The semantic versioning strategy provides a structured approach to managing releases while maintaining backward compatibility and clear communication with stakeholders. The automated workflow ensures consistent version detection and changelog generation, while the comprehensive quality gates maintain high standards for production deployments.

Regular review and optimization of the versioning process ensures continued alignment with development best practices and business requirements. The combination of automated detection and manual override capabilities provides flexibility while maintaining consistency and predictability in the release process.