import type { Lead } from '../src/index.js';

describe('types', () => {
  it('defines Lead type', () => {
    const lead: Partial<Lead> = { id: '1', source: 'test' };
    expect(lead.source).toBe('test');
  });
});
