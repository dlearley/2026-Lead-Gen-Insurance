// Attribution Service Tests

import { AttributionService } from './attribution.service';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const attributionService = new AttributionService();

describe('AttributionService', () => {
  beforeAll(async () => {
    // Clean up test data
    await prisma.attribution.deleteMany();
    await prisma.campaign.deleteMany();
    await prisma.marketingSource.deleteMany();
  });

  afterAll(async () => {
    // Clean up test data
    await prisma.attribution.deleteMany();
    await prisma.campaign.deleteMany();
    await prisma.marketingSource.deleteMany();
    await prisma.$disconnect();
  });

  describe('Marketing Source Management', () => {
    it('should create a marketing source', async () => {
      const source = await attributionService.createMarketingSource({
        name: 'Test Source',
        type: 'PAID_SEARCH',
        description: 'Test marketing source',
        costPerLead: 10.50,
        isActive: true,
      });

      expect(source).toHaveProperty('id');
      expect(source.name).toBe('Test Source');
      expect(source.type).toBe('PAID_SEARCH');
      expect(source.costPerLead).toBe(10.50);
      expect(source.isActive).toBe(true);
    });

    it('should get a marketing source', async () => {
      const source = await attributionService.createMarketingSource({
        name: 'Test Source 2',
        type: 'SOCIAL_MEDIA',
      });

      const retrieved = await attributionService.getMarketingSource(source.id);
      expect(retrieved).toHaveProperty('id', source.id);
      expect(retrieved?.name).toBe('Test Source 2');
    });

    it('should list marketing sources', async () => {
      const result = await attributionService.listMarketingSources(1, 10);
      expect(result.sources.length).toBeGreaterThanOrEqual(2);
      expect(result.total).toBeGreaterThanOrEqual(2);
    });
  });

  describe('Campaign Management', () => {
    let sourceId: string;

    beforeAll(async () => {
      const source = await attributionService.createMarketingSource({
        name: 'Campaign Test Source',
        type: 'EMAIL',
      });
      sourceId = source.id;
    });

    it('should create a campaign', async () => {
      const campaign = await attributionService.createCampaign({
        name: 'Test Campaign',
        description: 'Test marketing campaign',
        sourceId,
        startDate: new Date(),
        endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
        budget: 1000.00,
        status: 'ACTIVE',
        objective: 'Generate test leads',
        targetAudience: 'Test audience',
      });

      expect(campaign).toHaveProperty('id');
      expect(campaign.name).toBe('Test Campaign');
      expect(campaign.sourceId).toBe(sourceId);
      expect(campaign.budget).toBe(1000.00);
      expect(campaign.status).toBe('ACTIVE');
    });

    it('should get a campaign', async () => {
      const campaign = await attributionService.createCampaign({
        name: 'Test Campaign 2',
        sourceId,
        startDate: new Date(),
        budget: 2000.00,
      });

      const retrieved = await attributionService.getCampaign(campaign.id);
      expect(retrieved).toHaveProperty('id', campaign.id);
      expect(retrieved?.name).toBe('Test Campaign 2');
    });
  });

  describe('Attribution Management', () => {
    let sourceId: string;
    let campaignId: string;
    let leadId: string;

    beforeAll(async () => {
      // Create source
      const source = await attributionService.createMarketingSource({
        name: 'Attribution Test Source',
        type: 'ORGANIC_SEARCH',
      });
      sourceId = source.id;

      // Create campaign
      const campaign = await attributionService.createCampaign({
        name: 'Attribution Test Campaign',
        sourceId,
        startDate: new Date(),
        budget: 500.00,
      });
      campaignId = campaign.id;

      // Create a test lead
      const lead = await prisma.lead.create({
        data: {
          source: 'test',
          email: 'test@example.com',
          firstName: 'Test',
          lastName: 'User',
          status: 'RECEIVED',
        },
      });
      leadId = lead.id;
    });

    it('should create an attribution', async () => {
      const attribution = await attributionService.createAttribution({
        leadId,
        sourceId,
        campaignId,
        attributionType: 'FIRST_TOUCH',
        utmSource: 'google',
        utmMedium: 'organic',
        utmCampaign: 'test_campaign',
        referralSource: 'test.com',
        referringDomain: 'test.com',
        landingPage: 'https://test.com/landing',
      });

      expect(attribution).toHaveProperty('id');
      expect(attribution.leadId).toBe(leadId);
      expect(attribution.sourceId).toBe(sourceId);
      expect(attribution.campaignId).toBe(campaignId);
      expect(attribution.attributionType).toBe('FIRST_TOUCH');
      expect(attribution.utmSource).toBe('google');
    });

    it('should get an attribution', async () => {
      const attribution = await attributionService.createAttribution({
        leadId,
        sourceId,
        attributionType: 'LAST_TOUCH',
      });

      const retrieved = await attributionService.getAttribution(attribution.id);
      expect(retrieved).toHaveProperty('id', attribution.id);
      expect(retrieved?.attributionType).toBe('LAST_TOUCH');
    });

    it('should list attributions', async () => {
      const result = await attributionService.listAttributions(1, 10);
      expect(result.attributions.length).toBeGreaterThanOrEqual(2);
      expect(result.total).toBeGreaterThanOrEqual(2);
    });
  });

  describe('Analytics', () => {
    it('should calculate ROI', async () => {
      // Create a source
      const source = await attributionService.createMarketingSource({
        name: 'ROI Test Source',
        type: 'PAID_SEARCH',
        costPerLead: 10.00,
      });

      // Create a campaign
      const campaign = await attributionService.createCampaign({
        name: 'ROI Test Campaign',
        sourceId: source.id,
        startDate: new Date(),
        budget: 1000.00,
        status: 'COMPLETED',
      });

      // Create campaign metrics (simulating actual data)
      await prisma.campaignMetric.create({
        data: {
          campaignId: campaign.id,
          date: new Date(),
          leadsGenerated: 100,
          leadsQualified: 50,
          leadsConverted: 25,
          conversionRate: 25.0,
          costPerLead: 10.0,
          costPerConversion: 40.0,
          revenueGenerated: 5000.0,
          roi: 400.0,
        },
      });

      const roiData = await attributionService.calculateRoi(campaign.id);
      
      expect(roiData.roi).toBe(4000); // 5000 - 1000 = 4000
      expect(roiData.roiPercentage).toBe(400); // (4000 / 1000) * 100
      expect(roiData.totalSpend).toBe(1000);
      expect(roiData.totalRevenue).toBe(5000);
    });

    it('should get attribution analytics', async () => {
      const analytics = await attributionService.getAttributionAnalytics();
      
      expect(analytics).toHaveProperty('totalLeads');
      expect(analytics).toHaveProperty('totalConversions');
      expect(analytics).toHaveProperty('overallConversionRate');
      expect(analytics).toHaveProperty('topSources');
      expect(analytics).toHaveProperty('topCampaigns');
    });
  });
});