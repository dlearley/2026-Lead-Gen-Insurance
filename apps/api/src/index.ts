import { logger } from '@insurance-lead-gen/core';
import { getConfig } from '@insurance-lead-gen/config';

import { createApp } from './app.js';
import { NatsEventBus } from './infra/nats-event-bus.js';

const start = async (): Promise<void> => {
  const config = getConfig();
  const PORT = config.ports.api;

  const eventBus = await NatsEventBus.connect(config.nats.url);

  const app = createApp({
    eventBus,
    jwtSecret: config.jwt.secret,
    rateLimit: config.apiRateLimit,
  });

  const server = app.listen(PORT, () => {
    logger.info(`API service running on port ${PORT}`);
  });

  const shutdown = async (): Promise<void> => {
    logger.info('SIGTERM received, shutting down gracefully');

    server.close(() => {
      void eventBus.close();
      process.exit(0);
    });
  };

  process.on('SIGTERM', () => {
    void shutdown();
  });
};

start().catch((error) => {
  logger.error('API service failed to start', { error });
  process.exit(1);
});
