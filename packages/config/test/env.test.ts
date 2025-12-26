import { createConfig } from '../src/index.js';

describe('config', () => {
  it('creates config with defaults', () => {
    const cfg = createConfig({});
    expect(cfg.ports.api).toBe(3000);
    expect(cfg.nats.url).toBe('nats://localhost:4222');
  });
});
