// Error handling setup

import { Server } from 'http'

export function setupErrorHandling(server: Server): void {
  console.log('⚠️  Setting up error handling')

  // Uncaught exception handler
  process.on('uncaughtException', (error) => {
    console.error('❌ Uncaught Exception:', error)
    // In production, you might want to restart the process
  })

  // Unhandled rejection handler
  process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason)
  })

  // Server error handler
  server.on('error', (error) => {
    console.error('❌ Server Error:', error)
  })

  console.log('⚠️  Error handling configured')
}