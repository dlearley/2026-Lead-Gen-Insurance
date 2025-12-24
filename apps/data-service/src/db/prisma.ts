import { PrismaClient } from '@prisma/client';
import { logger } from '@insurance-lead-gen/core';

const prismaClientSingleton = (): PrismaClient => {
  return new PrismaClient({
    log: [
      {
        emit: 'event',
        level: 'query',
      },
      {
        emit: 'event',
        level: 'error',
      },
      {
        emit: 'event',
        level: 'info',
      },
      {
        emit: 'event',
        level: 'warn',
      },
    ],
  });
};

declare global {
  // eslint-disable-next-line no-var
  var prismaGlobal: undefined | ReturnType<typeof prismaClientSingleton>;
}

const prisma = globalThis.prismaGlobal ?? prismaClientSingleton();

if (process.env.NODE_ENV !== 'production') {
  globalThis.prismaGlobal = prisma;
}

// Log Prisma queries in development
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

prisma.$on('warn', (e) => {
  logger.warn('Prisma Warning', { message: e.message });
});

prisma.$on('info', (e) => {
  logger.info('Prisma Info', { message: e.message });
});

export default prisma;

export async function connectDatabase(): Promise<void> {
  try {
    await prisma.$connect();
    logger.info('Database connected successfully');
  } catch (error) {
    logger.error('Failed to connect to database', { error });
    throw error;
  }
}

export async function disconnectDatabase(): Promise<void> {
  try {
    await prisma.$disconnect();
    logger.info('Database disconnected successfully');
  } catch (error) {
    logger.error('Failed to disconnect from database', { error });
    throw error;
  }
}
