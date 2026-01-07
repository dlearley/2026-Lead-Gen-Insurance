// Signaling Service - WebRTC signaling server

import { Server as SocketIOServer, Socket } from 'socket.io'
import { SignalingMessage } from './types.js'

export class SignalingService {
  private io: SocketIOServer
  private activeCalls: Map<string, Set<string>> // callId -> Set of userIds

  constructor(io: SocketIOServer) {
    this.io = io
    this.activeCalls = new Map()
    this.setupEventHandlers()
  }

  private setupEventHandlers(): void {
    this.io.on('connection', (socket: Socket) => {
      console.log('New signaling connection:', socket.id)

      socket.on('joinCall', (callId: string, userId: string) => {
        this.handleJoinCall(socket, callId, userId)
      })

      socket.on('leaveCall', (callId: string, userId: string) => {
        this.handleLeaveCall(socket, callId, userId)
      })

      socket.on('signal', (message: SignalingMessage) => {
        this.handleSignal(socket, message)
      })

      socket.on('disconnect', () => {
        this.handleDisconnect(socket)
      })
    })
  }

  private handleJoinCall(socket: Socket, callId: string, userId: string): void {
    socket.join(callId)
    console.log(`User ${userId} joined call ${callId}`)

    // Add to active calls tracking
    if (!this.activeCalls.has(callId)) {
      this.activeCalls.set(callId, new Set())
    }
    this.activeCalls.get(callId)?.add(userId)

    // Notify other participants
    socket.to(callId).emit('userJoined', { callId, userId })
  }

  private handleLeaveCall(socket: Socket, callId: string, userId: string): void {
    socket.leave(callId)
    console.log(`User ${userId} left call ${callId}`)

    // Remove from active calls tracking
    this.activeCalls.get(callId)?.delete(userId)
    if (this.activeCalls.get(callId)?.size === 0) {
      this.activeCalls.delete(callId)
    }

    // Notify other participants
    socket.to(callId).emit('userLeft', { callId, userId })
  }

  private handleSignal(socket: Socket, message: SignalingMessage): void {
    const { type, from, to, data, callId } = message

    console.log(`Signal ${type} from ${from} to ${to || 'all'} in call ${callId}`)

    if (to) {
      // Direct message to specific user
      socket.to(to).emit('signal', message)
    } else {
      // Broadcast to all in call except sender
      socket.to(callId).emit('signal', message)
    }
  }

  private handleDisconnect(socket: Socket): void {
    console.log('Signaling connection disconnected:', socket.id)
    // Cleanup would be handled by leaveCall events
  }

  public getActiveCallParticipants(callId: string): string[] {
    return Array.from(this.activeCalls.get(callId) || [])
  }

  public broadcastToCall(callId: string, event: string, data: any): void {
    this.io.to(callId).emit(event, data)
  }

  public sendToUser(userId: string, event: string, data: any): void {
    // In a real implementation, you'd track userId to socketId mapping
    this.io.emit(event, data) // Simplified for now
  }

  public getActiveCallsCount(): number {
    return this.activeCalls.size
  }
}