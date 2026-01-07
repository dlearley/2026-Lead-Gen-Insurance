/**
 * Accessibility Testing Setup
 * WCAG 2.1 Level AA compliance testing
 */

import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './accessibility',
  snapshotDir: './test-results/accessibility-snapshots',
  
  use: {
    baseURL: process.env.ACCESSIBILITY_BASE_URL || 'http://localhost:3000',
  },
  
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
  ],
  
  reporter: [
    ['html', { outputFolder: 'accessibility-report' }],
    ['json', { outputFile: 'accessibility-results.json' }],
  ],
});
