import { 
  PriceOptimizationRequest, 
  PriceOptimizationResult, 
  PricingStrategy,
  PricingRule,
  Quote,
  InsuranceType,
  CoverageTier,
  MarginMetrics,
  MarketBenchmark
} from '@repo/types';
import { db } from '../database.js';
import { MarginAnalysisService } from './margin-analysis-service.js';
import { CompetitiveAnalysisService } from './competitive-analysis-service.js';

// Confidence levels for optimization factors
interface OptimizationFactors {
  competitionImpact: number; // 0-10 scale
  demandImpact: number;     // 0-10 scale
  segmentImpact: number;    // 0-10 scale
  riskImpact: number;       // 0-10 scale
}

// Pricing strategy tier multipliers
const TIER_PRICING_MULTIPLIERS = {
  BASIC: 0.85,
  STANDARD: 1.00,
  PREMIUM: 1.25,
  ELITE: 1.60
};

// Competitive positioning multipliers
const POSITIONING_MULTIPLIERS = {
  LEAD: 0.90,      // Below market (compete on price)
  MEET: 1.00,      // Match market (standard pricing)
  OPTIMIZE: 1.15   // Above market (premium pricing)
};

// State-based demand factors (0.9 to 1.2 range)
const DEMAND_FACTORS: Record<string, number> = {
  'CA': 1.20, 'NY': 1.15, 'FL': 1.18, 'TX': 1.10,
  'IL': 1.08, 'PA': 1.05, 'OH': 1.02, 'GA': 1.04,
  'NC': 1.03, 'MI': 1.06, 'NJ': 1.12, 'VA': 1.07,
  'WA': 1.09, 'AZ': 1.11, 'MA': 1.13, 'TN': 1.04,
  'IN': 1.03, 'MO': 1.05, 'MD': 1.08, 'WI': 1.01,
  'CO': 1.06, 'MN': 1.02, 'SC': 1.04, 'AL': 1.05,
  'LA': 1.14, 'KY': 1.03, 'OR': 1.07, 'OK': 1.06,
  'CT': 1.10, 'UT': 1.05, 'IA': 0.98, 'NV': 1.06,
  'AR': 1.04, 'MS': 1.05, 'KS': 1.02, 'NM': 1.05,
  'NE': 0.99, 'WV': 0.97, 'ID': 0.96, 'HI': 1.11,
  'NH': 1.03, 'ME': 1.01, 'MT': 0.95, 'RI': 1.05,
  'DE': 1.03, 'SD': 0.94, 'ND': 0.93, 'AK': 1.12,
  'VT': 0.98, 'WY': 0.92, 'DEFAULT': 1.00
};

// Customer segment value multipliers
const SEGMENT_MULTIPLIERS = {
  'low_risk': 0.95,
  'standard': 1.00,
  'high_value': 1.10,
  'premium': 1.20
};

/**
 * Pricing Optimization Service
 * Provides intelligent pricing recommendations using AI-driven algorithms
 * to maximize margins while maintaining market competitiveness
 */
export class PricingOptimizationService {
  private marginAnalysisService: MarginAnalysisService;
  private competitiveAnalysisService: CompetitiveAnalysisService;
  
  constructor() {
    this.marginAnalysisService = new MarginAnalysisService();
    this.competitiveAnalysisService = new CompetitiveAnalysisService();
  }
  
  /**
   * Optimize pricing for maximum margin within constraints
   */
  async optimizePrice(request: PriceOptimizationRequest): Promise<PriceOptimizationResult> {
    const { quoteId, constraints, factors } = request;
    
    // Retrieve quote and current market data
    const quote = await this.getQuoteDetails(quoteId);
    const marginAnalysis = await this.marginAnalysisService.analyzeQuoteMargin(quote);
    const marketAnalysis = await this.competitiveAnalysisService.getCompetitiveAnalysis(
      quote.insuranceType,
      quote.coverageTier,
      { state: 'CA' } // TODO: Get actual location from quote
    );
    
    // Calculate optimization factors
    const optFactors = await this.calculateOptimizationFactors(
      quote,
      marginAnalysis,
      marketAnalysis,
      factors
    );
    
    // Determine optimal price using multi-factor model
    const optimalPrice = this.calculateOptimalPrice(
      quote,
      constraints,
      marginAnalysis,
      marketAnalysis,
      optFactors
    );
    
    // Calculate expected outcomes
    const expectedMargin = this.calculateExpectedMargin(optimalPrice, marginAnalysis);
    const expectedConversion = this.calculateExpectedConversion(
      optimalPrice,
      marketAnalysis,
      optFactors
    );
    
    // Assess risks
    const risks = this.assessPricingRisks(
      optimalPrice,
      constraints,
      marginAnalysis,
      marketAnalysis
    );
    
    return {
      currentPrice: quote.premium.total,
      optimizedPrice: Math.round(optimalPrice),
      expectedMargin: Math.round(expectedMargin * 10) / 10,
      expectedConversionRate: Math.round(expectedConversion * 1000) / 10,
      confidence: this.calculateOptimizationConfidence(optFactors, risks),
      factors: {
        competitionImpact: optFactors.competitionImpact,
        demandImpact: optFactors.demandImpact,
        segmentImpact: optFactors.segmentImpact
      },
      risks
    };
  }
  
  /**
   * Calculate optimization factors based on market and internal data
   */
  private async calculateOptimizationFactors(
    quote: Quote,
    marginAnalysis: any,
    marketAnalysis: any,
    factorFlags: PriceOptimizationRequest['factors']
  ): Promise<OptimizationFactors> {
    const factors: OptimizationFactors = {
      competitionImpact: 5.0,
      demandImpact: 5.0,
      segmentImpact: 5.0,
      riskImpact: 5.0
    };
    
    // Competition analysis (0-10 scale)
    if (factorFlags.considerCompetition) {
      const priceRange = marketAnalysis.priceRange.max - marketAnalysis.priceRange.min;
      const marketSpread = priceRange / marketAnalysis.marketAverage;
      
      // High spread = more competition influence
      factors.competitionImpact = Math.min(10, Math.max(0, marketSpread * 20));
      
      // Adjust for market position
      const ourPosition = marketAnalysis.ourPosition || 'AT_MARKET';
      if (ourPosition === 'BELOW_MARKET') {
        factors.competitionImpact *= 1.2; // Already competing on price
      } else if (ourPosition === 'SIGNIFICANTLY_ABOVE') {
        factors.competitionImpact *= 0.8; // Premium positioning
      }
    }
    
    // Demand analysis based on location
    if (factorFlags.considerDemand) {
      const locationFactor = DEMAND_FACTORS[quote.lead?.address?.state || 'DEFAULT'] || 1.0;
      factors.demandImpact = Math.min(10, (locationFactor - 0.9) * 50); // Scale to 0-10
    }
    
    // Customer segment analysis
    if (factorFlags.considerCustomerSegment) {
      const tierMultiplier = TIER_PRICING_MULTIPLIERS[quote.coverageTier] || 1.0;
      factors.segmentImpact = Math.min(10, (tierMultiplier - 0.8) * 25); // Scale to 0-10
    }
    
    // Risk analysis from margin factors
    const riskFactors = marginAnalysis.factors || [];
    const riskImpact = riskFactors.reduce((acc, factor) => {
      return acc + Math.abs(factor.impact) / 10; // Convert percentage to 0-10 scale
    }, 0) / Math.max(riskFactors.length, 1);
    
    factors.riskImpact = Math.min(10, riskImpact);
    
    return factors;
  }
  
  /**
   * Calculate optimal price using multi-factor optimization model
   */
  private calculateOptimalPrice(
    quote: Quote,
    constraints: PriceOptimizationRequest['constraints'],
    marginAnalysis: any,
    marketAnalysis: any,
    factors: OptimizationFactors
  ): number {
    const currentPrice = quote.premium.total;
    const targetPrice = marginAnalysis.targetPremium || currentPrice;
    const marketAverage = marketAnalysis.marketAverage || targetPrice;
    
    // Base calculation: weighted average of target and market price
    const marginWeight = constraints.minMargin / 100; // Higher target margin = more weight on our target
    const baseOptimized = (targetPrice * marginWeight) + (marketAverage * (1 - marginWeight));
    
    // Apply competitive positioning
    const positioningMultiplier = POSITIONING_MULTIPLIERS[constraints.competitiveness || 'MEET'] || 1.0;
    let positionedPrice = baseOptimized * positioningMultiplier;
    
    // Adjust for demand factors
    const demandFactor = (factors.demandImpact / 10) * 0.3 + 1.0; // 0-30% adjustment
    positionedPrice *= demandFactor;
    
    // Apply customer segment premium
    const segmentFactor = (factors.segmentImpact / 10) * 0.2 + 1.0; // 0-20% adjustment
    positionedPrice *= segmentFactor;
    
    // Adjust for risk factors (increase price for higher risk)
    const riskFactor = (factors.riskImpact / 10) * 0.15 + 1.0; // 0-15% adjustment
    positionedPrice *= riskFactor;
    
    // Ensure we meet minimum margin constraint
    const minPriceForMargin = targetPrice * (constraints.minMargin / marginAnalysis.targetMargin);
    const maxPrice = constraints.maxPremium || positionedPrice * 1.5;
    
    // Constrain to bounds
    const finalPrice = Math.min(Math.max(positionedPrice, minPriceForMargin), maxPrice);
    
    return finalPrice;
  }
  
  /**
   * Calculate expected margin at optimized price
   */
  private calculateExpectedMargin(optimizedPrice: number, marginAnalysis: any): number {
    const currentMargin = marginAnalysis.margin;
    const targetMargin = marginAnalysis.targetMargin || currentMargin + 3; // Default improvement
    
    // Price elasticity model: higher price generally means higher margin
    const currentPrice = marginAnalysis.calculatedPremium;
    const priceChange = (optimizedPrice - currentPrice) / currentPrice;
    
    // Margin improvement from price increase (with diminishing returns)
    const marginImprovement = priceChange * 0.8; // 80% of price increase becomes margin
    
    const expectedMargin = currentMargin + (marginImprovement * 100);
    
    // Constrain to reasonable bounds
    return Math.min(expectedMargin, targetMargin + 5); // Don't exceed target by too much
  }
  
  /**
   * Calculate expected conversion rate at optimized price
   */
  private calculateExpectedConversion(
    optimizedPrice: number,
    marketAnalysis: any,
    factors: OptimizationFactors
  ): number {
    const marketAverage = marketAnalysis.marketAverage || optimizedPrice;
    const priceRatio = optimizedPrice / marketAverage;
    
    // Base conversion rate (industry average)
    const baseConversion = 0.25; // 25% base
    
    // Price impact on conversion (inverse relationship)
    let priceImpact = 1.0;
    if (priceRatio <= 0.95) {
      priceImpact = 1.2; // Below market = higher conversion
    } else if (priceRatio >= 1.15) {
      priceImpact = 0.8; // Above market = lower conversion
    } else {
      // Linear interpolation for near-market prices
      priceImpact = 1.0 - ((priceRatio - 1.0) * 0.8);
    }
    
    // Adjust for demand factors
    const demandMultiplier = (factors.demandImpact / 10) * 0.3 + 1.0;
    
    // Adjust for segment factors (premium segments have lower conversion but higher value)
    const segmentMultiplier = (factors.segmentImpact / 10) * 0.2 + 0.9;
    
    const expectedConversion = baseConversion * priceImpact * demandMultiplier * segmentMultiplier;
    
    // Constrain to realistic bounds (5% to 60%)
    return Math.max(0.05, Math.min(0.60, expectedConversion));
  }
  
  /**
   * Assess pricing risks
   */
  private assessPricingRisks(
    optimizedPrice: number,
    constraints: PriceOptimizationRequest['constraints'],
    marginAnalysis: any,
    marketAnalysis: any
  ): string[] {
    const risks: string[] = [];
    const priceIncrease = (optimizedPrice / marginAnalysis.calculatedPremium) - 1;
    const marketAverage = marketAnalysis.marketAverage || optimizedPrice;
    const priceVsMarket = (optimizedPrice / marketAverage) - 1;
    
    // Significant price increase risk
    if (priceIncrease > 0.15) {
      risks.push(`Large price increase (${Math.round(priceIncrease * 100)}%) may impact competitiveness`);
    }
    
    // Above market risk
    if (priceVsMarket > 0.25) {
      risks.push(`Price significantly above market average (${Math.round(priceVsMarket * 100)}%) may reduce conversion`);
    }
    
    // Margin target risk
    const expectedMargin = (optimizedPrice - marginAnalysis.costBreakdown.acquisitionCost - 
                           marginAnalysis.costBreakdown.operationalCost - 
                           marginAnalysis.costBreakdown.riskCost - 
                           marginAnalysis.costBreakdown.overhead) / optimizedPrice * 100;
    
    if (expectedMargin < constraints.minMargin) {
      risks.push(`Expected margin (${Math.round(expectedMargin)}%) below minimum constraint (${constraints.minMargin}%)`);
    }
    
    // Competitive threat risk
    if (marketAnalysis.ourPosition === 'ABOVE_MARKET' || marketAnalysis.ourPosition === 'SIGNIFICANTLY_ABOVE') {
      const competitorThreat = marketAnalysis.competitorPrices
        .filter(p => p.premium < optimizedPrice * 0.90)
        .length;
      
      if (competitorThreat > marketAnalysis.competitorPrices.length * 0.5) {
        risks.push(`${competitorThreat} competitors priced significantly below recommended price`);
      }
    }
    
    // Market volatility risk (if available)
    if (marketAnalysis.trends && marketAnalysis.trends.length > 2) {
      const recentTrend = marketAnalysis.trends.slice(-3);
      const avgChange = recentTrend.reduce((sum, t) => sum + Math.abs(t.priceChange || 0), 0) / recentTrend.length;
      
      if (avgChange > 5) { // >5% average change
        risks.push(`High market volatility detected (${Math.round(avgChange)}% average price change)`);
      }
    }
    
    return risks;
  }
  
  /**
   * Calculate overall optimization confidence (0-100)
   */
  private calculateOptimizationConfidence(
    factors: OptimizationFactors,
    risks: string[]
  ): number {
    // Base confidence from factor completeness
    const hasCompetitionData = factors.competitionImpact > 0;
    const hasDemandData = factors.demandImpact > 0;
    const hasSegmentData = factors.segmentImpact > 0;
    const hasRiskData = factors.riskImpact > 0;
    
    const dataCompleteness = (hasCompetitionData ? 25 : 0) + 
                            (hasDemandData ? 25 : 0) + 
                            (hasSegmentData ? 25 : 0) + 
                            (hasRiskData ? 25 : 0);
    
    // Factor quality score (higher quality data = higher confidence)
    const avgFactorQuality = (factors.competitionImpact + factors.demandImpact + 
                             factors.segmentImpact + factors.riskImpact) / 4;
    const factorQualityScore = Math.min(100, avgFactorQuality * 10);
    
    // Risk penalty
    const riskPenalty = Math.min(40, risks.length * 15); // Each risk reduces confidence
    
    // Combined confidence
    const confidence = (dataCompleteness * 0.3 + factorQualityScore * 0.7) - riskPenalty;
    
    return Math.max(10, Math.min(95, Math.round(confidence)));
  }
  
  /**
   * Get quote details (stub - would integrate with quote system)
   */
  private async getQuoteDetails(quoteId: string): Promise<Quote> {
    // TODO: Integrate with actual quote system
    const quote = await db.quote.findUnique({
      where: { id: quoteId },
      include: {
        lead: true
      }
    });
    
    if (!quote) {
      throw new Error(`Quote ${quoteId} not found`);
    }
    
    return {
      id: quote.id,
      leadId: quote.leadId,
      agentId: quote.agentId,
      insuranceType: quote.insuranceType,
      coverageTier: quote.coverageTier,
      status: quote.status,
      coverage: quote.coverage,
      premium: quote.premium,
      version: quote.version,
      expiresAt: quote.expiresAt,
      createdAt: quote.createdAt,
      updatedAt: quote.updatedAt
    };
  }
  
  /**
   * Create a new pricing strategy
   */
  async createPricingStrategy(data: Partial<PricingStrategy>): Promise<PricingStrategy> {
    const strategy: PricingStrategy = {
      id: `strategy-${Date.now()}`,
      name: data.name || 'New Strategy',
      description: data.description,
      insuranceType: data.insuranceType || 'AUTO',
      isActive: data.isActive !== false,
      rules: data.rules || [],
      marginTarget: data.marginTarget || 15,
      minMargin: data.minMargin || 10,
      maxMargin: data.maxMargin || 25,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    await db.pricingStrategy.create({
      data: {
        id: strategy.id,
        name: strategy.name,
        description: strategy.description,
        insuranceType: strategy.insuranceType,
        isActive: strategy.isActive,
        rules: strategy.rules,
        marginTarget: strategy.marginTarget,
        minMargin: strategy.minMargin,
        maxMargin: strategy.maxMargin
      }
    });
    
    return strategy;
  }
  
  /**
   * Get pricing strategy recommendations
   */
  async getStrategyRecommendations(
    insuranceType: InsuranceType,
    targetMargin: number
  ): Promise<Array<{
    strategy: string;
    expectedMargin: number;
    expectedConversion: number;
    confidence: number;
    riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  }>> {
    const strategies = await db.pricingStrategy.findMany({
      where: {
        insuranceType,
        isActive: true
      }
    });
    
    return strategies.map(strategy => {
      // Simulate strategy performance based on rules and historical data
      const ruleEffectiveness = strategy.rules.length > 0 ? 
        Math.min(1.0, strategy.rules.length * 0.15) : 0.5;
      
      const marginDelta = Math.abs(strategy.marginTarget - targetMargin) / targetMargin;
      const alignmentScore = Math.max(0.5, 1.0 - marginDelta);
      
      const expectedMargin = strategy.marginTarget * ruleEffectiveness * alignmentScore;
      const expectedConversion = 0.25 * (2.0 - (expectedMargin / 100)); // Inverse relationship
      
      return {
        strategy: strategy.name,
        expectedMargin: Math.round(expectedMargin * 10) / 10,
        expectedConversion: Math.round(expectedConversion * 1000) / 10,
        confidence: Math.round(ruleEffectiveness * alignmentScore * 100),
        riskLevel: expectedMargin > 20 ? 'HIGH' : expectedMargin > 15 ? 'MEDIUM' : 'LOW'
      };
    }).sort((a, b) => b.confidence - a.confidence);
  }
}