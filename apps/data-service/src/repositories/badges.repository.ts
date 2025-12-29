import { PrismaClient, BadgeType } from '@prisma/client';
import { prisma } from '../database/prisma.client.js';

export class BadgesRepository {
  private prisma: PrismaClient;

  constructor() {
    this.prisma = prisma;
  }

  async awardBadge(agentId: string, badgeType: BadgeType, metadata?: any) {
    return this.prisma.agentBadge.create({
      data: {
        agentId,
        badgeType,
        metadata,
      },
    });
  }

  async getAgentBadges(agentId: string) {
    return this.prisma.agentBadge.findMany({
      where: { agentId },
      orderBy: { earnedAt: 'desc' },
    });
  }

  async hasBadge(agentId: string, badgeType: BadgeType): Promise<boolean> {
    const badge = await this.prisma.agentBadge.findUnique({
      where: {
        agentId_badgeType: {
          agentId,
          badgeType,
        },
      },
    });

    return badge !== null;
  }

  async getAllBadgeTypes() {
    return Object.values(BadgeType);
  }

  async getBadgeLeaders(badgeType?: BadgeType) {
    const agents = await this.prisma.agent.findMany({
      include: {
        badges: {
          where: badgeType ? { badgeType } : undefined,
        },
      },
      take: 10,
    });

    return agents
      .map(agent => ({
        agentId: agent.id,
        firstName: agent.firstName,
        lastName: agent.lastName,
        badgeCount: agent.badges.length,
      }))
      .sort((a, b) => b.badgeCount - a.badgeCount);
  }
}

export const badgesRepository = new BadgesRepository();
