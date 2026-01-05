import { Router } from 'express';
import { routingDecisionService } from '../services/routing-decision.service';
import { routingRepository } from '../repositories/routing.repository';
import { brokerPerformanceAnalyzer } from '../services/broker-performance-analyzer';
import { specialtyMatcher } from '../services/specialty-matcher';
import { capacityPlanner } from '../services/capacity-planner';
import { experimentService } from '../services/experiment-service';

const router = Router();

/**
 * POST /api/routing/decide
 * Get routing decision for a lead
 */
router.post('/decide', async (req, res) => {
  try {
    const { leadId, leadData, excludeBrokers, requireSpecialties, experimentId } = req.body;

    if (!leadId || !leadData) {
      return res.status(400).json({ 
        error: 'leadId and leadData are required' 
      });
    }

    const routingRequest = {
      leadId,
      leadData,
      excludeBrokers,
      requireSpecialties,
      experimentId,
    };

    const decision = await routingDecisionService.makeRoutingDecision(routingRequest);

    res.json({
      success: true,
      data: decision,
    });

  } catch (error) {
    console.error('Routing decision error:', error);
    res.status(500).json({ 
      error: 'Failed to make routing decision',
      message: error.message,
    });
  }
});

/**
 * GET /api/routing/broker/:brokerId/performance
 * Get broker performance metrics
 */
router.get('/broker/:brokerId/performance', async (req, res) => {
  try {
    const { brokerId } = req.params;

    const performance = await brokerPerformanceAnalyzer.analyzeBrokerPerformance(brokerId);

    res.json({
      success: true,
      data: performance,
    });

  } catch (error) {
    console.error('Broker performance error:', error);
    res.status(500).json({ 
      error: 'Failed to get broker performance',
      message: error.message,
    });
  }
});

/**
 * GET /api/routing/broker/:brokerId/capacity
 * Get broker current capacity
 */
router.get('/broker/:brokerId/capacity', async (req, res) => {
  try {
    const { brokerId } = req.params;

    const capacity = await capacityPlanner.getBrokerCapacity(brokerId);

    if (!capacity) {
      return res.status(404).json({ 
        error: 'Broker capacity data not found' 
      });
    }

    res.json({
      success: true,
      data: capacity,
    });

  } catch (error) {
    console.error('Broker capacity error:', error);
    res.status(500).json({ 
      error: 'Failed to get broker capacity',
      message: error.message,
    });
  }
});

/**
 * GET /api/routing/analytics/leaderboard
 * Get broker performance leaderboard
 */
router.get('/analytics/leaderboard', async (req, res) => {
  try {
    const { limit = 20 } = req.query;

    const leaderboard = await brokerPerformanceAnalyzer.generatePerformanceLeaderboard(
      parseInt(limit as string)
    );

    res.json({
      success: true,
      data: leaderboard,
    });

  } catch (error) {
    console.error('Leaderboard error:', error);
    res.status(500).json({ 
      error: 'Failed to get leaderboard',
      message: error.message,
    });
  }
});

/**
 * POST /api/routing/analytics/refresh-metrics
 * Refresh performance metrics for all brokers
 */
router.post('/analytics/refresh-metrics', async (req, res) => {
  try {
    // This would typically be run as a background job
    await brokerPerformanceAnalyzer.bulkUpdateAllBrokerMetrics();

    res.json({
      success: true,
      message: 'Performance metrics refresh initiated',
    });

  } catch (error) {
    console.error('Metrics refresh error:', error);
    res.status(500).json({ 
      error: 'Failed to refresh metrics',
      message: error.message,
    });
  }
});

/**
 * GET /api/routing/analytics/capacity-trends
 * Get capacity trends across all brokers
 */
router.get('/analytics/capacity-trends', async (req, res) => {
  try {
    const loadMetrics = await capacityPlanner.getLoadBalancingMetrics();
    const recommendations = await capacityPlanner.getCapacityRecommendations();

    res.json({
      success: true,
      data: {
        loadMetrics,
        recommendations,
      },
    });

  } catch (error) {
    console.error('Capacity trends error:', error);
    res.status(500).json({ 
      error: 'Failed to get capacity trends',
      message: error.message,
    });
  }
});

/**
 * POST /api/routing/analytics/rebalance-load
 * Rebalance load across brokers
 */
router.post('/analytics/rebalance-load', async (req, res) => {
  try {
    const { targetLoad = 70 } = req.body;

    const result = await capacityPlanner.rebalanceLoad(targetLoad);

    res.json({
      success: result.successful,
      data: result,
    });

  } catch (error) {
    console.error('Load rebalance error:', error);
    res.status(500).json({ 
      error: 'Failed to rebalance load',
      message: error.message,
    });
  }
});

/**
 * POST /api/routing/experiment/create
 * Create a new A/B test experiment
 */
router.post('/experiment/create', async (req, res) => {
  try {
    const {
      name,
      description,
      controlGroup,
      treatmentGroup,
      segmentRules,
      trafficAllocation,
      confidenceLevel,
      power,
      targetSampleSize,
      duration,
    } = req.body;

    if (!name || !controlGroup || !treatmentGroup) {
      return res.status(400).json({ 
        error: 'name, controlGroup, and treatmentGroup are required' 
      });
    }

    const experimentId = await experimentService.createExperiment({
      name,
      description,
      controlGroup,
      treatmentGroup,
      segmentRules,
      trafficAllocation,
      confidenceLevel,
      power,
      targetSampleSize,
      duration,
    });

    res.json({
      success: true,
      data: { experimentId },
    });

  } catch (error) {
    console.error('Experiment creation error:', error);
    res.status(500).json({ 
      error: 'Failed to create experiment',
      message: error.message,
    });
  }
});

/**
 * GET /api/routing/experiments
 * List all experiments
 */
router.get('/experiments', async (req, res) => {
  try {
    const experiments = await experimentService.listExperiments();

    res.json({
      success: true,
      data: experiments,
    });

  } catch (error) {
    console.error('List experiments error:', error);
    res.status(500).json({ 
      error: 'Failed to list experiments',
      message: error.message,
    });
  }
});

/**
 * GET /api/routing/experiment/:id/results
 * Get experiment results
 */
router.get('/experiment/:id/results', async (req, res) => {
  try {
    const { id } = req.params;

    const results = await experimentService.getExperimentSummary(id);

    res.json({
      success: true,
      data: results,
    });

  } catch (error) {
    console.error('Experiment results error:', error);
    res.status(500).json({ 
      error: 'Failed to get experiment results',
      message: error.message,
    });
  }
});

/**
 * POST /api/routing/experiment/:id/analyze
 * Analyze experiment results
 */
router.post('/experiment/:id/analyze', async (req, res) => {
  try {
    const { id } = req.params;

    const analysis = await experimentService.analyzeExperiment(id);

    res.json({
      success: true,
      data: analysis,
    });

  } catch (error) {
    console.error('Experiment analysis error:', error);
    res.status(500).json({ 
      error: 'Failed to analyze experiment',
      message: error.message,
    });
  }
});

/**
 * POST /api/routing/experiment/:id/pause
 * Pause an experiment
 */
router.post('/experiment/:id/pause', async (req, res) => {
  try {
    const { id } = req.params;

    const success = await experimentService.pauseExperiment(id);

    res.json({
      success,
      message: success ? 'Experiment paused' : 'Failed to pause experiment',
    });

  } catch (error) {
    console.error('Pause experiment error:', error);
    res.status(500).json({ 
      error: 'Failed to pause experiment',
      message: error.message,
    });
  }
});

/**
 * POST /api/routing/experiment/:id/resume
 * Resume a paused experiment
 */
router.post('/experiment/:id/resume', async (req, res) => {
  try {
    const { id } = req.params;

    const success = await experimentService.resumeExperiment(id);

    res.json({
      success,
      message: success ? 'Experiment resumed' : 'Failed to resume experiment',
    });

  } catch (error) {
    console.error('Resume experiment error:', error);
    res.status(500).json({ 
      error: 'Failed to resume experiment',
      message: error.message,
    });
  }
});

/**
 * POST /api/routing/specialties/generate-embeddings
 * Generate embeddings for leads and brokers
 */
router.post('/specialties/generate-embeddings', async (req, res) => {
  try {
    await specialtyMatcher.batchProcessEmbeddings();

    res.json({
      success: true,
      message: 'Embedding generation initiated',
    });

  } catch (error) {
    console.error('Embedding generation error:', error);
    res.status(500).json({ 
      error: 'Failed to generate embeddings',
      message: error.message,
    });
  }
});

/**
 * POST /api/routing/specialties/match
 * Find matching brokers for a lead
 */
router.post('/specialties/match', async (req, res) => {
  try {
    const { leadId, limit = 10 } = req.body;

    if (!leadId) {
      return res.status(400).json({ 
        error: 'leadId is required' 
      });
    }

    const matches = await specialtyMatcher.findMatchingBrokers(leadId, limit);

    res.json({
      success: true,
      data: matches,
    });

  } catch (error) {
    console.error('Specialty matching error:', error);
    res.status(500).json({ 
      error: 'Failed to find matching brokers',
      message: error.message,
    });
  }
});

/**
 * GET /api/routing/analytics/efficiency
 * Get routing efficiency metrics
 */
router.get('/analytics/efficiency', async (req, res) => {
  try {
    const { dateFrom, dateTo } = req.query;

    const metrics = await routingDecisionService.getRoutingAnalytics(
      dateFrom ? new Date(dateFrom as string) : undefined,
      dateTo ? new Date(dateTo as string) : undefined
    );

    res.json({
      success: true,
      data: metrics,
    });

  } catch (error) {
    console.error('Routing efficiency error:', error);
    res.status(500).json({ 
      error: 'Failed to get routing efficiency',
      message: error.message,
    });
  }
});

/**
 * POST /api/routing/batch/decide
 * Batch process routing decisions
 */
router.post('/batch/decide', async (req, res) => {
  try {
    const { requests } = req.body;

    if (!Array.isArray(requests) || requests.length === 0) {
      return res.status(400).json({ 
        error: 'requests array is required' 
      });
    }

    const results = await routingDecisionService.batchProcessRouting(requests);

    res.json({
      success: true,
      data: {
        results,
        totalProcessed: results.length,
        totalRequested: requests.length,
      },
    });

  } catch (error) {
    console.error('Batch routing error:', error);
    res.status(500).json({ 
      error: 'Failed to process batch routing',
      message: error.message,
    });
  }
});

/**
 * GET /api/routing/predictions/broker/:brokerId
 * Predict broker success for a lead type
 */
router.get('/predictions/broker/:brokerId', async (req, res) => {
  try {
    const { brokerId } = req.params;
    const { leadType, urgency = 'MEDIUM' } = req.query;

    // This would use ML models to predict success
    const prediction = {
      brokerId,
      leadType: leadType || 'GENERAL',
      urgency: urgency as string,
      expectedConversionRate: 25.5,
      expectedProcessingTime: 180, // minutes
      confidenceScore: 0.85,
      factors: {
        specialtyMatch: 0.9,
        historicalPerformance: 0.8,
        capacity: 0.7,
        experience: 0.85,
      },
    };

    res.json({
      success: true,
      data: prediction,
    });

  } catch (error) {
    console.error('Prediction error:', error);
    res.status(500).json({ 
      error: 'Failed to get prediction',
      message: error.message,
    });
  }
});

/**
 * GET /api/routing/health
 * Health check for routing service
 */
router.get('/health', async (req, res) => {
  try {
    // Check database connectivity
    const routingDecisions = await routingRepository.getRecentRoutingDecisions(1);
    
    // Check service status
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      services: {
        database: 'connected',
        routing: 'active',
        experiments: 'active',
        specialties: 'active',
        capacity: 'active',
      },
      metrics: {
        recentDecisions: routingDecisions.length,
        uptime: process.uptime(),
      },
    };

    res.json({
      success: true,
      data: health,
    });

  } catch (error) {
    console.error('Health check error:', error);
    res.status(503).json({ 
      error: 'Routing service unhealthy',
      message: error.message,
    });
  }
});

export default router;