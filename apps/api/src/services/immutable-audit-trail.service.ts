/**
 * Phase 25.1E: Immutable Audit Trail Service
 * 
 * Core service for logging all system actions to an immutable audit trail.
 * Enforces append-only operations with integrity verification.
 */

import { PrismaClient } from '@prisma/client';
import { createHash } from 'crypto';
import { logger } from '@insurance-lead-gen/core';
import type {
  AuditEventData,
  ImmutableAuditLog,
  AuditLogFilters,
  IntegrityCheckResult,
  ChainValidationResult,
  IntegrityDiscrepancy,
} from '@insurance-lead-gen/types';

export class ImmutableAuditTrailService {
  constructor(private readonly prisma: PrismaClient) {}

  /**
   * Log an event to the immutable audit trail
   * This is the core method for all audit logging
   */
  async logEvent(eventData: AuditEventData): Promise<ImmutableAuditLog> {
    try {
      // Get the last log entry for chain hash calculation
      const lastLog = await this.prisma.immutableAuditLog.findFirst({
        orderBy: { sequenceNumber: 'desc' },
        select: { sequenceNumber: true, checksum: true },
      });

      // Calculate chain hash from previous entry
      const chainHash = lastLog ? this.calculateChainHash(lastLog.checksum) : null;

      // Prepare the log entry
      const logEntry = {
        eventType: eventData.eventType,
        eventCategory: eventData.eventCategory,
        severity: eventData.severity,
        actorId: eventData.actorId,
        actorType: eventData.actorType,
        actorRole: eventData.actorRole,
        resourceType: eventData.resourceType,
        resourceId: eventData.resourceId,
        parentResourceId: eventData.parentResourceId,
        action: eventData.action,
        oldValues: eventData.oldValues ? JSON.stringify(eventData.oldValues) : null,
        newValues: eventData.newValues ? JSON.stringify(eventData.newValues) : null,
        changes: eventData.changes ? JSON.stringify(eventData.changes) : null,
        changeDescription: eventData.changeDescription,
        compliancePolicies: eventData.compliancePolicies || [],
        complianceStatus: eventData.complianceStatus || 'Compliant',
        riskLevel: eventData.riskLevel || 'Low',
        requestId: eventData.requestId,
        sessionId: eventData.sessionId,
        ipAddress: eventData.ipAddress,
        userAgent: eventData.userAgent,
        method: eventData.method,
        endpoint: eventData.endpoint,
        statusCode: eventData.statusCode,
        success: eventData.success,
        errorCode: eventData.errorCode,
        errorMessage: eventData.errorMessage,
        duration: eventData.duration,
        timestamp: eventData.timestamp || new Date(),
        chainHash,
        checksum: '', // Will be calculated after creation
      };

      // Calculate checksum for the entry
      const checksum = this.calculateChecksum(logEntry);
      logEntry.checksum = checksum;

      // Insert into database (append-only)
      const auditLog = await this.prisma.immutableAuditLog.create({
        data: logEntry,
      });

      logger.debug('Audit event logged', {
        eventType: eventData.eventType,
        resourceId: eventData.resourceId,
        sequenceNumber: auditLog.sequenceNumber,
      });

      return auditLog;
    } catch (error) {
      logger.error('Failed to log audit event', { error, eventData });
      throw new Error('Audit logging failed');
    }
  }

  /**
   * Get a single audit log by ID
   */
  async getAuditLog(id: string): Promise<ImmutableAuditLog | null> {
    return this.prisma.immutableAuditLog.findUnique({
      where: { id },
    });
  }

  /**
   * Query audit logs with filters
   */
  async queryAuditLogs(filters: AuditLogFilters): Promise<ImmutableAuditLog[]> {
    const where: any = {};

    if (filters.actorId) {
      where.actorId = filters.actorId;
    }

    if (filters.resourceId) {
      where.resourceId = filters.resourceId;
    }

    if (filters.resourceType) {
      where.resourceType = filters.resourceType;
    }

    if (filters.eventType) {
      where.eventType = filters.eventType;
    }

    if (filters.eventCategory) {
      where.eventCategory = filters.eventCategory;
    }

    if (filters.severity) {
      where.severity = filters.severity;
    }

    if (filters.complianceStatus) {
      where.complianceStatus = filters.complianceStatus;
    }

    if (filters.riskLevel) {
      where.riskLevel = filters.riskLevel;
    }

    if (filters.dateRange) {
      where.timestamp = {
        gte: filters.dateRange.start,
        lte: filters.dateRange.end,
      };
    }

    return this.prisma.immutableAuditLog.findMany({
      where,
      orderBy: { timestamp: 'desc' },
      take: filters.limit || 100,
      skip: filters.offset || 0,
    });
  }

  /**
   * Get complete audit trail for a resource
   */
  async getAuditTrail(resourceId: string): Promise<ImmutableAuditLog[]> {
    return this.prisma.immutableAuditLog.findMany({
      where: { resourceId },
      orderBy: { timestamp: 'asc' },
    });
  }

  /**
   * Get audit history for an actor (user/system)
   */
  async getActorHistory(
    actorId: string,
    dateRange?: { start: Date; end: Date }
  ): Promise<ImmutableAuditLog[]> {
    const where: any = { actorId };

    if (dateRange) {
      where.timestamp = {
        gte: dateRange.start,
        lte: dateRange.end,
      };
    }

    return this.prisma.immutableAuditLog.findMany({
      where,
      orderBy: { timestamp: 'desc' },
      take: 1000, // Limit to recent 1000 actions
    });
  }

  /**
   * Verify audit log integrity
   * Checks sequence, checksums, and chain hashes
   */
  async verifyAuditIntegrity(
    startSeq?: bigint,
    endSeq?: bigint
  ): Promise<IntegrityCheckResult> {
    const discrepancies: IntegrityDiscrepancy[] = [];

    // Build query for range
    const where: any = {};
    if (startSeq !== undefined || endSeq !== undefined) {
      where.sequenceNumber = {};
      if (startSeq !== undefined) where.sequenceNumber.gte = startSeq;
      if (endSeq !== undefined) where.sequenceNumber.lte = endSeq;
    }

    // Get logs in sequence order
    const logs = await this.prisma.immutableAuditLog.findMany({
      where,
      orderBy: { sequenceNumber: 'asc' },
    });

    let previousLog: ImmutableAuditLog | null = null;

    for (const log of logs) {
      // Check checksum
      const expectedChecksum = this.calculateChecksum(log);
      if (log.checksum !== expectedChecksum) {
        discrepancies.push({
          sequenceNumber: log.sequenceNumber,
          type: 'ChecksumMismatch',
          description: `Checksum mismatch for sequence ${log.sequenceNumber}`,
          severity: 'Critical',
        });
      }

      // Check chain hash
      if (previousLog && log.chainHash) {
        const expectedChainHash = this.calculateChainHash(previousLog.checksum);
        if (log.chainHash !== expectedChainHash) {
          discrepancies.push({
            sequenceNumber: log.sequenceNumber,
            type: 'ChainHashMismatch',
            description: `Chain hash broken at sequence ${log.sequenceNumber}`,
            severity: 'Critical',
          });
        }
      }

      previousLog = log;
    }

    // Check for sequence gaps
    for (let i = 1; i < logs.length; i++) {
      const expectedSeq = logs[i - 1].sequenceNumber + BigInt(1);
      if (logs[i].sequenceNumber !== expectedSeq) {
        discrepancies.push({
          sequenceNumber: logs[i].sequenceNumber,
          type: 'SequenceGap',
          description: `Sequence gap detected between ${logs[i - 1].sequenceNumber} and ${logs[i].sequenceNumber}`,
          severity: 'Critical',
        });
      }
    }

    const result: IntegrityCheckResult = {
      isValid: discrepancies.length === 0,
      startSequence: logs.length > 0 ? logs[0].sequenceNumber : BigInt(0),
      endSequence: logs.length > 0 ? logs[logs.length - 1].sequenceNumber : BigInt(0),
      totalRecordsChecked: logs.length,
      discrepanciesFound: discrepancies.length,
      discrepancies,
      checkedAt: new Date(),
      verifiedBy: 'ImmutableAuditTrailService',
    };

    // Store integrity check result
    await this.prisma.auditLogIntegrityCheck.create({
      data: {
        checkType: 'FullIntegrityCheck',
        checkDate: result.checkedAt,
        startSequence: result.startSequence,
        endSequence: result.endSequence,
        totalRecordsChecked: result.totalRecordsChecked,
        discrepanciesFound: result.discrepanciesFound,
        discrepancies: JSON.stringify(result.discrepancies),
        isValid: result.isValid,
        verifiedBy: result.verifiedBy,
      },
    });

    if (!result.isValid) {
      logger.error('Audit trail integrity check failed', {
        discrepanciesFound: result.discrepanciesFound,
        discrepancies: result.discrepancies,
      });
    }

    return result;
  }

  /**
   * Validate chain for a specific log entry
   */
  async validateChain(sequenceNumber: bigint): Promise<ChainValidationResult> {
    const log = await this.prisma.immutableAuditLog.findUnique({
      where: { sequenceNumber },
    });

    if (!log) {
      return {
        isValid: false,
        sequenceNumber,
        message: 'Log entry not found',
      };
    }

    if (!log.chainHash) {
      return {
        isValid: true,
        sequenceNumber,
        message: 'First entry in chain (no previous hash)',
      };
    }

    // Get previous log
    const previousLog = await this.prisma.immutableAuditLog.findUnique({
      where: { sequenceNumber: sequenceNumber - BigInt(1) },
    });

    if (!previousLog) {
      return {
        isValid: false,
        sequenceNumber,
        message: 'Previous log entry not found',
      };
    }

    const expectedHash = this.calculateChainHash(previousLog.checksum);
    const isValid = log.chainHash === expectedHash;

    return {
      isValid,
      sequenceNumber,
      expectedHash,
      actualHash: log.chainHash,
      message: isValid ? 'Chain is valid' : 'Chain hash mismatch',
    };
  }

  /**
   * Verify checksum for a single audit log
   */
  async verifyChecksum(auditLogId: string): Promise<boolean> {
    const log = await this.prisma.immutableAuditLog.findUnique({
      where: { id: auditLogId },
    });

    if (!log) {
      return false;
    }

    const expectedChecksum = this.calculateChecksum(log);
    return log.checksum === expectedChecksum;
  }

  /**
   * Detect tampering attempts
   * Returns logs that have integrity issues
   */
  async detectTamperingAttempts(): Promise<any[]> {
    const recentChecks = await this.prisma.auditLogIntegrityCheck.findMany({
      where: {
        isValid: false,
        checkDate: {
          gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Last 7 days
        },
      },
      orderBy: { checkDate: 'desc' },
      take: 100,
    });

    return recentChecks.map((check) => ({
      checkId: check.id,
      checkDate: check.checkDate,
      discrepanciesFound: check.discrepanciesFound,
      discrepancies: check.discrepancies ? JSON.parse(check.discrepancies) : [],
    }));
  }

  /**
   * Calculate SHA-256 checksum for an audit log entry
   */
  private calculateChecksum(log: any): string {
    const data = {
      eventType: log.eventType,
      eventCategory: log.eventCategory,
      severity: log.severity,
      actorId: log.actorId,
      actorType: log.actorType,
      resourceType: log.resourceType,
      resourceId: log.resourceId,
      action: log.action,
      oldValues: log.oldValues,
      newValues: log.newValues,
      timestamp: log.timestamp,
      success: log.success,
    };

    return createHash('sha256').update(JSON.stringify(data)).digest('hex');
  }

  /**
   * Calculate chain hash (hash of previous entry's checksum)
   */
  private calculateChainHash(previousChecksum: string): string {
    return createHash('sha256').update(previousChecksum).digest('hex');
  }
}
