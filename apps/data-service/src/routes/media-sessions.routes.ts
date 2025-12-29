import { Router } from 'express';
import {
  createMediaSession,
  getMediaSession,
  listMediaSessions,
  updateMediaSession,
  deleteMediaSession,
  joinMediaSession,
  getParticipant,
  listParticipants,
  updateParticipant,
  removeParticipant,
  startMediaSession,
  endMediaSession,
  getSessionAnalytics
} from '../services/media-session.service.js';
import { CreateMediaSessionDto, UpdateMediaSessionDto, JoinSessionDto, UpdateParticipantDto } from '@repo/types';

const router = Router();

/**
 * @swagger
 * /media-sessions:
 *   post:
 *     summary: Create a new media session
 *     tags: [Media Sessions]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateMediaSessionDto'
 *     responses:
 *       201:
 *         description: Media session created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/MediaSession'
 *       400:
 *         description: Invalid input
 */
router.post('/', async (req, res) => {
  try {
    const userId = req.headers['x-user-id'] as string;
    if (!userId) {
      return res.status(401).json({ error: 'User ID required' });
    }

    const dto = req.body as CreateMediaSessionDto;
    const session = await createMediaSession(userId, dto);
    res.status(201).json(session);
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

/**
 * @swagger
 * /media-sessions/{sessionId}:
 *   get:
 *     summary: Get media session by ID
 *     tags: [Media Sessions]
 *     parameters:
 *       - in: path
 *         name: sessionId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Media session retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/MediaSession'
 *       404:
 *         description: Session not found
 */
router.get('/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const session = await getMediaSession(sessionId);
    
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }
    
    res.json(session);
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

/**
 * @swagger
 * /media-sessions:
 *   get:
 *     summary: List media sessions with filters
 *     tags: [Media Sessions]
 *     parameters:
 *       - in: query
 *         name: sessionType
 *         schema:
 *           type: string
 *       - in: query
 *         name: sessionStatus
 *         schema:
 *           type: string
 *       - in: query
 *         name: createdBy
 *         schema:
 *           type: string
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Media sessions retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 sessions:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/MediaSession'
 *                 total:
 *                   type: integer
 */
router.get('/', async (req, res) => {
  try {
    const query = req.query as any;
    const result = await listMediaSessions(query);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

/**
 * @swagger
 * /media-sessions/{sessionId}:
 *   put:
 *     summary: Update media session
 *     tags: [Media Sessions]
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
 *             $ref: '#/components/schemas/UpdateMediaSessionDto'
 *     responses:
 *       200:
 *         description: Media session updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/MediaSession'
 *       404:
 *         description: Session not found
 */
router.put('/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const dto = req.body as UpdateMediaSessionDto;
    const session = await updateMediaSession(sessionId, dto);
    res.json(session);
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

/**
 * @swagger
 * /media-sessions/{sessionId}:
 *   delete:
 *     summary: Delete media session
 *     tags: [Media Sessions]
 *     parameters:
 *       - in: path
 *         name: sessionId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Media session deleted successfully
 *       404:
 *         description: Session not found
 */
router.delete('/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const session = await deleteMediaSession(sessionId);
    res.json(session);
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

/**
 * @swagger
 * /media-sessions/{sessionId}/join:
 *   post:
 *     summary: Join a media session
 *     tags: [Media Sessions]
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
 *             $ref: '#/components/schemas/JoinSessionDto'
 *     responses:
 *       200:
 *         description: Participant joined successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/RoomParticipant'
 *       400:
 *         description: Session not available or at capacity
 *       404:
 *         description: Session not found
 */
router.post('/:sessionId/join', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const dto = req.body as JoinSessionDto;
    const participant = await joinMediaSession(sessionId, dto);
    res.json(participant);
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

/**
 * @swagger
 * /media-sessions/{sessionId}/participants/{participantId}:
 *   get:
 *     summary: Get participant details
 *     tags: [Participants]
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
 *     responses:
 *       200:
 *         description: Participant retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/RoomParticipant'
 *       404:
 *         description: Participant not found
 */
router.get('/:sessionId/participants/:participantId', async (req, res) => {
  try {
    const { sessionId, participantId } = req.params;
    const participant = await getParticipant(sessionId, participantId);
    
    if (!participant) {
      return res.status(404).json({ error: 'Participant not found' });
    }
    
    res.json(participant);
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

/**
 * @swagger
 * /media-sessions/{sessionId}/participants:
 *   get:
 *     summary: List participants with filters
 *     tags: [Participants]
 *     parameters:
 *       - in: path
 *         name: sessionId
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: role
 *         schema:
 *           type: string
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Participants retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 participants:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/RoomParticipant'
 *                 total:
 *                   type: integer
 */
router.get('/:sessionId/participants', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const query = { ...req.query, sessionId } as any;
    const result = await listParticipants(query);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

/**
 * @swagger
 * /media-sessions/{sessionId}/participants/{participantId}:
 *   put:
 *     summary: Update participant
 *     tags: [Participants]
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
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateParticipantDto'
 *     responses:
 *       200:
 *         description: Participant updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/RoomParticipant'
 *       404:
 *         description: Participant not found
 */
router.put('/:sessionId/participants/:participantId', async (req, res) => {
  try {
    const { sessionId, participantId } = req.params;
    const dto = req.body as UpdateParticipantDto;
    const participant = await updateParticipant(sessionId, participantId, dto);
    res.json(participant);
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

/**
 * @swagger
 * /media-sessions/{sessionId}/participants/{participantId}/remove:
 *   post:
 *     summary: Remove participant from session
 *     tags: [Participants]
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
 *     responses:
 *       200:
 *         description: Participant removed successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/RoomParticipant'
 *       404:
 *         description: Participant not found
 */
router.post('/:sessionId/participants/:participantId/remove', async (req, res) => {
  try {
    const { sessionId, participantId } = req.params;
    const participant = await removeParticipant(sessionId, participantId);
    res.json(participant);
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

/**
 * @swagger
 * /media-sessions/{sessionId}/start:
 *   post:
 *     summary: Start a media session
 *     tags: [Media Sessions]
 *     parameters:
 *       - in: path
 *         name: sessionId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Media session started successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/MediaSession'
 *       404:
 *         description: Session not found
 */
router.post('/:sessionId/start', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const userId = req.headers['x-user-id'] as string;
    if (!userId) {
      return res.status(401).json({ error: 'User ID required' });
    }

    const session = await startMediaSession(sessionId, userId);
    res.json(session);
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

/**
 * @swagger
 * /media-sessions/{sessionId}/end:
 *   post:
 *     summary: End a media session
 *     tags: [Media Sessions]
 *     parameters:
 *       - in: path
 *         name: sessionId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Media session ended successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/MediaSession'
 *       404:
 *         description: Session not found
 */
router.post('/:sessionId/end', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const userId = req.headers['x-user-id'] as string;
    if (!userId) {
      return res.status(401).json({ error: 'User ID required' });
    }

    const session = await endMediaSession(sessionId, userId);
    res.json(session);
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

/**
 * @swagger
 * /media-sessions/analytics:
 *   get:
 *     summary: Get session analytics
 *     tags: [Media Sessions]
 *     responses:
 *       200:
 *         description: Analytics retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AnalyticsData'
 */
router.get('/analytics', async (req, res) => {
  try {
    const analytics = await getSessionAnalytics();
    res.json(analytics);
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

export default router;