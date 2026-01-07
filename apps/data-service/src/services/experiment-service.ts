import { routingRepository } from '../repositories/routing.repository';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface ExperimentConfig {
  name: string;
  description?: string;
  controlGroup: {
    strategy: string;
    weights: Record<string, number>;
    parameters?: Record<string, any>;
  };
  treatmentGroup: {
    strategy: string;
    weights: Record<string, number>;
    parameters?: Record<string, any>;
  };
  segmentRules?: {
    leadTypes?: string[];
    urgencyLevels?: string[];
    states?: string[];
    customRules?: Record<string, any>;
  };
  trafficAllocation?: number; // 0.0 to 1.0 for treatment group
  confidenceLevel?: number; // 0.95 for 95%
  power?: number; // 0.8 for 80%
  targetSampleSize?: number;
  duration?: number; // days
}

export interface ExperimentAssignment {
  experimentId: string;
  leadId: string;
  group: 'control' | 'treatment';
  assignedAt: Date;
}

export interface ExperimentResults {
  experimentId: string;
  name: string;
  status: string;
  controlMetrics: {
    totalLeads: number;
    convertedLeads: number;
    conversionRate: number;
    avgRevenue: number;
    avgProcessingTime: number;
  };
  treatmentMetrics: {
    totalLeads: number;
    convertedLeads: number;
    conversionRate: number;
    avgRevenue: number;
    avgProcessingTime: number;
  };
  statisticalAnalysis: {
    pValue: number;
    confidenceLevel: number;
    improvement: number;
    winner: 'control' | 'treatment' | 'inconclusive';
    significance: boolean;
  };
  recommendations: string[];
}

export class ExperimentService {
  private readonly MIN_SAMPLE_SIZE = 100;
  private readonly DEFAULT_CONFIDENCE_LEVEL = 0.95;
  private readonly DEFAULT_POWER = 0.8;

  /**
   * Create a new routing experiment
   */
  async createExperiment(config: ExperimentConfig): Promise<string> {
    try {
      const experiment = await routingRepository.createRoutingExperiment({
        name: config.name,
        description: config.description,
        controlGroup: config.controlGroup,
        treatmentGroup: config.treatmentGroup,
        segmentRules: config.segmentRules,
        trafficAllocation: config.trafficAllocation || 0.5,
        confidenceLevel: config.confidenceLevel || this.DEFAULT_CONFIDENCE_LEVEL,
        power: config.power || this.DEFAULT_POWER,
      });

      console.log(`Created experiment ${experiment.id}: ${config.name}`);
      return experiment.id;

    } catch (error) {
      console.error('Failed to create experiment:', error);
      throw new Error(`Failed to create experiment: ${error.message}`);
    }
  }

  /**
   * Get all active experiments
   */
  async getActiveExperiments(): Promise<any[]> {
    return routingRepository.getActiveRoutingExperiments();
  }

  /**
   * Assign a lead to an experiment group
   */
  async assignLeadToExperiment(experimentId: string, leadId: string): Promise<ExperimentAssignment | null> {
    try {
      const experiment = await routingRepository.getRoutingExperiment(experimentId);
      
      if (!experiment || experiment.status !== 'ACTIVE') {
        return null;
      }

      // Check if lead is eligible for this experiment
      if (!await this.isLeadEligibleForExperiment(experimentId, leadId)) {
        return null;
      }

      // Determine assignment group based on traffic allocation
      const trafficAllocation = experiment.trafficAllocation || 0.5;
      const randomValue = Math.random();
      const group = randomValue < trafficAllocation ? 'treatment' : 'control';

      // Log the assignment (you might want to create an assignment tracking table)
      console.log(`Assigned lead ${leadId} to experiment ${experimentId} group: ${group}`);

      // Update experiment sample size
      await routingRepository.updateRoutingExperiment(experimentId, {
        currentSampleSize: { increment: 1 },
      });

      return {
        experimentId,
        leadId,
        group,
        assignedAt: new Date(),
      };

    } catch (error) {
      console.error(`Failed to assign lead ${leadId} to experiment ${experimentId}:`, error);
      return null;
    }
  }

  /**
   * Check if lead is eligible for an experiment
   */
  private async isLeadEligibleForExperiment(experimentId: string, leadId: string): Promise<boolean> {
    try {
      const experiment = await routingRepository.getRoutingExperiment(experimentId);
      
      if (!experiment || experiment.status !== 'ACTIVE') {
        return false;
      }

      // Get lead data
      const lead = await prisma.lead.findUnique({
        where: { id: leadId },
      });

      if (!lead) {
        return false;
      }

      const segmentRules = experiment.segmentRules as any || {};

      // Check segment rules
      if (segmentRules.leadTypes && segmentRules.leadTypes.length > 0) {
        const leadTypes = lead.insuranceTypes || [lead.insuranceType].filter(Boolean);
        const hasMatchingType = segmentRules.leadTypes.some((type: string) => leadTypes.includes(type));
        if (!hasMatchingType) return false;
      }

      if (segmentRules.urgencyLevels && segmentRules.urgencyLevels.length > 0) {
        if (!segmentRules.urgencyLevels.includes(lead.urgency)) return false;
      }

      if (segmentRules.states && segmentRules.states.length > 0) {
        if (!segmentRules.states.includes(lead.state)) return false;
      }

      // Check if lead has already been assigned to this experiment
      const existingAssignment = await prisma.routingDecision.findFirst({
        where: {
          leadId,
          experimentId,
        },
      });

      return !existingAssignment;

    } catch (error) {
      console.error(`Failed to check experiment eligibility for lead ${leadId}:`, error);
      return false;
    }
  }

  /**
   * Analyze experiment results
   */
  async analyzeExperiment(experimentId: string): Promise<ExperimentResults> {
    try {
      const experiment = await routingRepository.getRoutingExperiment(experimentId);
      
      if (!experiment) {
        throw new Error('Experiment not found');
      }

      // Get all routing decisions for this experiment
      const decisions = await prisma.routingDecision.findMany({
        where: { experimentId },
        include: {
          // Would need to join with lead outcomes
        },
      });

      if (decisions.length === 0) {
        throw new Error('No data available for experiment analysis');
      }

      // Separate control and treatment groups
      const controlDecisions = decisions.filter(d => d.routingMethod === 'control');
      const treatmentDecisions = decisions.filter(d => d.routingMethod === 'treatment');

      // Calculate metrics for each group
      const controlMetrics = await this.calculateGroupMetrics(controlDecisions);
      const treatmentMetrics = await this.calculateGroupMetrics(treatmentDecisions);

      // Perform statistical analysis
      const statisticalAnalysis = this.performStatisticalAnalysis(
        controlMetrics,
        treatmentMetrics,
        experiment.confidenceLevel || this.DEFAULT_CONFIDENCE_LEVEL
      );

      // Generate recommendations
      const recommendations = this.generateExperimentRecommendations(
        controlMetrics,
        treatmentMetrics,
        statisticalAnalysis
      );

      // Update experiment with results
      await routingRepository.updateRoutingExperiment(experimentId, {
        controlMetrics,
        treatmentMetrics,
        statisticalSignificance: statisticalAnalysis.pValue,
        improvement: statisticalAnalysis.improvement,
        winner: statisticalAnalysis.winner,
        winnerReason: recommendations.join('; '),
      });

      return {
        experimentId,
        name: experiment.name,
        status: experiment.status,
        controlMetrics,
        treatmentMetrics,
        statisticalAnalysis,
        recommendations,
      };

    } catch (error) {
      console.error(`Failed to analyze experiment ${experimentId}:`, error);
      throw new Error(`Experiment analysis failed: ${error.message}`);
    }
  }

  /**
   * Calculate metrics for a group
   */
  private async calculateGroupMetrics(decisions: any[]): Promise<any> {
    if (decisions.length === 0) {
      return {
        totalLeads: 0,
        convertedLeads: 0,
        conversionRate: 0,
        avgRevenue: 0,
        avgProcessingTime: 0,
      };
    }

    // Get lead outcomes for these decisions
    const leadIds = decisions.map(d => d.leadId);
    const leads = await prisma.lead.findMany({
      where: { id: { in: leadIds } },
      include: {
        assignments: {
          where: { agentId: { in: decisions.map(d => d.brokerId) } },
          include: { agent: true },
        },
      },
    });

    const totalLeads = decisions.length;
    const convertedLeads = leads.filter(lead => lead.status === 'CONVERTED').length;
    const conversionRate = totalLeads > 0 ? (convertedLeads / totalLeads) * 100 : 0;

    // Calculate average revenue
    const convertedAssignments = leads
      .filter(lead => lead.status === 'CONVERTED')
      .flatMap(lead => lead.assignments)
      .filter(assignment => assignment.conversionValue);

    const avgRevenue = convertedAssignments.length > 0
      ? convertedAssignments.reduce((sum, a) => sum + (a.conversionValue || 0), 0) / convertedAssignments.length
      : 0;

    // Calculate average processing time
    const completedAssignments = leads
      .flatMap(lead => lead.assignments)
      .filter(assignment => assignment.convertedAt || assignment.rejectedAt);

    const avgProcessingTime = completedAssignments.length > 0
      ? completedAssignments.reduce((sum, assignment) => {
          const completionTime = assignment.convertedAt || assignment.rejectedAt;
          const processingTime = completionTime 
            ? (completionTime.getTime() - assignment.assignedAt.getTime()) / (1000 * 60) // minutes
            : 0;
          return sum + processingTime;
        }, 0) / completedAssignments.length
      : 0;

    return {
      totalLeads,
      convertedLeads,
      conversionRate,
      avgRevenue,
      avgProcessingTime,
    };
  }

  /**
   * Perform statistical analysis on experiment results
   */
  private performStatisticalAnalysis(
    controlMetrics: any,
    treatmentMetrics: any,
    confidenceLevel: number
  ): any {
    const n1 = controlMetrics.totalLeads;
    const n2 = treatmentMetrics.totalLeads;
    
    if (n1 < this.MIN_SAMPLE_SIZE || n2 < this.MIN_SAMPLE_SIZE) {
      return {
        pValue: 1.0,
        confidenceLevel,
        improvement: 0,
        winner: 'inconclusive',
        significance: false,
      };
    }

    // Calculate conversion rate difference
    const conversionRate1 = controlMetrics.conversionRate / 100;
    const conversionRate2 = treatmentMetrics.conversionRate / 100;
    
    // Two-proportion z-test
    const pooledConversionRate = (controlMetrics.convertedLeads + treatmentMetrics.convertedLeads) / (n1 + n2);
    const standardError = Math.sqrt(pooledConversionRate * (1 - pooledConversionRate) * (1/n1 + 1/n2));
    const zScore = (conversionRate2 - conversionRate1) / standardError;
    
    // Calculate p-value (two-tailed test)
    const pValue = 2 * (1 - this.normalCDF(Math.abs(zScore)));
    
    // Calculate improvement percentage
    const improvement = n1 > 0 ? ((conversionRate2 - conversionRate1) / conversionRate1) * 100 : 0;
    
    // Determine winner and significance
    const isSignificant = pValue < (1 - confidenceLevel);
    let winner: 'control' | 'treatment' | 'inconclusive' = 'inconclusive';
    
    if (isSignificant) {
      winner = conversionRate2 > conversionRate1 ? 'treatment' : 'control';
    }

    return {
      pValue,
      confidenceLevel,
      improvement,
      winner,
      significance: isSignificant,
    };
  }

  /**
   * Normal cumulative distribution function (approximation)
   */
  private normalCDF(x: number): number {
    return 0.5 * (1 + this.erf(x / Math.sqrt(2)));
  }

  /**
   * Error function approximation
   */
  private erf(x: number): number {
    const a1 = 0.254829592;
    const a2 = -0.284496736;
    const a3 = 1.421413741;
    const a4 = -1.453152027;
    const a5 = 1.061405429;
    const p = 0.3275911;

    const sign = x < 0 ? -1 : 1;
    x = Math.abs(x);

    const t = 1.0 / (1.0 + p * x);
    const y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);

    return sign * y;
  }

  /**
   * Generate recommendations based on experiment results
   */
  private generateExperimentRecommendations(
    controlMetrics: any,
    treatmentMetrics: any,
    statisticalAnalysis: any
  ): string[] {
    const recommendations: string[] = [];

    if (!statisticalAnalysis.significance) {
      recommendations.push('Results are not statistically significant. Continue the experiment or increase sample size.');
      return recommendations;
    }

    if (statisticalAnalysis.winner === 'treatment') {
      recommendations.push(`Treatment group shows ${statisticalAnalysis.improvement.toFixed(1)}% improvement in conversion rate.`);
      
      if (treatmentMetrics.avgRevenue > controlMetrics.avgRevenue) {
        recommendations.push('Treatment also shows higher average revenue per conversion.');
      }
      
      if (treatmentMetrics.avgProcessingTime < controlMetrics.avgProcessingTime) {
        recommendations.push('Treatment group processes leads faster on average.');
      }

      recommendations.push('Consider rolling out treatment strategy to all leads.');
      
    } else if (statisticalAnalysis.winner === 'control') {
      recommendations.push('Control group performs better. Do not implement treatment strategy.');
      recommendations.push('Consider refining treatment strategy based on insights from this experiment.');
    }

    // Revenue impact analysis
    const revenueDifference = treatmentMetrics.avgRevenue - controlMetrics.avgRevenue;
    const volumeDifference = treatmentMetrics.totalLeads - controlMetrics.totalLeads;
    
    if (Math.abs(revenueDifference) > 100) {
      recommendations.push(`Revenue impact: $${revenueDifference.toFixed(2)} per conversion difference.`);
    }

    return recommendations;
  }

  /**
   * Auto-complete experiment when significance is reached
   */
  async autoCompleteExperiment(experimentId: string): Promise<boolean> {
    try {
      const experiment = await routingRepository.getRoutingExperiment(experimentId);
      
      if (!experiment || experiment.status !== 'ACTIVE') {
        return false;
      }

      const analysis = await this.analyzeExperiment(experimentId);
      
      // Check if we should auto-complete
      const shouldComplete = analysis.statisticalAnalysis.significance && 
                           analysis.statisticalAnalysis.pValue < 0.01; // 99% confidence

      if (shouldComplete) {
        await routingRepository.updateRoutingExperiment(experimentId, {
          status: 'COMPLETED',
          endDate: new Date(),
          currentSampleSize: analysis.controlMetrics.totalLeads + analysis.treatmentMetrics.totalLeads,
        });

        console.log(`Auto-completed experiment ${experimentId}. Winner: ${analysis.statisticalAnalysis.winner}`);
        return true;
      }

      return false;

    } catch (error) {
      console.error(`Failed to auto-complete experiment ${experimentId}:`, error);
      return false;
    }
  }

  /**
   * Get experiment results summary
   */
  async getExperimentSummary(experimentId: string): Promise<any> {
    const experiment = await routingRepository.getRoutingExperiment(experimentId);
    
    if (!experiment) {
      throw new Error('Experiment not found');
    }

    const analysis = experiment.status === 'COMPLETED' 
      ? await this.analyzeExperiment(experimentId)
      : null;

    return {
      experiment,
      analysis,
      progress: {
        currentSampleSize: experiment.currentSampleSize,
        targetSampleSize: experiment.targetSampleSize,
        completionPercentage: experiment.targetSampleSize 
          ? (experiment.currentSampleSize / experiment.targetSampleSize) * 100 
          : 0,
      },
    };
  }

  /**
   * List all experiments with summary
   */
  async listExperiments(): Promise<Array<{
    id: string;
    name: string;
    status: string;
    startDate: Date;
    currentSampleSize: number;
    targetSampleSize?: number;
    winner?: string;
    improvement?: number;
  }>> {
    const experiments = await routingRepository.getActiveRoutingExperiments();
    
    // Get completed experiments too
    const completedExperiments = await prisma.routingExperiment.findMany({
      where: { status: 'COMPLETED' },
      orderBy: { endDate: 'desc' },
      take: 10,
    });

    const allExperiments = [...experiments, ...completedExperiments];

    return allExperiments.map(exp => ({
      id: exp.id,
      name: exp.name,
      status: exp.status,
      startDate: exp.startDate,
      currentSampleSize: exp.currentSampleSize,
      targetSampleSize: exp.targetSampleSize,
      winner: exp.winner,
      improvement: exp.improvement,
    }));
  }

  /**
   * Pause an experiment
   */
  async pauseExperiment(experimentId: string): Promise<boolean> {
    try {
      await routingRepository.updateRoutingExperiment(experimentId, {
        status: 'PAUSED',
      });

      console.log(`Paused experiment ${experimentId}`);
      return true;

    } catch (error) {
      console.error(`Failed to pause experiment ${experimentId}:`, error);
      return false;
    }
  }

  /**
   * Resume a paused experiment
   */
  async resumeExperiment(experimentId: string): Promise<boolean> {
    try {
      await routingRepository.updateRoutingExperiment(experimentId, {
        status: 'ACTIVE',
      });

      console.log(`Resumed experiment ${experimentId}`);
      return true;

    } catch (error) {
      console.error(`Failed to resume experiment ${experimentId}:`, error);
      return false;
    }
  }

  /**
   * Roll back a completed experiment
   */
  async rollbackExperiment(experimentId: string): Promise<boolean> {
    try {
      await routingRepository.updateRoutingExperiment(experimentId, {
        status: 'ROLLED_BACK',
      });

      console.log(`Rolled back experiment ${experimentId}`);
      return true;

    } catch (error) {
      console.error(`Failed to rollback experiment ${experimentId}:`, error);
      return false;
    }
  }
}

export const experimentService = new ExperimentService();