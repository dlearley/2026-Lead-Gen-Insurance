// Call Service - Manage video and voice calls

import { PrismaClient } from '@prisma/client'
import { Call, InitiateCallInput, AnswerCallInput, EndCallInput, StartRecordingInput } from './types.js'

export class CallService {
  private prisma: PrismaClient

  constructor(prisma: PrismaClient) {
    this.prisma = prisma
  }

  async initiateCall(input: InitiateCallInput): Promise<Call> {
    const { organizationId, initiatorId, participantIds, callType, mediaType, roomId } = input

    return this.prisma.call.create({
      data: {
        organizationId,
        initiatorId,
        status: 'initiated',
        callType,
        mediaType,
        roomId,
      },
    })
  }

  async answerCall(input: AnswerCallInput): Promise<void> {
    const { callId, userId, mediaEnabled } = input

    await this.prisma.$transaction(async (tx) => {
      // Update call status if this is the first participant
      const existingParticipants = await tx.callParticipant.count({
        where: { callId },
      })

      if (existingParticipants === 0) {
        await tx.call.update({
          where: { id: callId },
          data: { status: 'connected', startedAt: new Date() },
        })
      }

      // Add participant
      await tx.callParticipant.create({
        data: {
          callId,
          userId,
          joinedAt: new Date(),
          mediaEnabled,
        },
      })
    })
  }

  async endCall(input: EndCallInput): Promise<Call> {
    const { callId, userId } = input

    return this.prisma.$transaction(async (tx) => {
      // Mark participant as left
      await tx.callParticipant.updateMany({
        where: {
          callId,
          userId,
          leftAt: null,
        },
        data: { leftAt: new Date() },
      })

      // Check if all participants have left
      const remainingParticipants = await tx.callParticipant.count({
        where: {
          callId,
          leftAt: null,
        },
      })

      if (remainingParticipants === 0) {
        // End the call
        const call = await tx.call.findUnique({
          where: { id: callId },
        })

        if (call && call.startedAt) {
          const duration = Math.floor((new Date().getTime() - call.startedAt.getTime()) / 1000)

          return tx.call.update({
            where: { id: callId },
            data: {
              status: 'ended',
              endedAt: new Date(),
              duration,
            },
          })
        }
      }

      return tx.call.findUnique({ where: { id: callId } })
    })
  }

  async getCall(callId: string): Promise<Call | null> {
    return this.prisma.call.findUnique({
      where: { id: callId },
      include: {
        participants: true,
        recording: true,
      },
    })
  }

  async getCallStatus(callId: string): Promise<CallStatus> {
    const call = await this.prisma.call.findUnique({
      where: { id: callId },
      select: { status: true },
    })
    return call?.status || 'failed'
  }

  async startRecording(input: StartRecordingInput): Promise<CallRecording> {
    const { callId, storageProvider } = input

    return this.prisma.$transaction(async (tx) => {
      // Update call to mark recording started
      await tx.call.update({
        where: { id: callId },
        data: { recordingId: `recording_${callId}_${Date.now()}` },
      })

      // Create recording record
      return tx.callRecording.create({
        data: {
          callId,
          fileUrl: `pending_${callId}.mp4`,
          fileSize: 0,
          duration: 0,
          storageProvider,
        },
      })
    })
  }

  async stopRecording(callId: string): Promise<CallRecording> {
    const recording = await this.prisma.callRecording.findUnique({
      where: { callId },
    })

    if (!recording) {
      throw new Error('Recording not found')
    }

    // In a real implementation, this would update with actual file details
    return this.prisma.callRecording.update({
      where: { callId },
      data: {
        fileUrl: `recordings/${callId}_${Date.now()}.mp4`,
        // fileSize and duration would be updated with actual values
      },
    })
  }

  async getCallRecordings(callId: string): Promise<CallRecording[]> {
    return this.prisma.callRecording.findMany({
      where: { callId },
    })
  }

  async getUserCallHistory(userId: string, limit: number = 20): Promise<Call[]> {
    return this.prisma.call.findMany({
      where: {
        OR: [
          { initiatorId: userId },
          { participants: { some: { userId } } },
        ],
      },
      include: {
        participants: true,
        recording: true,
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    })
  }

  async getActiveCalls(organizationId: string): Promise<Call[]> {
    return this.prisma.call.findMany({
      where: {
        organizationId,
        status: { in: ['initiated', 'ringing', 'connected'] },
      },
      include: {
        participants: true,
      },
    })
  }

  async updateCallTranscription(callId: string, transcription: string): Promise<Call> {
    return this.prisma.call.update({
      where: { id: callId },
      data: { transcription },
    })
  }
}