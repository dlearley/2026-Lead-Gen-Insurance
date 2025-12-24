# Lead Generation Insurance Platform - Backend API

A modern, scalable backend API for managing insurance leads, built with FastAPI, PostgreSQL, and SQLAlchemy.

## 🚀 Features

- **FastAPI Framework**: High-performance, modern Python web framework
- **Async SQLAlchemy ORM**: Efficient database operations with connection pooling
- **PostgreSQL Database**: Robust relational database with full ACID compliance
- **Alembic Migrations**: Version-controlled database schema management
- **Pydantic Validation**: Comprehensive input validation and serialization
- **RESTful API**: Well-structured endpoints with proper HTTP methods
- **Auto-generated Documentation**: Interactive API docs with Swagger UI
- **Comprehensive Testing**: Unit and integration tests with pytest
- **Docker Support**: Containerized PostgreSQL and Redis services
- **Type Hints**: Full type safety throughout the codebase

## 📋 Prerequisites

- Python 3.9+
- Docker and Docker Compose
- pip (Python package manager)

## 🛠️ Installation & Setup

### 1. Clone the repository

```bash
git clone <repository-url>
cd <project-directory>
```

### 2. Set up development environment

```bash
make dev
```

This command will:
- Copy `.env.example` to `.env`
- Install Python dependencies
- Start Docker containers (PostgreSQL, Redis)
- Run database migrations

### Manual Setup (Alternative)

```bash
# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Copy environment variables
cp .env.example .env

# Start database services
docker-compose up -d

# Run migrations
alembic upgrade head
```

## 🗄️ Database Schema

### Core Tables

- **organizations**: Companies using the platform
- **users**: User accounts linked to organizations
- **leads**: Primary lead records with contact information
- **lead_sources**: Tracking where leads originate (web, social, referral, etc.)
- **campaigns**: Marketing campaigns for lead generation
- **insurance_products**: Available insurance products/policies

### Key Relationships

```
Organization (1) ──< (N) Users
Organization (1) ──< (N) Leads
Organization (1) ──< (N) Campaigns
Lead (N) ──> (1) LeadSource
Lead (N) ──> (1) Campaign
Lead (N) ──> (1) InsuranceProduct
```

## 🔌 API Endpoints

### Health Check

```
GET /health
```

Returns API health status and database connectivity.

### Leads Management

```
POST   /api/v1/leads          Create a new lead
GET    /api/v1/leads          List all leads (with pagination)
GET    /api/v1/leads/{id}     Get a specific lead
PUT    /api/v1/leads/{id}     Update a lead
DELETE /api/v1/leads/{id}     Delete a lead
```

### Query Parameters (List Leads)

- `page`: Page number (default: 1)
- `page_size`: Items per page (default: 50, max: 100)
- `organization_id`: Filter by organization
- `status`: Filter by lead status

## 📝 API Documentation

Once the server is running, access:

- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc
- **OpenAPI Schema**: http://localhost:8000/openapi.json

## 🚦 Running the Application

### Development Server

```bash
make run
```

Or:

```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

The API will be available at: http://localhost:8000

### Seed Sample Data

```bash
make seed
```

This creates:
- 2 organizations
- 2 users
- 4 lead sources
- 4 insurance products
- 2 campaigns
- 5 sample leads

## 🧪 Testing

### Run all tests

```bash
make test
```

Or:

```bash
pytest -v --cov=app --cov-report=term-missing
```

### Test Coverage

The test suite includes:
- Model creation and validation tests
- API endpoint integration tests
- Database relationship tests
- Error handling tests

## 🔄 Database Migrations

### Create a new migration

```bash
make migrate-auto m="description of changes"
```

Or:

```bash
alembic revision --autogenerate -m "description"
```

### Apply migrations

```bash
make migrate
```

Or:

```bash
alembic upgrade head
```

### Rollback migration

```bash
alembic downgrade -1
```

## 🐳 Docker Services

### Start services

```bash
make db-up
```

### Stop services

```bash
make db-down
```

### Reset database

```bash
make db-reset
```

This will:
- Stop and remove containers
- Delete all data volumes
- Start fresh containers
- Run migrations

## 📁 Project Structure

```
.
├── alembic/                 # Database migrations
│   ├── versions/           # Migration files
│   └── env.py             # Alembic configuration
├── app/
│   ├── api/               # API routes
│   │   └── v1/           # API version 1
│   ├── core/             # Core configuration
│   │   ├── config.py     # Settings and environment variables
│   │   └── logging.py    # Logging configuration
│   ├── db/               # Database setup
│   │   ├── base.py       # Base model
│   │   └── session.py    # Database session management
│   ├── models/           # SQLAlchemy models
│   ├── schemas/          # Pydantic schemas
│   ├── services/         # Business logic layer
│   ├── tests/            # Test suite
│   └── main.py           # FastAPI application entry point
├── scripts/              # Utility scripts
│   └── seed_data.py     # Database seeding
├── .env.example         # Environment variables template
├── docker-compose.yml   # Docker services configuration
├── requirements.txt     # Python dependencies
├── Makefile            # Development commands
└── README.md           # This file
```

## ⚙️ Configuration

### Environment Variables

Key configuration options in `.env`:

```bash
# Database
DATABASE_URL=postgresql+asyncpg://postgres:postgres@localhost:5432/leadgen_db

# Application
APP_NAME="Lead Generation Insurance Platform"
DEBUG=True
LOG_LEVEL=INFO

# Server
HOST=0.0.0.0
PORT=8000

# CORS
BACKEND_CORS_ORIGINS=["http://localhost:3000","http://localhost:8000"]
```

## 🔐 Security Notes

⚠️ **Important for Production:**

1. Change `SECRET_KEY` in `.env`
2. Use strong database passwords
3. Enable HTTPS/TLS
4. Implement authentication middleware
5. Set `DEBUG=False`
6. Configure proper CORS origins
7. Use environment-specific configurations

## 📊 Lead Status Values

- `new`: Initial lead status
- `contacted`: Lead has been contacted
- `qualified`: Lead meets qualification criteria
- `converted`: Lead converted to customer
- `lost`: Lead lost to competitor or not interested

## 🎯 Priority Levels

- `low`: Standard follow-up
- `medium`: Normal priority
- `high`: Urgent attention required

## 🧹 Maintenance Commands

```bash
# Clean up Python cache files
make clean

# View all available commands
make help
```

## 🐛 Troubleshooting

### Database Connection Issues

```bash
# Check if PostgreSQL is running
docker-compose ps

# View database logs
docker-compose logs postgres

# Restart database
make db-reset
```

### Migration Issues

```bash
# Check current migration version
alembic current

# View migration history
alembic history

# Downgrade if needed
alembic downgrade -1
```

## 🤝 Contributing

1. Create a feature branch
2. Make your changes
3. Add/update tests
4. Run test suite
5. Submit pull request

## 📄 License

[Your License Here]

## 🔮 Next Steps (Phase 1.3)

- [ ] Implement JWT authentication
- [ ] Add role-based access control (RBAC)
- [ ] User registration and login endpoints
- [ ] Password reset functionality
- [ ] API rate limiting
- [ ] Enhanced security middleware

## 📞 Support

For issues and questions, please open an issue in the repository.
