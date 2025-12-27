#!/bin/bash
set -e

echo "=== Starting Run 8.2 Build Process ==="

# Change to project directory
cd /home/engine/project

# Check if node/npm are available
echo "Checking node availability..."
which node || echo "Node not found in PATH"
which npm || echo "NPM not found in PATH"

# Check environment
echo "Node version: $(node --version 2>/dev/null || echo 'not available')"
echo "NPM version: $(npm --version 2>/dev/null || echo 'not available')"

# Check for pnpm
echo "Checking for pnpm..."
which pnpm || echo "PNPM not found"

echo "=== Build Complete ==="
