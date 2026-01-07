import { prisma } from '../db/prisma.js';
import { BreachNotificationService } from '../services/breach-notification.service.js';

export async function runBreachNotificationJob(): Promise<{ processed: number }> {
  const breachService = new BreachNotificationService(prisma);

  const breaches = await prisma.dataBreachNotification.findMany({
    where: {
      status: { in: ['Detected', 'Investigating', 'Notifying'] },
      notificationSent: false,
    },
    take: 50,
  });

  for (const breach of breaches) {
    // eslint-disable-next-line no-await-in-loop
    await breachService.notifyAffectedIndividuals(breach.breachId);
  }

  return { processed: breaches.length };
}
