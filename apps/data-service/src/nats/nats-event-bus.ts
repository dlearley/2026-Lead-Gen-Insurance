import { connect, JSONCodec, type NatsConnection, type Subscription } from 'nats';

import { logger } from '@insurance-lead-gen/core';

export class NatsEventBus {
  private readonly codec = JSONCodec<unknown>();

  constructor(private readonly nc: NatsConnection) {}

  static async connect(url: string): Promise<NatsEventBus> {
    const nc = await connect({ servers: url });
    logger.info('Connected to NATS', { url });
    return new NatsEventBus(nc);
  }

  publish(subject: string, payload: unknown): void {
    this.nc.publish(subject, this.codec.encode(payload));
  }

  async request<TResponse>(
    subject: string,
    payload: unknown,
    timeoutMs = 2000
  ): Promise<TResponse> {
    const msg = await this.nc.request(subject, this.codec.encode(payload), { timeout: timeoutMs });
    return this.codec.decode(msg.data) as TResponse;
  }

  subscribe(subject: string): Subscription {
    return this.nc.subscribe(subject);
  }

  decode<T>(data: Uint8Array): T {
    return this.codec.decode(data) as T;
  }

  encode(payload: unknown): Uint8Array {
    return this.codec.encode(payload);
  }

  async close(): Promise<void> {
    await this.nc.drain();
  }
}
