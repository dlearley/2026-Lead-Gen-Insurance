import { Router } from 'express';
import { 
  MarketAnalysisEngine, 
  EcosystemPartnershipManager, 
  AgencyNetworkManager, 
  NetworkEffectsEngine 
} from '@leadgen/strategy';
import { logger } from '@insurance-lead-gen/core';

const router = Router();

const marketAnalysisEngine = new MarketAnalysisEngine();
const ecosystemPartnershipManager = new EcosystemPartnershipManager();
const agencyNetworkManager = new AgencyNetworkManager();
const networkEffectsEngine = new NetworkEffectsEngine();

/**
 * @route   GET /api/v1/strategy/market/consolidation-opportunities
 * @desc    Get market consolidation opportunities analysis
 */
router.get('/market/consolidation-opportunities', async (req, res) => {
  try {
    logger.info('Fetching market consolidation opportunities');
    const opportunities = await marketAnalysisEngine.analyzeMarketConsolidationOpportunities();
    res.json({
      success: true,
      data: opportunities,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Error fetching consolidation opportunities', { error });
    res.status(500).json({
      success: false,
      error: 'Failed to fetch consolidation opportunities',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * @route   GET /api/v1/strategy/market/acquisition-timeline/:targetId
 * @desc    Get acquisition timeline for specific target
 */
router.get('/market/acquisition-timeline/:targetId', async (req, res) => {
  try {
    const { targetId } = req.params;
    logger.info(`Fetching acquisition timeline for target: ${targetId}`);
    
    const opportunities = await marketAnalysisEngine.analyzeMarketConsolidationOpportunities();
    const opportunity = opportunities.find(o => o.targets.some(t => t.id === targetId));
    
    if (!opportunity) {
      return res.status(404).json({
        success: false,
        error: 'Acquisition target not found',
        timestamp: new Date().toISOString()
      });
    }
    
    const target = opportunity.targets.find(t => t.id === targetId);
    const timeline = await marketAnalysisEngine.generateConsolidationTimeline({
      ...opportunity,
      targets: [target]
    });
    
    res.json({
      success: true,
      data: timeline,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Error fetching acquisition timeline', { error });
    res.status(500).json({
      success: false,
      error: 'Failed to fetch acquisition timeline',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * @route   GET /api/v1/strategy/ecosystem/metrics
 * @desc    Get ecosystem metrics
 */
router.get('/ecosystem/metrics', async (req, res) => {
  try {
    logger.info('Fetching ecosystem metrics');
    const metrics = await ecosystemPartnershipManager.getEcosystemMetrics();
    res.json({
      success: true,
      data: metrics,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Error fetching ecosystem metrics', { error });
    res.status(500).json({
      success: false,
      error: 'Failed to fetch ecosystem metrics',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * @route   GET /api/v1/strategy/ecosystem/partners/tier/:tier
 * @desc    Get partners by tier
 */
router.get('/ecosystem/partners/tier/:tier', async (req, res) => {
  try {
    const { tier } = req.params;
    logger.info(`Fetching partners by tier: ${tier}`);
    const partners = await ecosystemPartnershipManager.getPartnersByTier(tier);
    res.json({
      success: true,
      data: partners,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Error fetching partners by tier', { error });
    res.status(500).json({
      success: false,
      error: 'Failed to fetch partners by tier',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * @route   GET /api/v1/strategy/ecosystem/partnership-opportunities
 * @desc    Get partnership opportunities
 */
router.get('/ecosystem/partnership-opportunities', async (req, res) => {
  try {
    logger.info('Fetching partnership opportunities');
    const opportunities = await ecosystemPartnershipManager.generatePartnershipOpportunities();
    res.json({
      success: true,
      data: opportunities,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Error fetching partnership opportunities', { error });
    res.status(500).json({
      success: false,
      error: 'Failed to fetch partnership opportunities',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * @route   GET /api/v1/strategy/ecosystem/growth-forecast
 * @desc    Get ecosystem growth forecast
 */
router.get('/ecosystem/growth-forecast', async (req, res) => {
  try {
    logger.info('Fetching ecosystem growth forecast');
    const forecast = await ecosystemPartnershipManager.getEcosystemGrowthForecast();
    res.json({
      success: true,
      data: forecast,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Error fetching ecosystem growth forecast', { error });
    res.status(500).json({
      success: false,
      error: 'Failed to fetch ecosystem growth forecast',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * @route   POST /api/v1/strategy/ecosystem/revenue-share
 * @desc    Calculate revenue share
 */
router.post('/ecosystem/revenue-share', async (req, res) => {
  try {
    const { partnerId, leadsGenerated } = req.body;
    logger.info(`Calculating revenue share for partner: ${partnerId}`);
    
    if (!partnerId || !leadsGenerated) {
      return res.status(400).json({
        success: false,
        error: 'partnerId and leadsGenerated are required',
        timestamp: new Date().toISOString()
      });
    }
    
    const revenueShare = await ecosystemPartnershipManager.calculateRevenueShare(partnerId, leadsGenerated);
    res.json({
      success: true,
      data: { partnerId, leadsGenerated, revenueShare },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Error calculating revenue share', { error });
    res.status(500).json({
      success: false,
      error: 'Failed to calculate revenue share',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * @route   GET /api/v1/strategy/agency/metrics
 * @desc    Get agency network metrics
 */
router.get('/agency/metrics', async (req, res) => {
  try {
    logger.info('Fetching agency network metrics');
    const metrics = await agencyNetworkManager.getNetworkMetrics();
    res.json({
      success: true,
      data: metrics,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Error fetching agency metrics', { error });
    res.status(500).json({
      success: false,
      error: 'Failed to fetch agency metrics',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * @route   GET /api/v1/strategy/agency/region/:region
 * @desc    Get agencies by region
 */
router.get('/agency/region/:region', async (req, res) => {
  try {
    const { region } = req.params;
    logger.info(`Fetching agencies by region: ${region}`);
    const agencies = await agencyNetworkManager.getAgenciesByRegion(region);
    res.json({
      success: true,
      data: agencies,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Error fetching agencies by region', { error });
    res.status(500).json({
      success: false,
      error: 'Failed to fetch agencies by region',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * @route   GET /api/v1/strategy/agency/specialization/:specialization
 * @desc    Get agencies by specialization
 */
router.get('/agency/specialization/:specialization', async (req, res) => {
  try {
    const { specialization } = req.params;
    logger.info(`Fetching agencies by specialization: ${specialization}`);
    const agencies = await agencyNetworkManager.getAgenciesBySpecialization(specialization);
    res.json({
      success: true,
      data: agencies,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Error fetching agencies by specialization', { error });
    res.status(500).json({
      success: false,
      error: 'Failed to fetch agencies by specialization',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * @route   GET /api/v1/strategy/agency/growth-forecast
 * @desc    Get agency network growth forecast
 */
router.get('/agency/growth-forecast', async (req, res) => {
  try {
    logger.info('Fetching agency network growth forecast');
    const forecast = await agencyNetworkManager.getNetworkGrowthForecast();
    res.json({
      success: true,
      data: forecast,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Error fetching agency growth forecast', { error });
    res.status(500).json({
      success: false,
      error: 'Failed to fetch agency growth forecast',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * @route   GET /api/v1/strategy/network/effects
 * @desc    Get network effects analysis
 */
router.get('/network/effects', async (req, res) => {
  try {
    logger.info('Fetching network effects analysis');
    const effects = await networkEffectsEngine.calculateNetworkEffects();
    res.json({
      success: true,
      data: effects,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Error fetching network effects', { error });
    res.status(500).json({
      success: false,
      error: 'Failed to fetch network effects',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * @route   GET /api/v1/strategy/network/switching-costs/:participantId
 * @desc    Analyze switching costs for participant
 */
router.get('/network/switching-costs/:participantId', async (req, res) => {
  try {
    const { participantId } = req.params;
    logger.info(`Analyzing switching costs for participant: ${participantId}`);
    const switchingCosts = await networkEffectsEngine.calculateSwitchingCosts(participantId);
    res.json({
      success: true,
      data: switchingCosts,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Error analyzing switching costs', { error });
    res.status(500).json({
      success: false,
      error: 'Failed to analyze switching costs',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * @route   POST /api/v1/strategy/network/distribute-lead
 * @desc    Distribute lead to agencies
 */
router.post('/network/distribute-lead', async (req, res) => {
  try {
    const lead = req.body;
    logger.info(`Distributing lead: ${lead.id}`);
    
    if (!lead.id) {
      return res.status(400).json({
        success: false,
        error: 'Lead ID is required',
        timestamp: new Date().toISOString()
      });
    }
    
    const result = await agencyNetworkManager.distributeLead(lead);
    res.json({
      success: true,
      data: { leadId: lead.id, assignedAgencyId: result },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Error distributing lead', { error });
    res.status(500).json({
      success: false,
      error: 'Failed to distribute lead',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * @route   POST /api/v1/strategy/network/execute-lead-exchange
 * @desc    Execute lead exchange between agencies
 */
router.post('/network/execute-lead-exchange', async (req, res) => {
  try {
    const { sourceAgencyId, receivingAgencyId, lead } = req.body;
    logger.info(`Executing lead exchange from ${sourceAgencyId} to ${receivingAgencyId}`);
    
    if (!sourceAgencyId || !receivingAgencyId || !lead) {
      return res.status(400).json({
        success: false,
        error: 'sourceAgencyId, receivingAgencyId, and lead are required',
        timestamp: new Date().toISOString()
      });
    }
    
    const result = await networkEffectsEngine.executeLeadExchange(sourceAgencyId, receivingAgencyId, lead);
    res.json({
      success: true,
      data: result,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Error executing lead exchange', { error });
    res.status(500).json({
      success: false,
      error: 'Failed to execute lead exchange',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * @route   GET /api/v1/strategy/comprehensive-report
 * @desc    Get comprehensive strategy report
 */
router.get('/comprehensive-report', async (req, res) => {
  try {
    logger.info('Generating comprehensive strategy report');
    
    // Aggregate all strategy data
    const [
      consolidationOpportunities,
      ecosystemMetrics,
      agencyMetrics,
      networkEffects
    ] = await Promise.all([
      marketAnalysisEngine.analyzeMarketConsolidationOpportunities(),
      ecosystemPartnershipManager.getEcosystemMetrics(),
      agencyNetworkManager.getNetworkMetrics(),
      networkEffectsEngine.calculateNetworkEffects()
    ]);
    
    const competitiveMoatStrength = calculateCompetitiveMoatStrength({
      consolidationOpportunities,
      ecosystemMetrics,
      agencyMetrics,
      networkEffects
    });
    
    const report = {
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
    
    res.json({
      success: true,
      data: report,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Error generating comprehensive report', { error });
    res.status(500).json({
      success: false,
      error: 'Failed to generate comprehensive report',
      timestamp: new Date().toISOString()
    });
  }
});

function calculateCompetitiveMoatStrength(data: any): string {
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

export default router;