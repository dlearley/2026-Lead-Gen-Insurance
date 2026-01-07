#!/bin/bash
# Dynamic Application Security Testing Script
# Performs security testing on running applications

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
TARGET_URL=${1:-"http://localhost:3000"}
OUTPUT_DIR="security-scans/dast"
REPORT_FILE="$OUTPUT_DIR/dast-report.md"
API_ENDPOINT="$TARGET_URL/api"

# Create output directory
mkdir -p "$OUTPUT_DIR"

echo -e "${GREEN}Dynamic Application Security Testing${NC}"
echo "========================================"
echo "Target URL: $TARGET_URL"
echo "API Endpoint: $API_ENDPOINT"
echo ""

# Initialize counters
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0
WARNINGS=0

# Function to test SQL injection
test_sql_injection() {
    echo -e "${YELLOW}Testing SQL Injection...${NC}"

    local payload="1' OR '1'='1"
    local response=$(curl -s -o /dev/null -w "%{http_code}" \
        -X GET \
        "$API_ENDPOINT/leads?id=$payload" 2>/dev/null || echo "000")

    if [ "$response" = "500" ] || [ "$response" = "200" ]; then
        echo "  ⚠️  Potential SQL injection vulnerability detected"
        echo "  URL: $API_ENDPOINT/leads?id=$payload"
        echo "  Response: $response"
        WARNINGS=$((WARNINGS + 1))
    else
        echo "  ✅ SQL injection test passed"
        PASSED_TESTS=$((PASSED_TESTS + 1))
    fi

    TOTAL_TESTS=$((TOTAL_TESTS + 1))
}

# Function to test XSS
test_xss() {
    echo -e "${YELLOW}Testing Cross-Site Scripting (XSS)...${NC}"

    local payload="<script>alert('XSS')</script>"
    local response=$(curl -s -X GET \
        "$API_ENDPOINT/search?q=$payload" 2>/dev/null)

    if echo "$response" | grep -q "<script>"; then
        echo "  ⚠️  Potential XSS vulnerability detected"
        echo "  URL: $API_ENDPOINT/search?q=$payload"
        WARNINGS=$((WARNINGS + 1))
    else
        echo "  ✅ XSS test passed"
        PASSED_TESTS=$((PASSED_TESTS + 1))
    fi

    TOTAL_TESTS=$((TOTAL_TESTS + 1))
}

# Function to test authentication bypass
test_auth_bypass() {
    echo -e "${YELLOW}Testing Authentication Bypass...${NC}"

    # Test without authentication
    local response=$(curl -s -o /dev/null -w "%{http_code}" \
        -X GET \
        "$API_ENDPOINT/admin/users" 2>/dev/null || echo "000")

    if [ "$response" = "200" ]; then
        echo "  ❌ Authentication bypass detected! Admin endpoint accessible without auth"
        FAILED_TESTS=$((FAILED_TESTS + 1))
    elif [ "$response" = "401" ] || [ "$response" = "403" ]; then
        echo "  ✅ Authentication required for admin endpoints"
        PASSED_TESTS=$((PASSED_TESTS + 1))
    else
        echo "  ⚠️  Unexpected response code: $response"
        WARNINGS=$((WARNINGS + 1))
    fi

    TOTAL_TESTS=$((TOTAL_TESTS + 1))
}

# Function to test CSRF protection
test_csrf() {
    echo -e "${YELLOW}Testing CSRF Protection...${NC}"

    # Test POST without CSRF token
    local response=$(curl -s -o /dev/null -w "%{http_code}" \
        -X POST \
        -H "Content-Type: application/json" \
        -d '{"name":"test"}' \
        "$API_ENDPOINT/leads" 2>/dev/null || echo "000")

    # Check for CSRF token requirement in headers
    local csrf_header=$(curl -s -I -X GET \
        "$API_ENDPOINT/leads" 2>/dev/null | \
        grep -i "csrf-token" || echo "")

    if [ -z "$csrf_header" ]; then
        echo "  ⚠️  CSRF tokens not detected in headers"
        WARNINGS=$((WARNINGS + 1))
    else
        echo "  ✅ CSRF protection appears to be configured"
        PASSED_TESTS=$((PASSED_TESTS + 1))
    fi

    TOTAL_TESTS=$((TOTAL_TESTS + 1))
}

# Function to test rate limiting
test_rate_limiting() {
    echo -e "${YELLOW}Testing Rate Limiting...${NC}"

    local blocked=0
    for i in {1..20}; do
        local response=$(curl -s -o /dev/null -w "%{http_code}" \
            -X GET \
            "$API_ENDPOINT/leads" 2>/dev/null || echo "000")

        if [ "$response" = "429" ]; then
            blocked=1
            break
        fi
    done

    if [ $blocked -eq 1 ]; then
        echo "  ✅ Rate limiting detected (blocked after multiple requests)"
        PASSED_TESTS=$((PASSED_TESTS + 1))
    else
        echo "  ⚠️  Rate limiting may not be configured"
        WARNINGS=$((WARNINGS + 1))
    fi

    TOTAL_TESTS=$((TOTAL_TESTS + 1))
}

# Function to test security headers
test_security_headers() {
    echo -e "${YELLOW}Testing Security Headers...${NC}"

    local response_headers=$(curl -s -I "$TARGET_URL" 2>/dev/null)

    # Check for required headers
    local required_headers=(
        "X-Content-Type-Options"
        "X-Frame-Options"
        "Content-Security-Policy"
        "Strict-Transport-Security"
        "X-XSS-Protection"
    )

    local missing_headers=0
    for header in "${required_headers[@]}"; do
        if echo "$response_headers" | grep -qi "$header"; then
            echo "  ✅ $header present"
        else
            echo "  ❌ $header missing"
            missing_headers=$((missing_headers + 1))
        fi
    done

    if [ $missing_headers -eq 0 ]; then
        PASSED_TESTS=$((PASSED_TESTS + 1))
    else
        FAILED_TESTS=$((FAILED_TESTS + 1))
    fi

    TOTAL_TESTS=$((TOTAL_TESTS + 1))
}

# Function to test information disclosure
test_information_disclosure() {
    echo -e "${YELLOW}Testing Information Disclosure...${NC}"

    # Check for server header disclosure
    local server_header=$(curl -s -I "$TARGET_URL" 2>/dev/null | \
        grep -i "server:" || echo "")

    if [ -n "$server_header" ]; then
        echo "  ⚠️  Server header disclosed: $server_header"
        WARNINGS=$((WARNINGS + 1))
    else
        echo "  ✅ Server header not disclosed"
        PASSED_TESTS=$((PASSED_TESTS + 1))
    fi

    TOTAL_TESTS=$((TOTAL_TESTS + 1))

    # Check for X-Powered-By header
    local powered_by=$(curl -s -I "$TARGET_URL" 2>/dev/null | \
        grep -i "x-powered-by:" || echo "")

    if [ -n "$powered_by" ]; then
        echo "  ⚠️  X-Powered-By header disclosed: $powered_by"
        WARNINGS=$((WARNINGS + 1))
    else
        echo "  ✅ X-Powered-By header not disclosed"
        PASSED_TESTS=$((PASSED_TESTS + 1))
    fi

    TOTAL_TESTS=$((TOTAL_TESTS + 1))
}

# Function to test HTTPS/TLS
test_tls_configuration() {
    echo -e "${YELLOW}Testing TLS Configuration...${NC}"

    # Extract hostname from URL
    local hostname=$(echo "$TARGET_URL" | sed -e 's|^[^/]*//||' -e 's|/.*$||')

    if command -v openssl &> /dev/null; then
        local cert_info=$(echo | openssl s_client -servername "$hostname" -connect "$hostname:443" 2>/dev/null | openssl x509 -noout -dates 2>/dev/null)

        if [ -n "$cert_info" ]; then
            echo "  ✅ Certificate configured"
            echo "$cert_info"
            PASSED_TESTS=$((PASSED_TESTS + 1))
        else
            echo "  ⚠️  Could not verify certificate"
            WARNINGS=$((WARNINGS + 1))
        fi
    else
        echo "  ⚠️  OpenSSL not available, skipping TLS test"
        WARNINGS=$((WARNINGS + 1))
    fi

    TOTAL_TESTS=$((TOTAL_TESTS + 1))
}

# Function to test directory traversal
test_directory_traversal() {
    echo -e "${YELLOW}Testing Directory Traversal...${NC}"

    local payloads=(
        "../../../etc/passwd"
        "..\\..\\..\\..\\windows\\system32\\drivers\\etc\\hosts"
        "%2e%2e%2fetc%2fpasswd"
    )

    local vulnerable=0
    for payload in "${payloads[@]}"; do
        local response=$(curl -s -X GET \
            "$API_ENDPOINT/files?path=$payload" 2>/dev/null)

        if echo "$response" | grep -q "root:"; then
            echo "  ❌ Directory traversal vulnerability detected!"
            echo "  Payload: $payload"
            vulnerable=1
            FAILED_TESTS=$((FAILED_TESTS + 1))
            break
        fi
    done

    if [ $vulnerable -eq 0 ]; then
        echo "  ✅ Directory traversal test passed"
        PASSED_TESTS=$((PASSED_TESTS + 1))
    fi

    TOTAL_TESTS=$((TOTAL_TESTS + 1))
}

# Function to test IDOR
test_idor() {
    echo -e "${YELLOW}Testing Insecure Direct Object References (IDOR)...${NC}"

    # Create a user and try to access another user's data
    local user1_id="user1"
    local user2_id="user2"

    # Try to access user2's data as user1
    local response=$(curl -s -o /dev/null -w "%{http_code}" \
        -X GET \
        -H "Authorization: Bearer fake_token_for_$user1_id" \
        "$API_ENDPOINT/users/$user2_id" 2>/dev/null || echo "000")

    if [ "$response" = "200" ]; then
        echo "  ⚠️  Potential IDOR vulnerability detected"
        WARNINGS=$((WARNINGS + 1))
    elif [ "$response" = "403" ] || [ "$response" = "404" ]; then
        echo "  ✅ IDOR protection appears to be in place"
        PASSED_TESTS=$((PASSED_TESTS + 1))
    else
        echo "  ⚠️  Could not verify IDOR protection"
        WARNINGS=$((WARNINGS + 1))
    fi

    TOTAL_TESTS=$((TOTAL_TESTS + 1))
}

# Function to test HTTP methods
test_http_methods() {
    echo -e "${YELLOW}Testing HTTP Methods...${NC}"

    local methods=("PUT" "DELETE" "PATCH" "OPTIONS" "TRACE")
    local dangerous_methods=0

    for method in "${methods[@]}"; do
        local response=$(curl -s -o /dev/null -w "%{http_code}" \
            -X "$method" \
            "$API_ENDPOINT/leads" 2>/dev/null || echo "000")

        if [ "$method" = "TRACE" ] && [ "$response" = "200" ]; then
            echo "  ❌ TRACE method enabled (XST vulnerability)"
            dangerous_methods=$((dangerous_methods + 1))
        elif [ "$response" = "405" ] || [ "$response" = "501" ]; then
            # Method not allowed - good
            :
        else
            echo "  ℹ️  $method method returned $response"
        fi
    done

    if [ $dangerous_methods -eq 0 ]; then
        echo "  ✅ No dangerous HTTP methods detected"
        PASSED_TESTS=$((PASSED_TESTS + 1))
    else
        FAILED_TESTS=$((FAILED_TESTS + dangerous_methods))
    fi

    TOTAL_TESTS=$((TOTAL_TESTS + 1))
}

# Generate report
generate_report() {
    {
        echo "# Dynamic Application Security Testing Report"
        echo ""
        echo "**Scan Date:** $(date)"
        echo "**Target URL:** $TARGET_URL"
        echo ""
        echo "## Summary"
        echo ""
        echo "| Metric | Count |"
        echo "|--------|-------|"
        echo "| Total Tests | $TOTAL_TESTS |"
        echo "| Passed | $PASSED_TESTS |"
        echo "| Failed | $FAILED_TESTS |"
        echo "| Warnings | $WARNINGS |"
        echo ""
        echo "## Test Results"
        echo ""
        echo "All test results and logs are available in: $OUTPUT_DIR"
        echo ""
        echo "## Recommendations"
        echo ""
        if [ $FAILED_TESTS -gt 0 ]; then
            echo "- ❌ Critical issues found. Immediate action required."
            echo ""
        fi
        if [ $WARNINGS -gt 0 ]; then
            echo "- ⚠️  Security warnings detected. Review and remediate."
            echo ""
        fi
        if [ $FAILED_TESTS -eq 0 ] && [ $WARNINGS -eq 0 ]; then
            echo "- ✅ No critical security issues detected."
            echo ""
        fi
    } > "$REPORT_FILE"
}

# Main execution
echo "========================================"
echo "Starting DAST Scan..."
echo "========================================"
echo ""

# Run all tests
test_sql_injection
test_xss
test_auth_bypass
test_csrf
test_rate_limiting
test_security_headers
test_information_disclosure
test_tls_configuration
test_directory_traversal
test_idor
test_http_methods

# Generate report
generate_report

# Print summary
echo ""
echo "================================"
echo -e "${GREEN}DAST Scan Complete${NC}"
echo "================================"
echo "Total Tests: $TOTAL_TESTS"
echo "Passed: $PASSED_TESTS"
echo "Failed: $FAILED_TESTS"
echo "Warnings: $WARNINGS"
echo ""

# Exit with appropriate code
if [ $FAILED_TESTS -gt 0 ]; then
    echo -e "${RED}❌ Critical vulnerabilities found!${NC}"
    echo "Report: $REPORT_FILE"
    exit 1
elif [ $WARNINGS -gt 0 ]; then
    echo -e "${YELLOW}⚠️  Security warnings detected.${NC}"
    echo "Report: $REPORT_FILE"
    exit 0
else
    echo -e "${GREEN}✅ No critical vulnerabilities found.${NC}"
    echo "Report: $REPORT_FILE"
    exit 0
fi
