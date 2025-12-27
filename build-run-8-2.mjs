#!/usr/bin/env node
/**
 * Run 8.2: Build and Type-Check Fix
 * 
 * This script builds all packages and applications in the Insurance Lead Gen AI Platform
 * in the correct dependency order.
 * 
 * Build Order:
 * 1. @insurance-lead-gen/types (no dependencies)
 * 2. @insurance-lead-gen/core (depends on types)
 * 3. @insurance-lead-gen/config (depends on types)
 * 4. @insurance-lead-gen/data-service (depends on packages + Prisma)
 * 5. @insurance-lead-gen/api (depends on packages)
 * 6. @insurance-lead-gen/orchestrator (depends on packages)
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const PROJECT_ROOT = process.cwd();

/**
 * Run a command and capture output
 */
function runCommand(cmd, options = {}) {
  console.log(`$ ${cmd}`);
  try {
    const output = execSync(cmd, {
      cwd: PROJECT_ROOT,
      stdio: 'inherit',
      ...options,
    });
    return true;
  } catch (error) {
    console.error(`Command failed: ${error.message}`);
    return false;
  }
}

/**
 * Check if a directory exists and has files
 */
function checkBuildOutput(dirPath) {
  const fullPath = path.join(PROJECT_ROOT, dirPath);
  if (fs.existsSync(fullPath)) {
    const files = fs.readdirSync(fullPath).filter(f => 
      f.endsWith('.js') || f.endsWith('.d.ts')
    );
    console.log(`  ✓ ${dirPath}/ (${files.length} files)`);
    return true;
  }
  return false;
}

/**
 * Build a TypeScript project
 */
function buildProject(tsconfigPath, name) {
  const success = runCommand(`npx tsc -p ${tsconfigPath} --pretty`);
  if (success) {
    const dirPath = path.dirname(tsconfigPath).replace(PROJECT_ROOT + '/', '');
    checkBuildOutput(`${dirPath}/dist`);
  }
  return success;
}

async function main() {
  console.log('='.repeat(60));
  console.log('  Run 8.2: Build and Type-Check Fix');
  console.log('='.repeat(60));
  console.log(`Working directory: ${PROJECT_ROOT}`);
  console.log('');

  let allSuccess = true;

  // Step 1: Build shared packages
  console.log('Step 1: Building Shared Packages');
  console.log('-'.repeat(60));

  // 1.1 Build @insurance-lead-gen/types
  console.log('\n1. Building @insurance-lead-gen/types...');
  if (!buildProject('packages/types/tsconfig.json', 'types')) {
    allSuccess = false;
  }

  // 1.2 Build @insurance-lead-gen/core
  console.log('\n2. Building @insurance-lead-gen/core...');
  if (!buildProject('packages/core/tsconfig.json', 'core')) {
    allSuccess = false;
  }

  // 1.3 Build @insurance-lead-gen/config
  console.log('\n3. Building @insurance-lead-gen/config...');
  if (!buildProject('packages/config/tsconfig.json', 'config')) {
    allSuccess = false;
  }

  // Step 2: Generate Prisma client
  console.log('\n\nStep 2: Generating Prisma Client');
  console.log('-'.repeat(60));
  console.log('\nGenerating Prisma client...');
  if (!runCommand('cd apps/data-service && npx prisma generate')) {
    log_warn('Prisma generation may have failed (this is OK if Prisma is not installed)');
  }

  // Step 3: Build applications
  console.log('\n\nStep 3: Building Applications');
  console.log('-'.repeat(60));

  // 3.1 Build data-service
  console.log('\n4. Building @insurance-lead-gen/data-service...');
  if (!buildProject('apps/data-service/tsconfig.json', 'data-service')) {
    allSuccess = false;
  }

  // 3.2 Build API service
  console.log('\n5. Building @insurance-lead-gen/api...');
  if (!buildProject('apps/api/tsconfig.json', 'api')) {
    allSuccess = false;
  }

  // 3.3 Build orchestrator
  console.log('\n6. Building @insurance-lead-gen/orchestrator...');
  if (!buildProject('apps/orchestrator/tsconfig.json', 'orchestrator')) {
    allSuccess = false;
  }

  // Summary
  console.log('\n\n' + '='.repeat(60));
  console.log('  Build Summary');
  console.log('='.repeat(60));
  console.log('');

  if (allSuccess) {
    console.log('✓ All builds completed successfully!');
    console.log('');
    console.log('Built artifacts:');
    checkBuildOutput('packages/types/dist');
    checkBuildOutput('packages/core/dist');
    checkBuildOutput('packages/config/dist');
    checkBuildOutput('apps/data-service/dist');
    checkBuildOutput('apps/api/dist');
    checkBuildOutput('apps/orchestrator/dist');
    console.log('');
    console.log('Next steps:');
    console.log('  1. Review dist/ directories to verify output');
    console.log('  2. Run type-check: npx tsc --noEmit');
    console.log('  3. Test the built applications');
  } else {
    console.log('✗ Some builds failed. Please check the errors above.');
    process.exit(1);
  }
}

// Helper function for colored output
function log_warn(message) {
  console.log(`\n⚠️  ${message}\n`);
}

main().catch(err => {
  console.error('Unexpected error:', err);
  process.exit(1);
});
