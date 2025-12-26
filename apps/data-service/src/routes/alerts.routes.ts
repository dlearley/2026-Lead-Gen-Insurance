import { Router, Request, Response } from 'express';
import type { Router as RouterType } from 'express';
import { logger } from '@insurance-lead-gen/core';
import type {
  AlertRule,
  CreateAlertRuleDto,
  UpdateAlertRuleDto,
  AcknowledgeAlertDto,
  ResolveAlertDto,
} from '@insurance-lead-gen/types';
import { AlertService } from '../services/alert-service.js';

const router: RouterType = Router();
const alertService = new AlertService();

router.get('/check', async (req: Request, res: Response) => {
  try {
    const alerts = await alertService.checkMetrics();

    res.json({
      success: true,
      data: alerts,
      count: alerts.length,
    });
  } catch (error) {
    logger.error('Failed to check alerts', { error });
    res.status(500).json({
      success: false,
      error: 'Failed to check alerts',
    });
  }
});

router.post('/rules', async (req: Request, res: Response) => {
  try {
    const dto = req.body as CreateAlertRuleDto;

    const rule: AlertRule = {
      id: `rule-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name: dto.name,
      description: dto.description,
      metric: dto.metric,
      condition: dto.condition,
      severity: dto.severity,
      enabled: dto.enabled ?? true,
      cooldownMinutes: dto.cooldownMinutes ?? 60,
      notificationChannels: dto.notificationChannels || [],
      createdBy: 'user-id',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    alertService.addRule(rule);

    res.status(201).json({
      success: true,
      data: rule,
    });
  } catch (error) {
    logger.error('Failed to create alert rule', { error });
    res.status(500).json({
      success: false,
      error: 'Failed to create alert rule',
    });
  }
});

router.get('/rules', async (req: Request, res: Response) => {
  try {
    const rules = alertService.getAllRules();

    res.json({
      success: true,
      data: rules,
      count: rules.length,
    });
  } catch (error) {
    logger.error('Failed to fetch alert rules', { error });
    res.status(500).json({
      success: false,
      error: 'Failed to fetch alert rules',
    });
  }
});

router.get('/rules/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const rule = alertService.getRule(id);

    if (!rule) {
      return res.status(404).json({
        success: false,
        error: 'Alert rule not found',
      });
    }

    res.json({
      success: true,
      data: rule,
    });
  } catch (error) {
    logger.error('Failed to fetch alert rule', { error });
    res.status(500).json({
      success: false,
      error: 'Failed to fetch alert rule',
    });
  }
});

router.put('/rules/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updates = req.body as UpdateAlertRuleDto;

    const existingRule = alertService.getRule(id);
    if (!existingRule) {
      return res.status(404).json({
        success: false,
        error: 'Alert rule not found',
      });
    }

    const updatedRule: AlertRule = {
      ...existingRule,
      ...updates,
      updatedAt: new Date(),
    };

    alertService.addRule(updatedRule);

    res.json({
      success: true,
      data: updatedRule,
    });
  } catch (error) {
    logger.error('Failed to update alert rule', { error });
    res.status(500).json({
      success: false,
      error: 'Failed to update alert rule',
    });
  }
});

router.delete('/rules/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    alertService.removeRule(id);

    res.json({
      success: true,
      message: 'Alert rule deleted',
    });
  } catch (error) {
    logger.error('Failed to delete alert rule', { error });
    res.status(500).json({
      success: false,
      error: 'Failed to delete alert rule',
    });
  }
});

router.post('/:id/acknowledge', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const dto = req.body as AcknowledgeAlertDto;

    await alertService.acknowledgeAlert(id, dto.userId);

    res.json({
      success: true,
      message: 'Alert acknowledged',
    });
  } catch (error) {
    logger.error('Failed to acknowledge alert', { error });
    res.status(500).json({
      success: false,
      error: 'Failed to acknowledge alert',
    });
  }
});

router.post('/:id/resolve', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const dto = req.body as ResolveAlertDto;

    await alertService.resolveAlert(id, dto.userId, dto.resolution);

    res.json({
      success: true,
      message: 'Alert resolved',
    });
  } catch (error) {
    logger.error('Failed to resolve alert', { error });
    res.status(500).json({
      success: false,
      error: 'Failed to resolve alert',
    });
  }
});

export { router as alertsRouter };
