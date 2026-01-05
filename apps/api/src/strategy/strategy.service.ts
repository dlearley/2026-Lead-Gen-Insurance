import { Injectable, Logger } from '@nestjs/common';
import {
  MarketAnalysisEngine,
  EcosystemPartnershipManager,
  AgencyNetworkManager,
  NetworkEffectsEngine
} from '@leadgen/strategy';

@Injectable()
export class StrategyService {
  private readonly logger = new Logger(StrategyService.name);

  constructor(
    private readonly marketAnalysisEngine: MarketAnalysisEngine,
    private readonly ecosystemPartnershipManager: EcosystemPartnershipManager,
    private readonly agencyNetworkManager: AgencyNetworkManager,
    private readonly networkEffectsEngine: NetworkEffectsEngine
  ) {}

  async getMarketConsolidationOpportunities(): Promise<any> {
    this.logger.log('Fetching market consolidation opportunities');
    return await this.marketAnalysisEngine.analyzeMarketConsolidationOpportunities();
  }

  async getAcquisitionTimeline(targetId: string): Promise<any> {
    this.logger.log(`Fetching acquisition timeline for target ${targetId}`);
    const opportunities = await this.marketAnalysisEngine.analyzeMarketConsolidationOpportunities();
    const opportunity = opportunities.find(o => o.targets.some(t => t.id === targetId));

    if (!opportunity) {
      throw new Error('Acquisition target not found');
    }

    const target = opportunity.targets.find(t => t.id === targetId);
    return await this.marketAnalysisEngine.generateConsolidationTimeline({
      ...opportunity,
      targets: [target]
    });
  }

  async getEcosystemMetrics(): Promise<any> {
    this.logger.log('Fetching ecosystem metrics');
    return await this.ecosystemPartnershipManager.getEcosystemMetrics();
  }

  async getPartnersByTier(tier: string): Promise<any> {
    this.logger.log(`Fetching partners by tier: ${tier}`);
    return await this.ecosystemPartnershipManager.getPartnersByTier(tier);
  }

  async getPartnersByType(type: string): Promise<any> {
    this.logger.log(`Fetching partners by type: ${type}`);
    return await this.ecosystemPartnershipManager.getPartnersByType(type);
  }

  async getPartnershipOpportunities(): Promise<any> {
    this.logger.log('Fetching partnership opportunities');
    return await this.ecosystemPartnershipManager.generatePartnershipOpportunities();
  }

  async getEcosystemGrowthForecast(): Promise<any> {
    this.logger.log('Fetching ecosystem growth forecast');
    return await this.ecosystemPartnershipManager.getEcosystemGrowthForecast();
  }

  async calculateRevenueShare(partnerId: string, leadsGenerated: number): Promise<any> {
    this.logger.log(`Calculating revenue share for partner ${partnerId}`);
    const revenueShare = await this.ecosystemPartnershipManager.calculateRevenueShare(partnerId, leadsGenerated);
    return { partnerId, leadsGenerated, revenueShare };
  }

  async updatePartnerActivationMetrics(partnerId: string, metrics: any): Promise<any> {
    this.logger.log(`Updating activation metrics for partner ${partnerId}`);
    await this.ecosystemPartnershipManager.trackPartnerActivation(partnerId, metrics);
    return { success: true, partnerId };
  }

  async getAgencyNetworkMetrics(): Promise<any> {
    this.logger.log('Fetching agency network metrics');
    return await this.agencyNetworkManager.getNetworkMetrics();
  }

  async getAgenciesByRegion(region: string): Promise<any> {
    this.logger.log(`Fetching agencies by region: ${region}`);
    return await this.agencyNetworkManager.getAgenciesByRegion(region);
  }

  async getAgenciesBySpecialization(specialization: string): Promise<any> {
    this.logger.log(`Fetching agencies by specialization: ${specialization}`);
    return await this.agencyNetworkManager.getAgenciesBySpecialization(specialization);
  }

  async getAgencyPerformanceReport(agencyId: string): Promise<any> {
    this.logger.log(`Fetching agency performance report: ${agencyId}`);
    return await this.agencyNetworkManager.getAgencyPerformanceReport(agencyId);
  }

  async calculateCommission(agencyId: string, leadValue: number): Promise<any> {
    this.logger.log(`Calculating commission for agency ${agencyId}`);
    const commission = await this.agencyNetworkManager.calculateCommission(agencyId, leadValue);
    return { agencyId, leadValue, commission };
  }

  async updateAgencyTier(agencyId: string): Promise<any> {
    this.logger.log(`Updating tier for agency ${agencyId}`);
    const tier = await this.agencyNetworkManager.updateAgencyTier(agencyId);
    return { agencyId, tier };
  }

  async getNetworkGrowthForecast(): Promise<any> {
    this.logger.log('Fetching network growth forecast');
    return await this.agencyNetworkManager.getNetworkGrowthForecast();
  }

  async getNetworkEffects(): Promise<any> {
    this.logger.log('Fetching network effects analysis');
    return await this.networkEffectsEngine.calculateNetworkEffects();
  }

  async analyzeSwitchingCosts(participantId: string): Promise<any> {
    this.logger.log(`Analyzing switching costs for participant ${participantId}`);
    return await this.networkEffectsEngine.calculateSwitchingCosts(participantId);
  }

  async analyzePlatformStickiness(customerId: string): Promise<any> {
    this.logger.log(`Analyzing platform stickiness for customer ${customerId}`);
    return await this.networkEffectsEngine.analyzePlatformStickiness(customerId);
  }

  async getFeatureAdoptionTrends(): Promise<any> {
    this.logger.log('Fetching feature adoption trends');
    return await this.networkEffectsEngine.getFeatureAdoptionTrends();
  }

  async analyzeNetworkReinforcement(): Promise<any> {
    this.logger.log('Fetching network reinforcement analysis');
    return await this.networkEffectsEngine.analyzeNetworkReinforcement();
  }

  async getNetworkExpansionOpportunities(): Promise<any> {
    this.logger.log('Fetching network expansion opportunities');
    return await this.networkEffectsEngine.getNetworkExpansionOpportunities();
  }

  async distributeLeadToAgencies(lead: any): Promise<any> {
    this.logger.log(`Distributing lead ${lead.id} to agencies`);
    const result = await this.agencyNetworkManager.distributeLead(lead);
    return { leadId: lead.id, assignedAgencyId: result };
  }

  async executeLeadExchange(sourceAgencyId: string, receivingAgencyId: string, lead: any): Promise<any> {
    this.logger.log(`Executing lead exchange from ${sourceAgencyId} to ${receivingAgencyId}`);
    return await this.networkEffectsEngine.executeLeadExchange(sourceAgencyId, receivingAgencyId, lead);
  }

  async getComprehensiveStrategyReport(): Promise<any> {
    this.logger.log('Generating comprehensive strategy report');

    // Aggregate all strategy data
    const [
      consolidationOpportunities,
      ecosystemMetrics,
      agencyMetrics,
      networkEffects
    ] = await Promise.all([
      this.marketAnalysisEngine.analyzeMarketConsolidationOpportunities(),
      this.ecosystemPartnershipManager.getEcosystemMetrics(),
      this.agencyNetworkManager.getNetworkMetrics(),
      this.networkEffectsEngine.calculateNetworkEffects()
    ]);

    const competitiveMoatStrength = this.calculateCompetitiveMoatStrength({
      consolidationOpportunities,
      ecosystemMetrics,
      agencyMetrics,
      networkEffects
    });

    return {
      marketConsolidation: {
        opportunities: consolidationOpportunities,
        priorityTargets: consolidationOpportunities.slice(0, 3),
        estimatedROI: consolidationOpportunities.reduce((sum, opp) => sum + opp.expectedROI, 0) / consolidationOpportunities.length
      },
      ecosystemExpansion: {
        metrics: ecosystemMetrics,
        partnerGrowth: ecosystemMetrics.growthRate,
        revenueContribution: ecosystemMetrics.revenueContributed,
        ecosystemHealth: ecosystemMetrics.ecosystemHealth
      },
      agencyNetwork: {
        metrics: agencyMetrics,
        networkDensity: `Active agencies across multiple regions`,
        growthTrajectory: agencyMetrics.networkGrowthRate
      },
      networkEffects: {
        analysis: networkEffects,
        compoundingValue: networkEffects.theoreticalValue.actual,
        networkEfficiency: networkEffects.networkEfficiency
      },
      competitivePosition: {
        moatStrength: competitiveMoatStrength,
        marketLeadership: 'Dominant in West Coast, expanding in Northeast',
        strategicAdvantages: [
          'Leading agency network with 150+ active partners',
          'Advanced technology platform with AI/ML capabilities',
          'Strong network effects and high switching costs',
          'Comprehensive ecosystem of technology and data partners'
        ]
      }
    };
  }

  private calculateCompetitiveMoatStrength(data: any): string {
    const { ecosystemMetrics, networkEffects, agencyMetrics } = data;
   
    let moatScore = 0;
   
    // Network effects strength (0-25 points)
    moatScore += Math.min(networkEffects.networkEfficiency * 25, 25);
   
    // Ecosystem health (0-25 points)
    moatScore += Math.min(ecosystemMetrics.ecosystemHealth / 100 * 25, 25);

    // Agency network scale (0-25 points)
    moatScore += Math.min(agencyMetrics.totalAgencies / 500 * 25, 25);

    // Revenue diversification (0-25 points)  
    moatScore += Math.min(ecosystemMetrics.revenueContributed / 5000000 * 25, 25);

    if (moatScore >= 80) return 'Very Strong';
    if (moatScore >= 60) return 'Strong';
    if (moatScore >= 40) return 'Moderate';
    if (moatScore >= 20) return 'Weak';
    return 'Very Weak';
  }
}