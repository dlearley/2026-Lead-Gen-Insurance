# Configuration Management Guide

## Overview
This guide describes how configuration is managed across the Insurance Lead Gen Platform services.

## Configuration Sources
We follow the Twelve-Factor App methodology for configuration.

1. **Environment Variables**: Primary source of configuration for all services.
2. **Kubernetes Secrets**: Used for sensitive data (API keys, DB passwords, JWT secrets).
3. **ConfigMaps**: Used for non-sensitive, environment-specific configuration (service URLs, log levels).
4. **Default Values**: Hardcoded in the `config` package as a fallback.

## The `@insurance-lead-gen/config` Package
All services should use the centralized config package to ensure consistency.

### Usage
```typescript
import { getConfig } from '@insurance-lead-gen/config';

const config = getConfig();
console.log(config.database.url);
```

## Environment Specifics

### Local Development
Managed via `.env` files. A template is provided in `.env.example`.

### Staging / Production
Managed via Helm `values.yaml` files located in the `deploy/helm/` directory.

## Managing Secrets
- **Creation**: Use `kubectl create secret generic` or manage via a secret manager (e.g., AWS Secrets Manager, HashiCorp Vault) and sync to Kubernetes.
- **Rotation**: To rotate a secret:
  1. Update the secret in Kubernetes.
  2. Perform a rolling restart of dependent services: `kubectl rollout restart deployment/<service-name>`.

## Adding New Config Keys
1. Add the key and its validation schema to `packages/config/src/index.ts`.
2. Add the corresponding environment variable to `.env.example`.
3. Update the Helm `values.yaml` and templates if the config needs to be configurable in production.
