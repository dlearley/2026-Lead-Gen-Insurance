import { test, expect, Page } from '@playwright/test';
import { PrismaClient } from '@prisma/client';

let prisma: PrismaClient;

test.describe('Claims Processing E2E Workflow', () => {
  test.beforeAll(async () => {
    prisma = new PrismaClient();
    await prisma.$connect();
  });

  test.afterAll(async () => {
    await prisma.$disconnect();
  });

  test('Complete claims processing workflow', async ({ page }) => {
    // Step 1: Create a policy first (simulate existing customer)
    const lead = await prisma.lead.create({
      data: {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@example.com',
        phone: '+1234567890',
        insuranceType: 'auto',
        status: 'converted',
      }
    });

    const policy = await prisma.policy.create({
      data: {
        policyNumber: 'POL-2024-TEST001',
        leadId: lead.id,
        type: 'auto',
        status: 'active',
        premiumAmount: 1200,
        coverage: 25000,
        startDate: new Date(),
        endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      }
    });

    // Step 2: Customer reports claim via online form
    await page.goto('/claims/report');
    
    // Fill out claim form
    await page.fill('[data-testid="policy-number"]', 'POL-2024-TEST001');
    await page.fill('[data-testid="claim-type"]', 'auto_accident');
    await page.fill('[data-testid="incident-date"]', '2024-01-15');
    await page.fill('[data-testid="incident-time"]', '14:30');
    await page.fill('[data-testid="incident-location"]', 'Main St & 5th Ave, New York, NY');
    await page.fill('[data-testid="incident-description"]', 'Rear-end collision while waiting at red light');
    await page.fill('[data-testid="claimed-amount"]', '7500');
    
    // Select damage types
    await page.check('[data-testid="damage-front"]');
    await page.check('[data-testid="damage-rear"]');
    
    // Submit claim
    await page.click('[data-testid="submit-claim"]');
    
    // Verify claim submission
    await expect(page.locator('[data-testid="claim-success"]')).toContainText('Claim submitted successfully');
    
    // Extract claim number
    const claimNumber = await page.textContent('[data-testid="claim-number"]');
    expect(claimNumber).toMatch(/^CLM-\d{4}-\d{6}$/);

    // Step 3: Adjuster reviews claim in admin panel
    await page.goto('/adjuster/claims');
    await page.click(`[data-testid="claim-${claimNumber}"]`);
    
    // Verify claim details
    expect(await page.locator('[data-testid="claim-details"]')).toContainText('Rear-end collision');
    expect(await page.locator('[data-testid="claim-amount"]')).toContainText('$7,500');
    
    // Update claim status
    await page.selectOption('[data-testid="claim-status"]', 'review');
    await page.fill('[data-testid="adjuster-notes"]', 'Claim received, reviewing documentation');
    await page.click('[data-testid="save-claim"]');
    
    // Step 4: Upload required documents
    await page.click('[data-testid="upload-documents"]');
    
    // Upload police report
    const policeReportFile = await page.locator('input[type="file"]').first();
    await policeReportFile.setInputFiles({
      name: 'police-report.pdf',
      mimeType: 'application/pdf',
      buffer: Buffer.from('Police report content for testing')
    });
    
    // Upload photos
    const photosFile = await page.locator('input[type="file"]').last();
    await photosFile.setInputFiles({
      name: 'damage-photos.zip',
      mimeType: 'application/zip',
      buffer: Buffer.from('Damage photos content')
    });
    
    await page.click('[data-testid="submit-documents"]');
    
    // Step 5: Verify documents
    await page.goto('/adjuster/claims');
    await page.click(`[data-testid="claim-${claimNumber}"]`);
    
    // Mark documents as verified
    await page.click('[data-testid="verify-documents"]');
    await page.waitForSelector('[data-testid="documents-verified"]', { state: 'visible' });
    
    // Step 6: Approve claim
    await page.selectOption('[data-testid="claim-status"]', 'approved');
    await page.fill('[data-testid="approved-amount"]', '7000');
    await page.fill('[data-testid="approval-notes"]', 'Claim approved for repair costs');
    await page.click('[data-testid="approve-claim"]');
    
    // Step 7: Process payment
    await page.click('[data-testid="process-payment"]');
    await page.waitForSelector('[data-testid="payment-processed"]', { state: 'visible' });
    
    // Step 8: Update status to paid
    await page.selectOption('[data-testid="claim-status"]', 'paid');
    await page.click('[data-testid="save-claim"]');
    
    // Step 9: Verify final status in database
    const claim = await prisma.claim.findFirst({
      where: { claimNumber },
      include: {
        documents: true,
        notes: true,
        activities: true
      }
    });
    
    expect(claim?.status).toBe('paid');
    expect(claim?.approvedAmount).toBe(7000);
    expect(claim?.documents).toHaveLength(2); // Police report and photos
    expect(claim?.activities).toHaveLength(expect.any(Number)); // Activity log entries
    
    // Step 10: Customer receives confirmation email
    const emailResponse = await page.request.post('/api/email/claim-update', {
      data: {
        to: 'john.doe@example.com',
        claimNumber,
        status: 'paid',
        amount: 7000
      }
    });
    
    expect(emailResponse.ok()).toBeTruthy();
  });

  test('Claim rejection workflow', async ({ page }) => {
    // Create policy and claim
    const lead = await prisma.lead.create({
      data: {
        firstName: 'Jane',
        lastName: 'Smith',
        email: 'jane.smith@example.com',
        insuranceType: 'auto',
        status: 'converted',
      }
    });

    const policy = await prisma.policy.create({
      data: {
        policyNumber: 'POL-2024-TEST002',
        leadId: lead.id,
        type: 'auto',
        status: 'active',
        premiumAmount: 1000,
        coverage: 20000,
        startDate: new Date(),
        endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      }
    });

    const claim = await prisma.claim.create({
      data: {
        claimNumber: 'CLM-2024-TEST002',
        policyId: policy.id,
        leadId: lead.id,
        insuranceType: 'auto',
        claimType: 'auto_accident',
        status: 'submitted',
        incidentDate: new Date(),
        incidentDescription: 'Test incident',
        claimedAmount: 15000,
      }
    });

    // Adjuster reviews and rejects claim
    await page.goto('/adjuster/claims');
    await page.click(`[data-testid="claim-${claim.claimNumber}"]`);
    
    await page.selectOption('[data-testid="claim-status"]', 'denied');
    await page.fill('[data-testid="denial-reason"]', 'Coverage excluded');
    await page.fill('[data-testid="denial-notes"]', 'Incident occurred outside coverage area');
    await page.click('[data-testid="deny-claim"]');
    
    // Verify denial in database
    const deniedClaim = await prisma.claim.findUnique({
      where: { id: claim.id }
    });
    
    expect(deniedClaim?.status).toBe('denied');
    
    // Customer receives denial notification
    const emailResponse = await page.request.post('/api/email/claim-update', {
      data: {
        to: 'jane.smith@example.com',
        claimNumber: claim.claimNumber,
        status: 'denied',
        reason: 'Coverage excluded'
      }
    });
    
    expect(emailResponse.ok()).toBeTruthy();
  });

  test('Claims escalation for high-value claims', async ({ page }) => {
    // Create policy for high-value claim
    const lead = await prisma.lead.create({
      data: {
        firstName: 'VIP',
        lastName: 'Customer',
        email: 'vip@example.com',
        insuranceType: 'luxury_auto',
        status: 'converted',
      }
    });

    const policy = await prisma.policy.create({
      data: {
        policyNumber: 'POL-2024-LUXURY',
        leadId: lead.id,
        type: 'luxury_auto',
        status: 'active',
        premiumAmount: 5000,
        coverage: 100000,
        startDate: new Date(),
        endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      }
    });

    // Submit high-value claim
    await page.goto('/claims/report');
    await page.fill('[data-testid="policy-number"]', 'POL-2024-LUXURY');
    await page.selectOption('[data-testid="claim-type"]', 'auto_accident');
    await page.fill('[data-testid="incident-date"]', '2024-01-15');
    await page.fill('[data-testid="claimed-amount"]', '50000');
    await page.click('[data-testid="submit-claim"]');
    
    // Claim should be automatically escalated due to high value
    await page.goto('/admin/dashboard');
    await expect(page.locator('[data-testid="escalated-claims"]')).toContainText('1');
    
    // Verify claim is flagged for senior adjuster
    await page.goto('/adjuster/claims');
    await expect(page.locator(`[data-testid="claim-*"] [data-testid="high-value-flag"]`)).toBeVisible();
  });

  test('Document verification workflow', async ({ page }) => {
    // Create claim with required documents
    const lead = await prisma.lead.create({
      data: {
        firstName: 'Bob',
        lastName: 'Johnson',
        email: 'bob@example.com',
        insuranceType: 'auto',
        status: 'converted',
      }
    });

    const policy = await prisma.policy.create({
      data: {
        policyNumber: 'POL-2024-DOCS',
        leadId: lead.id,
        type: 'auto',
        status: 'active',
        premiumAmount: 1200,
        coverage: 25000,
        startDate: new Date(),
        endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      }
    });

    const claim = await prisma.claim.create({
      data: {
        claimNumber: 'CLM-2024-DOCS',
        policyId: policy.id,
        leadId: lead.id,
        insuranceType: 'auto',
        claimType: 'auto_accident',
        status: 'submitted',
        incidentDate: new Date(),
        incidentDescription: 'Document verification test',
        claimedAmount: 5000,
      }
    });

    // Upload documents
    await page.goto(`/claims/${claim.id}/documents`);
    
    // Upload multiple document types
    const documentTypes = [
      { type: 'police_report', file: 'police-report.pdf' },
      { type: 'medical_report', file: 'medical-report.pdf' },
      { type: 'repair_estimate', file: 'repair-estimate.pdf' },
      { type: 'photos', file: 'damage-photos.zip' }
    ];

    for (const docType of documentTypes) {
      await page.selectOption('[data-testid="document-type"]', docType.type);
      await page.setInputFiles('[data-testid="file-upload"]', {
        name: docType.file,
        mimeType: 'application/pdf',
        buffer: Buffer.from(`Test document: ${docType.file}`)
      });
      await page.fill('[data-testid="document-description"]', `Test ${docType.type}`);
      await page.click('[data-testid="upload-document"]');
    }

    // Adjuster reviews and verifies documents
    await page.goto('/adjuster/claims');
    await page.click(`[data-testid="claim-${claim.claimNumber}"]`);
    
    // Verify each document
    for (const docType of documentTypes) {
      await page.click(`[data-testid="verify-${docType.type}"]`);
      await page.waitForSelector(`[data-testid="${docType.type}-verified"]`, { state: 'visible' });
    }
    
    // All documents verified, can proceed
    await expect(page.locator('[data-testid="all-documents-verified"]')).toBeVisible();
    
    // Verify in database
    const documents = await prisma.claimDocument.findMany({
      where: { claimId: claim.id }
    });
    
    expect(documents).toHaveLength(4);
    expect(documents.every(doc => doc.isVerified)).toBe(true);
  });

  test('Claims audit trail', async ({ page }) => {
    // Create claim
    const lead = await prisma.lead.create({
      data: {
        firstName: 'Test',
        lastName: 'Audit',
        email: 'audit@example.com',
        insuranceType: 'auto',
        status: 'converted',
      }
    });

    const policy = await prisma.policy.create({
      data: {
        policyNumber: 'POL-2024-AUDIT',
        leadId: lead.id,
        type: 'auto',
        status: 'active',
        premiumAmount: 1200,
        coverage: 25000,
        startDate: new Date(),
        endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      }
    });

    const claim = await prisma.claim.create({
      data: {
        claimNumber: 'CLM-2024-AUDIT',
        policyId: policy.id,
        leadId: lead.id,
        insuranceType: 'auto',
        claimType: 'auto_accident',
        status: 'submitted',
        incidentDate: new Date(),
        incidentDescription: 'Audit trail test',
        claimedAmount: 5000,
      }
    });

    // Perform multiple actions on claim
    const actions = [
      { status: 'review', user: 'adjuster1' },
      { status: 'approved', user: 'senior-adjuster' },
      { notes: 'Additional documentation reviewed', user: 'adjuster1' }
    ];

    for (const action of actions) {
      await page.goto('/adjuster/claims');
      await page.click(`[data-testid="claim-${claim.claimNumber}"]`);
      
      if (action.status) {
        await page.selectOption('[data-testid="claim-status"]', action.status);
      }
      
      if (action.notes) {
        await page.fill('[data-testid="claim-notes"]', action.notes);
      }
      
      await page.click('[data-testid="save-claim"]');
    }

    // Verify audit trail in database
    const activities = await prisma.claimActivity.findMany({
      where: { claimId: claim.id },
      orderBy: { timestamp: 'asc' }
    });
    
    expect(activities).toHaveLength(expect.any(Number));
    
    // Check that status changes are logged
    const statusChanges = activities.filter(a => a.action === 'status_changed');
    expect(statusChanges).toHaveLength(2); // submitted -> review, review -> approved
    
    // Check that notes are logged
    const noteActivities = activities.filter(a => a.action === 'note_added');
    expect(noteActivities).toHaveLength(1);
  });
});