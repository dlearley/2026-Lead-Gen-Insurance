import { PrismaClient, GroupMemberRole } from '@prisma/client';
import { prisma } from '../database/prisma.client.js';

export class CommunityGroupsRepository {
  private prisma: PrismaClient;

  constructor() {
    this.prisma = prisma;
  }

  async createGroup(createdById: string, data: {
    name: string;
    description: string;
    category: string;
    isPrivate?: boolean;
    coverImage?: string;
  }) {
    return this.prisma.communityGroup.create({
      data: {
        ...data,
        createdById,
      },
      include: {
        createdBy: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
        _count: {
          select: {
            members: true,
            posts: true,
          },
        },
      },
    });
  }

  async getGroups(params: {
    category?: string;
    isPrivate?: boolean;
    skip?: number;
    take?: number;
  }) {
    return this.prisma.communityGroup.findMany({
      where: {
        category: params.category,
        isPrivate: params.isPrivate ?? false,
      },
      orderBy: { createdAt: 'desc' },
      skip: params.skip || 0,
      take: params.take || 20,
      include: {
        createdBy: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
        _count: {
          select: {
            members: true,
            posts: true,
          },
        },
      },
    });
  }

  async getGroupById(id: string) {
    return this.prisma.communityGroup.findUnique({
      where: { id },
      include: {
        createdBy: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
        members: {
          include: {
            agent: {
              select: {
                firstName: true,
                lastName: true,
                email: true,
              },
            },
          },
        },
        _count: {
          select: {
            posts: true,
          },
        },
      },
    });
  }

  async joinGroup(groupId: string, agentId: string) {
    return this.prisma.communityGroupMember.create({
      data: {
        groupId,
        agentId,
        role: GroupMemberRole.MEMBER,
      },
    });
  }

  async leaveGroup(groupId: string, agentId: string) {
    const member = await this.prisma.communityGroupMember.findFirst({
      where: {
        groupId,
        agentId,
      },
    });

    if (member) {
      await this.prisma.communityGroupMember.delete({
        where: { id: member.id },
      });
    }

    return { success: true };
  }

  async updateMemberRole(groupId: string, agentId: string, role: GroupMemberRole) {
    const member = await this.prisma.communityGroupMember.findFirst({
      where: {
        groupId,
        agentId,
      },
    });

    if (!member) {
      throw new Error('Member not found');
    }

    return this.prisma.communityGroupMember.update({
      where: { id: member.id },
      data: { role },
    });
  }
}

export const communityGroupsRepository = new CommunityGroupsRepository();
