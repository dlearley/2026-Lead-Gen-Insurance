import { logger } from '@insurance-lead-gen/core';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);

const PORT = process.env.DATA_SERVICE_PORT || 3001;

// TODO: Implement Prisma client
// TODO: Implement Redis connection
// TODO: Implement Neo4j driver
// TODO: Implement Qdrant client
// TODO: Implement NATS connection

logger.info('Data service starting', { port: PORT });

process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

logger.info(`Data service running on port ${PORT}`);

// Keep the process alive
setInterval(() => {
  logger.debug('Data service heartbeat');
}, 60000);