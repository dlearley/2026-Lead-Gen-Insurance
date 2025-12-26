import { connect, type NatsConnection, StringCodec } from 'nats';
import { logger } from '@insurance-lead-gen/core';

export class NATSConnection {
  private connection: NatsConnection | null = null;
  private stringCodec = StringCodec();

  async connect(): Promise<void> {
    try {
      const servers = process.env.NATS_URL || 'nats://localhost:4222';
      this.connection = await connect({ servers });
      logger.info('API service connected to NATS server');
    } catch (error) {
      logger.error('Failed to connect to NATS', { error });
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