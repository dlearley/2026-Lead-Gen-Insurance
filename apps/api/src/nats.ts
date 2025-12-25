import { connect, NatsConnection } from 'nats';
import { logger } from '@insurance-lead-gen/core';

export async function connectNats(config: any): Promise<NatsConnection> {
  try {
    const nc = await connect({
      servers: config.natsServers || 'nats://localhost:4222',
      reconnect: true,
      maxReconnectAttempts: -1,
      reconnectTimeWait: 2000,
    });
    
    logger.info('NATS connection established', { servers: config.natsServers });
    return nc;
  } catch (error) {
    logger.error('Failed to connect to NATS', { error: error.message });
    throw error;
  }
}