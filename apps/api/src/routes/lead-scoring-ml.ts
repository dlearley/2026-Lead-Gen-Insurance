import express, { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { logger } from '@insurance-lead-gen/core';
import { getMLScoringService, FeatureExtractor } from '@insurance-lead-gen/ai-services';

const router = express.Router();
const prisma = new PrismaClient();
const scoringService = getMLScoringService();

// Middleware to ensure ML service is initialized
router.use(async (req, res, next) => {
  try {
    await scoringService.initialize();
    next();
  } catch (error) {
    logger.error('Failed to initialize ML scoring service', { error });
    res.status(503).json({
      error: 'ML scoring service unavailable',
      message: 'Please try again later'
    });
  }
});

/**
 * POST /api/v1/lead-scoring-ml/score/:leadId
 * Score a specific lead using ML model
 */
router.post('/score/:leadId', async (req: Request, res: Response) => {
  const startTime = Date.now();
  const { leadId } = req.params;
  const { useVerticalModel = true } = req.body;

  try {
    // Fetch lead data
    const lead = await prisma.lead.findUnique({
      where: { id: leadId },
      include: {
        assignments: {
          include: {
            agent: true
          },
          orderBy: {
            assignedAt: 'desc'
          },
          take: 1
        }
      }
    });

    if (!lead) {
      return res.status(404).json({
        error: 'Lead not found',
        leadId
      });
    }

    // Extract features
    const assignment = lead.assignments[0];
    const agent = assignment?.agent;

    const features = FeatureExtractor.extractFeatures(
      {
        id: lead.id,
        email: lead.email,
        phone: lead.phone,
        firstName: lead.firstName,
        lastName: lead.lastName,
        street: lead.street,
        city: lead.city,
        state: lead.state,
        zipCode: lead.zipCode,
        insuranceType: lead.insuranceType,
        source: lead.source,
        metadata: lead.metadata,
        createdAt: lead.createdAt,
        agentId: agent?.id,
        assignedAt: assignment?.assignedAt,
        acceptedAt: assignment?.acceptedAt
      },
      agent ? {
        id: agent.id,
        averageResponseTime: agent.averageResponseTime,
        conversionRate: agent.conversionRate,
        rating: agent.rating
      } : undefined
    );

    // Determine vertical
    const vertical = useVerticalModel 
      ? FeatureExtractor.determineVertical(lead.insuranceType)
      : undefined;

    // Score lead
    const score = await scoringService.scoreLead(leadId, features, vertical);

    // Update lead in database
    await prisma.lead.update({
      where: { id: leadId },
      data: {
        qualityScore: Math.round(score.score),
        metadata: {
          ...(lead.metadata as any || {}),
          ml_score: {
            score: score.score,
            probability: score.probability,
            confidence: score.confidence,
            qualityLevel: score.qualityLevel,
            topFactors: score.topFactors,
            modelVersion: score.modelVersion,
            modelType: score.modelType,
            scoredAt: score.createdAt.toISOString()
          }
        }
      }
    });

    const totalTime = Date.now() - startTime;

    res.json({
      success: true,
      leadId,
      score: {
        ...score,
        apiLatencyMs: totalTime
      }
    });

  } catch (error) {
    logger.error('Failed to score lead', { error, leadId });
    res.status(500).json({
      error: 'Failed to score lead',
      message: error instanceof Error ? error.message : 'Unknown error',
      leadId
    });
  }
});

/**
 * POST /api/v1/lead-scoring-ml/batch-score
 * Score multiple leads in batch
 */
router.post('/batch-score', async (req: Request, res: Response) => {
  const startTime = Date.now();
  const { leadIds, useVerticalModel = true } = req.body;

  if (!Array.isArray(leadIds) || leadIds.length === 0) {
    return res.status(400).json({
      error: 'Invalid request',
      message: 'leadIds must be a non-empty array'
    });
  }

  if (leadIds.length > 100) {
    return res.status(400).json({
      error: 'Invalid request',
      message: 'Maximum 100 leads per batch'
    });
  }

  try {
    // Fetch leads
    const leads = await prisma.lead.findMany({
      where: { id: { in: leadIds } },
      include: {
        assignments: {
          include: {
            agent: true
          },
          orderBy: {
            assignedAt: 'desc'
          },
          take: 1
        }
      }
    });

    if (leads.length === 0) {
      return res.status(404).json({
        error: 'No leads found',
        leadIds
      });
    }

    // Prepare features for batch scoring
    const leadData = leads.map(lead => {
      const assignment = lead.assignments[0];
      const agent = assignment?.agent;

      const features = FeatureExtractor.extractFeatures(
        {
          id: lead.id,
          email: lead.email,
          phone: lead.phone,
          firstName: lead.firstName,
          lastName: lead.lastName,
          street: lead.street,
          city: lead.city,
          state: lead.state,
          zipCode: lead.zipCode,
          insuranceType: lead.insuranceType,
          source: lead.source,
          metadata: lead.metadata,
          createdAt: lead.createdAt,
          agentId: agent?.id,
          assignedAt: assignment?.assignedAt,
          acceptedAt: assignment?.acceptedAt
        },
        agent ? {
          id: agent.id,
          averageResponseTime: agent.averageResponseTime,
          conversionRate: agent.conversionRate,
          rating: agent.rating
        } : undefined
      );

      return {
        leadId: lead.id,
        features,
        vertical: useVerticalModel
          ? FeatureExtractor.determineVertical(lead.insuranceType)
          : undefined
      };
    });

    // Batch score
    const scores = await scoringService.batchScore(leadData);

    // Update database (fire and forget to maintain low latency)
    Promise.all(scores.map(score =>
      prisma.lead.update({
        where: { id: score.leadId },
        data: {
          qualityScore: Math.round(score.score),
          metadata: {
            ...(leads.find(l => l.id === score.leadId)?.metadata as any || {}),
            ml_score: {
              score: score.score,
              probability: score.probability,
              confidence: score.confidence,
              qualityLevel: score.qualityLevel,
              topFactors: score.topFactors,
              modelVersion: score.modelVersion,
              modelType: score.modelType,
              scoredAt: score.createdAt.toISOString()
            }
          }
        }
      }).catch(error => logger.error('Failed to update lead', { leadId: score.leadId, error }))
    ));

    const totalTime = Date.now() - startTime;
    const avgTimePerLead = totalTime / scores.length;

    res.json({
      success: true,
      count: scores.length,
      scores,
      performance: {
        totalTimeMs: totalTime,
        avgTimePerLeadMs: avgTimePerLead,
        throughput: `${(scores.length / totalTime * 1000).toFixed(2)} scores/sec`
      }
    });

  } catch (error) {
    logger.error('Failed to batch score leads', { error });
    res.status(500).json({
      error: 'Failed to batch score leads',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/v1/lead-scoring-ml/model-info
 * Get information about loaded models
 */
router.get('/model-info', async (req: Request, res: Response) => {
  try {
    const modelInfo = scoringService.getModelInfo();
    
    res.json({
      success: true,
      models: modelInfo,
      status: modelInfo.some(m => m.loaded) ? 'operational' : 'degraded'
    });
  } catch (error) {
    logger.error('Failed to get model info', { error });
    res.status(500).json({
      error: 'Failed to get model info',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/v1/lead-scoring-ml/score-distribution
 * Get distribution of lead scores
 */
router.get('/score-distribution', async (req: Request, res: Response) => {
  try {
    const distribution = await prisma.$queryRaw<Array<{ quality_level: string; count: number }>>`
      SELECT 
        CASE 
          WHEN "qualityScore" >= 80 THEN 'high'
          WHEN "qualityScore" >= 60 THEN 'medium'
          WHEN "qualityScore" >= 40 THEN 'low'
          ELSE 'very_low'
        END as quality_level,
        COUNT(*) as count,
        AVG("qualityScore") as avg_score
      FROM "Lead"
      WHERE "qualityScore" IS NOT NULL
      GROUP BY quality_level
      ORDER BY quality_level
    `;

    const total = distribution.reduce((sum, item) => sum + Number(item.count), 0);

    const distributionWithPercentage = distribution.map(item => ({
      ...item,
      count: Number(item.count),
      percentage: ((Number(item.count) / total) * 100).toFixed(2)
    }));

    res.json({
      success: true,
      distribution: distributionWithPercentage,
      total
    });
  } catch (error) {
    logger.error('Failed to get score distribution', { error });
    res.status(500).json({
      error: 'Failed to get score distribution',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;
