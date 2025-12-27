#!/usr/bin/env node
/**
 * Run 8.2: Build and Type-Check Fix
 * 
 * This script builds all packages and applications in the correct order:
 * 1. Build shared packages (types, core, config)
 * 2. Generate Prisma client
 * 3. Build data-service
 * 4. Build api and orchestrator
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const PROJECT_ROOT = '/home/engine/project';

function runCommand(cmd, description) {
  console.log(`\n📦 ${description}`);
  console.log(`   Running: ${cmd}`);
  try {
    execSync(cmd, { 
      stdio: 'inherit', 
      cwd: PROJECT_ROOT,
      env: { ...process.env, NODE_OPTIONS: '--experimental-vm-modules' }
    });
    console.log(`   ✅ Success`);
    return true;
  } catch (error) {
    console.error(`   ❌ Failed: ${error.message}`);
    return false;
  }
}

function checkDist(packageName) {
  const distPath = path.join(PROJECT_ROOT, 'packages', packageName, 'dist');
  if (fs.existsSync(distPath)) {
    const files = fs.readdirSync(distPath);
    console.log(`   📁 dist/ contains ${files.length} files`);
    return true;
  }
  return false;
}

async function main() {
  console.log('='.repeat(60));
  console.log('  Run 8.2: Build and Type-Check Fix');
  console.log('='.repeat(60));
  
  let allSuccess = true;
  
  // Step 1: Build packages in dependency order
  console.log('\n📋 Step 1: Building Shared Packages');
  console.log('-'.repeat(60));
  
  // Build @insurance-lead-gen/types (no dependencies)
  console.log('\n1️⃣ Building @insurance-lead-gen/types...');
  const typesSuccess = runCommand(
    'npx tsc -p packages/types/tsconfig.json --pretty',
    'Building types package'
  );
  if (!typesSuccess) allSuccess = false;
  else checkDist('types');
  
  // Build @insurance-lead-gen/core (depends on types)
  console.log('\n2️⃣ Building @insurance-lead-gen/core...');
  const coreSuccess = runCommand(
    'npx tsc -p packages/core/tsconfig.json --pretty',
    'Building core package'
  );
  if (!coreSuccess) allSuccess = false;
  else checkDist('core');
  
  // Build @insurance-lead-gen/config (depends on types)
  console.log('\n3️⃣ Building @insurance-lead-gen/config...');
  const configSuccess = runCommand(
    'npx tsc -p packages/config/tsconfig.json --pretty',
    'Building config package'
  );
  if (!configSuccess) allSuccess = false;
  else checkDist('config');
  
  // Step 2: Generate Prisma client
  console.log('\n📋 Step 2: Generating Prisma Client');
  console.log('-'.repeat(60));
  
  const prismaSuccess = runCommand(
    'npx prisma generate',
    'Generating Prisma client'
  );
  if (!prismaSuccess) allSuccess = false;
  
  // Step 3: Build data-service
  console.log('\n📋 Step 3: Building Data Service');
  console.log('-'.repeat(60));
  
  const dataServiceSuccess = runCommand(
    'npx tsc -p apps/data-service/tsconfig.json --pretty',
    'Building data-service'
  );
  if (!dataServiceSuccess) allSuccess = false;
  else checkDist('data-service');
  
  // Step 4: Build API and Orchestrator
  console.log('\n📋 Step 4: Building API and Orchestrator');
  console.log('-'.repeat(60));
  
  const apiSuccess = runCommand(
    'npx tsc -p apps/api/tsconfig.json --pretty',
    'Building API service'
  );
  if (!apiSuccess) allSuccess = false;
  else checkDist('api');
  
  const orchestratorSuccess = runCommand(
    'npx tsc -p apps/orchestrator/tsconfig.json --pretty',
    'Building orchestrator service'
  );
  if (!orchestratorSuccess) allSuccess = false;
  else checkDist('orchestrator');
  
  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('  Build Summary');
  console.log('='.repeat(60));
  
  if (allSuccess) {
    console.log('\n✅ All builds completed successfully!');
    console.log('\n📁 Built artifacts:');
    ['packages/types', 'packages/core', 'packages/config', 
     'apps/data-service', 'apps/api', 'apps/orchestrator'].forEach(pkg => {
      const distPath = path.join(PROJECT_ROOT, pkg, 'dist');
      if (fs.existsSync(distPath)) {
        console.log(`   ✓ ${pkg}/dist/`);
      }
    });
  } else {
    console.log('\n❌ Some builds failed. Please check the errors above.');
    process.exit(1);
  }
}

main().catch(err => {
  console.error('\n❌ Unexpected error:', err);
  process.exit(1);
});
