import { PrismaClient, VIPTier } from '@prisma/client';
import { prisma } from '../database/prisma.client.js';

export class VIPRepository {
  private prisma: PrismaClient;

  constructor() {
    this.prisma = prisma;
  }

  async getAgentStatus(agentId: string) {
    return this.prisma.agentVIPStatus.findUnique({
      where: { agentId },
      include: {
        agent: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });
  }

  async updateAgentPoints(agentId: string, pointsDelta: number) {
    const currentStatus = await this.prisma.agentVIPStatus.findUnique({
      where: { agentId },
    });

    if (!currentStatus) {
      return this.prisma.agentVIPStatus.create({
        data: {
          agentId,
          points: Math.max(0, pointsDelta),
          tier: this.calculateTier(Math.max(0, pointsDelta)),
        },
      });
    }

    const newPoints = Math.max(0, currentStatus.points + pointsDelta);
    const newTier = this.calculateTier(newPoints);

    return this.prisma.agentVIPStatus.update({
      where: { agentId },
      data: {
        points: newPoints,
        tier: newTier,
      },
    });
  }

  async setAgentTier(agentId: string, tier: VIPTier) {
    return this.prisma.agentVIPStatus.upsert({
      where: { agentId },
      create: {
        agentId,
        tier,
        points: this.getMinPointsForTier(tier),
      },
      update: {
        tier,
      },
    });
  }

  private calculateTier(points: number): VIPTier {
    if (points >= 10000) return VIPTier.DIAMOND;
    if (points >= 5000) return VIPTier.PLATINUM;
    if (points >= 1000) return VIPTier.GOLD;
    return VIPTier.SILVER;
  }

  private getMinPointsForTier(tier: VIPTier): number {
    switch (tier) {
      case VIPTier.DIAMOND: return 10000;
      case VIPTier.PLATINUM: return 5000;
      case VIPTier.GOLD: return 1000;
      case VIPTier.SILVER: return 0;
      default: return 0;
    }
  }

  async getTopAgents(limit: number = 10) {
    return this.prisma.agentVIPStatus.findMany({
      orderBy: {
        points: 'desc',
      },
      take: limit,
      include: {
        agent: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
      },
    });
  }
}

export const vipRepository = new VIPRepository();
