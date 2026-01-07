/**
 * E2E Test Utilities and Fixtures
 * Common setup and helper functions for E2E tests
 */

import { test as base, type Page, type BrowserContext } from '@playwright/test';

export interface TestFixtures {
  authenticatedPage: Page;
  adminPage: Page;
  leadData: Record<string, unknown>;
}

export const test = base.extend<TestFixtures>({
  // Create authenticated page with login
  authenticatedPage: async ({ page }, use) => {
    // Navigate to login page
    await page.goto('/login');
    
    // Fill in login form
    await page.fill('input[name="email"]', 'test@example.com');
    await page.fill('input[name="password"]', 'testpassword123');
    
    // Click login button
    await page.click('button[type="submit"]');
    
    // Wait for navigation to dashboard
    await page.waitForURL('/dashboard', { timeout: 10000 });
    
    await use(page);
  },

  // Create admin page with elevated permissions
  adminPage: async ({ page }, use) => {
    await page.goto('/login');
    await page.fill('input[name="email"]', 'admin@example.com');
    await page.fill('input[name="password"]', 'adminpassword123');
    await page.click('button[type="submit"]');
    await page.waitForURL('/dashboard', { timeout: 10000 });
    
    // Navigate to admin section
    await page.goto('/admin');
    await use(page);
  },

  // Generate test lead data
  leadData: async ({}, use) => {
    const lead = {
      source: 'web_form',
      email: `test_${Date.now()}@example.com`,
      phone: '+1-555-123-4567',
      firstName: 'Test',
      lastName: 'User',
      insuranceType: 'AUTO',
      address: {
        street: '123 Test St',
        city: 'San Francisco',
        state: 'CA',
        zipCode: '94102',
        country: 'US',
      },
    };
    await use(lead);
  },
});

// Helper function to wait for API response
export async function waitForApiResponse(
  page: Page,
  urlPattern: string,
  timeout = 10000
): Promise<void> {
  const response = await page.waitForResponse(
    response => response.url().includes(urlPattern) && response.status() < 400,
    { timeout }
  );
  expect(response.status()).toBeLessThan(400);
}

// Helper function to create a lead via API
export async function createLeadViaApi(
  page: Page,
  leadData: Record<string, unknown>
): Promise<string> {
  const response = await page.request.post('/api/v1/leads', {
    data: leadData,
    headers: {
      'Content-Type': 'application/json',
      // In test environment, we'd have auth setup
    },
  });
  
  expect(response.ok()).toBe(true);
  const body = await response.json();
  return body.id;
}

// Helper function to wait for element to be visible
export async function waitForElement(
  page: Page,
  selector: string,
  timeout = 10000
): Promise<void> {
  await page.waitForSelector(selector, { state: 'visible', timeout });
}

// Helper function to take screenshot on failure
export async function takeScreenshot(
  page: Page,
  name: string
): Promise<void> {
  await page.screenshot({ path: `test-results/screenshots/${name}.png` });
}

// Test data factories
export const testData = {
  lead: {
    valid: {
      source: 'web_form',
      email: 'valid@example.com',
      phone: '+1-555-123-4567',
      firstName: 'John',
      lastName: 'Doe',
    },
    invalid: {
      source: '',
      email: 'not-an-email',
    },
  },
  
  user: {
    admin: {
      email: 'admin@example.com',
      password: 'admin123',
    },
    agent: {
      email: 'agent@example.com',
      password: 'agent123',
    },
  },
  
  search: {
    valid: 'test lead',
    long: 'a'.repeat(1000),
    special: "Test' OR '1'='1",
  },
};

// Custom expectations
export { expect } from '@playwright/test';
