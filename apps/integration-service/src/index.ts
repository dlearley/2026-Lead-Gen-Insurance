// Integration Service - Main entry point

import app from './app.js'
import { setupObservability } from './observability.js'
import { setupErrorHandling } from './error-handling.js'

const PORT = process.env.PORT || 3003
const HOST = process.env.HOST || '0.0.0.0'

async function main() {
  // Setup observability
  await setupObservability()

  // Start server
  app.listen(PORT, HOST, () => {
    console.log(`🚀 Integration Service running on http://${HOST}:${PORT}`)
  })

  // Handle graceful shutdown
  process.on('SIGTERM', () => {
    console.log('🛑 SIGTERM received. Shutting down gracefully...')
    process.exit(0)
  })

  process.on('SIGINT', () => {
    console.log('🛑 SIGINT received. Shutting down gracefully...')
    process.exit(0)
  })

  process.on('uncaughtException', (error) => {
    console.error('❌ Uncaught Exception:', error)
    process.exit(1)
  })

  process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason)
  })
}

main().catch((error) => {
  console.error('❌ Failed to start integration service:', error)
  process.exit(1)
})