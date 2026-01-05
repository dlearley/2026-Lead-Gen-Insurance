/**
 * Phase 25.1E: Compliance Audit API Routes
 */

import { Router } from 'express';
import type { Request, Response } from 'express';
import { logger } from '@insurance-lead-gen/core';
import { prisma } from '../infra/prisma.js';
import { ImmutableAuditTrailService } from '../services/immutable-audit-trail.service.js';
import { ComplianceEventTrackerService } from '../services/compliance-event-tracker.service.js';
import { AuditLogIntegrityService } from '../services/audit-log-integrity.service.js';
import { AuditTrailQueryService } from '../services/audit-trail-query.service.js';
import { SensitiveDataAccessService } from '../services/sensitive-data-access.service.js';

const router = Router();

// Initialize services
const auditService = new ImmutableAuditTrailService(prisma);
const complianceService = new ComplianceEventTrackerService(prisma);
const integrityService = new AuditLogIntegrityService(prisma);
const queryService = new AuditTrailQueryService(prisma);
const dataAccessService = new SensitiveDataAccessService(prisma);

// ========================================
// Audit Trail Query Routes
// ========================================

/**
 * GET /api/v1/audit/logs
 * List audit logs with filters
 */
router.get('/audit/logs', async (req: Request, res: Response): Promise<void> => {
  try {
    const filters = {
      actorId: req.query.actorId as string,
      resourceId: req.query.resourceId as string,
      resourceType: req.query.resourceType as string,
      eventType: req.query.eventType as string,
      eventCategory: req.query.eventCategory as string,
      severity: req.query.severity as string,
      limit: req.query.limit ? parseInt(req.query.limit as string) : 100,
      offset: req.query.offset ? parseInt(req.query.offset as string) : 0,
      dateRange:
        req.query.startDate && req.query.endDate
          ? {
              start: new Date(req.query.startDate as string),
              end: new Date(req.query.endDate as string),
            }
          : undefined,
    };

    const logs = await queryService.query(filters);
    res.json({ success: true, data: logs, count: logs.length });
  } catch (error) {
    logger.error('Failed to query audit logs', { error });
    res.status(500).json({ success: false, error: 'Failed to query audit logs' });
  }
});

/**
 * GET /api/v1/audit/logs/:id
 * Get a single audit log by ID
 */
router.get('/audit/logs/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const log = await auditService.getAuditLog(req.params.id);
    if (!log) {
      res.status(404).json({ success: false, error: 'Audit log not found' });
      return;
    }
    res.json({ success: true, data: log });
  } catch (error) {
    logger.error('Failed to get audit log', { error });
    res.status(500).json({ success: false, error: 'Failed to get audit log' });
  }
});

/**
 * GET /api/v1/audit/logs/search
 * Search audit logs
 */
router.get('/audit/logs/search', async (req: Request, res: Response): Promise<void> => {
  try {
    const searchTerm = req.query.q as string;
    if (!searchTerm) {
      res.status(400).json({ success: false, error: 'Search term required' });
      return;
    }

    const results = await queryService.search(searchTerm, {
      eventTypes: req.query.eventTypes
        ? (req.query.eventTypes as string).split(',')
        : undefined,
      categories: req.query.categories
        ? (req.query.categories as string).split(',')
        : undefined,
      dateRange:
        req.query.startDate && req.query.endDate
          ? {
              start: new Date(req.query.startDate as string),
              end: new Date(req.query.endDate as string),
            }
          : undefined,
    });

    res.json({ success: true, data: results, count: results.length });
  } catch (error) {
    logger.error('Failed to search audit logs', { error });
    res.status(500).json({ success: false, error: 'Failed to search audit logs' });
  }
});

/**
 * GET /api/v1/audit/timeline/:resourceId
 * Get audit timeline for a resource
 */
router.get('/audit/timeline/:resourceId', async (req: Request, res: Response): Promise<void> => {
  try {
    const timeline = await queryService.getTimelineFor(req.params.resourceId);
    res.json({ success: true, data: timeline });
  } catch (error) {
    logger.error('Failed to get timeline', { error });
    res.status(500).json({ success: false, error: 'Failed to get timeline' });
  }
});

/**
 * GET /api/v1/audit/actor/:actorId
 * Get audit trail for an actor (user/system)
 */
router.get('/audit/actor/:actorId', async (req: Request, res: Response): Promise<void> => {
  try {
    const dateRange =
      req.query.startDate && req.query.endDate
        ? {
            start: new Date(req.query.startDate as string),
            end: new Date(req.query.endDate as string),
          }
        : undefined;

    const logs = await auditService.getActorHistory(req.params.actorId, dateRange);
    res.json({ success: true, data: logs, count: logs.length });
  } catch (error) {
    logger.error('Failed to get actor history', { error });
    res.status(500).json({ success: false, error: 'Failed to get actor history' });
  }
});

// ========================================
// Compliance Events Routes
// ========================================

/**
 * GET /api/v1/compliance/events
 * List compliance events
 */
router.get('/compliance/events', async (req: Request, res: Response): Promise<void> => {
  try {
    const filters = {
      eventType: req.query.eventType as string,
      jurisdiction: req.query.jurisdiction as string,
      status: req.query.status as string,
      entityType: req.query.entityType as string,
      entityId: req.query.entityId as string,
      limit: req.query.limit ? parseInt(req.query.limit as string) : 100,
      offset: req.query.offset ? parseInt(req.query.offset as string) : 0,
      dateRange:
        req.query.startDate && req.query.endDate
          ? {
              start: new Date(req.query.startDate as string),
              end: new Date(req.query.endDate as string),
            }
          : undefined,
    };

    const events = await complianceService.getComplianceEvents(filters);
    res.json({ success: true, data: events, count: events.length });
  } catch (error) {
    logger.error('Failed to get compliance events', { error });
    res.status(500).json({ success: false, error: 'Failed to get compliance events' });
  }
});

/**
 * GET /api/v1/compliance/events/:id
 * Get compliance event details
 */
router.get('/compliance/events/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const event = await complianceService.getComplianceEvent(req.params.id);
    if (!event) {
      res.status(404).json({ success: false, error: 'Compliance event not found' });
      return;
    }
    res.json({ success: true, data: event });
  } catch (error) {
    logger.error('Failed to get compliance event', { error });
    res.status(500).json({ success: false, error: 'Failed to get compliance event' });
  }
});

/**
 * GET /api/v1/compliance/events/timeline
 * Get compliance timeline for an entity
 */
router.get('/compliance/events/timeline', async (req: Request, res: Response): Promise<void> => {
  try {
    const entityId = req.query.entityId as string;
    if (!entityId) {
      res.status(400).json({ success: false, error: 'Entity ID required' });
      return;
    }

    const timeline = await complianceService.generateComplianceTimeline(entityId);
    res.json({ success: true, data: timeline });
  } catch (error) {
    logger.error('Failed to get compliance timeline', { error });
    res.status(500).json({ success: false, error: 'Failed to get compliance timeline' });
  }
});

// ========================================
// Violations Routes
// ========================================

/**
 * GET /api/v1/compliance/violations
 * List violations
 */
router.get('/compliance/violations', async (req: Request, res: Response): Promise<void> => {
  try {
    const filters: any = {};

    if (req.query.violationType) filters.violationType = req.query.violationType;
    if (req.query.status) filters.status = req.query.status;
    if (req.query.severityLevel) filters.severityLevel = req.query.severityLevel;

    const violations = await prisma.complianceViolationLog.findMany({
      where: filters,
      orderBy: { detectionDate: 'desc' },
      take: req.query.limit ? parseInt(req.query.limit as string) : 100,
    });

    res.json({ success: true, data: violations, count: violations.length });
  } catch (error) {
    logger.error('Failed to get violations', { error });
    res.status(500).json({ success: false, error: 'Failed to get violations' });
  }
});

/**
 * GET /api/v1/compliance/violations/:id
 * Get violation details
 */
router.get('/compliance/violations/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const violation = await prisma.complianceViolationLog.findUnique({
      where: { id: req.params.id },
    });

    if (!violation) {
      res.status(404).json({ success: false, error: 'Violation not found' });
      return;
    }

    res.json({ success: true, data: violation });
  } catch (error) {
    logger.error('Failed to get violation', { error });
    res.status(500).json({ success: false, error: 'Failed to get violation' });
  }
});

/**
 * POST /api/v1/compliance/violations/:id/remediate
 * Start remediation for a violation
 */
router.post(
  '/compliance/violations/:id/remediate',
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { plan } = req.body;
      if (!plan) {
        res.status(400).json({ success: false, error: 'Remediation plan required' });
        return;
      }

      const violation = await prisma.complianceViolationLog.update({
        where: { id: req.params.id },
        data: {
          status: 'InProgress',
          remediationPlan: plan,
        },
      });

      res.json({ success: true, data: violation });
    } catch (error) {
      logger.error('Failed to start remediation', { error });
      res.status(500).json({ success: false, error: 'Failed to start remediation' });
    }
  }
);

/**
 * GET /api/v1/compliance/violations/:id/status
 * Get remediation status
 */
router.get(
  '/compliance/violations/:id/status',
  async (req: Request, res: Response): Promise<void> => {
    try {
      const violation = await prisma.complianceViolationLog.findUnique({
        where: { id: req.params.id },
        select: {
          status: true,
          remediationPlan: true,
          remediationDate: true,
          remediationDetails: true,
        },
      });

      if (!violation) {
        res.status(404).json({ success: false, error: 'Violation not found' });
        return;
      }

      res.json({ success: true, data: violation });
    } catch (error) {
      logger.error('Failed to get remediation status', { error });
      res.status(500).json({ success: false, error: 'Failed to get remediation status' });
    }
  }
);

// ========================================
// Audit Integrity Routes
// ========================================

/**
 * POST /api/v1/audit/verify-integrity
 * Verify audit log integrity
 */
router.post('/verify-integrity', async (req: Request, res: Response): Promise<void> => {
  try {
    const { startSeq, endSeq } = req.body;
    const result = await integrityService.verifyIntegrity(
      startSeq ? BigInt(startSeq) : undefined,
      endSeq ? BigInt(endSeq) : undefined
    );

    res.json({ success: true, data: result });
  } catch (error) {
    logger.error('Failed to verify integrity', { error });
    res.status(500).json({ success: false, error: 'Failed to verify integrity' });
  }
});

/**
 * GET /api/v1/audit/integrity-report
 * Get integrity report
 */
router.get('/integrity-report', async (req: Request, res: Response): Promise<void> => {
  try {
    const report = await integrityService.generateIntegrityReport();
    res.json({ success: true, data: report });
  } catch (error) {
    logger.error('Failed to get integrity report', { error });
    res.status(500).json({ success: false, error: 'Failed to get integrity report' });
  }
});

/**
 * GET /api/v1/audit/tampering-alerts
 * Get tampering alerts
 */
router.get('/tampering-alerts', async (req: Request, res: Response): Promise<void> => {
  try {
    const alerts = await auditService.detectTamperingAttempts();
    res.json({ success: true, data: alerts, count: alerts.length });
  } catch (error) {
    logger.error('Failed to get tampering alerts', { error });
    res.status(500).json({ success: false, error: 'Failed to get tampering alerts' });
  }
});

// ========================================
// Sensitive Data Access Routes
// ========================================

/**
 * GET /api/v1/audit/data-access
 * Get data access logs
 */
router.get('/data-access', async (req: Request, res: Response): Promise<void> => {
  try {
    const filters: any = {};

    if (req.query.accessedBy) filters.accessedBy = req.query.accessedBy;
    if (req.query.dataType) filters.dataType = req.query.dataType;
    if (req.query.startDate && req.query.endDate) {
      filters.accessDate = {
        gte: new Date(req.query.startDate as string),
        lte: new Date(req.query.endDate as string),
      };
    }

    const logs = await prisma.sensitiveDataAccessLog.findMany({
      where: filters,
      orderBy: { accessDate: 'desc' },
      take: req.query.limit ? parseInt(req.query.limit as string) : 100,
    });

    res.json({ success: true, data: logs, count: logs.length });
  } catch (error) {
    logger.error('Failed to get data access logs', { error });
    res.status(500).json({ success: false, error: 'Failed to get data access logs' });
  }
});

/**
 * GET /api/v1/audit/data-access/:leadId
 * Get data access for a specific lead
 */
router.get('/data-access/:leadId', async (req: Request, res: Response): Promise<void> => {
  try {
    const history = await dataAccessService.getAccessHistory(req.params.leadId, 'leadId');
    res.json({ success: true, data: history, count: history.length });
  } catch (error) {
    logger.error('Failed to get data access history', { error });
    res.status(500).json({ success: false, error: 'Failed to get data access history' });
  }
});

/**
 * GET /api/v1/audit/suspicious-access
 * Get suspicious access alerts
 */
router.get('/suspicious-access', async (req: Request, res: Response): Promise<void> => {
  try {
    const alerts = await dataAccessService.detectSuspiciousAccess();
    res.json({ success: true, data: alerts, count: alerts.length });
  } catch (error) {
    logger.error('Failed to get suspicious access', { error });
    res.status(500).json({ success: false, error: 'Failed to get suspicious access' });
  }
});

// ========================================
// Certification Status Route
// ========================================

/**
 * GET /api/v1/audit/certification-status
 * Get compliance certification status
 */
router.get('/certification-status', async (req: Request, res: Response): Promise<void> => {
  try {
    const certifications = await prisma.complianceCertification.findMany({
      orderBy: { expiryDate: 'asc' },
    });

    const now = new Date();
    const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    const active = certifications.filter((c) => c.status === 'Active');
    const expiring = certifications.filter(
      (c) => c.expiryDate && c.expiryDate <= thirtyDaysFromNow && c.expiryDate > now
    );
    const expired = certifications.filter((c) => c.expiryDate && c.expiryDate <= now);

    res.json({
      success: true,
      data: {
        active,
        expiring,
        expired,
        total: certifications.length,
      },
    });
  } catch (error) {
    logger.error('Failed to get certification status', { error });
    res.status(500).json({ success: false, error: 'Failed to get certification status' });
  }
});

export default router;
