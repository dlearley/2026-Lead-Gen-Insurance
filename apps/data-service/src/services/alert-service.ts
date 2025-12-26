import { logger } from '@insurance-lead-gen/core';
import type {
  Alert,
  AlertRule,
  AlertType,
  AlertSeverity,
  AlertCondition,
} from '@insurance-lead-gen/types';
import { prisma } from '../prisma/client.js';

export class AlertService {
  private readonly alertRules: Map<string, AlertRule> = new Map();
  private readonly alertCooldowns: Map<string, Date> = new Map();

  constructor() {
    this.initializeDefaultRules();
  }

  private initializeDefaultRules(): void {
    const defaultRules: Omit<AlertRule, 'id' | 'createdBy' | 'createdAt' | 'updatedAt'>[] = [
      {
        name: 'High Lead Volume',
        description: 'Alert when lead volume exceeds threshold',
        metric: 'lead_volume_per_hour',
        condition: {
          operator: 'gt',
          threshold: 100,
          windowMinutes: 60,
        },
        severity: 'warning',
        enabled: true,
        cooldownMinutes: 60,
        notificationChannels: ['email', 'slack'],
      },
      {
        name: 'Low Conversion Rate',
        description: 'Alert when conversion rate drops below threshold',
        metric: 'conversion_rate',
        condition: {
          operator: 'lt',
          threshold: 10,
          windowMinutes: 1440,
        },
        severity: 'warning',
        enabled: true,
        cooldownMinutes: 240,
        notificationChannels: ['email'],
      },
      {
        name: 'High Error Rate',
        description: 'Alert when error rate exceeds threshold',
        metric: 'error_rate_percent',
        condition: {
          operator: 'gt',
          threshold: 5,
          windowMinutes: 15,
          consecutiveCount: 3,
        },
        severity: 'error',
        enabled: true,
        cooldownMinutes: 30,
        notificationChannels: ['email', 'slack', 'pagerduty'],
      },
      {
        name: 'Agent Assignment Failure',
        description: 'Alert when agent assignment failure rate is high',
        metric: 'assignment_failure_rate',
        condition: {
          operator: 'gt',
          threshold: 20,
          windowMinutes: 60,
        },
        severity: 'error',
        enabled: true,
        cooldownMinutes: 60,
        notificationChannels: ['email', 'slack'],
      },
      {
        name: 'AI Score Anomaly',
        description: 'Alert when AI quality scores show unusual patterns',
        metric: 'ai_score_std_deviation',
        condition: {
          operator: 'gt',
          threshold: 30,
          windowMinutes: 1440,
        },
        severity: 'info',
        enabled: true,
        cooldownMinutes: 240,
        notificationChannels: ['email'],
      },
    ];

    defaultRules.forEach((rule, index) => {
      const alertRule: AlertRule = {
        id: `default-${index + 1}`,
        ...rule,
        createdBy: 'system',
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      this.alertRules.set(alertRule.id, alertRule);
    });
  }

  async checkMetrics(): Promise<Alert[]> {
    logger.debug('Checking metrics for alerts');

    const alerts: Alert[] = [];

    for (const rule of this.alertRules.values()) {
      if (!rule.enabled) {
        continue;
      }

      if (this.isInCooldown(rule.id)) {
        logger.debug(`Alert rule ${rule.name} is in cooldown period`);
        continue;
      }

      const alert = await this.evaluateRule(rule);
      if (alert) {
        alerts.push(alert);
        this.alertCooldowns.set(rule.id, new Date());
      }
    }

    return alerts;
  }

  private async evaluateRule(rule: AlertRule): Promise<Alert | null> {
    try {
      const metricValue = await this.getMetricValue(rule.metric, rule.condition.windowMinutes);

      if (this.evaluateCondition(metricValue, rule.condition)) {
        const alert = this.createAlert(rule, metricValue);
        logger.info('Alert triggered', {
          rule: rule.name,
          metric: rule.metric,
          value: metricValue,
          threshold: rule.condition.threshold,
        });
        return alert;
      }
    } catch (error) {
      logger.error(`Failed to evaluate alert rule ${rule.name}`, { error });
    }

    return null;
  }

  private async getMetricValue(metric: string, windowMinutes?: number): Promise<number> {
    const now = new Date();
    const windowStart = new Date(now.getTime() - (windowMinutes || 60) * 60 * 1000);

    switch (metric) {
      case 'lead_volume_per_hour': {
        const count = await prisma.lead.count({
          where: {
            createdAt: {
              gte: windowStart,
            },
          },
        });
        return (count / (windowMinutes || 60)) * 60;
      }

      case 'conversion_rate': {
        const total = await prisma.lead.count({
          where: {
            createdAt: {
              gte: windowStart,
            },
          },
        });
        const converted = await prisma.lead.count({
          where: {
            createdAt: {
              gte: windowStart,
            },
            status: 'converted',
          },
        });
        return total > 0 ? (converted / total) * 100 : 0;
      }

      case 'assignment_failure_rate': {
        const total = await prisma.leadAssignment.count({
          where: {
            assignedAt: {
              gte: windowStart,
            },
          },
        });
        const failed = await prisma.leadAssignment.count({
          where: {
            assignedAt: {
              gte: windowStart,
            },
            status: 'rejected',
          },
        });
        return total > 0 ? (failed / total) * 100 : 0;
      }

      case 'ai_score_std_deviation': {
        const leads = await prisma.lead.findMany({
          where: {
            createdAt: {
              gte: windowStart,
            },
            qualityScore: {
              not: null,
            },
          },
          select: {
            qualityScore: true,
          },
        });

        if (leads.length === 0) return 0;

        const scores = leads.map((l) => l.qualityScore || 0);
        const mean = scores.reduce((sum, score) => sum + score, 0) / scores.length;
        const variance =
          scores.reduce((sum, score) => sum + Math.pow(score - mean, 2), 0) / scores.length;
        return Math.sqrt(variance);
      }

      case 'error_rate_percent': {
        return Math.random() * 10;
      }

      default:
        logger.warn(`Unknown metric: ${metric}`);
        return 0;
    }
  }

  private evaluateCondition(value: number, condition: AlertCondition): boolean {
    const { operator, threshold } = condition;

    switch (operator) {
      case 'gt':
        return value > threshold;
      case 'lt':
        return value < threshold;
      case 'eq':
        return value === threshold;
      case 'gte':
        return value >= threshold;
      case 'lte':
        return value <= threshold;
      case 'ne':
        return value !== threshold;
      default:
        return false;
    }
  }

  private createAlert(rule: AlertRule, currentValue: number): Alert {
    const alert: Alert = {
      id: `alert-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type: this.getAlertType(rule.metric),
      severity: rule.severity,
      status: 'open',
      title: rule.name,
      message: this.generateAlertMessage(rule, currentValue),
      metric: rule.metric,
      currentValue,
      threshold: rule.condition.threshold,
      context: {
        ruleId: rule.id,
        condition: rule.condition,
      },
      detectedAt: new Date(),
    };

    return alert;
  }

  private getAlertType(metric: string): AlertType {
    if (metric.includes('error') || metric.includes('failure')) {
      return 'system_error';
    }
    if (metric.includes('performance') || metric.includes('latency')) {
      return 'performance_degradation';
    }
    if (metric.includes('anomaly') || metric.includes('deviation')) {
      return 'anomaly_detected';
    }
    if (metric.includes('threshold') || metric.includes('limit')) {
      return 'threshold_exceeded';
    }
    return 'unusual_pattern';
  }

  private generateAlertMessage(rule: AlertRule, currentValue: number): string {
    const operator = rule.condition.operator;
    const threshold = rule.condition.threshold;
    const operatorText =
      {
        gt: 'above',
        lt: 'below',
        eq: 'equal to',
        gte: 'at or above',
        lte: 'at or below',
        ne: 'not equal to',
      }[operator] || 'compared to';

    return `${rule.description || rule.name}: Current value ${currentValue.toFixed(2)} is ${operatorText} threshold ${threshold}`;
  }

  private isInCooldown(ruleId: string): boolean {
    const lastTriggered = this.alertCooldowns.get(ruleId);
    if (!lastTriggered) return false;

    const rule = this.alertRules.get(ruleId);
    if (!rule) return false;

    const cooldownEnd = new Date(
      lastTriggered.getTime() + rule.cooldownMinutes * 60 * 1000,
    );
    return new Date() < cooldownEnd;
  }

  async acknowledgeAlert(alertId: string, userId: string): Promise<void> {
    logger.info(`Alert ${alertId} acknowledged by ${userId}`);
  }

  async resolveAlert(alertId: string, userId: string, resolution: string): Promise<void> {
    logger.info(`Alert ${alertId} resolved by ${userId}`, { resolution });
  }

  addRule(rule: AlertRule): void {
    this.alertRules.set(rule.id, rule);
  }

  removeRule(ruleId: string): void {
    this.alertRules.delete(ruleId);
    this.alertCooldowns.delete(ruleId);
  }

  getRule(ruleId: string): AlertRule | undefined {
    return this.alertRules.get(ruleId);
  }

  getAllRules(): AlertRule[] {
    return Array.from(this.alertRules.values());
  }
}
