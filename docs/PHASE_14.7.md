# Phase 14.7: API Documentation & Developer Portal

## Overview

This phase focused on creating a comprehensive developer experience for the Insurance Lead Generation platform.

## Key Components

### 1. OpenAPI Specification

- Automated OpenAPI 3.0.0 generation using `zod-to-openapi`.
- Integrated with existing Zod validation schemas.
- Served dynamically at `/openapi.json` and `/api-docs`.
- Includes detailed request/response schemas, examples, and authentication requirements.

### 2. Developer Portal

- Integrated into the Next.js frontend at `/developer`.
- **Interactive API Explorer**: Built with `swagger-ui-react`.
- **Guides**:
  - Quickstart Guide
  - Authentication Guide (referenced)
  - Webhooks Integration Guide
- **SDK Section**: Documentation and links to generated client libraries.

### 3. SDK Generation

- Added `@openapitools/openapi-generator-cli` for automated SDK creation.
- Support for:
  - TypeScript (Axios)
  - Python
  - Go
- Generation script: `./scripts/generate-sdks.sh`.
- Root command: `pnpm generate:sdks`.

### 4. API Monitoring & Analytics

- Implemented `apiAnalyticsMiddleware` using `prom-client`.
- Tracks:
  - Request counts by method, endpoint, and status.
  - Request latency.
  - Usage per customer (organizationId).
- Metrics available for Prometheus/Grafana dashboards.

### 5. Developer Resources

- **Postman Collection**: `docs/postman_collection.json`.
- **API Reference**: Available at `/developer/api-reference`.
- **Dark/Light Mode**: Full support via Tailwind CSS.

## Getting Started

To view the developer portal:

1. Start the API: `cd apps/api && pnpm dev`
2. Start the Frontend: `cd apps/frontend && pnpm dev`
3. Navigate to `http://localhost:3001/developer` (assuming frontend on 3001)

To generate SDKs:

```bash
pnpm generate:sdks
```
