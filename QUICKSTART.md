# Quick Start Guide

Get the Lead Generation Insurance Platform backend up and running in minutes!

## Prerequisites

- Python 3.9 or higher
- Docker and Docker Compose
- Git

## 🚀 Quick Setup (5 minutes)

### 1. Clone and Setup

```bash
# Clone the repository
git clone <repository-url>
cd <project-directory>

# Create virtual environment
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Copy environment file
cp .env.example .env
```

### 2. Start Database

```bash
# Start PostgreSQL and Redis
docker compose up -d

# Wait for database to be ready (about 10 seconds)
sleep 10
```

### 3. Initialize Database

```bash
# Run migrations
alembic upgrade head

# Seed with sample data (optional but recommended)
PYTHONPATH=. python scripts/seed_data.py
```

### 4. Verify Setup

```bash
# Run verification script
python scripts/verify_setup.py
```

You should see:
```
✓ All verification checks passed!

Your backend is ready! You can now:
  1. Run the API: make run
  2. View docs: http://localhost:8000/docs
  3. Run tests: make test
```

### 5. Start the API

```bash
# Start development server
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

The API is now running at: **http://localhost:8000**

## 📚 Quick Tour

### API Documentation

Open your browser to:
- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

### Test the API

```bash
# Health check
curl http://localhost:8000/health

# List all leads
curl http://localhost:8000/api/v1/leads

# Get a specific lead
curl http://localhost:8000/api/v1/leads/1

# Create a new lead
curl -X POST http://localhost:8000/api/v1/leads \
  -H "Content-Type: application/json" \
  -d '{
    "first_name": "Jane",
    "last_name": "Doe",
    "email": "jane.doe@example.com",
    "phone": "555-9999",
    "city": "San Francisco",
    "state": "CA",
    "zip_code": "94102",
    "status": "new",
    "priority": "high",
    "organization_id": 1
  }'
```

### Run Tests

```bash
# Run all tests with coverage
pytest -v --cov=app --cov-report=term-missing
```

## 🛠️ Using Makefile Commands

For convenience, use these make commands:

```bash
# View all available commands
make help

# Start database
make db-up

# Run migrations
make migrate

# Seed database
make seed

# Start API server
make run

# Run tests
make test

# Stop database
make db-down

# Reset database (drop all data and recreate)
make db-reset
```

## 📊 Sample Data Overview

After seeding, you'll have:

- **2 organizations**: Acme Insurance Corp, Premier Insurance Group
- **2 users**: Admin and Agent accounts
- **4 lead sources**: Website Form, Facebook Ads, Google Ads, Referral
- **4 insurance products**: Auto, Home, Life, Health insurance
- **2 campaigns**: Spring Auto and Summer Home campaigns
- **5 sample leads**: Various leads with different statuses

## 🔍 Next Steps

1. **Explore the API**: Use the Swagger UI at http://localhost:8000/docs
2. **Read the Schema**: Check `docs/DATABASE_SCHEMA.md` for database details
3. **Create Your Data**: Use the API to create organizations, leads, etc.
4. **Run Tests**: Verify everything works with `make test`
5. **Check Logs**: Review application logs in the console

## 🐛 Troubleshooting

### Database Connection Error

```bash
# Check if containers are running
docker compose ps

# View database logs
docker compose logs postgres

# Restart database
docker compose restart postgres
```

### Port Already in Use

If port 8000 is already in use:

```bash
# Use a different port
uvicorn app.main:app --reload --host 0.0.0.0 --port 8001
```

### Module Import Errors

Make sure you're in the project root and the virtual environment is activated:

```bash
# Activate venv
source venv/bin/activate

# For scripts, use PYTHONPATH
PYTHONPATH=. python scripts/seed_data.py
```

## 📝 Important Files

- `.env` - Environment configuration
- `alembic/versions/` - Database migrations
- `app/main.py` - FastAPI application entry point
- `app/models/` - Database models
- `app/api/v1/` - API endpoints
- `requirements.txt` - Python dependencies
- `docker-compose.yml` - Database services

## 🎯 Ready for Development!

Your backend is now fully set up and ready for:

- Building new API endpoints
- Adding authentication (Phase 1.3)
- Creating frontend integration
- Adding more features

For detailed information, see the main [README.md](README.md).

## 💡 Tips

- Always activate the virtual environment before working
- Use `make test` frequently to ensure nothing breaks
- Check API docs at /docs for testing endpoints
- Review logs for debugging information
- Use environment variables for configuration

Happy coding! 🚀
