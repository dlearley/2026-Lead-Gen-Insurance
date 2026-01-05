/**
 * Phase 25.1E: Audit Trail Immutability Enforcement
 *
 * Enforces append-only behavior for audit/compliance tables.
 *
 * This middleware is applied at the Prisma layer so it cannot be bypassed
 * by mistakenly calling update/delete in application code.
 */

import type { Prisma, PrismaClient } from '@prisma/client';

const IMMUTABLE_MODELS = new Set([
  // True append-only / forensic evidence tables
  'ImmutableAuditLog',
  'AuditLogIntegrityCheck',
  'SensitiveDataAccessLog',
  'SystemStateAuditLog',
  'AuditSnapshot',
]);

const MUTATION_ACTIONS = new Set<Prisma.PrismaAction>([
  'update',
  'updateMany',
  'delete',
  'deleteMany',
  'upsert',
]);

export function applyAuditImmutability(prisma: PrismaClient): void {
  prisma.$use(async (params, next) => {
    if (params.model && IMMUTABLE_MODELS.has(params.model) && MUTATION_ACTIONS.has(params.action)) {
      throw new Error(
        `Immutability violation: ${params.action} is not allowed on ${params.model}. Audit/compliance tables are append-only.`
      );
    }

    return next(params);
  });
}
