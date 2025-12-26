import {
  PrismaClient,
  InsuranceType,
  LeadStatus,
  LeadSource,
  Urgency,
  AgentStatus,
} from '@prisma/client';

const prisma = new PrismaClient();

async function main(): Promise<void> {
  console.log('Starting database seed...');

  // Create Agents
  console.log('Creating agents...');

  const agent1 = await prisma.agent.create({
    data: {
      firstName: 'John',
      lastName: 'Smith',
      email: 'john.smith@insurance.com',
      phone: '+1-555-0101',
      licenseNumber: 'INS-12345',
      licenseState: 'CA',
      yearsOfExperience: 10,
      specializations: [InsuranceType.AUTO, InsuranceType.HOME],
      status: AgentStatus.ACTIVE,
      maxCapacity: 15,
      currentCapacity: 0,
      city: 'Los Angeles',
      state: 'CA',
      zipCode: '90001',
      serviceArea: ['90001', '90002', '90003', '90004', '90005'],
      performanceScore: 85.5,
      conversionRate: 25.5,
      averageResponseTime: 15.5,
    },
  });

  const agent2 = await prisma.agent.create({
    data: {
      firstName: 'Sarah',
      lastName: 'Johnson',
      email: 'sarah.johnson@insurance.com',
      phone: '+1-555-0102',
      licenseNumber: 'INS-23456',
      licenseState: 'CA',
      yearsOfExperience: 7,
      specializations: [InsuranceType.LIFE, InsuranceType.HEALTH],
      status: AgentStatus.ACTIVE,
      maxCapacity: 12,
      currentCapacity: 0,
      city: 'San Francisco',
      state: 'CA',
      zipCode: '94101',
      serviceArea: ['94101', '94102', '94103', '94104'],
      performanceScore: 90.0,
      conversionRate: 30.0,
      averageResponseTime: 12.0,
    },
  });

  await prisma.agent.create({
    data: {
      firstName: 'Michael',
      lastName: 'Davis',
      email: 'michael.davis@insurance.com',
      phone: '+1-555-0103',
      licenseNumber: 'INS-34567',
      licenseState: 'NY',
      yearsOfExperience: 15,
      specializations: [InsuranceType.BUSINESS, InsuranceType.UMBRELLA],
      status: AgentStatus.ACTIVE,
      maxCapacity: 20,
      currentCapacity: 0,
      city: 'New York',
      state: 'NY',
      zipCode: '10001',
      serviceArea: ['10001', '10002', '10003'],
      performanceScore: 92.5,
      conversionRate: 35.0,
      averageResponseTime: 10.0,
    },
  });

  console.log('Created 3 agents');

  // Create Leads
  console.log('Creating leads...');

  const lead1 = await prisma.lead.create({
    data: {
      firstName: 'Alice',
      lastName: 'Williams',
      email: 'alice.williams@email.com',
      phone: '+1-555-1001',
      insuranceType: InsuranceType.AUTO,
      insuranceTypes: [InsuranceType.AUTO],
      source: LeadSource.WEB_FORM,
      status: LeadStatus.NEW,
      urgency: Urgency.HIGH,
      qualityScore: 85.0,
      city: 'Los Angeles',
      state: 'CA',
      zipCode: '90001',
      currentProvider: 'State Farm',
      policyExpiryDate: new Date('2024-03-15'),
      notes: 'Looking for better rates on auto insurance',
      metadata: {
        vehicleType: 'sedan',
        vehicleYear: 2020,
        vehicleMake: 'Toyota',
        vehicleModel: 'Camry',
      },
    },
  });

  await prisma.lead.create({
    data: {
      firstName: 'Bob',
      lastName: 'Anderson',
      email: 'bob.anderson@email.com',
      phone: '+1-555-1002',
      insuranceType: InsuranceType.HOME,
      insuranceTypes: [InsuranceType.HOME],
      source: LeadSource.API,
      status: LeadStatus.NEW,
      urgency: Urgency.MEDIUM,
      qualityScore: 75.0,
      city: 'Los Angeles',
      state: 'CA',
      zipCode: '90002',
      notes: 'First-time homebuyer looking for homeowners insurance',
      metadata: {
        homeValue: 550000,
        propertyType: 'single-family',
        yearBuilt: 2010,
      },
    },
  });

  const lead3 = await prisma.lead.create({
    data: {
      firstName: 'Carol',
      lastName: 'Martinez',
      email: 'carol.martinez@email.com',
      phone: '+1-555-1003',
      insuranceType: InsuranceType.LIFE,
      insuranceTypes: [InsuranceType.LIFE, InsuranceType.HEALTH],
      source: LeadSource.REFERRAL,
      status: LeadStatus.NEW,
      urgency: Urgency.HIGH,
      qualityScore: 90.0,
      city: 'San Francisco',
      state: 'CA',
      zipCode: '94101',
      dateOfBirth: new Date('1985-06-15'),
      notes: 'Interested in term life insurance and supplemental health coverage',
      metadata: {
        coverageAmount: 500000,
        term: 20,
        hasDependendents: true,
        numberOfDependents: 2,
      },
    },
  });

  await prisma.lead.create({
    data: {
      firstName: 'David',
      lastName: 'Thompson',
      email: 'david.thompson@email.com',
      phone: '+1-555-1004',
      insuranceType: InsuranceType.BUSINESS,
      insuranceTypes: [InsuranceType.BUSINESS],
      source: LeadSource.ORGANIC,
      status: LeadStatus.NEW,
      urgency: Urgency.CRITICAL,
      qualityScore: 95.0,
      city: 'New York',
      state: 'NY',
      zipCode: '10001',
      notes: 'Small business owner needs commercial liability insurance ASAP',
      metadata: {
        businessType: 'retail',
        numberOfEmployees: 15,
        annualRevenue: 2000000,
        needsWorkersComp: true,
      },
    },
  });

  console.log('Created 4 leads');

  // Create some assignments
  console.log('Creating assignments...');

  const assignment1 = await prisma.assignment.create({
    data: {
      leadId: lead1.id,
      agentId: agent1.id,
      status: 'PENDING',
      priority: 1,
      matchScore: 92.5,
      matchReason: 'Agent specializes in auto insurance in the same area',
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours from now
    },
  });

  const assignment2 = await prisma.assignment.create({
    data: {
      leadId: lead3.id,
      agentId: agent2.id,
      status: 'ACCEPTED',
      priority: 2,
      matchScore: 95.0,
      matchReason: 'Perfect match for life and health insurance specialist',
      acceptedAt: new Date(),
    },
  });

  console.log('Created 2 assignments');

  // Create some lead events
  console.log('Creating lead events...');

  await prisma.leadEvent.create({
    data: {
      leadId: lead1.id,
      eventType: 'lead_created',
      eventData: {
        source: LeadSource.WEB_FORM,
        timestamp: lead1.createdAt.toISOString(),
      },
      actorType: 'system',
    },
  });

  await prisma.leadEvent.create({
    data: {
      leadId: lead1.id,
      eventType: 'assigned',
      eventData: {
        agentId: agent1.id,
        agentName: `${agent1.firstName} ${agent1.lastName}`,
        assignmentId: assignment1.id,
        timestamp: new Date().toISOString(),
      },
      actorType: 'system',
    },
  });

  await prisma.leadEvent.create({
    data: {
      leadId: lead3.id,
      eventType: 'lead_created',
      eventData: {
        source: LeadSource.REFERRAL,
        timestamp: lead3.createdAt.toISOString(),
      },
      actorType: 'system',
    },
  });

  await prisma.leadEvent.create({
    data: {
      leadId: lead3.id,
      eventType: 'assigned',
      eventData: {
        agentId: agent2.id,
        agentName: `${agent2.firstName} ${agent2.lastName}`,
        assignmentId: assignment2.id,
        timestamp: new Date().toISOString(),
      },
      actorType: 'system',
    },
  });

  await prisma.leadEvent.create({
    data: {
      leadId: lead3.id,
      eventType: 'status_change',
      eventData: {
        oldStatus: 'NEW',
        newStatus: 'ASSIGNED',
        timestamp: new Date().toISOString(),
      },
      actorType: 'system',
    },
  });

  console.log('Created lead events');

  console.log('Database seed completed successfully!');
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error('Error during seed:', e);
    await prisma.$disconnect();
    process.exit(1);
  });
