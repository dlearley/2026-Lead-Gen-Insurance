// WebRTC Types

export type CallStatus = 'initiated' | 'ringing' | 'connected' | 'ended' | 'failed'

export type CallType = 'one_on_one' | 'group'

export type MediaType = 'audio' | 'video'

export interface Call {
  id: string
  organizationId: string
  initiatorId: string
  status: CallStatus
  callType: CallType
  mediaType: MediaType
  roomId?: string
  startedAt?: Date
  endedAt?: Date
  duration?: number
  recordingId?: string
  transcription?: string
  createdAt: Date
}

export interface CallParticipant {
  id: string
  callId: string
  userId: string
  joinedAt: Date
  leftAt?: Date
  mediaEnabled: { audio: boolean; video: boolean }
}

export interface CallRecording {
  id: string
  callId: string
  fileUrl: string
  fileSize: number
  duration: number
  storageProvider: string
  createdAt: Date
}

export interface MeetingRoom {
  id: string
  organizationId: string
  name: string
  description?: string
  roomUrl: string
  password?: string
  capacity?: number
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

export interface MeetingSchedule {
  id: string
  roomId: string
  title: string
  description?: string
  startTime: Date
  endTime: Date
  organizers: string[]
  participants: string[]
  createdAt: Date
}

export interface InitiateCallInput {
  organizationId: string
  initiatorId: string
  participantIds: string[]
  callType: CallType
  mediaType: MediaType
  roomId?: string
}

export interface AnswerCallInput {
  callId: string
  userId: string
  mediaEnabled: { audio: boolean; video: boolean }
}

export interface EndCallInput {
  callId: string
  userId: string
}

export interface StartRecordingInput {
  callId: string
  storageProvider: string
}

export interface CreateMeetingRoomInput {
  organizationId: string
  name: string
  description?: string
  password?: string
  capacity?: number
}

export interface ScheduleMeetingInput {
  roomId: string
  title: string
  description?: string
  startTime: Date
  endTime: Date
  organizers: string[]
  participants: string[]
}

export interface SignalingMessage {
  type: 'offer' | 'answer' | 'candidate' | 'hangup' | 'join' | 'leave'
  from: string
  to?: string
  data: any
  callId: string
  timestamp: Date
}