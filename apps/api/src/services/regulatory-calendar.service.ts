import { PrismaClient, type RegulatoryDeadline } from '@prisma/client';
import { logger } from '@insurance-lead-gen/core';
import {
  type CalendarView,
  type DeadlineData,
  type ReminderResult,
} from './regulatory-reporting.service-types.js';

export class RegulatoryCalendarService {
  constructor(private readonly prisma: PrismaClient) {}

  async addDeadline(deadline: DeadlineData): Promise<RegulatoryDeadline> {
    return this.prisma.regulatoryDeadline.upsert({
      where: { deadlineId: deadline.deadlineId },
      update: {
        reportType: deadline.reportType,
        jurisdiction: deadline.jurisdiction,
        description: deadline.description,
        dueDate: deadline.dueDate,
        reminderDates: deadline.reminderDates,
        isRecurring: deadline.isRecurring ?? false,
        recurrencePattern: deadline.recurrencePattern,
        status: 'Upcoming',
      },
      create: {
        deadlineId: deadline.deadlineId,
        reportType: deadline.reportType,
        jurisdiction: deadline.jurisdiction,
        description: deadline.description,
        dueDate: deadline.dueDate,
        reminderDates: deadline.reminderDates,
        isRecurring: deadline.isRecurring ?? false,
        recurrencePattern: deadline.recurrencePattern,
        status: 'Upcoming',
      },
    });
  }

  async getUpcomingDeadlines(days = 30): Promise<RegulatoryDeadline[]> {
    const now = new Date();
    const horizon = new Date(now);
    horizon.setUTCDate(horizon.getUTCDate() + days);

    return this.prisma.regulatoryDeadline.findMany({
      where: {
        dueDate: { gte: now, lte: horizon },
        status: { in: ['Upcoming', 'Due', 'Overdue'] },
      },
      orderBy: { dueDate: 'asc' },
    });
  }

  async getRegulatoryCalendar(year: number): Promise<CalendarView> {
    const start = new Date(Date.UTC(year, 0, 1));
    const end = new Date(Date.UTC(year + 1, 0, 1));

    const deadlines = await this.prisma.regulatoryDeadline.findMany({
      where: { dueDate: { gte: start, lt: end } },
      orderBy: { dueDate: 'asc' },
    });

    return {
      year,
      deadlines: deadlines.map((d) => ({
        id: d.id,
        reportType: d.reportType,
        jurisdiction: d.jurisdiction,
        dueDate: d.dueDate,
        status: d.status,
      })),
    };
  }

  async sendDeadlineReminders(): Promise<ReminderResult> {
    const now = new Date();

    const deadlines = await this.prisma.regulatoryDeadline.findMany({
      where: {
        status: { in: ['Upcoming', 'Due'] },
      },
    });

    let remindersSent = 0;
    let overdue = 0;

    for (const deadline of deadlines) {
      if (deadline.dueDate.getTime() < now.getTime()) {
        overdue += 1;
        // eslint-disable-next-line no-await-in-loop
        await this.prisma.regulatoryDeadline.update({
          where: { id: deadline.id },
          data: { status: 'Overdue' },
        });
        continue;
      }

      if (deadline.reminderDates.some((d) => sameDay(d, now))) {
        remindersSent += 1;
        try {
          // eslint-disable-next-line no-await-in-loop
          await this.prisma.event.create({
            data: {
              type: 'regulatory.deadline.reminder_sent',
              source: 'api',
              entityType: 'RegulatoryDeadline',
              entityId: deadline.id,
              data: { deadlineId: deadline.deadlineId },
            },
          });
        } catch (error) {
          logger.warn('Failed to write deadline reminder event', { error });
        }
      }
    }

    return { remindersSent, overdue };
  }

  async markDeadlineComplete(deadlineId: string): Promise<void> {
    await this.prisma.regulatoryDeadline.update({
      where: { deadlineId },
      data: { status: 'Completed', completionDate: new Date() },
    });
  }

  async exportCalendar(format: 'json' | 'ics', year: number): Promise<{ fileName: string; contentType: string; data: string }> {
    const calendar = await this.getRegulatoryCalendar(year);

    if (format === 'ics') {
      const lines = [
        'BEGIN:VCALENDAR',
        'VERSION:2.0',
        'PRODID:-//Insurance Lead Gen//Regulatory Calendar//EN',
        ...calendar.deadlines.flatMap((d) => {
          const dt = d.dueDate.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
          return [
            'BEGIN:VEVENT',
            `UID:${d.id}`,
            `DTSTAMP:${dt}`,
            `DTSTART:${dt}`,
            `SUMMARY:${d.reportType} (${d.jurisdiction}) due`,
            'END:VEVENT',
          ];
        }),
        'END:VCALENDAR',
      ];

      return {
        fileName: `regulatory-calendar-${year}.ics`,
        contentType: 'text/calendar',
        data: lines.join('\n'),
      };
    }

    return {
      fileName: `regulatory-calendar-${year}.json`,
      contentType: 'application/json',
      data: JSON.stringify(calendar, null, 2),
    };
  }
}

function sameDay(a: Date, b: Date): boolean {
  return (
    a.getUTCFullYear() === b.getUTCFullYear() &&
    a.getUTCMonth() === b.getUTCMonth() &&
    a.getUTCDate() === b.getUTCDate()
  );
}
