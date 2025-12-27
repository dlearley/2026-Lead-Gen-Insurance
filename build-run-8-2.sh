#!/bin/bash
#
# Run 8.2: Build and Type-Check Fix Script
# 
# This script builds all packages and applications in the Insurance Lead Gen AI Platform
# in the correct dependency order.
#
# Usage: ./build.sh
#

set -e  # Exit on error
set -u  # Exit on undefined variable

echo "=========================================="
echo "  Run 8.2: Build and Type-Check Fix"
echo "=========================================="
echo ""

PROJECT_ROOT="${PROJECT_ROOT:-/home/engine/project}"
cd "$PROJECT_ROOT"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

# Step 1: Build shared packages
echo ""
echo "Step 1: Building Shared Packages"
echo "----------------------------------"

# Build @insurance-lead-gen/types (no dependencies)
log_info "Building @insurance-lead-gen/types..."
cd "$PROJECT_ROOT/packages/types"
npx tsc -p tsconfig.json --pretty
log_success "types package built successfully"
cd "$PROJECT_ROOT"

# Build @insurance-lead-gen/core (depends on types)
log_info "Building @insurance-lead-gen/core..."
cd "$PROJECT_ROOT/packages/core"
npx tsc -p tsconfig.json --pretty
log_success "core package built successfully"
cd "$PROJECT_ROOT"

# Build @insurance-lead-gen/config (depends on types)
log_info "Building @insurance-lead-gen/config..."
cd "$PROJECT_ROOT/packages/config"
npx tsc -p tsconfig.json --pretty
log_success "config package built successfully"
cd "$PROJECT_ROOT"

# Step 2: Generate Prisma client
echo ""
echo "Step 2: Generating Prisma Client"
echo "----------------------------------"

log_info "Generating Prisma client..."
cd "$PROJECT_ROOT/apps/data-service"
npx prisma generate
log_success "Prisma client generated successfully"
cd "$PROJECT_ROOT"

# Step 3: Build applications
echo ""
echo "Step 3: Building Applications"
echo "-------------------------------"

# Build data-service
log_info "Building @insurance-lead-gen/data-service..."
cd "$PROJECT_ROOT/apps/data-service"
npx tsc -p tsconfig.json --pretty
log_success "data-service built successfully"
cd "$PROJECT_ROOT"

# Build API service
log_info "Building @insurance-lead-gen/api..."
cd "$PROJECT_ROOT/apps/api"
npx tsc -p tsconfig.json --pretty
log_success "api built successfully"
cd "$PROJECT_ROOT"

# Build orchestrator
log_info "Building @insurance-lead-gen/orchestrator..."
cd "$PROJECT_ROOT/apps/orchestrator"
npx tsc -p tsconfig.json --pretty
log_success "orchestrator built successfully"
cd "$PROJECT_ROOT"

# Summary
echo ""
echo "=========================================="
echo "  Build Complete!"
echo "=========================================="
echo ""
echo "Built artifacts:"
echo ""

for dir in \
    "packages/types/dist" \
    "packages/core/dist" \
    "packages/config/dist" \
    "apps/data-service/dist" \
    "apps/api/dist" \
    "apps/orchestrator/dist"; do
    if [ -d "$PROJECT_ROOT/$dir" ]; then
        file_count=$(find "$PROJECT_ROOT/$dir" -type f \( -name "*.js" -o -name "*.d.ts" \) | wc -l)
        echo -e "  ${GREEN}✓${NC} $dir ($file_count files)"
    else
        echo -e "  ${RED}✗${NC} $dir (not found)"
    fi
done

echo ""
log_success "All packages and applications built successfully!"
echo ""
