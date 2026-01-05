// Notification Schemas

import { z } from 'zod'

export const notificationSchemas = {
  createNotification: z.object({
    userId: z.string().optional(),
    type: z.enum(['message', 'call', 'case', 'document']),
    title: z.string(),
    message: z.string(),
    actionUrl: z.string().optional(),
  }),

  updatePreferences: z.object({
    pushEnabled: z.boolean().optional(),
    emailEnabled: z.boolean().optional(),
    messageNotifications: z.enum(['all', 'mentions', 'none']).optional(),
    callNotifications: z.boolean().optional(),
    caseNotifications: z.boolean().optional(),
    documentNotifications: z.boolean().optional(),
    quietHoursStart: z.string().optional(),
    quietHoursEnd: z.string().optional(),
    quietHoursEnabled: z.boolean().optional(),
  }),
}

export const pushSchemas = {
  registerToken: z.object({
    token: z.string(),
    platform: z.enum(['ios', 'android', 'web']),
    deviceName: z.string().optional(),
  }),

  sendPushNotification: z.object({
    userId: z.string(),
    title: z.string(),
    body: z.string(),
    data: z.record(z.any()).optional(),
  }),

  sendBroadcastNotification: z.object({
    title: z.string(),
    body: z.string(),
    data: z.record(z.any()).optional(),
  }),
}