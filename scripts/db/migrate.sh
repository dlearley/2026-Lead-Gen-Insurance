#!/bin/bash
# Database Migration Script
# Run Prisma and Alembic migrations

set -euo pipefail

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
LOG_DIR="${PROJECT_ROOT}/logs"
LOG_FILE="${LOG_DIR}/migrate-$(date +%Y%m%d-%H%M%S).log"

# Environment
ENVIRONMENT="${1:-staging}"
shift

# Create log directory
mkdir -p "${LOG_DIR}"

# Logging function
log() {
  local level="$1"
  shift
  local message="$*"
  local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
  echo "[${timestamp}] [${level}] ${message}" | tee -a "${LOG_FILE}"
}

# Error handler
error_exit() {
  log "ERROR" "$1"
  exit 1
}

# Load environment variables
load_env() {
  local env_file="${PROJECT_ROOT}/.env.${ENVIRONMENT}"

  if [[ -f "${env_file}" ]]; then
    log "INFO" "Loading environment from: ${env_file}"
    set -a
    source "${env_file}"
    set +a
  else
    log "WARN" "Environment file not found: ${env_file}"
    log "WARN" "Using default environment variables"
  fi

  # Verify required variables
  if [[ -z "${DATABASE_URL:-}" ]]; then
    error_exit "DATABASE_URL not set"
  fi
}

# Backup database before migration
backup_database() {
  log "INFO" "Creating database backup before migration"

  local timestamp=$(date +%Y%m%d-%H%M%S)
  local backup_file="${PROJECT_ROOT}/backups/pre-migrate-${timestamp}.dump"

  mkdir -p "${PROJECT_ROOT}/backups"

  if pg_dump \
    -d "${DATABASE_URL}" \
    -F c \
    -f "${backup_file}" \
    -v 2>&1 | tee -a "${LOG_FILE}"; then

    log "INFO" "Backup created: ${backup_file}"
    echo "${backup_file}" > "${PROJECT_ROOT}/backups/pre-migrate-latest.txt"
  else
    error_exit "Database backup failed"
  fi
}

# Rollback database
rollback_database() {
  log "WARN" "Rolling back database migration"

  local backup_file=""
  if [[ -f "${PROJECT_ROOT}/backups/pre-migrate-latest.txt" ]]; then
    backup_file=$(cat "${PROJECT_ROOT}/backups/pre-migrate-latest.txt")
  fi

  if [[ -z "${backup_file}" ]] || [[ ! -f "${backup_file}" ]]; then
    error_exit "No backup file found for rollback"
  fi

  log "INFO" "Restoring from backup: ${backup_file}"

  # Drop and recreate database
  local db_name=$(echo "${DATABASE_URL}" | sed -n 's/.*\/\([^?]*\).*/\1/p')

  dropdb "${DATABASE_URL}" 2>&1 | tee -a "${LOG_FILE}" || true
  createdb "${DATABASE_URL}" 2>&1 | tee -a "${LOG_FILE}"

  # Restore backup
  pg_restore \
    -d "${DATABASE_URL}" \
    -v \
    "${backup_file}" \
    2>&1 | tee -a "${LOG_FILE}"

  log "INFO" "Rollback completed"
}

# Run Prisma migrations
run_prisma_migrations() {
  log "INFO" "Running Prisma migrations"

  local prisma_dir="${PROJECT_ROOT}/apps/data-service/prisma"

  if [[ ! -d "${prisma_dir}" ]]; then
    log "WARN" "Prisma directory not found: ${prisma_dir}"
    return 0
  fi

  cd "${prisma_dir}"

  # Generate Prisma client
  log "INFO" "Generating Prisma client"
  npx prisma generate 2>&1 | tee -a "${LOG_FILE}"

  # Push schema to database
  log "INFO" "Pushing schema to database"
  npx prisma db push \
    --skip-generate \
    2>&1 | tee -a "${LOG_FILE}"

  # Run migrations
  log "INFO" "Running Prisma migrations"
  npx prisma migrate deploy \
    --skip-generate \
    2>&1 | tee -a "${LOG_FILE}"

  # Seed database (if seed file exists)
  if [[ -f "prisma/seed.ts" ]]; then
    log "INFO" "Seeding database"
    npx prisma db seed \
      2>&1 | tee -a "${LOG_FILE}"
  fi

  log "INFO" "Prisma migrations completed"
}

# Run Alembic migrations
run_alembic_migrations() {
  log "INFO" "Running Alembic migrations"

  local alembic_dir="${PROJECT_ROOT}/apps/backend/alembic"

  if [[ ! -d "${alembic_dir}" ]]; then
    log "WARN" "Alembic directory not found: ${alembic_dir}"
    return 0
  fi

  cd "${PROJECT_ROOT}/apps/backend"

  # Check current migration status
  log "INFO" "Checking migration status"
  python -m alembic current \
    2>&1 | tee -a "${LOG_FILE}"

  # Upgrade to head
  log "INFO" "Upgrading database to latest migration"
  python -m alembic upgrade head \
    2>&1 | tee -a "${LOG_FILE}"

  log "INFO" "Alembic migrations completed"
}

# Validate schema
validate_schema() {
  log "INFO" "Validating database schema"

  local prisma_dir="${PROJECT_ROOT}/apps/data-service/prisma"

  if [[ -d "${prisma_dir}" ]]; then
    cd "${prisma_dir}"
    npx prisma db pull 2>&1 | tee -a "${LOG_FILE}"

    # Compare schemas
    log "INFO" "Checking for schema drift"
    npx prisma migrate diff \
      --from-empty \
      --to-schema-datamodel schema.prisma \
      --script \
      2>&1 | tee -a "${LOG_FILE}" || true
  fi
}

# Health check
health_check() {
  log "INFO" "Running database health check"

  # Check PostgreSQL connection
  if psql \
    -d "${DATABASE_URL}" \
    -c "SELECT 1;" \
    2>&1 | tee -a "${LOG_FILE}"; then

    log "INFO" "PostgreSQL connection successful"
  else
    error_exit "PostgreSQL connection failed"
  fi

  # Check table count
  local table_count=$(psql \
    -d "${DATABASE_URL}" \
    -t \
    -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';" \
    2>&1 | tee -a "${LOG_FILE}" | xargs)

  log "INFO" "Database contains ${table_count} tables"

  # Check if leads table exists
  local leads_exists=$(psql \
    -d "${DATABASE_URL}" \
    -t \
    -c "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'leads');" \
    2>&1 | tee -a "${LOG_FILE}" | xargs)

  if [[ "${leads_exists}" == "t" ]]; then
    local lead_count=$(psql \
      -d "${DATABASE_URL}" \
      -t \
      -c "SELECT COUNT(*) FROM leads;" \
      2>&1 | tee -a "${LOG_FILE}" | xargs)
    log "INFO" "Leads table exists with ${lead_count} records"
  fi
}

# Main migration function
main() {
  local skip_backup="${SKIP_BACKUP:-false}"
  local skip_health_check="${SKIP_HEALTH_CHECK:-false}"

  # Parse arguments
  while [[ $# -gt 0 ]]; do
    case "${1}" in
      --skip-backup)
        skip_backup=true
        shift
        ;;
      --skip-health-check)
        skip_health_check=true
        shift
        ;;
      --rollback)
        rollback_database
        exit 0
        ;;
      --validate)
        load_env
        validate_schema
        exit 0
        ;;
      --health-check)
        load_env
        health_check
        exit 0
        ;;
      *)
        log "ERROR" "Unknown option: ${1}"
        exit 1
        ;;
    esac
  done

  log "INFO" "========================================"
  log "INFO" "Starting database migration"
  log "INFO" "Environment: ${ENVIRONMENT}"
  log "INFO" "Date: $(date '+%Y-%m-%d %H:%M:%S')"
  log "INFO" "========================================"

  # Load environment
  load_env

  # Backup database
  if [[ "${skip_backup}" != "true" ]]; then
    backup_database
  else
    log "WARN" "Skipping database backup"
  fi

  # Run migrations
  local failed=0
  run_prisma_migrations || failed=1
  run_alembic_migrations || failed=1

  if [[ ${failed} -eq 1 ]]; then
    log "ERROR" "Migration failed"
    read -p "Rollback to backup? (yes/no): " rollback
    if [[ "${rollback}" == "yes" ]]; then
      rollback_database
    fi
    exit 1
  fi

  # Validate schema
  validate_schema

  # Health check
  if [[ "${skip_health_check}" != "true" ]]; then
    health_check
  fi

  log "INFO" "========================================"
  log "INFO" "Migration completed successfully"
  log "INFO" "========================================"
}

# Run main function
main "$@"
