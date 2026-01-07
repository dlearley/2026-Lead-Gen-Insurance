// Notification Service - Manage user notifications

import { PrismaClient } from '@prisma/client'
import { Notification, NotificationPreference, CreateNotificationInput, UpdateNotificationPreferencesInput } from './types.js'

export class NotificationService {
  private prisma: PrismaClient

  constructor(prisma: PrismaClient) {
    this.prisma = prisma
  }

  async createNotification(input: CreateNotificationInput): Promise<Notification> {
    const { organizationId, userId, type, title, message, actionUrl } = input

    return this.prisma.notification.create({
      data: {
        organizationId,
        userId,
        type,
        title,
        message,
        actionUrl,
      },
    })
  }

  async getUserNotifications(userId: string, limit: number = 20): Promise<Notification[]> {
    return this.prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    })
  }

  async getUnreadNotifications(userId: string): Promise<Notification[]> {
    return this.prisma.notification.findMany({
      where: {
        userId,
        readAt: null,
      },
      orderBy: { createdAt: 'desc' },
    })
  }

  async markAsRead(notificationId: string): Promise<Notification> {
    return this.prisma.notification.update({
      where: { id: notificationId },
      data: { readAt: new Date() },
    })
  }

  async markAllAsRead(userId: string): Promise<number> {
    const result = await this.prisma.notification.updateMany({
      where: {
        userId,
        readAt: null,
      },
      data: { readAt: new Date() },
    })

    return result.count
  }

  async deleteNotification(notificationId: string): Promise<Notification> {
    return this.prisma.notification.delete({
      where: { id: notificationId },
    })
  }

  async getNotificationPreferences(userId: string): Promise<NotificationPreference | null> {
    return this.prisma.notificationPreference.findUnique({
      where: { userId },
    })
  }

  async updateNotificationPreferences(input: UpdateNotificationPreferencesInput): Promise<NotificationPreference> {
    const { userId, organizationId, ...preferences } = input

    return this.prisma.notificationPreference.upsert({
      where: { userId },
      create: {
        userId,
        organizationId,
        ...preferences,
      },
      update: preferences,
    })
  }

  async getUnreadCount(userId: string): Promise<number> {
    return this.prisma.notification.count({
      where: {
        userId,
        readAt: null,
      },
    })
  }

  async getRecentNotifications(userId: string, limit: number = 10): Promise<Notification[]> {
    return this.prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    })
  }

  async deleteAllNotifications(userId: string): Promise<number> {
    const result = await this.prisma.notification.deleteMany({
      where: { userId },
    })

    return result.count
  }

  async shouldSendNotification(
    userId: string,
    type: NotificationType
  ): Promise<boolean> {
    const preferences = await this.prisma.notificationPreference.findUnique({
      where: { userId },
    })

    if (!preferences) return true

    // Check quiet hours
    if (preferences.quietHoursEnabled) {
      const now = new Date()
      const hours = now.getHours()
      const minutes = now.getMinutes()
      const currentTime = hours * 60 + minutes

      if (preferences.quietHoursStart && preferences.quietHoursEnd) {
        const [startHours, startMinutes] = preferences.quietHoursStart.split(':').map(Number)
        const [endHours, endMinutes] = preferences.quietHoursEnd.split(':').map(Number)
        const startTime = startHours * 60 + startMinutes
        const endTime = endHours * 60 + endMinutes

        // Handle overnight quiet hours
        if (startTime > endTime) {
          if (currentTime >= startTime || currentTime <= endTime) {
            return false
          }
        } else {
          if (currentTime >= startTime && currentTime <= endTime) {
            return false
          }
        }
      }
    }

    // Check specific notification preferences
    switch (type) {
      case 'message':
        return preferences.messageNotifications !== 'none'
      case 'call':
        return preferences.callNotifications
      case 'case':
        return preferences.caseNotifications
      case 'document':
        return preferences.documentNotifications
      default:
        return true
    }
  }

  async getNotificationStats(userId: string): Promise<{
    total: number
    unread: number
    byType: Record<string, number>
  }> {
    const notifications = await this.prisma.notification.findMany({
      where: { userId },
    })

    const byType: Record<string, number> = {}
    notifications.forEach((notification) => {
      byType[notification.type] = (byType[notification.type] || 0) + 1
    })

    return {
      total: notifications.length,
      unread: notifications.filter((n) => !n.readAt).length,
      byType,
    }
  }
}