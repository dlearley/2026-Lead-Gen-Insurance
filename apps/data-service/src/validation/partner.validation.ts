// Partner Validation Schemas
import { z } from 'zod';

export const partnerSchemas = {
  createPartner: z.object({
    body: z.object({
      firstName: z.string().min(1).max(100),
      lastName: z.string().min(1).max(100),
      email: z.string().email(),
      phone: z.string().min(10).max(20),
      companyName: z.string().max(100).optional(),
      commissionRate: z.number().min(0).max(1).optional(),
      userId: z.string().uuid().optional()
    })
  }),

  updatePartner: z.object({
    body: z.object({
      firstName: z.string().min(1).max(100).optional(),
      lastName: z.string().min(1).max(100).optional(),
      email: z.string().email().optional(),
      phone: z.string().min(10).max(20).optional(),
      companyName: z.string().max(100).optional(),
      commissionRate: z.number().min(0).max(1).optional(),
      status: z.enum(['active', 'inactive', 'suspended', 'terminated']).optional()
    })
  }),

  getPartners: z.object({
    query: z.object({
      status: z.enum(['active', 'inactive', 'suspended', 'terminated']).optional(),
      search: z.string().optional(),
      dateFrom: z.string().datetime().optional(),
      dateTo: z.string().datetime().optional(),
      page: z.string().regex(/^\d+$/).transform(Number).default('1'),
      limit: z.string().regex(/^\d+$/).transform(Number).default('10')
    })
  }),

  updateStatistics: z.object({
    body: z.object({
      totalReferrals: z.number().int().nonnegative().optional(),
      successfulReferrals: z.number().int().nonnegative().optional(),
      totalEarnings: z.number().nonnegative().optional()
    })
  })
};