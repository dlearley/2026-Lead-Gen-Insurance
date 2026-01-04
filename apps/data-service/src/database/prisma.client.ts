import { PrismaClient } from '@prisma/client';
import { logger } from '@insurance-lead-gen/core';
import { ensureAuditLogInfrastructure } from '../audit/audit-log.js';

class PrismaClientSingleton {
  private static instance: PrismaClient | null = null;

  private constructor() {}

  public static getInstance(): PrismaClient {
    if (!PrismaClientSingleton.instance) {
      PrismaClientSingleton.instance = new PrismaClient({
        log: [
          { level: 'query', emit: 'event' },
          { level: 'error', emit: 'event' },
          { level: 'warn', emit: 'event' },
        ],
      });

      PrismaClientSingleton.instance.$on('query', (e) => {
        logger.debug('Prisma Query', {
          query: e.query,
          duration: e.duration,
          params: e.params,
        });
      });

      PrismaClientSingleton.instance.$on('error', (e) => {
        logger.error('Prisma Error', { error: e });
      });

      PrismaClientSingleton.instance.$on('warn', (e) => {
        logger.warn('Prisma Warning', { message: e.message });
      });
    }

    return PrismaClientSingleton.instance;
  }

  public static async disconnect(): Promise<void> {
    if (PrismaClientSingleton.instance) {
      await PrismaClientSingleton.instance.$disconnect();
      PrismaClientSingleton.instance = null;
      logger.info('Prisma client disconnected');
    }
  }
}

export const prisma = PrismaClientSingleton.getInstance();

if (process.env.ENABLE_AUDIT_LOGGING !== 'false') {
  void ensureAuditLogInfrastructure(prisma);
}

export const disconnectPrisma = () => PrismaClientSingleton.disconnect();
