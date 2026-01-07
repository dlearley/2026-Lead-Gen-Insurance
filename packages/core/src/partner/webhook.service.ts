/**
 * Phase 30: Partner Ecosystem & Integrations
 * Webhook Service - Handles webhook registration, delivery, and retry logic
 */

import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';
import axios from 'axios';
import type {
  WebhookEndpoint,
  WebhookDelivery,
  WebhookPayload,
  PlatformEvent,
  CreateWebhookRequest,
  TestWebhookRequest,
} from '@insurance-platform/types';

export class WebhookService {
  constructor(private prisma: PrismaClient) {}

  /**
   * Register webhook endpoint
   */
  async registerWebhook(request: CreateWebhookRequest): Promise<WebhookEndpoint> {
    // Generate webhook secret for signature verification
    const webhookSecret = this.generateWebhookSecret();

    const webhook = await this.prisma.webhookEndpoint.create({
      data: {
        integrationId: request.integrationId,
        endpointUrl: request.endpointUrl,
        webhookSecret,
        subscribedEvents: request.subscribedEvents,
        active: true,
        testMode: request.testMode || false,
      },
    });

    return webhook as WebhookEndpoint;
  }

  /**
   * Update webhook endpoint
   */
  async updateWebhook(
    webhookId: string,
    updates: {
      endpointUrl?: string;
      subscribedEvents?: string[];
      active?: boolean;
    }
  ): Promise<WebhookEndpoint> {
    const webhook = await this.prisma.webhookEndpoint.update({
      where: { id: webhookId },
      data: updates,
    });

    return webhook as WebhookEndpoint;
  }

  /**
   * Delete webhook endpoint
   */
  async deleteWebhook(webhookId: string): Promise<void> {
    await this.prisma.webhookEndpoint.delete({
      where: { id: webhookId },
    });
  }

  /**
   * Test webhook endpoint
   */
  async testWebhook(
    webhookId: string,
    request: TestWebhookRequest
  ): Promise<{ success: boolean; responseStatus?: number; error?: string }> {
    const webhook = await this.prisma.webhookEndpoint.findUnique({
      where: { id: webhookId },
    });

    if (!webhook) {
      throw new Error('Webhook not found');
    }

    const testPayload: WebhookPayload = {
      id: crypto.randomUUID(),
      event: request.eventType,
      timestamp: new Date().toISOString(),
      data: request.payload || { test: true },
      signature: '',
    };

    testPayload.signature = this.generateSignature(testPayload, webhook.webhookSecret);

    try {
      const response = await axios.post(webhook.endpointUrl, testPayload, {
        headers: {
          'Content-Type': 'application/json',
          'X-Webhook-Signature': testPayload.signature,
          'X-Webhook-ID': webhook.id,
        },
        timeout: 10000,
      });

      await this.prisma.webhookEndpoint.update({
        where: { id: webhookId },
        data: { lastTestedAt: new Date() },
      });

      return {
        success: response.status >= 200 && response.status < 300,
        responseStatus: response.status,
      };
    } catch (error: any) {
      return {
        success: false,
        responseStatus: error.response?.status,
        error: error.message,
      };
    }
  }

  /**
   * Deliver event to webhooks
   */
  async deliverEvent(eventId: string): Promise<void> {
    const event = await this.prisma.platformEvent.findUnique({
      where: { id: eventId },
      include: {
        eventType: true,
      },
    });

    if (!event) {
      throw new Error('Event not found');
    }

    // Find all webhooks subscribed to this event
    const webhooks = await this.prisma.webhookEndpoint.findMany({
      where: {
        active: true,
        subscribedEvents: {
          has: event.eventType.eventName,
        },
      },
    });

    // Deliver to each webhook
    await Promise.all(
      webhooks.map((webhook) => this.deliverToWebhook(webhook, event))
    );
  }

  /**
   * Deliver event to specific webhook
   */
  private async deliverToWebhook(webhook: any, event: any): Promise<void> {
    const payload: WebhookPayload = {
      id: event.id,
      event: event.eventType.eventName,
      timestamp: event.createdAt.toISOString(),
      data: event.payload,
      signature: '',
    };

    payload.signature = this.generateSignature(payload, webhook.webhookSecret);

    // Create delivery record
    const delivery = await this.prisma.webhookDelivery.create({
      data: {
        webhookId: webhook.id,
        eventId: event.id,
        payload,
        attemptNumber: 1,
        status: 'PENDING',
      },
    });

    // Attempt delivery
    await this.attemptDelivery(delivery.id);
  }

  /**
   * Attempt webhook delivery
   */
  private async attemptDelivery(deliveryId: string): Promise<void> {
    const delivery = await this.prisma.webhookDelivery.findUnique({
      where: { id: deliveryId },
      include: {
        webhook: true,
      },
    });

    if (!delivery) {
      return;
    }

    try {
      const response = await axios.post(delivery.webhook.endpointUrl, delivery.payload, {
        headers: {
          'Content-Type': 'application/json',
          'X-Webhook-Signature': (delivery.payload as any).signature,
          'X-Webhook-ID': delivery.webhook.id,
          'X-Delivery-ID': delivery.id,
        },
        timeout: 30000,
      });

      // Success
      await this.prisma.webhookDelivery.update({
        where: { id: deliveryId },
        data: {
          status: 'DELIVERED',
          responseStatus: response.status,
          responseBody: JSON.stringify(response.data).substring(0, 1000),
        },
      });
    } catch (error: any) {
      // Failure - schedule retry
      await this.handleDeliveryFailure(delivery, error);
    }
  }

  /**
   * Handle delivery failure with exponential backoff
   */
  private async handleDeliveryFailure(delivery: any, error: any): Promise<void> {
    const maxAttempts = 5;
    const nextAttempt = delivery.attemptNumber + 1;

    if (nextAttempt > maxAttempts) {
      // Max retries reached - mark as failed
      await this.prisma.webhookDelivery.update({
        where: { id: delivery.id },
        data: {
          status: 'FAILED',
          responseStatus: error.response?.status,
          responseBody: error.message,
        },
      });
      return;
    }

    // Calculate exponential backoff: 2^attempt minutes
    const backoffMinutes = Math.pow(2, nextAttempt);
    const nextRetryAt = new Date(Date.now() + backoffMinutes * 60 * 1000);

    await this.prisma.webhookDelivery.create({
      data: {
        webhookId: delivery.webhookId,
        eventId: delivery.eventId,
        payload: delivery.payload,
        attemptNumber: nextAttempt,
        status: 'PENDING',
        nextRetryAt,
      },
    });
  }

  /**
   * Retry failed delivery
   */
  async retryDelivery(deliveryId: string): Promise<void> {
    const delivery = await this.prisma.webhookDelivery.findUnique({
      where: { id: deliveryId },
    });

    if (!delivery || delivery.status !== 'FAILED') {
      throw new Error('Cannot retry this delivery');
    }

    // Create new delivery attempt
    const newDelivery = await this.prisma.webhookDelivery.create({
      data: {
        webhookId: delivery.webhookId,
        eventId: delivery.eventId,
        payload: delivery.payload,
        attemptNumber: delivery.attemptNumber + 1,
        status: 'PENDING',
      },
    });

    await this.attemptDelivery(newDelivery.id);
  }

  /**
   * Get webhook deliveries
   */
  async getDeliveries(
    webhookId: string,
    filters?: {
      status?: 'PENDING' | 'DELIVERED' | 'FAILED';
      limit?: number;
      offset?: number;
    }
  ): Promise<WebhookDelivery[]> {
    const where: any = { webhookId };
    if (filters?.status) {
      where.status = filters.status;
    }

    const deliveries = await this.prisma.webhookDelivery.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: filters?.limit || 50,
      skip: filters?.offset || 0,
    });

    return deliveries as WebhookDelivery[];
  }

  /**
   * Get failed deliveries for webhook
   */
  async getFailedDeliveries(webhookId: string): Promise<WebhookDelivery[]> {
    return this.getDeliveries(webhookId, { status: 'FAILED' });
  }

  /**
   * Process pending webhook deliveries
   * This should be called by a background worker
   */
  async processPendingDeliveries(): Promise<void> {
    const pendingDeliveries = await this.prisma.webhookDelivery.findMany({
      where: {
        status: 'PENDING',
        OR: [
          { nextRetryAt: null },
          { nextRetryAt: { lte: new Date() } },
        ],
      },
      take: 100,
    });

    await Promise.all(
      pendingDeliveries.map((delivery) => this.attemptDelivery(delivery.id))
    );
  }

  /**
   * Generate webhook secret
   */
  private generateWebhookSecret(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Generate HMAC signature for webhook payload
   */
  private generateSignature(payload: WebhookPayload, secret: string): string {
    const signaturePayload = JSON.stringify({
      id: payload.id,
      event: payload.event,
      timestamp: payload.timestamp,
      data: payload.data,
    });

    return crypto.createHmac('sha256', secret).update(signaturePayload).digest('hex');
  }

  /**
   * Verify webhook signature
   */
  verifySignature(payload: WebhookPayload, signature: string, secret: string): boolean {
    const expectedSignature = this.generateSignature(payload, secret);
    return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature));
  }
}
