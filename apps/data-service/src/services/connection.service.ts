import { PrismaClient, ConnectionStatus } from '@prisma/client';
import { prisma } from '../prisma/client.js';
import { logger } from '@insurance-lead-gen/core';

export class ConnectionService {
  private prisma: PrismaClient;

  constructor() {
    this.prisma = prisma;
  }

  async createConnection(requesterId: string, addresseeId: string) {
    if (requesterId === addresseeId) {
      throw new Error('Cannot connect to yourself');
    }

    const existing = await this.prisma.connection.findFirst({
      where: {
        OR: [
          { requesterId, addresseeId },
          { requesterId: addresseeId, addresseeId: requesterId },
        ],
      },
    });

    if (existing) {
      throw new Error('Connection request already exists');
    }

    return this.prisma.connection.create({
      data: {
        requesterId,
        addresseeId,
        status: ConnectionStatus.PENDING,
      },
    });
  }

  async getConnection(connectionId: string) {
    return this.prisma.connection.findUnique({
      where: { id: connectionId },
    });
  }

  async updateConnectionStatus(connectionId: string, status: ConnectionStatus) {
    return this.prisma.connection.update({
      where: { id: connectionId },
      data: { status },
    });
  }

  async getConnectionsByAgent(agentId: string, status?: ConnectionStatus) {
    const where: any = {
      OR: [
        { requesterId: agentId },
        { addresseeId: agentId },
      ],
    };

    if (status) {
      where.status = status;
    }

    return this.prisma.connection.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
  }

  async deleteConnection(connectionId: string) {
    return this.prisma.connection.delete({
      where: { id: connectionId },
    });
  }

  async followAgent(followerId: string, followingId: string) {
    if (followerId === followingId) {
      throw new Error('Cannot follow yourself');
    }

    const existing = await this.prisma.agentFollow.findUnique({
      where: {
        followerId_followingId: {
          followerId,
          followingId,
        },
      },
    });

    if (existing) {
      throw new Error('Already following this agent');
    }

    return this.prisma.agentFollow.create({
      data: {
        followerId,
        followingId,
      },
    });
  }

  async unfollowAgent(followerId: string, followingId: string) {
    return this.prisma.agentFollow.deleteMany({
      where: {
        followerId,
        followingId,
      },
    });
  }

  async getFollowers(agentId: string) {
    return this.prisma.agentFollow.findMany({
      where: { followingId: agentId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getFollowing(agentId: string) {
    return this.prisma.agentFollow.findMany({
      where: { followerId: agentId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async isFollowing(followerId: string, followingId: string): Promise<boolean> {
    const follow = await this.prisma.agentFollow.findUnique({
      where: {
        followerId_followingId: {
          followerId,
          followingId,
        },
      },
    });
    return !!follow;
  }

  async getConnectionStats(agentId: string) {
    const connections = await this.getConnectionsByAgent(agentId, ConnectionStatus.ACCEPTED);
    const followers = await this.getFollowers(agentId);
    const following = await this.getFollowing(agentId);

    return {
      totalConnections: connections.length,
      totalFollowers: followers.length,
      totalFollowing: following.length,
    };
  }

  async getSuggestedConnections(agentId: string, limit: number = 10) {
    const connections = await this.getConnectionsByAgent(agentId, ConnectionStatus.ACCEPTED);
    const connectedIds = connections.map(c =>
      c.requesterId === agentId ? c.addresseeId : c.requesterId
    );

    const mutualConnections = await this.prisma.$queryRaw<any[]>`
      SELECT 
        CASE 
          WHEN "requesterId" = ANY(${connectedIds}::uuid[]) THEN "addresseeId"
          WHEN "addresseeId" = ANY(${connectedIds}::uuid[]) THEN "requesterId"
        END as "agentId",
        COUNT(*) as "mutualCount"
      FROM "Connection"
      WHERE status = 'ACCEPTED'
        AND (
          ("requesterId" = ANY(${connectedIds}::uuid[]) AND "addresseeId" != ${agentId})
          OR ("addresseeId" = ANY(${connectedIds}::uuid[]) AND "requesterId" != ${agentId})
        )
        AND "agentId" NOT IN (
          SELECT "addresseeId" FROM "Connection" WHERE "requesterId" = ${agentId}
          UNION
          SELECT "requesterId" FROM "Connection" WHERE "addresseeId" = ${agentId}
        )
      GROUP BY "agentId"
      ORDER BY "mutualCount" DESC
      LIMIT ${limit}
    `;

    return mutualConnections;
  }
}

export const connectionService = new ConnectionService();
