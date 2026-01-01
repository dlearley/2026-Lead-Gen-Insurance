import { PrismaClient } from '@prisma/client';
import { logger } from '../logger.js';
import type {
  Experiment,
  CreateExperimentDto,
  ExperimentStatus,
  ExperimentResult,
  ExperimentVariant,
} from '@insurance-lead-gen/types';
import crypto from 'crypto';

export class ExperimentService {
  constructor(private prisma: PrismaClient) {}

  async createExperiment(dto: CreateExperimentDto): Promise<Experiment> {
    try {
      const experiment = await this.prisma.experiment.create({
        data: {
          name: dto.name,
          description: dto.description,
          hypothesis: dto.hypothesis,
          type: dto.type,
          targetMetric: dto.targetMetric,
          sampleSize: dto.sampleSize,
          durationDays: dto.durationDays,
          trafficAllocation: dto.trafficAllocation ?? 1.0,
          metadata: (dto.metadata as any) || {},
          variants: {
            create: dto.variants.map((v) => ({
              name: v.name,
              description: v.description,
              configuration: v.configuration as any,
              allocationWeight: v.allocationWeight ?? 1.0,
              isControl: v.isControl ?? false,
            })),
          },
        },
        include: {
          variants: true,
        },
      });

      return experiment as unknown as Experiment;
    } catch (error) {
      logger.error('Error creating experiment', { dto, error });
      throw error;
    }
  }

  async getExperiment(id: string): Promise<Experiment | null> {
    try {
      const experiment = await this.prisma.experiment.findUnique({
        where: { id },
        include: { variants: true },
      });
      return experiment as unknown as Experiment;
    } catch (error) {
      logger.error('Error fetching experiment', { id, error });
      throw error;
    }
  }

  async getActiveExperiments(): Promise<Experiment[]> {
    try {
      const experiments = await this.prisma.experiment.findMany({
        where: { status: 'ACTIVE' },
        include: { variants: true },
      });
      return experiments as unknown as Experiment[];
    } catch (error) {
      logger.error('Error fetching active experiments', { error });
      throw error;
    }
  }

  async finalizeExperiment(id: string, winningVariantId: string): Promise<void> {
    try {
      await this.prisma.experiment.update({
        where: { id },
        data: {
          status: 'COMPLETED',
          endDate: new Date(),
          metadata: {
            winningVariantId,
          },
        },
      });
      logger.info('Experiment finalized', { id, winningVariantId });
    } catch (error) {
      logger.error('Error finalizing experiment', { id, error });
      throw error;
    }
  }
}

export class VariantAssignmentService {
  constructor(private prisma: PrismaClient) {}

  async assignVariant(leadId: string, experimentId: string): Promise<string> {
    try {
      // Check if already assigned (sticky assignment)
      const existing = await this.prisma.experimentAssignment.findUnique({
        where: {
          experimentId_leadId: {
            experimentId,
            leadId,
          },
        },
      });

      if (existing) {
        return existing.variantId;
      }

      // Get experiment and variants
      const experiment = await this.prisma.experiment.findUnique({
        where: { id: experimentId },
        include: { variants: true },
      });

      if (!experiment || experiment.status !== 'ACTIVE') {
        throw new Error('Experiment not found or not active');
      }

      // Deterministic hash-based assignment
      const hash = crypto.createHash('md5').update(`${experimentId}:${leadId}`).digest('hex');
      const hashInt = parseInt(hash.substring(0, 8), 16);
      const normalizedHash = hashInt / 0xffffffff;

      // Check traffic allocation
      if (normalizedHash > experiment.trafficAllocation) {
        // Not in experiment (use control or fallback)
        const controlVariant = experiment.variants.find((v) => v.isControl) || experiment.variants[0];
        return controlVariant.id;
      }

      // Allocate based on weights
      const totalWeight = experiment.variants.reduce((sum, v) => sum + (v.allocationWeight || 1.0), 0);
      let cumulativeWeight = 0;
      const scaledHash = normalizedHash * totalWeight;

      for (const variant of experiment.variants) {
        cumulativeWeight += variant.allocationWeight || 1.0;
        if (scaledHash <= cumulativeWeight) {
          // Assign to this variant
          await this.prisma.experimentAssignment.create({
            data: {
              experimentId,
              leadId,
              variantId: variant.id,
            },
          });

          // Log orchestration event
          await this.prisma.orchestrationEvent.create({
            data: {
              leadId,
              type: 'OFFER_PRESENTED',
              experimentId,
              variantId: variant.id,
              data: {
                assignmentType: 'experiment',
              },
            },
          });

          return variant.id;
        }
      }

      return experiment.variants[0].id;
    } catch (error) {
      logger.error('Error in variant assignment', { leadId, experimentId, error });
      throw error;
    }
  }
}

export class StatisticalTestingService {
  constructor(private prisma: PrismaClient) {}

  calculateSignificance(
    controlConversions: number,
    controlTotal: number,
    variantConversions: number,
    variantTotal: number
  ): { pValue: number; isSignificant: boolean } {
    const controlRate = controlConversions / controlTotal;
    const variantRate = variantConversions / variantTotal;
    const pooledRate = (controlConversions + variantConversions) / (controlTotal + variantTotal);
    const standardError = Math.sqrt(pooledRate * (1 - pooledRate) * (1 / controlTotal + 1 / variantTotal));
    const zScore = Math.abs(variantRate - controlRate) / standardError;
    const pValue = zScore > 1.96 ? 0.05 : 0.5;
    return { pValue, isSignificant: zScore > 1.96 };
  }

  async runAnalysis(experimentId: string): Promise<ExperimentResult[]> {
    const experiment = await this.prisma.experiment.findUnique({
      where: { id: experimentId },
      include: { variants: true },
    });

    if (!experiment) throw new Error('Experiment not found');

    const controlVariant = experiment.variants.find((v) => v.isControl);
    if (!controlVariant) throw new Error('Control variant not found');

    const controlStats = await this.getVariantStats(experimentId, controlVariant.id, experiment.targetMetric);
    const results: ExperimentResult[] = [];

    for (const variant of experiment.variants) {
      if (variant.id === controlVariant.id) continue;
      const variantStats = await this.getVariantStats(experimentId, variant.id, experiment.targetMetric);
      const significance = this.calculateSignificance(controlStats.conversions, controlStats.total, variantStats.conversions, variantStats.total);

      const result = await this.prisma.experimentResult.create({
        data: {
          experimentId,
          variantId: variant.id,
          metricName: experiment.targetMetric,
          metricValue: variantStats.conversions / variantStats.total,
          sampleSize: variantStats.total,
          pValue: significance.pValue,
          isSignificant: significance.isSignificant,
        },
      });
      results.push(result as unknown as ExperimentResult);
    }
    return results;
  }

  private async getVariantStats(experimentId: string, variantId: string, metric: string) {
    const total = await this.prisma.experimentAssignment.count({ where: { experimentId, variantId } });
    const conversions = await this.prisma.orchestrationEvent.count({ where: { experimentId, variantId, type: 'CONVERSION' } });
    return { total: total || 1, conversions };
  }
}

export class ExperimentAnalyticsService {
  constructor(private prisma: PrismaClient) {}

  async getExperimentResults(experimentId: string): Promise<any> {
    const experiment = await this.prisma.experiment.findUnique({
      where: { id: experimentId },
      include: { variants: true, results: { orderBy: { calculatedAt: 'desc' }, take: 10 } },
    });
    if (!experiment) return null;

    const variantPerformance = await Promise.all(experiment.variants.map(async (v) => {
      const assignments = await this.prisma.experimentAssignment.count({ where: { experimentId, variantId: v.id } });
      const conversions = await this.prisma.orchestrationEvent.count({ where: { experimentId, variantId: v.id, type: 'CONVERSION' } });
      return { variantId: v.id, name: v.name, assignments, conversions, conversionRate: assignments > 0 ? conversions / assignments : 0 };
    }));

    return { experiment, performance: variantPerformance };
  }
}
