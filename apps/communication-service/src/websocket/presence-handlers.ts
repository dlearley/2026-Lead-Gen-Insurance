// WebSocket Presence Handlers

import { Server as SocketIOServer, Socket } from 'socket.io'

export function setupPresenceHandlers(io: SocketIOServer): void {
  io.of('/presence').on('connection', (socket: Socket) => {
    console.log('👤 Presence socket connected:', socket.id)

    socket.on('updatePresence', (userId: string, status: string) => {
      socket.broadcast.emit('presenceUpdate', { userId, status })
    })

    socket.on('subscribeToUser', (userId: string) => {
      socket.join(`user_${userId}`)
      console.log(`👤 Subscribed to user ${userId}`)
    })

    socket.on('unsubscribeFromUser', (userId: string) => {
      socket.leave(`user_${userId}`)
      console.log(`👤 Unsubscribed from user ${userId}`)
    })

    socket.on('disconnect', () => {
      console.log('👤 Presence socket disconnected:', socket.id)
    })
  })
}