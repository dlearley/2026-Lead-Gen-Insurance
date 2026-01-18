import { FullConfig } from '@playwright/test';
import dotenv from 'dotenv';
import { execSync } from 'child_process';
import { PrismaClient } from '@prisma/client';

async function globalTeardown(config: FullConfig) {
  console.log('🧹 Starting global E2E test teardown...');

  try {
    // Clean up test database
    console.log('🗄️  Cleaning up test database...');
    await cleanupTestDatabase();

    // Stop test services if needed
    console.log('📦 Stopping test services...');
    // execSync('docker-compose stop test-postgres', { stdio: 'inherit' });

    console.log('✅ Global teardown completed successfully!');
  } catch (error) {
    console.error('❌ Global teardown failed:', error);
    throw error;
  }
}

async function cleanupTestDatabase() {
  const prisma = new PrismaClient();
  
  try {
    // Clean up all test data
    await prisma.claimActivity.deleteMany({ where: { id: { startsWith: 'e2e-test-' } } });
    await prisma.claimNote.deleteMany({ where: { id: { startsWith: 'e2e-test-' } } });
    await prisma.claimDocument.deleteMany({ where: { id: { startsWith: 'e2e-test-' } } });
    await prisma.claim.deleteMany({ where: { id: { startsWith: 'e2e-test-' } } });
    await prisma.policy.deleteMany({ where: { id: { startsWith: 'e2e-test-' } } });
    await prisma.lead.deleteMany({ where: { id: { startsWith: 'e2e-test-' } } });
    await prisma.user.deleteMany({ where: { id: { startsWith: 'e2e-test-' } } });

    console.log('✅ Test database cleaned up');
  } catch (error) {
    console.error('❌ Failed to clean up test database:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

export default globalTeardown;