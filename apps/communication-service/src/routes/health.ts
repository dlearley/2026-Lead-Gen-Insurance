// Health Routes

import express from 'express'
import { PrismaClient } from '@prisma/client'

const router = express.Router()
const prisma = new PrismaClient()

router.get('/ready', async (req, res) => {
  try {
    // Check database connection
    await prisma.$queryRaw`SELECT 1`
    
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      checks: {
        database: 'connected',
      },
    })
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      error: 'Database connection failed',
      details: error instanceof Error ? error.message : undefined,
    })
  }
})

router.get('/live', (req, res) => {
  res.json({
    status: 'alive',
    timestamp: new Date().toISOString(),
  })
})

router.get('/metrics', (req, res) => {
  // In a real implementation, this would return Prometheus metrics
  res.json({
    status: 'metrics',
    timestamp: new Date().toISOString(),
  })
})

export default router