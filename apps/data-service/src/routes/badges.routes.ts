import { Router, Request, Response } from 'express';
import { badgesRepository } from '../repositories/badges.repository.js';
import { logger } from '@insurance-lead-gen/core';
import { BadgeType } from '@prisma/client';

export function createBadgesRoutes(): Router {
  const router = Router();

  router.get('/types', async (_req: Request, res: Response) => {
    try {
      res.json(await badgesRepository.getAllBadgeTypes());
    } catch (error) {
      logger.error('Failed to get badge types', { error });
      res.status(500).json({ error: 'Failed to get badge types' });
    }
  });

  router.get('/agents/:agentId', async (req: Request, res: Response) => {
    try {
      const { agentId } = req.params;
      const badges = await badgesRepository.getAgentBadges(agentId);
      res.json(badges);
    } catch (error) {
      logger.error('Failed to get agent badges', { error, agentId: req.params.agentId });
      res.status(500).json({ error: 'Failed to get agent badges' });
    }
  });

  router.post('/agents/:agentId/award', async (req: Request, res: Response) => {
    try {
      const { agentId } = req.params;
      const { badgeType, metadata } = req.body;

      if (!Object.values(BadgeType).includes(badgeType)) {
        return res.status(400).json({ error: 'Invalid badgeType' });
      }

      const badge = await badgesRepository.awardBadge(agentId, badgeType as BadgeType, metadata);
      res.status(201).json(badge);
    } catch (error) {
      logger.error('Failed to award badge', { error, agentId: req.params.agentId });
      res.status(500).json({ error: 'Failed to award badge' });
    }
  });

  router.get('/leaderboard', async (req: Request, res: Response) => {
    try {
      const badgeType = req.query.badgeType as BadgeType | undefined;
      const leaderboard = await badgesRepository.getBadgeLeaders(badgeType);
      res.json(leaderboard);
    } catch (error) {
      logger.error('Failed to get badge leaderboard', { error });
      res.status(500).json({ error: 'Failed to get badge leaderboard' });
    }
  });

  return router;
}
