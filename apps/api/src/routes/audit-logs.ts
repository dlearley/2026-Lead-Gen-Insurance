/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-explicit-any */
import { Router, type Request, type Response } from 'express';
import { z } from 'zod';
import { prisma, queryAuditLogs } from '@insurance-lead-gen/data-service';
import { maskCommonPIIFields } from '@insurance-lead-gen/core';

import { authMiddleware, requireRole } from '../middleware/auth.js';
import { auditLogService, buildAuditContext } from '../services/audit.js';

const router = Router();

const querySchema = z.object({
  userId: z.string().optional(),
  userEmail: z.string().email().optional(),
  action: z.string().optional(),
  resourceType: z.string().optional(),
  resourceId: z.string().optional(),
  status: z.enum(['success', 'failure']).optional(),
  requestId: z.string().optional(),
  dateFrom: z.string().datetime().optional(),
  dateTo: z.string().datetime().optional(),
  take: z.coerce.number().int().min(1).max(1000).optional(),
  skip: z.coerce.number().int().min(0).optional(),
});

router.get('/', authMiddleware, requireRole(['ADMIN', 'SUPER_ADMIN']), async (req: Request, res: Response) => {
  const parsed = querySchema.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid query params', details: parsed.error.errors });
    return;
  }

  const q = parsed.data;

  await auditLogService.logCritical({
    ...buildAuditContext(req),
    action: 'audit_log_query',
    resourceType: 'audit_log',
    status: 'success',
    newValues: { ...q },
  });

  const result = await queryAuditLogs(prisma, {
    ...q,
    dateFrom: q.dateFrom ? new Date(q.dateFrom) : undefined,
    dateTo: q.dateTo ? new Date(q.dateTo) : undefined,
  });

  res.json({
    success: true,
    total: result.total,
    data: result.rows,
  });
});

const exportQuerySchema = querySchema.extend({
  format: z.enum(['json', 'csv']).default('json'),
});

router.get(
  '/export',
  authMiddleware,
  requireRole(['ADMIN', 'SUPER_ADMIN']),
  async (req: Request, res: Response) => {
    const parsed = exportQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      res.status(400).json({ error: 'Invalid query params', details: parsed.error.errors });
      return;
    }

    const { format, ...q } = parsed.data;

    await auditLogService.logCritical({
      ...buildAuditContext(req),
      action: 'audit_log_export',
      resourceType: 'audit_log',
      status: 'success',
      newValues: { ...q, format, masked: true },
    });

    const result = await queryAuditLogs(prisma, {
      ...q,
      take: q.take ?? 1000,
      dateFrom: q.dateFrom ? new Date(q.dateFrom) : undefined,
      dateTo: q.dateTo ? new Date(q.dateTo) : undefined,
    });

    const maskedRows = result.rows.map((r) => maskCommonPIIFields(r));

    if (format === 'json') {
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', 'attachment; filename="audit-logs.json"');
      res.status(200).send(JSON.stringify({ total: result.total, data: maskedRows }, null, 2));
      return;
    }

    const headers = [
      'audit_id',
      'timestamp',
      'user_id',
      'user_email',
      'action',
      'resource_type',
      'resource_id',
      'status',
      'error_message',
      'ip_address',
      'user_agent',
      'request_id',
      'session_id',
    ];

    const escape = (value: unknown) => {
      const s = value === null || value === undefined ? '' : String(value);
      return `"${s.replace(/"/g, '""')}"`;
    };

    const lines = [headers.join(',')];
    for (const row of maskedRows as any[]) {
      lines.push(
        headers
          .map((h) => {
            if (h === 'timestamp') return escape(new Date(row[h]).toISOString());
            return escape(row[h]);
          })
          .join(',')
      );
    }

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="audit-logs.csv"');
    res.status(200).send(lines.join('\n'));
  }
);

export default router;
