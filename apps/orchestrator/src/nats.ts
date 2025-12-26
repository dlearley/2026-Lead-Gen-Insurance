import { connect, type NatsConnection, type Subscription, StringCodec } from 'nats';
import { logger } from '@insurance-lead-gen/core';

export class NATSConnection {
  private connection: NatsConnection | null = null;
  private subscriptions: Map<string, Subscription> = new Map();
  private stringCodec = StringCodec();

  async connect(): Promise<void> {
    try {
      const servers = process.env.NATS_URL || 'nats://localhost:4222';
      this.connection = await connect({ servers });
      logger.info('Orchestrator connected to NATS server');
    } catch (error) {
      logger.error('Failed to connect to NATS', { error });
      throw error;
    }
  }

  async subscribe(topic: string, callback: (data: any) => Promise<void>): Promise<void> {
    if (!this.connection) {
      throw new Error('NATS connection not established');
    }

    try {
      const subscription = this.connection.subscribe(topic);
      this.subscriptions.set(topic, subscription);

      (async () => {
        for await (const message of subscription) {
          try {
            const data = JSON.parse(this.stringCodec.decode(message.data));
            logger.debug(`Received NATS message on ${topic}`, { data });
            await callback(data);
          } catch (error) {
            logger.error(`Error processing NATS message on ${topic}`, { error });
          }
        }
      })();

      logger.info(`Subscribed to NATS topic: ${topic}`);
    } catch (error) {
      logger.error(`Failed to subscribe to NATS topic ${topic}`, { error });
      throw error;
    }
  }

  async publish(topic: string, data: any): Promise<void> {
    if (!this.connection) {
      throw new Error('NATS connection not established');
    }

    try {
      const payload = JSON.stringify(data);
      await this.connection.publish(topic, this.stringCodec.encode(payload));
      logger.debug(`Published to NATS topic: ${topic}`, { data });
    } catch (error) {
      logger.error(`Failed to publish to NATS topic ${topic}`, { error });
      throw error;
    }
  }

  async close(): Promise<void> {
    try {
      // Unsubscribe from all topics
      for (const [topic, subscription] of this.subscriptions) {
        await subscription.unsubscribe();
        logger.info(`Unsubscribed from NATS topic: ${topic}`);
      }
      this.subscriptions.clear();

      // Close connection
      if (this.connection) {
        await this.connection.close();
        logger.info('NATS connection closed');
      }
    } catch (error) {
      logger.error('Error closing NATS connection', { error });
      throw error;
    }
  }
}

export async function publishEvent(connection: NatsConnection, topic: string, data: any): Promise<void> {
  const stringCodec = StringCodec();
  const payload = JSON.stringify(data);
  await connection.publish(topic, stringCodec.encode(payload));
  logger.debug(`Published to NATS topic: ${topic}`, { data });
}