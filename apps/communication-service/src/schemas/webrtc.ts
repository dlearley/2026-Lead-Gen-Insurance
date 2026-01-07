// WebRTC Schemas

import { z } from 'zod'

export const callSchemas = {
  initiateCall: z.object({
    participantIds: z.array(z.string()),
    callType: z.enum(['one_on_one', 'group']),
    mediaType: z.enum(['audio', 'video']),
    roomId: z.string().optional(),
  }),

  answerCall: z.object({
    mediaEnabled: z.object({
      audio: z.boolean(),
      video: z.boolean(),
    }),
  }),
}

export const recordingSchemas = {
  startRecording: z.object({
    storageProvider: z.string(),
  }),
}

export const meetingSchemas = {
  createMeetingRoom: z.object({
    name: z.string(),
    description: z.string().optional(),
    password: z.string().optional(),
    capacity: z.number().optional(),
  }),

  updateMeetingRoom: z.object({
    name: z.string().optional(),
    description: z.string().optional(),
    password: z.string().optional(),
    capacity: z.number().optional(),
    isActive: z.boolean().optional(),
  }),

  scheduleMeeting: z.object({
    title: z.string(),
    description: z.string().optional(),
    startTime: z.string().datetime(),
    endTime: z.string().datetime(),
    organizers: z.array(z.string()),
    participants: z.array(z.string()),
  }),
}