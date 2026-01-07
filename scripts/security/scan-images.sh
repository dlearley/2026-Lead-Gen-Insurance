#!/bin/bash
# Container Image Security Scanning Script
# Scans Docker images for vulnerabilities using Trivy and Grype

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
IMAGE_TAG=${1:-"latest"}
SEVERITY_THRESHOLD=${2:-"CRITICAL,HIGH"}
OUTPUT_DIR="security-scans/containers"
SBOM_DIR="sboms"

# Services to scan
SERVICES=(
    "api"
    "backend"
    "data-service"
    "orchestrator"
    "frontend"
    "frontend-vite"
)

# Docker registry configuration
REGISTRY=${DOCKER_REGISTRY:-"localhost:5000"}
ORGANIZATION=${DOCKER_ORG:-"lead-management"}

# Create output directories
mkdir -p "$OUTPUT_DIR"
mkdir -p "$SBOM_DIR"

echo -e "${GREEN}Container Image Security Scanning${NC}"
echo "==================================="
echo "Severity Threshold: $SEVERITY_THRESHOLD"
echo "Image Tag: $IMAGE_TAG"
echo ""

# Initialize counters
TOTAL_VULNERABILITIES=0
CRITICAL_COUNT=0
HIGH_COUNT=0
MEDIUM_COUNT=0
LOW_COUNT=0

# Function to scan image with Trivy
scan_with_trivy() {
    local image="$1"
    local service="$2"
    local output_file="$OUTPUT_DIR/${service}-trivy.json"
    local sarif_file="$OUTPUT_DIR/${service}-trivy.sarif"

    echo -e "${YELLOW}Scanning $image with Trivy...${NC}"

    # Run Trivy scan
    docker run --rm \
        -v /var/run/docker.sock:/var/run/docker.sock \
        aquasec/trivy:latest \
        image \
        --severity "$SEVERITY_THRESHOLD" \
        --format json \
        --output "/output/${service}-trivy.json" \
        "$image"

    # Copy results from container
    # For now, run directly
    if command -v trivy &> /dev/null; then
        trivy image \
            --severity "$SEVERITY_THRESHOLD" \
            --format json \
            --output "$output_file" \
            "$image"

        trivy image \
            --severity "$SEVERITY_THRESHOLD" \
            --format sarif \
            --output "$sarif_file" \
            "$image"
    else
        echo -e "${YELLOW}Trivy not installed locally, skipping...${NC}"
        return
    fi

    # Parse results
    if [ -f "$output_file" ]; then
        local critical=$(jq '[.Results[]?.Vulnerabilities[]? | select(.Severity == "CRITICAL")] | length' "$output_file" 2>/dev/null || echo "0")
        local high=$(jq '[.Results[]?.Vulnerabilities[]? | select(.Severity == "HIGH")] | length' "$output_file" 2>/dev/null || echo "0")
        local medium=$(jq '[.Results[]?.Vulnerabilities[]? | select(.Severity == "MEDIUM")] | length' "$output_file" 2>/dev/null || echo "0")
        local low=$(jq '[.Results[]?.Vulnerabilities[]? | select(.Severity == "LOW")] | length' "$output_file" 2>/dev/null || echo "0")

        CRITICAL_COUNT=$((CRITICAL_COUNT + critical))
        HIGH_COUNT=$((HIGH_COUNT + high))
        MEDIUM_COUNT=$((MEDIUM_COUNT + medium))
        LOW_COUNT=$((LOW_COUNT + low))
        TOTAL_VULNERABILITIES=$((TOTAL_VULNERABILITIES + critical + high + medium + low))

        echo "  Critical: $critical, High: $high, Medium: $medium, Low: $low"
    fi
}

# Function to scan image with Grype
scan_with_grype() {
    local image="$1"
    local service="$2"
    local output_file="$OUTPUT_DIR/${service}-grype.json"
    local sarif_file="$OUTPUT_DIR/${service}-grype.sarif"

    echo -e "${YELLOW}Scanning $image with Grype...${NC}"

    if command -v grype &> /dev/null; then
        grype "$image" \
            --output json \
            --file "$output_file" \
            --fail-on severity="$SEVERITY_THRESHOLD" \
            || true

        grype "$image" \
            --output sarif \
            --file "$sarif_file" \
            --fail-on severity="$SEVERITY_THRESHOLD" \
            || true
    else
        echo -e "${YELLOW}Grype not installed locally, skipping...${NC}"
        return
    fi

    if [ -f "$output_file" ]; then
        echo "  Grype scan completed"
    fi
}

# Function to generate SBOM
generate_sbom() {
    local image="$1"
    local service="$2"
    local sbom_file="$SBOM_DIR/${service}-sbom.spdx.json"

    echo -e "${YELLOW}Generating SBOM for $image...${NC}"

    if command -v syft &> /dev/null; then
        syft "$image" \
            --output spdx-json \
            --file "$sbom_file"
    else
        echo -e "${YELLOW}Syft not installed locally, skipping SBOM generation...${NC}"
        return
    fi
}

# Function to analyze image layers
analyze_layers() {
    local image="$1"
    local service="$2"
    local layers_file="$OUTPUT_DIR/${service}-layers.json"

    echo -e "${YELLOW}Analyzing image layers for $image...${NC}"

    docker history --no-trunc --format "{{json .}}" "$image" > "$layers_file"

    local layer_count=$(docker history "$image" | wc -l)
    local image_size=$(docker inspect "$image" | jq '.[0].Size')

    echo "  Layers: $layer_count"
    echo "  Size: $((image_size / 1024 / 1024)) MB"
}

# Function to check image for security best practices
check_security_best_practices() {
    local image="$1"
    local service="$2"
    local report_file="$OUTPUT_DIR/${service}-best-practices.txt"

    echo -e "${YELLOW}Checking security best practices for $image...${NC}"

    {
        echo "Security Best Practices Report: $service"
        echo "========================================"
        echo ""

        # Check if running as root
        local user=$(docker inspect "$image" | jq -r '.[0].Config.User // "root"')
        echo "Running as user: $user"
        if [ "$user" = "root" ] || [ -z "$user" ]; then
            echo "  ❌ WARNING: Container running as root"
        else
            echo "  ✅ Container running as non-root user"
        fi
        echo ""

        # Check for exposed ports
        local ports=$(docker inspect "$image" | jq -r '.[0].Config.ExposedPorts | keys | join(", ")' 2>/dev/null)
        echo "Exposed ports: $ports"
        echo ""

        # Check for health check
        local healthcheck=$(docker inspect "$image" | jq -r '.[0].Config.Healthcheck')
        if [ "$healthcheck" != "null" ] && [ -n "$healthcheck" ]; then
            echo "Health check: ✅ Configured"
        else
            echo "Health check: ❌ Not configured"
        fi
        echo ""

        # Check image labels
        local labels=$(docker inspect "$image" | jq -r '.[0].Config.Labels // {}')
        if [ "$labels" != "null" ] && [ "$labels" != "{}" ]; then
            echo "Image labels: ✅ Present"
        else
            echo "Image labels: ⚠️  Missing (consider adding maintainer, version, description)"
        fi
        echo ""

        # Check for secrets in image
        echo "Checking for potential secrets in image..."
        docker run --rm "$image" sh -c 'find / -name "*.env*" -o -name "*secret*" -o -name "*password*" 2>/dev/null | head -20' || true

    } > "$report_file"
}

# Main scan loop
for service in "${SERVICES[@]}"; do
    echo ""
    echo "======================================"
    echo "Scanning service: $service"
    echo "======================================"

    local image="${REGISTRY}/${ORGANIZATION}/${service}:${IMAGE_TAG}"

    # Check if image exists
    if ! docker image inspect "$image" &> /dev/null; then
        echo -e "${YELLOW}Image $image not found locally, skipping...${NC}"
        continue
    fi

    # Run scans
    scan_with_trivy "$image" "$service"
    scan_with_grype "$image" "$service"
    generate_sbom "$image" "$service"
    analyze_layers "$image" "$service"
    check_security_best_practices "$image" "$service"
done

# Print summary
echo ""
echo "================================"
echo -e "${GREEN}Scan Summary${NC}"
echo "================================"
echo "Total Vulnerabilities: $TOTAL_VULNERABILITIES"
echo "  Critical: $CRITICAL_COUNT"
echo "  High: $HIGH_COUNT"
echo "  Medium: $MEDIUM_COUNT"
echo "  Low: $LOW_COUNT"
echo ""

# Exit with error if critical vulnerabilities found
if [ $CRITICAL_COUNT -gt 0 ]; then
    echo -e "${RED}❌ CRITICAL vulnerabilities found! Deployment blocked.${NC}"
    echo "Review reports in: $OUTPUT_DIR"
    exit 1
elif [ $HIGH_COUNT -gt 0 ]; then
    echo -e "${YELLOW}⚠️  HIGH vulnerabilities found. Review before deploying.${NC}"
    echo "Review reports in: $OUTPUT_DIR"
    exit 0
else
    echo -e "${GREEN}✅ No critical or high vulnerabilities found.${NC}"
    exit 0
fi
