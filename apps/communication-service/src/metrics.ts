// Metrics setup

import express from 'express'
import client from 'prom-client'

// Create a Registry which registers the metrics
const register = new client.Registry()

// Add a default label which is added to all metrics
register.setDefaultLabels({
  app: 'communication-service',
})

// Enable the collection of default metrics
client.collectDefaultMetrics({ register })

// Custom metrics
const httpRequestDurationMicroseconds = new client.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'code'],
  buckets: [0.1, 0.3, 0.5, 0.7, 1, 3, 5, 7, 10],
})

const activeConnections = new client.Gauge({
  name: 'active_connections',
  help: 'Number of active WebSocket connections',
})

const messagesSent = new client.Counter({
  name: 'messages_sent_total',
  help: 'Total number of messages sent',
  labelNames: ['type'],
})

const callsMade = new client.Counter({
  name: 'calls_made_total',
  help: 'Total number of calls made',
  labelNames: ['type'],
})

export function setupMetrics(app: express.Application): void {
  console.log('📊 Setting up metrics')

  // Metrics endpoint
  app.get('/metrics', async (req, res) => {
    try {
      res.set('Content-Type', register.contentType)
      const metrics = await register.metrics()
      res.end(metrics)
    } catch (error) {
      res.status(500).end(error instanceof Error ? error.message : 'Unknown error')
    }
  })

  console.log('📊 Metrics configured')
}

export {
  httpRequestDurationMicroseconds,
  activeConnections,
  messagesSent,
  callsMade,
}