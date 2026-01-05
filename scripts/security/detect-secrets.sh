#!/bin/bash
# Secrets Detection Script
# Scans repository for exposed credentials and secrets

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
BASELINE_FILE=".secrets.baseline"
REPORT_FILE="secrets-scan-report.txt"
FALSE_POSITIVE_WHITELIST=".secrets-whitelist.txt"

# Patterns to detect
PATTERNS=(
  "AWS[ _]ACCESS[ _]KEY[ _]ID[ =]+[A-Z0-9]{20}"
  "AWS[ _]SECRET[ _]ACCESS[ _]KEY[ =]+[A-Za-z0-9/+=]{40}"
  "API[ _]?KEY[ =]+[\"']?[A-Za-z0-9_\\-]{20,}"
  "SECRET[ _]?KEY[ =]+[\"']?[A-Za-z0-9_\\-]{20,}"
  "PRIVATE[ _]?KEY[ =]+[\"']?-----BEGIN[ A-Z]*PRIVATE KEY-----"
  "PASSWORD[ =]+[\"']?[A-Za-z0-9_@.]{8,}"
  "TOKEN[ =]+[\"']?[A-Za-z0-9_\\-]{20,}"
  "CONNECTION[ _]?STRING[ =]+[\"']?[^\"']*password[=][^\"']*"
  "postgres://[^:]+:[^@]+@"
  "mysql://[^:]+:[^@]+@"
  "mongodb://[^:]+:[^@]+@"
  "ghp_[A-Za-z0-9]{36}"
  "sk_live_[A-Za-z0-9]{24}"
  "pk_live_[A-Za-z0-9]{24}"
  "AIza[0-9A-Za-z\\-_]{35}"
)

echo -e "${GREEN}Secrets Detection Scan${NC}"
echo "================================"
echo "Scanning for exposed secrets..."
echo ""

# Create baseline if it doesn't exist
if [ ! -f "$BASELINE_FILE" ]; then
    echo -e "${YELLOW}No baseline file found. Creating new baseline...${NC}"
    touch "$BASELINE_FILE"
fi

# Initialize counters
TOTAL_FINDINGS=0
CRITICAL_FINDINGS=0

# Function to check if finding is in baseline
is_in_baseline() {
    local finding="$1"
    grep -qF "$finding" "$BASELINE_FILE" 2>/dev/null
}

# Function to check if finding is whitelisted
is_whitelisted() {
    local finding="$1"
    if [ -f "$FALSE_POSITIVE_WHITELIST" ]; then
        grep -qF "$finding" "$FALSE_POSITIVE_WHITELIST" 2>/dev/null
    else
        return 1
    fi
}

# Function to scan file for secrets
scan_file() {
    local file="$1"
    local line_num=0
    local file_findings=0

    while IFS= read -r line; do
        line_num=$((line_num + 1))

        for pattern in "${PATTERNS[@]}"; do
            if echo "$line" | grep -iEq "$pattern"; then
                local match=$(echo "$line" | grep -iEo "$pattern")

                if ! is_in_baseline "$file:$line_num:$match" && ! is_whitelisted "$file:$line_num:$match"; then
                    echo -e "${RED}[DETECTED]${NC} $file:$line_num"
                    echo "  Pattern: $pattern"
                    echo "  Match: $match"
                    echo ""

                    echo "$file:$line_num:$match" >> "$REPORT_FILE"
                    TOTAL_FINDINGS=$((TOTAL_FINDINGS + 1))
                    file_findings=$((file_findings + 1))

                    # Check for critical patterns
                    if [[ "$pattern" =~ (AWS[ _]SECRET|PRIVATE[ _]?KEY|ghp_) ]]; then
                        CRITICAL_FINDINGS=$((CRITICAL_FINDINGS + 1))
                    fi
                fi
            fi
        done
    done < "$file"
}

# Function to scan directory
scan_directory() {
    local dir="$1"

    echo "Scanning directory: $dir"
    echo ""

    # Find all text files (excluding common safe directories)
    find "$dir" -type f \( -name "*.js" -o -name "*.ts" -o -name "*.jsx" -o -name "*.tsx" \
        -o -name "*.json" -o -name "*.yaml" -o -name "*.yml" -o -name "*.toml" -o -name "*.env*" \
        -o -name "*.sh" -o -name "*.py" -o -name "*.md" \) \
        ! -path "*/node_modules/*" \
        ! -path "*/.git/*" \
        ! -path "*/dist/*" \
        ! -path "*/build/*" \
        ! -path "*/coverage/*" \
        ! -path "*/.next/*" \
        ! -path "*/.secrets.baseline" \
        ! -path "*/.secrets-whitelist.txt" \
        | while read -r file; do
            scan_file "$file"
        done
}

# Clear previous report
> "$REPORT_FILE"

# Scan the repository
scan_directory "."

# Print summary
echo ""
echo "================================"
echo -e "${GREEN}Scan Summary${NC}"
echo "================================"
echo "Total findings: $TOTAL_FINDINGS"
echo "Critical findings: $CRITICAL_FINDINGS"
echo ""

if [ $TOTAL_FINDINGS -eq 0 ]; then
    echo -e "${GREEN}✅ No secrets detected!${NC}"
    exit 0
else
    echo -e "${RED}⚠️  Found $TOTAL_FINDINGS potential secrets${NC}"

    if [ $CRITICAL_FINDINGS -gt 0 ]; then
        echo -e "${RED}❌ $CRITICAL_FINDINGS critical findings (commit blocked)${NC}"
        echo ""
        echo "To fix critical findings:"
        echo "1. Remove or rotate the exposed secrets"
        echo "2. Add to baseline if false positive: echo 'file:line:match' >> $BASELINE_FILE"
        echo "3. Re-run the scan"
        exit 1
    else
        echo -e "${YELLOW}⚠️  Warnings found (review recommended)${NC}"
        echo "Report saved to: $REPORT_FILE"
        exit 0
    fi
fi
