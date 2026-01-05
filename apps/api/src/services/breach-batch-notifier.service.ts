import { PrismaClient } from '@prisma/client';
import { type NotificationResult } from './regulatory-reporting.service-types.js';

export type DeliveryResult = {
  leadId: string;
  method: string;
  success: boolean;
};

export type BatchResult = {
  breachId: string;
  results: DeliveryResult[];
};

export type DeliveryStatus = {
  breachId: string;
  delivered: number;
  failed: number;
  pending: number;
};

export type RetryResult = {
  breachId: string;
  retried: number;
};

export class BreachBatchNotifierService {
  constructor(private readonly prisma: PrismaClient) {}

  async notifyBatch(
    breachId: string,
    individuals: Array<{ leadId: string; method?: 'Email' | 'Phone' | 'Mail' | string }>,
  ): Promise<BatchResult> {
    const results: DeliveryResult[] = [];

    for (const individual of individuals) {
      // eslint-disable-next-line no-await-in-loop
      const result = await this.sendNotification(breachId, individual, individual.method ?? 'Email');
      results.push(result);
    }

    return { breachId, results };
  }

  async sendNotification(
    breachId: string,
    individual: { leadId: string },
    method: string,
  ): Promise<DeliveryResult> {
    const now = new Date();

    await this.prisma.breachNotificationRecipient.upsert({
      where: { breachId_leadId: { breachId, leadId: individual.leadId } },
      update: {
        notificationSent: true,
        notificationMethod: method,
        notificationDate: now,
      },
      create: {
        breachId,
        leadId: individual.leadId,
        notificationSent: true,
        notificationMethod: method,
        notificationDate: now,
      },
    });

    return { leadId: individual.leadId, method, success: true };
  }

  async trackDelivery(breachId: string): Promise<DeliveryStatus> {
    const recipients = await this.prisma.breachNotificationRecipient.findMany({ where: { breachId } });
    const delivered = recipients.filter((r) => r.notificationSent).length;
    const pending = recipients.length - delivered;

    return { breachId, delivered, failed: 0, pending };
  }

  async retryFailedNotifications(breachId: string): Promise<RetryResult> {
    // Placeholder: delivery failures are not tracked separately yet.
    const status: NotificationResult = await Promise.resolve({ success: true, notified: 0, failed: 0 });
    return { breachId, retried: status.failed };
  }
}
