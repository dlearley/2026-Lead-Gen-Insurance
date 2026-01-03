import { Injectable, Logger } from '@nestjs/common';

export interface AgencyPartner {
  id: string;
  name: string;
  agencyType: 'independent' | 'captive' | 'broker' | 'mga';
  location: {
    city: string;
    state: string;
    region: string;
    country: string;
  };
  size: {
    agents: number;
    annualPremium: number;
    customerBase: number;
  };
  specialization: string[];
  certifications: string[];
  performance: {
    totalLeadsReceived: number;
    conversionRate: number;
    totalRevenue: number;
    customerSatisfaction: number;
    complianceScore: number;
  };
  status: 'active' | 'inactive' | 'pending' | 'suspended';
  tier: 'platinum' | 'gold' | 'silver' | 'bronze';
  joinedAt: Date;
  engagementScore: number;
  trainingCompleted: string[];
  preferences: {
    leadTypes: string[];
    geographicFocus: string[];
    volumeCapacity: number;
    responseTimeTarget: number;
  };
}

export interface AgencyNetworkMetrics {
  totalAgencies: number;
  activeAgencies: number;
  totalAgents: number;
  totalPremium: number;
  totalLeadsDistributed: number;
  averageConversionRate: number;
  networkGrowthRate: number;
  retentionRate: number;
  averageSatisfaction: number;
}

export interface AgencyTier {
  level: 'platinum' | 'gold' | 'silver' | 'bronze';
  minPerformanceScore: number;
  leadAllocation: number;
  supportLevel: 'dedicated' | 'priority' | 'standard';
  commissionRates: {
    base: number;
    performanceBonus: number;
  };
  benefits: string[];
}

@Injectable()
export class AgencyNetworkManager {
  private readonly logger = new Logger(AgencyNetworkManager.name);

  private agencies: AgencyPartner[] = [
    {
      id: 'agency-marshall',
      name: 'Marshall & Associates Insurance',
      agencyType: 'independent',
      location: {
        city: 'Boston',
        state: 'MA',
        region: 'Northeast',
        country: 'USA'
      },
      size: {
        agents: 45,
        annualPremium: 15000000,
        customerBase: 8500
      },
      specialization: ['Health Insurance', 'Life Insurance', 'Disability'],
      certifications: ['AHIP', 'Life & Health License', 'CSA'],
      performance: {
        totalLeadsReceived: 12500,
        conversionRate: 0.23,
        totalRevenue: 3450000,
        customerSatisfaction: 4.6,
        complianceScore: 98.5
      },
      status: 'active',
      tier: 'platinum',
      joinedAt: new Date('2023-06-15'),
      engagementScore: 0.92,
      trainingCompleted: ['Platform Basics', 'Lead Management', 'Compliance Training'],
      preferences: {
        leadTypes: ['Health', 'Life', 'Medicare'],
        geographicFocus: ['MA', 'NH', 'RI'],
        volumeCapacity: 2000,
        responseTimeTarget: 15
      }
    },
    {
      id: 'agency-florida-insurance',
      name: 'Florida Insurance Group',
      agencyType: 'broker',
      location: {
        city: 'Miami',
        state: 'FL',
        region: 'Southeast',
        country: 'USA'
      },
      size: {
        agents: 28,
        annualPremium: 8000000,
        customerBase: 4200
      },
      specialization: ['Auto Insurance', 'Homeowners', 'Umbrella'],
      certifications: ['Property & Casualty', 'CISR', 'CIC'],
      performance: {
        totalLeadsReceived: 8500,
        conversionRate: 0.18,
        totalRevenue: 1850000,
        customerSatisfaction: 4.3,
        complianceScore: 96.8
      },
      status: 'active',
      tier: 'gold',
      joinedAt: new Date('2023-08-20'),
      engagementScore: 0.78,
      trainingCompleted: ['Platform Basics', 'Lead Management'],
      preferences: {
        leadTypes: ['Auto', 'Homeowners', 'Commercial'],
        geographicFocus: ['FL', 'GA', 'AL'],
        volumeCapacity: 1200,
        responseTimeTarget: 30
      }
    },
    {
      id: 'agency-california-advisors',
      name: 'California Insurance Advisors',
      agencyType: 'independent',
      location: {
        city: 'Los Angeles',
        state: 'CA',
        region: 'West',
        country: 'USA'
      },
      size: {
        agents: 62,
        annualPremium: 22000000,
        customerBase: 12000
      },
      specialization: ['Commercial', 'Workers Comp', 'Professional Liability'],
      certifications: ['CPCU', 'ARM', 'AINS'],
      performance: {
        totalLeadsReceived: 18500,
        conversionRate: 0.31,
        totalRevenue: 5500000,
        customerSatisfaction: 4.8,
        complianceScore: 99.2
      },
      status: 'active',
      tier: 'platinum',
      joinedAt: new Date('2022-11-10'),
      engagementScore: 0.96,
      trainingCompleted: ['Platform Basics', 'Lead Management', 'Compliance Training', 'Advanced Analytics'],
      preferences: {
        leadTypes: ['Commercial', 'Workers Comp', 'Professional Liability'],
        geographicFocus: ['CA', 'NV', 'AZ'],
        volumeCapacity: 3000,
        responseTimeTarget: 10
      }
    },
    {
      id: 'agency-texas-insurance',
      name: 'Texas Insurance Network',
      agencyType: 'mga',
      location: {
        city: 'Houston',
        state: 'TX',
        region: 'Central',
        country: 'USA'
      },
      size: {
        agents: 35,
        annualPremium: 12000000,
        customerBase: 6800
      },
      specialization: ['Energy', 'Oil & Gas', 'Construction'],
      certifications: ['CPCU', 'CRM', 'CCP'],
      performance: {
        totalLeadsReceived: 11000,
        conversionRate: 0.26,
        totalRevenue: 3200000,
        customerSatisfaction: 4.5,
        complianceScore: 97.3
      },
      status: 'active',
      tier: 'gold',
      joinedAt: new Date('2023-04-12'),
      engagementScore: 0.85,
      trainingCompleted: ['Platform Basics', 'Lead Management', 'Compliance Training'],
      preferences: {
        leadTypes: ['Commercial', 'Energy', 'Construction'],
        geographicFocus: ['TX', 'OK', 'LA'],
        volumeCapacity: 1800,
        responseTimeTarget: 20
      }
    }
  ];

  private agencyTiers: AgencyTier[] = [
    {
      level: 'platinum',
      minPerformanceScore: 0.9,
      leadAllocation: 3000,
      supportLevel: 'dedicated',
      commissionRates: {
        base: 0.18,
        performanceBonus: 0.05
      },
      benefits: ['Dedicated Account Manager', 'Priority Lead Access', 'Custom Integration', 'Business Development Support']
    },
    {
      level: 'gold',
      minPerformanceScore: 0.75,
      leadAllocation: 2000,
      supportLevel: 'priority',
      commissionRates: {
        base: 0.15,
        performanceBonus: 0.04
      },
      benefits: ['Priority Support', 'Advanced Analytics', 'Co-marketing Opportunities', 'Training Credits']
    },
    {
      level: 'silver',
      minPerformanceScore: 0.6,
      leadAllocation: 1000,
      supportLevel: 'standard',
      commissionRates: {
        base: 0.12,
        performanceBonus: 0.03
      },
      benefits: ['Standard Support', 'Platform Access', 'Basic Analytics', 'Community Access']
    },
    {
      level: 'bronze',
      minPerformanceScore: 0.4,
      leadAllocation: 500,
      supportLevel: 'standard',
      commissionRates: {
        base: 0.10,
        performanceBonus: 0.02
      },
      benefits: ['Platform Access', 'Email Support', 'Online Resources']
    }
  ];

  async getNetworkMetrics(): Promise<AgencyNetworkMetrics> {
    const activeAgencies = this.agencies.filter(a => a.status === 'active');
    const totalAgents = activeAgencies.reduce((sum, a) => sum + a.size.agents, 0);
    const totalPremium = activeAgencies.reduce((sum, a) => sum + a.size.annualPremium, 0);
    const totalLeads = activeAgencies.reduce((sum, a) => sum + a.performance.totalLeadsReceived, 0);
    const avgConversion = activeAgencies.reduce((sum, a) => sum + a.performance.conversionRate, 0) / activeAgencies.length;
    const avgSatisfaction = activeAgencies.reduce((sum, a) => sum + a.performance.customerSatisfaction, 0) / activeAgencies.length;

    return {
      totalAgencies: this.agencies.length,
      activeAgencies: activeAgencies.length,
      totalAgents,
      totalPremium,
      totalLeadsDistributed: totalLeads,
      averageConversionRate: avgConversion,
      networkGrowthRate: 0.28, // 28% monthly growth
      retentionRate: 0.94, // 94% retention
      averageSatisfaction: avgSatisfaction
    };
  }

  async distributeLead(lead: any): Promise<string> {
    // Find best matching agencies for the lead
    const eligibleAgencies = this.agencies.filter(agency =>
      agency.status === 'active' &&
      agency.preferences.leadTypes.includes(lead.type) &&
      this.isGeographicMatch(agency, lead.location)
    );

    if (eligibleAgencies.length === 0) {
      this.logger.warn(`No eligible agencies found for lead ${lead.id}`);
      return null;
    }

    // Score agencies based on performance, capacity, and preferences
    const scoredAgencies = eligibleAgencies.map(agency => ({
      ...agency,
      score: this.calculateAgencyScore(agency, lead)
    }));

    // Sort by score and return best match
    scoredAgencies.sort((a, b) => b.score - a.score);
    const bestMatch = scoredAgencies[0];

    this.logger.log(`Assigned lead ${lead.id} to agency ${bestMatch.name} (score: ${bestMatch.score})`);
    return bestMatch.id;
  }

  private isGeographicMatch(agency: AgencyPartner, leadLocation: any): boolean {
    // Check if lead location matches agency's geographic focus
    const leadState = leadLocation?.state || leadLocation?.region;
    return agency.preferences.geographicFocus.includes(leadState);
  }

  private calculateAgencyScore(agency: AgencyPartner, lead: any): number {
    const performanceWeight = 0.35;
    const capacityWeight = 0.25;
    const specializationWeight = 0.25;
    const engagementWeight = 0.15;

    const performanceScore = agency.performance.conversionRate * 100 * performanceWeight;
    const capacityScore = Math.min((agency.preferences.volumeCapacity - agency.performance.totalLeadsReceived * 0.1) / agency.preferences.volumeCapacity, 1) * capacityWeight;
    
    const specializationBonus = agency.specialization.some(spec => 
      lead.specialization?.some(leadSpec => 
        this.isSpecializationMatch(spec, leadSpec)
      )
    ) ? specializationWeight : 0;

    const engagementScore = agency.engagementScore * engagementWeight;

    return performanceScore + capacityScore + specializationBonus + engagementScore;
  }

  private isSpecializationMatch(agencySpec: string, leadSpec: string): boolean {
    // Simple matching logic - can be enhanced with NLP
    return agencySpec.toLowerCase().includes(leadSpec.toLowerCase()) ||
           leadSpec.toLowerCase().includes(agencySpec.toLowerCase());
  }

  async updateAgencyTier(agencyId: string): Promise<string> {
    const agency = this.agencies.find(a => a.id === agencyId);
    if (!agency) {
      throw new Error(`Agency ${agencyId} not found`);
    }

    const performanceScore = this.calculateAgencyPerformanceScore(agency);
    const newTier = this.determineTier(performanceScore);

    if (newTier !== agency.tier) {
      agency.tier = newTier;
      this.logger.log(`Updated agency ${agency.name} tier to ${newTier}`);
    }

    return agency.tier;
  }

  private calculateAgencyPerformanceScore(agency: AgencyPartner): number {
    const conversionComponent = (agency.performance.conversionRate / 0.3) * 0.4;
    const satisfactionComponent = (agency.performance.customerSatisfaction / 5) * 0.3;
    const complianceComponent = (agency.performance.complianceScore / 100) * 0.2;
    const engagementComponent = agency.engagementScore * 0.1;

    return Math.min(conversionComponent + satisfactionComponent + complianceComponent + engagementComponent, 1);
  }

  private determineTier(performanceScore: number): AgencyPartner['tier'] {
    for (const tier of this.agencyTiers) {
      if (performanceScore >= tier.minPerformanceScore) {
        return tier.level;
      }
    }
    return 'bronze';
  }

  async calculateCommission(agencyId: string, leadValue: number): Promise<number> {
    const agency = this.agencies.find(a => a.id === agencyId);
    if (!agency) return 0;

    const tier = this.agencyTiers.find(t => t.level === agency.tier);
    if (!tier) return 0;

    const baseCommission = leadValue * tier.commissionRates.base;
    const performanceBonus = leadValue * tier.commissionRates.performanceBonus;

    return baseCommission + performanceBonus;
  }

  async getAgenciesByRegion(region: string): Promise<AgencyPartner[]> {
    return this.agencies.filter(a => a.location.region === region && a.status === 'active');
  }

  async getAgenciesBySpecialization(specialization: string): Promise<AgencyPartner[]> {
    return this.agencies.filter(a => 
      a.specialization.some(spec => spec.toLowerCase().includes(specialization.toLowerCase())) &&
      a.status === 'active'
    );
  }

  async getAgencyPerformanceReport(agencyId: string): Promise<any> {
    const agency = this.agencies.find(a => a.id === agencyId);
    if (!agency) return null;

    return {
      agency: {
        id: agency.id,
        name: agency.name,
        tier: agency.tier
      },
      performance: agency.performance,
      metrics: {
        efficiency: agency.performance.conversionRate / 0.3,
        revenuePerLead: agency.performance.totalRevenue / agency.performance.totalLeadsReceived,
        revenuePerAgent: agency.performance.totalRevenue / agency.size.agents
      },
      benchmarks: {
        networkAverageConversion: 0.245,
        networkAverageSatisfaction: 4.55
      },
      recommendations: this.generateAgencyRecommendations(agency)
    };
  }

  private generateAgencyRecommendations(agency: AgencyPartner): string[] {
    const recommendations: string[] = [];

    if (agency.performance.conversionRate < 0.2) {
      recommendations.push('Improve lead qualification and follow-up processes');
    }
    if (agency.performance.customerSatisfaction < 4.0) {
      recommendations.push('Focus on customer service training and support');
    }
    if (agency.engagementScore < 0.7) {
      recommendations.push('Increase platform engagement through training and incentives');
    }
    if (agency.tier === 'bronze' || agency.tier === 'silver') {
      recommendations.push('Aim for tier upgrade to access premium benefits');
    }

    return recommendations;
  }

  async getNetworkGrowthForecast(): Promise<any> {
    const baseMetrics = await this.getNetworkMetrics();
    const growthRate = 0.28; // 28% monthly growth

    return {
      threeMonths: {
        totalAgencies: Math.round(baseMetrics.totalAgencies * Math.pow(1 + growthRate, 3)),
        totalAgents: Math.round(baseMetrics.totalAgents * Math.pow(1 + growthRate, 3)),
        totalPremium: baseMetrics.totalPremium * Math.pow(1 + growthRate, 3),
        totalLeads: baseMetrics.totalLeadsDistributed * Math.pow(1 + growthRate, 3)
      },
      sixMonths: {
        totalAgencies: Math.round(baseMetrics.totalAgencies * Math.pow(1 + growthRate, 6)),
        totalAgents: Math.round(baseMetrics.totalAgents * Math.pow(1 + growthRate, 6)),
        totalPremium: baseMetrics.totalPremium * Math.pow(1 + growthRate, 6),
        totalLeads: baseMetrics.totalLeadsDistributed * Math.pow(1 + growthRate, 6)
      },
      twelveMonths: {
        totalAgencies: Math.round(baseMetrics.totalAgencies * Math.pow(1 + growthRate, 12)),
        totalAgents: Math.round(baseMetrics.totalAgents * Math.pow(1 + growthRate, 12)),
        totalPremium: baseMetrics.totalPremium * Math.pow(1 + growthRate, 12),
        totalLeads: baseMetrics.totalLeadsDistributed * Math.pow(1 + growthRate, 12)
      }
    };
  }
}