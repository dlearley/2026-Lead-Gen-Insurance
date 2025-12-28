// Reward Validation Schemas
import { z } from 'zod';

export const rewardSchemas = {
  createReward: z.object({
    body: z.object({
      partnerId: z.string().uuid(),
      referralId: z.string().uuid(),
      amount: z.number().positive(),
      currency: z.string().min(3).max(3).optional(),
      notes: z.string().max(500).optional()
    })
  }),

  updateReward: z.object({
    body: z.object({
      status: z.enum(['pending', 'calculated', 'approved', 'paid', 'cancelled']).optional(),
      amount: z.number().positive().optional(),
      paymentMethod: z.string().min(1).max(50).optional(),
      transactionId: z.string().min(1).max(100).optional(),
      notes: z.string().max(500).optional()
    })
  }),

  getRewards: z.object({
    query: z.object({
      partnerId: z.string().uuid().optional(),
      referralId: z.string().uuid().optional(),
      status: z.enum(['pending', 'calculated', 'approved', 'paid', 'cancelled']).optional(),
      search: z.string().optional(),
      dateFrom: z.string().datetime().optional(),
      dateTo: z.string().datetime().optional(),
      page: z.string().regex(/^\d+$/).transform(Number).default('1'),
      limit: z.string().regex(/^\d+$/).transform(Number).default('10')
    })
  }),

  calculateReward: z.object({
    body: z.object({
      conversionValue: z.number().positive()
    })
  }),

  processPayment: z.object({
    body: z.object({
      paymentMethod: z.string().min(1).max(50),
      transactionId: z.string().min(1).max(100)
    })
  }),

  bulkApprove: z.object({
    body: z.object({
      rewardIds: z.array(z.string().uuid())
    })
  })
};