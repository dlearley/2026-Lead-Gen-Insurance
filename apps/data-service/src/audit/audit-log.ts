/* eslint-disable @typescript-eslint/no-explicit-any */
import type { PrismaClient } from '@prisma/client';
import { Prisma } from '@prisma/client';
import { logger, type AuditLogRecord, type AuditWriter } from '@insurance-lead-gen/core';

export interface AuditLogQuery {
  userId?: string;
  userEmail?: string;
  action?: string;
  resourceType?: string;
  resourceId?: string;
  status?: 'success' | 'failure';
  requestId?: string;
  dateFrom?: Date;
  dateTo?: Date;
  take?: number;
  skip?: number;
}

export interface AuditLogRow {
  audit_id: string;
  timestamp: Date;
  user_id: string | null;
  user_email: string | null;
  action: string;
  resource_type: string | null;
  resource_id: string | null;
  old_values: any | null;
  new_values: any | null;
  status: string;
  error_message: string | null;
  ip_address: string | null;
  user_agent: string | null;
  request_id: string | null;
  session_id: string | null;
  auth_context: any | null;
}

export async function ensureAuditLogInfrastructure(prisma: PrismaClient): Promise<void> {
  try {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS audit_logs (
        audit_id uuid PRIMARY KEY,
        timestamp timestamptz NOT NULL,
        user_id text NULL,
        user_email text NULL,
        action text NOT NULL,
        resource_type text NULL,
        resource_id text NULL,
        old_values jsonb NULL,
        new_values jsonb NULL,
        status text NOT NULL,
        error_message text NULL,
        ip_address text NULL,
        user_agent text NULL,
        request_id text NULL,
        session_id text NULL,
        auth_context jsonb NULL
      );
    `);

    await prisma.$executeRawUnsafe(
      `CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);`
    );
    await prisma.$executeRawUnsafe(
      `CREATE INDEX IF NOT EXISTS idx_audit_logs_user_email ON audit_logs(user_email);`
    );
    await prisma.$executeRawUnsafe(
      `CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs(timestamp DESC);`
    );
    await prisma.$executeRawUnsafe(
      `CREATE INDEX IF NOT EXISTS idx_audit_logs_resource ON audit_logs(resource_type, resource_id);`
    );
    await prisma.$executeRawUnsafe(
      `CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);`
    );

    // Best-effort immutability: prevent UPDATE/DELETE
    await prisma.$executeRawUnsafe(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'prevent_audit_log_modification') THEN
          CREATE OR REPLACE FUNCTION prevent_audit_log_modification() RETURNS trigger AS $$
          BEGIN
            RAISE EXCEPTION 'audit_logs are immutable';
          END;
          $$ LANGUAGE plpgsql;
        END IF;
      END $$;
    `);

    await prisma.$executeRawUnsafe(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'audit_logs_no_update') THEN
          CREATE TRIGGER audit_logs_no_update
          BEFORE UPDATE ON audit_logs
          FOR EACH ROW EXECUTE FUNCTION prevent_audit_log_modification();
        END IF;

        IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'audit_logs_no_delete') THEN
          CREATE TRIGGER audit_logs_no_delete
          BEFORE DELETE ON audit_logs
          FOR EACH ROW EXECUTE FUNCTION prevent_audit_log_modification();
        END IF;
      END $$;
    `);
  } catch (error) {
    logger.warn('Failed to ensure audit log infrastructure (best-effort)', {
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

export async function insertAuditLog(prisma: PrismaClient, record: AuditLogRecord): Promise<void> {
  await insertAuditLogs(prisma, [record]);
}

export async function insertAuditLogs(prisma: PrismaClient, records: AuditLogRecord[]): Promise<void> {
  if (records.length === 0) return;

  const values = records.map((r) =>
    Prisma.sql`(
      ${r.auditId}::uuid,
      ${r.timestamp},
      ${r.userId ?? null},
      ${r.userEmail ?? null},
      ${r.action},
      ${r.resourceType ?? null},
      ${r.resourceId ?? null},
      ${r.oldValues ?? null}::jsonb,
      ${r.newValues ?? null}::jsonb,
      ${r.status},
      ${r.errorMessage ?? null},
      ${r.ipAddress ?? null},
      ${r.userAgent ?? null},
      ${r.requestId ?? null},
      ${r.sessionId ?? null},
      ${r.authContext ?? null}::jsonb
    )`
  );

  await prisma.$executeRaw(
    Prisma.sql`
      INSERT INTO audit_logs (
        audit_id, timestamp, user_id, user_email, action, resource_type, resource_id,
        old_values, new_values, status, error_message, ip_address, user_agent, request_id, session_id, auth_context
      ) VALUES ${Prisma.join(values)}
    `
  );
}

export async function queryAuditLogs(prisma: PrismaClient, query: AuditLogQuery = {}): Promise<{ total: number; rows: AuditLogRow[] }> {
  const where: Prisma.Sql[] = [];

  if (query.userId) where.push(Prisma.sql`user_id = ${query.userId}`);
  if (query.userEmail) where.push(Prisma.sql`user_email = ${query.userEmail}`);
  if (query.action) where.push(Prisma.sql`action = ${query.action}`);
  if (query.resourceType) where.push(Prisma.sql`resource_type = ${query.resourceType}`);
  if (query.resourceId) where.push(Prisma.sql`resource_id = ${query.resourceId}`);
  if (query.status) where.push(Prisma.sql`status = ${query.status}`);
  if (query.requestId) where.push(Prisma.sql`request_id = ${query.requestId}`);
  if (query.dateFrom) where.push(Prisma.sql`timestamp >= ${query.dateFrom}`);
  if (query.dateTo) where.push(Prisma.sql`timestamp <= ${query.dateTo}`);

  const whereSql = where.length ? Prisma.sql`WHERE ${Prisma.join(where, Prisma.sql` AND `)}` : Prisma.empty;

  const take = Math.min(Math.max(query.take ?? 100, 1), 1000);
  const skip = Math.max(query.skip ?? 0, 0);

  const [rows, totalRows] = await Promise.all([
    prisma.$queryRaw<AuditLogRow[]>(
      Prisma.sql`
        SELECT
          audit_id, timestamp, user_id, user_email, action, resource_type, resource_id,
          old_values, new_values, status, error_message, ip_address, user_agent, request_id, session_id, auth_context
        FROM audit_logs
        ${whereSql}
        ORDER BY timestamp DESC
        LIMIT ${take}
        OFFSET ${skip}
      `
    ),
    prisma.$queryRaw<{ count: bigint }[]>(
      Prisma.sql`SELECT COUNT(*)::bigint as count FROM audit_logs ${whereSql}`
    ),
  ]);

  return { total: Number(totalRows[0]?.count ?? 0n), rows };
}

export function createPrismaAuditWriter(prisma: PrismaClient): AuditWriter {
  return {
    write: async (record) => {
      await insertAuditLog(prisma, record);
    },
    writeBatch: async (records) => {
      await insertAuditLogs(prisma, records);
    },
  };
}
