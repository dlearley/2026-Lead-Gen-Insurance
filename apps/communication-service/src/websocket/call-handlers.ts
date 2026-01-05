// WebSocket Call Handlers

import { Server as SocketIOServer, Socket } from 'socket.io'
import { SignalingService } from '@insurance-lead-gen/communication'

export function setupCallHandlers(io: SocketIOServer, signalingService: SignalingService): void {
  io.of('/calls').on('connection', (socket: Socket) => {
    console.log('📞 Call socket connected:', socket.id)

    socket.on('joinCall', (callId: string, userId: string) => {
      signalingService.handleJoinCall(socket, callId, userId)
    })

    socket.on('leaveCall', (callId: string, userId: string) => {
      signalingService.handleLeaveCall(socket, callId, userId)
    })

    socket.on('signal', (message: any) => {
      signalingService.handleSignal(socket, message)
    })

    socket.on('callStatus', (callId: string) => {
      const participants = signalingService.getActiveCallParticipants(callId)
      socket.emit('callParticipants', { callId, participants })
    })

    socket.on('disconnect', () => {
      console.log('📞 Call socket disconnected:', socket.id)
    })
  })
}