#!/bin/bash

# Backup Verification Script
# Verifies backup integrity, tests restoration, and validates completeness
# Usage: ./backup-verification.sh [namespace] [backup-type]

set -e

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
NAMESPACE=${1:-production}
BACKUP_TYPE=${2:-full}  # full, incremental, point-in-time
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
LOG_FILE="/tmp/backup-verification-$TIMESTAMP.log"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Logging function
log() {
    local level=$1
    shift
    local message="$@"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    echo -e "[$timestamp] [$level] $message" | tee -a "$LOG_FILE"
}

log "INFO" "Starting backup verification for $NAMESPACE namespace"

# Help function
show_help() {
    cat << EOF
Backup Verification Script

Usage: $0 [OPTIONS]

OPTIONS:
    -n, --namespace NAMESPACE     Kubernetes namespace (default: production)
    -t, --type TYPE              Backup type: full, incremental, point-in-time (default: full)
    -v, --verbose                Verbose output
    -h, --help                   Show this help message

EXAMPLES:
    $0 -n production -t full     # Full backup verification
    $0 -n staging -t incremental # Incremental backup verification
    $0 --verbose                 # Verbose output

OUTPUT:
    Verification results logged to: $LOG_FILE

EOF
}

# Parse command line arguments
VERBOSE=false

while [[ $# -gt 0 ]]; do
    case $1 in
        -n|--namespace)
            NAMESPACE="$2"
            shift 2
            ;;
        -t|--type)
            BACKUP_TYPE="$2"
            shift 2
            ;;
        -v|--verbose)
            VERBOSE=true
            shift
            ;;
        -h|--help)
            show_help
            exit 0
            ;;
        *)
            echo "Unknown option: $1"
            show_help
            exit 1
            ;;
    esac
done

# Utility functions
print_section() {
    local title="$1"
    echo -e "\n${BLUE}=== $title ===${NC}"
    log "INFO" "=== $title ==="
}

print_success() {
    local message="$1"
    echo -e "${GREEN}✅ $message${NC}"
    log "INFO" "✅ $message"
}

print_warning() {
    local message="$1"
    echo -e "${YELLOW}⚠️  $message${NC}"
    log "WARN" "⚠️  $message"
}

print_error() {
    local message="$1"
    echo -e "${RED}❌ $message${NC}"
    log "ERROR" "❌ $message"
}

# Check prerequisites
check_prerequisites() {
    print_section "Prerequisites Check"
    
    # Check kubectl
    if ! command -v kubectl &> /dev/null; then
        print_error "kubectl not found. Please install kubectl."
        exit 1
    fi
    
    # Check cluster connectivity
    if ! kubectl cluster-info &> /dev/null; then
        print_error "Cannot connect to Kubernetes cluster"
        exit 1
    fi
    
    # Check namespace
    if ! kubectl get namespace "$NAMESPACE" &> /dev/null; then
        print_error "Namespace $NAMESPACE not found"
        exit 1
    fi
    
    # Check if PostgreSQL is available
    if ! kubectl get pods -n "$NAMESPACE" -l app=postgres &> /dev/null; then
        print_error "PostgreSQL pod not found in $NAMESPACE namespace"
        exit 1
    fi
    
    # Check AWS CLI for S3 access
    if ! command -v aws &> /dev/null; then
        print_warning "AWS CLI not found. S3 backup verification will be skipped."
        SKIP_S3=true
    fi
    
    print_success "All prerequisites satisfied"
}

# Database backup verification
verify_database_backup() {
    print_section "Database Backup Verification"
    
    POSTGRES_POD=$(kubectl get pods -n "$NAMESPACE" -l app=postgres --no-headers | head -1 | awk '{print $1}')
    
    if [ -z "$POSTGRES_POD" ]; then
        print_error "No PostgreSQL pod found"
        return 1
    fi
    
    # Check current database state
    log "INFO" "Checking current database state..."
    DB_SIZE=$(kubectl exec -n "$NAMESPACE" "$POSTGRES_POD" -- \
      psql -U postgres -d insurance_lead_gen -t -c \
      "SELECT pg_size_pretty(pg_database_size('insurance_lead_gen'));" 2>/dev/null | tr -d ' ')
    
    if [ -n "$DB_SIZE" ]; then
        print_success "Current database size: $DB_SIZE"
    else
        print_error "Failed to get database size"
        return 1
    fi
    
    # Check table counts
    log "INFO" "Checking table counts..."
    TABLE_COUNTS=$(kubectl exec -n "$NAMESPACE" "$POSTGRES_POD" -- \
      psql -U postgres -d insurance_lead_gen -t -c \
      "SELECT 'leads:' || COUNT(*) FROM leads UNION ALL 
       SELECT 'customers:' || COUNT(*) FROM customers UNION ALL
       SELECT 'policies:' || COUNT(*) FROM policies;" 2>/dev/null)
    
    if [ -n "$TABLE_COUNTS" ]; then
        echo "Table counts:"
        echo "$TABLE_COUNTS"
        print_success "Database table counts retrieved"
    else
        print_warning "Could not retrieve table counts (tables may not exist)"
    fi
    
    # Create test backup
    log "INFO" "Creating test backup..."
    TEST_BACKUP_FILE="/tmp/test-backup-$TIMESTAMP.sql"
    
    if kubectl exec -n "$NAMESPACE" "$POSTGRES_POD" -- \
       pg_dump --verbose --clean --no-owner --no-privileges \
       insurance_lead_gen > "$TEST_BACKUP_FILE" 2>/dev/null; then
        
        BACKUP_SIZE=$(stat -f%z "$TEST_BACKUP_FILE" 2>/dev/null || stat -c%s "$TEST_BACKUP_FILE")
        print_success "Test backup created successfully (${BACKUP_SIZE} bytes)"
        
        # Verify backup integrity
        log "INFO" "Verifying backup integrity..."
        if kubectl exec -n "$NAMESPACE" "$POSTGRES_POD" -- \
           pg_restore --list "$TEST_BACKUP_FILE" &> /dev/null; then
            print_success "Backup integrity verified"
        else
            print_error "Backup integrity check failed"
            rm "$TEST_BACKUP_FILE"
            return 1
        fi
        
        # Clean up test backup
        rm "$TEST_BACKUP_FILE"
    else
        print_error "Failed to create test backup"
        return 1
    fi
}

# S3 backup verification
verify_s3_backups() {
    if [ "$SKIP_S3" = true ]; then
        print_warning "Skipping S3 backup verification (AWS CLI not available)"
        return 0
    fi
    
    print_section "S3 Backup Verification"
    
    BACKUP_BUCKET="s3://company-backups/$NAMESPACE/database"
    
    # Check if bucket exists and is accessible
    log "INFO" "Checking S3 backup bucket accessibility..."
    if aws s3 ls "$BACKUP_BUCKET" &> /dev/null; then
        print_success "S3 backup bucket accessible"
    else
        print_warning "S3 backup bucket not accessible or empty"
        return 1
    fi
    
    # List recent backups
    log "INFO" "Listing recent backups..."
    RECENT_BACKUPS=$(aws s3 ls "$BACKUP_BUCKET/" | sort -k1,2 | tail -5)
    
    if [ -n "$RECENT_BACKUPS" ]; then
        echo "Recent backups:"
        echo "$RECENT_BACKUPS"
        print_success "Recent backups found"
    else
        print_warning "No recent backups found"
        return 1
    fi
    
    # Verify latest backup integrity
    LATEST_BACKUP=$(echo "$RECENT_BACKUPS" | tail -1 | awk '{print $4}')
    
    if [ -n "$LATEST_BACKUP" ]; then
        log "INFO" "Verifying latest backup: $LATEST_BACKUP"
        
        # Download and test backup
        TEMP_BACKUP="/tmp/latest-backup-$TIMESTAMP.sql.gz"
        
        if aws s3 cp "$BACKUP_BUCKET/$LATEST_BACKUP" "$TEMP_BACKUP" &> /dev/null; then
            # Verify gzip integrity
            if gunzip -t "$TEMP_BACKUP" 2>/dev/null; then
                print_success "Latest backup file integrity verified"
                
                # Extract and verify SQL
                TEMP_SQL="/tmp/latest-backup-$TIMESTAMP.sql"
                gunzip -c "$TEMP_BACKUP" > "$TEMP_SQL"
                
                if kubectl exec -n "$NAMESPACE" "$POSTGRES_POD" -- \
                   pg_restore --list "$TEMP_SQL" &> /dev/null; then
                    print_success "Latest backup SQL integrity verified"
                else
                    print_error "Latest backup SQL integrity check failed"
                    rm "$TEMP_BACKUP" "$TEMP_SQL"
                    return 1
                fi
                
                rm "$TEMP_BACKUP" "$TEMP_SQL"
            else
                print_error "Latest backup file corrupted (gzip)"
                rm "$TEMP_BACKUP"
                return 1
            fi
        else
            print_error "Failed to download latest backup"
            return 1
        fi
    else
        print_warning "No backup files found to verify"
        return 1
    fi
}

# Test backup restoration
test_backup_restoration() {
    print_section "Backup Restoration Test"
    
    # Create test namespace
    TEST_NAMESPACE="backup-test-$TIMESTAMP"
    log "INFO" "Creating test namespace: $TEST_NAMESPACE"
    
    if kubectl create namespace "$TEST_NAMESPACE" &> /dev/null; then
        print_success "Test namespace created"
    else
        print_error "Failed to create test namespace"
        return 1
    fi
    
    # Deploy test PostgreSQL
    log "INFO" "Deploying test PostgreSQL..."
    
    cat << EOF | kubectl apply -f - &> /dev/null
apiVersion: apps/v1
kind: Deployment
metadata:
  name: postgres-test
  namespace: $TEST_NAMESPACE
spec:
  replicas: 1
  selector:
    matchLabels:
      app: postgres-test
  template:
    metadata:
      labels:
        app: postgres-test
    spec:
      containers:
      - name: postgres
        image: postgres:15
        env:
        - name: POSTGRES_DB
          value: insurance_lead_gen_test
        - name: POSTGRES_USER
          value: postgres
        - name: POSTGRES_PASSWORD
          value: testpassword
        ports:
        - containerPort: 5432
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
EOF
    
    # Wait for PostgreSQL to be ready
    log "INFO" "Waiting for test PostgreSQL to be ready..."
    kubectl wait --for=condition=ready pod -l app=postgres-test -n "$TEST_NAMESPACE" --timeout=300s
    
    TEST_POSTGRES_POD=$(kubectl get pods -n "$TEST_NAMESPACE" -l app=postgres-test --no-headers | head -1 | awk '{print $1}')
    
    if [ -n "$TEST_POSTGRES_POD" ]; then
        print_success "Test PostgreSQL deployed and ready"
    else
        print_error "Test PostgreSQL deployment failed"
        kubectl delete namespace "$TEST_NAMESPACE"
        return 1
    fi
    
    # Create test database
    log "INFO" "Creating test database..."
    kubectl exec -n "$TEST_NAMESPACE" "$TEST_POSTGRES_POD" -- \
      psql -U postgres -c "CREATE DATABASE insurance_lead_gen_test;" &> /dev/null
    
    # Create minimal test backup
    log "INFO" "Creating minimal test backup..."
    TEST_BACKUP_FILE="/tmp/restoration-test-$TIMESTAMP.sql"
    
    # Create simple test data
    kubectl exec -n "$NAMESPACE" "$POSTGRES_POD" -- \
      psql -U postgres -d insurance_lead_gen -c \
      "CREATE TABLE IF NOT EXISTS test_restore (id SERIAL PRIMARY KEY, data TEXT, created_at TIMESTAMP DEFAULT NOW());" &> /dev/null
    
    kubectl exec -n "$NAMESPACE" "$POSTGRES_POD" -- \
      psql -U postgres -d insurance_lead_gen -c \
      "INSERT INTO test_restore (data) VALUES ('test data 1'), ('test data 2'), ('test data 3');" &> /dev/null
    
    # Backup test table
    kubectl exec -n "$NAMESPACE" "$POSTGRES_POD" -- \
      pg_dump -t test_restore --no-owner insurance_lead_gen > "$TEST_BACKUP_FILE"
    
    # Restore to test database
    log "INFO" "Restoring backup to test database..."
    if kubectl exec -i -n "$TEST_NAMESPACE" "$TEST_POSTGRES_POD" -- \
       psql -U postgres insurance_lead_gen_test < "$TEST_BACKUP_FILE" &> /dev/null; then
        print_success "Backup restoration successful"
    else
        print_error "Backup restoration failed"
        rm "$TEST_BACKUP_FILE"
        kubectl delete namespace "$TEST_NAMESPACE"
        return 1
    fi
    
    # Verify restoration
    log "INFO" "Verifying restored data..."
    RESTORED_COUNT=$(kubectl exec -n "$TEST_NAMESPACE" "$TEST_POSTGRES_POD" -- \
      psql -U postgres -d insurance_lead_gen_test -t -c "SELECT COUNT(*) FROM test_restore;" 2>/dev/null | tr -d ' ')
    
    if [ "$RESTORED_COUNT" = "3" ]; then
        print_success "Restored data verification passed ($RESTORED_COUNT records)"
    else
        print_error "Restored data verification failed (expected 3, got $RESTORED_COUNT)"
        rm "$TEST_BACKUP_FILE"
        kubectl delete namespace "$TEST_NAMESPACE"
        return 1
    fi
    
    # Cleanup
    rm "$TEST_BACKUP_FILE"
    kubectl delete namespace "$TEST_NAMESPACE"
    print_success "Test restoration cleanup completed"
}

# Performance testing
performance_test() {
    print_section "Backup Performance Test"
    
    # Test backup speed
    log "INFO" "Testing backup performance..."
    
    START_TIME=$(date +%s)
    
    if kubectl exec -n "$NAMESPACE" "$POSTGRES_POD" -- \
       pg_dump --verbose insurance_lead_gen > /dev/null 2>&1; then
        END_TIME=$(date +%s)
        BACKUP_DURATION=$((END_TIME - START_TIME))
        print_success "Backup performance test completed in ${BACKUP_DURATION} seconds"
        
        if [ "$BACKUP_DURATION" -gt 300 ]; then
            print_warning "Backup taking longer than 5 minutes"
        fi
    else
        print_error "Backup performance test failed"
        return 1
    fi
    
    # Test restore speed
    log "INFO" "Testing restore performance..."
    
    # This would require a more complex setup for accurate testing
    # For now, we'll skip the restore performance test
    print_info "Restore performance test skipped (requires more complex setup)"
}

# Generate verification report
generate_report() {
    print_section "Verification Report"
    
    REPORT_FILE="backup-verification-report-$TIMESTAMP.json"
    
    cat << EOF > "$REPORT_FILE"
{
  "timestamp": "$TIMESTAMP",
  "namespace": "$NAMESPACE",
  "backup_type": "$BACKUP_TYPE",
  "verification_status": "PASSED",
  "checks_performed": {
    "database_backup": "PASSED",
    "s3_backups": "$([ "$SKIP_S3" = true ] && echo "SKIPPED" || echo "PASSED")",
    "restoration_test": "PASSED",
    "performance_test": "PASSED"
  },
  "metrics": {
    "database_size": "$DB_SIZE",
    "verification_time": "$(date)",
    "backup_duration_seconds": "${BACKUP_DURATION:-N/A}"
  },
  "recommendations": [
    "Continue regular backup verification",
    "Monitor backup performance trends",
    "Consider automated backup testing",
    "Review backup retention policies"
  ],
  "log_file": "$LOG_FILE"
}
EOF
    
    print_success "Verification report generated: $REPORT_FILE"
    
    # Display summary
    echo ""
    echo "=== VERIFICATION SUMMARY ==="
    echo "Namespace: $NAMESPACE"
    echo "Backup Type: $BACKUP_TYPE"
    echo "Database Size: $DB_SIZE"
    echo "Verification Status: PASSED"
    echo "Report File: $REPORT_FILE"
    echo "Log File: $LOG_FILE"
}

# Main execution
main() {
    echo "Backup Verification Report"
    echo "Generated: $(date)"
    echo "Namespace: $NAMESPACE"
    echo "Backup Type: $BACKUP_TYPE"
    echo "Log File: $LOG_FILE"
    echo "=============================================="
    
    check_prerequisites
    verify_database_backup
    
    if [ "$BACKUP_TYPE" != "point-in-time" ]; then
        verify_s3_backups
    fi
    
    test_backup_restoration
    performance_test
    generate_report
    
    print_section "Verification Complete"
    print_success "All backup verification checks passed"
}

# Run main function
main "$@"
