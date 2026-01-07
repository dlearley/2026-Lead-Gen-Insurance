import { Injectable, Logger } from '@nestjs/common';

export interface NetworkParticipant {
  id: string;
  type: 'agency' | 'carrier' | 'partner' | 'enterprise';
  joinDate: Date;
  activityMetrics: {
    leadExchanges: number;
    collaborations: number;
    referrals: number;
    apiCalls: number;
    platformHours: number;
  };
  connections: string[];
  valueProvided: number;
  valueReceived: number;
  networkScore: number;
  participationLevel: 'high' | 'medium' | 'low';
}

export interface LeadExchange {
  leadId: string;
  sourceAgency: string;
  receivingAgency: string;
  leadValue: number;
  exchangeFee: number;
  commission: number;
  timestamp: Date;
  success: boolean;
  leadQuality: number;
}

export interface CustomerLoyalty {
  customerId: string;
  customerType: 'agency' | 'enterprise' | 'partner';
  joinDate: Date;
  retentionFactors: {
    dataLockIn: number; // 0-100 - investment in platform data
    integrationDepth: number; // 0-100 - system integration level
    communityEngagement: number; // 0-100 - participation in community
    trainingInvestment: number; // 0-100 - training and expertise
    customizationLevel: number; // 0-100 - customized workflows
  };
  loyaltyScore: number;
  switchingCost: number; // Estimated cost to switch platforms
  retentionProbability: number;
  lifetimeValue: number;
}

export interface SwitchingCost {
  participantId: string;
  dataMigration: number;
  RetrainingCost: number;
  ProcessDisruption: number;
  IntegrationRebuild: number;
  NetworkLoss: number;
  totalCost: number;
  switchingBarrier: 'low' | 'medium' | 'high' | 'very_high';
}

export interface EcosystemFeature {
  featureId: string;
  name: string;
  category: 'collaboration' | 'analytics' | 'automation' | 'integration' | 'community';
  adoptionRate: number; // Percentage of network using feature
  networkEffectMultiplier: number; // Value multiplier based on adoption
  stickinessContribution: number; // Contribution to platform stickiness
}

@Injectable()
export class NetworkEffectsEngine {
  private readonly logger = new Logger(NetworkEffectsEngine.name);

  private participants: NetworkParticipant[] = [
    {
      id: 'participant-marshall',
      type: 'agency',
      joinDate: new Date('2023-06-15'),
      activityMetrics: {
        leadExchanges: 450,
        collaborations: 85,
        referrals: 48,
        apiCalls: 125000,
        platformHours: 3420
      },
      connections: ['participant-california-advisors', 'partner-salesforce', 'partner-verisk'],
      valueProvided: 85000,
      valueReceived: 72000,
      networkScore: 0.92,
      participationLevel: 'high'
    },
    {
      id: 'participant-california-advisors',
      type: 'agency',
      joinDate: new Date('2022-11-10'),
      activityMetrics: {
        leadExchanges: 320,
        collaborations: 62,
        referrals: 35,
        apiCalls: 89000,
        platformHours: 2850
      },
      connections: ['participant-marshall', 'partner-microsoft', 'carrier-abc'],
      valueProvided: 62000,
      valueReceived: 58000,
      networkScore: 0.87,
      participationLevel: 'medium'
    },
    {
      id: 'participant-enterprise-insurance',
      type: 'enterprise',
      joinDate: new Date('2023-03-20'),
      activityMetrics: {
        leadExchanges: 180,
        collaborations: 45,
        referrals: 28,
        apiCalls: 45000,
        platformHours: 1250
      },
      connections: ['partner-hubspot', 'carrier-xyz', 'agency-marshall'],
      valueProvided: 45000,
      valueReceived: 52000,
      networkScore: 0.78,
      participationLevel: 'medium'
    },
    {
      id: 'participant-data-partner',
      type: 'partner',
      joinDate: new Date('2023-01-08'),
      activityMetrics: {
        leadExchanges: 890,
        collaborations: 150,
        referrals: 85,
        apiCalls: 380000,
        platformHours: 8950
      },
      connections: ['partner-verisk', 'agency-california-advisors', 'carrier-123'],
      valueProvided: 125000,
      valueReceived: 98000,
      networkScore: 0.95,
      participationLevel: 'high'
    },
    {
      id: 'participant-integration-pro',
      type: 'partner',
      joinDate: new Date('2023-07-25'),
      activityMetrics: {
        leadExchanges: 120,
        collaborations: 28,
        referrals: 15,
        apiCalls: 22000,
        platformHours: 650
      },
      connections: ['partner-salesforce', 'agency-texas'],
      valueProvided: 28000,
      valueReceived: 24000,
      networkScore: 0.68,
      participationLevel: 'low'
    }
  ];

  private leadExchanges: LeadExchange[] = [
    {
      leadId: 'lead-001',
      sourceAgency: 'participant-marshall',
      receivingAgency: 'participant-california-advisors',
      leadValue: 350,
      exchangeFee: 52.50,
      commission: 17.50,
      timestamp: new Date(),
      success: true,
      leadQuality: 0.85
    },
    {
      leadId: 'lead-002',
      sourceAgency: 'participant-california-advisors',
      receivingAgency: 'participant-enterprise-insurance',
      leadValue: 280,
      exchangeFee: 42.00,
      commission: 14.00,
      timestamp: new Date(),
      success: true,
      leadQuality: 0.78
    }
  ];

  private customerLoyalty: CustomerLoyalty[] = [
    {
      customerId: 'customer-marshall',
      customerType: 'agency',
      joinDate: new Date('2023-06-15'),
      retentionFactors: {
        dataLockIn: 85,
        integrationDepth: 92,
        communityEngagement: 78,
        trainingInvestment: 88,
        customizationLevel: 75
      },
      loyaltyScore: 0.94,
      switchingCost: 125000,
      retentionProbability: 0.96,
      lifetimeValue: 450000
    },
    {
      customerId: 'customer-enterprise-insurance',
      customerType: 'enterprise',
      joinDate: new Date('2023-03-20'),
      retentionFactors: {
        dataLockIn: 95,
        integrationDepth: 98,
        communityEngagement: 65,
        trainingInvestment: 82,
        customizationLevel: 90
      },
      loyaltyScore: 0.91,
      switchingCost: 250000,
      retentionProbability: 0.93,
      lifetimeValue: 850000
    }
  ];

  private ecosystemFeatures: EcosystemFeature[] = [
    {
      featureId: 'lead-exchange',
      name: 'Lead Exchange Marketplace',
      category: 'collaboration',
      adoptionRate: 0.78,
      networkEffectMultiplier: 2.3,
      stickinessContribution: 0.85
    },
    {
      featureId: 'advanced-analytics',
      name: 'Advanced Analytics Dashboard',
      category: 'analytics',
      adoptionRate: 0.65,
      networkEffectMultiplier: 1.8,
      stickinessContribution: 0.72
    },
    {
      featureId: 'automated-workflows',
      name: 'Automated Lead Processing',
      category: 'automation',
      adoptionRate: 0.84,
      networkEffectMultiplier: 1.5,
      stickinessContribution: 0.68
    },
    {
      featureId: 'api-integration',
      name: 'API Integration Framework',
      category: 'integration',
      adoptionRate: 0.92,
      networkEffectMultiplier: 3.1,
      stickinessContribution: 0.95
    },
    {
      featureId: 'community-platform',
      name: 'Community Collaboration Platform',
      category: 'community',
      adoptionRate: 0.56,
      networkEffectMultiplier: 2.8,
      stickinessContribution: 0.78
    }
  ];

  async calculateNetworkEffects(): Promise<any> {
    const networkSize = this.participants.length;
    const totalConnections = this.participants.reduce((sum, p) => sum + p.connections.length, 0);
    const avgConnections = totalConnections / networkSize;
    
    const totalValue = this.participants.reduce((sum, p) => sum + p.valueProvided + p.valueReceived, 0);
    const networkDensity = totalConnections / (networkSize * (networkSize - 1));
    
    // Metcalfe's Law: value ∝ n²
    // Reed's Law: value ∝ 2^n (for group-forming networks)
    const metcalfeValue = Math.pow(networkSize, 2) * 1000;
    const reedsValue = Math.pow(2, Math.min(networkSize, 20)) * 500;
    
    const actualNetworkValue = totalValue / 1000; // Total value in thousands
    
    return {
      networkSize,
      totalConnections,
      avgConnections,
      networkDensity: Math.round(networkDensity * 100) / 100,
      totalValueExchanged: totalValue,
      theoreticalValue: {
        metcalfe: metcalfeValue,
        reeds: reedsValue,
        actual: actualNetworkValue
      },
      networkEfficiency: Math.round((actualNetworkValue / metcalfeValue) * 100) / 100,
      growthMetrics: this.calculateNetworkGrowthMetrics()
    };
  }

  private calculateNetworkGrowthMetrics(): any {
    const sortedParticipants = [...this.participants].sort((a, b) => a.joinDate.getTime() - b.joinDate.getTime());
    const monthlyGrowth = [];
    
    const currentDate = new Date();
    for (let i = 0; i < 12; i++) {
      const monthStart = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
      const participants = sortedParticipants.filter(p => p.joinDate <= monthStart).length;
      monthlyGrowth.unshift({
        month: monthStart.toISOString().substring(0, 7),
        participants,
        connections: this.participants.slice(0, participants).reduce((sum, p) => sum + p.activityMetrics.collaborations, 0),
        value: this.participants.slice(0, participants).reduce((sum, p) => sum + p.valueProvided + p.valueReceived, 0)
      });
    }

    return monthlyGrowth;
  }

  async calculateSwitchingCosts(participantId: string): Promise<SwitchingCost> {
    const participant = this.participants.find(p => p.id === participantId);
    if (!participant) {
      throw new Error(`Participant ${participantId} not found`);
    }

    const loyaltyData = this.customerLoyalty.find(c => c.customerId === participantId);
    if (!loyaltyData) {
      throw new Error(`Loyalty data not found for ${participantId}`);
    }

    const retentionFactors = loyaltyData.retentionFactors;

    const dataMigrationCost = Math.round((retentionFactors.dataLockIn / 100) * 80000);
    const retrainingCost = Math.round((retentionFactors.trainingInvestment / 100) * 35000);
    const processDisruptionCost = Math.round((retentionFactors.integrationDepth / 100) * 75000);
    const integrationRebuildCost = Math.round((retentionFactors.customizationLevel / 100) * 90000);
    const networkLossValue = Math.round((retentionFactors.communityEngagement / 100) * 40000);

    const totalCost = dataMigrationCost + retrainingCost + processDisruptionCost + integrationRebuildCost + networkLossValue;

    let switchingBarrier: 'low' | 'medium' | 'high' | 'very_high';
    if (totalCost < 50000) switchingBarrier = 'low';
    else if (totalCost < 150000) switchingBarrier = 'medium';
    else if (totalCost < 300000) switchingBarrier = 'high';
    else switchingBarrier = 'very_high';

    return {
      participantId,
      dataMigration: dataMigrationCost,
      RetrainingCost: retrainingCost,
      ProcessDisruption: processDisruptionCost,
      IntegrationRebuild: integrationRebuildCost,
      NetworkLoss: networkLossValue,
      totalCost,
      switchingBarrier
    };
  }

  async analyzePlatformStickiness(customerId: string): Promise<CustomerLoyalty> {
    const loyaltyData = this.customerLoyalty.find(c => c.customerId === customerId);
    if (!loyaltyData) {
      this.logger.warn(`No loyalty data found for customer ${customerId}`);
      return this.createDefaultLoyaltyData(customerId);
    }

    // Update loyalty score based on recent activity
    const participant = this.participants.find(p => p.id === customerId);
    if (participant) {
      const activityScore = Math.min(participant.activityMetrics.platformHours / 1000, 1) * 0.3;
      const engagementScore = (participant.activityMetrics.referrals / 50) * 0.3;
      const networkScore = participant.networkScore * 0.4;

      loyaltyData.loyaltyScore = Math.round((activityScore + engagementScore + networkScore) * 100) / 100;
      loyaltyData.retentionProbability = Math.min(loyaltyData.loyaltyScore + 0.05, 0.99);
    }

    return loyaltyData;
  }

  private createDefaultLoyaltyData(customerId: string): CustomerLoyalty {
    return {
      customerId,
      customerType: 'agency',
      joinDate: new Date(),
      retentionFactors: {
        dataLockIn: 50,
        integrationDepth: 60,
        communityEngagement: 40,
        trainingInvestment: 55,
        customizationLevel: 45
      },
      loyaltyScore: 0.7,
      switchingCost: 50000,
      retentionProbability: 0.75,
      lifetimeValue: 150000
    };
  }

  async executeLeadExchange(sourceAgency: string, receivingAgency: string, lead: any): Promise<LeadExchange> {
    const leadValue = lead.estimatedValue || 250; // Default lead value
    const leadQuality = lead.qualityScore || 0.75; // Default quality
    
    const exchangeFee = leadValue * 0.15; // 15% exchange fee
    const commission = leadValue * 0.05; // 5% platform commission

    const exchange: LeadExchange = {
      leadId: lead.id,
      sourceAgency,
      receivingAgency,
      leadValue,
      exchangeFee,
      commission,
      timestamp: new Date(),
      success: true,
      leadQuality
    };

    this.leadExchanges.push(exchange);

    // Update participant metrics
    this.updateParticipantActivity(sourceAgency, 'leadExchanges');
    this.updateParticipantActivity(receivingAgency, 'collaborations');
    this.updateParticipantValue(sourceAgency, exchangeFee);
    this.updateParticipantValue(receivingAgency, leadValue - exchangeFee - commission);

    this.logger.log(`Executed lead exchange: ${lead.id} from ${sourceAgency} to ${receivingAgency}`);
    return exchange;
  }

  private updateParticipantActivity(participantId: string, activityType: keyof NetworkParticipant['activityMetrics']): void {
    const participant = this.participants.find(p => p.id === participantId);
    if (participant) {
      participant.activityMetrics[activityType]++;
      this.updateNetworkScore(participant);
    }
  }

  private updateParticipantValue(participantId: string, value: number): void {
    const participant = this.participants.find(p => p.id === participantId);
    if (participant) {
      participant.valueProvided += value;
      this.updateNetworkScore(participant);
    }
  }

  private updateNetworkScore(participant: NetworkParticipant): void {
    const activityScore = Math.min(participant.activityMetrics.leadExchanges / 500, 1) * 0.3;
    const collaborationScore = Math.min(participant.activityMetrics.collaborations / 100, 1) * 0.25;
    const valueScore = Math.min((participant.valueProvided + participant.valueReceived) / 100000, 1) * 0.3;
    const engagementScore = Math.min(participant.activityMetrics.platformHours / 3000, 1) * 0.15;

    participant.networkScore = Math.round((activityScore + collaborationScore + valueScore + engagementScore) * 100) / 100;
    participant.participationLevel = this.determineParticipationLevel(participant.networkScore);
  }

  private determineParticipationLevel(score: number): 'high' | 'medium' | 'low' {
    if (score >= 0.8) return 'high';
    if (score >= 0.5) return 'medium';
    return 'low';
  }

  async getFeatureAdoptionTrends(): Promise<EcosystemFeature[]> {
    // Calculate feature evolution and network effects growth
    return this.ecosystemFeatures.map(feature => ({
      ...feature,
      projectedAdoption: Math.min(feature.adoptionRate * 1.25, 1.0),
      valueAtScale: Math.pow(feature.adoptionRate * 100, 2) * feature.networkEffectMultiplier
    }));
  }

  async analyzeNetworkReinforcement(): Promise<any> {
    const networkStrength = this.participants.reduce((sum, p) => sum + p.networkScore, 0) / this.participants.length;
    const adoptionStrength = this.ecosystemFeatures.reduce((sum, f) => sum + f.adoptionRate, 0) / this.ecosystemFeatures.length;
    const stickinessStrength = this.ecosystemFeatures.reduce((sum, f) => sum + f.stickinessContribution, 0) / this.ecosystemFeatures.length;

    return {
      networkReinforcement: Math.round(networkStrength * adoptionStrength * 100) / 100,
      totalNetworkValue: Math.round((networkStrength + adoptionStrength + stickinessStrength) * 100) / 300,
      positiveFeedbackLoops: this.identifyFeedbackLoops(),
      compoundingEffects: this.calculateCompoundingEffects()
    };
  }

  private identifyFeedbackLoops(): string[] {
    const loops: string[] = [];

    if (this.participants.length > 5) {
      loops.push('Size drives value - more participants increase network value');
    }
    if (this.ecosystemFeatures.some(f => f.adoptionRate > 0.7)) {
      loops.push('Feature adoption creates lock-in - high usage increases switching costs');
    }
    if (this.leadExchanges.length > 50) {
      loops.push('Lead exchange frequency builds platform dependency');
    }
    if (this.participants.some(p => p.valueProvided > 50000)) {
      loops.push('Value creation attracts more participants');
    }

    return loops;
  }

  private calculateCompoundingEffects(): any {
    const participantGrowthRate = 0.28; // 28% monthly growth
    const valueGrowthRate = 0.45; // 45% monthly value growth
    const adoptionGrowthRate = 0.35; // 35% monthly adoption growth

    return {
      threeMonths: {
        participants: Math.round(this.participants.length * Math.pow(1 + participantGrowthRate, 3)),
        value: Math.round(this.participants.reduce((sum, p) => sum + p.valueProvided + p.valueReceived, 0) * Math.pow(1 + valueGrowthRate, 3)),
        adoption: Math.round(this.ecosystemFeatures.reduce((sum, f) => sum + f.adoptionRate, 0) * Math.pow(1 + adoptionGrowthRate, 3))
      },
      sixMonths: {
        participants: Math.round(this.participants.length * Math.pow(1 + participantGrowthRate, 6)),
        value: Math.round(this.participants.reduce((sum, p) => sum + p.valueProvided + p.valueReceived, 0) * Math.pow(1 + valueGrowthRate, 6)),
        adoption: Math.round(this.ecosystemFeatures.reduce((sum, f) => sum + f.adoptionRate, 0) * Math.pow(1 + adoptionGrowthRate, 6))
      },
      twelveMonths: {
        participants: Math.round(this.participants.length * Math.pow(1 + participantGrowthRate, 12)),
        value: Math.round(this.participants.reduce((sum, p) => sum + p.valueProvided + p.valueReceived, 0) * Math.pow(1 + valueGrowthRate, 12)),
        adoption: Math.round(this.ecosystemFeatures.reduce((sum, f) => sum + f.adoptionRate, 0) * Math.pow(1 + adoptionGrowthRate, 12))
      }
    };
  }

  async getNetworkExpansionOpportunities(): Promise<any> {
    const currentMetrics = await this.calculateNetworkEffects();
    const growthRate = 0.28; // 28% monthly growth

    return {
      currentState: {
        participants: currentMetrics.networkSize,
        connections: currentMetrics.totalConnections,
        value: currentMetrics.totalValueExchanged
      },
      expansionPotential: {
        threeMonths: {
          participants: Math.round(currentMetrics.networkSize * Math.pow(1 + growthRate, 3)),
          connections: Math.round(currentMetrics.totalConnections * Math.pow(1 + growthRate, 3)),
          value: Math.round(currentMetrics.totalValueExchanged * Math.pow(1 + growthRate, 3))
        },
        sixMonths: {
          participants: Math.round(currentMetrics.networkSize * Math.pow(1 + growthRate, 6)),
          connections: Math.round(currentMetrics.totalConnections * Math.pow(1 + growthRate, 6)),
          value: Math.round(currentMetrics.totalValueExchanged * Math.pow(1 + growthRate, 6))
        },
        twelveMonths: {
          participants: Math.round(currentMetrics.networkSize * Math.pow(1 + growthRate, 12)),
          connections: Math.round(currentMetrics.totalConnections * Math.pow(1 + growthRate, 12)),
          value: Math.round(currentMetrics.totalValueExchanged * Math.pow(1 + growthRate, 12))
        }
      },
      strategicRecommendations: [
        'Expand partner ecosystem to increase network density',
        'Enhance feature adoption through training and incentives',
        'Focus on high-value participants for maximum network effects',
        'Develop new collaboration features to increase engagement'
      ]
    };
  }
}