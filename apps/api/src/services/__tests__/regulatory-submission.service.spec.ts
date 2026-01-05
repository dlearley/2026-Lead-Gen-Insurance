import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import type { PrismaClient } from '@prisma/client';
import { RegulatorySubmissionService } from '../regulatory-submission.service.js';

describe('RegulatorySubmissionService', () => {
  let prisma: PrismaClient;

  beforeEach(() => {
    prisma = {
      complianceReport: {
        findUniqueOrThrow: jest.fn(async () => ({ id: 'rep_1', reportType: 'AnnualCompliance', jurisdiction: 'Federal', reportPeriod: '2026', startDate: new Date('2026-01-01T00:00:00.000Z') })),
        update: jest.fn(async () => ({ id: 'rep_1' })),
      },
      regulatorySubmission: {
        create: jest.fn(async ({ data }: any) => ({
          id: 'sub_db_1',
          submissionId: data.submissionId,
          reportId: data.reportId,
          reportType: data.reportType,
          regulatoryBody: data.regulatoryBody,
          jurisdiction: data.jurisdiction,
          submissionUrl: data.submissionUrl,
          submissionMethod: data.submissionMethod,
          submissionDate: new Date(),
          status: data.status,
          referenceNumber: null,
          acknowledgmentDate: null,
          acknowledgmentDocument: null,
          regulatoryResponse: null,
          responseDate: null,
          requiredActions: null,
          deadline: null,
          submittedBy: data.submittedBy,
          notes: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        })),
        findUniqueOrThrow: jest.fn(async () => ({
          id: 'sub_db_1',
          submissionId: 'SUB-1',
          reportId: 'rep_1',
          reportType: 'AnnualCompliance',
          regulatoryBody: 'FTC',
          jurisdiction: 'Federal',
          submissionUrl: 'https://example',
          submissionMethod: 'Portal',
          submissionDate: new Date(),
          status: 'Submitted',
          referenceNumber: null,
          acknowledgmentDate: null,
          acknowledgmentDocument: null,
          regulatoryResponse: null,
          responseDate: null,
          requiredActions: null,
          deadline: null,
          submittedBy: 'system',
          notes: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        })),
        update: jest.fn(async () => ({ id: 'sub_db_1' })),
      },
      regulatoryFilingArchive: {
        upsert: jest.fn(async () => ({ id: 'fa_1' })),
      },
      event: {
        create: jest.fn(async () => ({ id: 'evt_1' })),
      },
    } as unknown as PrismaClient;
  });

  it('submits a report and logs a submission', async () => {
    const svc = new RegulatorySubmissionService(prisma);

    const result = await svc.submitReport('rep_1', {
      regulatoryBody: 'FTC',
      jurisdiction: 'Federal',
      submissionUrl: 'https://portal.example',
      submissionMethod: 'Portal',
      submittedBy: 'alice',
    });

    expect(result.submissionId).toContain('SUB-');
    expect((prisma.regulatorySubmission.create as any) as jest.Mock).toHaveBeenCalled();
    expect((prisma.complianceReport.update as any) as jest.Mock).toHaveBeenCalled();
  });
});
