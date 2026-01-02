/**
 * Smoke Test Setup
 *
 * Global test configuration and setup
 */

import axios from 'axios';

// Set default timeout for all tests
jest.setTimeout(parseInt(process.env.TEST_TIMEOUT || '30000', 10));

// Configure axios for better error handling
axios.defaults.timeout = parseInt(process.env.TEST_TIMEOUT || '30000', 10);

// Global test utilities
global.testUtils = {
  async retry<T>(
    fn: () => Promise<T>,
    maxRetries = 3,
    delay = 1000,
  ): Promise<T> {
    let lastError: Error;
    for (let i = 0; i < maxRetries; i++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error as Error;
        if (i < maxRetries - 1) {
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    }
    throw lastError!;
  },

  async cleanupLead(leadId: string, apiClient: any) {
    try {
      await apiClient.delete(`/leads/${leadId}`);
    } catch (error) {
      // Ignore cleanup errors
      console.warn(`Failed to cleanup lead ${leadId}:`, error);
    }
  },

  generateTestEmail(): string {
    return `smoke.test.${Date.now()}@example.com`;
  },

  generateTestPhone(): string {
    return `555-${Math.floor(1000 + Math.random() * 9000)}`;
  },
};

// Global teardown
afterAll(async () => {
  // Wait for any pending async operations
  await new Promise((resolve) => setTimeout(resolve, 1000));
});

// Increase timeout for API calls
axios.interceptors.request.use((config) => {
  config.timeout = parseInt(process.env.TEST_TIMEOUT || '30000', 10);
  return config;
});
