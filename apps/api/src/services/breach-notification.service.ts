import { randomUUID } from 'crypto';
import {
  PrismaClient,
  type BreachNotificationRecipient,
  type DataBreachNotification,
} from '@prisma/client';
import { logger } from '@insurance-lead-gen/core';
import {
  type BreachData,
  type BreachStatus,
  type Document,
  type InvestigationResult,
  type NotificationResult,
  type NotificationStatus,
} from './regulatory-reporting.service-types.js';

export class BreachNotificationService {
  constructor(private readonly prisma: PrismaClient) {}

  async reportBreach(breachData: BreachData): Promise<DataBreachNotification> {
    const breachId = breachData.breachId ?? `BR-${randomUUID().slice(0, 8)}`;

    const breach = await this.prisma.dataBreachNotification.create({
      data: {
        breachId,
        breachDate: breachData.breachDate,
        discoveryDate: breachData.discoveryDate,
        breachType: breachData.breachType,
        description: breachData.description,
        affectedDataTypes: breachData.affectedDataTypes,
        affectedRecords: breachData.affectedRecords,
        affectedIndividuals: breachData.affectedIndividuals,
        systemsAffected: breachData.systemsAffected,
        severity: breachData.severity,
        potentialHarm: breachData.potentialHarm,
        remediation: breachData.remediation,
        preventionMeasures: breachData.preventionMeasures,
        notificationSent: false,
        regulators: [],
        status: 'Detected',
        complianceRequirements: breachData.complianceRequirements,
        templateUsed: breachData.templateUsed,
      },
    });

    if (breachData.leadIds?.length) {
      await this.prisma.breachNotificationRecipient.createMany({
        data: breachData.leadIds.map((leadId) => ({
          breachId: breach.breachId,
          leadId,
        })),
        skipDuplicates: true,
      });
    }

    try {
      await this.prisma.event.create({
        data: {
          type: 'regulatory.breach.reported',
          source: 'api',
          entityType: 'DataBreachNotification',
          entityId: breach.id,
          data: { breachId: breach.breachId, severity: breach.severity },
        },
      });
    } catch (error) {
      logger.warn('Failed to write breach audit event', { error });
    }

    return breach;
  }

  async notifyAffectedIndividuals(breachId: string): Promise<NotificationResult> {
    const recipients = await this.prisma.breachNotificationRecipient.findMany({
      where: { breachId },
    });

    if (recipients.length === 0) {
      return { success: true, notified: 0, failed: 0 };
    }

    const now = new Date();

    const result = await this.prisma.breachNotificationRecipient.updateMany({
      where: { breachId },
      data: {
        notificationSent: true,
        notificationDate: now,
        notificationMethod: 'Email',
      },
    });

    await this.prisma.dataBreachNotification.update({
      where: { breachId },
      data: {
        notificationSent: true,
        notificationDate: now,
        notificationMethod: 'Email',
        individualsNotified: result.count,
        status: 'Notifying',
      },
    });

    return { success: true, notified: result.count, failed: 0 };
  }

  async notifyRegulatories(breachId: string, regulators: string[]): Promise<NotificationResult> {
    const now = new Date();
    await this.prisma.dataBreachNotification.update({
      where: { breachId },
      data: {
        regulatorNotified: true,
        regulatorNotificationDate: now,
        regulators,
      },
    });

    try {
      await this.prisma.event.create({
        data: {
          type: 'regulatory.breach.regulators_notified',
          source: 'api',
          entityType: 'DataBreachNotification',
          entityId: breachId,
          data: { breachId, regulators },
        },
      });
    } catch (error) {
      logger.warn('Failed to write breach regulator notification event', { error });
    }

    return { success: true, notified: regulators.length, failed: 0 };
  }

  async generateBreachNotificationLetter(breachId: string): Promise<Document> {
    const breach = await this.prisma.dataBreachNotification.findUnique({
      where: { breachId },
      include: { recipients: true },
    });

    if (!breach) {
      throw new Error('Breach not found');
    }

    const content = `Breach Notification\n\nBreach ID: ${breach.breachId}\nDiscovery Date: ${breach.discoveryDate.toISOString()}\nDescription: ${breach.description}\nAffected Individuals: ${breach.affectedIndividuals}\n\nRemediation: ${breach.remediation}`;

    return {
      fileName: `breach-notice-${breach.breachId}.txt`,
      mimeType: 'text/plain',
      content,
    };
  }

  async trackNotificationStatus(breachId: string): Promise<NotificationStatus> {
    const recipients = await this.prisma.breachNotificationRecipient.findMany({
      where: { breachId },
    });

    const totalRecipients = recipients.length;
    const notified = recipients.filter((r) => r.notificationSent).length;
    const acknowledged = recipients.filter((r) => r.acknowledged).length;

    return {
      breachId,
      totalRecipients,
      notified,
      acknowledged,
      pending: Math.max(0, totalRecipients - notified),
    };
  }

  async investigateBreach(breachId: string, findings: { rootCause?: string; notes?: string }): Promise<InvestigationResult> {
    await this.prisma.dataBreachNotification.update({
      where: { breachId },
      data: {
        status: 'Investigating',
        investigationStart: new Date(),
        rootCause: findings.rootCause,
        investigationNotes: findings.notes,
      },
    });

    return { breachId, status: 'Investigating' };
  }

  async resolveBreach(breachId: string, resolution: { notes?: string }): Promise<void> {
    await this.prisma.dataBreachNotification.update({
      where: { breachId },
      data: {
        status: 'Resolved',
        resolutionDate: new Date(),
        investigationComplete: new Date(),
        investigationNotes: resolution.notes,
      },
    });
  }

  async getBreachStatus(breachId: string): Promise<BreachStatus> {
    const breach = await this.prisma.dataBreachNotification.findUnique({
      where: { breachId },
    });

    if (!breach) {
      throw new Error('Breach not found');
    }

    return {
      breachId: breach.breachId,
      status: breach.status,
      notificationSent: breach.notificationSent,
      regulatorNotified: breach.regulatorNotified,
    };
  }

  async getRecipients(breachId: string): Promise<BreachNotificationRecipient[]> {
    return this.prisma.breachNotificationRecipient.findMany({
      where: { breachId },
    });
  }

  async markRecipientAcknowledged(breachId: string, leadId: string): Promise<void> {
    try {
      await this.prisma.breachNotificationRecipient.update({
        where: { breachId_leadId: { breachId, leadId } },
        data: { acknowledged: true, responseDate: new Date() },
      });
    } catch (error) {
      logger.warn('Failed to mark recipient acknowledged', { breachId, leadId, error });
    }
  }
}
