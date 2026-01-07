#!/bin/bash
# Automated database backup script
# Usage: ./backup-database.sh [full|incremental|wal]

set -e

# Configuration
DATABASE_URL="${DATABASE_URL:-postgresql://user:password@localhost:5432/insurance_leads}"
BACKUP_DIR="${BACKUP_DIR:-/var/backups/postgresql}"
S3_BUCKET="${S3_BUCKET:-insurance-leads-backups}"
S3_PREFIX="${S3_PREFIX:-backups}"
RETENTION_DAYS="${RETENTION_DAYS:-30}"
ENCRYPTION_KEY="${ENCRYPTION_KEY}"

# Create backup directory if it doesn't exist
mkdir -p "$BACKUP_DIR"

# Function to log messages
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1"
}

# Function to perform full backup
full_backup() {
    local timestamp=$(date +%Y%m%d_%H%M%S)
    local backup_file="full_${timestamp}.sql"
    local backup_path="$BACKUP_DIR/$backup_file"

    log "Starting full database backup..."

    # Perform backup
    pg_dump "$DATABASE_URL" \
        --format=plain \
        --no-owner \
        --no-acl \
        --verbose \
        --file="$backup_path"

    local size=$(du -h "$backup_path" | cut -f1)
    log "Full backup completed: $backup_file (Size: $size)"

    # Compress backup
    gzip "$backup_path"
    backup_path="${backup_path}.gz"
    log "Backup compressed: ${backup_path}.gz"

    # Upload to S3
    if [ -n "$S3_BUCKET" ]; then
        aws s3 cp "$backup_path" \
            "s3://${S3_BUCKET}/${S3_PREFIX}/full/${backup_file}.gz" \
            --storage-class STANDARD_IA

        log "Backup uploaded to S3: s3://${S3_BUCKET}/${S3_PREFIX}/full/${backup_file}.gz"

        # Set lifecycle policy
        aws s3api put-object-tagging \
            --bucket "$S3_BUCKET" \
            --key "${S3_PREFIX}/full/${backup_file}.gz" \
            --tagging "BackupType=FULL,Date=$(date +%Y-%m-%d)"
    fi

    # Encrypt if key provided
    if [ -n "$ENCRYPTION_KEY" ]; then
        openssl enc -aes-256-cbc -salt -in "$backup_path" -out "${backup_path}.enc" -k "$ENCRYPTION_KEY"
        rm "$backup_path"
        backup_path="${backup_path}.enc"
        log "Backup encrypted: $backup_path"
    fi

    # Cleanup old backups
    cleanup_old_backups "full"

    echo "$backup_path"
}

# Function to perform incremental backup
incremental_backup() {
    local timestamp=$(date +%Y%m%d_%H%M%S)
    local backup_file="incremental_${timestamp}.sql"
    local backup_path="$BACKUP_DIR/$backup_file"

    log "Starting incremental database backup..."

    # Perform data-only backup
    pg_dump "$DATABASE_URL" \
        --data-only \
        --format=plain \
        --no-owner \
        --no-acl \
        --verbose \
        --file="$backup_path"

    local size=$(du -h "$backup_path" | cut -f1)
    log "Incremental backup completed: $backup_file (Size: $size)"

    # Compress backup
    gzip "$backup_path"
    backup_path="${backup_path}.gz"
    log "Backup compressed: ${backup_path}.gz"

    # Upload to S3
    if [ -n "$S3_BUCKET" ]; then
        aws s3 cp "$backup_path" \
            "s3://${S3_BUCKET}/${S3_PREFIX}/incremental/${backup_file}.gz" \
            --storage-class STANDARD_IA

        log "Backup uploaded to S3: s3://${S3_BUCKET}/${S3_PREFIX}/incremental/${backup_file}.gz"
    fi

    cleanup_old_backups "incremental"

    echo "$backup_path"
}

# Function to perform WAL backup
wal_backup() {
    local timestamp=$(date +%Y%m%d_%H%M%S)
    local wal_dir="$BACKUP_DIR/wal"
    mkdir -p "$wal_dir"

    log "Starting WAL backup..."

    # Archive WAL files
    psql "$DATABASE_URL" \
        -c "SELECT pg_switch_wal();"

    # Copy WAL files
    pg_archivebackup \
        --directory="$wal_dir" \
        --compress

    log "WAL backup completed"

    # Upload to S3
    if [ -n "$S3_BUCKET" ]; then
        aws s3 sync "$wal_dir" \
            "s3://${S3_BUCKET}/${S3_PREFIX}/wal/" \
            --delete \
            --storage-class GLACIER_IR

        log "WAL files uploaded to S3"
    fi
}

# Function to cleanup old backups
cleanup_old_backups() {
    local backup_type="$1"
    local cutoff_date=$(date -d "$RETENTION_DAYS days ago" +%Y%m%d)

    log "Cleaning up old $backup_type backups older than $RETENTION_DAYS days..."

    # Cleanup local files
    find "$BACKUP_DIR" -name "${backup_type}_*.sql*" -type f -mtime +$RETENTION_DAYS -delete

    # Cleanup S3 files
    if [ -n "$S3_BUCKET" ]; then
        aws s3 ls "s3://${S3_BUCKET}/${S3_PREFIX}/${backup_type}/" | \
            awk -v date="$cutoff_date" '$1 < date {print $4}' | \
            xargs -I {} aws s3 rm "s3://${S3_BUCKET}/${S3_PREFIX}/${backup_type}/{}"
    fi

    log "Cleanup completed"
}

# Function to verify backup integrity
verify_backup() {
    local backup_file="$1"

    log "Verifying backup: $backup_file"

    if [ ! -f "$backup_file" ]; then
        log "ERROR: Backup file not found: $backup_file"
        return 1
    fi

    # Check file is not empty
    if [ ! -s "$backup_file" ]; then
        log "ERROR: Backup file is empty: $backup_file"
        return 1
    fi

    # For compressed files, test decompression
    if [[ "$backup_file" == *.gz ]]; then
        if ! gzip -t "$backup_file" 2>/dev/null; then
            log "ERROR: Backup file is corrupted: $backup_file"
            return 1
        fi
    fi

    log "Backup verification successful: $backup_file"
    return 0
}

# Function to restore from backup
restore_backup() {
    local backup_file="$1"
    local database="${2:-insurance_leads_restored}"

    log "Starting database restore from: $backup_file"

    if [ ! -f "$backup_file" ]; then
        log "ERROR: Backup file not found: $backup_file"
        return 1
    fi

    # Decrypt if needed
    if [[ "$backup_file" == *.enc ]]; then
        if [ -z "$ENCRYPTION_KEY" ]; then
            log "ERROR: ENCRYPTION_KEY required to decrypt backup"
            return 1
        fi
        openssl enc -d -aes-256-cbc -in "$backup_file" -out "${backup_file}.decrypted" -k "$ENCRYPTION_KEY"
        backup_file="${backup_file}.decrypted"
    fi

    # Decompress if needed
    if [[ "$backup_file" == *.gz ]]; then
        gunzip -k "$backup_file"
        backup_file="${backup_file%.gz}"
    fi

    # Drop existing database if exists
    psql -c "DROP DATABASE IF EXISTS $database;"

    # Create new database
    psql -c "CREATE DATABASE $database;"

    # Restore from backup
    psql "$DATABASE_URL/$database" < "$backup_file"

    log "Database restore completed: $database"
}

# Function to list available backups
list_backups() {
    log "Available backups:"

    echo ""
    echo "Local backups:"
    ls -lh "$BACKUP_DIR"/*.sql* 2>/dev/null || echo "  No local backups found"

    echo ""
    echo "S3 backups:"
    if [ -n "$S3_BUCKET" ]; then
        aws s3 ls "s3://${S3_BUCKET}/${S3_PREFIX}/" --recursive --human-readable
    else
        echo "  S3 not configured"
    fi
}

# Main execution
case "$1" in
    full)
        full_backup
        ;;
    incremental)
        incremental_backup
        ;;
    wal)
        wal_backup
        ;;
    verify)
        verify_backup "$2"
        ;;
    restore)
        restore_backup "$2" "$3"
        ;;
    list)
        list_backups
        ;;
    cleanup)
        cleanup_old_backups "full"
        cleanup_old_backups "incremental"
        ;;
    *)
        echo "Usage: $0 {full|incremental|wal|verify|restore|list|cleanup}"
        echo ""
        echo "Commands:"
        echo "  full          - Perform full database backup"
        echo "  incremental   - Perform incremental database backup"
        echo "  wal           - Perform WAL backup"
        echo "  verify FILE   - Verify backup integrity"
        echo "  restore FILE [DB] - Restore database from backup"
        echo "  list          - List available backups"
        echo "  cleanup       - Cleanup old backups"
        exit 1
        ;;
esac
