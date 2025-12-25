import { z } from 'zod';
import { logger } from '@insurance-lead-gen/core';

// Lead validation schema
const leadSchema = z.object({
  source: z.string().optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  address: z.object({
    street: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    zipCode: z.string().optional(),
    country: z.string().optional(),
  }).optional(),
  insuranceType: z.enum(['auto', 'home', 'life', 'health', 'commercial']).optional(),
  qualityScore: z.number().min(0).max(100).optional(),
  metadata: z.record(z.unknown()).optional(),
});

export function validateLead(leadData: any) {
  try {
    const result = leadSchema.safeParse(leadData);
    
    if (result.success) {
      return { valid: true };
    } else {
      const errors = result.error.errors.map(err => ({
        path: err.path.join('.'),
        message: err.message,
      }));
      
      return { valid: false, errors };
    }
  } catch (error) {
    logger.error('Validation error', { error: error.message });
    return { 
      valid: false, 
      errors: [{ path: 'unknown', message: 'Validation failed' }]
    };
  }
}