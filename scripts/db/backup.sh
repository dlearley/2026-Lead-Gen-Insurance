#!/bin/bash
# Database Backup Script
# Supports PostgreSQL, Redis, Neo4j, and Qdrant

set -euo pipefail

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CONFIG_FILE="${SCRIPT_DIR}/backup-config.sh"
LOG_DIR="${SCRIPT_DIR}/../logs"
LOG_FILE="${LOG_DIR}/backup-$(date +%Y%m%d-%H%M%S).log"
BACKUP_DIR="${SCRIPT_DIR}/../backups"
RETENTION_DAYS=30

# Source configuration
if [[ -f "${CONFIG_FILE}" ]]; then
  source "${CONFIG_FILE}"
fi

# Create directories
mkdir -p "${LOG_DIR}" "${BACKUP_DIR}"

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

# Slack notification (if configured)
send_slack_notification() {
  local status="$1"
  local message="$2"

  if [[ -n "${SLACK_WEBHOOK_URL:-}" ]]; then
    local emoji="✅"
    [[ "${status}" == "error" ]] && emoji="❌"

    local payload=$(cat <<EOF
{
  "text": "${emoji} Database Backup - ${status^}",
  "attachments": [
    {
      "color": "${status}" == "error" && "danger" || "good",
      "text": "${message}"
    }
  ]
}
EOF
)

    curl -s -X POST "${SLACK_WEBHOOK_URL}" \
      -H 'Content-Type: application/json' \
      -d "${payload}" > /dev/null
  fi
}

# PostgreSQL Backup
backup_postgres() {
  log "INFO" "Starting PostgreSQL backup"

  local timestamp=$(date +%Y%m%d-%H%M%S)
  local backup_file="${BACKUP_DIR}/postgres-${timestamp}.dump"
  local compressed_file="${backup_file}.gz"

  if [[ -z "${PGHOST:-}" ]] || [[ -z "${PGPORT:-}" ]] || [[ -z "${PGDATABASE:-}" ]] || [[ -z "${PGUSER:-}" ]]; then
    log "WARN" "PostgreSQL credentials not configured, skipping"
    return 0
  fi

  log "INFO" "Running pg_dump for database: ${PGDATABASE}"

  if pg_dump \
    -h "${PGHOST}" \
    -p "${PGPORT}" \
    -U "${PGUSER}" \
    -d "${PGDATABASE}" \
    -F c \
    -f "${backup_file}" \
    -v 2>&1 | tee -a "${LOG_FILE}"; then

    log "INFO" "Compressing backup file"
    gzip -f "${backup_file}"

    log "INFO" "Uploading to S3: ${S3_BUCKET}/postgres-backups/"
    if command -v aws &> /dev/null; then
      aws s3 cp "${compressed_file}" "s3://${S3_BUCKET}/postgres-backups/" \
        --storage-class STANDARD_IA \
        --metadata "backup-date=$(date +%Y-%m-%d)" \
        2>&1 | tee -a "${LOG_FILE}"

      log "INFO" "PostgreSQL backup completed successfully"
      return 0
    else
      log "WARN" "AWS CLI not found, skipping S3 upload"
      return 0
    fi
  else
    error_exit "PostgreSQL backup failed"
  fi
}

# Redis Backup
backup_redis() {
  log "INFO" "Starting Redis backup"

  local timestamp=$(date +%Y%m%d-%H%M%S)
  local backup_file="${BACKUP_DIR}/redis-${timestamp}.rdb"

  if [[ -z "${REDIS_HOST:-}" ]] || [[ -z "${REDIS_PORT:-}" ]]; then
    log "WARN" "Redis credentials not configured, skipping"
    return 0
  fi

  log "INFO" "Triggering Redis BGSAVE"

  if command -v redis-cli &> /dev/null; then
    if redis-cli \
      -h "${REDIS_HOST}" \
      -p "${REDIS_PORT}" \
      -a "${REDIS_PASSWORD:-}" \
      --no-auth-warning \
      BGSAVE \
      2>&1 | tee -a "${LOG_FILE}"; then

      log "INFO" "Waiting for BGSAVE to complete"
      sleep 10

      # Copy RDB file (if accessible)
      if [[ -d "${REDIS_DATA_DIR:-}" ]] && [[ -f "${REDIS_DATA_DIR}/dump.rdb" ]]; then
        cp "${REDIS_DATA_DIR}/dump.rdb" "${backup_file}"
        gzip -f "${backup_file}"

        log "INFO" "Uploading to S3: ${S3_BUCKET}/redis-backups/"
        if command -v aws &> /dev/null; then
          aws s3 cp "${backup_file}.gz" "s3://${S3_BUCKET}/redis-backups/" \
            --storage-class STANDARD_IA \
            2>&1 | tee -a "${LOG_FILE}"
        fi
      fi

      log "INFO" "Redis backup completed successfully"
      return 0
    else
      error_exit "Redis backup failed"
    fi
  else
    log "WARN" "redis-cli not found, skipping Redis backup"
    return 0
  fi
}

# Neo4j Backup
backup_neo4j() {
  log "INFO" "Starting Neo4j backup"

  local timestamp=$(date +%Y%m%d-%H%M%S)
  local backup_dir="${BACKUP_DIR}/neo4j-${timestamp}"

  if [[ -z "${NEO4J_HOST:-}" ]] || [[ -z "${NEO4J_BOLT_PORT:-}" ]]; then
    log "WARN" "Neo4j credentials not configured, skipping"
    return 0
  fi

  log "INFO" "Running neo4j-admin backup"

  if command -v neo4j-admin &> /dev/null; then
    mkdir -p "${backup_dir}"

    if neo4j-admin backup \
      --from="${NEO4J_HOST}:${NEO4J_BOLT_PORT}" \
      --backup-dir="${backup_dir}" \
      --name="insurance-lead-gen" \
      2>&1 | tee -a "${LOG_FILE}"; then

      log "INFO" "Compressing backup"
      tar -czf "${backup_dir}.tar.gz" -C "${BACKUP_DIR}" "neo4j-${timestamp}"
      rm -rf "${backup_dir}"

      log "INFO" "Uploading to S3: ${S3_BUCKET}/neo4j-backups/"
      if command -v aws &> /dev/null; then
        aws s3 cp "${backup_dir}.tar.gz" "s3://${S3_BUCKET}/neo4j-backups/" \
          --storage-class STANDARD_IA \
          2>&1 | tee -a "${LOG_FILE}"
      fi

      log "INFO" "Neo4j backup completed successfully"
      return 0
    else
      error_exit "Neo4j backup failed"
    fi
  else
    log "WARN" "neo4j-admin not found, skipping Neo4j backup"
    return 0
  fi
}

# Qdrant Backup
backup_qdrant() {
  log "INFO" "Starting Qdrant backup"

  local timestamp=$(date +%Y%m%d-%H%M%S)

  if [[ -z "${QDRANT_HOST:-}" ]] || [[ -z "${QDRANT_PORT:-}" ]]; then
    log "WARN" "Qdrant credentials not configured, skipping"
    return 0
  fi

  log "INFO" "Triggering Qdrant snapshot creation"

  if command -v curl &> /dev/null; then
    local snapshot_url="http://${QDRANT_HOST}:${QDRANT_PORT}/collections/insurance-leads/snapshots"

    if curl -s -X POST "${snapshot_url}" \
      -H "api-key: ${QDRANT_API_KEY:-}" \
      2>&1 | tee -a "${LOG_FILE}"; then

      log "INFO" "Waiting for snapshot to complete"
      sleep 10

      log "INFO" "Qdrant backup completed successfully"
      return 0
    else
      error_exit "Qdrant backup failed"
    fi
  else
    log "WARN" "curl not found, skipping Qdrant backup"
    return 0
  fi
}

# Cleanup old backups
cleanup_old_backups() {
  log "INFO" "Cleaning up backups older than ${RETENTION_DAYS} days"

  # Cleanup local backups
  find "${BACKUP_DIR}" -type f -mtime +${RETENTION_DAYS} -delete 2>&1 | tee -a "${LOG_FILE}" || true

  # Cleanup S3 backups (if configured)
  if command -v aws &> /dev/null && [[ -n "${S3_BUCKET:-}" ]]; then
    for db in postgres redis neo4j qdrant; do
      aws s3 ls "s3://${S3_BUCKET}/${db}-backups/" --recursive | \
        awk '{print $4}' | \
        while read -r file; do
          local last_modified=$(aws s3 ls "s3://${S3_BUCKET}/${db}-backups/${file}" --recursive | awk '{print $1}')
          local file_date=$(date -d "${last_modified}" +%s)
          local cutoff_date=$(date -d "${RETENTION_DAYS} days ago" +%s)

          if [[ ${file_date} -lt ${cutoff_date} ]]; then
            log "INFO" "Deleting old backup: ${file}"
            aws s3 rm "s3://${S3_BUCKET}/${db}-backups/${file}" 2>&1 | tee -a "${LOG_FILE}" || true
          fi
        done
    done
  fi

  log "INFO" "Cleanup completed"
}

# Main backup function
main() {
  log "INFO" "========================================"
  log "INFO" "Starting database backup process"
  log "INFO" "Date: $(date '+%Y-%m-%d %H:%M:%S')"
  log "INFO" "========================================"

  local failed_backups=()

  # Run backups
  backup_postgres || failed_backups+=("PostgreSQL")
  backup_redis || failed_backups+=("Redis")
  backup_neo4j || failed_backups+=("Neo4j")
  backup_qdrant || failed_backups+=("Qdrant")

  # Cleanup old backups
  cleanup_old_backups

  # Summary
  log "INFO" "========================================"
  log "INFO" "Backup process completed"

  if [[ ${#failed_backups[@]} -eq 0 ]]; then
    log "INFO" "All backups completed successfully"
    send_slack_notification "success" "All database backups completed successfully at $(date '+%Y-%m-%d %H:%M:%S')"
    exit 0
  else
    log "ERROR" "Failed backups: ${failed_backups[*]}"
    send_slack_notification "error" "Failed backups: ${failed_backups[*]}"
    exit 1
  fi
}

# Run main function
main "$@"
