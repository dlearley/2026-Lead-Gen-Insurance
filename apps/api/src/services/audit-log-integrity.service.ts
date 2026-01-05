/**
 * Phase 25.1E: Audit Log Integrity Service
 *
 * Performs periodic verification of audit log integrity:
 * - sequence validation (detect gaps)
 * - checksum validation
 * - chain validation (blockchain-style)
 */

import { PrismaClient } from '@prisma/client';
import { createHash } from 'crypto';
import { logger } from '@insurance-lead-gen/core';
import type {
  IntegrityCheckResult,
  SequenceValidation,
  ChecksumValidation,
  ChainValidationResult,
  SequenceGap,
} from '@insurance-lead-gen/types';

export class AuditLogIntegrityService {
  constructor(private readonly prisma: PrismaClient) {}

  async verifyIntegrity(startSeq?: bigint, endSeq?: bigint): Promise<IntegrityCheckResult> {
    const seq = await this.validateSequence(startSeq, endSeq);
    const checksums = await this.validateChecksums(startSeq, endSeq);
    const chain = await this.validateChain(startSeq, endSeq);

    const discrepancies = [
      ...seq.gaps.map((g) => ({
        sequenceNumber: g.start,
        type: 'SequenceGap',
        description: `Missing ${g.missingCount} records between ${g.start} and ${g.end}`,
        severity: 'Critical',
      })),
      ...seq.duplicates.map((d) => ({
        sequenceNumber: d,
        type: 'DuplicateSequence',
        description: `Duplicate sequence number detected: ${d}`,
        severity: 'Critical',
      })),
      ...checksums.invalidRecords.map((id) => ({
        sequenceNumber: BigInt(0),
        type: 'ChecksumMismatch',
        description: `Checksum mismatch for audit log ID: ${id}`,
        severity: 'Critical',
      })),
      ...chain.invalid.map((r) => ({
        sequenceNumber: r.sequenceNumber,
        type: 'ChainHashMismatch',
        description: r.message,
        severity: 'Critical',
      })),
    ];

    const bounds = await this.getBounds(startSeq, endSeq);

    const result: IntegrityCheckResult = {
      isValid: discrepancies.length === 0,
      startSequence: bounds.start,
      endSequence: bounds.end,
      totalRecordsChecked: bounds.total,
      discrepanciesFound: discrepancies.length,
      discrepancies,
      checkedAt: new Date(),
      verifiedBy: 'AuditLogIntegrityService',
    };

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
      logger.error('Audit log integrity failed', {
        discrepanciesFound: result.discrepanciesFound,
      });
    }

    return result;
  }

  async validateSequence(startSeq?: bigint, endSeq?: bigint): Promise<SequenceValidation> {
    const where: any = {};
    if (startSeq !== undefined || endSeq !== undefined) {
      where.sequenceNumber = {};
      if (startSeq !== undefined) where.sequenceNumber.gte = startSeq;
      if (endSeq !== undefined) where.sequenceNumber.lte = endSeq;
    }

    const logs = await this.prisma.immutableAuditLog.findMany({
      where,
      orderBy: { sequenceNumber: 'asc' },
      select: { sequenceNumber: true },
    });

    const gaps: SequenceGap[] = [];
    const duplicates: bigint[] = [];

    for (let i = 1; i < logs.length; i++) {
      const prev = logs[i - 1].sequenceNumber;
      const current = logs[i].sequenceNumber;

      if (current === prev) {
        duplicates.push(current);
      }

      const expected = prev + BigInt(1);
      if (current !== expected) {
        const missingCount = Number(current - expected);
        gaps.push({
          start: expected,
          end: current - BigInt(1),
          missingCount,
        });
      }
    }

    return {
      isValid: gaps.length === 0 && duplicates.length === 0,
      gaps,
      duplicates,
      totalRecords: logs.length,
    };
  }

  async validateChecksums(startSeq?: bigint, endSeq?: bigint): Promise<ChecksumValidation> {
    const where: any = {};
    if (startSeq !== undefined || endSeq !== undefined) {
      where.sequenceNumber = {};
      if (startSeq !== undefined) where.sequenceNumber.gte = startSeq;
      if (endSeq !== undefined) where.sequenceNumber.lte = endSeq;
    }

    const logs = await this.prisma.immutableAuditLog.findMany({
      where,
      orderBy: { sequenceNumber: 'asc' },
    });

    const invalidRecords: string[] = [];

    for (const log of logs) {
      const expected = this.calculateChecksum(log);
      if (log.checksum !== expected) {
        invalidRecords.push(log.id);
      }
    }

    return {
      isValid: invalidRecords.length === 0,
      invalidRecords,
      totalChecked: logs.length,
    };
  }

  async validateChain(startSeq?: bigint, endSeq?: bigint): Promise<{ isValid: boolean; invalid: ChainValidationResult[] }> {
    const where: any = {};
    if (startSeq !== undefined || endSeq !== undefined) {
      where.sequenceNumber = {};
      if (startSeq !== undefined) where.sequenceNumber.gte = startSeq;
      if (endSeq !== undefined) where.sequenceNumber.lte = endSeq;
    }

    const logs = await this.prisma.immutableAuditLog.findMany({
      where,
      orderBy: { sequenceNumber: 'asc' },
      select: { sequenceNumber: true, checksum: true, chainHash: true },
    });

    const invalid: ChainValidationResult[] = [];

    for (let i = 1; i < logs.length; i++) {
      const current = logs[i];
      const previous = logs[i - 1];

      if (!current.chainHash) {
        invalid.push({
          isValid: false,
          sequenceNumber: current.sequenceNumber,
          message: 'Missing chain hash',
        });
        continue;
      }

      const expected = this.calculateChainHash(previous.checksum);
      if (current.chainHash !== expected) {
        invalid.push({
          isValid: false,
          sequenceNumber: current.sequenceNumber,
          expectedHash: expected,
          actualHash: current.chainHash,
          message: 'Chain hash mismatch',
        });
      }
    }

    return { isValid: invalid.length === 0, invalid };
  }

  async detectGaps(startSeq?: bigint, endSeq?: bigint): Promise<SequenceGap[]> {
    const validation = await this.validateSequence(startSeq, endSeq);
    return validation.gaps;
  }

  async generateIntegrityReport(): Promise<{
    latestCheck: any | null;
    last7Days: any[];
    status: 'Healthy' | 'Degraded' | 'Critical';
  }> {
    const latestCheck = await this.prisma.auditLogIntegrityCheck.findFirst({
      orderBy: { checkDate: 'desc' },
    });

    const last7Days = await this.prisma.auditLogIntegrityCheck.findMany({
      where: {
        checkDate: {
          gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        },
      },
      orderBy: { checkDate: 'desc' },
    });

    const invalidCount = last7Days.filter((c) => !c.isValid).length;
    const status: 'Healthy' | 'Degraded' | 'Critical' =
      invalidCount === 0 ? 'Healthy' : invalidCount < 3 ? 'Degraded' : 'Critical';

    return {
      latestCheck,
      last7Days,
      status,
    };
  }

  private async getBounds(startSeq?: bigint, endSeq?: bigint): Promise<{ start: bigint; end: bigint; total: number }> {
    const where: any = {};
    if (startSeq !== undefined || endSeq !== undefined) {
      where.sequenceNumber = {};
      if (startSeq !== undefined) where.sequenceNumber.gte = startSeq;
      if (endSeq !== undefined) where.sequenceNumber.lte = endSeq;
    }

    const first = await this.prisma.immutableAuditLog.findFirst({
      where,
      orderBy: { sequenceNumber: 'asc' },
      select: { sequenceNumber: true },
    });

    const last = await this.prisma.immutableAuditLog.findFirst({
      where,
      orderBy: { sequenceNumber: 'desc' },
      select: { sequenceNumber: true },
    });

    const total = await this.prisma.immutableAuditLog.count({ where });

    return {
      start: first?.sequenceNumber ?? BigInt(0),
      end: last?.sequenceNumber ?? BigInt(0),
      total,
    };
  }

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

  private calculateChainHash(previousChecksum: string): string {
    return createHash('sha256').update(previousChecksum).digest('hex');
  }
}
