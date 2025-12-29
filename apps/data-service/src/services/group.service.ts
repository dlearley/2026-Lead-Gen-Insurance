import { PrismaClient, GroupType, GroupMemberRole, MembershipStatus } from '@prisma/client';
import { prisma } from '../prisma/client.js';

export class GroupService {
  private prisma: PrismaClient;

  constructor() {
    this.prisma = prisma;
  }

  async createGroup(createdBy: string, data: {
    name: string;
    description: string;
    type: GroupType;
    category?: string;
    region?: string;
    specialty?: string;
    coverImage?: string;
  }) {
    const group = await this.prisma.communityGroup.create({
      data: {
        ...data,
        createdBy,
        memberCount: 1,
      },
    });

    await this.prisma.groupMembership.create({
      data: {
        groupId: group.id,
        agentId: createdBy,
        role: GroupMemberRole.OWNER,
        status: MembershipStatus.ACTIVE,
      },
    });

    return group;
  }

  async updateGroup(groupId: string, data: {
    name?: string;
    description?: string;
    type?: GroupType;
    category?: string;
    region?: string;
    specialty?: string;
    coverImage?: string;
  }) {
    return this.prisma.communityGroup.update({
      where: { id: groupId },
      data,
    });
  }

  async getGroup(groupId: string) {
    return this.prisma.communityGroup.findUnique({
      where: { id: groupId },
      include: {
        memberships: {
          where: { status: MembershipStatus.ACTIVE },
          take: 10,
        },
      },
    });
  }

  async listGroups(filters?: {
    type?: GroupType;
    category?: string;
    region?: string;
    specialty?: string;
  }) {
    const where: any = {};

    if (filters?.type) {
      where.type = filters.type;
    }

    if (filters?.category) {
      where.category = filters.category;
    }

    if (filters?.region) {
      where.region = filters.region;
    }

    if (filters?.specialty) {
      where.specialty = filters.specialty;
    }

    return this.prisma.communityGroup.findMany({
      where,
      orderBy: [
        { memberCount: 'desc' },
        { createdAt: 'desc' },
      ],
    });
  }

  async deleteGroup(groupId: string) {
    return this.prisma.communityGroup.delete({
      where: { id: groupId },
    });
  }

  async joinGroup(groupId: string, agentId: string) {
    const group = await this.prisma.communityGroup.findUnique({
      where: { id: groupId },
    });

    if (!group) {
      throw new Error('Group not found');
    }

    if (group.type === GroupType.PRIVATE || group.type === GroupType.SECRET) {
      return this.prisma.groupMembership.create({
        data: {
          groupId,
          agentId,
          role: GroupMemberRole.MEMBER,
          status: MembershipStatus.PENDING,
        },
      });
    }

    const membership = await this.prisma.groupMembership.create({
      data: {
        groupId,
        agentId,
        role: GroupMemberRole.MEMBER,
        status: MembershipStatus.ACTIVE,
      },
    });

    await this.prisma.communityGroup.update({
      where: { id: groupId },
      data: { memberCount: { increment: 1 } },
    });

    return membership;
  }

  async leaveGroup(groupId: string, agentId: string) {
    const membership = await this.prisma.groupMembership.findFirst({
      where: { groupId, agentId },
    });

    if (!membership) {
      throw new Error('Membership not found');
    }

    if (membership.role === GroupMemberRole.OWNER) {
      throw new Error('Owner cannot leave the group. Transfer ownership or delete the group.');
    }

    await this.prisma.groupMembership.delete({
      where: { id: membership.id },
    });

    if (membership.status === MembershipStatus.ACTIVE) {
      await this.prisma.communityGroup.update({
        where: { id: groupId },
        data: { memberCount: { decrement: 1 } },
      });
    }
  }

  async updateMembership(membershipId: string, data: {
    role?: GroupMemberRole;
    status?: MembershipStatus;
  }) {
    const membership = await this.prisma.groupMembership.findUnique({
      where: { id: membershipId },
    });

    if (!membership) {
      throw new Error('Membership not found');
    }

    const wasActive = membership.status === MembershipStatus.ACTIVE;
    const updated = await this.prisma.groupMembership.update({
      where: { id: membershipId },
      data,
    });

    const isNowActive = updated.status === MembershipStatus.ACTIVE;

    if (!wasActive && isNowActive) {
      await this.prisma.communityGroup.update({
        where: { id: membership.groupId },
        data: { memberCount: { increment: 1 } },
      });
    } else if (wasActive && !isNowActive) {
      await this.prisma.communityGroup.update({
        where: { id: membership.groupId },
        data: { memberCount: { decrement: 1 } },
      });
    }

    return updated;
  }

  async getGroupMembers(groupId: string, status?: MembershipStatus) {
    const where: any = { groupId };
    if (status) {
      where.status = status;
    }

    return this.prisma.groupMembership.findMany({
      where,
      orderBy: [
        { role: 'asc' },
        { joinedAt: 'asc' },
      ],
    });
  }

  async getAgentGroups(agentId: string, status?: MembershipStatus) {
    const where: any = { agentId };
    if (status) {
      where.status = status;
    }

    return this.prisma.groupMembership.findMany({
      where,
      include: {
        group: true,
      },
      orderBy: { joinedAt: 'desc' },
    });
  }

  async isGroupMember(groupId: string, agentId: string): Promise<boolean> {
    const membership = await this.prisma.groupMembership.findFirst({
      where: {
        groupId,
        agentId,
        status: MembershipStatus.ACTIVE,
      },
    });
    return !!membership;
  }
}

export const groupService = new GroupService();
