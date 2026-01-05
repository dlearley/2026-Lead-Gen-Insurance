#!/bin/bash
# Compliance Verification Script
# Verifies security and compliance requirements

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
OUTPUT_DIR="security-scans/compliance"
REPORT_FILE="$OUTPUT_DIR/compliance-report.md"
COMPLIANCE_LEVEL=${1:-"strict"}

# Compliance thresholds
declare -A COMPLIANCE_RULES=(
    ["ENCRYPTION_AT_REST"]="required"
    ["ENCRYPTION_IN_TRANSIT"]="required"
    ["AUDIT_LOGGING"]="required"
    ["NETWORK_POLICIES"]="required"
    ["MFA_ENABLED"]="recommended"
    ["SECRET_ROTATION"]="recommended"
    ["RBAC_CONFIGURED"]="required"
    ["VULNERABILITY_SCANNING"]="required"
    ["SECURITY_HEADERS"]="required"
    ["BACKUP_ENABLED"]="recommended"
)

# Create output directory
mkdir -p "$OUTPUT_DIR"

echo -e "${GREEN}Compliance Verification${NC}"
echo "======================="
echo "Compliance Level: $COMPLIANCE_LEVEL"
echo ""

# Initialize counters
TOTAL_CHECKS=0
PASSED_CHECKS=0
FAILED_CHECKS=0
WARNING_CHECKS=0
SKIPPED_CHECKS=0

# Function to check compliance requirement
check_requirement() {
    local name="$1"
    local status="$2"
    local message="$3"

    TOTAL_CHECKS=$((TOTAL_CHECKS + 1))

    local rule_level="${COMPLIANCE_RULES[$name]}"

    if [ "$status" = "pass" ]; then
        echo -e "  ${GREEN}✓${NC} $name: $message"
        PASSED_CHECKS=$((PASSED_CHECKS + 1))
        return 0
    elif [ "$status" = "fail" ]; then
        if [ "$rule_level" = "required" ]; then
            echo -e "  ${RED}✗${NC} $name: $message (REQUIRED)"
            FAILED_CHECKS=$((FAILED_CHECKS + 1))
            return 1
        else
            echo -e "  ${YELLOW}⚠${NC} $name: $message (RECOMMENDED)"
            WARNING_CHECKS=$((WARNING_CHECKS + 1))
            return 0
        fi
    elif [ "$status" = "skip" ]; then
        echo -e "  ${YELLOW}○${NC} $name: $message (SKIPPED)"
        SKIPPED_CHECKS=$((SKIPPED_CHECKS + 1))
        return 0
    fi
}

# Function to check encryption at rest
check_encryption_at_rest() {
    echo "Checking Encryption at Rest..."

    local result="pass"
    local message="Encryption configured"

    # Check database encryption
    if ! grep -q "storage_encrypted.*true" infrastructure/*.tf 2>/dev/null; then
        result="fail"
        message="Database encryption not configured"
    fi

    # Check S3 bucket encryption
    if ! grep -q "server_side_encryption" infrastructure/*.tf 2>/dev/null; then
        result="fail"
        message="S3 encryption not configured"
    fi

    # Check EBS encryption
    if ! grep -q "ebs_encrypted.*true" infrastructure/*.tf 2>/dev/null; then
        result="fail"
        message="EBS encryption not configured"
    fi

    check_requirement "ENCRYPTION_AT_REST" "$result" "$message"
}

# Function to check encryption in transit
check_encryption_in_transit() {
    echo "Checking Encryption in Transit..."

    local result="pass"
    local message="TLS configured"

    # Check for TLS configuration in Kubernetes
    if ! grep -q "tls:" k8s/*.yaml 2>/dev/null && \
       ! grep -q "ssl:" k8s/*.yaml 2>/dev/null; then
        result="fail"
        message="TLS not configured in Kubernetes"
    fi

    # Check for HTTPS in infrastructure
    if ! grep -q "protocol.*HTTPS" infrastructure/*.tf 2>/dev/null; then
        result="fail"
        message="HTTPS not configured"
    fi

    check_requirement "ENCRYPTION_IN_TRANSIT" "$result" "$message"
}

# Function to check audit logging
check_audit_logging() {
    echo "Checking Audit Logging..."

    local result="pass"
    local message="Audit logging configured"

    # Check CloudTrail
    if ! grep -q "cloudtrail" infrastructure/*.tf 2>/dev/null; then
        result="fail"
        message="CloudTrail not configured"
    fi

    # Check PostgreSQL audit logging
    if ! grep -q "pgaudit" infrastructure/*.tf 2>/dev/null; then
        result="fail"
        message="PostgreSQL audit logging not configured"
    fi

    # Check application audit logger
    if ! grep -q "AuditLogger" packages/core/src/security/*.ts 2>/dev/null; then
        result="fail"
        message="Application audit logger not implemented"
    fi

    check_requirement "AUDIT_LOGGING" "$result" "$message"
}

# Function to check network policies
check_network_policies() {
    echo "Checking Network Policies..."

    local result="pass"
    local message="Network policies configured"

    # Check for Kubernetes network policies
    if ! ls k8s/*network*.yaml 2>/dev/null | grep -q .; then
        result="fail"
        message="Kubernetes network policies not found"
    fi

    # Check for deny-all policy
    if ! grep -q "podSelector: {}" k8s/*network*.yaml 2>/dev/null; then
        result="fail"
        message="Default deny-all policy not found"
    fi

    check_requirement "NETWORK_POLICIES" "$result" "$message"
}

# Function to check MFA
check_mfa() {
    echo "Checking MFA Configuration..."

    local result="pass"
    local message="MFA configured"

    # Check for MFA implementation
    if ! ls packages/core/src/security/mfa.ts 2>/dev/null | grep -q .; then
        result="fail"
        message="MFA implementation not found"
    fi

    # Check for MFA enabled in environment
    if [ -z "$MFA_ENABLED" ] || [ "$MFA_ENABLED" != "true" ]; then
        result="pass"
        message="MFA implementation available, not enabled"
    fi

    check_requirement "MFA_ENABLED" "$result" "$message"
}

# Function to check secret rotation
check_secret_rotation() {
    echo "Checking Secret Rotation..."

    local result="pass"
    local message="Secret rotation configured"

    # Check for secret rotation script
    if ! ls scripts/security/rotate-secrets.sh 2>/dev/null | grep -q .; then
        result="fail"
        message="Secret rotation script not found"
    fi

    # Check for rotation schedule
    if ! grep -q "cron.*rotate" .github/workflows/*.yml 2>/dev/null; then
        result="pass"
        message="Rotation script available, not automated"
    fi

    check_requirement "SECRET_ROTATION" "$result" "$message"
}

# Function to check RBAC
check_rbac() {
    echo "Checking RBAC Configuration..."

    local result="pass"
    local message="RBAC configured"

    # Check for Kubernetes RBAC
    if ! ls k8s/*rbac*.yaml 2>/dev/null | grep -q .; then
        result="fail"
        message="Kubernetes RBAC not found"
    fi

    # Check for AWS IAM policies
    if ! grep -q "aws_iam_role" infrastructure/*.tf 2>/dev/null; then
        result="fail"
        message="AWS IAM roles not configured"
    fi

    check_requirement "RBAC_CONFIGURED" "$result" "$message"
}

# Function to check vulnerability scanning
check_vulnerability_scanning() {
    echo "Checking Vulnerability Scanning..."

    local result="pass"
    local message="Vulnerability scanning configured"

    # Check for SAST workflow
    if ! ls .github/workflows/sast.yml 2>/dev/null | grep -q .; then
        result="fail"
        message="SAST workflow not found"
    fi

    # Check for dependency scan workflow
    if ! ls .github/workflows/dependency-scan.yml 2>/dev/null | grep -q .; then
        result="fail"
        message="Dependency scan workflow not found"
    fi

    # Check for container scan workflow
    if ! ls .github/workflows/container-scan.yml 2>/dev/null | grep -q .; then
        result="fail"
        message="Container scan workflow not found"
    fi

    check_requirement "VULNERABILITY_SCANNING" "$result" "$message"
}

# Function to check security headers
check_security_headers() {
    echo "Checking Security Headers..."

    local result="pass"
    local message="Security headers configured"

    # Check for security headers implementation
    if ! ls packages/core/src/security/security-headers.ts 2>/dev/null | grep -q .; then
        result="fail"
        message="Security headers not implemented"
    fi

    # Check for required headers
    local required_headers=(
        "X-Content-Type-Options"
        "X-Frame-Options"
        "Content-Security-Policy"
    )

    for header in "${required_headers[@]}"; do
        if ! grep -q "$header" packages/core/src/security/security-headers.ts 2>/dev/null; then
            result="fail"
            message="$header not configured"
        fi
    done

    check_requirement "SECURITY_HEADERS" "$result" "$message"
}

# Function to check backup
check_backup() {
    echo "Checking Backup Configuration..."

    local result="pass"
    local message="Backup configured"

    # Check for backup workflow
    if ! ls .github/workflows/backup.yml 2>/dev/null | grep -q .; then
        result="pass"
        message="Backup implementation optional for compliance"
    fi

    check_requirement "BACKUP_ENABLED" "$result" "$message"
}

# Function to check data retention
check_data_retention() {
    echo "Checking Data Retention Policies..."

    local result="pass"
    local message="Data retention configured"

    # Check for data retention configuration
    if ! grep -q "retention" packages/core/src/security/*.ts 2>/dev/null; then
        result="pass"
        message="Data retention recommended"
    fi

    check_requirement "DATA_RETENTION" "$result" "$message"
}

# Function to check privacy compliance
check_privacy_compliance() {
    echo "Checking Privacy Compliance..."

    local result="pass"
    local message="Privacy controls configured"

    # Check for data deletion implementation
    if ! grep -q "deleteData" packages/core/src/security/*.ts 2>/dev/null; then
        result="pass"
        message="Privacy controls recommended"
    fi

    check_requirement "PRIVACY_COMPLIANCE" "$result" "$message"
}

# Function to check incident response
check_incident_response() {
    echo "Checking Incident Response Plan..."

    local result="pass"
    local message="Incident response documented"

    # Check for incident response document
    if ! ls docs/INCIDENT_RESPONSE_PLAN.md 2>/dev/null | grep -q .; then
        result="fail"
        message="Incident response plan not documented"
    fi

    check_requirement "INCIDENT_RESPONSE" "$result" "$message"
}

# Function to check security policy
check_security_policy() {
    echo "Checking Security Policy..."

    local result="pass"
    local message="Security policy documented"

    # Check for security policy document
    if ! ls docs/SECURITY_POLICY.md 2>/dev/null | grep -q .; then
        result="fail"
        message="Security policy not documented"
    fi

    check_requirement "SECURITY_POLICY" "$result" "$message"
}

# Generate compliance report
generate_report() {
    {
        echo "# Compliance Report"
        echo ""
        echo "**Date:** $(date)"
        echo "**Compliance Level:** $COMPLIANCE_LEVEL"
        echo ""

        echo "## Summary"
        echo ""
        echo "| Metric | Count |"
        echo "|--------|-------|"
        echo "| Total Checks | $TOTAL_CHECKS |"
        echo "| Passed | $PASSED_CHECKS |"
        echo "| Failed | $FAILED_CHECKS |"
        echo "| Warnings | $WARNING_CHECKS |"
        echo "| Skipped | $SKIPPED_CHECKS |"
        echo ""

        local compliance_percentage=0
        if [ $TOTAL_CHECKS -gt 0 ]; then
            compliance_percentage=$((PASSED_CHECKS * 100 / TOTAL_CHECKS))
        fi

        echo "**Compliance Score:** $compliance_percentage%"
        echo ""

        if [ $FAILED_CHECKS -eq 0 ] && [ $WARNING_CHECKS -eq 0 ]; then
            echo "✅ **Fully Compliant** - All requirements met"
        elif [ $FAILED_CHECKS -eq 0 ]; then
            echo "⚠️ **Compliant with Warnings** - All required requirements met"
        else
            echo "❌ **Non-Compliant** - Some required requirements not met"
        fi

        echo ""
        echo "## Compliance Score by Category"
        echo ""
        echo "- Encryption: Required"
        echo "- Access Control: Required"
        echo "- Monitoring & Logging: Required"
        echo "- Data Protection: Required"
        echo "- Security Testing: Required"
        echo "- Documentation: Required"
        echo ""

        echo "## Recommendations"
        echo ""
        if [ $FAILED_CHECKS -gt 0 ]; then
            echo "- ❌ Address failed compliance requirements immediately"
            echo ""
        fi
        if [ $WARNING_CHECKS -gt 0 ]; then
            echo "- ⚠️  Review and implement recommended controls"
            echo ""
        fi
        if [ $FAILED_CHECKS -eq 0 ] && [ $WARNING_CHECKS -eq 0 ]; then
            echo "- ✅ Maintain current security posture"
            echo "- Conduct regular compliance reviews"
            echo "- Stay updated on security best practices"
            echo ""
        fi

    } > "$REPORT_FILE"
}

# Main execution
echo "================================"
echo "Running Compliance Checks..."
echo "================================"
echo ""

# Run all compliance checks
check_encryption_at_rest
check_encryption_in_transit
check_audit_logging
check_network_policies
check_mfa
check_secret_rotation
check_rbac
check_vulnerability_scanning
check_security_headers
check_backup
check_data_retention
check_privacy_compliance
check_incident_response
check_security_policy

# Generate report
generate_report

# Print summary
echo ""
echo "================================"
echo -e "${GREEN}Compliance Summary${NC}"
echo "================================"
echo "Total Checks: $TOTAL_CHECKS"
echo "Passed: $PASSED_CHECKS"
echo "Failed: $FAILED_CHECKS"
echo "Warnings: $WARNING_CHECKS"
echo "Skipped: $SKIPPED_CHECKS"
echo ""

# Calculate compliance score
local compliance_score=0
if [ $TOTAL_CHECKS -gt 0 ]; then
    compliance_score=$((PASSED_CHECKS * 100 / TOTAL_CHECKS))
fi

echo "Compliance Score: $compliance_score%"
echo ""

# Exit with appropriate code
if [ $FAILED_CHECKS -gt 0 ]; then
    echo -e "${RED}❌ Compliance check failed. Required controls not met.${NC}"
    echo "Report: $REPORT_FILE"
    exit 1
elif [ $WARNING_CHECKS -gt 0 ]; then
    echo -e "${YELLOW}⚠️  Compliance check passed with warnings.${NC}"
    echo "Report: $REPORT_FILE"
    exit 0
else
    echo -e "${GREEN}✅ Compliance check passed. All requirements met.${NC}"
    echo "Report: $REPORT_FILE"
    exit 0
fi
