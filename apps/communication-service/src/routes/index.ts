// Communication Service - Route setup

import express from 'express'
import messagingRoutes from './messaging.js'
import webrtcRoutes from './webrtc.js'
import collaborationRoutes from './collaboration.js'
import notificationsRoutes from './notifications.js'
import integrationsRoutes from './integrations.js'
import healthRoutes from './health.js'

export function setupRoutes(app: express.Application): void {
  // Messaging routes
  app.use('/api/messages', messagingRoutes)

  // WebRTC routes
  app.use('/api/calls', webrtcRoutes)

  // Collaboration routes
  app.use('/api/cases', collaborationRoutes)
  app.use('/api/documents', collaborationRoutes)

  // Notifications routes
  app.use('/api/notifications', notificationsRoutes)

  // Integrations routes
  app.use('/api/integrations', integrationsRoutes)

  // Health routes
  app.use('/health', healthRoutes)

  console.log('🚦 Routes configured')
}