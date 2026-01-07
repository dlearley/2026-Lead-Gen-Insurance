// Meeting Room Service - Manage persistent meeting rooms

import { PrismaClient } from '@prisma/client'
import { MeetingRoom, MeetingSchedule, CreateMeetingRoomInput, ScheduleMeetingInput } from './types.js'

export class MeetingRoomService {
  private prisma: PrismaClient

  constructor(prisma: PrismaClient) {
    this.prisma = prisma
  }

  async createMeetingRoom(input: CreateMeetingRoomInput): Promise<MeetingRoom> {
    const { organizationId, name, description, password, capacity } = input

    // Generate unique room URL
    const roomUrl = this.generateRoomUrl(name)

    return this.prisma.meetingRoom.create({
      data: {
        organizationId,
        name,
        description,
        roomUrl,
        password,
        capacity,
      },
    })
  }

  async getMeetingRoom(roomId: string): Promise<MeetingRoom | null> {
    return this.prisma.meetingRoom.findUnique({
      where: { id: roomId },
      include: {
        schedules: true,
      },
    })
  }

  async getMeetingRoomByUrl(roomUrl: string): Promise<MeetingRoom | null> {
    return this.prisma.meetingRoom.findUnique({
      where: { roomUrl },
      include: {
        schedules: true,
      },
    })
  }

  async listMeetingRooms(organizationId: string): Promise<MeetingRoom[]> {
    return this.prisma.meetingRoom.findMany({
      where: { organizationId, isActive: true },
      include: {
        schedules: true,
      },
      orderBy: { name: 'asc' },
    })
  }

  async updateMeetingRoom(
    roomId: string,
    data: Partial<Omit<MeetingRoom, 'id' | 'organizationId' | 'roomUrl' | 'createdAt' | 'updatedAt'>>
  ): Promise<MeetingRoom> {
    return this.prisma.meetingRoom.update({
      where: { id: roomId },
      data,
    })
  }

  async deactivateMeetingRoom(roomId: string): Promise<MeetingRoom> {
    return this.prisma.meetingRoom.update({
      where: { id: roomId },
      data: { isActive: false },
    })
  }

  async scheduleMeeting(input: ScheduleMeetingInput): Promise<MeetingSchedule> {
    const { roomId, title, description, startTime, endTime, organizers, participants } = input

    return this.prisma.meetingSchedule.create({
      data: {
        roomId,
        title,
        description,
        startTime,
        endTime,
        organizers,
        participants,
      },
    })
  }

  async getMeetingSchedule(scheduleId: string): Promise<MeetingSchedule | null> {
    return this.prisma.meetingSchedule.findUnique({
      where: { id: scheduleId },
    })
  }

  async listMeetingSchedules(roomId: string): Promise<MeetingSchedule[]> {
    return this.prisma.meetingSchedule.findMany({
      where: { roomId },
      orderBy: { startTime: 'asc' },
    })
  }

  async getUpcomingMeetings(organizationId: string, limit: number = 10): Promise<MeetingSchedule[]> {
    return this.prisma.meetingSchedule.findMany({
      where: {
        room: { organizationId },
        endTime: { gt: new Date() },
      },
      include: {
        room: true,
      },
      orderBy: { startTime: 'asc' },
      take: limit,
    })
  }

  async getUserMeetings(userId: string): Promise<MeetingSchedule[]> {
    return this.prisma.meetingSchedule.findMany({
      where: {
        OR: [
          { organizers: { has: userId } },
          { participants: { has: userId } },
        ],
      },
      include: {
        room: true,
      },
      orderBy: { startTime: 'asc' },
    })
  }

  async deleteMeetingSchedule(scheduleId: string): Promise<MeetingSchedule> {
    return this.prisma.meetingSchedule.delete({
      where: { id: scheduleId },
    })
  }

  async checkRoomAvailability(roomId: string, startTime: Date, endTime: Date): Promise<boolean> {
    const conflictingMeetings = await this.prisma.meetingSchedule.count({
      where: {
        roomId,
        OR: [
          {
            startTime: { lt: endTime },
            endTime: { gt: startTime },
          },
        ],
      },
    })

    return conflictingMeetings === 0
  }

  private generateRoomUrl(name: string): string {
    // Generate a URL-friendly room name
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .substring(0, 50)
  }
}