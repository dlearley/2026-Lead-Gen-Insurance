// WebSocket Server - Real-time communication

import { Server as SocketIOServer } from 'socket.io'
import { SignalingService } from '@insurance-lead-gen/communication'
import { setupMessageHandlers } from './websocket/message-handlers.js'
import { setupCallHandlers } from './websocket/call-handlers.js'
import { setupPresenceHandlers } from './websocket/presence-handlers.js'
import { setupDocumentHandlers } from './websocket/document-handlers.js'

export function setupWebSocketServer(io: SocketIOServer): void {
  console.log('🔌 Setting up WebSocket server')

  // Setup signaling service
  const signalingService = new SignalingService(io)

  // Setup handlers
  setupMessageHandlers(io)
  setupCallHandlers(io, signalingService)
  setupPresenceHandlers(io)
  setupDocumentHandlers(io)

  // Connection handling
  io.on('connection', (socket) => {
    console.log('🔌 New WebSocket connection:', socket.id)

    socket.on('disconnect', () => {
      console.log('🔌 WebSocket disconnected:', socket.id)
    })

    socket.on('error', (error) => {
      console.error('🔌 WebSocket error:', error)
    })
  })

  console.log('🔌 WebSocket server configured')
}