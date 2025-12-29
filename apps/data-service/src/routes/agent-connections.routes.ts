import { Router, Request, Response } from 'express';
import { agentConnectionsRepository } from '../repositories/agent-connections.repository.js';
import { logger } from '@insurance-lead-gen/core';

export function createAgentConnectionsRoutes(): Router {
  const router = Router();

  router.post('/request', async (req: Request, res: Response) => {
    try {
      const { followerId, followingId } = req.body;
      if (!followerId || !followingId) {
        return res.status(400).json({ error: 'followerId and followingId are required' });
      }

      const connection = await agentConnectionsRepository.sendConnectionRequest(followerId, followingId);
      res.status(201).json(connection);
    } catch (error) {
      logger.error('Failed to send connection request', { error });
      res.status(500).json({ error: 'Failed to send connection request' });
    }
  });

  router.post('/accept', async (req: Request, res: Response) => {
    try {
      const { followerId, followingId } = req.body;
      if (!followerId || !followingId) {
        return res.status(400).json({ error: 'followerId and followingId are required' });
      }

      const connection = await agentConnectionsRepository.acceptConnection(followerId, followingId);
      res.json(connection);
    } catch (error) {
      logger.error('Failed to accept connection', { error });
      res.status(500).json({ error: 'Failed to accept connection' });
    }
  });

  router.post('/remove', async (req: Request, res: Response) => {
    try {
      const { followerId, followingId } = req.body;
      if (!followerId || !followingId) {
        return res.status(400).json({ error: 'followerId and followingId are required' });
      }

      const result = await agentConnectionsRepository.removeConnection(followerId, followingId);
      res.json(result);
    } catch (error) {
      logger.error('Failed to remove connection', { error });
      res.status(500).json({ error: 'Failed to remove connection' });
    }
  });

  router.get('/:agentId/followers', async (req: Request, res: Response) => {
    try {
      const followers = await agentConnectionsRepository.getFollowers(req.params.agentId);
      res.json(followers);
    } catch (error) {
      logger.error('Failed to get followers', { error, agentId: req.params.agentId });
      res.status(500).json({ error: 'Failed to get followers' });
    }
  });

  router.get('/:agentId/following', async (req: Request, res: Response) => {
    try {
      const following = await agentConnectionsRepository.getFollowing(req.params.agentId);
      res.json(following);
    } catch (error) {
      logger.error('Failed to get following', { error, agentId: req.params.agentId });
      res.status(500).json({ error: 'Failed to get following' });
    }
  });

  router.get('/:agentId/pending', async (req: Request, res: Response) => {
    try {
      const pending = await agentConnectionsRepository.getPendingRequests(req.params.agentId);
      res.json(pending);
    } catch (error) {
      logger.error('Failed to get pending requests', { error, agentId: req.params.agentId });
      res.status(500).json({ error: 'Failed to get pending requests' });
    }
  });

  return router;
}
