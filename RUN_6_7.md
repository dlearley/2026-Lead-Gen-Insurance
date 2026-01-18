# Run 6.7: Documentation & Runbooks

## Overview

This run improves the repo's operational documentation by:
- Cleaning up documentation artifacts in the internal knowledge base
- Filling in missing Docusaurus docs pages referenced by the docs sidebar
- Adding/organizing operations runbooks (including a PostgreSQL database operations runbook)
- Fixing the Docusaurus configuration so the docs site can build using the existing `docs/` structure

## Key Documentation Entry Points

### Internal Knowledge Base (Markdown)
- Main index: `docs/README.md`
- Operations: `docs/operations/README.md`
- Master runbooks: `docs/RUNBOOKS.md`

### Operations Runbooks
- Component runbooks: `docs/operations/runbooks/`
- Runbooks index: `docs/operations/runbooks/README.md`

## Running the Documentation Site (Docusaurus)

From the repo root:

```bash
cd docs
npm install
npm run start
```

Build for production:

```bash
cd docs
npm install
npm run build
```

Notes:
- The site is configured to use the existing `docs/` folder layout (e.g., `docs/user/*`, `docs/api/*`, `docs/integrations/*`).
- Sidebar references are backed by actual `.md` files.

## What Was Added / Updated

### Operations
- Added `docs/operations/runbooks/database-operations.md`
- Added `docs/operations/runbooks/README.md`
- Updated `docs/operations/README.md` to include the runbooks index + database operations

### Docusaurus Docs Site
- Fixed `docs/docusaurus.config.js` (CommonJS + docs path config)
- Fixed `docs/sidebars.js` development sidebar doc IDs
- Added missing docs pages referenced in sidebars:
  - `docs/api/*` (authentication, endpoints, errors, webhooks, sdks)
  - `docs/integrations/*` (overview + additional integration guides)
  - `docs/compliance/*` (gdpr, security, privacy policy, terms, sla)
  - `docs/support/*` (video tutorials, webinars, release notes)

### Cleanup
- Removed stray placeholder text from multiple internal docs under `docs/`
