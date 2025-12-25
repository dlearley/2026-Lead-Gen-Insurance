import { z } from 'zod';

export const addressSchema = z.object({
  street: z.string().min(1).max(255).optional(),
  city: z.string().min(1).max(100).optional(),
  state: z.string().min(2).max(50).optional(),
  zipCode: z.string().regex(/^\d{5}(-\d{4})?$/).optional(),
  country: z.string().length(2).optional(),
});

export const leadCreateSchema = z.object({
  source: z.string().min(1).max(100),
  email: z.string().email().optional(),
  phone: z.string().regex(/^\+?[\d\s\-()]+$/).optional(),
  firstName: z.string().min(1).max(100).optional(),
  lastName: z.string().min(1).max(100).optional(),
  address: addressSchema.optional(),
  insuranceType: z.enum(['auto', 'home', 'life', 'health', 'commercial']).optional(),
  metadata: z.record(z.unknown()).optional(),
});

export const leadUpdateSchema = leadCreateSchema.partial();

export const leadQuerySchema = z.object({
  page: z.coerce.number().positive().default(1),
  limit: z.coerce.number().positive().max(100).default(20),
  status: z.enum(['received', 'processing', 'qualified', 'routed', 'converted', 'rejected']).optional(),
  source: z.string().optional(),
  insuranceType: z.enum(['auto', 'home', 'life', 'health', 'commercial']).optional(),
  minScore: z.coerce.number().min(0).max(100).optional(),
  maxScore: z.coerce.number().min(0).max(100).optional(),
  fromDate: z.coerce.date().optional(),
  toDate: z.coerce.date().optional(),
});

export type LeadCreateInput = z.infer<typeof leadCreateSchema>;
export type LeadUpdateInput = z.infer<typeof leadUpdateSchema>;
export type LeadQueryInput = z.infer<typeof leadQuerySchema>;
