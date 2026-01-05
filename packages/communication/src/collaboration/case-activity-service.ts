// Case Activity Service - Track case activities and timeline

import { PrismaClient } from '@prisma/client'
import { CaseActivity, AddCaseActivityInput } from './types.js'

export class CaseActivityService {
  private prisma: PrismaClient

  constructor(prisma: PrismaClient) {
    this.prisma = prisma
  }

  async addActivity(input: AddCaseActivityInput): Promise<CaseActivity> {
    const { caseId, activityType, activityId, description, userId } = input

    return this.prisma.caseActivity.create({
      data: {
        caseId,
        activityType,
        activityId,
        description,
        userId,
      },
    })
  }

  async getCaseTimeline(caseId: string): Promise<CaseActivity[]> {
    return this.prisma.caseActivity.findMany({
      where: { caseId },
      orderBy: { createdAt: 'desc' },
    })
  }

  async getRecentActivities(organizationId: string, limit: number = 20): Promise<CaseActivity[]> {
    return this.prisma.caseActivity.findMany({
      where: {
        case: { organizationId },
      },
      include: {
        case: true,
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    })
  }

  async getUserActivities(userId: string, limit: number = 20): Promise<CaseActivity[]> {
    return this.prisma.caseActivity.findMany({
      where: { userId },
      include: {
        case: true,
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    })
  }

  async getActivityStats(organizationId: string): Promise<Record<string, number>> {
    const activities = await this.prisma.caseActivity.findMany({
      where: {
        case: { organizationId },
      },
    })

    const stats: Record<string, number> = {}
    activities.forEach((activity) => {
      stats[activity.activityType] = (stats[activity.activityType] || 0) + 1
    })

    return stats
  }

  async getActivityByType(
    organizationId: string,
    activityType: string,
    limit: number = 10
  ): Promise<CaseActivity[]> {
    return this.prisma.caseActivity.findMany({
      where: {
        case: { organizationId },
        activityType,
      },
      include: {
        case: true,
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    })
  }

  async deleteActivity(activityId: string): Promise<CaseActivity> {
    return this.prisma.caseActivity.delete({
      where: { id: activityId },
    })
  }

  async getCaseActivitySummary(caseId: string): Promise<{
    totalActivities: number
    byType: Record<string, number>
    lastActivity?: CaseActivity
  }> {
    const activities = await this.prisma.caseActivity.findMany({
      where: { caseId },
      orderBy: { createdAt: 'desc' },
    })

    const byType: Record<string, number> = {}
    activities.forEach((activity) => {
      byType[activity.activityType] = (byType[activity.activityType] || 0) + 1
    })

    return {
      totalActivities: activities.length,
      byType,
      lastActivity: activities[0],
    }
  }
}