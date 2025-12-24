import { connect, JSONCodec, type NatsConnection } from 'nats';

import { logger } from '@insurance-lead-gen/core';

export class NatsEventBus {
  private readonly codec = JSONCodec<unknown>();

  constructor(private readonly nc: NatsConnection) {}

  static async connect(url: string): Promise<NatsEventBus> {
    const nc = await connect({ servers: url });
    logger.info('Connected to NATS', { url });
    return new NatsEventBus(nc);
  }

  subscribe(subject: string) {
    return this.nc.subscribe(subject);
  }

  decode<T>(data: Uint8Array): T {
    return this.codec.decode(data) as T;
  }

  async close(): Promise<void> {
    await this.nc.drain();
  }
}
