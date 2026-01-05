export type JobConfig = {
  name: string;
  cron: string;
  handler: string;
};

export const regulatoryReportingJobs: JobConfig[] = [
  {
    name: 'deadline-reminders',
    cron: '0 8 * * *',
    handler: 'deadline-reminder.job:runDeadlineReminderJob',
  },
  {
    name: 'overdue-deadline-alerts',
    cron: '0 9 * * *',
    handler: 'deadline-reminder.job:runDeadlineReminderJob',
  },
  {
    name: 'weekly-breach-notification-reminders',
    cron: '0 10 * * 1',
    handler: 'breach-notification.job:runBreachNotificationJob',
  },
  {
    name: 'daily-report-scheduler',
    cron: '0 6 * * *',
    handler: 'report-scheduler.job:runReportSchedulerJob',
  },
  {
    name: 'monthly-filing-status-report',
    cron: '0 7 1 * *',
    handler: 'report-scheduler.job:runReportSchedulerJob',
  },
  {
    name: 'yearly-calendar-reset',
    cron: '0 5 1 1 *',
    handler: 'deadline-reminder.job:runDeadlineReminderJob',
  },
];
