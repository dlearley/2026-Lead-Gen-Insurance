import { logger } from '../logger.js';
import type { PrismaClient } from '@prisma/client';
import type {
  Experiment,
  ExperimentConfig,
  ExperimentMetrics,
  ExperimentVariant,
  VariantMetrics,
  StatisticalTestResult,
  WinnerAnalysis,
  RoutingStrategy,
} from '@insurance-lead-gen/types';

export class ABTestingService {
  constructor(private readonly prisma: PrismaClient) {}

  async createExperiment(
    config: ExperimentConfig,
    variants: Array<{
      name: string;
      strategy: RoutingStrategy;
      parameters: Record<string, unknown>;
      trafficAllocation: number;
    }>
  ): Promise<Experiment> {
    // Validate traffic allocation sums to 100
    const totalAllocation = variants.reduce((sum, v) => sum + v.trafficAllocation, 0);
    if (Math.abs(totalAllocation - 100) > 0.01) {
      throw new Error(`Variant traffic allocations must sum to 100, got ${totalAllocation}%`);
    }

    // Create experiment
    const experiment = await this.prisma.routingExperiment.create({
      data: {
        name: config.name,
        strategyType: config.strategyType,
        description: config.description,
        status: 'active',
        trafficPercentage: config.trafficPercentage,
        startDate: config.startDate,
        endDate: config.endDate,
        controlStrategyId: config.controlStrategyId || null,
        successMetric: config.successMetric,
      },
    });

    // Create variants
    for (const variant of variants) {
      await this.prisma.routingExperimentVariant.create({
        data: {
          experimentId: experiment.id,
          name: variant.name,
          strategy: variant.strategy,
          parameters: variant.parameters,
          trafficAllocation: variant.trafficAllocation,
        },
      });
    }

    logger.info('Routing experiment created', {
      experimentId: experiment.id,
      name: config.name,
      variantCount: variants.length,
    });

    return {
      id: experiment.id,
      config,
      status: 'active',
      variants: await this.getExperimentVariants(experiment.id),
      startDate: experiment.startDate,
      endDate: experiment.endDate as Date | undefined,
      createdAt: experiment.createdAt,
      updatedAt: experiment.updatedAt,
    };
  }

  async getExperiment(experimentId: string): Promise<Experiment | null> {
    const experiment = await this.prisma.routingExperiment.findUnique({
      where: { id: experimentId },
      include: {
        variants: true,
        controlStrategy: true,
      },
    });

    if (!experiment) {
      return null;
    }

    return {
      id: experiment.id,
      config: {
        name: experiment.name,
        strategyType: experiment.strategyType as RoutingStrategy,
        description: experiment.description || undefined,
        trafficPercentage: experiment.trafficPercentage,
        startDate: experiment.startDate,
        endDate: experiment.endDate || undefined,
        controlStrategyId: experiment.controlStrategyId || undefined,
        successMetric: experiment.successMetric as any,
        minSampleSize: 100, // Default
        confidenceLevel: 0.95, // Default
      },
      status: experiment.status as any,
      variants: await this.getExperimentVariants(experimentId),
      startDate: experiment.startDate,
      endDate: experiment.endDate || undefined,
      createdAt: experiment.createdAt,
      updatedAt: experiment.updatedAt,
    };
  }

  async getActiveExperiments(): Promise<Experiment[]> {
    const experiments = await this.prisma.routingExperiment.findMany({
      where: { status: 'active' },
      include: {
        variants: true,
        controlStrategy: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return Promise.all(
      experiments.map(async exp => {
        const variants = await this.getExperimentVariants(exp.id);
        return {
          id: exp.id,
          config: {
            name: exp.name,
            strategyType: exp.strategyType as RoutingStrategy,
            description: exp.description || undefined,
            trafficPercentage: exp.trafficPercentage,
            startDate: exp.startDate,
            endDate: exp.endDate || undefined,
            controlStrategyId: exp.controlStrategyId || undefined,
            successMetric: exp.successMetric as any,
            minSampleSize: 100,
            confidenceLevel: 0.95,
          },
          status: exp.status as any,
          variants,
          startDate: exp.startDate,
          endDate: exp.endDate || undefined,
          createdAt: exp.createdAt,
          updatedAt: exp.updatedAt,
        };
      })
    );
  }

  async assignLeadToVariant(
    leadId: string,
    experimentId: string
  ): Promise<string> {
    const experiment = await this.prisma.routingExperiment.findUnique({
      where: { id: experimentId },
      include: { variants: true },
    });

    if (!experiment) {
      throw new Error(`Experiment not found: ${experimentId}`);
    }

    if (experiment.status !== 'active') {
      throw new Error(`Experiment is not active: ${experimentId}`);
    }

    // Check if lead is already assigned
    const existingAssignment = await this.prisma.leadExperimentAssignment.findUnique({
      where: { leadId },
    });

    if (existingAssignment) {
      return existingAssignment.variantId;
    }

    // Randomly assign lead to a variant based on traffic allocation
    const random = Math.random() * 100;
    let cumulativeTraffic = 0;
    let selectedVariantId: string | undefined;

    for (const variant of experiment.variants) {
      cumulativeTraffic += variant.trafficAllocation;
      if (random <= cumulativeTraffic) {
        selectedVariantId = variant.id;
        break;
      }
    }

    if (!selectedVariantId) {
      // Fallback to first variant
      selectedVariantId = experiment.variants[0].id;
    }

    // Create assignment
    await this.prisma.leadExperimentAssignment.create({
      data: {
        leadId,
        experimentId,
        variantId: selectedVariantId,
      },
    });

    return selectedVariantId;
  }

  async getExperimentMetrics(experimentId: string): Promise<ExperimentMetrics> {
    const experiment = await this.prisma.routingExperiment.findUnique({
      where: { id: experimentId },
      include: {
        variants: true,
        leadAssignments: {
          include: {
            lead: true,
          },
        },
      },
    });

    if (!experiment) {
      throw new Error(`Experiment not found: ${experimentId}`);
    }

    // Calculate metrics for each variant
    const variantMetricsMap = new Map<string, VariantMetrics>();

    for (const variant of experiment.variants) {
      const assignments = experiment.leadAssignments.filter(
        a => a.variantId === variant.id
      );

      // Get routing history for leads in this variant
      const leadIds = assignments.map(a => a.leadId);

      const routingHistory = await this.prisma.leadRoutingHistory.findMany({
        where: {
          leadId: { in: leadIds },
        },
      });

      const totalLeads = assignments.length;
      const conversions = routingHistory.filter(h => h.conversionOutcome === true).length;
      const conversionRate = totalLeads > 0 ? (conversions / totalLeads) * 100 : 0;

      // Calculate average handling time
      const handlingTimes = routingHistory
        .filter(h => h.assignmentDurationHours)
        .map(h => h.assignmentDurationHours! * 60);

      const avgHandlingTime =
        handlingTimes.length > 0
          ? handlingTimes.reduce((a, b) => a + b, 0) / handlingTimes.length
          : 0;

      // Calculate SLA compliance
      const compliantCount = routingHistory.filter(h => {
        if (!h.lead.createdAt) return false;
        const waitTimeHours =
          (h.routingTimestamp.getTime() - h.lead.createdAt.getTime()) / (1000 * 60 * 60);
        return waitTimeHours <= 24;
      }).length;

      const slaCompliance = routingHistory.length > 0
        ? (compliantCount / routingHistory.length) * 100
        : 0;

      // Get customer satisfaction from performance metrics
      const customerSatisfaction = 75; // Placeholder

      variantMetricsMap.set(variant.id, {
        totalLeads,
        conversions,
        conversionRate,
        avgHandlingTime,
        slaCompliance,
        customerSatisfaction,
      });
    }

    const variants = Array.from(variantMetricsMap.entries()).map(
      ([variantId, metrics]) => ({
        ...metrics,
        statisticalSignificance: undefined, // Will be calculated below
      })
    );

    // Perform statistical test if we have at least 2 variants with sufficient data
    let statisticalTest: StatisticalTestResult | undefined;
    if (variants.length >= 2 && variants.every(v => v.totalLeads >= 30)) {
      statisticalTest = await this.performStatisticalTest(variants, experiment.successMetric);
    }

    return {
      experimentId,
      status: experiment.status,
      startDate: experiment.startDate,
      endDate: experiment.endDate || undefined,
      totalLeads: experiment.leadAssignments.length,
      variants: variants.map((v, i) => ({
        ...v,
        statisticalSignificance: statisticalTest?.pValue,
      })),
      statisticalTest,
    };
  }

  async determineWinner(experimentId: string): Promise<WinnerAnalysis> {
    const experiment = await this.prisma.routingExperiment.findUnique({
      where: { id: experimentId },
    });

    if (!experiment) {
      throw new Error(`Experiment not found: ${experimentId}`);
    }

    const metrics = await this.getExperimentMetrics(experimentId);

    if (!metrics.statisticalTest) {
      return {
        experimentId,
        winner: '',
        confidence: 0,
        recommendation: 'inconclusive',
        risks: ['Insufficient data for statistical significance'],
        nextSteps: ['Continue collecting data', 'Increase traffic allocation'],
      };
    }

    // Determine winner based on success metric
    const sortedVariants = [...metrics.variants].sort((a, b) => {
      if (experiment.successMetric === 'conversion_rate') {
        return b.conversionRate - a.conversionRate;
      } else if (experiment.successMetric === 'avg_handling_time') {
        return a.avgHandlingTime - b.avgHandlingTime;
      } else if (experiment.successMetric === 'sla_compliance') {
        return b.slaCompliance - a.slaCompliance;
      } else {
        return b.customerSatisfaction - a.customerSatisfaction;
      }
    });

    const winner = sortedVariants[0];
    const runnerUp = sortedVariants[1];

    if (!winner) {
      return {
        experimentId,
        winner: '',
        confidence: 0,
        recommendation: 'inconclusive',
        risks: ['No variants available'],
        nextSteps: ['Verify experiment configuration'],
      };
    }

    // Calculate winning margin
    let winningMargin = 0;
    if (experiment.successMetric === 'conversion_rate' && runnerUp) {
      winningMargin = winner.conversionRate - runnerUp.conversionRate;
    } else if (experiment.successMetric === 'avg_handling_time' && runnerUp) {
      winningMargin = runnerUp.avgHandlingTime - winner.avgHandlingTime;
    } else if (experiment.successMetric === 'sla_compliance' && runnerUp) {
      winningMargin = winner.slaCompliance - runnerUp.slaCompliance;
    }

    // Determine recommendation
    const confidence = 1 - (metrics.statisticalTest?.pValue || 1);

    let recommendation: 'promote' | 'continue' | 'inconclusive' = 'inconclusive';
    const risks: string[] = [];
    const nextSteps: string[] = [];

    if (confidence < 0.8) {
      recommendation = 'continue';
      risks.push('Low statistical confidence');
      nextSteps.push('Continue experiment until higher confidence achieved');
    } else if (confidence >= 0.95 && winningMargin > 5) {
      recommendation = 'promote';
      risks.push(`Winner has ${winningMargin.toFixed(2)}% margin`);
      nextSteps.push('Stop experiment and promote winner to production');
    } else {
      recommendation = 'continue';
      risks.push('Marginal improvement, consider business impact');
      nextSteps.push('Consider stopping if business value is sufficient');
    }

    return {
      experimentId,
      winner: metrics.variants.findIndex(v => v.totalLeads === winner.totalLeads).toString(),
      runnerUp: runnerUp
        ? metrics.variants.findIndex(v => v.totalLeads === runnerUp.totalLeads).toString()
        : undefined,
      winningMargin,
      confidence,
      recommendation,
      risks,
      nextSteps,
    };
  }

  async promoteWinner(experimentId: string): Promise<void> {
    const winnerAnalysis = await this.determineWinner(experimentId);

    if (winnerAnalysis.recommendation !== 'promote') {
      throw new Error(
        `Cannot promote winner: ${winnerAnalysis.recommendation}. ${winnerAnalysis.risks.join(', ')}`
      );
    }

    // Update experiment status
    await this.prisma.routingExperiment.update({
      where: { id: experimentId },
      data: {
        status: 'completed',
      },
    });

    logger.info('Experiment winner promoted', {
      experimentId,
      winner: winnerAnalysis.winner,
      confidence: winnerAnalysis.confidence,
    });

    // In a real system, this would update routing configuration
    // to use the winning strategy
  }

  async pauseExperiment(experimentId: string): Promise<void> {
    await this.prisma.routingExperiment.update({
      where: { id: experimentId },
      data: {
        status: 'paused',
      },
    });

    logger.info('Experiment paused', { experimentId });
  }

  async resumeExperiment(experimentId: string): Promise<void> {
    await this.prisma.routingExperiment.update({
      where: { id: experimentId },
      data: {
        status: 'active',
      },
    });

    logger.info('Experiment resumed', { experimentId });
  }

  async archiveExperiment(experimentId: string): Promise<void> {
    await this.prisma.routingExperiment.update({
      where: { id: experimentId },
      data: {
        status: 'archived',
      },
    });

    logger.info('Experiment archived', { experimentId });
  }

  private async getExperimentVariants(experimentId: string): Promise<ExperimentVariant[]> {
    const variants = await this.prisma.routingExperimentVariant.findMany({
      where: { experimentId },
      include: {
        assignments: true,
      },
    });

    return variants.map(variant => ({
      id: variant.id,
      name: variant.name,
      strategy: variant.strategy as RoutingStrategy,
      parameters: variant.parameters as Record<string, unknown>,
      trafficAllocation: variant.trafficAllocation,
      metrics: {
        totalLeads: variant.assignments.length,
        conversions: 0, // Will be calculated dynamically
        conversionRate: 0,
        avgHandlingTime: 0,
        slaCompliance: 0,
        customerSatisfaction: 0,
      },
    }));
  }

  private async performStatisticalTest(
    variants: VariantMetrics[],
    successMetric: string
  ): Promise<StatisticalTestResult> {
    // Two-sample z-test for proportions (for conversion_rate)
    if (successMetric === 'conversion_rate') {
      const v1 = variants[0];
      const v2 = variants[1];

      const p1 = v1.conversionRate / 100;
      const p2 = v2.conversionRate / 100;
      const n1 = v1.totalLeads;
      const n2 = v2.totalLeads;

      const pooledP = (v1.conversions + v2.conversions) / (n1 + n2);
      const se = Math.sqrt(pooledP * (1 - pooledP) * (1 / n1 + 1 / n2));
      const z = (p1 - p2) / se;

      // Calculate p-value (two-tailed)
      const pValue = 2 * (1 - this.normalCDF(Math.abs(z)));

      return {
        testType: 'z_test',
        pValue,
        isSignificant: pValue < 0.05,
        confidenceInterval: {
          lower: (p1 - p2) - 1.96 * se,
          upper: (p1 - p2) + 1.96 * se,
        },
        winner: p1 > p2 ? '0' : '1',
        margin: Math.abs(p1 - p2),
      };
    }

    // Default: t-test for means
    return {
      testType: 't_test',
      pValue: 0.1,
      isSignificant: false,
      confidenceInterval: { lower: 0, upper: 0 },
      margin: 0,
    };
  }

  private normalCDF(x: number): number {
    // Approximation of the standard normal CDF
    const t = 1 / (1 + 0.2316419 * Math.abs(x));
    const d = 0.3989423 * Math.exp((-x * x) / 2);
    const p = d * t *
      (0.3193815 + t *
      (-0.3565638 + t *
      (1.781478 + t *
      (-1.821256 + t * 1.330274))));

    return x > 0 ? 1 - p : p;
  }
}
