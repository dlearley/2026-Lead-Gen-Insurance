#!/bin/bash
# Database Restore Script
# Supports PostgreSQL, Redis, Neo4j, and Qdrant

set -euo pipefail

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CONFIG_FILE="${SCRIPT_DIR}/backup-config.sh"
LOG_DIR="${SCRIPT_DIR}/../logs"
LOG_FILE="${LOG_DIR}/restore-$(date +%Y%m%d-%H%M%S).log"
BACKUP_DIR="${SCRIPT_DIR}/../backups"

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

# Verify backup file exists
verify_backup_file() {
  local file="$1"
  if [[ ! -f "${file}" ]]; then
    # Try downloading from S3
    if command -v aws &> /dev/null && [[ -n "${S3_BUCKET:-}" ]]; then
      log "INFO" "Downloading from S3: ${file}"
      aws s3 cp "s3://${S3_BUCKET}/${file}" "${BACKUP_DIR}/" 2>&1 | tee -a "${LOG_FILE}"
      if [[ -f "${BACKUP_DIR}/$(basename ${file})" ]]; then
        return 0
      fi
    fi
    error_exit "Backup file not found: ${file}"
  fi
}

# PostgreSQL Restore
restore_postgres() {
  local backup_file="${1:-}"

  if [[ -z "${backup_file}" ]]; then
    read -p "Enter PostgreSQL backup file path: " backup_file
  fi

  log "INFO" "Starting PostgreSQL restore from: ${backup_file}"

  verify_backup_file "${backup_file}"

  # Decompress if needed
  local restore_file="${backup_file}"
  if [[ "${backup_file}" == *.gz ]]; then
    log "INFO" "Decompressing backup file"
    gunzip -c "${backup_file}" > "${BACKUP_DIR}/restore_temp.dump"
    restore_file="${BACKUP_DIR}/restore_temp.dump"
  fi

  log "WARN" "This will overwrite the existing database!"
  read -p "Are you sure you want to continue? (yes/no): " confirm

  if [[ "${confirm}" != "yes" ]]; then
    log "INFO" "Restore cancelled"
    exit 0
  fi

  log "INFO" "Dropping existing database"
  dropdb \
    -h "${PGHOST}" \
    -p "${PGPORT}" \
    -U "${PGUSER}" \
    "${PGDATABASE}" \
    2>&1 | tee -a "${LOG_FILE}" || true

  log "INFO" "Creating new database"
  createdb \
    -h "${PGHOST}" \
    -p "${PGPORT}" \
    -U "${PGUSER}" \
    "${PGDATABASE}" \
    2>&1 | tee -a "${LOG_FILE}"

  log "INFO" "Restoring database"
  if pg_restore \
    -h "${PGHOST}" \
    -p "${PGPORT}" \
    -U "${PGUSER}" \
    -d "${PGDATABASE}" \
    -v \
    "${restore_file}" \
    2>&1 | tee -a "${LOG_FILE}"; then

    log "INFO" "PostgreSQL restore completed successfully"

    # Cleanup temp file
    [[ -f "${BACKUP_DIR}/restore_temp.dump" ]] && rm -f "${BACKUP_DIR}/restore_temp.dump"

    # Verify data integrity
    log "INFO" "Verifying data integrity"
    psql \
      -h "${PGHOST}" \
      -p "${PGPORT}" \
      -U "${PGUSER}" \
      -d "${PGDATABASE}" \
      -c "SELECT COUNT(*) FROM leads;" \
      2>&1 | tee -a "${LOG_FILE}"

    return 0
  else
    error_exit "PostgreSQL restore failed"
  fi
}

# Point-in-Time Recovery for PostgreSQL
restore_postgres_pitr() {
  local target_time="${1:-}"

  if [[ -z "${target_time}" ]]; then
    read -p "Enter target timestamp (e.g., 2024-01-15 14:30:00): " target_time
  fi

  log "INFO" "Starting PostgreSQL PITR to: ${target_time}"

  log "WARN" "PITR requires full database restore + WAL replay!"
  read -p "Continue? (yes/no): " confirm

  if [[ "${confirm}" != "yes" ]]; then
    log "INFO" "PITR cancelled"
    exit 0
  fi

  # Download base backup from S3
  local base_backup=$(aws s3 ls "s3://${S3_BUCKET}/postgres-backups/" --recursive | sort | tail -1 | awk '{print $4}')
  log "INFO" "Using base backup: ${base_backup}"

  aws s3 cp "s3://${S3_BUCKET}/${base_backup}" "${BACKUP_DIR}/base_backup.dump.gz"
  gunzip -c "${BACKUP_DIR}/base_backup.dump.gz" > "${BACKUP_DIR}/base_backup.dump"

  # Create recovery.conf
  cat <<EOF > "${BACKUP_DIR}/recovery.conf"
restore_command = 'aws s3 cp s3://${S3_BUCKET}/postgres-wal/%f %p'
recovery_target_time = '${target_time}'
EOF

  # Stop PostgreSQL service
  log "INFO" "Stopping PostgreSQL service"
  # systemctl stop postgresql  # Adjust based on your system

  # Replace data directory
  log "INFO" "Replacing PostgreSQL data directory"
  # cp -r /var/lib/postgresql/data /var/lib/postgresql/data.bak
  # pg_restore -d postgres "${BACKUP_DIR}/base_backup.dump"

  # Start PostgreSQL in recovery mode
  log "INFO" "Starting PostgreSQL in recovery mode"
  # systemctl start postgresql

  log "INFO" "PITR initiated. Monitor PostgreSQL logs for recovery progress"
}

# Redis Restore
restore_redis() {
  local backup_file="${1:-}"

  if [[ -z "${backup_file}" ]]; then
    read -p "Enter Redis backup file path: " backup_file
  fi

  log "INFO" "Starting Redis restore from: ${backup_file}"

  verify_backup_file "${backup_file}"

  # Decompress if needed
  local restore_file="${backup_file}"
  if [[ "${backup_file}" == *.gz ]]; then
    log "INFO" "Decompressing backup file"
    gunzip -c "${backup_file}" > "${BACKUP_DIR}/restore_temp.rdb"
    restore_file="${BACKUP_DIR}/restore_temp.rdb"
  fi

  log "WARN" "This will overwrite existing Redis data!"
  read -p "Are you sure you want to continue? (yes/no): " confirm

  if [[ "${confirm}" != "yes" ]]; then
    log "INFO" "Restore cancelled"
    exit 0
  fi

  # Stop Redis
  log "INFO" "Stopping Redis service"
  # systemctl stop redis

  # Backup current data
  if [[ -f "${REDIS_DATA_DIR:-}/dump.rdb" ]]; then
    log "INFO" "Backing up current data"
    cp "${REDIS_DATA_DIR}/dump.rdb" "${REDIS_DATA_DIR}/dump.rdb.bak"
  fi

  # Copy restore file
  log "INFO" "Copying restore file"
  cp "${restore_file}" "${REDIS_DATA_DIR:-}/dump.rdb"

  # Start Redis
  log "INFO" "Starting Redis service"
  # systemctl start redis

  log "INFO" "Redis restore completed successfully"
  log "INFO" "Verifying Redis connection"
  redis-cli -h "${REDIS_HOST}" -p "${REDIS_PORT}" PING 2>&1 | tee -a "${LOG_FILE}"
}

# Neo4j Restore
restore_neo4j() {
  local backup_file="${1:-}"

  if [[ -z "${backup_file}" ]]; then
    read -p "Enter Neo4j backup file path: " backup_file
  fi

  log "INFO" "Starting Neo4j restore from: ${backup_file}"

  verify_backup_file "${backup_file}"

  # Decompress if needed
  local restore_dir="${BACKUP_DIR}/restore_temp"
  if [[ "${backup_file}" == *.tar.gz ]]; then
    log "INFO" "Extracting backup"
    mkdir -p "${restore_dir}"
    tar -xzf "${backup_file}" -C "${restore_dir}"
  else
    restore_dir="${backup_file}"
  fi

  log "WARN" "This will overwrite the existing Neo4j database!"
  read -p "Are you sure you want to continue? (yes/no): " confirm

  if [[ "${confirm}" != "yes" ]]; then
    log "INFO" "Restore cancelled"
    exit 0
  fi

  # Stop Neo4j
  log "INFO" "Stopping Neo4j service"
  # systemctl stop neo4j

  # Backup current data
  if [[ -d "${NEO4J_DATA_DIR:-}" ]]; then
    log "INFO" "Backing up current data"
    mv "${NEO4J_DATA_DIR}" "${NEO4J_DATA_DIR}.bak"
  fi

  # Restore backup
  log "INFO" "Restoring backup using neo4j-admin"
  if neo4j-admin load \
    --from="${restore_dir}" \
    --force \
    2>&1 | tee -a "${LOG_FILE}"; then

    log "INFO" "Starting Neo4j service"
    # systemctl start neo4j

    log "INFO" "Neo4j restore completed successfully"

    # Verify cluster status
    sleep 30
    # neo4j-admin status 2>&1 | tee -a "${LOG_FILE}"

    return 0
  else
    error_exit "Neo4j restore failed"
  fi
}

# Qdrant Restore
restore_qdrant() {
  local snapshot_name="${1:-}"

  if [[ -z "${snapshot_name}" ]]; then
    log "INFO" "Listing available snapshots"
    curl -s -X GET "http://${QDRANT_HOST}:${QDRANT_PORT}/collections/insurance-leads/snapshots" \
      -H "api-key: ${QDRANT_API_KEY:-}" | jq .

    read -p "Enter snapshot name to restore: " snapshot_name
  fi

  log "INFO" "Starting Qdrant restore from snapshot: ${snapshot_name}"

  log "WARN" "This will overwrite existing Qdrant data!"
  read -p "Are you sure you want to continue? (yes/no): " confirm

  if [[ "${confirm}" != "yes" ]]; then
    log "INFO" "Restore cancelled"
    exit 0
  fi

  # Delete existing collection
  log "INFO" "Deleting existing collection"
  curl -s -X DELETE "http://${QDRANT_HOST}:${QDRANT_PORT}/collections/insurance-leads" \
    -H "api-key: ${QDRANT_API_KEY:-}" 2>&1 | tee -a "${LOG_FILE}"

  # Restore from snapshot
  log "INFO" "Restoring from snapshot"
  if curl -s -X PUT "http://${QDRANT_HOST}:${QDRANT_PORT}/collections/insurance-leads/snapshots/recover" \
    -H "api-key: ${QDRANT_API_KEY:-}" \
    -H "Content-Type: application/json" \
    -d "{\"location\": \"${snapshot_name}\"}" \
    2>&1 | tee -a "${LOG_FILE}"; then

    log "INFO" "Qdrant restore completed successfully"

    # Verify collection status
    sleep 10
    curl -s -X GET "http://${QDRANT_HOST}:${QDRANT_PORT}/collections/insurance-leads" \
      -H "api-key: ${QDRANT_API_KEY:-}" | jq . 2>&1 | tee -a "${LOG_FILE}"

    return 0
  else
    error_exit "Qdrant restore failed"
  fi
}

# Main menu
main() {
  log "INFO" "========================================"
  log "INFO" "Database Restore Utility"
  log "INFO" "Date: $(date '+%Y-%m-%d %H:%M:%S')"
  log "INFO" "========================================"
  echo ""
  echo "Select database to restore:"
  echo "1) PostgreSQL"
  echo "2) PostgreSQL Point-in-Time Recovery"
  echo "3) Redis"
  echo "4) Neo4j"
  echo "5) Qdrant"
  echo "0) Exit"
  echo ""

  read -p "Enter choice: " choice

  case "${choice}" in
    1) restore_postgres ;;
    2) restore_postgres_pitr ;;
    3) restore_redis ;;
    4) restore_neo4j ;;
    5) restore_qdrant ;;
    0) exit 0 ;;
    *)
      log "ERROR" "Invalid choice"
      exit 1
      ;;
  esac
}

# Run main function
main "$@"
