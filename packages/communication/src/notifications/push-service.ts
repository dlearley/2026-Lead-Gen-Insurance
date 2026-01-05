// Push Service - Handle push notifications to mobile devices

import admin from 'firebase-admin'
import { PrismaClient } from '@prisma/client'
import { PushToken, RegisterPushTokenInput, SendPushNotificationInput } from './types.js'

export class PushService {
  private prisma: PrismaClient
  private firebaseApp: admin.app.App

  constructor(prisma: PrismaClient, firebaseConfig: any) {
    this.prisma = prisma
    
    if (!admin.apps.length) {
      this.firebaseApp = admin.initializeApp({
        credential: admin.credential.cert(firebaseConfig),
      })
    } else {
      this.firebaseApp = admin.apps[0] as admin.app.App
    }
  }

  async registerPushToken(input: RegisterPushTokenInput): Promise<PushToken> {
    const { userId, organizationId, token, platform, deviceName } = input

    return this.prisma.pushToken.upsert({
      where: {
        userId_token_platform: {
          userId,
          token,
          platform,
        },
      },
      create: {
        userId,
        organizationId,
        token,
        platform,
        deviceName,
        isActive: true,
      },
      update: {
        deviceName,
        isActive: true,
        updatedAt: new Date(),
      },
    })
  }

  async sendPushNotification(input: SendPushNotificationInput): Promise<{ success: boolean; error?: string }> {
    const { userId, title, body, data } = input

    try {
      // Get active push tokens for the user
      const tokens = await this.prisma.pushToken.findMany({
        where: {
          userId,
          isActive: true,
        },
        select: { token: true },
      })

      if (tokens.length === 0) {
        return { success: false, error: 'No active push tokens found' }
      }

      const message: admin.messaging.Message = {
        notification: {
          title,
          body,
        },
        data,
        tokens: tokens.map((t) => t.token),
      }

      const response = await this.firebaseApp.messaging().sendMulticast(message)

      // Handle failed tokens
      if (response.failureCount > 0) {
        response.responses.forEach((resp, index) => {
          if (!resp.success) {
            // Mark token as inactive if it failed
            this.prisma.pushToken.update({
              where: {
                userId_token_platform: {
                  userId,
                  token: tokens[index].token,
                  platform: 'ios', // Would need to get actual platform
                },
              },
              data: { isActive: false },
            })
          }
        })
      }

      return { success: response.successCount > 0 }
    } catch (error) {
      console.error('Error sending push notification:', error)
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
  }

  async sendPushNotificationToToken(
    token: string,
    title: string,
    body: string,
    data?: any
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const message: admin.messaging.Message = {
        notification: {
          title,
          body,
        },
        data,
        token,
      }

      const response = await this.firebaseApp.messaging().send(message)
      return { success: true }
    } catch (error) {
      console.error('Error sending push notification to token:', error)
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
  }

  async deactivatePushToken(userId: string, token: string, platform: 'ios' | 'android' | 'web'): Promise<PushToken> {
    return this.prisma.pushToken.update({
      where: {
        userId_token_platform: {
          userId,
          token,
          platform,
        },
      },
      data: { isActive: false },
    })
  }

  async getUserPushTokens(userId: string): Promise<PushToken[]> {
    return this.prisma.pushToken.findMany({
      where: { userId },
    })
  }

  async cleanupInactiveTokens(): Promise<number> {
    // Clean up tokens that haven't been used in 30 days
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const result = await this.prisma.pushToken.deleteMany({
      where: {
        isActive: false,
        updatedAt: { lt: thirtyDaysAgo },
      },
    })

    return result.count
  }

  async sendBroadcastNotification(
    organizationId: string,
    title: string,
    body: string,
    data?: any
  ): Promise<{ successCount: number; failureCount: number }> {
    try {
      // Get all active tokens for the organization
      const tokens = await this.prisma.pushToken.findMany({
        where: {
          organizationId,
          isActive: true,
        },
        select: { token: true },
      })

      if (tokens.length === 0) {
        return { successCount: 0, failureCount: 0 }
      }

      const message: admin.messaging.Message = {
        notification: {
          title,
          body,
        },
        data,
        tokens: tokens.map((t) => t.token),
      }

      const response = await this.firebaseApp.messaging().sendMulticast(message)

      return {
        successCount: response.successCount,
        failureCount: response.failureCount,
      }
    } catch (error) {
      console.error('Error sending broadcast notification:', error)
      return { successCount: 0, failureCount: 0 }
    }
  }
}