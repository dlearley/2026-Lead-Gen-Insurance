import { logger } from '@insurance-lead-gen/core';
import { getConfig } from '@insurance-lead-gen/config';
import { EVENT_SUBJECTS, type LeadProcessedEvent } from '@insurance-lead-gen/types';

import { NatsEventBus } from './nats/nats-event-bus.js';

const config = getConfig();
const PORT = config.ports.orchestrator;

const start = async (): Promise<void> => {
  logger.info('Orchestrator service starting', { port: PORT });

  const eventBus = await NatsEventBus.connect(config.nats.url);

  const sub = eventBus.subscribe(EVENT_SUBJECTS.LeadProcessed);
  (async () => {
    for await (const msg of sub) {
      const event = eventBus.decode<LeadProcessedEvent>(msg.data);
      logger.info('Received lead.processed', { leadId: event.data.leadId });
    }
  })().catch((error) => {
    logger.error('lead.processed subscription terminated', { error });
  });

  process.on('SIGTERM', () => {
    logger.info('SIGTERM received, shutting down gracefully');
    void eventBus.close().finally(() => process.exit(0));
  });

  logger.info(`Orchestrator service running on port ${PORT}`);
};

start().catch((error) => {
  logger.error('Orchestrator failed to start', { error });
  process.exit(1);
});

// Keep the process alive
setInterval(() => {
  logger.debug('Orchestrator service heartbeat');
}, 60000);
