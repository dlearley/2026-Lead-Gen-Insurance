// WebSocket Document Handlers

import { Server as SocketIOServer, Socket } from 'socket.io'

export function setupDocumentHandlers(io: SocketIOServer): void {
  io.of('/documents').on('connection', (socket: Socket) => {
    console.log('📄 Document socket connected:', socket.id)

    socket.on('joinDocument', (documentId: string, userId: string) => {
      socket.join(documentId)
      console.log(`📄 User ${userId} joined document ${documentId}`)
      socket.to(documentId).emit('userJoined', { documentId, userId })
    })

    socket.on('leaveDocument', (documentId: string, userId: string) => {
      socket.leave(documentId)
      console.log(`📄 User ${userId} left document ${documentId}`)
      socket.to(documentId).emit('userLeft', { documentId, userId })
    })

    socket.on('documentChange', (documentId: string, changeData: any) => {
      socket.to(documentId).emit('documentUpdate', { documentId, changeData })
    })

    socket.on('addComment', (documentId: string, commentData: any) => {
      socket.to(documentId).emit('newComment', { documentId, commentData })
    })

    socket.on('resolveComment', (documentId: string, commentId: string) => {
      socket.to(documentId).emit('commentResolved', { documentId, commentId })
    })

    socket.on('cursorPosition', (documentId: string, positionData: any) => {
      socket.to(documentId).emit('cursorUpdate', { documentId, positionData })
    })

    socket.on('selection', (documentId: string, selectionData: any) => {
      socket.to(documentId).emit('selectionUpdate', { documentId, selectionData })
    })

    socket.on('disconnect', () => {
      console.log('📄 Document socket disconnected:', socket.id)
    })
  })
}