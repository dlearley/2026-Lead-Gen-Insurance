# Lead Generation Insurance Platform - Backend API

A modern, scalable backend API for managing insurance leads, built with FastAPI, PostgreSQL, and SQLAlchemy.

## 🚀 Quick Start

See [QUICKSTART.md](./QUICKSTART.md) for a 5-minute setup guide.

## 📋 Overview

This is the Python FastAPI backend service for the Lead Generation Insurance Platform. It provides RESTful APIs for managing leads, organizations, campaigns, and insurance products.

### Tech Stack

- **Framework**: FastAPI 0.109.0
- **Database**: PostgreSQL 15 (with asyncpg driver)
- **ORM**: SQLAlchemy 2.0.25 with async support
- **Migrations**: Alembic 1.13.1
- **Validation**: Pydantic 2.5.3
- **Testing**: pytest with pytest-asyncio
- **Python Version**: 3.9+

## 🛠️ Installation

### Prerequisites

- Python 3.9+
- Docker and Docker Compose
- pip (Python package manager)

### Setup

```bash
# Navigate to backend directory
cd apps/backend

# Create virtual environment
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Copy environment file
cp .env.example .env

# Start database services
docker compose -f ../../docker-compose.yml up -d postgres redis

# Run migrations
alembic upgrade head

# Seed sample data (optional)
PYTHONPATH=. python scripts/seed_data.py
```

## 🚦 Running the API

```bash
# Start development server
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Or use the Makefile:

```bash
make run
```

The API will be available at: **http://localhost:8000**

- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

## 🧪 Testing

```bash
# Run all tests
pytest -v --cov=app --cov-report=term-missing

# Or use Makefile
make test
```

## 📁 Project Structure

```
apps/backend/
├── alembic/                 # Database migrations
├── app/
│   ├── api/v1/             # API endpoints
│   ├── core/               # Configuration
│   ├── db/                 # Database setup
│   ├── models/             # SQLAlchemy models
│   ├── schemas/            # Pydantic schemas
│   ├── services/           # Business logic
│   ├── tests/              # Test suite
│   └── main.py             # FastAPI application
├── docs/                   # Documentation
├── scripts/                # Utility scripts
├── .env.example            # Environment template
├── alembic.ini            # Alembic configuration
├── Makefile               # Development commands
├── pytest.ini             # Test configuration
└── requirements.txt       # Python dependencies
```

## 🔌 API Endpoints

### Health & Documentation

- `GET /health` - Health check and database status
- `GET /docs` - Swagger UI documentation
- `GET /redoc` - ReDoc documentation

### Leads Management

- `POST /api/v1/leads` - Create a new lead
- `GET /api/v1/leads` - List leads (with pagination, filtering)
- `GET /api/v1/leads/{id}` - Get lead by ID
- `PUT /api/v1/leads/{id}` - Update lead
- `DELETE /api/v1/leads/{id}` - Delete lead

## 📚 Documentation

- [Quick Start Guide](./QUICKSTART.md)
- [Database Schema](./docs/DATABASE_SCHEMA.md)
- [Phase 1.1 Completion Report](./PHASE_1.1_COMPLETION.md)

## 🔄 Database Migrations

```bash
# Create a new migration
alembic revision --autogenerate -m "description"

# Apply migrations
alembic upgrade head

# Rollback migration
alembic downgrade -1
```

## 🐳 Docker Services

The backend requires PostgreSQL and Redis services defined in the root `docker-compose.yml`:

```bash
# From project root
docker compose up -d postgres redis

# Stop services
docker compose down

# View logs
docker compose logs -f postgres
```

## 🧹 Makefile Commands

```bash
make help          # Show all available commands
make install       # Install dependencies
make dev           # Set up development environment
make db-up         # Start database services
make db-down       # Stop database services
make db-reset      # Reset database
make migrate       # Run migrations
make migrate-auto  # Generate migration (m="description")
make seed          # Seed database with sample data
make run           # Run development server
make test          # Run tests
make clean         # Clean up generated files
```

## 🔐 Environment Configuration

Key environment variables (see `.env.example`):

```env
DATABASE_URL=postgresql+asyncpg://postgres:postgres@localhost:5432/insurance_lead_gen
APP_NAME="Lead Generation Insurance Platform"
DEBUG=True
LOG_LEVEL=INFO
HOST=0.0.0.0
PORT=8000
```

## 🎯 Phase 1.1 Complete

This backend implements all Phase 1.1 requirements:
- ✅ FastAPI application with proper structure
- ✅ SQLAlchemy ORM with async support
- ✅ PostgreSQL database
- ✅ Alembic migrations
- ✅ Complete CRUD operations for leads
- ✅ Comprehensive testing
- ✅ Documentation

## 🚧 Next Steps (Phase 1.3)

- [ ] JWT token-based authentication
- [ ] User registration and login
- [ ] Role-based access control (RBAC)
- [ ] Protected endpoints

## 📞 Support

For issues and questions, please refer to the main project README or open an issue in the repository.
