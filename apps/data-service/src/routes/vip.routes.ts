import { Router, Request, Response } from 'express';
import { vipRepository } from '../repositories/vip.repository.js';
import { logger } from '@insurance-lead-gen/core';
import { VIPTier } from '@prisma/client';

export function createVIPRoutes(): Router {
  const router = Router();

  router.get('/agents/:agentId/status', async (req: Request, res: Response) => {
    try {
      const { agentId } = req.params;
      const status = await vipRepository.getAgentStatus(agentId);
      if (!status) {
        return res.status(404).json({ error: 'VIP status not found for agent' });
      }
      res.json(status);
    } catch (error) {
      logger.error('Failed to get agent VIP status', { error, agentId: req.params.agentId });
      res.status(500).json({ error: 'Failed to get agent VIP status' });
    }
  });

  router.post('/agents/:agentId/points', async (req: Request, res: Response) => {
    try {
      const { agentId } = req.params;
      const { pointsDelta } = req.body;
      if (typeof pointsDelta !== 'number') {
        return res.status(400).json({ error: 'pointsDelta must be a number' });
      }
      const status = await vipRepository.updateAgentPoints(agentId, pointsDelta);
      res.json(status);
    } catch (error) {
      logger.error('Failed to update agent VIP points', { error, agentId: req.params.agentId });
      res.status(500).json({ error: 'Failed to update agent VIP points' });
    }
  });

  router.put('/agents/:agentId/tier', async (req: Request, res: Response) => {
    try {
      const { agentId } = req.params;
      const { tier } = req.body;
      if (!Object.values(VIPTier).includes(tier)) {
        return res.status(400).json({ error: 'Invalid VIP tier' });
      }
      const status = await vipRepository.setAgentTier(agentId, tier as VIPTier);
      res.json(status);
    } catch (error) {
      logger.error('Failed to set agent VIP tier', { error, agentId: req.params.agentId });
      res.status(500).json({ error: 'Failed to set agent VIP tier' });
    }
  });

  router.get('/leaderboard', async (req: Request, res: Response) => {
    try {
      const limit = parseInt(req.query.limit as string) || 10;
      const leaderboard = await vipRepository.getTopAgents(limit);
      res.json(leaderboard);
    } catch (error) {
      logger.error('Failed to get VIP leaderboard', { error });
      res.status(500).json({ error: 'Failed to get VIP leaderboard' });
    }
  });

  return router;
}
