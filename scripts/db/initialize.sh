#!/bin/bash
# Database Initialization Script
# Create users, roles, and set up permissions

set -euo pipefail

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
LOG_DIR="${PROJECT_ROOT}/logs"
LOG_FILE="${LOG_DIR}/initialize-$(date +%Y%m%d-%H%M%S).log"

# Environment
ENVIRONMENT="${1:-staging}"

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
  fi

  # Verify required variables
  if [[ -z "${DATABASE_URL:-}" ]]; then
    error_exit "DATABASE_URL not set"
  fi
}

# Create PostgreSQL roles and users
initialize_postgres_roles() {
  log "INFO" "Initializing PostgreSQL roles and users"

  # Connect as superuser
  local admin_conn="${DATABASE_URL%/*}/postgres"

  # Create application role (least privilege)
  log "INFO" "Creating application role: app_role"
  psql -d "${admin_conn}" <<'EOF' 2>&1 | tee -a "${LOG_FILE}"
-- Create application role
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'app_role') THEN
    CREATE ROLE app_role WITH NOLOGIN;
  END IF;
END
$$;

-- Grant permissions to application role
GRANT USAGE ON SCHEMA public TO app_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO app_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO app_role;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO app_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO app_role;
EOF

  # Create application user
  log "INFO" "Creating application user: app_user"
  psql -d "${admin_conn}" <<'EOF' 2>&1 | tee -a "${LOG_FILE}"
-- Create application user
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_user WHERE usename = 'app_user') THEN
    CREATE USER app_user WITH ENCRYPTED PASSWORD '${APP_PASSWORD:-change_me}';
  END IF;
END
$$;

-- Grant role to user
GRANT app_role TO app_user;
EOF

  # Create readonly role
  log "INFO" "Creating readonly role: readonly_role"
  psql -d "${admin_conn}" <<'EOF' 2>&1 | tee -a "${LOG_FILE}"
-- Create readonly role
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'readonly_role') THEN
    CREATE ROLE readonly_role WITH NOLOGIN;
  END IF;
END
$$;

-- Grant read-only permissions
GRANT USAGE ON SCHEMA public TO readonly_role;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO readonly_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO readonly_role;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO readonly_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO readonly_role;
EOF

  # Create readonly user
  log "INFO" "Creating readonly user: readonly_user"
  psql -d "${admin_conn}" <<'EOF' 2>&1 | tee -a "${LOG_FILE}"
-- Create readonly user
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_user WHERE usename = 'readonly_user') THEN
    CREATE USER readonly_user WITH ENCRYPTED PASSWORD '${READONLY_PASSWORD:-change_me}';
  END IF;
END
$$;

-- Grant role to user
GRANT readonly_role TO readonly_user;
EOF

  # Create migration role (admin-level for migrations)
  log "INFO" "Creating migration role: migration_role"
  psql -d "${admin_conn}" <<'EOF' 2>&1 | tee -a "${LOG_FILE}"
-- Create migration role
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'migration_role') THEN
    CREATE ROLE migration_role WITH NOLOGIN CREATEROLE;
  END IF;
END
$$;

-- Grant all permissions
GRANT ALL PRIVILEGES ON SCHEMA public TO migration_role;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO migration_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL PRIVILEGES ON TABLES TO migration_role;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO migration_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL PRIVILEGES ON SEQUENCES TO migration_role;
EOF

  # Create migration user
  log "INFO" "Creating migration user: migration_user"
  psql -d "${admin_conn}" <<'EOF' 2>&1 | tee -a "${LOG_FILE}"
-- Create migration user
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_user WHERE usename = 'migration_user') THEN
    CREATE USER migration_user WITH ENCRYPTED PASSWORD '${MIGRATION_PASSWORD:-change_me}';
  END IF;
END
$$;

-- Grant role to user
GRANT migration_role TO migration_user;
EOF

  # Set connection limits
  log "INFO" "Setting connection limits"
  psql -d "${admin_conn}" <<'EOF' 2>&1 | tee -a "${LOG_FILE}"
-- Set connection limits
ALTER USER app_user CONNECTION LIMIT 100;
ALTER USER readonly_user CONNECTION LIMIT 50;
ALTER USER migration_user CONNECTION LIMIT 5;
EOF

  log "INFO" "PostgreSQL roles and users initialized successfully"
}

# Create Redis ACL
initialize_redis_acl() {
  log "INFO" "Initializing Redis ACL"

  if [[ -z "${REDIS_HOST:-}" ]] || [[ -z "${REDIS_PORT:-}" ]]; then
    log "WARN" "Redis host/port not configured, skipping Redis ACL setup"
    return 0
  fi

  log "INFO" "Creating Redis users"

  # Create application user
  redis-cli \
    -h "${REDIS_HOST}" \
    -p "${REDIS_PORT}" \
    -a "${REDIS_PASSWORD:-}" \
    --no-auth-warning \
    ACL SETUSER app_user \
    on \
    >${APP_REDIS_PASSWORD:-change_me} \
    ~* \
    +@all \
    2>&1 | tee -a "${LOG_FILE}"

  # Create readonly user
  redis-cli \
    -h "${REDIS_HOST}" \
    -p "${REDIS_PORT}" \
    -a "${REDIS_PASSWORD:-}" \
    --no-auth-warning \
    ACL SETUSER readonly_user \
    on \
    >${READONLY_REDIS_PASSWORD:-change_me} \
    ~* \
    +@read \
    2>&1 | tee -a "${LOG_FILE}"

  log "INFO" "Redis ACL initialized successfully"
}

# Create Neo4j users
initialize_neo4j_users() {
  log "INFO" "Initializing Neo4j users"

  if [[ -z "${NEO4J_HOST:-}" ]] || [[ -z "${NEO4J_BOLT_PORT:-}" ]]; then
    log "WARN" "Neo4j host/port not configured, skipping Neo4j user setup"
    return 0
  fi

  if ! command -v cypher-shell &> /dev/null; then
    log "WARN" "cypher-shell not found, skipping Neo4j user setup"
    return 0
  fi

  # Create application user
  log "INFO" "Creating Neo4j application user: app_user"
  cypher-shell \
    -a "bolt://${NEO4J_HOST}:${NEO4J_BOLT_PORT}" \
    -u neo4j \
    -p "${NEO4J_PASSWORD:-}" \
    "CREATE OR REPLACE USER app_user SET PASSWORD '${APP_NEO4J_PASSWORD:-change_me}' CHANGE NOT REQUIRED" \
    2>&1 | tee -a "${LOG_FILE}"

  # Grant application role
  cypher-shell \
    -a "bolt://${NEO4J_HOST}:${NEO4J_BOLT_PORT}" \
    -u neo4j \
    -p "${NEO4J_PASSWORD:-}" \
    "GRANT ROLE reader TO app_user" \
    2>&1 | tee -a "${LOG_FILE}"

  cypher-shell \
    -a "bolt://${NEO4J_HOST}:${NEO4J_BOLT_PORT}" \
    -u neo4j \
    -p "${NEO4J_PASSWORD:-}" \
    "GRANT ROLE editor TO app_user" \
    2>&1 | tee -a "${LOG_FILE}"

  # Create readonly user
  log "INFO" "Creating Neo4j readonly user: readonly_user"
  cypher-shell \
    -a "bolt://${NEO4J_HOST}:${NEO4J_BOLT_PORT}" \
    -u neo4j \
    -p "${NEO4J_PASSWORD:-}" \
    "CREATE OR REPLACE USER readonly_user SET PASSWORD '${READONLY_NEO4J_PASSWORD:-change_me}' CHANGE NOT REQUIRED" \
    2>&1 | tee -a "${LOG_FILE}"

  # Grant readonly role
  cypher-shell \
    -a "bolt://${NEO4J_HOST}:${NEO4J_BOLT_PORT}" \
    -u neo4j \
    -p "${NEO4J_PASSWORD:-}" \
    "GRANT ROLE reader TO readonly_user" \
    2>&1 | tee -a "${LOG_FILE}"

  log "INFO" "Neo4j users initialized successfully"
}

# Create Qdrant API keys
initialize_qdrant_keys() {
  log "INFO" "Qdrant API keys are typically managed via cloud provider or Kubernetes secrets"
  log "INFO" "See documentation for Qdrant key management"
}

# Initialize all databases
main() {
  log "INFO" "========================================"
  log "INFO" "Starting database initialization"
  log "INFO" "Environment: ${ENVIRONMENT}"
  log "INFO" "Date: $(date '+%Y-%m-%d %H:%M:%S')"
  log "INFO" "========================================"

  # Load environment
  load_env

  # Initialize databases
  initialize_postgres_roles
  initialize_redis_acl
  initialize_neo4j_users
  initialize_qdrant_keys

  # Summary
  log "INFO" "========================================"
  log "INFO" "Database initialization completed"
  log "INFO" ""
  log "INFO" "PostgreSQL Users Created:"
  log "INFO" "  - app_user (application role)"
  log "INFO" "  - readonly_user (readonly role)"
  log "INFO" "  - migration_user (migration role)"
  log "INFO" ""
  log "INFO" "Redis Users Created:"
  log "INFO" "  - app_user (full access)"
  log "INFO" "  - readonly_user (read-only access)"
  log "INFO" ""
  log "INFO" "Neo4j Users Created:"
  log "INFO" "  - app_user (editor role)"
  log "INFO" "  - readonly_user (reader role)"
  log "INFO" ""
  log "INFO" "⚠️  IMPORTANT: Update .env file with new passwords"
  log "INFO" "========================================"
}

# Run main function
main "$@"
