import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import express from 'express';
import request from 'supertest';
import type { PrismaClient } from '@prisma/client';

jest.mock('@insurance-lead-gen/config', () => ({
  getConfig: () => ({
    ports: { dataService: 3001 },
  }),
}));

jest.mock('@insurance-lead-gen/core', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

import { createRegulatoryReportingRouter } from '../regulatory-reporting.routes.js';

describe('Regulatory reporting routes', () => {
  let prisma: PrismaClient;

  beforeEach(() => {
    prisma = {
      complianceReport: {
        findMany: jest.fn(async () => [{ id: 'rep_1', reportType: 'AnnualCompliance', jurisdiction: 'Federal' }]),
        findUnique: jest.fn(async () => ({ id: 'rep_1', reportType: 'AnnualCompliance', jurisdiction: 'Federal' })),
        update: jest.fn(async () => ({ id: 'rep_1' })),
      },
      regulatorySubmission: {
        findMany: jest.fn(async () => []),
        findUnique: jest.fn(async () => null),
      },
      dataBreachNotification: {
        findMany: jest.fn(async () => []),
        findUnique: jest.fn(async () => null),
      },
      regulatoryReportTemplate: {
        findMany: jest.fn(async () => []),
        findUnique: jest.fn(async () => null),
      },
      scheduledReport: {
        findMany: jest.fn(async () => []),
        findUnique: jest.fn(async () => null),
      },
      regulatoryDeadline: {
        findUnique: jest.fn(async () => null),
      },
      regulatoryFilingArchive: {
        findMany: jest.fn(async () => []),
        findUnique: jest.fn(async () => null),
      },
      regulatoryCommLog: {
        findMany: jest.fn(async () => []),
      },
    } as unknown as PrismaClient;
  });

  it('POST /api/v1/reports/generate generates a compliance report for regulatory payloads', async () => {
    const generator: any = {
      generateComplianceReport: jest.fn(async () => ({ id: 'rep_1', reportType: 'AnnualCompliance', jurisdiction: 'Federal' })),
    };

    const app = express();
    app.use(express.json());
    app.use(
      '/api/v1',
      createRegulatoryReportingRouter({
        prisma,
        generator,
        submissionService: { submitReport: jest.fn(), trackSubmission: jest.fn() } as any,
        templateService: { listTemplates: jest.fn(async () => []) } as any,
        approvalWorkflowService: { initiateApproval: jest.fn(), submitApproval: jest.fn(), getApprovalStatus: jest.fn(async () => ({ reportId: 'rep_1', status: 'Review', pendingApprovers: [] })) } as any,
        reportExportService: { exportToPDF: jest.fn(async () => Buffer.from('x')) } as any,
        breachService: { reportBreach: jest.fn(), notifyAffectedIndividuals: jest.fn(), notifyRegulatories: jest.fn(), getBreachStatus: jest.fn(), investigateBreach: jest.fn(), resolveBreach: jest.fn() } as any,
        scheduledReportService: { scheduleReport: jest.fn(), updateSchedule: jest.fn(), pauseSchedule: jest.fn(), resumeSchedule: jest.fn() } as any,
        calendarService: { getRegulatoryCalendar: jest.fn(async () => ({ year: 2026, deadlines: [] })), getUpcomingDeadlines: jest.fn(async () => []), addDeadline: jest.fn(), markDeadlineComplete: jest.fn() } as any,
      }),
    );

    const response = await request(app)
      .post('/api/v1/reports/generate')
      .send({
        reportType: 'AnnualCompliance',
        jurisdiction: 'Federal',
        dateRange: { startDate: '2026-01-01T00:00:00.000Z', endDate: '2026-01-02T00:00:00.000Z' },
      })
      .expect(201);

    expect(response.body.id).toBe('rep_1');
    expect(generator.generateComplianceReport).toHaveBeenCalled();
  });

  it('GET /api/v1/reports lists reports', async () => {
    const app = express();
    app.use(express.json());
    app.use('/api/v1', createRegulatoryReportingRouter({ prisma, generator: { generateComplianceReport: jest.fn() } as any }));

    const response = await request(app).get('/api/v1/reports').expect(200);
    expect(Array.isArray(response.body.data)).toBe(true);
    expect((prisma.complianceReport.findMany as any) as jest.Mock).toHaveBeenCalled();
  });
});
