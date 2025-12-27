// Referral Validation Schemas
import { z } from 'zod';

export const referralSchemas = {
  createReferral: z.object({
    body: z.object({
      partnerId: z.string().uuid(),
      referralCode: z.string().min(1).max(50),
      source: z.enum(['website', 'mobile_app', 'email', 'phone', 'in_person', 'social_media', 'other']),
      leadId: z.string().uuid().optional(),
      notes: z.string().max(500).optional()
    })
  }),

  updateReferral: z.object({
    body: z.object({
      status: z.enum(['pending', 'accepted', 'rejected', 'converted', 'paid', 'expired']).optional(),
      leadId: z.string().uuid().optional(),
      notes: z.string().max(500).optional(),
      conversionValue: z.number().positive().optional()
    })
  }),

  getReferrals: z.object({
    query: z.object({
      partnerId: z.string().uuid().optional(),
      leadId: z.string().uuid().optional(),
      status: z.enum(['pending', 'accepted', 'rejected', 'converted', 'paid', 'expired']).optional(),
      source: z.enum(['website', 'mobile_app', 'email', 'phone', 'in_person', 'social_media', 'other']).optional(),
      search: z.string().optional(),
      dateFrom: z.string().datetime().optional(),
      dateTo: z.string().datetime().optional(),
      page: z.string().regex(/^\d+$/).transform(Number).default('1'),
      limit: z.string().regex(/^\d+$/).transform(Number).default('10')
    })
  }),

  linkToLead: z.object({
    body: z.object({
      leadId: z.string().uuid()
    })
  }),

  processConversion: z.object({
    body: z.object({
      conversionValue: z.number().positive()
    })
  })
};