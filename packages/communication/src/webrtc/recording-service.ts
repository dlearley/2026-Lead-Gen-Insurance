// Recording Service - Handle call recording and transcription

import { PrismaClient } from '@prisma/client'
import { CallRecording } from './types.js'

export class RecordingService {
  private prisma: PrismaClient

  constructor(prisma: PrismaClient) {
    this.prisma = prisma
  }

  async startCallRecording(callId: string, storageProvider: string): Promise<CallRecording> {
    return this.prisma.callRecording.create({
      data: {
        callId,
        fileUrl: `recordings/${callId}_${Date.now()}.mp4`,
        fileSize: 0,
        duration: 0,
        storageProvider,
      },
    })
  }

  async updateRecordingMetadata(
    callId: string,
    fileUrl: string,
    fileSize: number,
    duration: number
  ): Promise<CallRecording> {
    return this.prisma.callRecording.update({
      where: { callId },
      data: { fileUrl, fileSize, duration },
    })
  }

  async getRecording(callId: string): Promise<CallRecording | null> {
    return this.prisma.callRecording.findUnique({
      where: { callId },
    })
  }

  async transcribeCall(callId: string, transcription: string): Promise<void> {
    await this.prisma.call.update({
      where: { id: callId },
      data: { transcription },
    })
  }

  async getCallTranscription(callId: string): Promise<string | null> {
    const call = await this.prisma.call.findUnique({
      where: { id: callId },
      select: { transcription: true },
    })
    return call?.transcription || null
  }

  async listOrganizationRecordings(organizationId: string, limit: number = 50): Promise<CallRecording[]> {
    return this.prisma.callRecording.findMany({
      where: {
        call: { organizationId },
      },
      include: {
        call: true,
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    })
  }

  async deleteRecording(callId: string): Promise<CallRecording> {
    return this.prisma.callRecording.delete({
      where: { callId },
    })
  }

  async getRecordingStorageStats(organizationId: string): Promise<{
    totalRecordings: number
    totalSize: number
  }> {
    const recordings = await this.prisma.callRecording.findMany({
      where: {
        call: { organizationId },
      },
      select: { fileSize: true },
    })

    return {
      totalRecordings: recordings.length,
      totalSize: recordings.reduce((sum, rec) => sum + (rec.fileSize || 0), 0),
    }
  }
}