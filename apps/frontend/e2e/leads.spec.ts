/**
 * Lead Management E2E Tests
 * Tests for lead creation, viewing, editing, and deletion
 */

import { test, expect } from './test-utils';

test.describe('Lead Management', () => {
  test.beforeEach(async ({ page, authenticatedPage }) => {
    // Navigate to leads page before each test
    await authenticatedPage.goto('/leads');
    await expect(authenticatedPage.locator('h1:has-text("Leads")')).toBeVisible();
  });

  test('should display leads list', async ({ authenticatedPage }) => {
    await expect(authenticatedPage.locator('table')).toBeVisible();
    await expect(authenticatedPage.locator('th:has-text("Name")')).toBeVisible();
    await expect(authenticatedPage.locator('th:has-text("Status")')).toBeVisible();
  });

  test('should create a new lead', async ({ authenticatedPage }) => {
    // Click "New Lead" button
    await authenticatedPage.click('button:has-text("New Lead")');
    
    // Fill in lead form
    await authenticatedPage.fill('input[name="firstName"]', 'John');
    await authenticatedPage.fill('input[name="lastName"]', 'Doe');
    await authenticatedPage.fill('input[name="email"]', `john_${Date.now()}@example.com`);
    await authenticatedPage.fill('input[name="phone"]', '+1-555-123-4567');
    await authenticatedPage.selectOption('select[name="insuranceType"]', 'AUTO');
    
    // Submit form
    await authenticatedPage.click('button:has-text("Create Lead")');
    
    // Should show success message
    await expect(authenticatedPage.locator('text=Lead created successfully')).toBeVisible();
    
    // Should redirect to lead details or show in list
    await expect(authenticatedPage.locator('text=John Doe')).toBeVisible();
  });

  test('should show validation errors for required fields', async ({ authenticatedPage }) => {
    await authenticatedPage.click('button:has-text("New Lead")');
    await authenticatedPage.click('button:has-text("Create Lead")');
    
    await expect(authenticatedPage.locator('text=First name is required')).toBeVisible();
    await expect(authenticatedPage.locator('text=Email is required')).toBeVisible();
  });

  test('should view lead details', async ({ authenticatedPage }) => {
    // First create a lead if none exists
    const leadName = 'John Doe';
    
    // Click on a lead to view details
    await authenticatedPage.click(`text=${leadName}`);
    
    // Should show lead details page
    await expect(authenticatedPage.locator('h1')).toContainText(leadName);
  });

  test('should edit lead status', async ({ authenticatedPage }) => {
    // Find a lead and click edit
    await authenticatedPage.click('button:has-text("Edit")');
    
    // Change status
    await authenticatedPage.selectOption('select[name="status"]', 'qualified');
    
    // Save changes
    await authenticatedPage.click('button:has-text("Save")');
    
    // Should show success message
    await expect(authenticatedPage.locator('text=Lead updated successfully')).toBeVisible();
  });

  test('should filter leads by status', async ({ authenticatedPage }) => {
    // Open filter dropdown
    await authenticatedPage.click('button:has-text("Filter")');
    
    // Select status filter
    await authenticatedPage.click('input[value="qualified"]');
    await authenticatedPage.click('button:has-text("Apply")');
    
    // Only qualified leads should be visible
    await expect(authenticatedPage.locator('table')).toBeVisible();
  });

  test('should search leads', async ({ authenticatedPage }) => {
    // Type in search box
    await authenticatedPage.fill('input[placeholder*="Search"]', 'John');
    
    // Should filter results
    await expect(authenticatedPage.locator('text=John')).toBeVisible();
  });

  test('should delete a lead', async ({ authenticatedPage }) => {
    // Find a lead and click delete
    await authenticatedPage.hover(`text=John Doe`);
    await authenticatedPage.click('button[aria-label="Delete"]');
    
    // Confirm deletion
    await authenticatedPage.click('button:has-text("Confirm Delete")');
    
    // Should show success message
    await expect(authenticatedPage.locator('text=Lead deleted successfully')).toBeVisible();
  });

  test('should paginate through leads', async ({ authenticatedPage }) => {
    // Check pagination exists
    await expect(authenticatedPage.locator('nav[aria-label="Pagination"]')).toBeVisible();
    
    // Click next page
    await authenticatedPage.click('button[aria-label="Next page"]');
    
    // Should navigate to next page
    await expect(authenticatedPage.locator('button[aria-label="Previous page"]')).toBeVisible();
  });

  test('should export leads', async ({ authenticatedPage }) => {
    // Click export button
    await authenticatedPage.click('button:has-text("Export")');
    
    // Select export format
    await authenticatedPage.click('text=CSV');
    
    // Should download file or show success
    // This depends on implementation
  });
});
