import { PrismaClient, ConnectionStatus } from '@prisma/client';
import { prisma } from '../database/prisma.client.js';

export class AgentConnectionsRepository {
  private prisma: PrismaClient;

  constructor() {
    this.prisma = prisma;
  }

  async sendConnectionRequest(followerId: string, followingId: string) {
    return this.prisma.agentConnection.create({
      data: {
        followerId,
        followingId,
        status: ConnectionStatus.PENDING,
      },
    });
  }

  async acceptConnection(followerId: string, followingId: string) {
    const connection = await this.prisma.agentConnection.findUnique({
      where: {
        followerId_followingId: {
          followerId,
          followingId,
        },
      },
    });

    if (!connection) {
      throw new Error('Connection request not found');
    }

    return this.prisma.agentConnection.update({
      where: { id: connection.id },
      data: { status: ConnectionStatus.ACCEPTED },
    });
  }

  async removeConnection(followerId: string, followingId: string) {
    const connection = await this.prisma.agentConnection.findUnique({
      where: {
        followerId_followingId: {
          followerId,
          followingId,
        },
      },
    });

    if (connection) {
      await this.prisma.agentConnection.delete({
        where: { id: connection.id },
      });
    }

    return { success: true };
  }

  async getFollowers(agentId: string) {
    return this.prisma.agentConnection.findMany({
      where: {
        followingId: agentId,
        status: ConnectionStatus.ACCEPTED,
      },
      include: {
        follower: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getFollowing(agentId: string) {
    return this.prisma.agentConnection.findMany({
      where: {
        followerId: agentId,
        status: ConnectionStatus.ACCEPTED,
      },
      include: {
        following: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getPendingRequests(agentId: string) {
    return this.prisma.agentConnection.findMany({
      where: {
        followingId: agentId,
        status: ConnectionStatus.PENDING,
      },
      include: {
        follower: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }
}

export const agentConnectionsRepository = new AgentConnectionsRepository();
