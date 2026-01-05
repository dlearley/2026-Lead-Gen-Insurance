// Health check setup

import express from 'express'

export function setupHealthChecks(app: express.Application): void {
  console.log('❤️  Setting up health checks')

  app.get('/health/ready', (req, res) => {
    res.json({
      status: 'healthy',
      service: 'communication-service',
      timestamp: new Date().toISOString(),
    })
  })

  app.get('/health/live', (req, res) => {
    res.json({
      status: 'alive',
      service: 'communication-service',
      timestamp: new Date().toISOString(),
    })
  })

  console.log('❤️  Health checks configured')
}