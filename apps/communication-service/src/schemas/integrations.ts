// Integration Schemas

import { z } from 'zod'

export const integrationSchemas = {
  connectIntegration: z.object({
    credentials: z.record(z.any()),
    config: z.record(z.any()).optional(),
  }),

  updateIntegration: z.object({
    credentials: z.record(z.any()).optional(),
    config: z.record(z.any()).optional(),
    isActive: z.boolean().optional(),
    syncEnabled: z.boolean().optional(),
  }),
}

export const syncSchemas = {
  triggerSync: z.object({
    syncType: z.string(),
    direction: z.enum(['one_way', 'two_way']),
  }),
}

export const webhookSchemas = {
  registerWebhook: z.object({
    event: z.string(),
  }),
}

export const mappingSchemas = {
  createFieldMapping: z.object({
    sourceField: z.string(),
    targetField: z.string(),
    transformationRules: z.record(z.any()).optional(),
  }),
}