import { z } from 'zod';

export const createLeadSchema = z
  .object({
    source: z.string().min(1),
    email: z.string().email().optional(),
    phone: z.string().min(6).optional(),
    firstName: z.string().min(1).optional(),
    lastName: z.string().min(1).optional(),
    address: z
      .object({
        street: z.string().optional(),
        city: z.string().optional(),
        state: z.string().optional(),
        zipCode: z.string().optional(),
        country: z.string().optional(),
      })
      .optional(),
    insuranceType: z.enum(['auto', 'home', 'life', 'health', 'commercial']).optional(),
    metadata: z.record(z.unknown()).optional(),
  })
  .refine((val) => val.email || val.phone, {
    message: 'Either email or phone is required',
  });

export type CreateLeadInput = z.infer<typeof createLeadSchema>;
