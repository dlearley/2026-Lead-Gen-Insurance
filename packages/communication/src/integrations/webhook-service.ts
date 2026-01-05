// Webhook Service - Handle incoming webhooks from third-party services

import { PrismaClient } from '@prisma/client'
import { IntegrationWebhook, WebhookPayload } from './types.js'

export class WebhookService {
  private prisma: PrismaClient

  constructor(prisma: PrismaClient) {
    this.prisma = prisma
  }

  async registerWebhook(
    integrationId: string,
    event: string
  ): Promise<IntegrationWebhook> {
    return this.prisma.integrationWebhook.create({
      data: {
        integrationId,
        event,
      },
    })
  }

  async getWebhooks(integrationId: string): Promise<IntegrationWebhook[]> {
    return this.prisma.integrationWebhook.findMany({
      where: { integrationId },
    })
  }

  async deleteWebhook(webhookId: string): Promise<IntegrationWebhook> {
    return this.prisma.integrationWebhook.delete({
      where: { id: webhookId },
    })
  }

  async enableWebhook(webhookId: string): Promise<IntegrationWebhook> {
    return this.prisma.integrationWebhook.update({
      where: { id: webhookId },
      data: { isActive: true },
    })
  }

  async disableWebhook(webhookId: string): Promise<IntegrationWebhook> {
    return this.prisma.integrationWebhook.update({
      where: { id: webhookId },
      data: { isActive: false },
    })
  }

  async handleWebhook(payload: WebhookPayload): Promise<{ success: boolean; error?: string }> {
    const { event, integrationId, data, timestamp } = payload

    try {
      // Verify the webhook is registered
      const webhook = await this.prisma.integrationWebhook.findFirst({
        where: {
          integrationId,
          event,
          isActive: true,
        },
      })

      if (!webhook) {
        return { success: false, error: 'Webhook not registered or inactive' }
      }

      // Verify the integration exists
      const integration = await this.prisma.integration.findUnique({
        where: { id: integrationId },
      })

      if (!integration || !integration.isActive) {
        return { success: false, error: 'Integration not active' }
      }

      // In a real implementation, you would process the webhook data
      // and potentially trigger sync operations
      
      console.log(`Processing webhook ${event} for integration ${integrationId}`)

      return { success: true }
    } catch (error) {
      console.error('Error handling webhook:', error)
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
  }

  async verifyWebhookSignature(
    payload: any,
    signature: string,
    secret: string
  ): Promise<boolean> {
    // In a real implementation, you would verify the HMAC signature
    // For now, we'll just return true
    return true
  }

  async getWebhookEvents(integrationId: string): Promise<string[]> {
    const webhooks = await this.prisma.integrationWebhook.findMany({
      where: { integrationId },
      select: { event: true },
    })

    return webhooks.map((w) => w.event)
  }

  async getActiveWebhooks(integrationId: string): Promise<IntegrationWebhook[]> {
    return this.prisma.integrationWebhook.findMany({
      where: {
        integrationId,
        isActive: true,
      },
    })
  }

  async logWebhookEvent(
    integrationId: string,
    event: string,
    success: boolean,
    error?: string
  ): Promise<void> {
    // In a real implementation, you would log this to a database
    console.log(`Webhook event: ${event} - ${success ? 'success' : 'failed'}`)
    if (error) {
      console.error('Webhook error:', error)
    }
  }

  async getWebhookStats(integrationId: string): Promise<{
    totalWebhooks: number
    activeWebhooks: number
    byEvent: Record<string, number>
  }> {
    const webhooks = await this.prisma.integrationWebhook.findMany({
      where: { integrationId },
    })

    const byEvent: Record<string, number> = {}
    webhooks.forEach((webhook) => {
      byEvent[webhook.event] = (byEvent[webhook.event] || 0) + 1
    })

    return {
      totalWebhooks: webhooks.length,
      activeWebhooks: webhooks.filter((w) => w.isActive).length,
      byEvent,
    }
  }
}