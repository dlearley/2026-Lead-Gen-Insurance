import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function seed() {
  console.log('Seeding insurance compliance data...');

  // 1. Seed Insurance Regulations for major states
  const states = ['CA', 'NY', 'TX', 'FL', 'IL', 'OH', 'PA'];
  for (const state of states) {
    await prisma.insuranceRegulation.upsert({
      where: { id: `reg-${state}-unfair` },
      update: {},
      create: {
        id: `reg-${state}-unfair`,
        jurisdiction: state,
        regulationType: 'UnfairPractice',
        statute: `${state} Ins. Code § 790.03`,
        description: `Prohibits unfair methods of competition and unfair or deceptive acts or practices in the business of insurance in ${state}.`,
        effectiveDate: new Date('2020-01-01'),
        lastReviewedDate: new Date(),
        enforcingAgency: 'Department of Insurance',
      },
    });
  }

  // 2. Seed Fair Lending Rules (Federal)
  await prisma.fairLendingRule.upsert({
    where: { id: 'rule-ecoa' },
    update: {},
    create: {
      id: 'rule-ecoa',
      ruleType: 'ECOA',
      regulation: 'Regulation B',
      description: 'The Equal Credit Opportunity Act prohibits creditors from discriminating against applicants on the basis of race, color, religion, national origin, sex, marital status, or age.',
      prohibitedFactors: ['race', 'color', 'religion', 'nationalOrigin', 'sex', 'maritalStatus', 'age'],
      jurisdiction: 'Federal',
      affectedProducts: ['All'],
      complianceActions: ['Adverse Action Notice', 'Record Retention'],
      effectiveDate: new Date('1974-10-28'),
    },
  });

  // 3. Seed common Product Compliance Rules
  await prisma.insuranceProductRule.upsert({
    where: { productType_jurisdiction_ruleType: { productType: 'Auto', jurisdiction: 'CA', ruleType: 'RequiredDisclosure' } },
    update: {},
    create: {
      productType: 'Auto',
      jurisdiction: 'CA',
      ruleType: 'RequiredDisclosure',
      ruleDescription: 'California requires disclosure of all factors used in premium calculation.',
      ruleCondition: JSON.stringify({ field: 'disclosures', operator: 'contains', value: 'premium_factors' }),
      severity: 'High',
      effectiveDate: new Date('2022-01-01'),
    },
  });

  // 4. Seed Standard Underwriting Rules
  await prisma.underwritingRule.create({
    data: {
      productType: 'Auto',
      state: 'CA',
      ruleDescription: 'Minimum age for primary driver',
      ruleExpression: JSON.stringify({ field: 'driverAge', operator: 'gte', value: 16 }),
      action: 'Decline',
      reasoning: 'Primary driver must be at least 16 years of age.',
      effectiveDate: new Date('2021-01-01'),
    },
  });

  // 5. Seed Required Disclosures
  for (const state of states) {
    await prisma.requiredDisclosure.upsert({
      where: { jurisdiction_productType_disclosureType: { jurisdiction: state, productType: 'All', disclosureType: 'Privacy' } },
      update: {},
      create: {
        jurisdiction: state,
        productType: 'All',
        disclosureType: 'Privacy',
        disclosureText: `This privacy notice describes how we collect and use your personal information in ${state}.`,
        format: 'PDF',
        timing: 'Before Quote',
        effectiveDate: new Date('2023-01-01'),
      },
    });
  }

  console.log('Finished seeding insurance compliance data.');
}

seed()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
