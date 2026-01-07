import { PrismaClient } from '@prisma/client';
import { logger } from '@insurance-lead-gen/core';

const prismaClientSingleton = (): PrismaClient => {
  return new PrismaClient({
    log:
      process.env.LOG_LEVEL === 'debug'
        ? [
            { emit: 'event', level: 'query' },
            { emit: 'event', level: 'error' },
            { emit: 'event', level: 'info' },
            { emit: 'event', level: 'warn' },
          ]
        : [],
  });
};

declare global {
  // eslint-disable-next-line no-var
  var apiPrismaGlobal: undefined | ReturnType<typeof prismaClientSingleton>;
}

export const prisma = globalThis.apiPrismaGlobal ?? prismaClientSingleton();

if (process.env.NODE_ENV !== 'production') {
  globalThis.apiPrismaGlobal = prisma;
}

if (process.env.LOG_LEVEL === 'debug') {
  prisma.$on('query', (e) => {
    logger.debug('Prisma Query', {
      query: e.query,
      params: e.params,
      duration: e.duration,
    });
  });
}

prisma.$on('error', (e) => {
  logger.error('Prisma Error', { message: e.message, target: e.target });
});

export async function connectDatabase(): Promise<void> {
  await prisma.$connect();
}

export async function disconnectDatabase(): Promise<void> {
  await prisma.$disconnect();
}
