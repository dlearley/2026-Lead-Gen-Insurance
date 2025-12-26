# Migration Guide: Monorepo Restructure

## Overview

The Python FastAPI backend has been reorganized from the root directory into `apps/backend/` to align with the monorepo structure and coexist with the existing TypeScript services.

## What Changed

### Directory Structure

**Before:**
```
/
├── app/                 # Python backend
├── alembic/            # Migrations
├── scripts/            # Scripts
├── requirements.txt    # Python deps
├── Makefile           # Commands
└── ...
```

**After:**
```
/
├── apps/
│   ├── backend/        # Python FastAPI backend (MOVED HERE)
│   │   ├── app/
│   │   ├── alembic/
│   │   ├── scripts/
│   │   ├── requirements.txt
│   │   └── Makefile
│   ├── api/           # TypeScript API (unchanged)
│   ├── data-service/  # TypeScript service (unchanged)
│   └── orchestrator/  # TypeScript service (unchanged)
├── packages/          # Shared packages (unchanged)
├── docker-compose.yml # Root compose file
└── README.md         # Updated monorepo README
```

### Key Changes

1. **All Python backend files** moved to `apps/backend/`
2. **Makefile updated** to reference `../../docker-compose.yml`
3. **Root README** now describes the entire monorepo
4. **Backend README** added in `apps/backend/README.md`
5. **No functional changes** - all Phase 1.1 features intact

## Migration Steps for Developers

### If You're Working on the Backend

1. **Navigate to the new location:**
   ```bash
   cd apps/backend
   ```

2. **Set up your environment:**
   ```bash
   python3 -m venv venv
   source venv/bin/activate
   pip install -r requirements.txt
   cp .env.example .env
   ```

3. **Use the Makefile as before:**
   ```bash
   make help
   make dev
   make run
   make test
   ```

4. **Docker commands work from root or backend:**
   ```bash
   # From root
   docker compose up -d

   # From apps/backend (Makefile handles it)
   make db-up
   ```

### If You Have an Existing Clone

1. **Fetch the latest changes:**
   ```bash
   git fetch origin
   git checkout feat-core-backend-db-leads-2026-phase1-1
   git pull
   ```

2. **Remove old virtual environment (if exists):**
   ```bash
   rm -rf venv
   ```

3. **Navigate to new backend location:**
   ```bash
   cd apps/backend
   ```

4. **Set up fresh environment:**
   ```bash
   python3 -m venv venv
   source venv/bin/activate
   pip install -r requirements.txt
   ```

5. **Copy your .env if you had custom settings:**
   ```bash
   # If you had a .env at the root, copy it to apps/backend/
   # Or just cp .env.example .env and reconfigure
   cp .env.example .env
   ```

## What Still Works

✅ All API endpoints at the same URLs
✅ Database connections and migrations
✅ Docker Compose services (postgres, redis)
✅ Testing with pytest
✅ Makefile commands
✅ Development workflow
✅ Documentation

## Updated Commands

### From Root Directory

```bash
# Start infrastructure
docker compose up -d

# View services
docker compose ps

# View logs
docker compose logs -f postgres
```

### From apps/backend/

```bash
# Activate venv
source venv/bin/activate

# Run server
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
# Or
make run

# Run tests
pytest -v
# Or
make test

# Database migrations
alembic upgrade head
# Or
make migrate

# Generate migration
alembic revision --autogenerate -m "description"
# Or
make migrate-auto m="description"
```

## Benefits of This Structure

1. **Clear Separation**: Backend clearly separated from other services
2. **Monorepo Friendly**: Follows standard monorepo conventions
3. **Multiple Services**: Easy to add more services alongside backend
4. **Independent Development**: Each service can be developed independently
5. **Shared Infrastructure**: All services share the same docker-compose setup
6. **Future Ready**: Ready for frontend, additional APIs, etc.

## Troubleshooting

### "Module not found" errors

**Solution**: Make sure you're in `apps/backend/` and your venv is activated:
```bash
cd apps/backend
source venv/bin/activate
```

### Docker compose errors

**Solution**: The Makefile in `apps/backend/` references the root compose file:
```bash
# From apps/backend/
make db-up  # Uses ../../docker-compose.yml

# Or from root
docker compose up -d
```

### Import errors in tests

**Solution**: Tests automatically set PYTHONPATH, but if running manually:
```bash
cd apps/backend
PYTHONPATH=. pytest -v
```

### Alembic can't find migrations

**Solution**: Make sure you're in `apps/backend/` directory:
```bash
cd apps/backend
alembic upgrade head
```

## CI/CD Updates Needed

If you have CI/CD pipelines, update them:

```yaml
# Before
- pip install -r requirements.txt
- pytest

# After
- cd apps/backend
- pip install -r requirements.txt
- pytest
```

## Questions?

- Check the updated [README.md](./README.md) at the root
- Check [apps/backend/README.md](./apps/backend/README.md) for backend details
- Review [apps/backend/QUICKSTART.md](./apps/backend/QUICKSTART.md) for setup

## Summary

The backend functionality remains 100% intact. This is purely a structural reorganization to support the monorepo architecture and enable future development of additional services alongside the backend.

All Phase 1.1 acceptance criteria continue to be met:
- ✅ FastAPI backend working
- ✅ PostgreSQL database operational
- ✅ All CRUD endpoints functional
- ✅ Tests passing
- ✅ Documentation complete

Just remember: **Everything is now in `apps/backend/`**
