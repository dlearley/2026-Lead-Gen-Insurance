import { test, expect, Page } from '@playwright/test';
import { PrismaClient } from '@prisma/client';

let prisma: PrismaClient;

test.describe('Lead to Policy E2E Workflow', () => {
  test.beforeAll(async () => {
    prisma = new PrismaClient();
    await prisma.$connect();
  });

  test.afterAll(async () => {
    await prisma.$disconnect();
  });

  test('Complete customer journey from lead to policy', async ({ page }) => {
    // Step 1: Customer submits lead via website form
    await page.goto('/lead-form');
    
    // Fill out lead form
    await page.fill('[data-testid="first-name"]', 'John');
    await page.fill('[data-testid="last-name"]', 'Doe');
    await page.fill('[data-testid="email"]', 'john.doe@example.com');
    await page.fill('[data-testid="phone"]', '+1234567890');
    await page.selectOption('[data-testid="insurance-type"]', 'auto');
    await page.fill('[data-testid="vehicle-year"]', '2020');
    await page.fill('[data-testid="vehicle-make"]', 'Toyota');
    await page.fill('[data-testid="vehicle-model"]', 'Camry');
    await page.selectOption('[data-testid="coverage-level"]', 'comprehensive');
    
    // Submit form
    await page.click('[data-testid="submit-lead"]');
    
    // Verify lead submission confirmation
    await expect(page.locator('[data-testid="success-message"]')).toContainText('Thank you for your interest');
    
    // Extract lead ID from success page for database verification
    const leadId = await page.getAttribute('[data-testid="success-message"]', 'data-lead-id');
    expect(leadId).toBeTruthy();

    // Step 2: Agent reviews and qualifies lead
    await page.goto('/admin/leads');
    await page.click(`[data-testid="lead-${leadId}"]`);
    
    // Verify lead data
    expect(await page.locator('[data-testid="lead-name"]')).toContainText('John Doe');
    expect(await page.locator('[data-testid="lead-email"]')).toContainText('john.doe@example.com');
    
    // Update lead status
    await page.selectOption('[data-testid="lead-status"]', 'contacted');
    await page.fill('[data-testid="agent-notes"]', 'Contacted customer, interested in comprehensive coverage');
    await page.click('[data-testid="save-lead"]');
    
    // Step 3: Schedule appointment
    await page.click('[data-testid="schedule-appointment"]');
    await page.selectOption('[data-testid="appointment-date"]', '2024-02-01');
    await page.selectOption('[data-testid="appointment-time"]', '10:00');
    await page.click('[data-testid="confirm-appointment"]');
    
    // Step 4: Generate quote
    await page.click('[data-testid="generate-quote"]');
    await page.waitForSelector('[data-testid="quote-details"]', { state: 'visible' });
    
    // Verify quote details
    expect(await page.locator('[data-testid="quote-amount"]')).toContainText('$120');
    expect(await page.locator('[data-testid="coverage-details"]')).toContainText('Comprehensive');
    
    // Step 5: Customer accepts quote
    await page.click('[data-testid="accept-quote"]');
    await page.waitForSelector('[data-testid="policy-number"]', { state: 'visible' });
    
    // Extract policy number
    const policyNumber = await page.textContent('[data-testid="policy-number"]');
    expect(policyNumber).toMatch(/^POL-\d{10}$/);
    
    // Step 6: Verify in database
    const policy = await prisma.policy.findFirst({
      where: { policyNumber },
      include: { lead: true }
    });
    
    expect(policy).toBeTruthy();
    expect(policy?.status).toBe('active');
    expect(policy?.lead?.email).toBe('john.doe@example.com');
    
    // Step 7: Send welcome email
    const emailResponse = await page.request.post('/api/email/send-welcome', {
      data: {
        to: 'john.doe@example.com',
        policyNumber,
        firstName: 'John'
      }
    });
    
    expect(emailResponse.ok()).toBeTruthy();
  });

  test('Lead qualification and rejection workflow', async ({ page }) => {
    // Submit lead
    await page.goto('/lead-form');
    await page.fill('[data-testid="first-name"]', 'Jane');
    await page.fill('[data-testid="last-name"]', 'Smith');
    await page.fill('[data-testid="email"]', 'jane.smith@example.com');
    await page.fill('[data-testid="phone"]', '+1987654321');
    await page.selectOption('[data-testid="insurance-type"]', 'auto');
    await page.click('[data-testid="submit-lead"]');
    
    const leadId = await page.getAttribute('[data-testid="success-message"]', 'data-lead-id');
    
    // Agent reviews and rejects lead
    await page.goto('/admin/leads');
    await page.click(`[data-testid="lead-${leadId}"]`);
    
    await page.selectOption('[data-testid="lead-status"]', 'cancelled');
    await page.selectOption('[data-testid="rejection-reason"]', 'ineligible');
    await page.fill('[data-testid="agent-notes"]', 'Driver license suspended');
    await page.click('[data-testid="save-lead"]');
    
    // Verify rejection email sent
    await page.waitForSelector('[data-testid="rejection-confirmation"]', { state: 'visible' });
    
    // Verify in database
    const lead = await prisma.lead.findUnique({ where: { id: leadId! } });
    expect(lead?.status).toBe('cancelled');
  });

  test('Lead reassignment workflow', async ({ page }) => {
    // Create lead
    const leadData = {
      firstName: 'Bob',
      lastName: 'Johnson',
      email: 'bob.johnson@example.com',
      insuranceType: 'home',
    };
    
    const lead = await prisma.lead.create({ data: leadData });
    
    // Agent A gets assigned the lead initially
    await page.goto('/agent-a/leads');
    await page.click(`[data-testid="lead-${lead.id}"]`);
    
    // Agent A reassigns to Agent B
    await page.click('[data-testid="reassign-lead"]');
    await page.selectOption('[data-testid="new-agent"]', 'agent-b');
    await page.click('[data-testid="confirm-reassignment"]');
    
    // Verify lead appears in Agent B's queue
    await page.goto('/agent-b/leads');
    await expect(page.locator(`[data-testid="lead-${lead.id}"]`)).toBeVisible();
    
    // Verify in database
    const updatedLead = await prisma.lead.findUnique({ 
      where: { id: lead.id },
      include: { assignedTo: true }
    });
    
    expect(updatedLead?.assignedTo?.email).toBe('agent-b@example.com');
  });

  test('High-priority lead escalation', async ({ page }) => {
    // Submit high-value lead
    await page.goto('/lead-form');
    await page.fill('[data-testid="first-name"]', 'VIP');
    await page.fill('[data-testid="last-name"]', 'Customer');
    await page.fill('[data-testid="email"]', 'vip@example.com');
    await page.fill('[data-testid="phone"]', '+1555555555');
    await page.selectOption('[data-testid="insurance-type"]', 'luxury_auto');
    await page.fill('[data-testid="vehicle-value"]', '100000');
    await page.selectOption('[data-testid="priority"]', 'high');
    await page.click('[data-testid="submit-lead"]');
    
    const leadId = await page.getAttribute('[data-testid="success-message"]', 'data-lead-id');
    
    // Lead should be automatically escalated
    await page.goto('/admin/dashboard');
    await expect(page.locator('[data-testid="escalated-leads"]')).toContainText('1');
    
    // Verify priority assignment
    await page.goto('/admin/leads');
    const leadPriority = await page.getAttribute(`[data-testid="lead-${leadId}"]`, 'data-priority');
    expect(leadPriority).toBe('high');
  });
});