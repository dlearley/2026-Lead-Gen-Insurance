import { PrismaClient } from '@prisma/client';
import {
  BrokerNetwork,
  BrokerConnection,
  BrokerReferral,
  BrokerTeam,
  CommissionSplit,
  NetworkEffect,
  NetworkMetrics,
  BrokerConnectionRequest,
  CreateBrokerReferralDto,
  UpdateBrokerConnectionDto,
  NetworkValueCalculation,
} from '@insurance/types';

const prisma = new PrismaClient();

/**
 * Broker Network Repository
 * Handles all database operations for broker network features
 */
export class BrokerNetworkRepository {
  /**
   * Get or create broker network profile
   */
  async getOrCreateBrokerProfile(brokerId: string): Promise<BrokerNetwork | null> {
    let profile = await prisma.brokerNetwork.findUnique({
      where: { brokerId },
      include: {
        broker: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            rating: true,
            conversionRate: true,
          },
        },
      },
    });

    if (!profile) {
      profile = await prisma.brokerNetwork.create({
        data: {
          brokerId,
          networkTier: 'BRONZE',
          totalConnections: 0,
          activeConnections: 0,
          networkValue: 0.0,
          networkScore: 0.0,
          referralMultiplier: 1.0,
        },
        include: {
          broker: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              rating: true,
              conversionRate: true,
            },
          },
        },
      });
    }

    return {
      id: profile.id,
      brokerId: profile.brokerId,
      networkTier: profile.networkTier.toLowerCase() as any,
      totalConnections: profile.totalConnections,
      activeConnections: profile.activeConnections,
      networkValue: profile.networkValue,
      networkScore: profile.networkScore,
      referralMultiplier: profile.referralMultiplier,
      createdAt: profile.createdAt,
      updatedAt: profile.updatedAt,
    };
  }

  /**
   * Create a broker connection
   */
  async createConnection(data: BrokerConnectionRequest): Promise<BrokerConnection> {
    const connection = await prisma.brokerConnection.create({
      data: {
        brokerId: data.brokerId,
        connectedBrokerId: data.connectedBrokerId,
        relationshipType: data.relationshipType.toUpperCase() as any,
        strength: 0.5,
        isActive: true,
        referralCount: 0,
        revenueGenerated: 0.0,
      },
    });

    // Update both brokers' network profiles
    await this.updateConnectionCounts(data.brokerId);
    await this.updateConnectionCounts(data.connectedBrokerId);

    return {
      id: connection.id,
      brokerId: connection.brokerId,
      connectedBrokerId: connection.connectedBrokerId,
      relationshipType: connection.relationshipType.toLowerCase() as any,
      strength: connection.strength,
      isActive: connection.isActive,
      referralCount: connection.referralCount,
      revenueGenerated: connection.revenueGenerated,
      lastReferralAt: connection.lastReferralAt,
      createdAt: connection.createdAt,
      updatedAt: connection.updatedAt,
    };
  }

  /**
   * Update broker connection
   */
  async updateConnection(
    id: string,
    data: UpdateBrokerConnectionDto
  ): Promise<BrokerConnection | null> {
    const connection = await prisma.brokerConnection.findUnique({
      where: { id },
    });

    if (!connection) return null;

    const updated = await prisma.brokerConnection.update({
      where: { id },
      data: {
        ...(data.relationshipType && {
          relationshipType: data.relationshipType.toUpperCase() as any,
        }),
        ...(data.strength !== undefined && { strength: data.strength }),
        ...(data.isActive !== undefined && { isActive: data.isActive }),
      },
    });

    // Update network profiles if connection status changed
    if (data.isActive !== undefined) {
      await this.updateConnectionCounts(updated.brokerId);
      await this.updateConnectionCounts(updated.connectedBrokerId);
    }

    return {
      id: updated.id,
      brokerId: updated.brokerId,
      connectedBrokerId: updated.connectedBrokerId,
      relationshipType: updated.relationshipType.toLowerCase() as any,
      strength: updated.strength,
      isActive: updated.isActive,
      referralCount: updated.referralCount,
      revenueGenerated: updated.revenueGenerated,
      lastReferralAt: updated.lastReferralAt,
      createdAt: updated.createdAt,
      updatedAt: updated.updatedAt,
    };
  }

  /**
   * Get broker connections
   */
  async getConnections(
    brokerId: string,
    isActive?: boolean,
    relationshipType?: string
  ): Promise<BrokerConnection[]> {
    const connections = await prisma.brokerConnection.findMany({
      where: {
        brokerId,
        ...(isActive !== undefined && { isActive }),
        ...(relationshipType && {
          relationshipType: relationshipType.toUpperCase() as any,
        }),
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return connections.map((c) => ({
      id: c.id,
      brokerId: c.brokerId,
      connectedBrokerId: c.connectedBrokerId,
      relationshipType: c.relationshipType.toLowerCase() as any,
      strength: c.strength,
      isActive: c.isActive,
      referralCount: c.referralCount,
      revenueGenerated: c.revenueGenerated,
      lastReferralAt: c.lastReferralAt,
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
    }));
  }

  /**
   * Create a broker referral
   */
  async createReferral(
    data: CreateBrokerReferralDto,
    referringBrokerId: string
  ): Promise<BrokerReferral> {
    const referral = await prisma.brokerReferral.create({
      data: {
        leadId: data.leadId,
        referringBrokerId,
        receivingBrokerId: data.receivingBrokerId,
        status: 'PENDING',
        commissionRate: data.commissionRate || 0.15,
        referralReason: data.referralReason,
        notes: data.notes,
        expiresAt: data.expiresAt,
      },
    });

    // Update connection referral count and last referral time
    const connection = await prisma.brokerConnection.findFirst({
      where: {
        brokerId: referringBrokerId,
        connectedBrokerId: data.receivingBrokerId,
        isActive: true,
      },
    });

    if (connection) {
      await prisma.brokerConnection.update({
        where: { id: connection.id },
        data: {
          referralCount: connection.referralCount + 1,
          lastReferralAt: new Date(),
        },
      });
    }

    return {
      id: referral.id,
      leadId: referral.leadId,
      referringBrokerId: referral.referringBrokerId,
      receivingBrokerId: referral.receivingBrokerId,
      status: referral.status.toLowerCase() as any,
      commissionRate: referral.commissionRate,
      commissionAmount: referral.commissionAmount,
      referralReason: referral.referralReason,
      notes: referral.notes,
      expiresAt: referral.expiresAt,
      convertedAt: referral.convertedAt,
      createdAt: referral.createdAt,
      updatedAt: referral.updatedAt,
    };
  }

  /**
   * Update referral status
   */
  async updateReferralStatus(
    id: string,
    status: 'accepted' | 'converted' | 'declined' | 'expired',
    commissionAmount?: number
  ): Promise<BrokerReferral | null> {
    const referral = await prisma.brokerReferral.findUnique({
      where: { id },
    });

    if (!referral) return null;

    const updateData: any = {
      status: status.toUpperCase() as any,
    };

    if (status === 'converted') {
      updateData.convertedAt = new Date();
      updateData.commissionAmount = commissionAmount;
    }

    const updated = await prisma.brokerReferral.update({
      where: { id },
      data: updateData,
    });

    // If converted, update network metrics
    if (status === 'converted' && commissionAmount) {
      await this.recordNetworkEffect(
        referral.referringBrokerId,
        referral.receivingBrokerId,
        'referral_boost',
        commissionAmount,
        `Referral converted: ${referral.leadId}`
      );
    }

    return {
      id: updated.id,
      leadId: updated.leadId,
      referringBrokerId: updated.referringBrokerId,
      receivingBrokerId: updated.receivingBrokerId,
      status: updated.status.toLowerCase() as any,
      commissionRate: updated.commissionRate,
      commissionAmount: updated.commissionAmount,
      referralReason: updated.referralReason,
      notes: updated.notes,
      expiresAt: updated.expiresAt,
      convertedAt: updated.convertedAt,
      createdAt: updated.createdAt,
      updatedAt: updated.updatedAt,
    };
  }

  /**
   * Get network metrics for a broker
   */
  async getNetworkMetrics(
    brokerId: string,
    startDate: Date,
    endDate: Date
  ): Promise<NetworkMetrics | null> {
    const profile = await this.getOrCreateBrokerProfile(brokerId);
    if (!profile) return null;

    const referralsSent = await prisma.brokerReferral.findMany({
      where: {
        referringBrokerId: brokerId,
        createdAt: { gte: startDate, lte: endDate },
      },
    });

    const referralsReceived = await prisma.brokerReferral.findMany({
      where: {
        receivingBrokerId: brokerId,
        createdAt: { gte: startDate, lte: endDate },
      },
    });

    const converted = referralsSent.filter((r) => r.status === 'CONVERTED');

    const totalRevenue = converted.reduce((sum, r) => sum + (r.commissionAmount || 0), 0);

    const conversionRate = referralsSent.length > 0
      ? converted.length / referralsSent.length
      : 0;

    return {
      brokerId,
      networkTier: profile.networkTier,
      totalReferralsSent: referralsSent.length,
      totalReferralsReceived: referralsReceived.length,
      totalConversions: converted.length,
      totalRevenue,
      averageConversionRate: conversionRate,
      networkValue: profile.networkValue,
      networkScore: profile.networkScore,
      referralMultiplier: profile.referralMultiplier,
      activeConnections: profile.activeConnections,
      period: { start: startDate, end: endDate },
    };
  }

  /**
   * Calculate network value for a broker
   */
  async calculateNetworkValue(brokerId: string): Promise<NetworkValueCalculation> {
    const connections = await prisma.brokerConnection.findMany({
      where: { brokerId, isActive: true },
    });

    const directValue = connections.reduce((sum, conn) => sum + conn.revenueGenerated, 0);

    // Calculate indirect value (second and third level connections)
    let secondLevelValue = 0;
    let thirdLevelValue = 0;

    for (const connection of connections) {
      const secondLevel = await prisma.brokerConnection.findMany({
        where: {
          brokerId: connection.connectedBrokerId,
          isActive: true,
        },
      });

      secondLevelValue += secondLevel.reduce((sum, sl) => sum + sl.revenueGenerated * 0.3, 0);

      for (const sl of secondLevel) {
        const thirdLevel = await prisma.brokerConnection.findMany({
          where: {
            brokerId: sl.connectedBrokerId,
            isActive: true,
          },
        });

        thirdLevelValue += thirdLevel.reduce((sum, tl) => sum + tl.revenueGenerated * 0.1, 0);
      }
    }

    const indirectValue = secondLevelValue + thirdLevelValue;
    const totalValue = directValue + indirectValue;
    const connectionCount = connections.length || 1;
    const networkMultiplier = 1 + (connections.length * 0.1) + (secondLevelValue / (directValue || 1)) * 0.05;

    // Update the broker's network profile
    await prisma.brokerNetwork.update({
      where: { brokerId },
      data: {
        networkValue: totalValue,
        referralMultiplier: Math.min(networkMultiplier, 2.0), // Cap at 2.0x
      },
    });

    return {
      directValue,
      indirectValue,
      totalValue,
      networkMultiplier,
      connectionBreakdown: {
        direct: directValue,
        secondLevel: secondLevelValue,
        thirdLevel: thirdLevelValue,
      },
    };
  }

  /**
   * Record a network effect
   */
  async recordNetworkEffect(
    sourceBrokerId: string,
    affectedBrokerId: string,
    effectType: 'referral_boost' | 'knowledge_sharing' | 'resource_sharing' | 'market_expansion',
    value: number,
    description: string,
    metadata?: Record<string, unknown>
  ): Promise<NetworkEffect> {
    const effect = await prisma.networkEffect.create({
      data: {
        sourceBrokerId,
        affectedBrokerId,
        effectType: effectType.toUpperCase() as any,
        value,
        description,
        metadata: metadata as any,
      },
    });

    return {
      id: effect.id,
      sourceBrokerId: effect.sourceBrokerId,
      affectedBrokerId: effect.affectedBrokerId,
      effectType: effect.effectType.toLowerCase() as any,
      value: effect.value,
      description: effect.description,
      timestamp: effect.timestamp,
      metadata: effect.metadata as Record<string, unknown>,
    };
  }

  /**
   * Update connection counts for a broker
   */
  private async updateConnectionCounts(brokerId: string): Promise<void> {
    const [total, active] = await Promise.all([
      prisma.brokerConnection.count({
        where: { brokerId },
      }),
      prisma.brokerConnection.count({
        where: { brokerId, isActive: true },
      }),
    ]);

    await prisma.brokerNetwork.update({
      where: { brokerId },
      data: {
        totalConnections: total,
        activeConnections: active,
      },
    });
  }

  /**
   * Recalculate network score for all brokers
   */
  async recalculateNetworkScores(): Promise<void> {
    const profiles = await prisma.brokerNetwork.findMany();

    for (const profile of profiles) {
      const value = await this.calculateNetworkValue(profile.brokerId);
      const connectionScore = profile.activeConnections * 10;
      const valueScore = value.totalValue / 1000;
      const effectCount = await prisma.networkEffect.count({
        where: { sourceBrokerId: profile.brokerId },
      });

      const networkScore = Math.round(
        (connectionScore * 0.3) + (valueScore * 0.5) + (effectCount * 0.2)
      );

      // Determine network tier based on score
      let networkTier: any = 'BRONZE';
      if (networkScore >= 500) networkTier = 'DIAMOND';
      else if (networkScore >= 300) networkTier = 'PLATINUM';
      else if (networkScore >= 150) networkTier = 'GOLD';
      else if (networkScore >= 75) networkTier = 'SILVER';

      await prisma.brokerNetwork.update({
        where: { brokerId: profile.brokerId },
        data: {
          networkScore,
          networkTier,
        },
      });
    }
  }
}

export const brokerNetworkRepository = new BrokerNetworkRepository();
