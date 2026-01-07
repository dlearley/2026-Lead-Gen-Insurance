// WebSocket Message Handlers

import { Server as SocketIOServer, Socket } from 'socket.io'
import { PrismaClient } from '@prisma/client'
import { MessageService } from '@insurance-lead-gen/communication'

const prisma = new PrismaClient()
const messageService = new MessageService(prisma)

export function setupMessageHandlers(io: SocketIOServer): void {
  io.of('/messages').on('connection', (socket: Socket) => {
    console.log('📧 Message socket connected:', socket.id)

    socket.on('joinConversation', (conversationId: string, userId: string) => {
      socket.join(conversationId)
      console.log(`📧 User ${userId} joined conversation ${conversationId}`)
    })

    socket.on('leaveConversation', (conversationId: string, userId: string) => {
      socket.leave(conversationId)
      console.log(`📧 User ${userId} left conversation ${conversationId}`)
    })

    socket.on('sendMessage', async (messageData: any) => {
      try {
        const message = await messageService.sendMessage(messageData)
        io.of('/messages').to(messageData.conversationId).emit('newMessage', message)
      } catch (error) {
        console.error('📧 Error sending message:', error)
        socket.emit('messageError', { error: 'Failed to send message' })
      }
    })

    socket.on('typing', (conversationId: string, userId: string) => {
      socket.to(conversationId).emit('userTyping', { conversationId, userId })
    })

    socket.on('stopTyping', (conversationId: string, userId: string) => {
      socket.to(conversationId).emit('userStoppedTyping', { conversationId, userId })
    })

    socket.on('markRead', async (conversationId: string, userId: string) => {
      try {
        await messageService.getUnreadCount(conversationId, userId)
        // In a real implementation, you would update the read status
        socket.to(conversationId).emit('messagesRead', { conversationId, userId })
      } catch (error) {
        console.error('📧 Error marking messages as read:', error)
      }
    })

    socket.on('disconnect', () => {
      console.log('📧 Message socket disconnected:', socket.id)
    })
  })
}