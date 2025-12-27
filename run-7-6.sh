#!/bin/bash
set -e

echo "=== Building packages ==="
cd /home/engine/project
pnpm build

echo ""
echo "=== Generating Prisma client ==="
cd apps/data-service
npx prisma generate

echo ""
echo "=== Running type check ==="
cd /home/engine/project
pnpm type-check

echo ""
echo "=== Done ==="
