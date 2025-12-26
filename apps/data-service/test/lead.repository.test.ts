import type { LeadCreatePayload } from '@insurance-lead-gen/types';

import { LeadRepository } from '../src/repositories/lead.repository.js';

describe('LeadRepository', () => {
  it('creates lead via prisma client', async () => {
    const prisma = {
      lead: {
        create: jest.fn(async (args) => args.data),
        findUnique: jest.fn(async () => null),
        update: jest.fn(async (args) => ({ ...args.data, id: args.where.id })),
      },
    } as any;

    const repo = new LeadRepository(prisma);

    const payload: LeadCreatePayload = {
      source: 'test',
      email: 'a@b.com',
    };

    const created = await repo.createLead('lead_1', payload);

    expect(prisma.lead.create).toHaveBeenCalled();
    expect(created.id).toBe('lead_1');
    expect(created.source).toBe('test');
  });
});
