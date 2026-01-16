/**
 * Operations Dashboard API
 * 
 * Provides unified operational insights across all services including:
 * - Service health and status
 * - SLO/SLA metrics
 * - Incident management
 * - Runbook access
 * - Performance metrics
 */

import { Router, Request, Response } from 'express';
import { HealthService } from '../monitoring/health';
import { OperationalExcellenceManager } from './operational-excellence-manager';
import { register } from 'prom-client';
import { logger } from '../logger';

export interface OperationsDashboardConfig {
  serviceName: string;
  healthService?: HealthService;
  operationalManager?: OperationalExcellenceManager;
}

export class OperationsDashboard {
  private router: Router;
  private serviceName: string;
  private healthService?: HealthService;
  private operationalManager?: OperationalExcellenceManager;

  constructor(config: OperationsDashboardConfig) {
    this.serviceName = config.serviceName;
    this.healthService = config.healthService;
    this.operationalManager = config.operationalManager;
    this.router = Router();
    this.setupRoutes();
  }

  private setupRoutes(): void {
    // Dashboard overview
    this.router.get('/dashboard', this.getDashboardOverview.bind(this));

    // Health endpoints
    this.router.get('/health/status', this.getHealthStatus.bind(this));
    this.router.get('/health/history', this.getHealthHistory.bind(this));
    this.router.get('/health/summary', this.getHealthSummary.bind(this));

    // SLO/SLA endpoints
    this.router.get('/slos', this.getSLOs.bind(this));
    this.router.get('/slos/:id', this.getSLO.bind(this));
    this.router.get('/slas', this.getSLAs.bind(this));
    this.router.get('/slas/:id', this.getSLA.bind(this));

    // Incident management
    this.router.get('/incidents', this.getIncidents.bind(this));
    this.router.get('/incidents/active', this.getActiveIncidents.bind(this));
    this.router.get('/incidents/:id', this.getIncident.bind(this));
    this.router.post('/incidents', this.createIncident.bind(this));
    this.router.patch('/incidents/:id', this.updateIncident.bind(this));

    // Runbooks
    this.router.get('/runbooks', this.getRunbooks.bind(this));
    this.router.get('/runbooks/:id', this.getRunbook.bind(this));
    this.router.get('/runbooks/category/:category', this.getRunbooksByCategory.bind(this));

    // Metrics and performance
    this.router.get('/metrics/summary', this.getMetricsSummary.bind(this));
    this.router.get('/performance', this.getPerformanceMetrics.bind(this));

    // Operational insights
    this.router.get('/insights', this.getOperationalInsights.bind(this));
    this.router.get('/alerts', this.getActiveAlerts.bind(this));
  }

  /**
   * Get dashboard overview with key metrics
   */
  private async getDashboardOverview(req: Request, res: Response): Promise<void> {
    try {
      const overview: any = {
        service: this.serviceName,
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
      };

      // Health status
      if (this.healthService) {
        const health = await this.healthService.checkHealth();
        overview.health = {
          status: health.status,
          dependencies: health.dependencies.map(d => ({
            name: d.name,
            status: d.status,
          })),
        };
      }

      // SLO summary
      if (this.operationalManager) {
        const slos = this.operationalManager.getAllSLOs();
        const sloSummary = {
          total: slos.length,
          healthy: slos.filter(s => s.status === 'healthy').length,
          warning: slos.filter(s => s.status === 'warning').length,
          critical: slos.filter(s => s.status === 'critical').length,
        };
        overview.slos = sloSummary;

        // Incident summary
        const incidents = this.operationalManager.getAllIncidents();
        const activeIncidents = incidents.filter(i => i.status !== 'closed' && i.status !== 'resolved');
        overview.incidents = {
          total: incidents.length,
          active: activeIncidents.length,
          critical: activeIncidents.filter(i => i.severity === 'critical').length,
          high: activeIncidents.filter(i => i.severity === 'high').length,
        };
      }

      // System metrics
      overview.system = {
        memory: process.memoryUsage(),
        cpu: process.cpuUsage(),
        platform: process.platform,
        nodeVersion: process.version,
      };

      res.json(overview);
    } catch (error) {
      logger.error('Error getting dashboard overview', { error });
      res.status(500).json({ error: 'Failed to get dashboard overview' });
    }
  }

  /**
   * Get current health status
   */
  private async getHealthStatus(req: Request, res: Response): Promise<void> {
    try {
      if (!this.healthService) {
        res.json({
          status: 'unknown',
          message: 'Health service not configured',
        });
        return;
      }

      const health = await this.healthService.checkHealth();
      res.json(health);
    } catch (error) {
      logger.error('Error getting health status', { error });
      res.status(500).json({ error: 'Failed to get health status' });
    }
  }

  /**
   * Get health check history
   */
  private getHealthHistory(req: Request, res: Response): void {
    try {
      if (!this.healthService) {
        res.json({ history: [] });
        return;
      }

      const limit = parseInt(req.query.limit as string) || 50;
      const history = this.healthService.getHealthHistory(limit);
      res.json({ history });
    } catch (error) {
      logger.error('Error getting health history', { error });
      res.status(500).json({ error: 'Failed to get health history' });
    }
  }

  /**
   * Get health summary statistics
   */
  private getHealthSummary(req: Request, res: Response): void {
    try {
      if (!this.healthService) {
        res.json({
          uptime: 0,
          averageResponseTime: 0,
          availability: 0,
        });
        return;
      }

      const minutes = parseInt(req.query.minutes as string) || 60;
      const summary = this.healthService.getHealthSummary(minutes);
      res.json(summary);
    } catch (error) {
      logger.error('Error getting health summary', { error });
      res.status(500).json({ error: 'Failed to get health summary' });
    }
  }

  /**
   * Get all SLOs
   */
  private getSLOs(req: Request, res: Response): void {
    try {
      if (!this.operationalManager) {
        res.json({ slos: [] });
        return;
      }

      const slos = this.operationalManager.getAllSLOs();
      res.json({ slos });
    } catch (error) {
      logger.error('Error getting SLOs', { error });
      res.status(500).json({ error: 'Failed to get SLOs' });
    }
  }

  /**
   * Get specific SLO
   */
  private getSLO(req: Request, res: Response): void {
    try {
      if (!this.operationalManager) {
        res.status(404).json({ error: 'Operational manager not configured' });
        return;
      }

      const slo = this.operationalManager.getSLO(req.params.id);
      if (!slo) {
        res.status(404).json({ error: 'SLO not found' });
        return;
      }

      res.json({ slo });
    } catch (error) {
      logger.error('Error getting SLO', { error });
      res.status(500).json({ error: 'Failed to get SLO' });
    }
  }

  /**
   * Get all SLAs
   */
  private getSLAs(req: Request, res: Response): void {
    try {
      if (!this.operationalManager) {
        res.json({ slas: [] });
        return;
      }

      const slas = this.operationalManager.getAllSLAs();
      res.json({ slas });
    } catch (error) {
      logger.error('Error getting SLAs', { error });
      res.status(500).json({ error: 'Failed to get SLAs' });
    }
  }

  /**
   * Get specific SLA
   */
  private getSLA(req: Request, res: Response): void {
    try {
      if (!this.operationalManager) {
        res.status(404).json({ error: 'Operational manager not configured' });
        return;
      }

      const sla = this.operationalManager.getSLA(req.params.id);
      if (!sla) {
        res.status(404).json({ error: 'SLA not found' });
        return;
      }

      res.json({ sla });
    } catch (error) {
      logger.error('Error getting SLA', { error });
      res.status(500).json({ error: 'Failed to get SLA' });
    }
  }

  /**
   * Get all incidents
   */
  private getIncidents(req: Request, res: Response): void {
    try {
      if (!this.operationalManager) {
        res.json({ incidents: [] });
        return;
      }

      const incidents = this.operationalManager.getAllIncidents();
      res.json({ incidents });
    } catch (error) {
      logger.error('Error getting incidents', { error });
      res.status(500).json({ error: 'Failed to get incidents' });
    }
  }

  /**
   * Get active incidents
   */
  private getActiveIncidents(req: Request, res: Response): void {
    try {
      if (!this.operationalManager) {
        res.json({ incidents: [] });
        return;
      }

      const incidents = this.operationalManager.getAllIncidents();
      const activeIncidents = incidents.filter(i => i.status !== 'closed' && i.status !== 'resolved');
      res.json({ incidents: activeIncidents });
    } catch (error) {
      logger.error('Error getting active incidents', { error });
      res.status(500).json({ error: 'Failed to get active incidents' });
    }
  }

  /**
   * Get specific incident
   */
  private getIncident(req: Request, res: Response): void {
    try {
      if (!this.operationalManager) {
        res.status(404).json({ error: 'Operational manager not configured' });
        return;
      }

      const incident = this.operationalManager.getIncident(req.params.id);
      if (!incident) {
        res.status(404).json({ error: 'Incident not found' });
        return;
      }

      res.json({ incident });
    } catch (error) {
      logger.error('Error getting incident', { error });
      res.status(500).json({ error: 'Failed to get incident' });
    }
  }

  /**
   * Create new incident
   */
  private createIncident(req: Request, res: Response): void {
    try {
      if (!this.operationalManager) {
        res.status(503).json({ error: 'Operational manager not configured' });
        return;
      }

      const incident = this.operationalManager.createIncident(req.body);
      res.status(201).json({ incident });
    } catch (error) {
      logger.error('Error creating incident', { error });
      res.status(500).json({ error: 'Failed to create incident' });
    }
  }

  /**
   * Update incident
   */
  private updateIncident(req: Request, res: Response): void {
    try {
      if (!this.operationalManager) {
        res.status(503).json({ error: 'Operational manager not configured' });
        return;
      }

      const incident = this.operationalManager.updateIncident(req.params.id, req.body);
      if (!incident) {
        res.status(404).json({ error: 'Incident not found' });
        return;
      }

      res.json({ incident });
    } catch (error) {
      logger.error('Error updating incident', { error });
      res.status(500).json({ error: 'Failed to update incident' });
    }
  }

  /**
   * Get all runbooks
   */
  private getRunbooks(req: Request, res: Response): void {
    try {
      if (!this.operationalManager) {
        res.json({ runbooks: [] });
        return;
      }

      const runbooks = this.operationalManager.getAllRunbooks();
      res.json({ runbooks });
    } catch (error) {
      logger.error('Error getting runbooks', { error });
      res.status(500).json({ error: 'Failed to get runbooks' });
    }
  }

  /**
   * Get specific runbook
   */
  private getRunbook(req: Request, res: Response): void {
    try {
      if (!this.operationalManager) {
        res.status(404).json({ error: 'Operational manager not configured' });
        return;
      }

      const runbook = this.operationalManager.getRunbook(req.params.id);
      if (!runbook) {
        res.status(404).json({ error: 'Runbook not found' });
        return;
      }

      res.json({ runbook });
    } catch (error) {
      logger.error('Error getting runbook', { error });
      res.status(500).json({ error: 'Failed to get runbook' });
    }
  }

  /**
   * Get runbooks by category
   */
  private getRunbooksByCategory(req: Request, res: Response): void {
    try {
      if (!this.operationalManager) {
        res.json({ runbooks: [] });
        return;
      }

      const category = req.params.category as any;
      const runbooks = this.operationalManager.getRunbooksByCategory(category);
      res.json({ runbooks });
    } catch (error) {
      logger.error('Error getting runbooks by category', { error });
      res.status(500).json({ error: 'Failed to get runbooks by category' });
    }
  }

  /**
   * Get metrics summary
   */
  private async getMetricsSummary(req: Request, res: Response): Promise<void> {
    try {
      const metrics = await register.metrics();
      const summary = {
        timestamp: new Date().toISOString(),
        service: this.serviceName,
        metrics: metrics,
      };

      res.set('Content-Type', 'application/json');
      res.json(summary);
    } catch (error) {
      logger.error('Error getting metrics summary', { error });
      res.status(500).json({ error: 'Failed to get metrics summary' });
    }
  }

  /**
   * Get performance metrics
   */
  private getPerformanceMetrics(req: Request, res: Response): void {
    try {
      const performance = {
        timestamp: new Date().toISOString(),
        service: this.serviceName,
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        cpu: process.cpuUsage(),
      };

      res.json(performance);
    } catch (error) {
      logger.error('Error getting performance metrics', { error });
      res.status(500).json({ error: 'Failed to get performance metrics' });
    }
  }

  /**
   * Get operational insights
   */
  private async getOperationalInsights(req: Request, res: Response): Promise<void> {
    try {
      const insights: any = {
        timestamp: new Date().toISOString(),
        service: this.serviceName,
      };

      // Add health insights
      if (this.healthService) {
        const health = await this.healthService.checkHealth();
        insights.health = {
          status: health.status,
          degradedServices: health.dependencies.filter(d => d.status !== 'healthy'),
        };
      }

      // Add SLO insights
      if (this.operationalManager) {
        const slos = this.operationalManager.getAllSLOs();
        insights.slos = {
          atRisk: slos.filter(s => s.status === 'warning' || s.status === 'critical'),
          errorBudgetLow: slos.filter(s => s.errorBudget < 10),
        };

        // Add incident insights
        const incidents = this.operationalManager.getAllIncidents();
        const recentIncidents = incidents.filter(i => {
          const hoursSinceStart = (Date.now() - i.startTime.getTime()) / (1000 * 60 * 60);
          return hoursSinceStart < 24;
        });
        insights.incidents = {
          last24Hours: recentIncidents.length,
          critical: recentIncidents.filter(i => i.severity === 'critical').length,
        };
      }

      res.json(insights);
    } catch (error) {
      logger.error('Error getting operational insights', { error });
      res.status(500).json({ error: 'Failed to get operational insights' });
    }
  }

  /**
   * Get active alerts
   */
  private getActiveAlerts(req: Request, res: Response): void {
    try {
      // This would integrate with AlertManager or your alerting system
      const alerts: any[] = [];

      // Check SLO alerts
      if (this.operationalManager) {
        const slos = this.operationalManager.getAllSLOs();
        slos.forEach(slo => {
          if (slo.status === 'warning' || slo.status === 'critical') {
            alerts.push({
              type: 'slo',
              severity: slo.status === 'critical' ? 'critical' : 'warning',
              title: `SLO ${slo.name} is ${slo.status}`,
              description: `${slo.description} - Current: ${slo.currentValue}%, Target: ${slo.target}%`,
              service: slo.service,
              timestamp: slo.lastUpdated,
            });
          }
        });
      }

      res.json({ alerts });
    } catch (error) {
      logger.error('Error getting active alerts', { error });
      res.status(500).json({ error: 'Failed to get active alerts' });
    }
  }

  /**
   * Get Express router
   */
  getRouter(): Router {
    return this.router;
  }
}
