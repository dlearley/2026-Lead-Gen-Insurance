/**
 * Competitor Data Seed Script
 * Populates the database with initial competitor data
 */

import { PrismaClient } from '@prisma/client';
import {
  CompetitorTier,
  CompetitorCategory,
  MonitoringLevel,
  ActivityType,
  AlertSeverity,
  AlertType,
} from '@insure/types';

const prisma = new PrismaClient();

// Sample competitors for insurance lead generation space
const competitors = [
  {
    name: 'Insurify',
    website: 'https://www.insurify.com',
    industry: 'Insurance Technology',
    tier: CompetitorTier.PRIMARY,
    category: CompetitorCategory.DIRECT,
    description: 'Digital insurance comparison platform',
    headquarters: 'Cambridge, MA',
    foundedYear: 2013,
    employeeCount: 200,
    fundingTotal: 125000000,
    marketShare: 15.0,
    annualRevenue: 50000000,
    monitoringLevel: MonitoringLevel.INTENSIVE,
    metadata: {
      specialties: ['auto', 'home', 'life'],
      targetMarkets: ['individuals', 'families'],
      technology: ['AI', 'ML'],
      aliases: ['Insurify.com'],
    },
  },
  {
    name: 'PolicyGenius',
    website: 'https://www.policygenius.com',
    industry: 'Insurance Technology',
    tier: CompetitorTier.PRIMARY,
    category: CompetitorCategory.DIRECT,
    description: 'Online insurance marketplace and educational resource',
    headquarters: 'New York, NY',
    foundedYear: 2014,
    employeeCount: 250,
    fundingTotal: 150000000,
    marketShare: 12.0,
    annualRevenue: 45000000,
    monitoringLevel: MonitoringLevel.INTENSIVE,
    metadata: {
      specialties: ['life', 'disability', 'home', 'auto'],
      targetMarkets: ['individuals', 'families'],
      strengths: ['educational content', 'user experience'],
    },
  },
  {
    name: 'The Zebra',
    website: 'https://www.thezebra.com',
    industry: 'Insurance Technology',
    tier: CompetitorTier.PRIMARY,
    category: CompetitorCategory.DIRECT,
    description: 'Car insurance comparison site',
    headquarters: 'Austin, TX',
    foundedYear: 2012,
    employeeCount: 180,
    fundingTotal: 90000000,
    marketShare: 10.0,
    annualRevenue: 35000000,
    monitoringLevel: MonitoringLevel.INTENSIVE,
    metadata: {
      specialties: ['auto'],
      targetMarkets: ['drivers'],
      focus: 'auto insurance comparison',
    },
  },
  {
    name: 'EverQuote',
    website: 'https://www.everquote.com',
    industry: 'Insurance Lead Generation',
    tier: CompetitorTier.SECONDARY,
    category: CompetitorCategory.DIRECT,
    description: 'Online insurance marketplace and lead generation',
    headquarters: 'Cambridge, MA',
    foundedYear: 2008,
    employeeCount: 300,
    fundingTotal: 80000000,
    marketShare: 18.0,
    annualRevenue: 60000000,
    monitoringLevel: MonitoringLevel.STANDARD,
    metadata: {
      specialties: ['auto', 'home', 'life', 'health'],
      businessModel: 'lead generation',
      public: true,
      ticker: 'EVER',
    },
  },
  {
    name: 'Bankrate',
    website: 'https://www.bankrate.com',
    industry: 'Financial Services',
    tier: CompetitorTier.SECONDARY,
    category: CompetitorCategory.INDIRECT,
    description: 'Personal finance website with insurance comparison',
    headquarters: 'New York, NY',
    foundedYear: 1976,
    employeeCount: 500,
    marketShare: 8.0,
    annualRevenue: 200000000,
    monitoringLevel: MonitoringLevel.STANDARD,
    metadata: {
      specialties: ['auto', 'home', 'life'],
      parentCompany: 'Red Ventures',
      focus: 'financial products comparison',
    },
  },
  {
    name: 'NerdWallet',
    website: 'https://www.nerdwallet.com',
    industry: 'Financial Services',
    tier: CompetitorTier.SECONDARY,
    category: CompetitorCategory.INDIRECT,
    description: 'Personal finance platform with insurance comparison',
    headquarters: 'San Francisco, CA',
    foundedYear: 2009,
    employeeCount: 400,
    fundingTotal: 550000000,
    marketShare: 12.0,
    annualRevenue: 150000000,
    monitoringLevel: MonitoringLevel.STANDARD,
    metadata: {
      specialties: ['auto', 'home', 'life', 'travel'],
      strengths: ['content marketing', 'brand recognition'],
      public: true,
    },
  },
  {
    name: 'CoverWallet',
    website: 'https://www.coverwallet.com',
    industry: 'Insurance Technology',
    tier: CompetitorTier.SECONDARY,
    category: CompetitorCategory.DIRECT,
    description: 'Small business insurance platform',
    headquarters: 'New York, NY',
    foundedYear: 2015,
    employeeCount: 100,
    fundingTotal: 60000000,
    marketShare: 5.0,
    annualRevenue: 15000000,
    monitoringLevel: MonitoringLevel.STANDARD,
    metadata: {
      specialties: ['commercial', 'small business'],
      targetMarkets: ['small businesses', 'SME'],
      focus: 'business insurance',
    },
  },
  {
    name: 'Next Insurance',
    website: 'https://www.nextinsurance.com',
    industry: 'Insurance Technology',
    tier: CompetitorTier.EMERGING,
    category: CompetitorCategory.DIRECT,
    description: 'Digital-first small business insurance',
    headquarters: 'Palo Alto, CA',
    foundedYear: 2016,
    employeeCount: 400,
    fundingTotal: 881000000,
    marketShare: 7.0,
    annualRevenue: 25000000,
    monitoringLevel: MonitoringLevel.STANDARD,
    metadata: {
      specialties: ['commercial', 'small business'],
      businessModel: 'direct-to-consumer',
      strengths: ['digital experience', 'quick quotes'],
    },
  },
  {
    name: 'Lemonade',
    website: 'https://www.lemonade.com',
    industry: 'Insurance Technology',
    tier: CompetitorTier.EMERGING,
    category: CompetitorCategory.DIRECT,
    description: 'AI-powered insurance carrier',
    headquarters: 'New York, NY',
    foundedYear: 2015,
    employeeCount: 600,
    fundingTotal: 480000000,
    marketShare: 3.0,
    annualRevenue: 100000000,
    monitoringLevel: MonitoringLevel.INTENSIVE,
    metadata: {
      specialties: ['home', 'renters', 'pet', 'life'],
      businessModel: 'carrier',
      technology: ['AI', 'blockchain'],
      public: true,
      ticker: 'LMND',
    },
  },
  {
    name: 'Hippo Insurance',
    website: 'https://www.hippo.com',
    industry: 'Insurance Technology',
    tier: CompetitorTier.EMERGING,
    category: CompetitorCategory.DIRECT,
    description: 'Modern home insurance carrier',
    headquarters: 'Palo Alto, CA',
    foundedYear: 2015,
    employeeCount: 800,
    fundingTotal: 700000000,
    marketShare: 4.0,
    annualRevenue: 120000000,
    monitoringLevel: MonitoringLevel.INTENSIVE,
    metadata: {
      specialties: ['home'],
      businessModel: 'carrier',
      technology: ['IoT', 'smart home'],
      public: true,
      ticker: 'HIPO',
    },
  },
];

async function seedCompetitors() {
  console.log('Starting competitor seeding...');

  let created = 0;
  let updated = 0;

  for (const competitorData of competitors) {
    try {
      // Check if competitor exists
      const existing = await prisma.competitor.findUnique({
        where: { name: competitorData.name },
      });

      if (existing) {
        // Update existing competitor
        await prisma.competitor.update({
          where: { id: existing.id },
          data: {
            ...competitorData,
            lastWebsiteScan: existing.lastWebsiteScan,
            lastNewsScan: existing.lastNewsScan,
            lastPricingCheck: existing.lastPricingCheck,
          },
        });
        console.log(`✓ Updated competitor: ${competitorData.name}`);
        updated++;
      } else {
        // Create new competitor
        await prisma.competitor.create({
          data: {
            ...competitorData,
            threatScore: Math.floor(Math.random() * 60) + 20,
            opportunityScore: Math.floor(Math.random() * 60) + 20,
          },
        });
        console.log(`✓ Created competitor: ${competitorData.name}`);
        created++;
      }
    } catch (error) {
      console.error(`✗ Error processing ${competitorData.name}:`, error);
    }
  }

  console.log(`\nCompetitor seeding complete:`);
  console.log(`  - Created: ${created}`);
  console.log(`  - Updated: ${updated}`);
  console.log(`  - Total: ${created + updated}`);
}

async function seedSampleActivities() {
  console.log('\nSeeding sample activities...');

  const competitors = await prisma.competitor.findMany({ take: 5 });

  for (const competitor of competitors) {
    // Create a few sample activities
    const activities = [
      {
        competitorId: competitor.id,
        activityType: ActivityType.FEATURE_LAUNCH,
        title: 'New Feature Announcement',
        description: `${competitor.name} has announced a new feature in their platform`,
        source: 'website',
        severity: AlertSeverity.MEDIUM,
      },
      {
        competitorId: competitor.id,
        activityType: ActivityType.NEWS_MENTION,
        title: 'Industry News Mention',
        description: `${competitor.name} mentioned in recent industry news`,
        source: 'news',
        severity: AlertSeverity.LOW,
      },
      {
        competitorId: competitor.id,
        activityType: ActivityType.MARKETING_CAMPAIGN,
        title: 'New Marketing Campaign',
        description: `${competitor.name} launched a new marketing campaign`,
        source: 'social',
        severity: AlertSeverity.LOW,
      },
    ];

    for (const activity of activities) {
      try {
        await prisma.competitorActivity.create({ data: activity });
        console.log(`✓ Created activity for ${competitor.name}`);
      } catch (error) {
        // Ignore duplicates
      }
    }
  }
}

async function seedSamplePricing() {
  console.log('\nSeeding sample pricing data...');

  const competitors = await prisma.competitor.findMany({ take: 5 });

  for (const competitor of competitors) {
    const pricing = [
      {
        competitorId: competitor.id,
        planName: 'Basic',
        monthlyPrice: 29.99,
        currency: 'USD',
        billingFrequency: 'monthly',
        features: ['Basic coverage', 'Online quotes', 'Customer support'],
        limitations: ['Limited coverage', 'No add-ons'],
        discountAvailable: true,
        maxDiscount: 20,
        volumeDiscount: false,
        freeTierAvailable: false,
      },
      {
        competitorId: competitor.id,
        planName: 'Premium',
        monthlyPrice: 99.99,
        currency: 'USD',
        billingFrequency: 'monthly',
        features: ['Full coverage', 'Priority support', 'Multiple policies', 'Digital tools'],
        limitations: [],
        discountAvailable: true,
        maxDiscount: 15,
        volumeDiscount: true,
        freeTierAvailable: false,
      },
    ];

    for (const price of pricing) {
      try {
        await prisma.pricingData.create({
          data: {
            ...price,
            detectedAt: new Date(),
          },
        });
        console.log(`✓ Created pricing data for ${competitor.name} - ${price.planName}`);
      } catch (error) {
        // Ignore duplicates
      }
    }
  }
}

async function seedSampleAlerts() {
  console.log('\nSeeding sample alerts...');

  const competitors = await prisma.competitor.findMany({ take: 5 });

  for (const competitor of competitors) {
    const alert = {
      competitorId: competitor.id,
      alertType: AlertType.NEW_FEATURE,
      severity: competitor.tier === CompetitorTier.PRIMARY ? AlertSeverity.HIGH : AlertSeverity.MEDIUM,
      title: `Competitive Alert: ${competitor.name}`,
      description: 'New feature detected that may impact our market position',
      recommendation: 'Review feature and consider competitive response',
      targetAudience: ['sales', 'product', 'executive'],
    };

    try {
      await prisma.competitiveAlert.create({ data: alert });
      console.log(`✓ Created alert for ${competitor.name}`);
    } catch (error) {
      // Ignore duplicates
    }
  }
}

async function seedSampleBattleCards() {
  console.log('\nSeeding sample battle cards...');

  const competitors = await prisma.competitor.findMany({ take: 5 });

  for (const competitor of competitors) {
    const battleCard = {
      competitorId: competitor.id,
      title: `Battle Card: ${competitor.name}`,
      competitorName: competitor.name,
      tagline: competitor.description,
      overview: `Competitive analysis of ${competitor.name}, a ${competitor.tier.toLowerCase()} competitor in the ${competitor.industry} space.`,
      strengths: ['Strong brand recognition', 'User-friendly platform', 'Broad product offering'],
      weaknesses: ['Higher pricing', 'Limited customization', 'Slower support response times'],
      typicalObjections: ['They are cheaper', 'They have more features', 'I know their brand'],
      objectionResponses: {
        'They are cheaper': 'Our pricing reflects our superior service and comprehensive coverage. When you factor in total cost of ownership, we offer better value.',
        'They have more features': 'We focus on quality over quantity. Our features are carefully chosen to provide real value, not complexity.',
        'I know their brand': 'While brand recognition is important, our customers consistently rate us higher in satisfaction and claims handling.',
      },
      winStrategies: ['Emphasize our superior customer service', 'Highlight our competitive pricing with better coverage', 'Leverage our faster quote turnaround'],
      talkingPoints: [
        'We have a 95% customer satisfaction rate',
        'Our claims are processed 2x faster than the industry average',
        'We offer personalized support from licensed agents',
      ],
      proofPoints: [
        '4.8/5 average customer rating',
        '98% claim approval rate',
        '24/7 customer support availability',
      ],
      dealSizeRange: '$5,000 - $100,000',
      typicalSalesCycle: '30-60 days',
      keyDecisionMakers: ['CFO', 'Risk Manager', 'Procurement Director'],
      pricingPosition: 'Premium',
      targetCustomers: ['Mid-sized companies', 'Growing businesses', 'Value-conscious buyers'],
      verticalFocus: ['Technology', 'Healthcare', 'Professional Services'],
      recentMoves: ['Recent funding round', 'New product launch', 'Key executive hire'],
      actionItems: ['Monitor pricing changes', 'Track feature launches', 'Track customer wins'],
    };

    try {
      await prisma.battleCard.create({ data: battleCard });
      console.log(`✓ Created battle card for ${competitor.name}`);
    } catch (error) {
      // Ignore duplicates
    }
  }
}

async function main() {
  try {
    await seedCompetitors();
    await seedSampleActivities();
    await seedSamplePricing();
    await seedSampleAlerts();
    await seedSampleBattleCards();

    console.log('\n✓ All seeding completed successfully!');
  } catch (error) {
    console.error('\n✗ Seeding failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the seed script
if (require.main === module) {
  main();
}

export { seedCompetitors, seedSampleActivities, seedSamplePricing, seedSampleAlerts, seedSampleBattleCards };
