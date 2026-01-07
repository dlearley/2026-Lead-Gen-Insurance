import { Logger } from 'winston';
import { businessMetrics } from './business-metrics.js';
import { logger } from '../logger.js';

/**
 * Severity levels for incidents (following SEV1-SEV4 scale)
 */
export enum IncidentSeverity {
  SEV1 = 'SEV1', // Critical - complete system outage
  SEV2 = 'SEV2', // High - major functionality impaired
  SEV3 = 'SEV3', // Medium - minor functionality impaired
  SEV4 = 'SEV4', // Low - minor issue, no customer impact
}

/**
 * Incident status
 */
export enum IncidentStatus {
  OPEN = 'open',
  ACKNOWLEDGED = 'acknowledged',
  INVESTIGATING = 'investigating',
  MITIGATED = 'mitigated',
  RESOLVED = 'resolved',
  CLOSED = 'closed',
}

/**
 * Incident data structure
 */
export interface Incident {
  id: string;
  severity: IncidentSeverity;
  status: IncidentStatus;
  title: string;
  description: string;
  service: string;
  startedAt: Date;
  acknowledgedAt?: Date;
  resolvedAt?: Date;
  closedAt?: Date;
  acknowledgedBy?: string;
  commander?: string;
  alerts: string[]; // Associated alert names
  impact: {
    affectedCustomers?: number;
    affectedServices: string[];
    errorRate?: number;
    latencyIncrease?: number;
    revenueImpact?: number;
  };
  timeline: TimelineEvent[];
  metadata: {
    runbookUrl?: string;
    slackChannel?: string;
    jiraTicket?: string;
    pagerdutyIncident?: string;
  };
}

/**
 * Timeline event for incident tracking
 */
export interface TimelineEvent {
  id: string;
  timestamp: Date;
  type: 'detection' | 'acknowledgment' | 'investigation' | 'mitigation' | 'resolution' | 'communication' | 'escalation';
  description: string;
  author: string;
  metadata?: Record<string, any>;
}

/**
 * Alert record for incident association
 */
export interface AlertRecord {
  name: string;
  severity: string;
  firedAt: Date;
  resolvedAt?: Date;
  labels: Record<string, string>;
  annotations: Record<string, string>;
  incidentId?: string;
}

/**
 * On-call rotation entry
 */
export interface OnCallEntry {
  userId: string;
  userName: string;
  userEmail: string;
  role: 'primary' | 'secondary' | 'tertiary';
  startTime: Date;
  endTime: Date;
  phoneNumber?: string;
  slackId?: string;
}

/**
 * Incident Response Service
 * Manages incident lifecycle, on-call rotations, and communication
 */
export class IncidentResponseService {
  private static instance: IncidentResponseService;
  private incidents: Map<string, Incident> = new Map();
  private alerts: Map<string, AlertRecord> = new Map();
  private onCallSchedule: OnCallEntry[] = [];
  private escalationPolicy: Map<IncidentSeverity, EscalationRule> = new Map();

  private constructor() {
    this.initializeEscalationPolicy();
  }

  static getInstance(): IncidentResponseService {
    if (!IncidentResponseService.instance) {
      IncidentResponseService.instance = new IncidentResponseService();
    }
    return IncidentResponseService.instance;
  }

  /**
   * Creates a new incident from an alert
   */
  createIncidentFromAlert(alert: AlertRecord): Incident {
    const incidentId = this.generateIncidentId();
    const severity = this.determineSeverity(alert);
    
    const incident: Incident = {
      id: incidentId,
      severity,
      status: IncidentStatus.OPEN,
      title: alert.annotations.summary || alert.name,
      description: alert.annotations.description || 'No description provided',
      service: alert.labels.service || 'unknown',
      startedAt: alert.firedAt,
      alerts: [alert.name],
      impact: {
        affectedCustomers: 0,
        affectedServices: [alert.labels.service || 'unknown'],
      },
      timeline: [this.createTimelineEvent('detection', 'Alert fired', 'system', alert.firedAt)],
      metadata: {
        runbookUrl: alert.annotations.runbook_url,
      },
    };

    this.incidents.set(incidentId, incident);
    alert.incidentId = incidentId;
    this.alerts.set(alert.name, alert);

    // Trigger escalation
    this.escalateIncident(incident);

    logger.error('Incident created', {
      incidentId,
      severity,
      service: incident.service,
      alert: alert.name,
    });

    // Record business metrics
    businessMetrics.jobFailures.inc({ 
      queue_name: incident.service, 
      error_type: 'incident_opened' 
    });

    return incident;
  }

  /**
   * Acknowledges an incident
   */
  acknowledgeIncident(incidentId: string, userId: string, userName: string): Incident | null {
    const incident = this.incidents.get(incidentId);
    if (!incident) {
      logger.warn('Attempted to acknowledge non-existent incident', { incidentId, userId });
      return null;
    }

    if (incident.status === IncidentStatus.OPEN) {
      incident.status = IncidentStatus.ACKNOWLEDGED;
      incident.acknowledgedAt = new Date();
      incident.acknowledgedBy = userId;
      
      incident.timeline.push(
        this.createTimelineEvent(
          'acknowledgment',
          `Incident acknowledged by ${userName}`,
          userId,
          new Date()
        )
      );

      logger.info('Incident acknowledged', {
        incidentId,
        userId,
        userName,
      });
    }

    return incident;
  }

  /**
   * Assigns an incident commander
   */
  assignCommander(incidentId: string, userId: string, userName: string): Incident | null {
    const incident = this.incidents.get(incidentId);
    if (!incident) {
      logger.warn('Attempted to assign commander to non-existent incident', { incidentId, userId });
      return null;
    }

    incident.commander = userId;
    incident.timeline.push(
      this.createTimelineEvent(
        'escalation',
        `Incident commander assigned: ${userName}`,
        userId,
        new Date()
      )
    );

    logger.info('Incident commander assigned', {
      incidentId,
      userId,
      userName,
    });

    return incident;
  }

  /**
   * Updates incident status
   */
  updateIncidentStatus(
    incidentId: string,
    status: IncidentStatus,
    userId: string,
    description?: string
  ): Incident | null {
    const incident = this.incidents.get(incidentId);
    if (!incident) {
      logger.warn('Attempted to update status of non-existent incident', { incidentId, status });
      return null;
    }

    const oldStatus = incident.status;
    incident.status = status;

    const timelineEvent = this.createTimelineEvent(
      this.getTimelineTypeFromStatus(status),
      description || `Status changed from ${oldStatus} to ${status}`,
      userId,
      new Date()
    );
    incident.timeline.push(timelineEvent);

    // Set appropriate timestamps
    switch (status) {
      case IncidentStatus.RESOLVED:
        incident.resolvedAt = new Date();
        break;
      case IncidentStatus.CLOSED:
        incident.closedAt = new Date();
        break;
    }

    logger.info('Incident status updated', {
      incidentId,
      oldStatus,
      newStatus: status,
      userId,
    });

    return incident;
  }

  /**
   * Adds a timeline event to an incident
   */
  addTimelineEvent(
    incidentId: string,
    type: TimelineEvent['type'],
    description: string,
    userId: string,
    metadata?: Record<string, any>
  ): Incident | null {
    const incident = this.incidents.get(incidentId);
    if (!incident) {
      logger.warn('Attempted to add timeline event to non-existent incident', { incidentId, type });
      return null;
    }

    const event = this.createTimelineEvent(type, description, userId, new Date(), metadata);
    incident.timeline.push(event);

    logger.info('Timeline event added to incident', {
      incidentId,
      type,
      userId,
    });

    return incident;
  }

  /**
   * Updates incident impact
   */
  updateIncidentImpact(
    incidentId: string,
    impact: Partial<Incident['impact']>
  ): Incident | null {
    const incident = this.incidents.get(incidentId);
    if (!incident) {
      logger.warn('Attempted to update impact of non-existent incident', { incidentId });
      return null;
    }

    incident.impact = { ...incident.impact, ...impact };

    logger.info('Incident impact updated', {
      incidentId,
      impact,
    });

    return incident;
  }

  /**
   * Gets an incident by ID
   */
  getIncident(incidentId: string): Incident | undefined {
    return this.incidents.get(incidentId);
  }

  /**
   * Gets all incidents (optionally filtered)
   */
  getIncidents(filters?: {
    severity?: IncidentSeverity;
    status?: IncidentStatus;
    service?: string;
    startDate?: Date;
    endDate?: Date;
  }): Incident[] {
    let incidents = Array.from(this.incidents.values());

    if (filters) {
      if (filters.severity) {
        incidents = incidents.filter(i => i.severity === filters.severity);
      }
      if (filters.status) {
        incidents = incidents.filter(i => i.status === filters.status);
      }
      if (filters.service) {
        incidents = incidents.filter(i => i.service === filters.service);
      }
      if (filters.startDate) {
        incidents = incidents.filter(i => i.startedAt >= filters.startDate!);
      }
      if (filters.endDate) {
        incidents = incidents.filter(i => i.startedAt <= filters.endDate!);
      }
    }

    return incidents.sort((a, b) => b.startedAt.getTime() - a.startedAt.getTime());
  }

  /**
   * Gets current open incidents
   */
  getOpenIncidents(): Incident[] {
    return this.getIncidents({ status: IncidentStatus.OPEN });
  }

  /**
   * Gets incidents requiring attention
   */
  getIncidentsRequiringAttention(): Incident[] {
    const attentionStatuses = [
      IncidentStatus.OPEN,
      IncidentStatus.ACKNOWLEDGED,
      IncidentStatus.INVESTIGATING,
    ];

    return Array.from(this.incidents.values())
      .filter(i => attentionStatuses.includes(i.status))
      .sort((a, b) => {
        // Sort by severity (SEV1 first) then by start time (older first)
        const severityOrder = { [IncidentSeverity.SEV1]: 0, [IncidentSeverity.SEV2]: 1, [IncidentSeverity.SEV3]: 2, [IncidentSeverity.SEV4]: 3 };
        const severityDiff = severityOrder[a.severity] - severityOrder[b.severity];
        if (severityDiff !== 0) return severityDiff;
        return a.startedAt.getTime() - b.startedAt.getTime();
      });
  }

  /**
   * Gets incident statistics
   */
  getIncidentStats(timeRange: '24h' | '7d' | '30d' = '24h'): {
    totalIncidents: number;
    openIncidents: number;
    resolvedIncidents: number;
    avgResolutionTime: number;
    sev1Incidents: number;
    sev2Incidents: number;
    sev3Incidents: number;
    sev4Incidents: number;
  } {
    const now = new Date();
    const startTime = new Date(now.getTime() - this.getTimeRangeMs(timeRange));
    
    const incidentsInRange = this.getIncidents({ startDate: startTime });
    
    const openIncidents = incidentsInRange.filter(i => 
      [IncidentStatus.OPEN, IncidentStatus.ACKNOWLEDGED, IncidentStatus.INVESTIGATING].includes(i.status)
    );
    
    const resolvedIncidents = incidentsInRange.filter(i => 
      i.status === IncidentStatus.RESOLVED || i.status === IncidentStatus.CLOSED
    );

    const avgResolutionTime = resolvedIncidents.length > 0
      ? resolvedIncidents.reduce((sum, i) => {
          const endTime = i.resolvedAt || i.closedAt || new Date();
          return sum + (endTime.getTime() - i.startedAt.getTime());
        }, 0) / resolvedIncidents.length / 1000 / 60 // Convert to minutes
      : 0;

    return {
      totalIncidents: incidentsInRange.length,
      openIncidents: openIncidents.length,
      resolvedIncidents: resolvedIncidents.length,
      avgResolutionTime: Math.round(avgResolutionTime),
      sev1Incidents: incidentsInRange.filter(i => i.severity === IncidentSeverity.SEV1).length,
      sev2Incidents: incidentsInRange.filter(i => i.severity === IncidentSeverity.SEV2).length,
      sev3Incidents: incidentsInRange.filter(i => i.severity === IncidentSeverity.SEV3).length,
      sev4Incidents: incidentsInRange.filter(i => i.severity === IncidentSeverity.SEV4).length,
    };
  }

  /**
   * Gets current on-call engineer
   */
  getCurrentOnCall(role: OnCallEntry['role'] = 'primary'): OnCallEntry | null {
    const now = new Date();
    const current = this.onCallSchedule.find(entry => 
      entry.role === role && 
      entry.startTime <= now && 
      entry.endTime > now
    );
    return current || null;
  }

  /**
   * Adds an entry to the on-call schedule
   */
  addOnCallEntry(entry: OnCallEntry): void {
    this.onCallSchedule.push(entry);
    logger.info('On-call entry added', {
      userId: entry.userId,
      role: entry.role,
      startTime: entry.startTime,
      endTime: entry.endTime,
    });
  }

  // Private helper methods

  private initializeEscalationPolicy(): void {
    this.escalationPolicy.set(IncidentSeverity.SEV1, {
      initialDelay: 0, // Immediate
      escalationDelay: 5 * 60 * 1000, // 5 minutes
      maxEscalations: 3,
    });

    this.escalationPolicy.set(IncidentSeverity.SEV2, {
      initialDelay: 2 * 60 * 1000, // 2 minutes
      escalationDelay: 15 * 60 * 1000, // 15 minutes
      maxEscalations: 2,
    });

    this.escalationPolicy.set(IncidentSeverity.SEV3, {
      initialDelay: 10 * 60 * 1000, // 10 minutes
      escalationDelay: 60 * 60 * 1000, // 1 hour
      maxEscalations: 1,
    });

    this.escalationPolicy.set(IncidentSeverity.SEV4, {
      initialDelay: 30 * 60 * 1000, // 30 minutes
      escalationDelay: 4 * 60 * 60 * 1000, // 4 hours
      maxEscalations: 1,
    });
  }

  private generateIncidentId(): string {
    return `INC-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
  }

  private determineSeverity(alert: AlertRecord): IncidentSeverity {
    switch (alert.severity) {
      case 'critical':
      case 'page':
        return alert.labels.alertname?.toLowerCase().includes('down') 
          ? IncidentSeverity.SEV1 
          : IncidentSeverity.SEV2;
      case 'warning':
        return IncidentSeverity.SEV3;
      default:
        return IncidentSeverity.SEV4;
    }
  }

  private escalateIncident(incident: Incident): void {
    const escalationRule = this.escalationPolicy.get(incident.severity);
    if (!escalationRule) return;

    // Immediate notification for SEV1
    if (incident.severity === IncidentSeverity.SEV1) {
      this.pageOnCallEngineers(incident);
    }

    // Schedule escalation if not acknowledged
    setTimeout(() => {
      if (incident.status === IncidentStatus.OPEN) {
        this.escalateToNextLevel(incident);
      }
    }, escalationRule.initialDelay);
  }

  private pageOnCallEngineers(incident: Incident): void {
    const primary = this.getCurrentOnCall('primary');
    const secondary = this.getCurrentOnCall('secondary');

    if (primary) {
      logger.info('Paging primary on-call', {
        incidentId: incident.id,
        userId: primary.userId,
      });
      // In real implementation, this would trigger PagerDuty/SMS
    }

    if (secondary && incident.severity === IncidentSeverity.SEV1) {
      logger.info('Paging secondary on-call', {
        incidentId: incident.id,
        userId: secondary.userId,
      });
      // In real implementation, this would trigger PagerDuty/SMS
    }
  }

  private escalateToNextLevel(incident: Incident): void {
    logger.warn('Incident escalation triggered', {
      incidentId: incident.id,
      severity: incident.severity,
      currentStatus: incident.status,
    });
    // In real implementation, this would escalate to management
  }

  private createTimelineEvent(
    type: TimelineEvent['type'],
    description: string,
    author: string,
    timestamp: Date = new Date(),
    metadata?: Record<string, any>
  ): TimelineEvent {
    return {
      id: `EVT-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      timestamp,
      type,
      description,
      author,
      metadata,
    };
  }

  private getTimelineTypeFromStatus(status: IncidentStatus): TimelineEvent['type'] {
    switch (status) {
      case IncidentStatus.INVESTIGATING:
        return 'investigation';
      case IncidentStatus.MITIGATED:
        return 'mitigation';
      case IncidentStatus.RESOLVED:
        return 'resolution';
      default:
        return 'investigation';
    }
  }

  private getTimeRangeMs(timeRange: string): number {
    switch (timeRange) {
      case '24h': return 24 * 60 * 60 * 1000;
      case '7d': return 7 * 24 * 60 * 60 * 1000;
      case '30d': return 30 * 24 * 60 * 60 * 1000;
      default: return 24 * 60 * 60 * 1000;
    }
  }
}

interface EscalationRule {
  initialDelay: number; // milliseconds
  escalationDelay: number; // milliseconds
  maxEscalations: number;
}

export const incidentResponseService = IncidentResponseService.getInstance();