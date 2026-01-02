import { Gauge, register } from 'prom-client';
import { Tracer } from '@opentelemetry/api';
import { logger } from '../monitoring/winston-otel';
import { getTracer } from '../monitoring/observability';

export interface SLO {
  id: string;
  name: string;
  description: string;
  service: string;
  metric: string;
  target: number; // e.g., 99.9 for 99.9%
  window: string; // e.g., '30d', '7d'
  measurement: 'availability' | 'latency' | 'error_rate' | 'throughput';
  currentValue: number;
  errorBudget: number;
  status: 'healthy' | 'warning' | 'critical';
  lastUpdated: Date;
}

export interface SLA {
  id: string;
  name: string;
  description: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  responseTime: number; // minutes
  resolutionTime: number; // hours
  availability: number; // percentage
  affectedServices: string[];
  customerImpact: string;
  escalationPath: string[];
  currentCompliance: {
    responseTime: number;
    resolutionTime: number;
    availability: number;
  };
}

export interface Incident {
  id: string;
  title: string;
  description: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  status: 'open' | 'investigating' | 'resolved' | 'closed';
  affectedServices: string[];
  startTime: Date;
  endTime?: Date;
  assignedTo?: string;
  impact: string;
  resolution?: string;
  postIncidentReview?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Runbook {
  id: string;
  title: string;
  description: string;
  category: 'incident_response' | 'deployment' | 'database' | 'scaling' | 'security' | 'monitoring';
  steps: RunbookStep[];
  prerequisites: string[];
  estimatedTime: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  tags: string[];
  lastReviewed: Date;
  nextReview: Date;
  version: string;
}

export interface RunbookStep {
  stepNumber: number;
  title: string;
  description: string;
  command?: string;
  expectedOutput?: string;
  timeout?: number; // seconds
  rollback?: string;
  warnings?: string[];
}

// SLO and SLA management system
export class OperationalExcellenceManager {
  private tracer: Tracer;
  
  // Metrics
  private sloComplianceGauge: Gauge<string>;
  private slaComplianceGauge: Gauge<string>;
  private incidentCounter: Gauge<string>;
  private mttrGauge: Gauge<string>; // Mean Time To Resolution
  private mttaGauge: Gauge<string>; // Mean Time To Acknowledge
  
  // Data storage
  private slos: Map<string, SLO> = new Map();
  private slas: Map<string, SLA> = new Map();
  private incidents: Map<string, Incident> = new Map();
  private runbooks: Map<string, Runbook> = new Map();
  
  constructor() {
    this.tracer = getTracer('OperationalExcellenceManager');
    
    // Initialize metrics
    this.sloComplianceGauge = new Gauge({
      name: 'slo_compliance_percent',
      help: 'SLO compliance percentage',
      labelNames: ['slo_id', 'slo_name', 'service']
    });
    
    this.slaComplianceGauge = new Gauge({
      name: 'sla_compliance_percent',
      help: 'SLA compliance percentage',
      labelNames: ['sla_id', 'sla_name', 'severity']
    });
    
    this.incidentCounter = new Gauge({
      name: 'incidents_total',
      help: 'Total number of incidents',
      labelNames: ['severity', 'status']
    });
    
    this.mttrGauge = new Gauge({
      name: 'mttr_hours',
      help: 'Mean Time To Resolution in hours',
      labelNames: ['service', 'severity']
    });
    
    this.mttaGauge = new Gauge({
      name: 'mtta_minutes',
      help: 'Mean Time To Acknowledge in minutes',
      labelNames: ['service', 'severity']
    });
    
    register.registerMetric(this.sloComplianceGauge);
    register.registerMetric(this.slaComplianceGauge);
    register.registerMetric(this.incidentCounter);
    register.registerMetric(this.mttrGauge);
    register.registerMetric(this.mttaGauge);
    
    // Initialize with default SLOs and SLAs
    this.initializeDefaultSLOS();
    this.initializeDefaultSLAS();
    this.initializeDefaultRunbooks();
  }
  
  /**
   * Update SLO metrics
   */
  async updateSLO(sloId: string, currentValue: number): Promise<void> {
    const span = this.tracer.startSpan('updateSLO');
    
    try {
      const slo = this.slos.get(sloId);
      if (!slo) {
        logger.warn('SLO not found', { sloId, service: 'operational-excellence-manager' });
        return;
      }
      
      slo.currentValue = currentValue;
      slo.errorBudget = Math.max(0, 100 - currentValue);
      slo.status = this.calculateSLOStatus(slo);
      slo.lastUpdated = new Date();
      
      // Update Prometheus metrics
      this.sloComplianceGauge
        .labels(slo.id, slo.name, slo.service)
        .set(currentValue);
      
      logger.info('SLO updated', {
        sloId: slo.id,
        name: slo.name,
        currentValue,
        target: slo.target,
        status: slo.status,
        service: 'operational-excellence-manager'
      });
      
    } catch (error) {
      logger.error('Failed to update SLO', {
        sloId,
        error: error instanceof Error ? error.message : 'Unknown error',
        service: 'operational-excellence-manager'
      });
    } finally {
      span.end();
    }
  }
  
  /**
   * Create incident
   */
  async createIncident(incident: Omit<Incident, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    const span = this.tracer.startSpan('createIncident');
    
    try {
      const id = `INC-${Date.now()}`;
      const now = new Date();
      
      const fullIncident: Incident = {
        ...incident,
        id,
        createdAt: now,
        updatedAt: now
      };
      
      this.incidents.set(id, fullIncident);
      
      // Update metrics
      this.incidentCounter
        .labels(incident.severity, incident.status)
        .inc();
      
      logger.info('Incident created', {
        incidentId: id,
        title: incident.title,
        severity: incident.severity,
        affectedServices: incident.affectedServices,
        service: 'operational-excellence-manager'
      });
      
      // Auto-assign based on affected services
      await this.autoAssignIncident(fullIncident);
      
      return id;
      
    } catch (error) {
      logger.error('Failed to create incident', {
        error: error instanceof Error ? error.message : 'Unknown error',
        service: 'operational-excellence-manager'
      });
      throw error;
    } finally {
      span.end();
    }
  }
  
  /**
   * Update incident status
   */
  async updateIncidentStatus(incidentId: string, status: Incident['status'], resolution?: string): Promise<void> {
    const span = this.tracer.startSpan('updateIncidentStatus');
    
    try {
      const incident = this.incidents.get(incidentId);
      if (!incident) {
        logger.warn('Incident not found', { incidentId, service: 'operational-excellence-manager' });
        return;
      }
      
      const wasStatus = incident.status;
      incident.status = status;
      incident.updatedAt = new Date();
      
      if (status === 'resolved' || status === 'closed') {
        incident.endTime = new Date();
        
        if (resolution) {
          incident.resolution = resolution;
        }
      }
      
      // Update metrics
      this.incidentCounter.labels(incident.severity, wasStatus).dec();
      this.incidentCounter.labels(incident.severity, status).inc();
      
      // Calculate MTTR if resolved
      if (incident.endTime && incident.startTime) {
        const mttrHours = (incident.endTime.getTime() - incident.startTime.getTime()) / (1000 * 60 * 60);
        
        for (const service of incident.affectedServices) {
          this.mttrGauge.labels(service, incident.severity).set(mttrHours);
        }
      }
      
      logger.info('Incident status updated', {
        incidentId,
        from: wasStatus,
        to: status,
        service: 'operational-excellence-manager'
      });
      
    } catch (error) {
      logger.error('Failed to update incident status', {
        incidentId,
        error: error instanceof Error ? error.message : 'Unknown error',
        service: 'operational-excellence-manager'
      });
    } finally {
      span.end();
    }
  }
  
  /**
   * Generate operational report
   */
  async generateOperationalReport(period: string = '30d'): Promise<{
    summary: {
      totalIncidents: number;
      criticalIncidents: number;
      averageMTTR: number;
      sloCompliance: number;
      slaCompliance: number;
    };
    incidents: Incident[];
    slos: SLO[];
    slas: SLA[];
    recommendations: string[];
  }> {
    const allIncidents = Array.from(this.incidents.values());
    const allSLOs = Array.from(this.slos.values());
    const allSLAs = Array.from(this.slas.values());
    
    // Calculate summary metrics
    const totalIncidents = allIncidents.length;
    const criticalIncidents = allIncidents.filter(i => i.severity === 'critical').length;
    const averageMTTR = this.calculateAverageMTTR(allIncidents);
    const averageSLOCompliance = this.calculateAverageSLOCompliance(allSLOs);
    const averageSLACompliance = this.calculateAverageSLACompliance(allSLAs);
    
    const recommendations: string[] = [];
    
    // Generate recommendations
    if (criticalIncidents > 0) {
      recommendations.push('Address critical incident patterns to reduce frequency');
    }
    
    if (averageMTTR > 4) {
      recommendations.push('Improve incident response procedures to reduce MTTR');
    }
    
    if (averageSLOCompliance < 99.5) {
      recommendations.push('Review SLO targets and implement improvements');
    }
    
    if (averageSLACompliance < 95) {
      recommendations.push('Improve SLA compliance through better processes');
    }
    
    return {
      summary: {
        totalIncidents,
        criticalIncidents,
        averageMTTR,
        sloCompliance: averageSLOCompliance,
        slaCompliance: averageSLACompliance
      },
      incidents: allIncidents,
      slos: allSLOs,
      slas: allSLAs,
      recommendations
    };
  }
  
  /**
   * Get runbook by category
   */
  getRunbooksByCategory(category: Runbook['category']): Runbook[] {
    return Array.from(this.runbooks.values()).filter(runbook => runbook.category === category);
  }
  
  /**
   * Execute runbook step
   */
  async executeRunbookStep(runbookId: string, stepNumber: number): Promise<{
    success: boolean;
    output?: string;
    error?: string;
    executionTime: number;
  }> {
    const span = this.tracer.startSpan('executeRunbookStep');
    const startTime = Date.now();
    
    try {
      const runbook = this.runbooks.get(runbookId);
      if (!runbook) {
        throw new Error(`Runbook ${runbookId} not found`);
      }
      
      const step = runbook.steps.find(s => s.stepNumber === stepNumber);
      if (!step) {
        throw new Error(`Step ${stepNumber} not found in runbook ${runbookId}`);
      }
      
      let output = '';
      let success = true;
      
      // Execute command if provided
      if (step.command) {
        const { exec } = await import('child_process');
        
        await new Promise<void>((resolve, reject) => {
          const timeout = step.timeout || 30;
          const timeoutHandle = setTimeout(() => {
            reject(new Error(`Step execution timeout after ${timeout} seconds`));
          }, timeout * 1000);
          
          exec(step.command!, (error, stdout, stderr) => {
            clearTimeout(timeoutHandle);
            
            if (error) {
              success = false;
              output = stderr || error.message;
              reject(error);
            } else {
              output = stdout;
              resolve();
            }
          });
        });
      }
      
      // Validate expected output
      if (step.expectedOutput && !output.includes(step.expectedOutput)) {
        success = false;
        logger.warn('Runbook step output mismatch', {
          runbookId,
          stepNumber,
          expected: step.expectedOutput,
          actual: output,
          service: 'operational-excellence-manager'
        });
      }
      
      const executionTime = Date.now() - startTime;
      
      logger.info('Runbook step executed', {
        runbookId,
        stepNumber,
        success,
        executionTime,
        service: 'operational-excellence-manager'
      });
      
      return { success, output, executionTime };
      
    } catch (error) {
      const executionTime = Date.now() - startTime;
      
      logger.error('Runbook step execution failed', {
        runbookId,
        stepNumber,
        error: error instanceof Error ? error.message : 'Unknown error',
        executionTime,
        service: 'operational-excellence-manager'
      });
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        executionTime
      };
    } finally {
      span.end();
    }
  }
  
  /**
   * Calculate SLO status
   */
  private calculateSLOStatus(slo: SLO): SLO['status'] {
    if (slo.currentValue >= slo.target) {
      return 'healthy';
    } else if (slo.currentValue >= slo.target * 0.95) {
      return 'warning';
    } else {
      return 'critical';
    }
  }
  
  /**
   * Auto-assign incident based on affected services
   */
  private async autoAssignIncident(incident: Incident): Promise<void> {
    // Simple assignment logic - in real implementation, use on-call schedules
    const assignments = {
      'api-service': 'api-team',
      'backend': 'backend-team',
      'database': 'data-team',
      'orchestrator': 'ai-team'
    };
    
    for (const service of incident.affectedServices) {
      const team = assignments[service as keyof typeof assignments];
      if (team && !incident.assignedTo) {
        incident.assignedTo = team;
        break;
      }
    }
  }
  
  /**
   * Calculate average MTTR
   */
  private calculateAverageMTTR(incidents: Incident[]): number {
    const resolvedIncidents = incidents.filter(i => i.endTime);
    if (resolvedIncidents.length === 0) return 0;
    
    const totalMTTR = resolvedIncidents.reduce((sum, incident) => {
      const mttr = (incident.endTime!.getTime() - incident.startTime.getTime()) / (1000 * 60 * 60);
      return sum + mttr;
    }, 0);
    
    return totalMTTR / resolvedIncidents.length;
  }
  
  /**
   * Calculate average SLO compliance
   */
  private calculateAverageSLOCompliance(slos: SLO[]): number {
    if (slos.length === 0) return 100;
    
    const totalCompliance = slos.reduce((sum, slo) => sum + slo.currentValue, 0);
    return totalCompliance / slos.length;
  }
  
  /**
   * Calculate average SLA compliance
   */
  private calculateAverageSLACompliance(slas: SLA[]): number {
    if (slas.length === 0) return 100;
    
    // Simplified calculation - in real implementation, calculate based on actual metrics
    const totalCompliance = slas.reduce((sum, sla) => {
      const avgCompliance = (sla.currentCompliance.responseTime + 
                           sla.currentCompliance.resolutionTime + 
                           sla.currentCompliance.availability) / 3;
      return sum + avgCompliance;
    }, 0);
    
    return totalCompliance / slas.length;
  }
  
  /**
   * Initialize default SLOs
   */
  private initializeDefaultSLOS(): void {
    const defaultSLOs: SLO[] = [
      {
        id: 'api-availability',
        name: 'API Availability',
        description: 'API service availability',
        service: 'api-service',
        metric: 'uptime_percent',
        target: 99.9,
        window: '30d',
        measurement: 'availability',
        currentValue: 99.95,
        errorBudget: 0.05,
        status: 'healthy',
        lastUpdated: new Date(),
        nextReview: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
      },
      {
        id: 'api-latency',
        name: 'API Response Time',
        description: 'P99 API response time',
        service: 'api-service',
        metric: 'response_time_p99_ms',
        target: 500,
        window: '7d',
        measurement: 'latency',
        currentValue: 450,
        errorBudget: 50,
        status: 'healthy',
        lastUpdated: new Date(),
        nextReview: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
      },
      {
        id: 'backend-error-rate',
        name: 'Backend Error Rate',
        description: 'Backend error rate',
        service: 'backend',
        metric: 'error_rate_percent',
        target: 0.1,
        window: '30d',
        measurement: 'error_rate',
        currentValue: 0.05,
        errorBudget: 0.05,
        status: 'healthy',
        lastUpdated: new Date(),
        nextReview: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
      }
    ];
    
    for (const slo of defaultSLOs) {
      this.slos.set(slo.id, slo);
    }
  }
  
  /**
   * Initialize default SLAs
   */
  private initializeDefaultSLAS(): void {
    const defaultSLAs: SLA[] = [
      {
        id: 'critical-response',
        name: 'Critical Issue Response',
        description: 'Response time for critical issues',
        severity: 'critical',
        responseTime: 15,
        resolutionTime: 4,
        availability: 99.9,
        affectedServices: ['all'],
        customerImpact: 'Service unavailable or severely degraded',
        escalationPath: ['oncall-engineer', 'engineering-manager', 'cto'],
        currentCompliance: {
          responseTime: 12,
          resolutionTime: 3.5,
          availability: 99.95
        }
      },
      {
        id: 'high-priority-response',
        name: 'High Priority Response',
        description: 'Response time for high priority issues',
        severity: 'high',
        responseTime: 60,
        resolutionTime: 24,
        availability: 99.5,
        affectedServices: ['api-service', 'backend'],
        customerImpact: 'Significant functionality affected',
        escalationPath: ['oncall-engineer', 'engineering-manager'],
        currentCompliance: {
          responseTime: 45,
          resolutionTime: 18,
          availability: 99.7
        }
      }
    ];
    
    for (const sla of defaultSLAs) {
      this.slas.set(sla.id, sla);
    }
  }
  
  /**
   * Initialize default runbooks
   */
  private initializeDefaultRunbooks(): void {
    const defaultRunbooks: Runbook[] = [
      {
        id: 'incident-response',
        title: 'Incident Response',
        description: 'Standard incident response procedures',
        category: 'incident_response',
        steps: [
          {
            stepNumber: 1,
            title: 'Acknowledge Incident',
            description: 'Acknowledge the incident and create initial report',
            timeout: 5
          },
          {
            stepNumber: 2,
            title: 'Assess Impact',
            description: 'Determine scope and impact of the incident',
            timeout: 10
          },
          {
            stepNumber: 3,
            title: 'Implement Fix',
            description: 'Apply appropriate fix based on root cause',
            timeout: 300
          },
          {
            stepNumber: 4,
            title: 'Verify Resolution',
            description: 'Confirm that the issue is fully resolved',
            timeout: 30
          },
          {
            stepNumber: 5,
            title: 'Post-Incident Review',
            description: 'Conduct post-incident review and document lessons learned',
            timeout: 1800
          }
        ],
        prerequisites: ['Access to monitoring systems', 'Communication tools'],
        estimatedTime: '2-4 hours',
        difficulty: 'intermediate',
        tags: ['incident', 'response', 'procedure'],
        lastReviewed: new Date(),
        nextReview: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90 days
        version: '1.0'
      },
      {
        id: 'deployment-rollback',
        title: 'Deployment Rollback',
        description: 'Emergency rollback procedures',
        category: 'deployment',
        steps: [
          {
            stepNumber: 1,
            title: 'Stop Current Deployment',
            description: 'Halt the current deployment process',
            command: 'kubectl rollout pause deployment/api-service',
            timeout: 30
          },
          {
            stepNumber: 2,
            title: 'Rollback to Previous Version',
            description: 'Rollback to the last known good version',
            command: 'kubectl rollout undo deployment/api-service',
            timeout: 60
          },
          {
            stepNumber: 3,
            title: 'Verify Rollback',
            description: 'Ensure services are running correctly',
            command: 'kubectl get pods -l app=api-service',
            expectedOutput: 'Running',
            timeout: 60
          }
        ],
        prerequisites: ['Kubernetes cluster access', 'Deployment tools'],
        estimatedTime: '15-30 minutes',
        difficulty: 'advanced',
        tags: ['deployment', 'rollback', 'emergency'],
        lastReviewed: new Date(),
        nextReview: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000), // 60 days
        version: '1.0'
      }
    ];
    
    for (const runbook of defaultRunbooks) {
      this.runbooks.set(runbook.id, runbook);
    }
  }
}