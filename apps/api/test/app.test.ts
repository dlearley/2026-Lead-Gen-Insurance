import request from 'supertest';
import jwt from 'jsonwebtoken';

import type { EventBus } from '../src/infra/event-bus.js';
import { createApp } from '../src/app.js';

describe('API', () => {
  it('POST /api/v1/leads requires auth', async () => {
    const eventBus = {
      publish: jest.fn(async () => undefined),
      request: jest.fn(async () => ({ lead: null })),
      close: jest.fn(async () => undefined),
    };

    const app = createApp({
      eventBus,
      jwtSecret: 'test-secret',
      rateLimit: { points: 1000, durationSeconds: 60 },
    });

    await request(app).post('/api/v1/leads').send({ source: 'web', email: 'a@b.com' }).expect(401);
  });

  it('POST /api/v1/leads publishes lead.received', async () => {
    const eventBus = {
      publish: jest.fn(async () => undefined),
      request: jest.fn(async () => ({ lead: null })),
      close: jest.fn(async () => undefined),
    };

    const secret = 'test-secret';

    const token = jwt.sign({ sub: 'external-system' }, secret);

    const app = createApp({
      eventBus,
      jwtSecret: secret,
      rateLimit: { points: 1000, durationSeconds: 60 },
    });

    const res = await request(app)
      .post('/api/v1/leads')
      .set('Authorization', `Bearer ${token}`)
      .send({ source: 'web', email: 'a@b.com' })
      .expect(201);

    expect(res.body).toHaveProperty('id');
    expect(eventBus.publish).toHaveBeenCalledWith('lead.received', expect.any(Object));
  });
});
