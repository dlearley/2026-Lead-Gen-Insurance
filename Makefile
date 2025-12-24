.PHONY: help install dev db-up db-down db-reset migrate migrate-auto seed run test clean

help:
    @echo "Available commands:"
    @echo "  make install       - Install dependencies"
    @echo "  make dev           - Set up development environment"
    @echo "  make db-up         - Start database services"
    @echo "  make db-down       - Stop database services"
    @echo "  make db-reset      - Reset database (drop and recreate)"
    @echo "  make migrate       - Run database migrations"
    @echo "  make migrate-auto  - Generate migration from model changes"
    @echo "  make seed          - Seed database with sample data"
    @echo "  make run           - Run development server"
    @echo "  make test          - Run tests"
    @echo "  make clean         - Clean up generated files"

install:
    pip install -r requirements.txt

dev:
    @if [ ! -f .env ]; then cp .env.example .env; echo "Created .env file"; fi
    make install
    make db-up
    @echo "Waiting for database to be ready..."
    @sleep 5
    make migrate

db-up:
    docker compose up -d

db-down:
    docker compose down

db-reset:
    docker compose down -v
    docker compose up -d
    @echo "Waiting for database to be ready..."
    @sleep 5
    make migrate

migrate:
    alembic upgrade head

migrate-auto:
    alembic revision --autogenerate -m "$(m)"

seed:
    PYTHONPATH=. python scripts/seed_data.py

run:
    uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

test:
    pytest -v --cov=app --cov-report=term-missing

clean:
    find . -type d -name __pycache__ -exec rm -rf {} +
    find . -type f -name "*.pyc" -delete
    find . -type d -name "*.egg-info" -exec rm -rf {} +
    rm -rf .pytest_cache
    rm -rf .coverage
    rm -rf htmlcov
