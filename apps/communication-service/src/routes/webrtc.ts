// WebRTC Routes

import express from 'express'
import { PrismaClient } from '@prisma/client'
import { CallService, RecordingService, MeetingRoomService } from '@insurance-lead-gen/communication'
import { authenticate } from '../middleware/auth.js'
import { validateRequest } from '../middleware/validation.js'
import { callSchemas, recordingSchemas, meetingSchemas } from '../schemas/webrtc.js'

const router = express.Router()
const prisma = new PrismaClient()

// Services
const callService = new CallService(prisma)
const recordingService = new RecordingService(prisma)
const meetingRoomService = new MeetingRoomService(prisma)

// Call routes
router.post('/initiate', authenticate, validateRequest(callSchemas.initiateCall), async (req, res) => {
  try {
    const call = await callService.initiateCall({
      organizationId: req.user.organizationId,
      initiatorId: req.user.id,
      ...req.body,
    })
    res.status(201).json(call)
  } catch (error) {
    res.status(500).json({ error: 'Failed to initiate call', details: error instanceof Error ? error.message : undefined })
  }
})

router.post('/:callId/answer', authenticate, validateRequest(callSchemas.answerCall), async (req, res) => {
  try {
    await callService.answerCall({
      callId: req.params.callId,
      userId: req.user.id,
      ...req.body,
    })
    res.status(204).send()
  } catch (error) {
    res.status(500).json({ error: 'Failed to answer call', details: error instanceof Error ? error.message : undefined })
  }
})

router.post('/:callId/end', authenticate, async (req, res) => {
  try {
    const call = await callService.endCall({
      callId: req.params.callId,
      userId: req.user.id,
    })
    res.json(call)
  } catch (error) {
    res.status(500).json({ error: 'Failed to end call', details: error instanceof Error ? error.message : undefined })
  }
})

router.get('/:callId/status', authenticate, async (req, res) => {
  try {
    const status = await callService.getCallStatus(req.params.callId)
    res.json({ status })
  } catch (error) {
    res.status(500).json({ error: 'Failed to get call status', details: error instanceof Error ? error.message : undefined })
  }
})

router.get('/:callId', authenticate, async (req, res) => {
  try {
    const call = await callService.getCall(req.params.callId)
    if (!call) {
      return res.status(404).json({ error: 'Call not found' })
    }
    res.json(call)
  } catch (error) {
    res.status(500).json({ error: 'Failed to get call', details: error instanceof Error ? error.message : undefined })
  }
})

router.post('/:callId/record/start', authenticate, validateRequest(recordingSchemas.startRecording), async (req, res) => {
  try {
    const recording = await recordingService.startCallRecording(
      req.params.callId,
      req.body.storageProvider
    )
    res.status(201).json(recording)
  } catch (error) {
    res.status(500).json({ error: 'Failed to start recording', details: error instanceof Error ? error.message : undefined })
  }
})

router.post('/:callId/record/stop', authenticate, async (req, res) => {
  try {
    const recording = await recordingService.stopRecording(req.params.callId)
    res.json(recording)
  } catch (error) {
    res.status(500).json({ error: 'Failed to stop recording', details: error instanceof Error ? error.message : undefined })
  }
})

router.get('/:callId/recordings', authenticate, async (req, res) => {
  try {
    const recordings = await recordingService.getCallRecordings(req.params.callId)
    res.json(recordings)
  } catch (error) {
    res.status(500).json({ error: 'Failed to get call recordings', details: error instanceof Error ? error.message : undefined })
  }
})

router.get('/:callId/transcription', authenticate, async (req, res) => {
  try {
    const transcription = await recordingService.getCallTranscription(req.params.callId)
    res.json({ transcription })
  } catch (error) {
    res.status(500).json({ error: 'Failed to get transcription', details: error instanceof Error ? error.message : undefined })
  }
})

router.get('/user/history', authenticate, async (req, res) => {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 20
    const calls = await callService.getUserCallHistory(req.user.id, limit)
    res.json(calls)
  } catch (error) {
    res.status(500).json({ error: 'Failed to get call history', details: error instanceof Error ? error.message : undefined })
  }
})

router.get('/active', authenticate, async (req, res) => {
  try {
    const calls = await callService.getActiveCalls(req.user.organizationId)
    res.json(calls)
  } catch (error) {
    res.status(500).json({ error: 'Failed to get active calls', details: error instanceof Error ? error.message : undefined })
  }
})

// Meeting room routes
router.post('/meeting-rooms', authenticate, validateRequest(meetingSchemas.createMeetingRoom), async (req, res) => {
  try {
    const room = await meetingRoomService.createMeetingRoom({
      organizationId: req.user.organizationId,
      ...req.body,
    })
    res.status(201).json(room)
  } catch (error) {
    res.status(500).json({ error: 'Failed to create meeting room', details: error instanceof Error ? error.message : undefined })
  }
})

router.get('/meeting-rooms', authenticate, async (req, res) => {
  try {
    const rooms = await meetingRoomService.listMeetingRooms(req.user.organizationId)
    res.json(rooms)
  } catch (error) {
    res.status(500).json({ error: 'Failed to list meeting rooms', details: error instanceof Error ? error.message : undefined })
  }
})

router.get('/meeting-rooms/:id', authenticate, async (req, res) => {
  try {
    const room = await meetingRoomService.getMeetingRoom(req.params.id)
    if (!room) {
      return res.status(404).json({ error: 'Meeting room not found' })
    }
    res.json(room)
  } catch (error) {
    res.status(500).json({ error: 'Failed to get meeting room', details: error instanceof Error ? error.message : undefined })
  }
})

router.put('/meeting-rooms/:id', authenticate, validateRequest(meetingSchemas.updateMeetingRoom), async (req, res) => {
  try {
    const room = await meetingRoomService.updateMeetingRoom(req.params.id, req.body)
    res.json(room)
  } catch (error) {
    res.status(500).json({ error: 'Failed to update meeting room', details: error instanceof Error ? error.message : undefined })
  }
})

router.delete('/meeting-rooms/:id', authenticate, async (req, res) => {
  try {
    const room = await meetingRoomService.deactivateMeetingRoom(req.params.id)
    res.json(room)
  } catch (error) {
    res.status(500).json({ error: 'Failed to deactivate meeting room', details: error instanceof Error ? error.message : undefined })
  }
})

router.post('/meeting-rooms/:id/schedules', authenticate, validateRequest(meetingSchemas.scheduleMeeting), async (req, res) => {
  try {
    const schedule = await meetingRoomService.scheduleMeeting({
      roomId: req.params.id,
      ...req.body,
    })
    res.status(201).json(schedule)
  } catch (error) {
    res.status(500).json({ error: 'Failed to schedule meeting', details: error instanceof Error ? error.message : undefined })
  }
})

router.get('/meeting-rooms/:id/schedules', authenticate, async (req, res) => {
  try {
    const schedules = await meetingRoomService.listMeetingSchedules(req.params.id)
    res.json(schedules)
  } catch (error) {
    res.status(500).json({ error: 'Failed to list meeting schedules', details: error instanceof Error ? error.message : undefined })
  }
})

router.get('/meeting-rooms/schedules/upcoming', authenticate, async (req, res) => {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 10
    const meetings = await meetingRoomService.getUpcomingMeetings(req.user.organizationId, limit)
    res.json(meetings)
  } catch (error) {
    res.status(500).json({ error: 'Failed to get upcoming meetings', details: error instanceof Error ? error.message : undefined })
  }
})

router.get('/meeting-rooms/schedules/user', authenticate, async (req, res) => {
  try {
    const meetings = await meetingRoomService.getUserMeetings(req.user.id)
    res.json(meetings)
  } catch (error) {
    res.status(500).json({ error: 'Failed to get user meetings', details: error instanceof Error ? error.message : undefined })
  }
})

router.get('/meeting-rooms/:id/availability', authenticate, async (req, res) => {
  try {
    const startTime = new Date(req.query.startTime as string)
    const endTime = new Date(req.query.endTime as string)
    
    if (isNaN(startTime.getTime()) || isNaN(endTime.getTime())) {
      return res.status(400).json({ error: 'Invalid date format' })
    }

    const available = await meetingRoomService.checkRoomAvailability(
      req.params.id,
      startTime,
      endTime
    )
    res.json({ available })
  } catch (error) {
    res.status(500).json({ error: 'Failed to check room availability', details: error instanceof Error ? error.message : undefined })
  }
})

export default router