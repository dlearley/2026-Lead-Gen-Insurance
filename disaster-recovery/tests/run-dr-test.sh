#!/bin/bash

# Disaster Recovery Test Runner
# This script executes comprehensive DR testing scenarios

set -e
set -o pipefail

# Configuration
TEST_DIR="/home/engine/project/disaster-recovery/tests"
REPORT_DIR="/home/engine/project/disaster-recovery/tests/reports"
TIMESTAMP=$(date +"%Y%m%d-%H%M%S")
LOG_FILE="$REPORT_DIR/dr-test-$TIMESTAMP.log"

# Create report directory if it doesn't exist
mkdir -p "$REPORT_DIR"

# Logging function
log() {
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

log "=== Starting Disaster Recovery Test ==="
log "Test ID: DR-TEST-$TIMESTAMP"

# Start timer
START_TIME=$(date +%s)

# Initialize test results
TEST_RESULTS=()

# 1. Test PostgreSQL Recovery
log "1. Testing PostgreSQL Recovery..."

cd "$TEST_DIR"
if ./test-postgres-recovery.sh; then
    POSTGRES_DURATION=$?
    TEST_RESULTS+=("postgres:PASS:$POSTGRES_DURATION")
    log "✅ PostgreSQL recovery test PASSED"
else
    TEST_RESULTS+=("postgres:FAIL:0")
    log "❌ PostgreSQL recovery test FAILED"
fi

# 2. Test Neo4j Recovery
log "2. Testing Neo4j Recovery..."

if ./test-neo4j-recovery.sh; then
    NEO4J_DURATION=$?
    TEST_RESULTS+=("neo4j:PASS:$NEO4J_DURATION")
    log "✅ Neo4j recovery test PASSED"
else
    TEST_RESULTS+=("neo4j:FAIL:0")
    log "❌ Neo4j recovery test FAILED"
fi

# 3. Test Redis Recovery
log "3. Testing Redis Recovery..."

if ./test-redis-recovery.sh; then
    REDIS_DURATION=$?
    TEST_RESULTS+=("redis:PASS:$REDIS_DURATION")
    log "✅ Redis recovery test PASSED"
else
    TEST_RESULTS+=("redis:FAIL:0")
    log "❌ Redis recovery test FAILED"
fi

# 4. Test Qdrant Recovery
log "4. Testing Qdrant Recovery..."

if ./test-qdrant-recovery.sh; then
    QDRANT_DURATION=$?
    TEST_RESULTS+=("qdrant:PASS:$QDRANT_DURATION")
    log "✅ Qdrant recovery test PASSED"
else
    TEST_RESULTS+=("qdrant:FAIL:0")
    log "❌ Qdrant recovery test FAILED"
fi

# 5. Test Full Infrastructure Recovery
log "5. Testing Full Infrastructure Recovery..."

if ./test-full-recovery.sh; then
    FULL_DURATION=$?
    TEST_RESULTS+=("full:PASS:$FULL_DURATION")
    log "✅ Full infrastructure recovery test PASSED"
else
    TEST_RESULTS+=("full:FAIL:0")
    log "❌ Full infrastructure recovery test FAILED"
fi

# 6. Test RTO/RPO Validation
log "6. Testing RTO/RPO Validation..."

if ./validate-rto-rpo.sh; then
    RTO_RPO_RESULT=$?
    TEST_RESULTS+=("rto_rpo:PASS:$RTO_RPO_RESULT")
    log "✅ RTO/RPO validation test PASSED"
else
    TEST_RESULTS+=("rto_rpo:FAIL:0")
    log "❌ RTO/RPO validation test FAILED"
fi

# Calculate total test time
END_TIME=$(date +%s)
TOTAL_DURATION=$((END_TIME - START_TIME))

# Calculate pass/fail counts
PASS_COUNT=0
FAIL_COUNT=0
TOTAL_RTO=0

for result in "${TEST_RESULTS[@]}"; do
    IFS=':' read -r component status duration <<< "$result"
    if [ "$status" = "PASS" ]; then
        ((PASS_COUNT++))
        TOTAL_RTO=$((TOTAL_RTO + duration))
    else
        ((FAIL_COUNT++))
    fi
done

# Generate test report
cat > "$REPORT_DIR/dr-test-report-$TIMESTAMP.json" << EOF
{
  "test_id": "DR-TEST-$TIMESTAMP",
  "timestamp": "$(date -Iseconds)",
  "total_duration_seconds": $TOTAL_DURATION,
  "tests_passed": $PASS_COUNT,
  "tests_failed": $FAIL_COUNT,
  "overall_status": "${FAIL_COUNT:-0}",
  "rto_achieved_seconds": $TOTAL_RTO,
  "rto_target_seconds": 3600,
  "rpo_target_seconds": 900,
  "test_results": [
    $(for result in "${TEST_RESULTS[@]}"; do
        IFS=':' read -r component status duration <<< "$result"
        echo "    {"
        echo "      \"component\": \"$component\","
        echo "      \"status\": \"$status\","
        echo "      \"duration_seconds\": $duration"
        echo "    },"
    done | sed '$ s/,$//')
  ],
  "recommendations": [
    "Review failed tests and improve recovery procedures",
    "Optimize recovery times to meet RTO targets",
    "Document lessons learned from test failures",
    "Update runbooks based on test results",
    "Schedule regular DR testing to maintain readiness"
  ]
}
EOF

log "=== Disaster Recovery Test Completed ==="
log "Test ID: DR-TEST-$TIMESTAMP"
log "Total Duration: $TOTAL_DURATION seconds"
log "Tests Passed: $PASS_COUNT"
log "Tests Failed: $FAIL_COUNT"
log "Overall Status: ${FAIL_COUNT:-0}"
log "Report: $REPORT_DIR/dr-test-report-$TIMESTAMP.json"
log "Log File: $LOG_FILE"

# Exit with appropriate code
if [ $FAIL_COUNT -eq 0 ]; then
    log "🎉 All DR tests passed successfully!"
    exit 0
else
    log "⚠️  Some DR tests failed. Review the report for details."
    exit 1
fi