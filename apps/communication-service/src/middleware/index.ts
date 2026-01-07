// Middleware setup

import express from 'express'
import { requestLogger } from './logger.js'
import { errorHandler } from './error-handler.js'
import { rateLimiter } from './rate-limiter.js'
import { requestId } from './request-id.js'

export function setupMiddleware(app: express.Application): void {
  // Request ID middleware
  app.use(requestId)

  // Request logging
  app.use(requestLogger)

  // Rate limiting
  app.use(rateLimiter)

  console.log('⚙️  Middleware configured')
}