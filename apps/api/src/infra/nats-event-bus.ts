import { connect, JSONCodec, type NatsConnection } from 'nats';

import { logger } from '@insurance-lead-gen/core';

import type { EventBus } from './event-bus.js';

export class NatsEventBus implements EventBus {
  private readonly codec = JSONCodec<unknown>();

  constructor(private readonly nc: NatsConnection) {}

  static async connect(url: string): Promise<NatsEventBus> {
    const nc = await connect({ servers: url });
    logger.info('Connected to NATS', { url });
    return new NatsEventBus(nc);
  }

  async publish(subject: string, payload: unknown): Promise<void> {
    this.nc.publish(subject, this.codec.encode(payload));
    await this.nc.flush();
  }

  async request<TResponse>(
    subject: string,
    payload: unknown,
    timeoutMs = 2000
  ): Promise<TResponse> {
    const msg = await this.nc.request(subject, this.codec.encode(payload), { timeout: timeoutMs });
    return this.codec.decode(msg.data) as TResponse;
  }

  async close(): Promise<void> {
    await this.nc.drain();
  }
}
