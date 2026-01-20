import { FullConfig } from '@playwright/test';
import dotenv from 'dotenv';
import { execSync } from 'child_process';
import { PrismaClient } from '@prisma/client';

// Load test environment variables
dotenv.config({ path: '.env.test' });

async function globalSetup(config: FullConfig) {
  console.log('🚀 Starting global E2E test setup...');

  // Set test environment
  process.env.NODE_ENV = 'test';
  process.env.PLAYWRIGHT_TEST = 'true';

  // Start required services
  try {
    console.log('📦 Starting test database...');
    // Start test database if not running
    execSync('docker-compose up -d test-postgres', { stdio: 'inherit' });
    
    // Wait for database to be ready
    await waitForDatabase();
    
    // Setup test database schema
    console.log('🗄️  Setting up test database schema...');
    execSync('npx prisma db push --schema=prisma/schema.prisma', { 
      stdio: 'inherit',
      env: { ...process.env, DATABASE_URL: process.env.DATABASE_URL }
    });
    
    // Run database migrations if needed
    console.log('🔄 Running database migrations...');
    execSync('npx prisma migrate deploy --schema=prisma/schema.prisma', { 
      stdio: 'inherit',
      env: { ...process.env, DATABASE_URL: process.env.DATABASE_URL }
    });

    // Seed test data
    console.log('🌱 Seeding test data...');
    await seedTestData();

    console.log('✅ Global setup completed successfully!');
  } catch (error) {
    console.error('❌ Global setup failed:', error);
    throw error;
  }
}

async function waitForDatabase(maxAttempts = 30) {
  const prisma = new PrismaClient();
  
  for (let i = 0; i < maxAttempts; i++) {
    try {
      await prisma.$queryRaw`SELECT 1`;
      console.log('✅ Database is ready');
      return;
    } catch (error) {
      console.log(`⏳ Waiting for database... (attempt ${i + 1}/${maxAttempts})`);
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }
  
  throw new Error('Database failed to become ready');
}

async function seedTestData() {
  const prisma = new PrismaClient();
  
  try {
    // Clean existing test data
    await prisma.claimActivity.deleteMany({ where: { id: { startsWith: 'e2e-test-' } } });
    await prisma.claimNote.deleteMany({ where: { id: { startsWith: 'e2e-test-' } } });
    await prisma.claimDocument.deleteMany({ where: { id: { startsWith: 'e2e-test-' } } });
    await prisma.claim.deleteMany({ where: { id: { startsWith: 'e2e-test-' } } });
    await prisma.policy.deleteMany({ where: { id: { startsWith: 'e2e-test-' } } });
    await prisma.lead.deleteMany({ where: { id: { startsWith: 'e2e-test-' } } });
    await prisma.user.deleteMany({ where: { id: { startsWith: 'e2e-test-' } } });
    
    // Create test users
    const adminUser = await prisma.user.create({
      data: {
        id: 'e2e-test-admin',
        email: 'admin@e2e-test.com',
        password: 'hashedpassword',
        firstName: 'Admin',
        lastName: 'User',
        role: 'admin',
        isActive: true,
      }
    });
    
    const agentUser = await prisma.user.create({
      data: {
        id: 'e2e-test-agent',
        email: 'agent@e2e-test.com',
        password: 'hashedpassword',
        firstName: 'Test',
        lastName: 'Agent',
        role: 'agent',
        isActive: true,
      }
    });
    
    const adjusterUser = await prisma.user.create({
      data: {
        id: 'e2e-test-adjuster',
        email: 'adjuster@e2e-test.com',
        password: 'hashedpassword',
        firstName: 'Test',
        lastName: 'Adjuster',
        role: 'adjuster',
        isActive: true,
      }
    });
    
    // Create test leads
    const testLeads = [];
    for (let i = 0; i < 5; i++) {
      const lead = await prisma.lead.create({
        data: {
          id: `e2e-test-lead-${i}`,
          firstName: `TestLead${i}`,
          lastName: 'User',
          email: `lead${i}@e2e-test.com`,
          phone: '+1234567890',
          insuranceType: i % 2 === 0 ? 'auto' : 'home',
          status: i === 0 ? 'new' : i === 1 ? 'contacted' : 'qualified',
          priority: i % 3 === 0 ? 'high' : i % 3 === 1 ? 'medium' : 'low',
          source: 'website',
          estimatedValue: 5000 + (i * 1000),
          notes: `Test lead ${i}`,
          assignedTo: agentUser.id,
          isActive: true,
        }
      });
      testLeads.push(lead);
    }
    
    // Create test policies
    const testPolicies = [];
    for (let i = 0; i < 3; i++) {
      const lead = testLeads[i];
      const policy = await prisma.policy.create({
        data: {
          id: `e2e-test-policy-${i}`,
          policyNumber: `POL-2024-E2E${i.toString().padStart(6, '0')}`,
          type: lead.insuranceType,
          status: 'active',
          premiumAmount: 1200 + (i * 100),
          coverage: 25000 + (i * 5000),
          startDate: new Date(),
          endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
          terms: 'Standard policy terms',
          leadId: lead.id,
          isActive: true,
        }
      });
      testPolicies.push(policy);
    }
    
    // Create test claims
    const testClaims = [];
    for (let i = 0; i < 2; i++) {
      const policy = testPolicies[i];
      const claim = await prisma.claim.create({
        data: {
          id: `e2e-test-claim-${i}`,
          claimNumber: `CLM-2024-E2E${i.toString().padStart(6, '0')}`,
          policyId: policy.id,
          leadId: policy.leadId,
          insuranceType: policy.type,
          claimType: policy.type === 'auto' ? 'auto_accident' : 'home_damage',
          status: i === 0 ? 'submitted' : 'review',
          priority: i === 0 ? 'high' : 'medium',
          severity: 'moderate',
          incidentDate: new Date(),
          submittedAt: new Date(),
          incidentDescription: `Test claim ${i}`,
          incidentLocation: 'Test Location',
          claimedAmount: 5000 + (i * 1000),
          isActive: true,
        }
      });
      testClaims.push(claim);
      
      // Create test documents for claims
      await prisma.claimDocument.create({
        data: {
          id: `e2e-test-doc-${i}`,
          claimId: claim.id,
          documentType: 'police_report',
          fileName: `test-document-${i}.pdf`,
          fileSize: 1024000,
          mimeType: 'application/pdf',
          description: 'Test document',
          isVerified: false,
          uploadedAt: new Date(),
        }
      });
      
      // Create test notes for claims
      await prisma.claimNote.create({
        data: {
          id: `e2e-test-note-${i}`,
          claimId: claim.id,
          content: `Test note for claim ${i}`,
          isInternal: true,
          author: adjusterUser.id,
          createdAt: new Date(),
        }
      });
    }
    
    console.log(`✅ Seeded test data:`);
    console.log(`   - Users: 3`);
    console.log(`   - Leads: ${testLeads.length}`);
    console.log(`   - Policies: ${testPolicies.length}`);
    console.log(`   - Claims: ${testClaims.length}`);
    
  } catch (error) {
    console.error('❌ Failed to seed test data:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

export default globalSetup;