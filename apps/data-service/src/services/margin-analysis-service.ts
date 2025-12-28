import { 
  Quote, 
  MarginAnalysis, 
  MarginFactor, 
  MarginRecommendation, 
  CostBreakdown,
  InsuranceType,
  CoverageTier
} from '@repo/types';
import { db } from '../database.js';

// Standard cost ratios by insurance type (industry benchmarks)
const COST_BENCHMARKS = {
  AUTO: {
    acquisition: 0.15,
    operational: 0.12,
    risk: 0.55,
    overhead: 0.08,
    targetMargin: 0.10
  },
  HOME: {
    acquisition: 0.12,
    operational: 0.10,
    risk: 0.58,
    overhead: 0.08,
    targetMargin: 0.12
  },
  LIFE: {
    acquisition: 0.18,
    operational: 0.08,
    risk: 0.48,
    overhead: 0.06,
    targetMargin: 0.20
  },
  HEALTH: {
    acquisition: 0.14,
    operational: 0.11,
    risk: 0.56,
    overhead: 0.07,
    targetMargin: 0.12
  },
  COMMERCIAL: {
    acquisition: 0.16,
    operational: 0.13,
    risk: 0.47,
    overhead: 0.09,
    targetMargin: 0.15
  }
};

// Risk adjustments by coverage tier
const TIER_RISK_MULTIPLIERS = {
  BASIC: 0.90,
  STANDARD: 1.00,
  PREMIUM: 1.15,
  ELITE: 1.30
};

// Location-based risk factors (simplified by state)
const LOCATION_RISK_FACTORS: Record<string, number> = {
  'CA': 1.15, // California - high cost
  'NY': 1.12, // New York - high cost
  'FL': 1.18, // Florida - high risk
  'TX': 1.05, // Texas - moderate
  'IL': 1.08, // Illinois - moderate-high
  'PA': 1.02, // Pennsylvania - moderate
  'OH': 0.98, // Ohio - moderate-low
  'GA': 1.03, // Georgia - moderate
  'NC': 0.99, // North Carolina - moderate
  'MI': 1.07, // Michigan - moderate-high
  'DEFAULT': 1.00
};

/**
 * Margin Analysis Service
 * Provides sophisticated margin calculation and optimization for insurance quotes
 */
export class MarginAnalysisService {
  
  /**
   * Analyze margin for a quote and generate recommendations
   */
  async analyzeQuoteMargin(quote: Quote): Promise<MarginAnalysis> {
    const baseAnalysis = this.calculateBaseMargin(quote);
    const factors = this.identifyMarginFactors(quote);
    const recommendations = this.generateMarginRecommendations(quote, baseAnalysis, factors);
    
    const marginAnalysis: MarginAnalysis = {
      id: `margin-${quote.id}-${Date.now()}`,
      quoteId: quote.id,
      calculatedPremium: quote.premium.total,
      targetPremium: this.calculateTargetPremium(quote),
      costBreakdown: baseAnalysis.costBreakdown,
      margin: baseAnalysis.margin,
      targetMargin: baseAnalysis.targetMargin,
      factors,
      recommendations,
      createdAt: new Date()
    };
    
    // Save analysis to database
    await this.saveMarginAnalysis(marginAnalysis);
    
    return marginAnalysis;
  }
  
  /**
   * Calculate base margin and cost breakdown for a quote
   */
  private calculateBaseMargin(quote: Quote): {
    margin: number;
    targetMargin: number;
    costBreakdown: CostBreakdown;
  } {
    const benchmarks = COST_BENCHMARKS[quote.insuranceType] || COST_BENCHMARKS.AUTO;
    const totalPremium = quote.premium.total;
    
    // Calculate actual costs based on premium
    const costBreakdown: CostBreakdown = {
      acquisitionCost: totalPremium * benchmarks.acquisition,
      operationalCost: totalPremium * benchmarks.operational,
      riskCost: totalPremium * benchmarks.risk,
      overhead: totalPremium * benchmarks.overhead,
      profit: totalPremium * benchmarks.targetMargin
    };
    
    // Adjust for coverage tier
    const tierMultiplier = TIER_RISK_MULTIPLIERS[quote.coverageTier] || 1.0;
    costBreakdown.riskCost *= tierMultiplier;
    
    // Calculate actual margin (as percentage of premium)
    const totalCosts = costBreakdown.acquisitionCost + 
                      costBreakdown.operationalCost + 
                      costBreakdown.riskCost + 
                      costBreakdown.overhead;
    
    const actualProfit = totalPremium - totalCosts;
    const margin = (actualProfit / totalPremium) * 100;
    
    return {
      margin: Math.round(margin * 100) / 100, // Round to 2 decimal places
      targetMargin: Math.round(benchmarks.targetMargin * 100 * 100) / 100,
      costBreakdown
    };
  }
  
  /**
   * Calculate target premium based on desired margins
   */
  private calculateTargetPremium(quote: Quote): number {
    const benchmarks = COST_BENCHMARKS[quote.insuranceType] || COST_BENCHMARKS.AUTO;
    const currentTotal = quote.premium.total;
    
    // Estimate costs
    const tierMultiplier = TIER_RISK_MULTIPLIERS[quote.coverageTier] || 1.0;
    const estimatedRiskCost = currentTotal * benchmarks.risk * tierMultiplier;
    const estimatedAcquisitionCost = currentTotal * benchmarks.acquisition;
    const estimatedOperationalCost = currentTotal * benchmarks.operational;
    const estimatedOverhead = currentTotal * benchmarks.overhead;
    
    const totalCosts = estimatedAcquisitionCost + estimatedOperationalCost + 
                      estimatedRiskCost + estimatedOverhead;
    
    // Calculate required premium for target margin
    const targetProfit = (benchmarks.targetMargin * 100) / (1 - benchmarks.targetMargin);
    const targetPremium = totalCosts * (1 + targetProfit / 100);
    
    return Math.round(targetPremium * 100) / 100;
  }
  
  /**
   * Identify factors affecting margin
   */
  private identifyMarginFactors(quote: Quote): MarginFactor[] {
    const factors: MarginFactor[] = [];
    const benchmarks = COST_BENCHMARKS[quote.insuranceType] || COST_BENCHMARKS.AUTO;
    const currentAnalysis = this.calculateBaseMargin(quote);
    
    // Risk factor analysis
    const riskImpact = ((TIER_RISK_MULTIPLIERS[quote.coverageTier] || 1.0) - 1.0) * benchmarks.risk * 100;
    if (Math.abs(riskImpact) > 1) {
      factors.push({
        type: 'RISK_FACTOR',
        impact: Math.round(riskImpact * 10) / 10,
        description: `Coverage tier (${quote.coverageTier}) affects risk costs`,
        modifiable: false
      });
    }
    
    // Premium adequacy
    const premiumDifference = ((quote.premium.total - currentAnalysis.targetPremium) / currentAnalysis.targetPremium) * 100;
    if (Math.abs(premiumDifference) > 5) {
      factors.push({
        type: 'CUSTOMER_SEGMENT',
        impact: Math.round(premiumDifference * 10) / 10,
        description: premiumDifference > 0 ? 'Premium above target' : 'Premium below target',
        modifiable: true
      });
    }
    
    // Margin performance
    const marginGap = currentAnalysis.margin - currentAnalysis.targetMargin;
    if (marginGap < -2) {
      factors.push({
        type: 'LOCATION',
        impact: Math.round(marginGap * 10) / 10,
        description: 'Margin below target - potential pricing opportunity',
        modifiable: true
      });
    }
    
    // Coverage amount analysis
    const coverageModifiers = this.analyzeCoverageModifiers(quote);
    factors.push(...coverageModifiers);
    
    return factors;
  }
  
  /**
   * Analyze coverage details for margin factors
   */
  private analyzeCoverageModifiers(quote: Quote): MarginFactor[] {
    const factors: MarginFactor[] = [];
    const coverageValues = Object.values(quote.coverage || {});
    
    let totalCoverage = 0;
    let totalPremium = 0;
    
    coverageValues.forEach(coverage => {
      if (coverage.limit && typeof coverage.limit === 'number') {
        totalCoverage += coverage.limit;
      }
      if (coverage.premium && typeof coverage.premium === 'number') {
        totalPremium += coverage.premium;
      }
    });
    
    // High coverage analysis
    if (totalCoverage > 500000) { // High coverage threshold
      factors.push({
        type: 'COVERAGE_AMOUNT',
        impact: -2.0, // Typically lower margin on high coverage
        description: 'High coverage limits may compress margins',
        modifiable: true
      });
    }
    
    return factors;
  }
  
  /**
   * Generate margin improvement recommendations
   */
  private generateMarginRecommendations(
    quote: Quote, 
    analysis: { margin: number; targetMargin: number },
    factors: MarginFactor[]
  ): MarginRecommendation[] {
    const recommendations: MarginRecommendation[] = [];
    const marginGap = analysis.targetMargin - analysis.margin;
    
    // Price adjustment recommendations
    if (marginGap > 2) {
      const targetPrice = this.calculateTargetPremium(quote);
      const priceIncreaseNeeded = ((targetPrice - quote.premium.total) / quote.premium.total) * 100;
      
      recommendations.push({
        type: 'INCREASE_PRICE',
        impact: Math.round(marginGap * 10) / 10,
        confidence: 0.85,
        reason: `Margin is ${Math.round(marginGap * 10) / 10}% below target`,
        actionItems: [
          `Consider increasing premium by ${Math.round(priceIncreaseNeeded * 10) / 10}%`,
          `Review coverage tiers and risk factors`,
          `Analyze competitive positioning for this segment`
        ]
      });
    }
    
    // Cost optimization recommendations
    if (analysis.margin < analysis.targetMargin * 0.8) {
      recommendations.push({
        type: 'REDUCE_COST',
        impact: Math.round(marginGap * 0.5 * 10) / 10,
        confidence: 0.70,
        reason: 'Cost structure suggests optimization opportunities',
        actionItems: [
          'Review acquisition costs and channel efficiency',
          'Optimize operational processes',
          'Negotiate better rates with reinsurers'
        ]
      });
    }
    
    // Coverage adjustment recommendations
    const highCoverageFactor = factors.find(f => f.type === 'COVERAGE_AMOUNT');
    if (highCoverageFactor) {
      recommendations.push({
        type: 'ADJUST_COVERAGE',
        impact: 1.5,
        confidence: 0.75,
        reason: 'High coverage limits creating margin pressure',
        actionItems: [
          'Consider tiered coverage limits',
          'Implement coverage-specific pricing adjustments',
          'Review attachment points and retentions'
        ]
      });
    }
    
    // Risk optimization recommendations
    const riskImprovementFactors = this.identifyRiskOptimizationOpportunities(quote);
    if (riskImprovementFactors.length > 0) {
      recommendations.push({
        type: 'OPTIMIZE_RISK',
        impact: 2.0,
        confidence: 0.65,
        reason: 'Risk factors identified for optimization',
        actionItems: [
          'Implement risk-based pricing adjustments',
          'Enhanced underwriting criteria',
          'Loss control and prevention programs'
        ]
      });
    }
    
    return recommendations;
  }
  
  /**
   * Identify risk optimization opportunities
   */
  private identifyRiskOptimizationOpportunities(quote: Quote): Array<string> {
    const opportunities: string[] = [];
    
    // Check for risk factors that could be optimized
    const coverageDetails = quote.coverage || {};
    
    Object.entries(coverageDetails).forEach(([key, coverage]) => {
      // High deductible opportunities
      if (coverage.deductible && coverage.deductible < 500) {
        opportunities.push(`Low deductible on ${key} may increase risk costs`);
      }
      
      // Excessive coverage
      if (coverage.limit && coverage.limit > 1000000) {
        opportunities.push(`High limit on ${key} may not be cost-effective`);
      }
    });
    
    return opportunities;
  }
  
  /**
   * Save margin analysis to database
   */
  private async saveMarginAnalysis(analysis: MarginAnalysis): Promise<void> {
    try {
      await db.marginAnalysis.create({
        data: {
          id: analysis.id,
          quoteId: analysis.quoteId,
          calculatedPremium: analysis.calculatedPremium,
          targetPremium: analysis.targetPremium,
          costBreakdown: analysis.costBreakdown,
          margin: analysis.margin,
          targetMargin: analysis.targetMargin,
          factors: analysis.factors,
          recommendations: analysis.recommendations
        }
      });
    } catch (error) {
      console.error('Error saving margin analysis:', error);
      // Don't throw - this is a background operation
    }
  }
  
  /**
   * Get margin analysis history for a quote
   */
  async getQuoteMarginHistory(quoteId: string): Promise<MarginAnalysis[]> {
    try {
      const analyses = await db.marginAnalysis.findMany({
        where: { quoteId },
        orderBy: { createdAt: 'desc' }
      });
      
      return analyses.map(record => ({
        id: record.id,
        quoteId: record.quoteId,
        calculatedPremium: record.calculatedPremium,
        targetPremium: record.targetPremium || undefined,
        costBreakdown: record.costBreakdown as CostBreakdown,
        margin: record.margin,
        targetMargin: record.targetMargin || undefined,
        factors: record.factors as MarginFactor[],
        recommendations: record.recommendations as MarginRecommendation[],
        createdAt: record.createdAt
      }));
    } catch (error) {
      console.error('Error fetching margin analysis history:', error);
      return [];
    }
  }
  
  /**
   * Find margin improvement opportunities across all quotes
   */
  async findMarginOpportunities(filters?: {
    insuranceType?: InsuranceType;
    minPotential?: number;
    agentId?: string;
  }): Promise<Array<{
    quoteId: string;
    currentMargin: number;
    potentialMargin: number;
    improvement: number;
    revenueImpact: number;
    priority: 'HIGH' | 'MEDIUM' | 'LOW';
  }>> {
    try {
      // Get recent quote analyses
      const analyses = await db.marginAnalysis.findMany({
        where: {
          ...(filters?.insuranceType && {
            quote: {
              insuranceType: filters.insuranceType
            }
          }),
          ...(filters?.agentId && {
            quote: {
              agentId: filters.agentId
            }
          })
        },
        include: {
          quote: true
        },
        orderBy: {
          createdAt: 'desc'
        },
        take: 1000 // Limit for performance
      });
      
      const opportunities = analyses
        .filter(analysis => {
          const improvement = analysis.targetMargin ? analysis.targetMargin - analysis.margin : 0;
          const minPotential = filters?.minPotential || 2.0;
          return improvement >= minPotential;
        })
        .map(analysis => {
          const improvement = analysis.targetMargin ? analysis.targetMargin - analysis.margin : 0;
          const quote = analysis.quote;
          
          return {
            quoteId: analysis.quoteId,
            currentMargin: analysis.margin,
            potentialMargin: analysis.targetMargin || analysis.margin + improvement,
            improvement: Math.round(improvement * 10) / 10,
            revenueImpact: Math.round(quote.premium.total * (improvement / 100) * 10) / 10,
            priority: improvement >= 5 ? 'HIGH' : improvement >= 3 ? 'MEDIUM' : 'LOW'
          };
        });
      
      return opportunities.sort((a, b) => b.improvement - a.improvement);
    } catch (error) {
      console.error('Error finding margin opportunities:', error);
      return [];
    }
  }
  
  /**
   * Get margin benchmarks by insurance type
   */
  getMarginBenchmarks(insuranceType: InsuranceType): {
    targetMargin: number;
    minAcceptable: number;
    costStructure: CostBreakdown;
  } {
    const benchmarks = COST_BENCHMARKS[insuranceType] || COST_BENCHMARKS.AUTO;
    
    return {
      targetMargin: Math.round(benchmarks.targetMargin * 100),
      minAcceptable: Math.round(benchmarks.targetMargin * 0.7 * 100),
      costStructure: {
        acquisitionCost: Math.round(benchmarks.acquisition * 100),
        operationalCost: Math.round(benchmarks.operational * 100),
        riskCost: Math.round(benchmarks.risk * 100),
        overhead: Math.round(benchmarks.overhead * 100),
        profit: Math.round(benchmarks.targetMargin * 100)
      }
    };
  }
}