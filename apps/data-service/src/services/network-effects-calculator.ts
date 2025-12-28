import { brokerNetworkRepository } from './broker-network-repository';
import type {
  NetworkEffect,
  NetworkLeaderboardEntry,
  NetworkGrowthMetric,
  BrokerConnection,
} from '@insurance/types';

/**
 * Network Effects Calculator
 * Calculates network effects, multipliers, and growth metrics
 */
export class NetworkEffectsCalculator {
  /**
   * Calculate referral multiplier based on network size and performance
   */
  async calculateReferralMultiplier(brokerId: string): Promise<number> {
    const profile = await brokerNetworkRepository.getOrCreateBrokerProfile(brokerId);
    if (!profile) return 1.0;

    const connectionBonus = Math.min(profile.activeConnections * 0.02, 0.3); // Max 30% bonus
    const tierBonus = this.getTierMultiplier(profile.networkTier);
    const baseMultiplier = 1.0;

    const totalMultiplier = baseMultiplier + connectionBonus + tierBonus;

    return Math.min(totalMultiplier, 2.0); // Cap at 2.0x
  }

  /**
   * Get tier multiplier based on network tier
   */
  private getTierMultiplier(tier: string): number {
    const tierMultipliers: Record<string, number> = {
      bronze: 0.0,
      silver: 0.05,
      gold: 0.10,
      platinum: 0.15,
      diamond: 0.20,
    };
    return tierMultipliers[tier] || 0.0;
  }

  /**
   * Calculate network score
   */
  async calculateNetworkScore(brokerId: string): Promise<number> {
    const profile = await brokerNetworkRepository.getOrCreateBrokerProfile(brokerId);
    if (!profile) return 0;

    const networkValue = await brokerNetworkRepository.calculateNetworkValue(brokerId);

    const connectionScore = profile.activeConnections * 10;
    const valueScore = networkValue.totalValue / 1000;
    const referralScore = profile.activeConnections * profile.referralMultiplier * 5;

    const totalScore = Math.round(
      (connectionScore * 0.3) + (valueScore * 0.4) + (referralScore * 0.3)
    );

    return totalScore;
  }

  /**
   * Calculate network reach (total reachable brokers through network)
   */
  async calculateNetworkReach(brokerId: string, maxDepth = 3): Promise<number> {
    const visited = new Set<string>();
    const queue: Array<{ brokerId: string; depth: number }> = [{ brokerId, depth: 0 }];
    let totalReach = 0;

    visited.add(brokerId);

    while (queue.length > 0) {
      const { brokerId: currentBrokerId, depth } = queue.shift()!;

      if (depth >= maxDepth) continue;

      const connections = await brokerNetworkRepository.getConnections(currentBrokerId, true);
      
      for (const conn of connections) {
        if (!visited.has(conn.connectedBrokerId)) {
          visited.add(conn.connectedBrokerId);
          totalReach++;
          queue.push({ brokerId: conn.connectedBrokerId, depth: depth + 1 });
        }
      }
    }

    return totalReach;
  }

  /**
   * Calculate network growth metrics
   */
  async calculateGrowthMetrics(
    brokerId: string,
    period: 'week' | 'month' | 'quarter'
  ): Promise<NetworkGrowthMetric> {
    const now = new Date();
    const startDate = this.getStartDateForPeriod(now, period);

    const profile = await brokerNetworkRepository.getOrCreateBrokerProfile(brokerId);
    if (!profile) {
      throw new Error('Profile not found');
    }

    const connections = await brokerNetworkRepository.getConnections(brokerId);
    const newConnections = connections.filter(
      (c) => c.createdAt >= startDate
    ).length;

    // Calculate current network score
    const currentScore = await this.calculateNetworkScore(brokerId);

    // Calculate previous score (from same period in past)
    const previousStartDate = new Date(startDate);
    previousStartDate.setDate(previousStartDate.getDate() - this.getDaysInPeriod(period));
    
    const previousScore = await this.calculateNetworkScore(brokerId);
    
    const networkScoreChange = currentScore - previousScore;

    return {
      brokerId,
      period: period,
      newConnections,
      lostConnections: 0, // Would need historical data
      netGrowth: newConnections,
      totalReferrals: profile.activeConnections * 2, // Estimation
      totalConversions: Math.round(profile.activeConnections * 1.5), // Estimation
      revenueGrowth: profile.networkValue * 0.1, // 10% growth estimation
      networkScoreChange,
    };
  }

  /**
   * Generate network leaderboard
   */
  async generateLeaderboard(limit = 20): Promise<NetworkLeaderboardEntry[]> {
    // This would normally query from a cached/metrics table
    // For now, we'll calculate on the fly
    const allProfiles = await Promise.all(
      Array.from({ length: Math.min(limit, 50) }, async (_, i) => {
        // Mock broker IDs - in real implementation, query all brokers
        const brokerId = `broker-${i + 1}`;
        const profile = await brokerNetworkRepository.getOrCreateBrokerProfile(brokerId);
        const networkScore = await this.calculateNetworkScore(brokerId);

        return {
          rank: 0, // Will be set after sorting
          brokerId: profile?.brokerId || brokerId,
          brokerName: `Agent ${i + 1}`,
          networkTier: profile?.networkTier || 'bronze',
          networkScore,
          totalConnections: profile?.totalConnections || 0,
          totalReferrals: profile?.activeConnections || 0,
          totalConversions: Math.round((profile?.activeConnections || 0) * 0.7),
          totalRevenue: profile?.networkValue || 0,
          referralMultiplier: profile?.referralMultiplier || 1.0,
        };
      })
    );

    // Sort by network score descending
    allProfiles.sort((a, b) => b.networkScore - a.networkScore);

    // Assign ranks
    return allProfiles.slice(0, limit).map((entry, index) => ({
      ...entry,
      rank: index + 1,
    }));
  }

  /**
   * Analyze network effectiveness
   */
  async analyzeNetworkEffectiveness(brokerId: string): Promise<{
    score: number;
    metrics: {
      connectionQuality: number;
      referralEfficiency: number;
      networkLeverage: number;
      growthRate: number;
    };
    recommendations: string[];
  }> {
    const profile = await brokerNetworkRepository.getOrCreateBrokerProfile(brokerId);
    if (!profile) {
      throw new Error('Profile not found');
    }

    const connections = await brokerNetworkRepository.getConnections(brokerId, true);
    const networkReach = await this.calculateNetworkReach(brokerId);
    const networkValue = await brokerNetworkRepository.calculateNetworkValue(brokerId);

    // Calculate individual metrics
    const connectionQuality =
      connections.length > 0
        ? connections.reduce((sum, c) => sum + c.strength, 0) / connections.length
        : 0;

    const referralEfficiency =
      connections.length > 0
        ? connections.filter((c) => c.referralCount > 0).length / connections.length
        : 0;

    const networkLeverage = networkReach / (connections.length || 1);

    const growthRate = networkValue.totalValue > 0
      ? (networkValue.indirectValue / networkValue.directValue)
      : 0;

    // Calculate overall score
    const score = Math.round(
      (connectionQuality * 100 * 0.25) +
      (referralEfficiency * 100 * 0.35) +
      (Math.min(networkLeverage, 10) * 10 * 0.25) +
      (Math.min(growthRate, 1) * 100 * 0.15)
    );

    // Generate recommendations
    const recommendations: string[] = [];

    if (connectionQuality < 0.5) {
      recommendations.push('Strengthen weak connections by engaging more frequently');
    }

    if (referralEfficiency < 0.3) {
      recommendations.push('Increase referral activity with your network connections');
    }

    if (networkLeverage < 2) {
      recommendations.push('Expand your network to leverage second and third level connections');
    }

    if (growthRate < 0.1) {
      recommendations.push('Focus on activities that drive network growth and value creation');
    }

    if (connections.length < 10) {
      recommendations.push('Add more connections to your network to increase reach');
    }

    return {
      score,
      metrics: {
        connectionQuality: Math.round(connectionQuality * 100) / 100,
        referralEfficiency: Math.round(referralEfficiency * 100) / 100,
        networkLeverage: Math.round(networkLeverage * 100) / 100,
        growthRate: Math.round(growthRate * 100) / 100,
      },
      recommendations,
    };
  }

  /**
   * Predict network growth
   */
  async predictNetworkGrowth(brokerId: string, months = 6): Promise<{
    projectedScore: number;
    projectedConnections: number;
    projectedRevenue: number;
    confidence: number;
  }> {
    const profile = await brokerNetworkRepository.getOrCreateBrokerProfile(brokerId);
    if (!profile) {
      throw new Error('Profile not found');
    }

    const growthMetrics = await this.calculateGrowthMetrics(brokerId, 'month');
    const currentScore = await this.calculateNetworkScore(brokerId);

    // Growth rate factors
    const connectionGrowthRate = 1.05; // 5% monthly growth
    const revenueGrowthRate = 1.08; // 8% monthly growth
    const scoreGrowthRate = 1.06; // 6% monthly growth

    const projectedConnections = Math.round(
      profile.activeConnections * Math.pow(connectionGrowthRate, months)
    );
    const projectedRevenue = profile.networkValue * Math.pow(revenueGrowthRate, months);
    const projectedScore = Math.round(
      currentScore * Math.pow(scoreGrowthRate, months)
    );

    // Confidence decreases with time
    const confidence = Math.max(0.5, 1 - (months * 0.08));

    return {
      projectedScore,
      projectedConnections,
      projectedRevenue,
      confidence: Math.round(confidence * 100) / 100,
    };
  }

  /**
   * Get start date for a period
   */
  private getStartDateForPeriod(date: Date, period: 'week' | 'month' | 'quarter'): Date {
    const startDate = new Date(date);
    
    switch (period) {
      case 'week':
        startDate.setDate(startDate.getDate() - 7);
        break;
      case 'month':
        startDate.setMonth(startDate.getMonth() - 1);
        break;
      case 'quarter':
        startDate.setMonth(startDate.getMonth() - 3);
        break;
    }

    return startDate;
  }

  /**
   * Get days in period
   */
  private getDaysInPeriod(period: 'week' | 'month' | 'quarter'): number {
    switch (period) {
      case 'week':
        return 7;
      case 'month':
        return 30;
      case 'quarter':
        return 90;
    }
  }
}

export const networkEffectsCalculator = new NetworkEffectsCalculator();
