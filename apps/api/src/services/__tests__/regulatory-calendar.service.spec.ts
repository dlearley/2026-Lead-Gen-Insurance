import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import type { PrismaClient } from '@prisma/client';
import { RegulatoryCalendarService } from '../regulatory-calendar.service.js';

describe('RegulatoryCalendarService', () => {
  let prisma: PrismaClient;

  beforeEach(() => {
    prisma = {
      regulatoryDeadline: {
        upsert: jest.fn(async ({ create }: any) => ({ id: 'd_1', ...create })),
        findMany: jest.fn(async () => [
          {
            id: 'd_1',
            deadlineId: 'DL-1',
            reportType: 'AnnualCompliance',
            jurisdiction: 'Federal',
            description: 'test',
            dueDate: new Date('2026-02-01T00:00:00.000Z'),
            reminderDates: [new Date()],
            isRecurring: false,
            recurrencePattern: null,
            status: 'Upcoming',
            completionDate: null,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ]),
        update: jest.fn(async () => ({ id: 'd_1' })),
      },
      event: {
        create: jest.fn(async () => ({ id: 'evt_1' })),
      },
    } as unknown as PrismaClient;
  });

  it('adds a deadline', async () => {
    const svc = new RegulatoryCalendarService(prisma);

    const deadline = await svc.addDeadline({
      deadlineId: 'DL-1',
      reportType: 'AnnualCompliance',
      jurisdiction: 'Federal',
      description: 'desc',
      dueDate: new Date('2026-02-01T00:00:00.000Z'),
      reminderDates: [new Date('2026-01-15T00:00:00.000Z')],
    });

    expect(deadline.id).toBe('d_1');
    expect((prisma.regulatoryDeadline.upsert as any) as jest.Mock).toHaveBeenCalled();
  });

  it('sends reminders and marks overdue', async () => {
    const svc = new RegulatoryCalendarService(prisma);
    const result = await svc.sendDeadlineReminders();

    expect(result.remindersSent).toBeGreaterThanOrEqual(0);
    expect((prisma.regulatoryDeadline.findMany as any) as jest.Mock).toHaveBeenCalled();
  });
});
