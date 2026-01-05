import { prisma } from '../db/prisma.js';
import { RegulatoryCalendarService } from '../services/regulatory-calendar.service.js';

export async function runDeadlineReminderJob(): Promise<{ remindersSent: number; overdue: number }> {
  const calendar = new RegulatoryCalendarService(prisma);
  return calendar.sendDeadlineReminders();
}
