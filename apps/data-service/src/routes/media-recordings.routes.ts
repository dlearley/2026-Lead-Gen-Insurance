import { Router } from 'express';
import {
  startRecording,
  getRecording,
  listRecordings,
  stopRecording,
  deleteRecording,
  getSessionRecordings,
  processRecording,
  completeRecordingProcessing,
  getRecordingStats,
  getStorageUsage,
  cleanupOldRecordings,
  startIndividualRecording,
  createCompositeRecording
} from '../services/media-recording.service.js';
import { RecordingConfigDto } from '@repo/types';

const router = Router();

/**
 * @swagger
 * /media-sessions/{sessionId}/recordings/start:
 *   post:
 *     summary: Start recording for a session
 *     tags: [Recordings]
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
 *             $ref: '#/components/schemas/RecordingConfigDto'
 *     responses:
 *       201:
 *         description: Recording started successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/MediaRecording'
 *       400:
 *         description: Recording already in progress
 *       404:
 *         description: Session not found
 */
router.post('/:sessionId/recordings/start', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const participantId = req.headers['x-participant-id'] as string;
    if (!participantId) {
      return res.status(401).json({ error: 'Participant ID required' });
    }

    const config = req.body as RecordingConfigDto;
    const recording = await startRecording(sessionId, participantId, config);
    res.status(201).json(recording);
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

/**
 * @swagger
 * /media-sessions/{sessionId}/recordings/individual/start:
 *   post:
 *     summary: Start individual participant recording
 *     tags: [Recordings]
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
 *             $ref: '#/components/schemas/RecordingConfigDto'
 *     responses:
 *       201:
 *         description: Individual recording started successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/MediaRecording'
 */
router.post('/:sessionId/recordings/individual/start', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const participantId = req.headers['x-participant-id'] as string;
    if (!participantId) {
      return res.status(401).json({ error: 'Participant ID required' });
    }

    const config = req.body as RecordingConfigDto;
    const recording = await startIndividualRecording(sessionId, participantId, config);
    res.status(201).json(recording);
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

/**
 * @swagger
 * /media-sessions/{sessionId}/recordings/composite/start:
 *   post:
 *     summary: Start composite recording (all participants)
 *     tags: [Recordings]
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
 *             $ref: '#/components/schemas/RecordingConfigDto'
 *     responses:
 *       201:
 *         description: Composite recording started successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/MediaRecording'
 */
router.post('/:sessionId/recordings/composite/start', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const participantId = req.headers['x-participant-id'] as string;
    if (!participantId) {
      return res.status(401).json({ error: 'Participant ID required' });
    }

    const config = req.body as RecordingConfigDto;
    const recording = await createCompositeRecording(sessionId, participantId, config);
    res.status(201).json(recording);
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

/**
 * @swagger
 * /media-recordings/{recordingId}:
 *   get:
 *     summary: Get recording by ID
 *     tags: [Recordings]
 *     parameters:
 *       - in: path
 *         name: recordingId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Recording retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/MediaRecording'
 *       404:
 *         description: Recording not found
 */
router.get('/:recordingId', async (req, res) => {
  try {
    const { recordingId } = req.params;
    const recording = await getRecording(recordingId);
    
    if (!recording) {
      return res.status(404).json({ error: 'Recording not found' });
    }
    
    res.json(recording);
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

/**
 * @swagger
 * /media-recordings:
 *   get:
 *     summary: List recordings with filters
 *     tags: [Recordings]
 *     parameters:
 *       - in: query
 *         name: sessionId
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
 *         description: Recordings retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 recordings:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/MediaRecording'
 *                 total:
 *                   type: integer
 */
router.get('/', async (req, res) => {
  try {
    const result = await listRecordings(req.query as any);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

/**
 * @swagger
 * /media-sessions/{sessionId}/recordings:
 *   get:
 *     summary: Get recordings for a session
 *     tags: [Recordings]
 *     parameters:
 *       - in: path
 *         name: sessionId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Recordings retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/MediaRecording'
 */
router.get('/:sessionId/recordings', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const recordings = await getSessionRecordings(sessionId);
    res.json(recordings);
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

/**
 * @swagger
 * /media-recordings/{recordingId}/stop:
 *   post:
 *     summary: Stop a recording
 *     tags: [Recordings]
 *     parameters:
 *       - in: path
 *         name: recordingId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Recording stopped successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/MediaRecording'
 *       400:
 *         description: Recording already stopped
 */
router.post('/:recordingId/stop', async (req, res) => {
  try {
    const { recordingId } = req.params;
    const sessionId = req.headers['x-session-id'] as string;
    const participantId = req.headers['x-participant-id'] as string;
    
    if (!sessionId || !participantId) {
      return res.status(401).json({ error: 'Session ID and Participant ID required' });
    }

    const recording = await stopRecording(recordingId, sessionId, participantId);
    res.json(recording);
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

/**
 * @swagger
 * /media-recordings/{recordingId}/process:
 *   post:
 *     summary: Process a recording (start processing)
 *     tags: [Recordings]
 *     parameters:
 *       - in: path
 *         name: recordingId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Recording processing started successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/MediaRecording'
 */
router.post('/:recordingId/process', async (req, res) => {
  try {
    const { recordingId } = req.params;
    const recording = await processRecording(recordingId);
    res.json(recording);
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

/**
 * @swagger
 * /media-recordings/{recordingId}/complete:
 *   post:
 *     summary: Complete recording processing
 *     tags: [Recordings]
 *     parameters:
 *       - in: path
 *         name: recordingId
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
 *               storageUrl:
 *                 type: string
 *               fileSize:
 *                 type: integer
 *     responses:
 *       200:
 *         description: Recording processing completed successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/MediaRecording'
 */
router.post('/:recordingId/complete', async (req, res) => {
  try {
    const { recordingId } = req.params;
    const { storageUrl, fileSize } = req.body;
    
    const recording = await completeRecordingProcessing(recordingId, storageUrl, fileSize);
    res.json(recording);
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

/**
 * @swagger
 * /media-recordings/{recordingId}:
 *   delete:
 *     summary: Delete a recording
 *     tags: [Recordings]
 *     parameters:
 *       - in: path
 *         name: recordingId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Recording deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/MediaRecording'
 *       404:
 *         description: Recording not found
 */
router.delete('/:recordingId', async (req, res) => {
  try {
    const { recordingId } = req.params;
    const recording = await deleteRecording(recordingId);
    res.json(recording);
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

/**
 * @swagger
 * /media-sessions/{sessionId}/recordings/stats:
 *   get:
 *     summary: Get recording statistics for a session
 *     tags: [Recordings]
 *     parameters:
 *       - in: path
 *         name: sessionId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Recording statistics retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 totalRecordings:
 *                   type: integer
 *                 totalDuration:
 *                   type: integer
 *                 totalFileSize:
 *                   type: integer
 *                 recordingsByFormat:
 *                   type: object
 *                 recordingsByStatus:
 *                   type: object
 */
router.get('/:sessionId/recordings/stats', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const stats = await getRecordingStats(sessionId);
    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

/**
 * @swagger
 * /media-recordings/stats/storage:
 *   get:
 *     summary: Get storage usage statistics
 *     tags: [Recordings]
 *     responses:
 *       200:
 *         description: Storage usage statistics retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 totalStorageMB:
 *                   type: number
 *                 audioStorageMB:
 *                   type: number
 *                 videoStorageMB:
 *                   type: number
 *                 recordingCount:
 *                   type: integer
 *                 averageFileSize:
 *                   type: number
 */
router.get('/stats/storage', async (req, res) => {
  try {
    const stats = await getStorageUsage();
    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

/**
 * @swagger
 * /media-recordings/cleanup:
 *   post:
 *     summary: Cleanup old recordings
 *     tags: [Recordings]
 *     parameters:
 *       - in: query
 *         name: daysToKeep
 *         schema:
 *           type: integer
 *           default: 90
 *     responses:
 *       200:
 *         description: Cleanup completed
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 cleanedCount:
 *                   type: integer
 */
router.post('/cleanup', async (req, res) => {
  try {
    const daysToKeep = parseInt(req.query.daysToKeep as string) || 90;
    const cleanedCount = await cleanupOldRecordings(daysToKeep);
    res.json({ cleanedCount });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

export default router;