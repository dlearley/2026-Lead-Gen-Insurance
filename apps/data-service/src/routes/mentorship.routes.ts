import { Router, Request, Response } from 'express';
import { mentorshipRepository } from '../repositories/mentorship.repository.js';
import { logger } from '@insurance-lead-gen/core';

export function createMentorshipRoutes(): Router {
  const router = Router();

  router.post('/request', async (req: Request, res: Response) => {
    try {
      const { mentorId, menteeId } = req.body;
      if (!mentorId || !menteeId) {
        return res.status(400).json({ error: 'mentorId and menteeId are required' });
      }

      const relationship = await mentorshipRepository.createRelationship(mentorId, menteeId);
      res.status(201).json(relationship);
    } catch (error) {
      logger.error('Failed to create mentorship relationship', { error });
      res.status(500).json({ error: 'Failed to create mentorship relationship' });
    }
  });

  router.post('/:id/accept', async (req: Request, res: Response) => {
    try {
      const relationship = await mentorshipRepository.acceptRelationship(req.params.id);
      res.json(relationship);
    } catch (error) {
      logger.error('Failed to accept mentorship relationship', { error, relationshipId: req.params.id });
      res.status(500).json({ error: 'Failed to accept mentorship relationship' });
    }
  });

  router.get('/mentor/:mentorId', async (req: Request, res: Response) => {
    try {
      const relationships = await mentorshipRepository.getMentorRelationships(req.params.mentorId);
      res.json(relationships);
    } catch (error) {
      logger.error('Failed to get mentor relationships', { error, mentorId: req.params.mentorId });
      res.status(500).json({ error: 'Failed to get mentor relationships' });
    }
  });

  router.get('/mentee/:menteeId', async (req: Request, res: Response) => {
    try {
      const relationships = await mentorshipRepository.getMenteeRelationships(req.params.menteeId);
      res.json(relationships);
    } catch (error) {
      logger.error('Failed to get mentee relationships', { error, menteeId: req.params.menteeId });
      res.status(500).json({ error: 'Failed to get mentee relationships' });
    }
  });

  router.post('/:id/sessions', async (req: Request, res: Response) => {
    try {
      const { scheduledAt, duration, topic, notes } = req.body;
      if (!scheduledAt || typeof duration !== 'number') {
        return res.status(400).json({ error: 'scheduledAt and duration are required' });
      }

      const session = await mentorshipRepository.scheduleSession(req.params.id, {
        scheduledAt: new Date(scheduledAt),
        duration,
        topic,
        notes,
      });

      res.status(201).json(session);
    } catch (error) {
      logger.error('Failed to schedule mentorship session', { error, relationshipId: req.params.id });
      res.status(500).json({ error: 'Failed to schedule mentorship session' });
    }
  });

  router.get('/:id/sessions', async (req: Request, res: Response) => {
    try {
      const sessions = await mentorshipRepository.getSessions(req.params.id);
      res.json(sessions);
    } catch (error) {
      logger.error('Failed to get mentorship sessions', { error, relationshipId: req.params.id });
      res.status(500).json({ error: 'Failed to get mentorship sessions' });
    }
  });

  router.post('/sessions/:sessionId/complete', async (req: Request, res: Response) => {
    try {
      const { notes } = req.body;
      const session = await mentorshipRepository.completeSession(req.params.sessionId, notes);
      res.json(session);
    } catch (error) {
      logger.error('Failed to complete mentorship session', { error, sessionId: req.params.sessionId });
      res.status(500).json({ error: 'Failed to complete mentorship session' });
    }
  });

  return router;
}
