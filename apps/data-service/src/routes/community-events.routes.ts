import { Router, Request, Response } from 'express';
import { communityEventsRepository } from '../repositories/community-events.repository.js';
import { logger } from '@insurance-lead-gen/core';
import { CommunityEventType } from '@prisma/client';

export function createCommunityEventsRoutes(): Router {
  const router = Router();

  router.post('/', async (req: Request, res: Response) => {
    try {
      const {
        hostId,
        title,
        description,
        eventType,
        startTime,
        endTime,
        location,
        isVirtual,
        meetingLink,
        maxAttendees,
        coverImage,
      } = req.body;

      if (!hostId || !title || !description || !eventType || !startTime || !endTime) {
        return res.status(400).json({
          error: 'hostId, title, description, eventType, startTime, and endTime are required',
        });
      }

      const event = await communityEventsRepository.createEvent(hostId, {
        title,
        description,
        eventType,
        startTime: new Date(startTime),
        endTime: new Date(endTime),
        location,
        isVirtual,
        meetingLink,
        maxAttendees,
        coverImage,
      });

      res.status(201).json(event);
    } catch (error) {
      logger.error('Failed to create community event', { error });
      res.status(500).json({ error: 'Failed to create community event' });
    }
  });

  router.get('/', async (req: Request, res: Response) => {
    try {
      const { eventType, from, to, skip, take } = req.query;
      const events = await communityEventsRepository.getEvents({
        eventType: eventType as CommunityEventType,
        from: from ? new Date(from as string) : undefined,
        to: to ? new Date(to as string) : undefined,
        skip: skip ? parseInt(skip as string) : undefined,
        take: take ? parseInt(take as string) : undefined,
      });
      res.json(events);
    } catch (error) {
      logger.error('Failed to get community events', { error });
      res.status(500).json({ error: 'Failed to get community events' });
    }
  });

  router.get('/:id', async (req: Request, res: Response) => {
    try {
      const event = await communityEventsRepository.getEventById(req.params.id);
      if (!event) {
        return res.status(404).json({ error: 'Event not found' });
      }
      res.json(event);
    } catch (error) {
      logger.error('Failed to get community event', { error, eventId: req.params.id });
      res.status(500).json({ error: 'Failed to get community event' });
    }
  });

  router.post('/:id/register', async (req: Request, res: Response) => {
    try {
      const { agentId } = req.body;
      if (!agentId) {
        return res.status(400).json({ error: 'agentId is required' });
      }

      const registration = await communityEventsRepository.registerForEvent(req.params.id, agentId);
      res.status(201).json(registration);
    } catch (error) {
      logger.error('Failed to register for community event', { error, eventId: req.params.id });
      res.status(500).json({ error: 'Failed to register for community event' });
    }
  });

  router.post('/:id/cancel', async (req: Request, res: Response) => {
    try {
      const { agentId } = req.body;
      if (!agentId) {
        return res.status(400).json({ error: 'agentId is required' });
      }

      const result = await communityEventsRepository.cancelEventRegistration(req.params.id, agentId);
      res.json(result);
    } catch (error) {
      logger.error('Failed to cancel event registration', { error, eventId: req.params.id });
      res.status(500).json({ error: 'Failed to cancel event registration' });
    }
  });

  return router;
}
