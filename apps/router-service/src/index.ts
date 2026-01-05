import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import { v4 as uuidv4 } from 'uuid';
import { mlRouter } from '@insurance-lead-gen/ml-router';
import { routingRepository } from '@insurance-lead-gen/data-service/src/repositories/routing.repository';
import { routingDecisionService } from '@insurance-lead-gen/data-service/src/services/routing-decision.service';
import { brokerPerformanceAnalyzer } from '@insurance-lead-gen/data-service/src/services/broker-performance-analyzer';
import { experimentService } from '@insurance-lead-gen/data-service/src/services/experiment-service';
import { initializeObservability } from '@insurance-lead-gen/core/src/monitoring/observability';

const app = express();
const PORT = process.env.PORT || 3005;

// Initialize observability
initializeObservability('router-service');

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
  credentials: true,
}));
app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Request logging middleware
app.use((req, res, next) => {
  const requestId = uuidv4();
  req.requestId = requestId;
  
  console.log(`[${requestId}] ${req.method} ${req.path} - ${req.ip}`);
  
  res.on('finish', () => {
    console.log(`[${requestId}] ${res.statusCode} - ${res.get('Content-Length') || 0} bytes`);
  });
  
  next();
});

// Health check
app.get('/health', (req, res) => {
  const health = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'router-service',
    version: '1.0.0',
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    requestId: req.requestId,
  };
  
  res.json(health);
});

// API Routes

/**
 * POST /api/routing/decide
 * Main routing decision endpoint
 */
app.post('/api/routing/decide', async (req, res) => {
  try {
    const { leadId, leadData, excludeBrokers, requireSpecialties, experimentId } = req.body;
    
    if (!leadId || !leadData) {
      return res.status(400).json({
        success: false,
        error: 'leadId and leadData are required',
        requestId: req.requestId,
      });
    }

    const decision = await routingDecisionService.makeRoutingDecision({
      leadId,
      leadData,
      excludeBrokers,
      requireSpecialties,
      experimentId,
    });

    res.json({
      success: true,
      data: decision,
      requestId: req.requestId,
    });

  } catch (error) {
    console.error('Routing decision error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to make routing decision',
      message: error.message,
      requestId: req.requestId,
    });
  }
});

/**
 * POST /api/routing/predict
 * ML-powered routing prediction
 */
app.post('/api/routing/predict', async (req, res) => {
  try {
    const { leadId, leadData, availableBrokers, context, constraints } = req.body;
    
    if (!leadId || !leadData || !availableBrokers?.length) {
      return res.status(400).json({
        success: false,
        error: 'leadId, leadData, and availableBrokers are required',
        requestId: req.requestId,
      });
    }

    const prediction = await mlRouter.PredictionEngine.predictRouting({
      leadId,
      leadData,
      availableBrokers,
      context,
      constraints,
    });

    res.json({
      success: true,
      data: prediction,
      requestId: req.requestId,
    });

  } catch (error) {
    console.error('Routing prediction error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to make routing prediction',
      message: error.message,
      requestId: req.requestId,
    });
  }
});

/**
 * POST /api/routing/batch
 * Batch routing decisions
 */
app.post('/api/routing/batch', async (req, res) => {
  try {
    const { requests } = req.body;
    
    if (!Array.isArray(requests) || requests.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'requests array is required',
        requestId: req.requestId,
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
      requestId: req.requestId,
    });

  } catch (error) {
    console.error('Batch routing error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to process batch routing',
      message: error.message,
      requestId: req.requestId,
    });
  }
});

/**
 * GET /api/brokers/:brokerId/performance
 * Get broker performance analysis
 */
app.get('/api/brokers/:brokerId/performance', async (req, res) => {
  try {
    const { brokerId } = req.params;
    
    const performance = await brokerPerformanceAnalyzer.analyzeBrokerPerformance(brokerId);

    res.json({
      success: true,
      data: performance,
      requestId: req.requestId,
    });

  } catch (error) {
    console.error('Broker performance error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get broker performance',
      message: error.message,
      requestId: req.requestId,
    });
  }
});

/**
 * GET /api/brokers/leaderboard
 * Get performance leaderboard
 */
app.get('/api/brokers/leaderboard', async (req, res) => {
  try {
    const { limit = 20 } = req.query;
    
    const leaderboard = await brokerPerformanceAnalyzer.generatePerformanceLeaderboard(
      parseInt(limit as string)
    );

    res.json({
      success: true,
      data: leaderboard,
      requestId: req.requestId,
    });

  } catch (error) {
    console.error('Leaderboard error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get leaderboard',
      message: error.message,
      requestId: req.requestId,
    });
  }
});

/**
 * POST /api/experiments
 * Create A/B test experiment
 */
app.post('/api/experiments', async (req, res) => {
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
        success: false,
        error: 'name, controlGroup, and treatmentGroup are required',
        requestId: req.requestId,
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
      requestId: req.requestId,
    });

  } catch (error) {
    console.error('Experiment creation error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create experiment',
      message: error.message,
      requestId: req.requestId,
    });
  }
});

/**
 * GET /api/experiments
 * List all experiments
 */
app.get('/api/experiments', async (req, res) => {
  try {
    const experiments = await experimentService.listExperiments();

    res.json({
      success: true,
      data: experiments,
      requestId: req.requestId,
    });

  } catch (error) {
    console.error('List experiments error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to list experiments',
      message: error.message,
      requestId: req.requestId,
    });
  }
});

/**
 * GET /api/experiments/:id/results
 * Get experiment results
 */
app.get('/api/experiments/:id/results', async (req, res) => {
  try {
    const { id } = req.params;
    
    const results = await experimentService.getExperimentSummary(id);

    res.json({
      success: true,
      data: results,
      requestId: req.requestId,
    });

  } catch (error) {
    console.error('Experiment results error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get experiment results',
      message: error.message,
      requestId: req.requestId,
    });
  }
});

/**
 * POST /api/experiments/:id/analyze
 * Analyze experiment
 */
app.post('/api/experiments/:id/analyze', async (req, res) => {
  try {
    const { id } = req.params;
    
    const analysis = await experimentService.analyzeExperiment(id);

    res.json({
      success: true,
      data: analysis,
      requestId: req.requestId,
    });

  } catch (error) {
    console.error('Experiment analysis error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to analyze experiment',
      message: error.message,
      requestId: req.requestId,
    });
  }
});

/**
 * GET /api/analytics/routing-efficiency
 * Get routing efficiency metrics
 */
app.get('/api/analytics/routing-efficiency', async (req, res) => {
  try {
    const { dateFrom, dateTo } = req.query;
    
    const metrics = await routingDecisionService.getRoutingAnalytics(
      dateFrom ? new Date(dateFrom as string) : undefined,
      dateTo ? new Date(dateTo as string) : undefined
    );

    res.json({
      success: true,
      data: metrics,
      requestId: req.requestId,
    });

  } catch (error) {
    console.error('Routing efficiency error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get routing efficiency',
      message: error.message,
      requestId: req.requestId,
    });
  }
});

/**
 * GET /api/models/status
 * Get ML model status
 */
app.get('/api/models/status', async (req, res) => {
  try {
    const status = mlRouter.MLModelManager.getModelStatus();
    const health = mlRouter.MLModelManager.getHealthStatus();
    const performance = mlRouter.MLModelManager.getPerformanceSummary();

    res.json({
      success: true,
      data: {
        status,
        health,
        performance,
      },
      requestId: req.requestId,
    });

  } catch (error) {
    console.error('Model status error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get model status',
      message: error.message,
      requestId: req.requestId,
    });
  }
});

/**
 * POST /api/models/train
 * Train ML models
 */
app.post('/api/models/train', async (req, res) => {
  try {
    const { modelType, trainingData, options } = req.body;
    
    if (!modelType || !trainingData) {
      return res.status(400).json({
        success: false,
        error: 'modelType and trainingData are required',
        requestId: req.requestId,
      });
    }

    const success = await mlRouter.MLModelManager.trainModel(modelType, {
      trainingData,
      ...options,
    });

    res.json({
      success,
      data: { modelType, trained: success },
      requestId: req.requestId,
    });

  } catch (error) {
    console.error('Model training error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to train model',
      message: error.message,
      requestId: req.requestId,
    });
  }
});

/**
 * POST /api/embeddings/generate
 * Generate lead embeddings
 */
app.post('/api/embeddings/generate', async (req, res) => {
  try {
    const { leadInputs } = req.body;
    
    if (!Array.isArray(leadInputs) || leadInputs.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'leadInputs array is required',
        requestId: req.requestId,
      });
    }

    const results = await mlRouter.LeadEmbeddingPipeline.batchProcessLeads(leadInputs);

    res.json({
      success: true,
      data: {
        results,
        totalProcessed: results.length,
        totalRequested: leadInputs.length,
      },
      requestId: req.requestId,
    });

  } catch (error) {
    console.error('Embedding generation error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate embeddings',
      message: error.message,
      requestId: req.requestId,
    });
  }
});

/**
 * GET /api/embeddings/stats
 * Get embedding statistics
 */
app.get('/api/embeddings/stats', async (req, res) => {
  try {
    const stats = await mlRouter.LeadEmbeddingPipeline.getEmbeddingStats();

    res.json({
      success: true,
      data: stats,
      requestId: req.requestId,
    });

  } catch (error) {
    console.error('Embedding stats error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get embedding stats',
      message: error.message,
      requestId: req.requestId,
    });
  }
});

// Error handling middleware
app.use((error: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(`[${req.requestId}] Unhandled error:`, error);
  
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong',
    requestId: req.requestId,
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Route not found',
    path: req.originalUrl,
    method: req.method,
    requestId: req.requestId,
  });
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  process.exit(0);
});

// Start server
async function startServer() {
  try {
    console.log('Starting Router Service...');
    
    // Initialize ML models
    await mlRouter.MLModelManager.initialize();
    
    // Start server
    app.listen(PORT, () => {
      console.log(`🚀 Router Service running on port ${PORT}`);
      console.log(`📊 Health check: http://localhost:${PORT}/health`);
      console.log(`🔗 API base: http://localhost:${PORT}/api`);
    });
    
  } catch (error) {
    console.error('Failed to start Router Service:', error);
    process.exit(1);
  }
}

startServer();