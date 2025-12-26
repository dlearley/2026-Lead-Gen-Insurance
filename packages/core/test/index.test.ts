import { logger } from '../src/index.js';

describe('core', () => {
  it('exports logger', () => {
    expect(logger).toBeDefined();
  });
});
