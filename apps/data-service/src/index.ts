import { logger } from '@insurance-lead-gen/core';
import { prisma, disconnectPrisma } from './database/prisma.client.js';

const PORT = process.env.DATA_SERVICE_PORT || 3001;

async function startDataService() {
  try {
    logger.info('Data service starting', { port: PORT });

    await prisma.$connect();
    logger.info('Connected to PostgreSQL via Prisma');

    logger.info(`Data service running on port ${PORT}`);

    // TODO: Implement Redis connection
    // TODO: Implement Neo4j driver
    // TODO: Implement Qdrant client
    // TODO: Implement NATS connection

    // Keep the process alive
    setInterval(() => {
      logger.debug('Data service heartbeat');
    }, 60000);
  } catch (error) {
    logger.error('Failed to start data service', { error });
    process.exit(1);
  }
}

async function shutdownDataService() {
  logger.info('Shutting down data service gracefully');
  
  try {
    await disconnectPrisma();
    logger.info('Disconnected from database');
  } catch (error) {
    logger.error('Error during shutdown', { error });
  }
  
  process.exit(0);
}

process.on('SIGTERM', shutdownDataService);
process.on('SIGINT', shutdownDataService);

startDataService().catch((error) => {
  logger.error('Unhandled error in data service', { error });
  process.exit(1);
});