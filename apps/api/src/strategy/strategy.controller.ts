import { Controller, Get, Post, Param, Query, Body, Logger } from '@nestjs/common';
import { StrategyService } from './strategy.service';

@Controller('strategy')
export class StrategyController {
  private readonly logger = new Logger(StrategyController.name);

  constructor(private readonly strategyService: StrategyService) {}

  @Get('market/consolidation-opportunities')
  async getConsolidationOpportunities() {
    this.logger.log('GET market consolidation opportunities');
    return await this.strategyService.getMarketConsolidationOpportunities();
  }

  @Get('market/acquisition-timeline/:targetId')
  async getAcquisitionTimeline(@Param('targetId') targetId: string) {
    this.logger.log(`GET acquisition timeline for ${targetId}`);
    return await this.strategyService.getAcquisitionTimeline(targetId);
  }

  @Get('ecosystem/metrics')
  async getEcosystemMetrics() {
    this.logger.log('GET ecosystem metrics');
    return await this.strategyService.getEcosystemMetrics();
  }

  @Get('ecosystem/partners/tier/:tier')
  async getPartnersByTier(@Param('tier') tier: string) {
    this.logger.log(`GET partners by tier: ${tier}`);
    return await this.strategyService.getPartnersByTier(tier);
  }

  @Get('ecosystem/partners/type/:type')
  async getPartnersByType(@Param('type') type: string) {
    this.logger.log(`GET partners by type: ${type}`);
    return await this.strategyService.getPartnersByType(type);
  }

  @Get('ecosystem/partnership-opportunities')
  async getPartnershipOpportunities() {
    this.logger.log('GET partnership opportunities');
    return await this.strategyService.getPartnershipOpportunities();
  }

  @Get('ecosystem/growth-forecast')
  async getEcosystemGrowthForecast() {
    this.logger.log('GET ecosystem growth forecast');
    return await this.strategyService.getEcosystemGrowthForecast();
  }

  @Post('ecosystem/revenue-share')
  async calculateRevenueShare(
    @Body() data: { partnerId: string; leadsGenerated: number }
  ) {
    this.logger.log(`POST calculate revenue share for ${data.partnerId}`);
    return await this.strategyService.calculateRevenueShare(data.partnerId, data.leadsGenerated);
  }

  @Get('agency/metrics')
  async getAgencyNetworkMetrics() {
    this.logger.log('GET agency network metrics');
    return await this.strategyService.getAgencyNetworkMetrics();
  }

  @Get('agency/region/:region')
  async getAgenciesByRegion(@Param('region') region: string) {
    this.logger.log(`GET agencies by region: ${region}`);
    return await this.strategyService.getAgenciesByRegion(region);
  }

  @Get('agency/specialization/:specialization')
  async getAgenciesBySpecialization(@Param('specialization') specialization: string) {
    this.logger.log(`GET agencies by specialization: ${specialization}`);
    return await this.strategyService.getAgenciesBySpecialization(specialization);
  }

  @Get('agency/performance/:agencyId')
  async getAgencyPerformanceReport(@Param('agencyId') agencyId: string) {
    this.logger.log(`GET agency performance report: ${agencyId}`);
    return await this.strategyService.getAgencyPerformanceReport(agencyId);
  }

  @Post('agency/calculate-commission')
  async calculateCommission(@Body() data: { agencyId: string; leadValue: number }) {
    this.logger.log(`POST calculate commission for ${data.agencyId}`);
    return await this.strategyService.calculateCommission(data.agencyId, data.leadValue);
  }

  @Get('agency/growth-forecast')
  async getAgencyGrowthForecast() {
    this.logger.log('GET agency network growth forecast');
    return await this.strategyService.getNetworkGrowthForecast();
  }

  @Get('network/effects')
  async getNetworkEffects() {
    this.logger.log('GET network effects analysis');
    return await this.strategyService.getNetworkEffects();
  }

  @Get('network/switching-costs/:participantId')
  async analyzeSwitchingCosts(@Param('participantId') participantId: string) {
    this.logger.log(`GET switching costs for participant: ${participantId}`);
    return await this.strategyService.analyzeSwitchingCosts(participantId);
  }

  @Get('network/stickiness/:customerId')
  async analyzePlatformStickiness(@Param('customerId') customerId: string) {
    this.logger.log(`GET platform stickiness for customer: ${customerId}`);
    return await this.strategyService.analyzePlatformStickiness(customerId);
  }

  @Get('network/feature-adoption')
  async getFeatureAdoptionTrends() {
    this.logger.log('GET feature adoption trends');
    return await this.strategyService.getFeatureAdoptionTrends();
  }

  @Get('network/reinforcement')
  async analyzeNetworkReinforcement() {
    this.logger.log('GET network reinforcement analysis');
    return await this.strategyService.analyzeNetworkReinforcement();
  }

  @Get('network/expansion-opportunities')
  async getNetworkExpansionOpportunities() {
    this.logger.log('GET network expansion opportunities');
    return await this.strategyService.getNetworkExpansionOpportunities();
  }

  @Post('network/distribute-lead')
  async distributeLead(@Body() lead: any) {
    this.logger.log('POST distribute lead to agencies');
    return await this.strategyService.distributeLeadToAgencies(lead);
  }

  @Post('network/execute-lead-exchange')
  async executeLeadExchange(@Body() data: { sourceAgencyId: string; receivingAgencyId: string; lead: any }) {
    this.logger.log(`POST execute lead exchange from ${data.sourceAgencyId} to ${data.receivingAgencyId}`);
    return await this.strategyService.executeLeadExchange(data.sourceAgencyId, data.receivingAgencyId, data.lead);
  }

  @Post('ecosystem/update-activation')
  async updatePartnerActivationMetrics(
    @Body() data: { partnerId: string; metrics: any }
  ) {
    this.logger.log(`POST update activation metrics for ${data.partnerId}`);
    return await this.strategyService.updatePartnerActivationMetrics(data.partnerId, data.metrics);
  }

  @Post('agency/update-tier')
  async updateAgencyTier(@Body() data: { agencyId: string }) {
    this.logger.log(`POST update tier for agency ${data.agencyId}`);
    return await this.strategyService.updateAgencyTier(data.agencyId);
  }

  @Get('comprehensive-report')
  async getComprehensiveStrategyReport() {
    this.logger.log('GET comprehensive strategy report');
    return await this.strategyService.getComprehensiveStrategyReport();
  }
}