// Communication Service - Main entry point

import { createServer } from 'http'
import { Server } from 'socket.io'
import app from './app.js'
import { setupWebSocketServer } from './websocket.js'
import { setupObservability } from './observability.js'
import { setupErrorHandling } from './error-handling.js'

const PORT = process.env.PORT || 3002
const HOST = process.env.HOST || '0.0.0.0'

async function main() {
  // Setup observability
  await setupObservability()

  // Create HTTP server
  const server = createServer(app)

  // Setup WebSocket server
  const io = new Server(server, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
    },
  })

  // Setup WebSocket handlers
  setupWebSocketServer(io)

  // Setup error handling
  setupErrorHandling(server)

  // Start server
  server.listen(PORT, HOST, () => {
    console.log(`🚀 Communication Service running on http://${HOST}:${PORT}`)
    console.log(`🔌 WebSocket server running on ws://${HOST}:${PORT}`)
  })

  // Handle graceful shutdown
  process.on('SIGTERM', () => {
    console.log('🛑 SIGTERM received. Shutting down gracefully...')
    server.close(() => {
      console.log('👋 Server closed')
      process.exit(0)
    })
  })

  process.on('SIGINT', () => {
    console.log('🛑 SIGINT received. Shutting down gracefully...')
    server.close(() => {
      console.log('👋 Server closed')
      process.exit(0)
    })
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
  console.error('❌ Failed to start communication service:', error)
  process.exit(1)
})