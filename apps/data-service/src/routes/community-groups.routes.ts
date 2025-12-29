import { Router, Request, Response } from 'express';
import { communityGroupsRepository } from '../repositories/community-groups.repository.js';
import { logger } from '@insurance-lead-gen/core';
import { GroupMemberRole } from '@prisma/client';

export function createCommunityGroupsRoutes(): Router {
  const router = Router();

  router.post('/', async (req: Request, res: Response) => {
    try {
      const { createdById, name, description, category, isPrivate, coverImage } = req.body;

      if (!createdById || !name || !description || !category) {
        return res.status(400).json({ error: 'createdById, name, description, and category are required' });
      }

      const group = await communityGroupsRepository.createGroup(createdById, {
        name,
        description,
        category,
        isPrivate,
        coverImage,
      });

      // Auto-join creator as admin
      await communityGroupsRepository.joinGroup(group.id, createdById);
      await communityGroupsRepository.updateMemberRole(group.id, createdById, GroupMemberRole.ADMIN);

      res.status(201).json(group);
    } catch (error) {
      logger.error('Failed to create community group', { error });
      res.status(500).json({ error: 'Failed to create community group' });
    }
  });

  router.get('/', async (req: Request, res: Response) => {
    try {
      const { category, isPrivate, skip, take } = req.query;
      const groups = await communityGroupsRepository.getGroups({
        category: category as string,
        isPrivate: isPrivate ? isPrivate === 'true' : undefined,
        skip: skip ? parseInt(skip as string) : undefined,
        take: take ? parseInt(take as string) : undefined,
      });
      res.json(groups);
    } catch (error) {
      logger.error('Failed to get community groups', { error });
      res.status(500).json({ error: 'Failed to get community groups' });
    }
  });

  router.get('/:id', async (req: Request, res: Response) => {
    try {
      const group = await communityGroupsRepository.getGroupById(req.params.id);
      if (!group) {
        return res.status(404).json({ error: 'Group not found' });
      }
      res.json(group);
    } catch (error) {
      logger.error('Failed to get community group', { error, groupId: req.params.id });
      res.status(500).json({ error: 'Failed to get community group' });
    }
  });

  router.post('/:id/join', async (req: Request, res: Response) => {
    try {
      const { agentId } = req.body;
      if (!agentId) {
        return res.status(400).json({ error: 'agentId is required' });
      }

      const membership = await communityGroupsRepository.joinGroup(req.params.id, agentId);
      res.status(201).json(membership);
    } catch (error) {
      logger.error('Failed to join community group', { error, groupId: req.params.id });
      res.status(500).json({ error: 'Failed to join community group' });
    }
  });

  router.post('/:id/leave', async (req: Request, res: Response) => {
    try {
      const { agentId } = req.body;
      if (!agentId) {
        return res.status(400).json({ error: 'agentId is required' });
      }

      const result = await communityGroupsRepository.leaveGroup(req.params.id, agentId);
      res.json(result);
    } catch (error) {
      logger.error('Failed to leave community group', { error, groupId: req.params.id });
      res.status(500).json({ error: 'Failed to leave community group' });
    }
  });

  return router;
}
