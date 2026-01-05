// Presence Service - Track user online status

import { PrismaClient } from '@prisma/client'
import { UserPresence, UpdatePresenceInput } from './types.js'

export class PresenceService {
  private prisma: PrismaClient

  constructor(prisma: PrismaClient) {
    this.prisma = prisma
  }

  async updatePresence(input: UpdatePresenceInput): Promise<UserPresence> {
    const { userId, organizationId, status } = input

    return this.prisma.userPresence.upsert({
      where: { userId },
      create: {
        userId,
        organizationId,
        status,
        lastSeen: new Date(),
      },
      update: {
        status,
        lastSeen: new Date(),
      },
    })
  }

  async getPresence(userId: string): Promise<UserPresence | null> {
    return this.prisma.userPresence.findUnique({
      where: { userId },
    })
  }

  async getOnlineUsers(organizationId: string): Promise<UserPresence[]> {
    return this.prisma.userPresence.findMany({
      where: {
        organizationId,
        status: 'online',
      },
    })
  }

  async getUserStatuses(userIds: string[]): Promise<UserPresence[]> {
    return this.prisma.userPresence.findMany({
      where: {
        userId: { in: userIds },
      },
    })
  }

  async getOrganizationPresence(organizationId: string): Promise<UserPresence[]> {
    return this.prisma.userPresence.findMany({
      where: { organizationId },
    })
  }

  async updateLastSeen(userId: string): Promise<UserPresence> {
    return this.prisma.userPresence.update({
      where: { userId },
      data: { lastSeen: new Date() },
    })
  }

  async setUserOffline(userId: string): Promise<UserPresence> {
    return this.prisma.userPresence.update({
      where: { userId },
      data: { status: 'offline' },
    })
  }
}