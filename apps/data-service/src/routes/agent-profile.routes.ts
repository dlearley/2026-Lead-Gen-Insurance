import { Router, Request, Response } from 'express';
import { agentProfileRepository } from '../repositories/agent-profile.repository.js';
import { logger } from '@insurance-lead-gen/core';

export function createAgentProfileRoutes(): Router {
  const router = Router();

  router.get('/:agentId', async (req: Request, res: Response) => {
    try {
      const profile = await agentProfileRepository.getProfile(req.params.agentId);
      if (!profile) {
        return res.status(404).json({ error: 'Profile not found' });
      }
      res.json(profile);
    } catch (error) {
      logger.error('Failed to get agent profile', { error, agentId: req.params.agentId });
      res.status(500).json({ error: 'Failed to get agent profile' });
    }
  });

  router.put('/:agentId', async (req: Request, res: Response) => {
    try {
      const profile = await agentProfileRepository.upsertProfile(req.params.agentId, req.body);
      res.json(profile);
    } catch (error) {
      logger.error('Failed to update agent profile', { error, agentId: req.params.agentId });
      res.status(500).json({ error: 'Failed to update agent profile' });
    }
  });

  return router;
}
