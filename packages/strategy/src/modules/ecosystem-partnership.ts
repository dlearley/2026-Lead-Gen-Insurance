import { Injectable, Logger } from '@nestjs/common';

export interface Partner {
  id: string;
  name: string;
  type: 'technology' | 'channel' | 'data' | 'content' | 'service';
  category: string;
  tier: 'platinum' | 'gold' | 'silver' | 'bronze';
  revenueSharePercentage: number;
  integrationStatus: 'pending' | 'in_progress' | 'completed' | 'active';
  activationMetrics: {
    leadsGenerated: number;
    revenueContributed: number;
    customerReferrals: number;
    apiUsage: number;
  };
  capabilities: string[];
  markets: string[];
  committedLeads: number;
  performanceScore: number;
  joinedAt: Date;
  status: 'active' | 'inactive' | 'suspended';
}

export interface EcosystemMetrics {
  totalPartners: number;
  activePartners: number;
  revenueContributed: number;
  leadsGenerated: number;
  apiUsage: number;
  ecosystemHealth: number;
  growthRate: number;
  partnerSatisfaction: number;
}

export interface PartnershipOpportunity {
  partnerId: string;
  partnerName: string;
  opportunityType: 'integration' | 'co_marketing' | 'revenue_share' | 'data_sharing';
  potentialRevenue: number;
  implementationComplexity: 'low' | 'medium' | 'high';
  timeline: string;
  requiredResources: string[];
  strategicBenefits: string[];
  successMetrics: string[];
}

@Injectable()
export class EcosystemPartnershipManager {
  private readonly logger = new Logger(EcosystemPartnershipManager.name);

  private partners: Partner[] = [
    {
      id: 'partner-salesforce',
      name: 'Salesforce',
      type: 'technology',
      category: 'CRM Integration',
      tier: 'platinum',
      revenueSharePercentage: 15,
      integrationStatus: 'active',
      activationMetrics: {
        leadsGenerated: 50000,
        revenueContributed: 750000,
        customerReferrals: 125,
        apiUsage: 2500000
      },
      capabilities: ['Lead Management', 'CRM Sync', 'Workflow Automation'],
      markets: ['North America', 'Europe'],
      committedLeads: 100000,
      performanceScore: 4.7,
      joinedAt: new Date('2024-01-15'),
      status: 'active'
    },
    {
      id: 'partner-hubspot',
      name: 'HubSpot',
      type: 'technology',
      category: 'Marketing Automation',
      tier: 'gold',
      revenueSharePercentage: 12,
      integrationStatus: 'completed',
      activationMetrics: {
        leadsGenerated: 35000,
        revenueContributed: 525000,
        customerReferrals: 85,
        apiUsage: 1800000
      },
      capabilities: ['Email Marketing', 'Workflow Automation', 'Analytics'],
      markets: ['North America', 'APAC'],
      committedLeads: 75000,
      performanceScore: 4.5,
      joinedAt: new Date('2024-02-20'),
      status: 'active'
    },
    {
      id: 'partner-verisk',
      name: 'Verisk Analytics',
      type: 'data',
      category: 'Data Enrichment',
      tier: 'gold',
      revenueSharePercentage: 18,
      integrationStatus: 'active',
      activationMetrics: {
        leadsGenerated: 25000,
        revenueContributed: 625000,
        customerReferrals: 45,
        apiUsage: 1200000
      },
      capabilities: ['Risk Assessment', 'Property Data', 'Claims Analytics'],
      markets: ['North America', 'Latin America'],
      committedLeads: 50000,
      performanceScore: 4.8,
      joinedAt: new Date('2023-12-10'),
      status: 'active'
    },
    {
      id: 'partner-acord',
      name: 'ACORD Solutions',
      type: 'content',
      category: 'Industry Standards',
      tier: 'silver',
      revenueSharePercentage: 8,
      integrationStatus: 'completed',
      activationMetrics: {
        leadsGenerated: 15000,
        revenueContributed: 225000,
        customerReferrals: 35,
        apiUsage: 450000
      },
      capabilities: ['Forms Standardization', 'Data Interchange', 'Compliance'],
      markets: ['Global'],
      committedLeads: 30000,
      performanceScore: 4.2,
      joinedAt: new Date('2024-03-05'),
      status: 'active'
    }
  ];

  async getEcosystemMetrics(): Promise<EcosystemMetrics> {
    const activePartners = this.partners.filter(p => p.status === 'active');
    const totalRevenue = activePartners.reduce((sum, p) => sum + p.activationMetrics.revenueContributed, 0);
    const totalLeads = activePartners.reduce((sum, p) => sum + p.activationMetrics.leadsGenerated, 0);
    const totalApiUsage = activePartners.reduce((sum, p) => sum + p.activationMetrics.apiUsage, 0);

    return {
      totalPartners: this.partners.length,
      activePartners: activePartners.length,
      revenueContributed: totalRevenue,
      leadsGenerated: totalLeads,
      apiUsage: totalApiUsage,
      ecosystemHealth: this.calculateEcosystemHealth(activePartners),
      growthRate: 0.35, // 35% monthly growth rate
      partnerSatisfaction: 4.6
    };
  }

  private calculateEcosystemHealth(partners: Partner[]): number {
    if (partners.length === 0) return 0;
    
    const totalScore = partners.reduce((sum, p) => {
      const performanceWeight = 0.4;
      const activityWeight = 0.3;
      const engagementWeight = 0.3;

      const performanceScore = (p.performanceScore / 5) * performanceWeight;
      const activityScore = Math.min(p.activationMetrics.apiUsage / 1000000, 1) * activityWeight;
      const engagementScore = Math.min(p.activationMetrics.customerReferrals / 100, 1) * engagementWeight;

      return sum + (performanceScore + activityScore + engagementScore);
    }, 0);

    return Math.min(totalScore / partners.length, 1) * 100;
  }

  async getPartnersByTier(tier: string): Promise<Partner[]> {
    return this.partners.filter(p => p.tier === tier && p.status === 'active');
  }

  async getPartnersByType(type: string): Promise<Partner[]> {
    return this.partners.filter(p => p.type === type && p.status === 'active');
  }

  async getPartnersByMarket(market: string): Promise<Partner[]> {
    return this.partners.filter(p => p.markets.includes(market) && p.status === 'active');
  }

  async calculateRevenueShare(partnerId: string, leadsGenerated: number): Promise<number> {
    const partner = this.partners.find(p => p.id === partnerId);
    if (!partner) return 0;

    const leadRevenue = leadsGenerated * 0.15; // $0.15 per lead
    const partnerShare = leadRevenue * (partner.revenueSharePercentage / 100);

    this.logger.log(`Calculated revenue share for ${partner.name}: $${partnerShare}`);
    return partnerShare;
  }

  async trackPartnerActivation(partnerId: string, metrics: Partial<Partner['activationMetrics']>): Promise<void> {
    const partnerIndex = this.partners.findIndex(p => p.id === partnerId);
    if (partnerIndex === -1) {
      this.logger.warn(`Partner ${partnerId} not found`);
      return;
    }

    const partner = this.partners[partnerIndex];
    Object.assign(partner.activationMetrics, metrics);
    
    partner.performanceScore = this.calculatePartnerPerformance(partner);
    
    this.logger.log(`Updated activation metrics for ${partner.name}`);
  }

  private calculatePartnerPerformance(partner: Partner): number {
    const leadFactor = Math.min(partner.activationMetrics.leadsGenerated / partner.committedLeads, 1) * 0.4;
    const revenueFactor = (partner.activationMetrics.revenueContributed / 1000000) * 0.3;
    const engagementFactor = Math.min(partner.activationMetrics.customerReferrals / 100, 1) * 0.3;

    return Math.min(leadFactor + revenueFactor + engagementFactor, 1) * 5;
  }

  async generatePartnershipOpportunities(): Promise<PartnershipOpportunity[]> {
    const opportunities: PartnershipOpportunity[] = [];

    // Technology integration opportunities
    opportunities.push({
      partnerId: 'partner-zoho',
      partnerName: 'Zoho CRM',
      opportunityType: 'integration',
      potentialRevenue: 500000,
      implementationComplexity: 'medium',
      timeline: '8-12 weeks',
      requiredResources: ['Engineering Team', 'API Specialists', 'QA Team'],
      strategicBenefits: ['Market Expansion', 'Technology Enhancement', 'Customer Satisfaction'],
      successMetrics: ['API Usage', 'Lead Volume', 'Customer Retention']
    });

    // Data partnership opportunities
    opportunities.push({
      partnerId: 'partner-experian',
      partnerName: 'Experian',
      opportunityType: 'data_sharing',
      potentialRevenue: 1200000,
      implementationComplexity: 'high',
      timeline: '12-16 weeks',
      requiredResources: ['Data Science Team', 'Legal Team', 'Security Team'],
      strategicBenefits: ['Data Quality', 'Market Leadership', 'Vertical Expansion'],
      successMetrics: ['Data Accuracy', 'Lead Quality', 'Revenue Growth']
    });

    // Co-marketing opportunities
    opportunities.push({
      partnerId: 'partner-microsoft',
      partnerName: 'Microsoft',
      opportunityType: 'co_marketing',
      potentialRevenue: 2000000,
      implementationComplexity: 'low',
      timeline: '4-8 weeks',
      requiredResources: ['Marketing Team', 'Sales Team', 'Design Team'],
      strategicBenefits: ['Brand Visibility', 'Enterprise Market Access', 'Thought Leadership'],
      successMetrics: ['Lead Generation', 'Brand Awareness', 'Market Share']
    });

    return opportunities.sort((a, b) => b.potentialRevenue - a.potentialRevenue);
  }

  async getEcosystemGrowthForecast(): Promise<any> {
    const metrics = await this.getEcosystemMetrics();
    const growthRate = metrics.growthRate;

    return {
      threeMonths: {
        totalPartners: Math.round(metrics.totalPartners * (1 + growthRate)),
        revenue: metrics.revenueContributed * (1 + growthRate),
        leads: metrics.leadsGenerated * (1 + growthRate)
      },
      sixMonths: {
        totalPartners: Math.round(metrics.totalPartners * Math.pow(1 + growthRate, 2)),
        revenue: metrics.revenueContributed * Math.pow(1 + growthRate, 2),
        leads: metrics.leadsGenerated * Math.pow(1 + growthRate, 2)
      },
      twelveMonths: {
        totalPartners: Math.round(metrics.totalPartners * Math.pow(1 + growthRate, 4)),
        revenue: metrics.revenueContributed * Math.pow(1 + growthRate, 4),
        leads: metrics.leadsGenerated * Math.pow(1 + growthRate, 4)
      }
    };
  }
}