#!/usr/bin/env ts-node
/**
 * Batch Lead Scoring Pipeline
 * Scores all leads in the database and updates their quality scores.
 */

import { PrismaClient } from '@prisma/client';
import { logger } from '@insurance-lead-gen/core';
import { getMLScoringService, FeatureExtractor } from '@insurance-lead-gen/ai-services';

const prisma = new PrismaClient();
const scoringService = getMLScoringService();

interface BatchScoringOptions {
  batchSize?: number;
  refreshAll?: boolean;
  vertical?: 'pc' | 'health' | 'commercial';
  daysBack?: number;
}

async function batchScoreLeads(options: BatchScoringOptions = {}): Promise<void> {
  const {
    batchSize = 100,
    refreshAll = false,
    vertical,
    daysBack = 7
  } = options;

  try {
    logger.info('Starting batch lead scoring', { options });

    // Initialize ML service
    await scoringService.initialize();

    // Build query filters
    const where: any = {};
    
    if (!refreshAll) {
      // Only score leads from last N days that haven't been scored yet
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysBack);
      where.createdAt = { gte: cutoffDate };
      where.qualityScore = null;
    }

    if (vertical) {
      const verticalTypes = {
        'pc': ['AUTO', 'HOME'],
        'health': ['HEALTH'],
        'commercial': ['COMMERCIAL']
      };
      where.insuranceType = { in: verticalTypes[vertical] };
    }

    // Count total leads to score
    const totalLeads = await prisma.lead.count({ where });
    logger.info(`Found ${totalLeads} leads to score`);

    if (totalLeads === 0) {
      logger.info('No leads to score');
      return;
    }

    let scored = 0;
    let failed = 0;
    const startTime = Date.now();

    // Process in batches
    while (scored + failed < totalLeads) {
      // Fetch batch of leads
      const leads = await prisma.lead.findMany({
        where,
        take: batchSize,
        skip: scored + failed,
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

      if (leads.length === 0) break;

      logger.info(`Processing batch ${Math.floor((scored + failed) / batchSize) + 1}`, {
        batchSize: leads.length,
        progress: `${scored + failed}/${totalLeads}`
      });

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
          vertical: FeatureExtractor.determineVertical(lead.insuranceType)
        };
      });

      // Batch score
      try {
        const scores = await scoringService.batchScore(leadData);

        // Update database
        const updatePromises = scores.map(async (score) => {
          try {
            await prisma.lead.update({
              where: { id: score.leadId },
              data: {
                qualityScore: Math.round(score.score),
                metadata: {
                  ...(leads.find(l => l.id === score.leadId)?.metadata || {}),
                  ml_score: {
                    score: score.score,
                    probability: score.probability,
                    confidence: score.confidence,
                    qualityLevel: score.qualityLevel,
                    modelVersion: score.modelVersion,
                    modelType: score.modelType,
                    scoredAt: score.createdAt.toISOString()
                  }
                }
              }
            });
            return true;
          } catch (error) {
            logger.error('Failed to update lead score', { leadId: score.leadId, error });
            return false;
          }
        });

        const results = await Promise.all(updatePromises);
        const batchScored = results.filter(r => r).length;
        const batchFailed = results.filter(r => !r).length;

        scored += batchScored;
        failed += batchFailed;

        logger.info(`Batch completed`, {
          scored: batchScored,
          failed: batchFailed,
          totalScored: scored,
          totalFailed: failed
        });
      } catch (error) {
        logger.error('Batch scoring failed', { error });
        failed += leads.length;
      }

      // Small delay between batches
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    const totalTime = Date.now() - startTime;
    const throughput = (scored / totalTime) * 1000;

    logger.info('Batch scoring completed', {
      totalLeads,
      scored,
      failed,
      totalTimeMs: totalTime,
      throughput: `${throughput.toFixed(2)} leads/sec`
    });

    // Log score distribution
    const scoreDistribution = await prisma.$queryRaw<Array<{ quality_level: string; count: number }>>`
      SELECT 
        CASE 
          WHEN "qualityScore" >= 80 THEN 'high'
          WHEN "qualityScore" >= 60 THEN 'medium'
          WHEN "qualityScore" >= 40 THEN 'low'
          ELSE 'very_low'
        END as quality_level,
        COUNT(*) as count
      FROM "Lead"
      WHERE "qualityScore" IS NOT NULL
      GROUP BY quality_level
      ORDER BY quality_level
    `;

    logger.info('Score distribution:', scoreDistribution);

  } catch (error) {
    logger.error('Batch scoring failed', { error });
    throw error;
  } finally {
    await prisma.$disconnect();
    await scoringService.shutdown();
  }
}

// CLI interface
if (require.main === module) {
  const args = process.argv.slice(2);
  
  const options: BatchScoringOptions = {
    batchSize: 100,
    refreshAll: args.includes('--refresh-all'),
    daysBack: parseInt(args.find(arg => arg.startsWith('--days='))?.split('=')[1] || '7', 10)
  };

  // Parse vertical argument
  const verticalArg = args.find(arg => arg.startsWith('--vertical='));
  if (verticalArg) {
    const vertical = verticalArg.split('=')[1] as 'pc' | 'health' | 'commercial';
    options.vertical = vertical;
  }

  batchScoreLeads(options)
    .then(() => {
      logger.info('Batch scoring completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      logger.error('Batch scoring failed', { error });
      process.exit(1);
    });
}

export { batchScoreLeads };
