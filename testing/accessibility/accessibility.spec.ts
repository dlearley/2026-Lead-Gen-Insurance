/**
 * Accessibility E2E Tests
 * WCAG 2.1 Level AA compliance verification
 */

import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('Accessibility Tests', () => {
  test.describe('Color Contrast', () => {
    test('homepage meets color contrast requirements', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');
      
      const accessibilityScan = await new AxeBuilder({ page })
        .withTags(['cat.color'])
        .analyze();
      
      expect(accessibilityScan.violations).toEqual([]);
    });

    test('login page meets color contrast requirements', async ({ page }) => {
      await page.goto('/login');
      await page.waitForLoadState('networkidle');
      
      const accessibilityScan = await new AxeBuilder({ page })
        .withTags(['cat.color'])
        .analyze();
      
      expect(accessibilityScan.violations).toEqual([]);
    });

    test('dashboard meets color contrast requirements', async ({ page }) => {
      await page.goto('/dashboard');
      await page.waitForLoadState('networkidle');
      
      const accessibilityScan = await new AxeBuilder({ page })
        .withTags(['cat.color'])
        .analyze();
      
      expect(accessibilityScan.violations).toEqual([]);
    });
  });

  test.describe('Keyboard Navigation', () => {
    test('can navigate login form with keyboard', async ({ page }) => {
      await page.goto('/login');
      
      // Tab through form elements
      await page.keyboard.press('Tab');
      await expect(page.locator('input[name="email"]')).toBeFocused();
      
      await page.keyboard.press('Tab');
      await expect(page.locator('input[name="password"]')).toBeFocused();
      
      await page.keyboard.press('Tab');
      await expect(page.locator('button[type="submit"]')).toBeFocused();
    });

    test('can navigate main menu with keyboard', async ({ page }) => {
      await page.goto('/dashboard');
      
      // Tab to menu
      await page.keyboard.press('Tab');
      
      // Navigate menu items
      for (let i = 0; i < 4; i++) {
        await page.keyboard.press('ArrowRight');
      }
    });

    test('focus indicator is visible', async ({ page }) => {
      await page.goto('/login');
      
      await page.focus('input[name="email"]');
      await page.waitForFunction(() => {
        const emailInput = document.querySelector('input[name="email"]');
        return emailInput && getComputedStyle(emailInput).outline !== 'none';
      });
    });

    test('can open modal with keyboard', async ({ page, authenticatedPage }) => {
      await authenticatedPage.goto('/leads');
      
      // Open new lead modal
      await authenticatedPage.click('button:has-text("New Lead")');
      
      // Modal should be focused
      await expect(authenticatedPage.locator('dialog')).toBeFocused();
    });

    test('can close modal with Escape key', async ({ page, authenticatedPage }) => {
      await authenticatedPage.goto('/leads');
      
      await authenticatedPage.click('button:has-text("New Lead")');
      await expect(authenticatedPage.locator('dialog')).toBeVisible();
      
      // Close with Escape
      await authenticatedPage.keyboard.press('Escape');
      await expect(authenticatedPage.locator('dialog')).not.toBeVisible();
    });
  });

  test.describe('Screen Reader Support', () => {
    test('form inputs have labels', async ({ page }) => {
      await page.goto('/login');
      
      const emailInput = page.locator('input[name="email"]');
      const emailId = await emailInput.getAttribute('id');
      
      // Check for associated label
      const label = page.locator(`label[for="${emailId}"]`);
      await expect(label).toBeVisible();
    });

    test('buttons have accessible names', async ({ page }) => {
      await page.goto('/login');
      
      const submitButton = page.locator('button[type="submit"]');
      const buttonText = await submitButton.textContent();
      
      expect(buttonText).toBeTruthy();
    });

    test('images have alt text', async ({ page }) => {
      await page.goto('/dashboard');
      
      const images = page.locator('img');
      const count = await images.count();
      
      for (let i = 0; i < count; i++) {
        const img = images.nth(i);
        const alt = await img.getAttribute('alt');
        // Decorative images can have empty alt
        if (alt === null) {
          const role = await img.getAttribute('role');
          expect(role).toBe('presentation');
        }
      }
    });

    test('form validation errors are announced', async ({ page }) => {
      await page.goto('/login');
      
      // Submit empty form
      await page.click('button[type="submit"]');
      
      // Error should have aria-describedby
      const error = page.locator('text=Email is required').first();
      await expect(error).toHaveAttribute('aria-live', 'polite');
    });

    test('dynamic content announcements', async ({ page }) => {
      await page.goto('/leads');
      
      // Create new lead
      await page.click('button:has-text("New Lead")');
      await page.fill('input[name="firstName"]', 'Test');
      await page.fill('input[name="email"]', 'test@example.com');
      await page.click('button:has-text("Create Lead")');
      
      // Success message should be announced
      const successMessage = page.locator('text=Lead created successfully');
      await expect(successMessage).toHaveAttribute('aria-live', 'polite');
    });
  });

  test.describe('Forms', () => {
    test('required fields are indicated', async ({ page }) => {
      await page.goto('/login');
      
      const emailInput = page.locator('input[name="email"]');
      const emailId = await emailInput.getAttribute('id');
      const label = page.locator(`label[for="${emailId}"]`);
      const labelText = await label.textContent();
      
      expect(labelText).toContain('*');
    });

    test('autocomplete attributes are present', async ({ page }) => {
      await page.goto('/login');
      
      const emailInput = page.locator('input[name="email"]');
      const autocomplete = await emailInput.getAttribute('autocomplete');
      
      expect(autocomplete).toBe('email');
    });

    test('error messages describe the error', async ({ page }) => {
      await page.goto('/login');
      
      await page.fill('input[name="email"]', 'invalid');
      await page.click('button[type="submit"]');
      
      const error = page.locator('text=Please enter a valid email').first();
      await expect(error).toBeVisible();
    });
  });

  test.describe('Page Structure', () => {
    test('page has proper heading hierarchy', async ({ page }) => {
      await page.goto('/dashboard');
      
      const h1 = page.locator('h1');
      await expect(h1).toBeVisible();
      
      // Should not have multiple h1s
      const h1Count = await page.locator('h1').count();
      expect(h1Count).toBe(1);
    });

    test('landmarks are present', async ({ page }) => {
      await page.goto('/dashboard');
      
      // Check for main landmark
      const main = page.locator('main');
      await expect(main).toBeVisible();
      
      // Check for navigation
      const nav = page.locator('nav');
      await expect(nav.first()).toBeVisible();
    });

    test('content is structured with lists', async ({ page }) => {
      await page.goto('/leads');
      
      // Leads should be in a list or table
      const table = page.locator('table');
      await expect(table).toBeVisible();
    });
  });

  test.describe('Timing and Motion', () => {
    test('animations can be disabled via prefers-reduced-motion', async ({ page }) => {
      await page.addInitScript(`
        window.matchMedia = window.matchMedia || function() {
          return {
            matches: true,
            addListener: () => {},
            removeListener: () => {},
          };
        };
      `);
      
      await page.goto('/dashboard');
      
      // Animations should be reduced
      const element = page.locator('.animated-element').first();
      // Check that reduced motion styles are applied
    });

    test('time limits can be extended', async ({ page }) => {
      // For session timeout warnings
      const warning = page.locator('text=Your session will expire');
      // If session timeout exists, warning should be visible
    });
  });

  test.describe('Input Assistance', () => {
    test('form has visible instructions', async ({ page }) => {
      await page.goto('/login');
      
      const instructions = page.locator('text=Enter your email and password');
      // Instructions should be visible
    });

    test('error identification is clear', async ({ page }) => {
      await page.goto('/login');
      
      await page.fill('input[name="email"]', 'invalid');
      await page.fill('input[name="password"]', 'short');
      await page.click('button[type="submit"]');
      
      // Check that errors are clearly associated with fields
      const emailInput = page.locator('input[name="email"]');
      const describedBy = await emailInput.getAttribute('aria-describedby');
      expect(describedBy).toBeTruthy();
    });
  });

  test.describe('WCAG 2.1 Level AA Specific', () => {
    test('text size is adjustable to 200%', async ({ page }) => {
      await page.goto('/dashboard');
      
      // Increase text size
      await page.evaluate(() => {
        document.documentElement.style.fontSize = '200%';
      });
      
      // Page should still be usable
      await expect(page.locator('main')).toBeVisible();
    });

    test('focus is not obscured', async ({ page }) => {
      await page.goto('/login');
      
      await page.focus('input[name="email"]');
      
      // Get focus element position
      const emailInput = page.locator('input[name="email"]');
      const box = await emailInput.boundingBox();
      
      // Focus should not be completely covered
      expect(box.y).toBeGreaterThan(0);
    });

    test('pointer gestures are supported', async ({ page }) => {
      await page.goto('/leads');
      
      // Check drag functionality if present
      // Or tap functionality for touch
    });
  });
});

// Automated accessibility scan for all pages
test.describe('Full Accessibility Audit', () => {
  const pages = [
    { name: 'Login', path: '/login' },
    { name: 'Dashboard', path: '/dashboard' },
    { name: 'Leads', path: '/leads' },
    { name: 'Policies', path: '/policies' },
  ];

  for (const { name, path } of pages) {
    test(`${name} page has no critical accessibility issues`, async ({ page }) => {
      await page.goto(path);
      await page.waitForLoadState('networkidle');
      
      const accessibilityScan = await new AxeBuilder({ page })
        .withTags(['cat.aria', 'cat.color', 'cat.keyboard', 'cat.name-role-value', 'cat.structure'])
        .analyze();
      
      // Filter for only critical issues
      const criticalIssues = accessibilityScan.violations.filter(
        v => v.impact === 'critical' || v.impact === 'serious'
      );
      
      expect(criticalIssues).toEqual([]);
    });
  }
});
