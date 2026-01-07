import { randomUUID } from 'crypto';
import { PrismaClient, type RegulatorySubmission } from '@prisma/client';
import { logger } from '@insurance-lead-gen/core';
import {
  type ExtensionResult,
  type SubmissionResult,
  type Summary,
} from './regulatory-reporting.service-types.js';

export type RegulatorTarget = {
  regulatoryBody: string;
  jurisdiction: string;
  submissionUrl: string;
  submissionMethod: 'Email' | 'Portal' | 'API' | 'Paper' | string;
  submittedBy?: string;
};

export class RegulatorySubmissionService {
  constructor(private readonly prisma: PrismaClient) {}

  async submitReport(reportId: string, regulator: RegulatorTarget): Promise<SubmissionResult> {
    const submissionId = `SUB-${randomUUID().slice(0, 10)}`;

    const submission = await this.prisma.regulatorySubmission.create({
      data: {
        submissionId,
        reportId,
        reportType: (await this.prisma.complianceReport.findUniqueOrThrow({ where: { id: reportId } })).reportType,
        regulatoryBody: regulator.regulatoryBody,
        jurisdiction: regulator.jurisdiction,
        submissionUrl: regulator.submissionUrl,
        submissionMethod: regulator.submissionMethod,
        status: 'Submitted',
        submittedBy: regulator.submittedBy ?? 'system',
      },
    });

    await this.prisma.complianceReport.update({
      where: { id: reportId },
      data: {
        status: 'Submitted',
        submittedDate: submission.submissionDate,
        submittedTo: `${submission.regulatoryBody} (${submission.jurisdiction})`,
        submissionRef: submission.referenceNumber ?? submission.submissionId,
      },
    });

    try {
      await this.prisma.event.create({
        data: {
          type: 'regulatory.report.submitted',
          source: 'api',
          entityType: 'ComplianceReport',
          entityId: reportId,
          data: { reportId, submissionId: submission.submissionId },
        },
      });
    } catch (error) {
      logger.warn('Failed to write report submission event', { error });
    }

    return { submissionId: submission.submissionId, status: submission.status };
  }

  async trackSubmission(submissionId: string): Promise<RegulatorySubmission> {
    return this.prisma.regulatorySubmission.findUniqueOrThrow({ where: { submissionId } });
  }

  async handleRegulatoryResponse(
    submissionId: string,
    response: { status: string; responseContent?: string; referenceNumber?: string; requiredActions?: string },
  ): Promise<void> {
    await this.prisma.regulatorySubmission.update({
      where: { submissionId },
      data: {
        status: response.status,
        regulatoryResponse: response.responseContent,
        responseDate: new Date(),
        referenceNumber: response.referenceNumber,
        requiredActions: response.requiredActions,
      },
    });

    try {
      await this.prisma.event.create({
        data: {
          type: 'regulatory.submission.response_received',
          source: 'api',
          entityType: 'RegulatorySubmission',
          entityId: submissionId,
          data: response,
        },
      });
    } catch (error) {
      logger.warn('Failed to write regulatory response event', { error });
    }
  }

  async requestExtension(submissionId: string, newDueDate: Date): Promise<ExtensionResult> {
    const existing = await this.prisma.regulatorySubmission.findUniqueOrThrow({ where: { submissionId } });

    await this.prisma.regulatorySubmission.update({
      where: { submissionId },
      data: {
        deadline: newDueDate,
        status: 'RequiresAction',
      },
    });

    return { submissionId, previousDeadline: existing.deadline ?? undefined, newDeadline: newDueDate };
  }

  async generateSubmissionSummary(submissionId: string): Promise<Summary> {
    const submission = await this.prisma.regulatorySubmission.findUniqueOrThrow({ where: { submissionId } });

    return {
      submissionId: submission.submissionId,
      reportId: submission.reportId,
      regulatoryBody: submission.regulatoryBody,
      status: submission.status,
      referenceNumber: submission.referenceNumber ?? undefined,
    };
  }

  async archiveSubmission(submissionId: string): Promise<void> {
    const submission = await this.prisma.regulatorySubmission.findUniqueOrThrow({ where: { submissionId } });
    const report = await this.prisma.complianceReport.findUniqueOrThrow({ where: { id: submission.reportId } });

    const filingId = `FIL-${report.reportType}-${report.jurisdiction}-${report.reportPeriod}`;

    const checksum = randomUUID().replace(/-/g, '');

    await this.prisma.regulatoryFilingArchive.upsert({
      where: { filingId },
      update: {
        archiveLocation: submission.submissionUrl,
        checksum,
        archivedDate: new Date(),
      },
      create: {
        filingId,
        reportId: report.id,
        reportType: report.reportType,
        jurisdiction: report.jurisdiction,
        filingYear: report.startDate.getUTCFullYear(),
        archivedDate: new Date(),
        archiveLocation: submission.submissionUrl,
        retention: '7 years',
        checksum,
      },
    });

    try {
      await this.prisma.regulatorySubmission.update({
        where: { submissionId },
        data: {
          notes: [submission.notes, `Archived as ${filingId}`].filter(Boolean).join('\n'),
        },
      });
    } catch (error) {
      logger.warn('Failed to update submission notes after archive', { error });
    }
  }
}
