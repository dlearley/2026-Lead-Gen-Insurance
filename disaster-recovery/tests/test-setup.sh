#!/bin/bash

# Disaster Recovery Setup Test
# This script verifies that the disaster recovery setup is working correctly

set -e
set -o pipefail

# Configuration
TEST_DIR="/home/engine/project/disaster-recovery/tests"
TIMESTAMP=$(date +"%Y%m%d-%H%M%S")
LOG_FILE="$TEST_DIR/setup-test-$TIMESTAMP.log"

# Logging function
log() {
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

log "=== Starting Disaster Recovery Setup Test ==="

# Start timer
START_TIME=$(date +%s)

# 1. Test directory structure
log "1. Testing directory structure..."

REQUIRED_DIRS=(
    "/home/engine/project/disaster-recovery"
    "/home/engine/project/disaster-recovery/backups"
    "/home/engine/project/disaster-recovery/scripts"
    "/home/engine/project/disaster-recovery/runbooks"
    "/home/engine/project/disaster-recovery/tests"
)

for dir in "${REQUIRED_DIRS[@]}"; do
    if [ ! -d "$dir" ]; then
        log "❌ Missing directory: $dir"
        exit 1
    fi
done

log "✅ All required directories exist"

# 2. Test required scripts
log "2. Testing required scripts..."

REQUIRED_SCRIPTS=(
    "/home/engine/project/disaster-recovery/scripts/full-backup.sh"
    "/home/engine/project/disaster-recovery/scripts/full-recovery.sh"
    "/home/engine/project/disaster-recovery/tests/run-dr-test.sh"
    "/home/engine/project/disaster-recovery/tests/validate-rto-rpo.sh"
    "/home/engine/project/disaster-recovery/tests/test-postgres-recovery.sh"
)

for script in "${REQUIRED_SCRIPTS[@]}"; do
    if [ ! -f "$script" ]; then
        log "❌ Missing script: $script"
        exit 1
    fi
    if [ ! -x "$script" ]; then
        log "❌ Script not executable: $script"
        exit 1
    fi
done

log "✅ All required scripts exist and are executable"

# 3. Test required documentation
log "3. Testing required documentation..."

REQUIRED_DOCS=(
    "/home/engine/project/disaster-recovery/README.md"
    "/home/engine/project/disaster-recovery/runbooks/infrastructure-failure.md"
    "/home/engine/project/disaster-recovery/tests/README.md"
    "/home/engine/project/docs/DISASTER_RECOVERY_TESTING.md"
)

for doc in "${REQUIRED_DOCS[@]}"; do
    if [ ! -f "$doc" ]; then
        log "❌ Missing documentation: $doc"
        exit 1
    fi
done

log "✅ All required documentation exists"

# 4. Test backup directory permissions
log "4. Testing backup directory permissions..."

if [ ! -w "/home/engine/project/disaster-recovery/backups" ]; then
    log "❌ Backup directory not writable"
    exit 1
fi

log "✅ Backup directory is writable"

# 5. Test Docker availability
log "5. Testing Docker availability..."

if ! docker info >/dev/null 2>&1; then
    log "❌ Docker is not running"
    exit 1
fi

log "✅ Docker is running"

# 6. Test required Docker containers
log "6. Testing required Docker containers..."

cd /home/engine/project

# Start services if not running
docker compose up -d postgres redis neo4j qdrant nats

# Wait for services to be ready
log "   Waiting for services to initialize..."
sleep 30

# Check PostgreSQL with retry
log "   Checking PostgreSQL..."
for i in {1..10}; do
    if docker exec insurance-lead-gen-postgres pg_isready -U postgres >/dev/null 2>&1; then
        log "   ✅ PostgreSQL is ready"
        break
    fi
    sleep 5
    if [ $i -eq 10 ]; then
        log "   ❌ PostgreSQL failed to start"
        exit 1
    fi
done

# Check Redis with retry
log "   Checking Redis..."
for i in {1..10}; do
    if docker exec insurance-lead-gen-redis redis-cli ping | grep -q "PONG" >/dev/null 2>&1; then
        log "   ✅ Redis is ready"
        break
    fi
    sleep 5
    if [ $i -eq 10 ]; then
        log "   ❌ Redis failed to start"
        exit 1
    fi
done

# Check Neo4j with retry (takes longer to initialize)
log "   Checking Neo4j..."
for i in {1..20}; do
    if docker exec insurance-lead-gen-neo4j cypher-shell "RETURN 1;" >/dev/null 2>&1; then
        log "   ✅ Neo4j is ready"
        break
    fi
    sleep 10
    if [ $i -eq 20 ]; then
        log "   ❌ Neo4j failed to start"
        exit 1
    fi
done

# Check Qdrant with retry
log "   Checking Qdrant..."
for i in {1..10}; do
    if docker exec insurance-lead-gen-qdrant wget --quiet --tries=1 --spider http://localhost:6333/health >/dev/null 2>&1; then
        log "   ✅ Qdrant is ready"
        break
    fi
    sleep 5
    if [ $i -eq 10 ]; then
        log "   ❌ Qdrant failed to start"
        exit 1
    fi
done

# Check NATS with retry
log "   Checking NATS..."
for i in {1..10}; do
    if docker exec insurance-lead-gen-nats wget --quiet --tries=1 --spider http://localhost:8222/healthz >/dev/null 2>&1; then
        log "   ✅ NATS is ready"
        break
    fi
    sleep 5
    if [ $i -eq 10 ]; then
        log "   ❌ NATS failed to start"
        exit 1
    fi
done

log "✅ All required services are running"

# 7. Test backup creation
log "7. Testing backup creation..."

# Create a test backup
TEST_BACKUP="$TEST_DIR/test-backup-$TIMESTAMP.sql.gz"
docker exec insurance-lead-gen-postgres pg_dump -U postgres postgres | gzip > "$TEST_BACKUP"

if [ ! -f "$TEST_BACKUP" ] || [ ! -s "$TEST_BACKUP" ]; then
    log "❌ Test backup creation failed"
    exit 1
fi

log "✅ Test backup created successfully"

# Clean up test backup
rm -f "$TEST_BACKUP"

# Calculate test duration
END_TIME=$(date +%s)
DURATION=$((END_TIME - START_TIME))

# Create test report
cat > "$TEST_DIR/setup-test-report-$TIMESTAMP.json" << EOF
{
  "test_id": "setup-test-$TIMESTAMP",
  "timestamp": "$(date -Iseconds)",
  "duration_seconds": $DURATION,
  "status": "SUCCESS",
  "test_results": [
    {
      "component": "directory_structure",
      "status": "PASS",
      "details": "All required directories exist"
    },
    {
      "component": "scripts",
      "status": "PASS",
      "details": "All required scripts exist and are executable"
    },
    {
      "component": "documentation",
      "status": "PASS",
      "details": "All required documentation exists"
    },
    {
      "component": "permissions",
      "status": "PASS",
      "details": "Backup directory is writable"
    },
    {
      "component": "docker",
      "status": "PASS",
      "details": "Docker is running"
    },
    {
      "component": "services",
      "status": "PASS",
      "details": "All required services are running"
    },
    {
      "component": "backup_creation",
      "status": "PASS",
      "details": "Test backup created successfully"
    }
  ],
  "recommendations": [
    "Run full backup test to validate backup procedures",
    "Execute disaster recovery tests to validate recovery procedures",
    "Document test results for audit purposes",
    "Schedule regular testing to maintain readiness"
  ]
}
EOF

log "=== Disaster Recovery Setup Test Completed ==="
log "Test ID: setup-test-$TIMESTAMP"
log "Duration: $DURATION seconds"
log "Status: SUCCESS"
log "Report: $TEST_DIR/setup-test-report-$TIMESTAMP.json"
log "Log File: $LOG_FILE"

log "🎉 Disaster recovery setup is working correctly!"
log "📋 Next steps:"
log "   1. Run full backup: ./disaster-recovery/scripts/full-backup.sh"
log "   2. Test recovery: ./disaster-recovery/tests/run-dr-test.sh"
log "   3. Validate RTO/RPO: ./disaster-recovery/tests/validate-rto-rpo.sh"

exit 0