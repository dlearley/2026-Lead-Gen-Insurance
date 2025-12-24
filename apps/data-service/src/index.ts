import { logger } from '@insurance-lead-gen/core';
import { connectDatabase, disconnectDatabase } from './db/prisma.js';

const PORT = process.env.DATA_SERVICE_PORT ?? 3001;

async function bootstrap(): Promise<void> {
  try {
    logger.info('Data service starting', { port: PORT });

    await connectDatabase();
    logger.info('Database connection established');

    // TODO: Implement Redis connection
    // TODO: Implement Neo4j driver
    // TODO: Implement Qdrant client
    // TODO: Implement NATS connection

    logger.info(`Data service running on port ${PORT}`);

    // Keep the process alive
    setInterval(() => {
      logger.debug('Data service heartbeat');
    }, 60000);
  } catch (error) {
    logger.error('Failed to start data service', { error });
    process.exit(1);
  }
}

async function shutdown(): Promise<void> {
  logger.info('Shutting down data service gracefully');

  try {
    await disconnectDatabase();
    logger.info('Database disconnected');
  } catch (error) {
    logger.error('Error during shutdown', { error });
  }

  process.exit(0);
}

process.on('SIGTERM', () => void shutdown());
process.on('SIGINT', () => void shutdown());

void bootstrap();
