// Communication Service - Express app setup

import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import compression from 'compression'
import { setupRoutes } from './routes/index.js'
import { setupMiddleware } from './middleware/index.js'
import { setupHealthChecks } from './health.js'
import { setupMetrics } from './metrics.js'

const app = express()

// Security middleware
app.use(helmet())

// CORS
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-request-id'],
}))

// Compression
app.use(compression())

// JSON parsing
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))

// Setup middleware
setupMiddleware(app)

// Setup health checks
setupHealthChecks(app)

// Setup metrics
setupMetrics(app)

// Setup routes
setupRoutes(app)

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('❌ Error:', err)
  res.status(500).json({
    error: 'Internal Server Error',
    message: err.message || 'Something went wrong',
  })
})

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: 'The requested resource was not found',
  })
})

export default app