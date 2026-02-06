# Phase 6.1: Docker Containerization - Multi-stage Dockerfiles

## Overview
This phase involved implementing and improving multi-stage Dockerfiles for all microservices in the Insurance Lead Gen AI Platform. Multi-stage builds help in creating smaller, more secure, and optimized production images by separating the build environment from the runtime environment.

## Changes Implemented

### 1. Improved Existing Dockerfiles
- **Backend Service (Python)**: Converted the single-stage Dockerfile to a multi-stage build.
  - Stage 1 (builder): Installs build dependencies and python packages.
  - Stage 2 (runner): Lightweight runtime image with only necessary libraries and the application code.

### 2. Created New Multi-stage Dockerfiles
Created consistent, optimized Dockerfiles for the following services:
- **Copilot Service**: Node.js multi-stage build, exposing port 4000.
- **Router Service**: Node.js multi-stage build, exposing port 3005.
- **Communication Service**: Node.js multi-stage build, exposing port 3002.
- **Integration Service**: Node.js multi-stage build, exposing port 3003.
- **Frontend Vite**: Multi-stage build using Node.js for building and Nginx for serving static assets.

### 3. Standardized Node.js Multi-stage Pattern
Used a consistent pattern for Node.js services:
- **Base Stage**: Sets up Node.js and pnpm.
- **Builder Stage**: Copies the monorepo, installs all dependencies, and builds the specific service using `pnpm --filter`.
- **Runner Stage**: 
  - Creates a non-root user for security.
  - Copies only the necessary files (package.json, workspace config, built dist, and packages).
  - Installs only production dependencies.
  - Sets `NODE_ENV=production`.

### 4. Added Global `.dockerignore`
Added a `.dockerignore` file at the repository root to:
- Reduce build context size.
- Prevent sensitive information (like `.env` files) from being included in images.
- Exclude unnecessary directories like `node_modules`, `.git`, and build artifacts.

## How to Build
To build any service, run the following command from the repository root:

```bash
docker build -t service-name -f apps/service-name/Dockerfile .
```

Example for API service:
```bash
docker build -t insurance-api -f apps/api/Dockerfile .
```

## Services Summary
| Service | Language | Port | Dockerfile Path |
|---------|----------|------|-----------------|
| API | Node.js | 3000 | `apps/api/Dockerfile` |
| Data Service | Node.js | 3001 | `apps/data-service/Dockerfile` |
| Orchestrator | Node.js | 3002 | `apps/orchestrator/Dockerfile` |
| Communication | Node.js | 3002 | `apps/communication-service/Dockerfile` |
| Integration | Node.js | 3003 | `apps/integration-service/Dockerfile` |
| Router Service | Node.js | 3005 | `apps/router-service/Dockerfile` |
| Copilot | Node.js | 4000 | `apps/copilot/Dockerfile` |
| Backend | Python | 8000 | `apps/backend/Dockerfile` |
| Frontend (Next.js) | Node.js | 3000 | `apps/frontend/Dockerfile` |
| Frontend (Vite) | React/Nginx| 80 | `apps/frontend-vite/Dockerfile` |
