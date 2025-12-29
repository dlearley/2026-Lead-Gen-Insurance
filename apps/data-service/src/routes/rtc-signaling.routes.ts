import { Router } from 'express';
import {
  sendSignalMessage,
  sendOffer,
  sendAnswer,
  sendIceCandidate,
  sendJoinSignal,
  sendLeaveSignal,
  sendMuteSignal,
  sendUnmuteSignal,
  sendStartScreenShareSignal,
  sendStopScreenShareSignal,
  sendHandRaiseSignal,
  sendRoomUpdateSignal,
  sendErrorSignal,
  getSignalMessages,
  getParticipantSignalMessages,
  getActiveConnections,
  clearSignalMessages
} from '../services/rtc-signaling.service.js';
import { SignalMessageDto } from '@repo/types';

const router = Router();

/**
 * @swagger
 * /rtc-signal/{sessionId}/signal:
 *   post:
 *     summary: Send a signal message
 *     tags: [RTC Signaling]
 *     parameters:
 *       - in: path
 *         name: sessionId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/SignalMessageDto'
 *     responses:
 *       201:
 *         description: Signal message sent successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SignalMessage'
 */
router.post('/:sessionId/signal', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const participantId = req.headers['x-participant-id'] as string;
    if (!participantId) {
      return res.status(401).json({ error: 'Participant ID required' });
    }

    const dto = req.body as SignalMessageDto;
    const message = await sendSignalMessage(sessionId, participantId, dto);
    res.status(201).json(message);
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

/**
 * @swagger
 * /rtc-signal/{sessionId}/offer:
 *   post:
 *     summary: Send SDP offer
 *     tags: [RTC Signaling]
 *     parameters:
 *       - in: path
 *         name: sessionId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               toParticipantId:
 *                 type: string
 *               sdp:
 *                 type: object
 *     responses:
 *       201:
 *         description: Offer sent successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SignalMessage'
 */
router.post('/:sessionId/offer', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const participantId = req.headers['x-participant-id'] as string;
    if (!participantId) {
      return res.status(401).json({ error: 'Participant ID required' });
    }

    const { toParticipantId, sdp } = req.body;
    const message = await sendOffer(sessionId, participantId, toParticipantId, sdp);
    res.status(201).json(message);
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

/**
 * @swagger
 * /rtc-signal/{sessionId}/answer:
 *   post:
 *     summary: Send SDP answer
 *     tags: [RTC Signaling]
 *     parameters:
 *       - in: path
 *         name: sessionId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               toParticipantId:
 *                 type: string
 *               sdp:
 *                 type: object
 *     responses:
 *       201:
 *         description: Answer sent successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SignalMessage'
 */
router.post('/:sessionId/answer', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const participantId = req.headers['x-participant-id'] as string;
    if (!participantId) {
      return res.status(401).json({ error: 'Participant ID required' });
    }

    const { toParticipantId, sdp } = req.body;
    const message = await sendAnswer(sessionId, participantId, toParticipantId, sdp);
    res.status(201).json(message);
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

/**
 * @swagger
 * /rtc-signal/{sessionId}/ice-candidate:
 *   post:
 *     summary: Send ICE candidate
 *     tags: [RTC Signaling]
 *     parameters:
 *       - in: path
 *         name: sessionId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               toParticipantId:
 *                 type: string
 *               candidate:
 *                 type: object
 *     responses:
 *       201:
 *         description: ICE candidate sent successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SignalMessage'
 */
router.post('/:sessionId/ice-candidate', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const participantId = req.headers['x-participant-id'] as string;
    if (!participantId) {
      return res.status(401).json({ error: 'Participant ID required' });
    }

    const { toParticipantId, candidate } = req.body;
    const message = await sendIceCandidate(sessionId, participantId, toParticipantId, candidate);
    res.status(201).json(message);
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

/**
 * @swagger
 * /rtc-signal/{sessionId}/join:
 *   post:
 *     summary: Send join signal (broadcast)
 *     tags: [RTC Signaling]
 *     parameters:
 *       - in: path
 *         name: sessionId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               displayName:
 *                 type: string
 *               role:
 *                 type: string
 *               isAudioEnabled:
 *                 type: boolean
 *               isVideoEnabled:
 *                 type: boolean
 *     responses:
 *       201:
 *         description: Join signal sent successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SignalMessage'
 */
router.post('/:sessionId/join', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const participantId = req.headers['x-participant-id'] as string;
    if (!participantId) {
      return res.status(401).json({ error: 'Participant ID required' });
    }

    const participantInfo = req.body;
    const message = await sendJoinSignal(sessionId, participantId, participantInfo);
    res.status(201).json(message);
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

/**
 * @swagger
 * /rtc-signal/{sessionId}/leave:
 *   post:
 *     summary: Send leave signal (broadcast)
 *     tags: [RTC Signaling]
 *     parameters:
 *       - in: path
 *         name: sessionId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       201:
 *         description: Leave signal sent successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SignalMessage'
 */
router.post('/:sessionId/leave', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const participantId = req.headers['x-participant-id'] as string;
    if (!participantId) {
      return res.status(401).json({ error: 'Participant ID required' });
    }

    const message = await sendLeaveSignal(sessionId, participantId);
    res.status(201).json(message);
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

/**
 * @swagger
 * /rtc-signal/{sessionId}/mute:
 *   post:
 *     summary: Send mute signal
 *     tags: [RTC Signaling]
 *     parameters:
 *       - in: path
 *         name: sessionId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               targetParticipantId:
 *                 type: string
 *     responses:
 *       201:
 *         description: Mute signal sent successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SignalMessage'
 */
router.post('/:sessionId/mute', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const participantId = req.headers['x-participant-id'] as string;
    if (!participantId) {
      return res.status(401).json({ error: 'Participant ID required' });
    }

    const { targetParticipantId } = req.body;
    const message = await sendMuteSignal(sessionId, participantId, targetParticipantId);
    res.status(201).json(message);
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

/**
 * @swagger
 * /rtc-signal/{sessionId}/unmute:
 *   post:
 *     summary: Send unmute signal
 *     tags: [RTC Signaling]
 *     parameters:
 *       - in: path
 *         name: sessionId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               targetParticipantId:
 *                 type: string
 *     responses:
 *       201:
 *         description: Unmute signal sent successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SignalMessage'
 */
router.post('/:sessionId/unmute', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const participantId = req.headers['x-participant-id'] as string;
    if (!participantId) {
      return res.status(401).json({ error: 'Participant ID required' });
    }

    const { targetParticipantId } = req.body;
    const message = await sendUnmuteSignal(sessionId, participantId, targetParticipantId);
    res.status(201).json(message);
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

/**
 * @swagger
 * /rtc-signal/{sessionId}/screen-share/start:
 *   post:
 *     summary: Send start screen share signal
 *     tags: [RTC Signaling]
 *     parameters:
 *       - in: path
 *         name: sessionId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       201:
 *         description: Screen share start signal sent successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SignalMessage'
 */
router.post('/:sessionId/screen-share/start', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const participantId = req.headers['x-participant-id'] as string;
    if (!participantId) {
      return res.status(401).json({ error: 'Participant ID required' });
    }

    const message = await sendStartScreenShareSignal(sessionId, participantId);
    res.status(201).json(message);
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

/**
 * @swagger
 * /rtc-signal/{sessionId}/screen-share/stop:
 *   post:
 *     summary: Send stop screen share signal
 *     tags: [RTC Signaling]
 *     parameters:
 *       - in: path
 *         name: sessionId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       201:
 *         description: Screen share stop signal sent successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SignalMessage'
 */
router.post('/:sessionId/screen-share/stop', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const participantId = req.headers['x-participant-id'] as string;
    if (!participantId) {
      return res.status(401).json({ error: 'Participant ID required' });
    }

    const message = await sendStopScreenShareSignal(sessionId, participantId);
    res.status(201).json(message);
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

/**
 * @swagger
 * /rtc-signal/{sessionId}/hand-raise:
 *   post:
 *     summary: Send hand raise signal
 *     tags: [RTC Signaling]
 *     parameters:
 *       - in: path
 *         name: sessionId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       201:
 *         description: Hand raise signal sent successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SignalMessage'
 */
router.post('/:sessionId/hand-raise', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const participantId = req.headers['x-participant-id'] as string;
    if (!participantId) {
      return res.status(401).json({ error: 'Participant ID required' });
    }

    const message = await sendHandRaiseSignal(sessionId, participantId);
    res.status(201).json(message);
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

/**
 * @swagger
 * /rtc-signal/{sessionId}/room-update:
 *   post:
 *     summary: Send room update signal (broadcast)
 *     tags: [RTC Signaling]
 *     parameters:
 *       - in: path
 *         name: sessionId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       201:
 *         description: Room update signal sent successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SignalMessage'
 */
router.post('/:sessionId/room-update', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const participantId = req.headers['x-participant-id'] as string;
    if (!participantId) {
      return res.status(401).json({ error: 'Participant ID required' });
    }

    const update = req.body;
    const message = await sendRoomUpdateSignal(sessionId, participantId, update);
    res.status(201).json(message);
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

/**
 * @swagger
 * /rtc-signal/{sessionId}/error:
 *   post:
 *     summary: Send error signal
 *     tags: [RTC Signaling]
 *     parameters:
 *       - in: path
 *         name: sessionId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               error:
 *                 type: object
 *               targetParticipantId:
 *                 type: string
 *     responses:
 *       201:
 *         description: Error signal sent successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SignalMessage'
 */
router.post('/:sessionId/error', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const participantId = req.headers['x-participant-id'] as string;
    if (!participantId) {
      return res.status(401).json({ error: 'Participant ID required' });
    }

    const { error, targetParticipantId } = req.body;
    const message = await sendErrorSignal(sessionId, participantId, error, targetParticipantId);
    res.status(201).json(message);
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

/**
 * @swagger
 * /rtc-signal/{sessionId}/messages:
 *   get:
 *     summary: Get recent signal messages
 *     tags: [RTC Signaling]
 *     parameters:
 *       - in: path
 *         name: sessionId
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: fromTimestamp
 *         schema:
 *           type: string
 *           format: date-time
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *     responses:
 *       200:
 *         description: Signal messages retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/SignalMessage'
 */
router.get('/:sessionId/messages', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { fromTimestamp, limit } = req.query;
    
    const messages = await getSignalMessages(
      sessionId,
      fromTimestamp ? new Date(fromTimestamp as string) : undefined,
      limit ? parseInt(limit as string) : 50
    );
    res.json(messages);
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

/**
 * @swagger
 * /rtc-signal/{sessionId}/participants/{participantId}/messages:
 *   get:
 *     summary: Get signal messages for specific participant
 *     tags: [RTC Signaling]
 *     parameters:
 *       - in: path
 *         name: sessionId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: participantId
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: fromTimestamp
 *         schema:
 *           type: string
 *           format: date-time
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *     responses:
 *       200:
 *         description: Signal messages retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/SignalMessage'
 */
router.get('/:sessionId/participants/:participantId/messages', async (req, res) => {
  try {
    const { sessionId, participantId } = req.params;
    const { fromTimestamp, limit } = req.query;
    
    const messages = await getParticipantSignalMessages(
      sessionId,
      participantId,
      fromTimestamp ? new Date(fromTimestamp as string) : undefined,
      limit ? parseInt(limit as string) : 50
    );
    res.json(messages);
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

/**
 * @swagger
 * /rtc-signal/{sessionId}/connections/count:
 *   get:
 *     summary: Get active connection count
 *     tags: [RTC Signaling]
 *     parameters:
 *       - in: path
 *         name: sessionId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Active connection count retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 activeConnections:
 *                   type: integer
 */
router.get('/:sessionId/connections/count', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const activeConnections = await getActiveConnections(sessionId);
    res.json({ activeConnections });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

/**
 * @swagger
 * /rtc-signal/{sessionId}/clear:
 *   delete:
 *     summary: Clear all signal messages for a session
 *     tags: [RTC Signaling]
 *     parameters:
 *       - in: path
 *         name: sessionId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Signal messages cleared successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 deletedCount:
 *                   type: integer
 */
router.delete('/:sessionId/clear', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const deletedCount = await clearSignalMessages(sessionId);
    res.json({ deletedCount });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

export default router;