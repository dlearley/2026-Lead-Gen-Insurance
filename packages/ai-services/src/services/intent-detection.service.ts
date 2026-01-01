import { logger } from '@insurance-lead-gen/core';
import type { PrismaClient } from '@prisma/client';
import { 
  IntentScore, 
  IntentSignal, 
  SignalCategory, 
  IntentLevel 
} from '@insurance-lead-gen/types';

export class IntentDetectionService {
  private prisma: PrismaClient;

  // Weights as per ticket
  private readonly WEIGHTS = {
    WEBSITE: 0.30,
    EMAIL: 0.25,
    CONTENT: 0.20,
    VELOCITY: 0.15,
    BUYING: 0.10
  };

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  /**
   * Calculate or update the intent score for a lead
   */
  async calculateIntentScore(leadId: string): Promise<IntentScore> {
    try {
      logger.info('Calculating intent score for lead', { leadId });

      // Get all signals for this lead
      const signals = await (this.prisma as any).intentSignal.findMany({
        where: { leadId },
        orderBy: { timestamp: 'desc' },
        take: 50 // Limit to recent signals for performance
      });

      if (signals.length === 0) {
        return this.getDefaultScore(leadId);
      }

      // Group signals by category
      const categories: Record<SignalCategory, IntentSignal[]> = {
        WEBSITE: [],
        EMAIL: [],
        CONTENT: [],
        VELOCITY: [],
        BUYING: [],
        CHURN: [],
        EXPANSION: []
      };

      signals.forEach((signal: any) => {
        const cat = signal.category as SignalCategory;
        if (categories[cat]) {
          categories[cat].push(signal);
        }
      });

      // Calculate category scores (normalized 0-100)
      const catScores = {
        WEBSITE: this.calculateCategoryScore(categories.WEBSITE),
        EMAIL: this.calculateCategoryScore(categories.EMAIL),
        CONTENT: this.calculateCategoryScore(categories.CONTENT),
        VELOCITY: this.calculateCategoryScore(categories.VELOCITY),
        BUYING: this.calculateCategoryScore(categories.BUYING)
      };

      // Calculate weighted total score
      const totalScore = 
        (catScores.WEBSITE * this.WEIGHTS.WEBSITE) +
        (catScores.EMAIL * this.WEIGHTS.EMAIL) +
        (catScores.CONTENT * this.WEIGHTS.CONTENT) +
        (catScores.VELOCITY * this.WEIGHTS.VELOCITY) +
        (catScores.BUYING * this.WEIGHTS.BUYING);

      // Determine level
      const level = this.determineLevel(totalScore);

      // Determine trend (compared to last score)
      const lastScore = await (this.prisma as any).intentScore.findUnique({
        where: { leadId }
      });
      const trend = this.calculateTrend(totalScore, lastScore?.score);

      // Save or update score
      const updatedScore = await (this.prisma as any).intentScore.upsert({
        where: { leadId },
        update: {
          score: totalScore,
          level,
          trend,
          confidence: 0.85,
          lastUpdated: new Date()
        },
        create: {
          leadId,
          score: totalScore,
          level,
          trend,
          confidence: 0.85,
          lastUpdated: new Date()
        }
      });

      // Generate alert if critical intent
      if (level === 'CRITICAL' && (lastScore?.level !== 'CRITICAL')) {
        await this.generateIntentAlert(updatedScore);
      }

      return {
        id: updatedScore.id,
        leadId: updatedScore.leadId,
        score: updatedScore.score,
        level: updatedScore.level as IntentLevel,
        trend: updatedScore.trend as 'UP' | 'DOWN' | 'STABLE',
        confidence: updatedScore.confidence,
        topSignals: signals.slice(0, 5) as any,
        lastUpdated: updatedScore.lastUpdated.toISOString()
      };
    } catch (error) {
      logger.error('Failed to calculate intent score', { error, leadId });
      throw error;
    }
  }

  private async generateIntentAlert(score: any) {
    try {
      logger.info('Generating high intent alert', { leadId: score.leadId, score: score.score });
      
      await (this.prisma as any).notification.create({
        data: {
          userId: 'system', // Or assigned agent
          type: 'SYSTEM_ALERT',
          title: 'High Intent Lead Detected',
          message: `Lead ${score.leadId} has reached CRITICAL intent score of ${Math.round(score.score)}.`,
          entityType: 'LEAD',
          entityId: score.leadId,
          metadata: { score: score.score, level: score.level }
        }
      });
    } catch (error) {
      logger.error('Failed to generate intent alert', { error });
    }
  }

  private calculateCategoryScore(signals: IntentSignal[]): number {
    if (signals.length === 0) return 0;
    
    // Recency weighting: signals decay over time
    const now = new Date().getTime();
    const halfLife = 7 * 24 * 60 * 60 * 1000; // 7 days in ms

    const weightedScores = signals.map(s => {
      const age = now - new Date(s.timestamp).getTime();
      const recencyWeight = Math.pow(0.5, age / halfLife);
      return s.score * recencyWeight;
    });

    // Take top 3 most impactful recent signals
    weightedScores.sort((a, b) => b - a);
    const topScores = weightedScores.slice(0, 3);
    const sum = topScores.reduce((acc, score) => acc + score, 0);
    
    // If multiple high-intent signals, cap at 100
    return Math.min(100, sum);
  }

  private determineLevel(score: number): IntentLevel {
    if (score >= 80) return 'CRITICAL';
    if (score >= 60) return 'HIGH';
    if (score >= 40) return 'MEDIUM';
    return 'LOW';
  }

  private calculateTrend(current: number, previous?: number): 'UP' | 'DOWN' | 'STABLE' {
    if (previous === undefined) return 'STABLE';
    if (current > previous + 5) return 'UP';
    if (current < previous - 5) return 'DOWN';
    return 'STABLE';
  }

  private getDefaultScore(leadId: string): IntentScore {
    return {
      id: '',
      leadId,
      score: 0,
      level: 'LOW',
      confidence: 0,
      topSignals: [],
      lastUpdated: new Date().toISOString(),
      trend: 'STABLE'
    };
  }
}
