/**
 * Prisma Client for API Service
 */

import { PrismaClient } from '@prisma/client';
import { applyAuditImmutability } from '../middleware/audit-immutability.middleware.js';

export const prisma = new PrismaClient();

applyAuditImmutability(prisma);
