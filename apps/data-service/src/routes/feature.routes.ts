/**
 * Feature Store API Routes
 * 
 * REST API endpoints for the centralized Feature Store service that serves
 * ML features to models across the platform. Provides feature retrieval,
 * batch processing, caching, and feature engineering capabilities.
 */

import { Router, Request, Response } from 'express';
import { FeatureStore } from '../services/feature-store';
import { Redis } from '../redis';
import neo4j from 'neo4j-driver';
import { prisma } from '../db';
import { logger } from '@insurance-lead-gen/core';

// Initialize Feature Store instance
const redis = new Redis();
const neo4jDriver = neo4j.driver(
  process.env.NEO4J_URI || 'bolt://localhost:7687',
  neo4j.auth.basic(
    process.env.NEO4J_USER || 'neo4j',
    process.env.NEO4J_PASSWORD || 'password'
  )
);

const featureStore = new FeatureStore(redis, neo4jDriver);

const router = Router();

/**
 * @route   POST /api/v1/features/batch
 * @desc    Get features for multiple entities in batch
 * @access  Public (internal service-to-service)
 * 
 * @example Request:
 * {
 *   "entity_ids": ["lead_123", "lead_456"],
 *   "feature_names": ["quality_score", "engagement_score", "email_open_rate"],
 *   "entity_type": "lead"
 * }
 * 
 * @example Response:
 * {
 *   "success": true,
 *   "features": {
 *     "lead_123": {
 *       "quality_score": 85,
 *       "engagement_score": 72,
 *       "email_open_rate": 0.65
 *     },
 *     "lead_456": {
 *       "quality_score": 92,
 *       "engagement_score": 88,
 *       "email_open_rate": 0.78
 *     }
 *   },
 *   "metadata": {
 *     "requestId": "req_abc123",
 *     "computedAt": "2024-01-15T10:30:00.000Z",
 *     "latencyMs": 45,
 *     "cacheHitRate": 0.8,
 *     "missingFeatures": []
 *   }
 * }
 */
router.post('/batch', async (req: Request, res: Response) => {
  try {
    const startTime = Date.now();
    const { entity_ids, feature_names, entity_type = 'lead' } = req.body;

    // Validate required parameters
    if (!entity_ids || !Array.isArray(entity_ids)) {
      return res.status(400).json({
        success: false,
        error: 'entity_ids is required and must be an array'
      });
    }

    if (!feature_names || !Array.isArray(feature_names)) {
      return res.status(400).json({
        success: false,
        error: 'feature_names is required and must be an array'
      });
    }

    if (entity_ids.length > 1000) {
      return res.status(400).json({
        success: false,
        error: 'Maximum batch size is 1000 entities'
      });
    }

    // Process in batches for large requests
    const batchSize = 100;
    const results: Record<string, any> = {};
    let cacheHits = 0;
    let cacheMisses = 0;

    for (let i = 0; i < entity_ids.length; i += batchSize) {
      const batchIds = entity_ids.slice(i, i + batchSize);
      const batchResults = await featureStore.getFeaturesBatch(batchIds, feature_names, entity_type);

      for (const [entityId, features] of Object.entries(batchResults)) {
        results[entityId] = features;
      }
    }

    // Calculate cache hit rate
    const totalRequests = entity_ids.length * feature_names.length;
    const cacheHitRate = totalRequests > 0 ? cacheHits / totalRequests : 0;

    const latencyMs = Date.now() - startTime;

    logger.info('Batch feature retrieval completed', {
      entityCount: entity_ids.length,
      featureCount: feature_names.length,
      latencyMs,
      cacheHitRate,
      entityType: entity_type
    });

    return res.json({
      success: true,
      features: results,
      metadata: {
        requestId: `req_${Date.now()}`,
        computedAt: new Date().toISOString(),
        latencyMs,
        cacheHitRate,
        missingFeatures: [],
        staleFeatures: []
      }
    });

  } catch (error) {
    logger.error('Failed to retrieve features in batch', {
      error,
      request: req.body
    });

    return res.status(500).json({
      success: false,
      error: 'Internal server error while retrieving features'
    });
  }
});

/**
 * @route   POST /api/v1/features/retrieve
 * @desc    Get features for a single entity with metadata
 * @access  Public (internal service-to-service)
 * 
 * @example Request:
 * {
 *   "entity_id": "lead_123",
 *   "feature_names": ["quality_score", "engagement_score"],
 *   "entity_type": "lead"
 * }
 */
router.post('/retrieve', async (req: Request, res: Response) => {
  try {
    const startTime = Date.now();
    const { entity_id, feature_names, entity_type = 'lead' } = req.body;

    if (!entity_id) {
      return res.status(400).json({
        success: false,
        error: 'entity_id is required'
      });
    }

    if (!feature_names || !Array.isArray(feature_names)) {
      return res.status(400).json({
        success: false,
        error: 'feature_names is required and must be an array'
      });
    }

    const features = await featureStore.getFeatures(entity_id, feature_names, entity_type);

    const latencyMs = Date.now() - startTime;

    logger.info('Feature retrieval completed', {
      entityId: entity_id,
      featureCount: feature_names.length,
      latencyMs,
      entityType: entity_type
    });

    return res.json({
      success: true,
      features,
      metadata: {
        entityId: entity_id,
        computedAt: new Date().toISOString(),
        latencyMs
      }
    });

  } catch (error) {
    logger.error('Failed to retrieve features', {
      error,
      entityId: req.body.entity_id
    });

    return res.status(500).json({
      success: false,
      error: 'Internal server error while retrieving features'
    });
  }
});

/**
 * @route   POST /api/v1/features/store
 * @desc    Store computed features for an entity
 * @access  Public (internal service-to-service)
 * 
 * @example Request:
 * {
 *   "entity_id": "lead_123",
 *   "entity_type": "lead",
 *   "feature_set": {
 *     "model_prediction_score": 0.85,
 *     "feature_importance": "high"
 *   }
 * }
 */
router.post('/store', async (req: Request, res: Response) => {
  try {
    const { entity_id, entity_type, feature_set } = req.body;

    if (!entity_id || !entity_type || !feature_set) {
      return res.status(400).json({
        success: false,
        error: 'entity_id, entity_type, and feature_set are required'
      });
    }

    await featureStore.storeFeatures(entity_id, feature_set, entity_type);

    logger.info('Features stored successfully', {
      entityId: entity_id,
      entityType: entity_type,
      count: Object.keys(feature_set).length
    });

    return res.json({
      success: true,
      entityId: entity_id,
      entityType: entity_type,
      count: Object.keys(feature_set).length,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Failed to store features', {
      error,
      request: req.body
    });

    return res.status(500).json({
      success: false,
      error: 'Internal server error while storing features'
    });
  }
});

/**
 * @route   POST /api/v1/features/engineer
 * @desc    Perform feature engineering to create new features
 * @access  Public (internal service-to-service)
 * 
 * @example Request:
 * {
 *   "entity_type": "lead",
 *   "lead_ids": ["lead_123", "lead_456", "lead_789"],
 *   "include_graph_features": true,
 *   "include_temporal_features": true,
 *   "include_aggregations": true
 * }
 */
router.post('/engineer', async (req: Request, res: Response) => {
  try {
    const startTime = Date.now();
    const { 
      entity_type, 
      lead_ids, 
      agent_ids, 
      include_graph_features = false,
      include_temporal_features = true,
      include_aggregations = true,
      feature_window_days = 30
    } = req.body;

    if (!entity_type) {
      return res.status(400).json({
        success: false,
        error: 'entity_type is required'
      });
    }

    const config = {
      entityType: entity_type,
      leadIds: lead_ids,
      agentIds: agent_ids,
      includeGraphFeatures: include_graph_features,
      includeTemporalFeatures: include_temporal_features,
      includeAggregations: include_aggregations,
      featureWindowDays: feature_window_days
    };

    const result = await featureStore.engineerFeatures(config);

    const latencySeconds = (Date.now() - startTime) / 1000;

    logger.info('Feature engineering completed', {
      entityType: entity_type,
      entitiesProcessed: result.processingStats.entitiesProcessed,
      featuresGenerated: result.generatedFeatures.totalFeatures,
      durationSeconds: latencySeconds
    });

    return res.json({
      success: true,
      data: result
    });

  } catch (error) {
    logger.error('Feature engineering failed', {
      error,
      request: req.body
    });

    return res.status(500).json({
      success: false,
      error: 'Internal server error during feature engineering'
    });
  }
});

/**
 * @route   GET /api/v1/features/graph/:entityId
 * @desc    Get graph-based features from Neo4j
 * @access  Public (internal service-to-service)
 * 
 * @example Response:
 * {
 *   "success": true,
 *   "features": {
 *     "graph_centrality_node_count": 15,
 *     "graph_community_score": 0.85,
 *     "graph_assigned_agent": "agent_456"
 *   }
 * }
 */
router.get('/graph/:entityId', async (req: Request, res: Response) => {
  try {
    const { entityId } = req.params;
    const entityType = req.query.entity_type as string || 'lead';

    const features = await featureStore.getGraphFeatures(entityId, entityType);

    logger.info('Graph features retrieved', {
      entityId,
      entityType,
      featureCount: Object.keys(features).length
    });

    return res.json({
      success: true,
      features
    });

  } catch (error) {
    logger.error('Failed to retrieve graph features', {
      error,
      entityId: req.params.entityId
    });

    return res.status(500).json({
      success: false,
      error: 'Internal server error while retrieving graph features'
    });
  }
});

/**
 * @route   DELETE /api/v1/features/cache/:entityId
 * @desc    Clear cached features for an entity
 * @access  Public (internal service-to-service)
 */
router.delete('/cache/:entityId', async (req: Request, res: Response) => {
  try {
    const { entityId } = req.params;
    const entityType = req.query.entity_type as string || 'lead';

    await featureStore.clearCache(entityId, entityType);

    logger.info('Cache cleared', {
      entityId,
      entityType
    });

    return res.json({
      success: true,
      entityId,
      entityType,
      message: 'Cache cleared successfully'
    });

  } catch (error) {
    logger.error('Failed to clear cache', {
      error,
      entityId: req.params.entityId
    });

    return res.status(500).json({
      success: false,
      error: 'Internal server error while clearing cache'
    });
  }
});

/**
 * @route   GET /api/v1/features/health
 * @desc    Health check endpoint for Feature Store
 * @access  Public
 */
router.get('/health', async (req: Request, res: Response) => {
  try {
    // Test Redis connectivity
    await redis.ping();

    // Test Neo4j connectivity
    await neo4jDriver.verifyConnectivity();

    // Test database connectivity
    await prisma.$queryRaw`SELECT 1`;

    logger.info('Feature Store health check passed');

    return res.json({
      success: true,
      status: 'healthy',
      timestamp: new Date().toISOString(),
      components: {
        redis: 'connected',
        neo4j: 'connected',
        postgres: 'connected'
      }
    });

  } catch (error) {
    logger.error('Feature Store health check failed', { error });

    return res.status(503).json({
      success: false,
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;