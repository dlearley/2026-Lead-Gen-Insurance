import { 
  CompetitivePrice, 
  CompetitiveAnalysis, 
  MarketBenchmark,
  InsuranceType,
  CoverageTier
} from '@repo/types';
import { db } from '../database.js';

// Market position relative to competitors
export type MarketPosition = 'BELOW_MARKET' | 'AT_MARKET' | 'ABOVE_MARKET' | 'SIGNIFICANTLY_ABOVE';

// Quality score benchmarks (0-10 scale)
const COMPETITOR_QUALITY_SCORES: Record<string, number> = {
  'Progressive': 8.5,
  'State Farm': 8.8,
  'Geico': 8.2,
  'Allstate': 8.3,
  'Nationwide': 8.1,
  'Liberty Mutual': 8.0,
  'Farmers': 7.9,
  'USAA': 9.2,
  'Travelers': 7.8,
  'American Family': 7.7,
  'Others': 7.5
};

// Default market shares (estimated)
const DEFAULT_MARKET_SHARES: Record<string, number> = {
  'Progressive': 14.5,
  'State Farm': 16.2,
  'Geico': 13.8,
  'Allstate': 9.2,
  'Nationwide': 4.1,
  'Liberty Mutual': 5.3,
  'Farmers': 4.9,
  'USAA': 6.1,
  'Travelers': 4.6,
  'American Family': 2.8,
  'Others': 18.5
};

// State risk multipliers (for pricing variations)
const STATE_RISK_MULTIPLIERS: Record<string, number> = {
  'CA': 1.25, // High cost state
  'NY': 1.20,
  'FL': 1.35, // High risk (weather, fraud)
  'TX': 1.15,
  'LA': 1.28,
  'MI': 1.18,
  'IL': 1.12,
  'PA': 1.08,
  'OH': 1.05,
  'GA': 1.09,
  'NC': 1.04,
  'VA': 1.07,
  'WA': 1.11,
  'AZ': 1.13,
  'CO': 1.06,
  'MN': 1.03,
  'WI': 1.02,
  'MO': 1.08,
  'TN': 1.05,
  'MA': 1.16,
  'MD': 1.09,
  'IN': 1.04,
  'SC': 1.06,
  'AL': 1.07,
  'KY': 1.03,
  'OK': 1.14,
  'CT': 1.14,
  'UT': 1.02,
  'IA': 0.98,
  'NV': 1.12,
  'AR': 1.04,
  'MS': 1.06,
  'KS': 1.01,
  'NM': 1.08,
  'NE': 0.99,
  'WV': 0.97,
  'ID': 0.96,
  'HI': 1.19,
  'NH': 1.05,
  'ME': 1.01,
  'MT': 0.95,
  'RI': 1.10,
  'DE': 1.07,
  'SD': 0.94,
  'ND': 0.93,
  'AK': 1.22,
  'VT': 0.98,
  'WY': 0.92,
  'DEFAULT': 1.00
};

/**
 * Competitive Analysis Service
 * Provides market intelligence and competitive pricing analysis
 */
export class CompetitiveAnalysisService {
  
  /**
   * Add competitor price data
   */
  async addCompetitorPrice(data: Omit<CompetitivePrice, 'id' | 'createdAt'>): Promise<CompetitivePrice> {
    const price: CompetitivePrice = {
      id: `comp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      ...data,
      qualityScore: this.getCompetitorQualityScore(data.competitor),
      createdAt: new Date()
    };
    
    await db.competitivePrice.create({
      data: {
        id: price.id,
        competitor: price.competitor,
        insuranceType: price.insuranceType,
        coverageTier: price.coverageTier || 'STANDARD',
        premium: price.premium,
        coverage: price.coverage,
        location: price.location,
        dateCollected: price.dateCollected,
        marketShare: price.marketShare,
        qualityScore: price.qualityScore,
        notes: price.notes
      }
    });
    
    return price;
  }
  
  /**
   * Get competitive analysis for a specific insurance type and location
   */
  async getCompetitiveAnalysis(
    insuranceType: InsuranceType,
    coverageTier: CoverageTier = 'STANDARD',
    location: { state: string; region?: string }
  ): Promise<CompetitiveAnalysis> {
    
    // Get recent competitive prices (within last 90 days)
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
    
    const competitivePrices = await db.competitivePrice.findMany({
      where: {
        insuranceType,
        coverageTier,
        OR: [
          {
            location: {
              path: ['state'],
              equals: location.state
            }
          },
          {
            location: {
              path: ['region'],
              equals: location.region || location.state
            }
          }
        ],
        dateCollected: {
          gte: ninetyDaysAgo
        }
      },
      orderBy: {
        dateCollected: 'desc'
      }
    });
    
    // Generate synthetic data if real data is limited
    const prices = competitivePrices.length < 5 
      ? this.generateSyntheticCompetitivePrices(insuranceType, coverageTier, location)
      : competitivePrices;
    
    const analysis = this.calculateMarketAnalysis(prices, location);
    
    return {
      insuranceType,
      coverageTier,
      location,
      competitorPrices: prices,
      marketAverage: analysis.average,
      marketMedian: analysis.median,
      priceRange: {
        min: analysis.min,
        max: analysis.max
      },
      percentile: {
        25: analysis.percentile25,
        50: analysis.percentile50,
        75: analysis.percentile75,
        90: analysis.percentile90
      },
      ourPosition: this.determineMarketPosition(0, analysis), // Our position placeholder
      recommendations: this.generateCompetitiveRecommendations(analysis, insuranceType, coverageTier)
    };
  }
  
  /**
   * Generate synthetic competitive prices when real data is limited
   */
  private generateSyntheticCompetitivePrices(
    insuranceType: InsuranceType,
    coverageTier: CoverageTier,
    location: { state: string; region?: string }
  ): CompetitivePrice[] {
    const basePremiums: Record<InsuranceType, number> = {
      AUTO: 1200,
      HOME: 1400,
      LIFE: 800,
      HEALTH: 2500,
      COMMERCIAL: 3200
    };
    
    const basePremium = basePremiums[insuranceType] || 1200;
    const stateMultiplier = STATE_RISK_MULTIPLIERS[location.state] || 1.0;
    const tierMultiplier = {
      BASIC: 0.8,
      STANDARD: 1.0,
      PREMIUM: 1.3,
      ELITE: 1.7
    }[coverageTier] || 1.0;
    
    const marketAverage = basePremium * stateMultiplier * tierMultiplier;
    const competitors = Object.keys(COMPETITOR_QUALITY_SCORES);
    
    return competitors.map(competitor => {
      // Add realistic variation (±15% around market average)
      const variation = (Math.random() - 0.5) * 0.3;
      const qualityAdjustment = (COMPETITOR_QUALITY_SCORES[competitor] - 8.0) * 50; // ±$50 per quality point
      
      const premium = Math.round(marketAverage * (1 + variation) + qualityAdjustment);
      
      return {
        id: `synth-${competitor}-${Date.now()}`,
        competitor,
        insuranceType,
        coverageTier,
        premium: Math.max(premium, 100), // Minimum $100
        coverage: this.generateSyntheticCoverage(insuranceType, coverageTier),
        location,
        dateCollected: new Date(),
        marketShare: DEFAULT_MARKET_SHARES[competitor],
        qualityScore: COMPETITOR_QUALITY_SCORES[competitor],
        notes: 'Synthetic data for demonstration',
        createdAt: new Date()
      };
    });
  }
  
  /**
   * Generate synthetic coverage details
   */
  private generateSyntheticCoverage(insuranceType: InsuranceType, coverageTier: CoverageTier): Record<string, any> {
    const coverageTemplates: Record<InsuranceType, Record<string, any>> = {
      AUTO: {
        liability: { limit: coverageTier === 'BASIC' ? 25000 : coverageTier === 'STANDARD' ? 50000 : coverageTier === 'PREMIUM' ? 100000 : 250000, deductible: 0 },
        collision: { limit: 25000, deductible: coverageTier === 'BASIC' ? 1000 : coverageTier === 'STANDARD' ? 500 : coverageTier === 'PREMIUM' ? 250 : 100 },
        comprehensive: { limit: 25000, deductible: coverageTier === 'BASIC' ? 1000 : coverageTier === 'STANDARD' ? 500 : coverageTier === 'PREMIUM' ? 250 : 100 }
      },
      HOME: {
        dwelling: { limit: coverageTier === 'BASIC' ? 150000 : coverageTier === 'STANDARD' ? 250000 : coverageTier === 'PREMIUM' ? 400000 : 600000, deductible: coverageTier === 'BASIC' ? 2500 : coverageTier === 'STANDARD' ? 1500 : coverageTier === 'PREMIUM' ? 1000 : 500 },
        personalProperty: { limit: coverageTier === 'BASIC' ? 75000 : coverageTier === 'STANDARD' ? 125000 : coverageTier === 'PREMIUM' ? 200000 : 300000, deductible: coverageTier === 'BASIC' ? 2500 : coverageTier === 'STANDARD' ? 1500 : coverageTier === 'PREMIUM' ? 1000 : 500 },
        liability: { limit: coverageTier === 'BASIC' ? 100000 : coverageTier === 'STANDARD' ? 300000 : coverageTier === 'PREMIUM' ? 500000 : 1000000, deductible: 0 }
      },
      LIFE: {
        term: { limit: coverageTier === 'BASIC' ? 100000 : coverageTier === 'STANDARD' ? 250000 : coverageTier === 'PREMIUM' ? 500000 : 1000000, deductible: 0 }
      },
      HEALTH: {
        medical: { limit: coverageTier === 'BASIC' ? 500000 : coverageTier === 'STANDARD' ? 1000000 : coverageTier === 'PREMIUM' ? 2000000 : 5000000, deductible: coverageTier === 'BASIC' ? 7500 : coverageTier === 'STANDARD' ? 5000 : coverageTier === 'PREMIUM' ? 2500 : 1000 },
        prescription: { limit: 50000, deductible: coverageTier === 'BASIC' ? 500 : coverageTier === 'STANDARD' ? 250 : coverageTier === 'PREMIUM' ? 100 : 50 }
      },
      COMMERCIAL: {
        generalLiability: { limit: coverageTier === 'BASIC' ? 500000 : coverageTier === 'STANDARD' ? 1000000 : coverageTier === 'PREMIUM' ? 2000000 : 5000000, deductible: coverageTier === 'BASIC' ? 5000 : coverageTier === 'STANDARD' ? 2500 : coverageTier === 'PREMIUM' ? 1000 : 500 },
        property: { limit: coverageTier === 'BASIC' ? 250000 : coverageTier === 'STANDARD' ? 500000 : coverageTier === 'PREMIUM' ? 1000000 : 2000000, deductible: coverageTier === 'BASIC' ? 5000 : coverageTier === 'STANDARD' ? 2500 : coverageTier === 'PREMIUM' ? 1000 : 500 }
      }
    };
    
    return coverageTemplates[insuranceType] || {};
  }
  
  /**
   * Calculate market statistics from competitive prices
   */
  private calculateMarketAnalysis(prices: CompetitivePrice[], location: { state: string }) {
    const premiums = prices.map(p => p.premium).sort((a, b) => a - b);
    const n = premiums.length;
    
    const sum = premiums.reduce((a, b) => a + b, 0);
    const average = sum / n;
    const median = n % 2 === 0 
      ? (premiums[n/2 - 1] + premiums[n/2]) / 2
      : premiums[Math.floor(n/2)];
    
    const min = premiums[0];
    const max = premiums[n - 1];
    
    // Calculate percentiles
    const percentile25 = premiums[Math.floor(n * 0.25)];
    const percentile50 = median;
    const percentile75 = premiums[Math.floor(n * 0.75)];
    const percentile90 = premiums[Math.floor(n * 0.90)];
    
    return {
      average: Math.round(average),
      median: Math.round(median),
      min,
      max,
      percentile25,
      percentile50,
      percentile75,
      percentile90
    };
  }
  
  /**
   * Determine market position relative to competitors
   */
  private determineMarketPosition(ourPrice: number, analysis: {
    average: number;
    percentile25: number;
    percentile75: number;
  }): MarketPosition {
    if (ourPrice === 0) return 'AT_MARKET'; // Unknown
    
    const ratioToAvg = ourPrice / analysis.average;
    
    if (ratioToAvg < 0.85) return 'BELOW_MARKET';
    if (ratioToAvg <= 1.15) return 'AT_MARKET';
    if (ratioToAvg <= 1.25) return 'ABOVE_MARKET';
    return 'SIGNIFICANTLY_ABOVE';
  }
  
  /**
   * Generate competitive positioning recommendations
   */
  private generateCompetitiveRecommendations(
    analysis: {
      average: number;
      percentile25: number;
      percentile75: number;
      percentile90: number;
    },
    insuranceType: InsuranceType,
    coverageTier: CoverageTier
  ): string[] {
    const recommendations = [];
    
    // Price positioning strategy
    const targetPercentile = coverageTier === 'BASIC' ? 25 : 
                            coverageTier === 'STANDARD' ? 50 : 
                            coverageTier === 'PREMIUM' ? 75 : 90;
    
    const targetPrice = targetPercentile === 25 ? analysis.percentile25 :
                       targetPercentile === 50 ? analysis.average :
                       targetPercentile === 75 ? analysis.percentile75 : analysis.percentile90;
    
    recommendations.push(
      `${coverageTier} tier should target ${targetPercentile}th percentile pricing ` +
      `(${this.formatCurrency(targetPrice)}) for ${insuranceType} insurance`
    );
    
    // Competitive gap analysis
    const premiumRange = analysis.percentile90 - analysis.percentile25;
    if (premiumRange > analysis.average * 0.3) {
      recommendations.push(
        `Wide price range (${this.formatCurrency(premiumRange)}) indicates market ` +
        `segmentation opportunities - consider tiered pricing strategies`
      );
    }
    
    // Market concentration
    const priceConcentration = (analysis.percentile75 - analysis.percentile25) / analysis.average;
    if (priceConcentration < 0.15) {
      recommendations.push(
        'Narrow price range suggests intense competition - focus on differentiation ' +
        'and value-added services'
      );
    }
    
    // Value positioning
    if (coverageTier === 'PREMIUM' || coverageTier === 'ELITE') {
      recommendations.push(
        'Premium tier pricing can exceed market average when offering superior ' +
        'coverage and service quality'
      );
    }
    
    return recommendations;
  }
  
  /**
   * Get market benchmark for pricing
   */
  async getMarketBenchmark(
    insuranceType: InsuranceType,
    coverageTier: CoverageTier,
    location: { state: string; region?: string }
  ): Promise<MarketBenchmark> {
    const competitiveAnalysis = await this.getCompetitiveAnalysis(
      insuranceType, 
      coverageTier, 
      location
    );
    
    // Placeholder for actual price - would come from quote/pricing system
    const ourPrice = 0;
    
    return {
      insuranceType,
      coverageTier,
      location,
      pricePoints: {
        ourPrice,
        marketLow: competitiveAnalysis.priceRange.min,
        marketAverage: competitiveAnalysis.marketAverage,
        marketHigh: competitiveAnalysis.priceRange.max,
        percentile25: competitiveAnalysis.percentile[25],
        percentile75: competitiveAnalysis.percentile[75]
      },
      positioning: {
        percentageFromMarketAverage: ourPrice > 0 ? 
          ((ourPrice - competitiveAnalysis.marketAverage) / competitiveAnalysis.marketAverage) * 100 : 0,
        rank: this.calculateMarketRank(ourPrice, competitiveAnalysis),
        totalCompetitors: competitiveAnalysis.competitorPrices.length
      },
      recommendations: competitiveAnalysis.recommendations
    };
  }
  
  /**
   * Calculate market rank based on price position
   */
  private calculateMarketRank(ourPrice: number, analysis: CompetitiveAnalysis): number {
    if (ourPrice === 0) return Math.floor(analysis.competitorPrices.length / 2);
    
    const sortedPrices = [...analysis.competitorPrices]
      .map(p => p.premium)
      .sort((a, b) => a - b);
    
    const rank = sortedPrices.filter(price => price < ourPrice).length + 1;
    return Math.min(rank, sortedPrices.length);
  }
  
  /**
   * Get competitor quality score
   */
  private getCompetitorQualityScore(competitor: string): number {
    return COMPETITOR_QUALITY_SCORES[competitor] || 7.5;
  }
  
  /**
   * Format currency for display
   */
  private formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  }
  
  /**
   * Get pricing trend analysis
   */
  async getPricingTrends(
    insuranceType: InsuranceType,
    timeRange: { start: Date; end: Date }
  ): Promise<Array<{
    date: string;
    averagePrice: number;
    priceChange: number;
    volume: number;
  }>> {
    const prices = await db.competitivePrice.findMany({
      where: {
        insuranceType,
        dateCollected: {
          gte: timeRange.start,
          lte: timeRange.end
        }
      },
      orderBy: {
        dateCollected: 'asc'
      }
    });
    
    // Group by month for trend analysis
    const monthlyData: Record<string, number[]> = {};
    prices.forEach(price => {
      const monthKey = price.dateCollected.toISOString().substring(0, 7); // YYYY-MM
      if (!monthlyData[monthKey]) {
        monthlyData[monthKey] = [];
      }
      monthlyData[monthKey].push(price.premium);
    });
    
    const months = Object.keys(monthlyData).sort();
    let previousAverage = 0;
    
    return months.map((month, index) => {
      const prices = monthlyData[month];
      const averagePrice = prices.reduce((a, b) => a + b, 0) / prices.length;
      const priceChange = index === 0 ? 0 : 
        ((averagePrice - previousAverage) / previousAverage) * 100;
      
      previousAverage = averagePrice;
      
      return {
        date: month,
        averagePrice: Math.round(averagePrice),
        priceChange: Math.round(priceChange * 10) / 10,
        volume: prices.length
      };
    });
  }
}