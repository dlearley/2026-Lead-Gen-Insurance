#!/bin/bash
# Infrastructure as Code Security Scanning Script
# Scans Terraform, Kubernetes, and CloudFormation configurations

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
OUTPUT_DIR="security-scans/iac"
TERRAFORM_DIR="${1:-"infrastructure"}"
KUBERNETES_DIR="${2:-"k8s"}"

# Create output directory
mkdir -p "$OUTPUT_DIR"

echo -e "${GREEN}Infrastructure as Code Security Scanning${NC}"
echo "=========================================="
echo "Terraform directory: $TERRAFORM_DIR"
echo "Kubernetes directory: $KUBERNETES_DIR"
echo ""

# Initialize counters
TOTAL_ISSUES=0
TERRAFORM_ISSUES=0
KUBERNETES_ISSUES=0
CLOUDFORMATION_ISSUES=0

# Function to scan Terraform with Checkov
scan_terraform_checkov() {
    local output_file="$OUTPUT_DIR/terraform-checkov.json"
    local sarif_file="$OUTPUT_DIR/terraform-checkov.sarif"

    echo -e "${YELLOW}Scanning Terraform with Checkov...${NC}"

    if ! command -v checkov &> /dev/null; then
        echo -e "${YELLOW}Checkov not installed. Installing...${NC}"
        pip install checkov
    fi

    checkov -d "$TERRAFORM_DIR" \
        --framework terraform \
        --output json \
        --output-file-path "$output_file" \
        --soft-fail \
        --compact \
        --quiet || true

    checkov -d "$TERRAFORM_DIR" \
        --framework terraform \
        --output sarif \
        --output-file-path "$sarif_file" \
        --soft-fail \
        --compact \
        --quiet || true

    if [ -f "$output_file" ]; then
        local failed=$(jq '.results.failed_checks | length' "$output_file" 2>/dev/null || echo "0")
        TERRAFORM_ISSUES=$((TERRAFORM_ISSUES + failed))
        echo "  Checkov: $failed issues found"
    fi
}

# Function to scan Terraform with tfsec
scan_terraform_tfsec() {
    local output_file="$OUTPUT_DIR/terraform-tfsec.json"

    echo -e "${YELLOW}Scanning Terraform with tfsec...${NC}"

    if ! command -v tfsec &> /dev/null; then
        echo -e "${YELLOW}tfsec not installed, skipping...${NC}"
        return
    fi

    tfsec "$TERRAFORM_DIR" \
        --format json \
        --out "$output_file" \
        --force \
        --no-color || true

    if [ -f "$output_file" ]; then
        local critical=$(jq '[.results[] | select(.severity == "CRITICAL")] | length' "$output_file" 2>/dev/null || echo "0")
        local high=$(jq '[.results[] | select(.severity == "HIGH")] | length' "$output_file" 2>/dev/null || echo "0")
        echo "  tfsec: $critical critical, $high high"
        TERRAFORM_ISSUES=$((TERRAFORM_ISSUES + critical + high))
    fi
}

# Function to scan Kubernetes with Checkov
scan_kubernetes_checkov() {
    local output_file="$OUTPUT_DIR/kubernetes-checkov.json"

    echo -e "${YELLOW}Scanning Kubernetes with Checkov...${NC}"

    if ! command -v checkov &> /dev/null; then
        pip install checkov
    fi

    checkov -d "$KUBERNETES_DIR" \
        --framework kubernetes \
        --output json \
        --output-file-path "$output_file" \
        --soft-fail \
        --compact \
        --quiet || true

    if [ -f "$output_file" ]; then
        local failed=$(jq '.results.failed_checks | length' "$output_file" 2>/dev/null || echo "0")
        KUBERNETES_ISSUES=$((KUBERNETES_ISSUES + failed))
        echo "  Checkov: $failed issues found"
    fi
}

# Function to scan Kubernetes with Kubesec
scan_kubernetes_kubesec() {
    local output_file="$OUTPUT_DIR/kubernetes-kubesec.json"

    echo -e "${YELLOW}Scanning Kubernetes with Kubesec...${NC}"

    if ! command -v kubesec &> /dev/null; then
        echo -e "${YELLOW}kubesec not installed, skipping...${NC}"
        return
    fi

    kubesec scan "$KUBERNETES_DIR"/*.yaml "$KUBERNETES_DIR"/**/*.yaml > "$output_file" 2>&1 || true

    echo "  kubesec: scan completed"
}

# Function to scan Kubernetes with kube-score
scan_kubernetes_kubescore() {
    local output_file="$OUTPUT_DIR/kubernetes-kubescore.txt"

    echo -e "${YELLOW}Scanning Kubernetes with kube-score...${NC}"

    if ! command -v kube-score &> /dev/null; then
        echo -e "${YELLOW}kube-score not installed, skipping...${NC}"
        return
    fi

    kube-score score "$KUBERNETES_DIR"/*.yaml "$KUBERNETES_DIR"/**/*.yaml \
        --output-format ci > "$output_file" 2>&1 || true

    echo "  kube-score: scan completed"
}

# Function to check for IAM policy issues
check_iam_policies() {
    local report_file="$OUTPUT_DIR/iam-policy-analysis.txt"

    echo -e "${YELLOW}Analyzing IAM policies...${NC}"

    {
        echo "IAM Policy Analysis"
        echo "===================="
        echo ""

        # Check for overly permissive policies
        echo "Checking for overly permissive actions..."
        grep -r "Action.*\*" "$TERRAFORM_DIR"/*.tf "$TERRAFETM_DIR"/**/*.tf 2>/dev/null | \
            grep -v "#.*Action" | \
            head -20 || echo "  ✅ No wildcard actions found"

        echo ""

        # Check for wildcard resources
        echo "Checking for wildcard resources..."
        grep -r "Resource.*\*" "$TERRAFORM_DIR"/*.tf "$TERRAFORM_DIR"/**/*.tf 2>/dev/null | \
            grep -v "#.*Resource" | \
            head -20 || echo "  ✅ No wildcard resources found"

        echo ""

        # Check for unencrypted resources
        echo "Checking for unencrypted resources..."
        grep -r "encryption_enabled.*false" "$TERRAFORM_DIR"/*.tf 2>/dev/null || \
        grep -r "encrypted.*false" "$TERRAFORM_DIR"/*.tf 2>/dev/null || \
        echo "  ✅ No unencrypted resources found"

    } > "$report_file"
}

# Function to check for security group issues
check_security_groups() {
    local report_file="$OUTPUT_DIR/security-group-analysis.txt"

    echo -e "${YELLOW}Analyzing security groups...${NC}"

    {
        echo "Security Group Analysis"
        echo "======================="
        echo ""

        # Check for overly permissive ingress rules
        echo "Checking for overly permissive ingress rules..."
        grep -r "from_port.*0" "$TERRAFORM_DIR"/*.tf "$TERRAFORM_DIR"/**/*.tf 2>/dev/null | \
            grep "to_port.*65535" | \
            grep "cidr_blocks.*0.0.0.0/0" | \
            head -20 || echo "  ✅ No overly permissive rules found"

        echo ""

        # Check for SSH access from anywhere
        echo "Checking for SSH access from anywhere..."
        grep -r "from_port.*22" "$TERRAFORM_DIR"/*.tf 2>/dev/null | \
            grep "cidr_blocks.*0.0.0.0/0" | \
            head -20 || echo "  ✅ No SSH access from anywhere"

    } > "$report_file"
}

# Function to check for secrets in IaC
check_secrets_in_iac() {
    local report_file="$OUTPUT_DIR/secrets-in-iac.txt"

    echo -e "${YELLOW}Checking for secrets in IaC...${NC}"

    {
        echo "Secrets in Infrastructure as Code"
        echo "=================================="
        echo ""

        # Check for API keys
        echo "Checking for API keys..."
        grep -r "api_key" "$TERRAFORM_DIR"/*.tf "$KUBERNETES_DIR"/*.yaml 2>/dev/null | \
            grep -v "var\." | \
            head -20 || echo "  ✅ No hardcoded API keys found"

        echo ""

        # Check for passwords
        echo "Checking for passwords..."
        grep -r "password" "$TERRAFORM_DIR"/*.tf "$KUBERNETES_DIR"/*.yaml 2>/dev/null | \
            grep -v "var\." | \
            grep -v "#.*password" | \
            head -20 || echo "  ✅ No hardcoded passwords found"

    } > "$report_file"
}

# Function to check for compliance violations
check_compliance() {
    local report_file="$OUTPUT_DIR/compliance-check.txt"

    echo -e "${YELLOW}Checking compliance requirements...${NC}"

    {
        echo "Compliance Check"
        echo "================"
        echo ""

        # Check for encryption at rest
        echo "Encryption at rest compliance..."
        local encryption_issues=0

        if ! grep -q "ebs_encrypted.*true" "$TERRAFORM_DIR"/*.tf 2>/dev/null; then
            echo "  ❌ EBS encryption not configured"
            encryption_issues=$((encryption_issues + 1))
        fi

        if ! grep -q "storage_encrypted.*true" "$TERRAFORM_DIR"/*.tf 2>/dev/null; then
            echo "  ❌ RDS encryption not configured"
            encryption_issues=$((encryption_issues + 1))
        fi

        if [ $encryption_issues -eq 0 ]; then
            echo "  ✅ Encryption at rest configured"
        fi

        echo ""

        # Check for logging enabled
        echo "Logging compliance..."
        local logging_issues=0

        if ! grep -q "cloudtrail" "$TERRAFORM_DIR"/*.tf 2>/dev/null; then
            echo "  ❌ CloudTrail not configured"
            logging_issues=$((logging_issues + 1))
        fi

        if ! grep -q "vpc_flow_logs" "$TERRAFORM_DIR"/*.tf 2>/dev/null; then
            echo "  ❌ VPC Flow Logs not configured"
            logging_issues=$((logging_issues + 1))
        fi

        if [ $logging_issues -eq 0 ]; then
            echo "  ✅ Logging configured"
        fi

    } > "$report_file"
}

# Main scan execution
echo "=========================================="
echo "Terraform Scanning"
echo "=========================================="

if [ -d "$TERRAFORM_DIR" ]; then
    scan_terraform_checkov
    scan_terraform_tfsec
    check_iam_policies
    check_security_groups
else
    echo -e "${YELLOW}Terraform directory not found, skipping...${NC}"
fi

echo ""
echo "=========================================="
echo "Kubernetes Scanning"
echo "=========================================="

if [ -d "$KUBERNETES_DIR" ]; then
    scan_kubernetes_checkov
    scan_kubernetes_kubesec
    scan_kubernetes_kubescore
else
    echo -e "${YELLOW}Kubernetes directory not found, skipping...${NC}"
fi

echo ""
echo "=========================================="
echo "Additional Security Checks"
echo "=========================================="

check_secrets_in_iac
check_compliance

# Calculate total issues
TOTAL_ISSUES=$((TERRAFORM_ISSUES + KUBERNETES_ISSUES + CLOUDFORMATION_ISSUES))

# Print summary
echo ""
echo "================================"
echo -e "${GREEN}IaC Scan Summary${NC}"
echo "================================"
echo "Total issues: $TOTAL_ISSUES"
echo "  Terraform: $TERRAFORM_ISSUES"
echo "  Kubernetes: $KUBERNETES_ISSUES"
echo "  CloudFormation: $CLOUDFORMATION_ISSUES"
echo ""

# Check for critical issues
local critical_issues=$(find "$OUTPUT_DIR" -name "*.json" -exec jq '[.results.failed_checks[]? | select(.severity == "CRITICAL")] | length' {} \; 2>/dev/null | awk '{s+=$1} END {print s}')

if [ "$critical_issues" -gt 0 ] 2>/dev/null; then
    echo -e "${RED}❌ Critical issues found! Review required.${NC}"
    echo "Review reports in: $OUTPUT_DIR"
    exit 1
elif [ $TOTAL_ISSUES -gt 0 ]; then
    echo -e "${YELLOW}⚠️  Issues found. Review recommended.${NC}"
    echo "Review reports in: $OUTPUT_DIR"
    exit 0
else
    echo -e "${GREEN}✅ No security issues found.${NC}"
    exit 0
fi
