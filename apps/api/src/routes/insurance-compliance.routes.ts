import { Router } from 'express';
import { InsuranceLicenseService } from '../services/insurance-license.service.js';
import { CarrierAppointmentService } from '../services/carrier-appointment.service.js';
import { ProductComplianceService } from '../services/product-compliance.service.js';
import { FairLendingService } from '../services/fair-lending.service.js';
import { DisclosureService } from '../services/disclosure.service.js';
import { UnderwritingComplianceService } from '../services/underwriting-compliance.service.js';
import { AgentComplianceDashboardService } from '../services/agent-compliance-dashboard.service.js';

const router = Router();

// Services
const licenseService = new InsuranceLicenseService();
const appointmentService = new CarrierAppointmentService();
const productService = new ProductComplianceService();
const fairLendingService = new FairLendingService();
const disclosureService = new DisclosureService();
const underwritingService = new UnderwritingComplianceService();
const dashboardService = new AgentComplianceDashboardService();

// --- License Management ---

router.get('/licenses', async (req, res) => {
  try {
    const licenses = await licenseService.listAgentLicenses(req.query.agentId as string);
    res.json(licenses);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/licenses', async (req, res) => {
  try {
    const result = await licenseService.verifyLicense(req.body.agentId, req.body.licenseNumber);
    res.status(201).json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/licenses/:agentId', async (req, res) => {
  try {
    const licenses = await licenseService.listAgentLicenses(req.params.agentId);
    res.json(licenses);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/licenses/:agentId/verify', async (req, res) => {
  try {
    const result = await licenseService.verifyLicense(req.params.agentId, req.query.licenseNumber as string);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// --- Carrier Appointments ---

router.get('/appointments', async (req, res) => {
  try {
    const appointments = await appointmentService.getAgentAppointments(req.query.agentId as string);
    res.json(appointments);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/appointments', async (req, res) => {
  try {
    const appointment = await appointmentService.createAppointment(req.body.agentId, req.body.carrierId, req.body);
    res.status(201).json(appointment);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/appointments/:agentId', async (req, res) => {
  try {
    const appointments = await appointmentService.getAgentAppointments(req.params.agentId);
    res.json(appointments);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// --- Product Rules & Compliance ---

router.get('/products/rules', async (req, res) => {
  try {
    const rules = await productService.listProductRules(req.query.productType as string, req.query.jurisdiction as string);
    res.json(rules);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/quotes/validate', async (req, res) => {
  try {
    const result = await productService.validateQuoteCompliance(req.body);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// --- Fair Lending ---

router.get('/fair-lending/rules', async (req, res) => {
  // Mock listing of fair lending rules
  res.json([]);
});

router.post('/fair-lending/check', async (req, res) => {
  try {
    const result = await fairLendingService.validateApplicationForDiscrimination(req.body);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/fair-lending/metrics', async (req, res) => {
  try {
    const metrics = await fairLendingService.calculateDisparateImpactMetrics(req.query.productType as string);
    res.json(metrics);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// --- Disclosures ---

router.get('/disclosures/:state/:product', async (req, res) => {
  try {
    const disclosures = await disclosureService.getRequiredDisclosures(req.params.state, req.params.product);
    res.json(disclosures);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/disclosures/deliver', async (req, res) => {
  try {
    const delivery = await disclosureService.deliverDisclosure(req.body.leadId, req.body.disclosureId, req.body.method);
    res.status(201).json(delivery);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/disclosures/:leadId/acknowledge', async (req, res) => {
  try {
    await disclosureService.acknowledgeDisclosure(req.params.leadId, req.body.disclosureId);
    res.sendStatus(204);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// --- Underwriting ---

router.post('/underwriting/validate', async (req, res) => {
  try {
    const decision = await underwritingService.evaluateApplication(req.body);
    res.json(decision);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/underwriting/:appId/audit', async (req, res) => {
  try {
    const trail = await underwritingService.generateUnderwritingAuditTrail(req.params.appId);
    res.json(trail);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// --- Agent Compliance Status ---

router.get('/agents/:agentId/status', async (req, res) => {
  try {
    const status = await dashboardService.getAgentComplianceStatus(req.params.agentId);
    res.json(status);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/agents/:agentId/history', async (req, res) => {
  try {
    const history = await dashboardService.listAgentViolations(req.params.agentId);
    res.json(history);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
