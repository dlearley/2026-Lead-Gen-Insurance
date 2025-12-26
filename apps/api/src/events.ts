import { NatsConnection } from 'nats';
import { logger } from '@insurance-lead-gen/core';

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