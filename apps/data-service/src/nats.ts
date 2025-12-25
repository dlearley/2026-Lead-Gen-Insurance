import { connect, NatsConnection } from 'nats';
import { logger } from '@insurance-lead-gen/core';

export async function connectNats(config: any): Promise<NatsConnection> {
  try {
    const nc = await connect({
      servers: config.natsServers,
      reconnect: true,
      maxReconnectAttempts: -1, // Infinite reconnect attempts
      reconnectTimeWait: 2000,
    });
    
    logger.info('NATS connection established', { servers: config.natsServers });
    return nc;
  } catch (error) {
    logger.error('Failed to connect to NATS', { error: error.message });
    throw error;
  }
}

export async function publishEvent(
  nc: NatsConnection,
  topic: string,
  data: any
) {
  try {
    const payload = JSON.stringify(data);
    await nc.publish(topic, payload);
    logger.debug(`Published event to ${topic}`, { eventId: data.id });
  } catch (error) {
    logger.error('Failed to publish event', { 
      topic,
      error: error.message,
      eventId: data?.id
    });
    throw error;
  }
}