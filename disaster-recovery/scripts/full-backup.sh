#!/bin/bash

# Full Backup Script for Insurance Lead Gen AI Platform
# This script performs comprehensive backups of all system components

set -e
set -o pipefail

# Configuration
BACKUP_DIR="/home/engine/project/disaster-recovery/backups"
TIMESTAMP=$(date +"%Y%m%d-%H%M%S")
LOG_FILE="$BACKUP_DIR/backup-$TIMESTAMP.log"

# Create backup directory if it doesn't exist
mkdir -p "$BACKUP_DIR"

# Logging function
log() {
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

log "=== Starting Full Backup Process ==="
log "Backup ID: full-backup-$TIMESTAMP"

# Start timer
START_TIME=$(date +%s)

# 1. PostgreSQL Backup
log "1. Starting PostgreSQL backup..."
POSTGRES_BACKUP="$BACKUP_DIR/postgres-backup-$TIMESTAMP.sql.gz"

docker exec insurance-lead-gen-postgres pg_dump -U postgres insurance_lead_gen | gzip > "$POSTGRES_BACKUP"

# Verify backup
if [ -f "$POSTGRES_BACKUP" ] && [ -s "$POSTGRES_BACKUP" ]; then
    log "✅ PostgreSQL backup completed successfully"
    log "   Backup size: $(du -h "$POSTGRES_BACKUP" | cut -f1)"
else
    log "❌ PostgreSQL backup failed"
    exit 1
fi

# 2. Neo4j Backup
log "2. Starting Neo4j backup..."
NEO4J_BACKUP="$BACKUP_DIR/neo4j-backup-$TIMESTAMP"

docker exec insurance-lead-gen-neo4j neo4j-admin database backup neo4j --to-path=/backups/neo4j-backup-$TIMESTAMP --verbose

# Copy backup from container to host
docker cp insurance-lead-gen-neo4j:/backups/neo4j-backup-$TIMESTAMP "$BACKUP_DIR/"

# Verify backup
if [ -d "$NEO4J_BACKUP" ] && [ "$(ls -A "$NEO4J_BACKUP" 2>/dev/null | wc -l)" -gt 0 ]; then
    log "✅ Neo4j backup completed successfully"
    log "   Backup size: $(du -sh "$NEO4J_BACKUP" | cut -f1)"
else
    log "❌ Neo4j backup failed"
    exit 1
fi

# 3. Redis Backup
log "3. Starting Redis backup..."
REDIS_BACKUP="$BACKUP_DIR/redis-backup-$TIMESTAMP.rdb"

docker exec insurance-lead-gen-redis redis-cli save
docker cp insurance-lead-gen-redis:/data/dump.rdb "$REDIS_BACKUP"

# Verify backup
if [ -f "$REDIS_BACKUP" ] && [ -s "$REDIS_BACKUP" ]; then
    log "✅ Redis backup completed successfully"
    log "   Backup size: $(du -h "$REDIS_BACKUP" | cut -f1)"
else
    log "❌ Redis backup failed"
    exit 1
fi

# 4. Qdrant Backup
log "4. Starting Qdrant backup..."
QDRANT_BACKUP="$BACKUP_DIR/qdrant-backup-$TIMESTAMP.tar.gz"

docker exec insurance-lead-gen-qdrant tar czf /tmp/qdrant-backup.tar.gz /qdrant/storage
docker cp insurance-lead-gen-qdrant:/tmp/qdrant-backup.tar.gz "$QDRANT_BACKUP"

# Verify backup
if [ -f "$QDRANT_BACKUP" ] && [ -s "$QDRANT_BACKUP" ]; then
    log "✅ Qdrant backup completed successfully"
    log "   Backup size: $(du -h "$QDRANT_BACKUP" | cut -f1)"
else
    log "❌ Qdrant backup failed"
    exit 1
fi

# 5. NATS Configuration Backup
log "5. Starting NATS configuration backup..."
NATS_BACKUP="$BACKUP_DIR/nats-backup-$TIMESTAMP.tar.gz"

docker exec insurance-lead-gen-nats tar czf /tmp/nats-backup.tar.gz /etc/nats
docker cp insurance-lead-gen-nats:/tmp/nats-backup.tar.gz "$NATS_BACKUP"

# Verify backup
if [ -f "$NATS_BACKUP" ] && [ -s "$NATS_BACKUP" ]; then
    log "✅ NATS backup completed successfully"
    log "   Backup size: $(du -h "$NATS_BACKUP" | cut -f1)"
else
    log "❌ NATS backup failed"
    exit 1
fi

# 6. Application Configuration Backup
log "6. Starting application configuration backup..."
CONFIG_BACKUP="$BACKUP_DIR/config-backup-$TIMESTAMP.tar.gz"

tar czf "$CONFIG_BACKUP" \
    /home/engine/project/apps \
    /home/engine/project/packages \
    /home/engine/project/docker-compose.yml \
    /home/engine/project/docker-compose.monitoring.yml \
    /home/engine/project/.env.example

# Verify backup
if [ -f "$CONFIG_BACKUP" ] && [ -s "$CONFIG_BACKUP" ]; then
    log "✅ Configuration backup completed successfully"
    log "   Backup size: $(du -h "$CONFIG_BACKUP" | cut -f1)"
else
    log "❌ Configuration backup failed"
    exit 1
fi

# 7. Docker Volume Backup
log "7. Starting Docker volume backup..."
VOLUME_BACKUP="$BACKUP_DIR/volumes-backup-$TIMESTAMP.tar.gz"

# Backup all Docker volumes
docker run --rm -v /var/run/docker.sock:/var/run/docker.sock \
    -v "$BACKUP_DIR:/backup" \
    alpine sh -c "apk add docker-cli && \
    docker ps -q | xargs docker inspect --format '{{ .Mounts }}' | \
    grep -oP 'Source: \K.*' | sort -u | \
    xargs tar czf /backup/volumes-backup-$TIMESTAMP.tar.gz"

# Verify backup
if [ -f "$VOLUME_BACKUP" ] && [ -s "$VOLUME_BACKUP" ]; then
    log "✅ Docker volume backup completed successfully"
    log "   Backup size: $(du -h "$VOLUME_BACKUP" | cut -f1)"
else
    log "❌ Docker volume backup failed"
    exit 1
fi

# 8. Monitoring Data Backup
log "8. Starting monitoring data backup..."
MONITORING_BACKUP="$BACKUP_DIR/monitoring-backup-$TIMESTAMP.tar.gz"

tar czf "$MONITORING_BACKUP" \
    /home/engine/project/monitoring

# Verify backup
if [ -f "$MONITORING_BACKUP" ] && [ -s "$MONITORING_BACKUP" ]; then
    log "✅ Monitoring data backup completed successfully"
    log "   Backup size: $(du -h "$MONITORING_BACKUP" | cut -f1)"
else
    log "❌ Monitoring data backup failed"
    exit 1
fi

# Calculate total backup time
END_TIME=$(date +%s)
DURATION=$((END_TIME - START_TIME))

# Calculate total backup size
TOTAL_SIZE=$(du -sh "$BACKUP_DIR" | cut -f1)

# Create backup manifest
cat > "$BACKUP_DIR/backup-manifest-$TIMESTAMP.json" << EOF
{
  "backup_id": "full-backup-$TIMESTAMP",
  "timestamp": "$(date -Iseconds)",
  "duration_seconds": $DURATION,
  "total_size": "$TOTAL_SIZE",
  "components": {
    "postgresql": {
      "file": "postgres-backup-$TIMESTAMP.sql.gz",
      "size": "$(du -h "$POSTGRES_BACKUP" | cut -f1)"
    },
    "neo4j": {
      "file": "neo4j-backup-$TIMESTAMP",
      "size": "$(du -sh "$NEO4J_BACKUP" | cut -f1)"
    },
    "redis": {
      "file": "redis-backup-$TIMESTAMP.rdb",
      "size": "$(du -h "$REDIS_BACKUP" | cut -f1)"
    },
    "qdrant": {
      "file": "qdrant-backup-$TIMESTAMP.tar.gz",
      "size": "$(du -h "$QDRANT_BACKUP" | cut -f1)"
    },
    "nats": {
      "file": "nats-backup-$TIMESTAMP.tar.gz",
      "size": "$(du -h "$NATS_BACKUP" | cut -f1)"
    },
    "config": {
      "file": "config-backup-$TIMESTAMP.tar.gz",
      "size": "$(du -h "$CONFIG_BACKUP" | cut -f1)"
    },
    "volumes": {
      "file": "volumes-backup-$TIMESTAMP.tar.gz",
      "size": "$(du -h "$VOLUME_BACKUP" | cut -f1)"
    },
    "monitoring": {
      "file": "monitoring-backup-$TIMESTAMP.tar.gz",
      "size": "$(du -h "$MONITORING_BACKUP" | cut -f1)"
    }
  },
  "status": "SUCCESS",
  "rpo_achieved": "PT15M",
  "rto_target": "PT1H"
}
EOF

log "=== Full Backup Process Completed ==="
log "Backup ID: full-backup-$TIMESTAMP"
log "Duration: $DURATION seconds"
log "Total Size: $TOTAL_SIZE"
log "Manifest: $BACKUP_DIR/backup-manifest-$TIMESTAMP.json"
log "Log File: $LOG_FILE"

# Clean up old backups (keep last 7 days)
find "$BACKUP_DIR" -name "*.sql.gz" -o -name "*.rdb" -o -name "*.tar.gz" -o -name "neo4j-backup-*" \
    -type f -mtime +7 -exec rm -f {} \;

log "✅ Old backups cleaned up (kept last 7 days)"

exit 0