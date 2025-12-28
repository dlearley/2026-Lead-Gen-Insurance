/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/prefer-nullish-coalescing, @typescript-eslint/no-unsafe-assignment */
import { logger } from '../logger.js';

export enum AuditEventType {
  AUTHENTICATION = 'authentication',
  AUTHORIZATION = 'authorization',
  DATA_ACCESS = 'data_access',
  DATA_MODIFICATION = 'data_modification',
  DATA_DELETION = 'data_deletion',
  CONFIGURATION_CHANGE = 'configuration_change',
  ADMIN_ACTION = 'admin_action',
  SECURITY_EVENT = 'security_event',
  PRIVACY_EVENT = 'privacy_event',
  SYSTEM_EVENT = 'system_event',
}

export enum AuditEventSeverity {
  INFO = 'info',
  WARNING = 'warning',
  ERROR = 'error',
  CRITICAL = 'critical',
}

export interface AuditEvent {
  eventType: AuditEventType;
  severity: AuditEventSeverity;
  userId?: string;
  userName?: string;
  ipAddress?: string;
  userAgent?: string;
  action: string;
  resource?: string;
  resourceId?: string;
  result: 'success' | 'failure';
  reason?: string;
  metadata?: Record<string, any>;
  timestamp: Date;
  requestId?: string;
}

export interface AuditLoggerConfig {
  retentionDays?: number;
  sensitiveFields?: string[];
  maskSensitiveData?: boolean;
}

export class AuditLogger {
  private config: Required<AuditLoggerConfig>;

  constructor(config: AuditLoggerConfig = {}) {
    this.config = {
      retentionDays: config.retentionDays || 90,
      sensitiveFields: config.sensitiveFields || [
        'password',
        'token',
        'secret',
        'apiKey',
        'ssn',
        'creditCard',
        'cvv',
      ],
      maskSensitiveData: config.maskSensitiveData !== false,
    };
  }

  log(event: Omit<AuditEvent, 'timestamp'>): void {
    const auditEvent: AuditEvent = {
      ...event,
      timestamp: new Date(),
      metadata: this.sanitizeMetadata(event.metadata),
    };

    const logData = {
      audit: true,
      ...auditEvent,
    };

    switch (event.severity) {
      case AuditEventSeverity.CRITICAL:
      case AuditEventSeverity.ERROR:
        logger.error('Audit event', logData);
        break;
      case AuditEventSeverity.WARNING:
        logger.warn('Audit event', logData);
        break;
      case AuditEventSeverity.INFO:
      default:
        logger.info('Audit event', logData);
        break;
    }
  }

  logAuthentication(params: {
    userId?: string;
    userName?: string;
    ipAddress?: string;
    userAgent?: string;
    action: string;
    result: 'success' | 'failure';
    reason?: string;
    requestId?: string;
  }): void {
    this.log({
      eventType: AuditEventType.AUTHENTICATION,
      severity: params.result === 'failure' ? AuditEventSeverity.WARNING : AuditEventSeverity.INFO,
      ...params,
    });
  }

  logAuthorization(params: {
    userId: string;
    userName?: string;
    ipAddress?: string;
    action: string;
    resource: string;
    resourceId?: string;
    result: 'success' | 'failure';
    reason?: string;
    requestId?: string;
  }): void {
    this.log({
      eventType: AuditEventType.AUTHORIZATION,
      severity: params.result === 'failure' ? AuditEventSeverity.WARNING : AuditEventSeverity.INFO,
      ...params,
    });
  }

  logDataAccess(params: {
    userId: string;
    userName?: string;
    ipAddress?: string;
    resource: string;
    resourceId?: string;
    action: string;
    result: 'success' | 'failure';
    metadata?: Record<string, any>;
    requestId?: string;
  }): void {
    this.log({
      eventType: AuditEventType.DATA_ACCESS,
      severity: AuditEventSeverity.INFO,
      ...params,
    });
  }

  logDataModification(params: {
    userId: string;
    userName?: string;
    ipAddress?: string;
    resource: string;
    resourceId: string;
    action: string;
    result: 'success' | 'failure';
    metadata?: Record<string, any>;
    requestId?: string;
  }): void {
    this.log({
      eventType: AuditEventType.DATA_MODIFICATION,
      severity: AuditEventSeverity.INFO,
      ...params,
    });
  }

  logDataDeletion(params: {
    userId: string;
    userName?: string;
    ipAddress?: string;
    resource: string;
    resourceId: string;
    action: string;
    result: 'success' | 'failure';
    reason?: string;
    metadata?: Record<string, any>;
    requestId?: string;
  }): void {
    this.log({
      eventType: AuditEventType.DATA_DELETION,
      severity: AuditEventSeverity.WARNING,
      ...params,
    });
  }

  logAdminAction(params: {
    userId: string;
    userName?: string;
    ipAddress?: string;
    action: string;
    resource?: string;
    resourceId?: string;
    result: 'success' | 'failure';
    metadata?: Record<string, any>;
    requestId?: string;
  }): void {
    this.log({
      eventType: AuditEventType.ADMIN_ACTION,
      severity: AuditEventSeverity.WARNING,
      ...params,
    });
  }

  logSecurityEvent(params: {
    userId?: string;
    ipAddress?: string;
    action: string;
    severity?: AuditEventSeverity;
    reason?: string;
    metadata?: Record<string, any>;
    requestId?: string;
  }): void {
    this.log({
      eventType: AuditEventType.SECURITY_EVENT,
      severity: params.severity || AuditEventSeverity.WARNING,
      result: 'failure',
      ...params,
    });
  }

  logPrivacyEvent(params: {
    userId: string;
    userName?: string;
    ipAddress?: string;
    action: string;
    resource?: string;
    result: 'success' | 'failure';
    metadata?: Record<string, any>;
    requestId?: string;
  }): void {
    this.log({
      eventType: AuditEventType.PRIVACY_EVENT,
      severity: AuditEventSeverity.INFO,
      ...params,
    });
  }

  private sanitizeMetadata(metadata?: Record<string, any>): Record<string, any> | undefined {
    if (!metadata || !this.config.maskSensitiveData) {
      return metadata;
    }

    const sanitized: Record<string, any> = {};

    for (const [key, value] of Object.entries(metadata)) {
      if (
        this.config.sensitiveFields.some((field) => key.toLowerCase().includes(field.toLowerCase()))
      ) {
        sanitized[key] = '***REDACTED***';
      } else if (typeof value === 'object' && value !== null) {
        sanitized[key] = this.sanitizeMetadata(value as Record<string, any>);
      } else {
        sanitized[key] = value;
      }
    }

    return sanitized;
  }
}

// Export a singleton instance
export const auditLogger = new AuditLogger();
