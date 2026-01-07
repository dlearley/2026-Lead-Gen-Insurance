/**
 * Policy Management E2E Tests
 * Tests for policy creation, viewing, and management
 */

import { test, expect } from './test-utils';

test.describe('Policy Management', () => {
  test.beforeEach(async ({ page, authenticatedPage }) => {
    await authenticatedPage.goto('/policies');
    await expect(authenticatedPage.locator('h1:has-text("Policies")')).toBeVisible();
  });

  test('should display policies list', async ({ authenticatedPage }) => {
    await expect(authenticatedPage.locator('table')).toBeVisible();
    await expect(authenticatedPage.locator('th:has-text("Policy Number")')).toBeVisible();
    await expect(authenticatedPage.locator('th:has-text("Type")')).toBeVisible();
  });

  test('should create a new policy', async ({ authenticatedPage }) => {
    await authenticatedPage.click('button:has-text("New Policy")');
    
    // Fill policy form
    await authenticatedPage.fill('input[name="policyNumber"]', `POL-${Date.now()}`);
    await authenticatedPage.selectOption('select[name="policyType"]', 'AUTO');
    await authenticatedPage.fill('input[name="premium"]', '1500');
    await authenticatedPage.fill('input[name="deductible"]', '500');
    
    // Submit
    await authenticatedPage.click('button:has-text("Create Policy")');
    
    await expect(authenticatedPage.locator('text=Policy created successfully')).toBeVisible();
  });

  test('should view policy details', async ({ authenticatedPage }) => {
    const policyNumber = 'POL-123456';
    await authenticatedPage.click(`text=${policyNumber}`);
    
    await expect(authenticatedPage.locator('h1')).toContainText(policyNumber);
  });

  test('should renew a policy', async ({ authenticatedPage }) => {
    await authenticatedPage.click('button:has-text("Renew")');
    
    // Update expiration date
    const newDate = new Date();
    newDate.setFullYear(newDate.getFullYear() + 1);
    
    await authenticatedPage.fill('input[name="expirationDate"]', newDate.toISOString().split('T')[0]);
    await authenticatedPage.click('button:has-text("Confirm Renewal")');
    
    await expect(authenticatedPage.locator('text=Policy renewed successfully')).toBeVisible();
  });

  test('should cancel a policy', async ({ authenticatedPage }) => {
    await authenticatedPage.click('button:has-text("Cancel")');
    
    // Confirm cancellation
    await authenticatedPage.click('text=I understand, cancel this policy');
    await authenticatedPage.click('button:has-text("Confirm")');
    
    await expect(authenticatedPage.locator('text=Policy cancelled')).toBeVisible();
  });
});
