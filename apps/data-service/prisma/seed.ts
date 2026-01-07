import { PrismaClient, AssignmentStatus, InsuranceType, LeadStatus } from '@prisma/client';

const prisma = new PrismaClient();

async function main(): Promise<void> {
  console.log('Starting database seed...');

  const agent1 = await prisma.agent.upsert({
    where: { email: 'john.smith@insurance.com' },
    update: {
      rating: 4.6,
      isActive: true,
      maxLeadCapacity: 15,
      specializations: ['auto', 'home'],
      city: 'Los Angeles',
      state: 'CA',
      country: 'US',
    },
    create: {
      firstName: 'John',
      lastName: 'Smith',
      email: 'john.smith@insurance.com',
      phone: '+1-555-0101',
      licenseNumber: 'INS-12345',
      specializations: ['auto', 'home'],
      city: 'Los Angeles',
      state: 'CA',
      country: 'US',
      rating: 4.6,
      isActive: true,
      maxLeadCapacity: 15,
      currentLeadCount: 0,
      averageResponseTime: 15,
      conversionRate: 0.25,
    },
  });

  const agent2 = await prisma.agent.upsert({
    where: { email: 'sarah.johnson@insurance.com' },
    update: {
      rating: 4.8,
      isActive: true,
      maxLeadCapacity: 12,
      specializations: ['life', 'health'],
      city: 'San Francisco',
      state: 'CA',
      country: 'US',
    },
    create: {
      firstName: 'Sarah',
      lastName: 'Johnson',
      email: 'sarah.johnson@insurance.com',
      phone: '+1-555-0102',
      licenseNumber: 'INS-23456',
      specializations: ['life', 'health'],
      city: 'San Francisco',
      state: 'CA',
      country: 'US',
      rating: 4.8,
      isActive: true,
      maxLeadCapacity: 12,
      currentLeadCount: 0,
      averageResponseTime: 12,
      conversionRate: 0.3,
    },
  });

  console.log('Created agents', { agent1: agent1.id, agent2: agent2.id });

  const lead1 = await prisma.lead.create({
    data: {
      source: 'web_form',
      firstName: 'Alice',
      lastName: 'Williams',
      email: 'alice.williams@email.com',
      phone: '+1-555-1001',
      insuranceType: InsuranceType.AUTO,
      status: LeadStatus.RECEIVED,
      street: '123 Main St',
      city: 'Los Angeles',
      state: 'CA',
      zipCode: '90001',
      country: 'US',
      metadata: {
        notes: 'Looking for better rates on auto insurance',
      },
    },
  });

  const lead2 = await prisma.lead.create({
    data: {
      source: 'partner_api',
      firstName: 'Bob',
      lastName: 'Anderson',
      email: 'bob.anderson@email.com',
      phone: '+1-555-1002',
      insuranceType: InsuranceType.HOME,
      status: LeadStatus.QUALIFIED,
      street: '456 Oak Ave',
      city: 'San Francisco',
      state: 'CA',
      zipCode: '94101',
      country: 'US',
      qualityScore: 82,
      metadata: {
        notes: 'First-time homebuyer looking for homeowners insurance',
      },
    },
  });

  console.log('Created leads', {
    lead1: lead1.id,
    lead2: lead2.id,
  });

  const assignment1 = await prisma.leadAssignment.create({
    data: {
      leadId: lead1.id,
      agentId: agent1.id,
      status: AssignmentStatus.PENDING,
      notes: 'Auto lead seeded for demo',
    },
  });

  const assignment2 = await prisma.leadAssignment.create({
    data: {
      leadId: lead2.id,
      agentId: agent2.id,
      status: AssignmentStatus.ACCEPTED,
      acceptedAt: new Date(),
      notes: 'Home lead seeded for demo',
    },
  });

  console.log('Created assignments', { assignment1: assignment1.id, assignment2: assignment2.id });

  await prisma.event.createMany({
    data: [
      {
        type: 'lead.created',
        source: 'seed',
        entityType: 'lead',
        entityId: lead1.id,
        data: { leadId: lead1.id },
      },
      {
        type: 'lead.created',
        source: 'seed',
        entityType: 'lead',
        entityId: lead2.id,
        data: { leadId: lead2.id },
      },
    ],
  });

  // Seed regulatory templates (Phase 25.1F)
  await prisma.regulatoryReportTemplate.upsert({
    where: { templateName: 'Federal-AnnualCompliance-v1' },
    update: {
      status: 'Active',
    },
    create: {
      templateName: 'Federal-AnnualCompliance-v1',
      jurisdiction: 'Federal',
      reportType: 'AnnualCompliance',
      description: 'Baseline annual compliance report template',
      sections: JSON.stringify([
        { title: 'Executive Summary', required: true },
        { title: 'Key Metrics', required: true },
        { title: 'Findings & Remediation', required: true },
      ]),
      requiredMetrics: ['leadsCreated', 'eventsCreated'],
      formatRequirements: 'PDF',
      frequency: 'Annual',
      dueDate: '90 days after period end',
      regulatoryBody: 'Federal',
      contactInfo: 'compliance@regulator.gov',
      submissionURL: 'https://regulator.example/portal',
      submissionEmail: 'submissions@regulator.example',
      status: 'Active',
    },
  });

  await prisma.regulatoryReportTemplate.upsert({
    where: { templateName: 'CA-IncidentReport-v1' },
    update: { status: 'Active' },
    create: {
      templateName: 'CA-IncidentReport-v1',
      jurisdiction: 'CA',
      reportType: 'IncidentReport',
      description: 'California incident reporting template',
      sections: JSON.stringify([
        { title: 'Incident Summary', required: true },
        { title: 'Affected Individuals', required: true },
        { title: 'Notifications', required: true },
      ]),
      requiredMetrics: ['violations'],
      formatRequirements: 'PDF',
      frequency: 'OnDemand',
      dueDate: 'Within 60 days of discovery',
      regulatoryBody: 'State of California',
      contactInfo: 'privacy@oag.ca.gov',
      submissionURL: 'https://oag.ca.gov/privacy',
      submissionEmail: 'privacy@oag.ca.gov',
      status: 'Active',
    },
  });

  // Seed current-year deadlines
  const year = new Date().getUTCFullYear();
  const annualDue = new Date(Date.UTC(year, 2, 31));
  await prisma.regulatoryDeadline.upsert({
    where: { deadlineId: `Federal-AnnualCompliance-${year}` },
    update: {
      dueDate: annualDue,
      reminderDates: [
        new Date(Date.UTC(year, 2, 1)),
        new Date(Date.UTC(year, 2, 24)),
      ],
      status: 'Upcoming',
    },
    create: {
      deadlineId: `Federal-AnnualCompliance-${year}`,
      reportType: 'AnnualCompliance',
      jurisdiction: 'Federal',
      description: `Annual compliance report due for ${year}`,
      dueDate: annualDue,
      reminderDates: [
        new Date(Date.UTC(year, 2, 1)),
        new Date(Date.UTC(year, 2, 24)),
      ],
      isRecurring: true,
      recurrencePattern: 'Annual',
      status: 'Upcoming',
    },
  });

  console.log('Database seed completed successfully');
}

main()
  .catch((error) => {
    console.error('Seed failed', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
