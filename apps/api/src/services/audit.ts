import type { Request } from 'express';
import {
  AuditLogService,
  ConsoleAuditWriter,
  type AuditLogRecordInput,
  type AuditWriter,
} from '@insurance-lead-gen/core';
import { createPrismaAuditWriter, prisma } from '@insurance-lead-gen/data-service';

const dbEnabled = process.env.NODE_ENV !== 'test' && process.env.AUDIT_LOG_DB_ENABLED !== 'false';

const writer: AuditWriter = dbEnabled ? createPrismaAuditWriter(prisma) : new ConsoleAuditWriter();

export const auditLogService = new AuditLogService(writer, {
  batchDelayMs: parseInt(process.env.AUDIT_LOG_BATCH_DELAY_MS || '100'),
  batchSize: parseInt(process.env.AUDIT_LOG_BATCH_SIZE || '100'),
});

export function buildAuditContext(req: Request): Omit<AuditLogRecordInput, 'action' | 'status'> {
  return {
    userId: req.user?.id,
    userEmail: req.user?.email,
    ipAddress: req.ip || req.socket.remoteAddress,
    userAgent: req.get('user-agent') || undefined,
    requestId: (req as any).requestId || req.get('x-request-id') || undefined,
    sessionId: (req as any).sessionId || undefined,
    authContext: req.user ? { role: req.user.role } : undefined,
  };
}
