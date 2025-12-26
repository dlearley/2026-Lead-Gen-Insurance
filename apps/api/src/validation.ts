import { z } from 'zod';
import type { Lead } from '@insurance-lead-gen/types';

// Lead validation schema using Zod
export const leadSchema = z.object({
  source: z.string().min(1, 'Source is required'),
  email: z.string().email('Invalid email format').optional(),
  phone: z.string().min(10, 'Phone must be at least 10 characters').optional(),
  firstName: z.string().min(1, 'First name is required').optional(),
  lastName: z.string().min(1, 'Last name is required').optional(),
  address: z.object({
    street: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    zipCode: z.string().optional(),
    country: z.string().optional(),
  }).optional(),
  insuranceType: z.enum(['auto', 'home', 'life', 'health', 'commercial']).optional(),
  qualityScore: z.number().min(0).max(100).optional(),
  status: z.enum(['received', 'processing', 'qualified', 'routed', 'converted', 'rejected']).optional(),
  metadata: z.record(z.unknown()).optional(),
});

export function validateLead(leadData: Partial<Lead>) {
  try {
    const result = leadSchema.safeParse(leadData);
    
    if (result.success) {
      return {
        success: true,
        data: result.data,
      };
    } else {
      return {
        success: false,
        errors: result.error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message,
        })),
      };
    }
  } catch (error) {
    return {
      success: false,
      errors: [{ field: 'validation', message: 'Validation error' }],
    };
  }
}