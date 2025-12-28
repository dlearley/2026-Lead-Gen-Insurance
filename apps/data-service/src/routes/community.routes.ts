import { Router, Request, Response } from 'express';
import { communityRepository } from '../repositories/community.repository.js';
import { vipService, EngagementAction } from '../services/vip.service.js';
import { logger } from '@insurance-lead-gen/core';
import { PostCategory } from '@prisma/client';

export function createCommunityRoutes(): Router {
  const router = Router();

  router.post('/posts', async (req: Request, res: Response) => {
    try {
      const { authorId, title, content, category } = req.body;
      if (!authorId || !title || !content) {
        return res.status(400).json({ error: 'authorId, title, and content are required' });
      }
      const post = await communityRepository.createPost(authorId, { title, content, category });
      
      // Reward for posting
      await vipService.rewardEngagement(authorId, EngagementAction.COMMUNITY_POST);
      
      res.status(201).json(post);
    } catch (error) {
      logger.error('Failed to create community post', { error });
      res.status(500).json({ error: 'Failed to create community post' });
    }
  });

  router.get('/posts', async (req: Request, res: Response) => {
    try {
      const { category, skip, take, search } = req.query;
      const posts = await communityRepository.getPosts({
        category: category as PostCategory,
        skip: skip ? parseInt(skip as string) : undefined,
        take: take ? parseInt(take as string) : undefined,
        search: search as string,
      });
      res.json(posts);
    } catch (error) {
      logger.error('Failed to get community posts', { error });
      res.status(500).json({ error: 'Failed to get community posts' });
    }
  });

  router.get('/posts/:id', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const post = await communityRepository.getPostById(id);
      if (!post) {
        return res.status(404).json({ error: 'Post not found' });
      }
      res.json(post);
    } catch (error) {
      logger.error('Failed to get community post', { error, postId: req.params.id });
      res.status(500).json({ error: 'Failed to get community post' });
    }
  });

  router.post('/posts/:id/comments', async (req: Request, res: Response) => {
    try {
      const { id: postId } = req.params;
      const { authorId, content } = req.body;
      if (!authorId || !content) {
        return res.status(400).json({ error: 'authorId and content are required' });
      }
      const comment = await communityRepository.createComment(postId, authorId, content);
      
      // Reward for commenting
      await vipService.rewardEngagement(authorId, EngagementAction.COMMUNITY_COMMENT);
      
      res.status(201).json(comment);
    } catch (error) {
      logger.error('Failed to create community comment', { error, postId: req.params.id });
      res.status(500).json({ error: 'Failed to create community comment' });
    }
  });

  router.post('/like', async (req: Request, res: Response) => {
    try {
      const { agentId, postId, commentId } = req.body;
      if (!agentId || (!postId && !commentId)) {
        return res.status(400).json({ error: 'agentId and either postId or commentId are required' });
      }
      const result = await communityRepository.toggleLike(agentId, { postId, commentId });
      
      // If liked, reward the author of the post/comment
      if (result.liked) {
        const targetAuthorId = await communityRepository.getTargetAuthorId({ postId, commentId });
        if (targetAuthorId && targetAuthorId !== agentId) {
          await vipService.rewardEngagement(targetAuthorId, EngagementAction.LIKE_RECEIVED);
        }
      }
      
      res.json(result);
    } catch (error) {
      logger.error('Failed to toggle like', { error });
      res.status(500).json({ error: 'Failed to toggle like' });
    }
  });

  router.get('/success-stories', async (req: Request, res: Response) => {
    try {
      const limit = parseInt(req.query.limit as string) || 5;
      const stories = await communityRepository.getSuccessStories(limit);
      res.json(stories);
    } catch (error) {
      logger.error('Failed to get success stories', { error });
      res.status(500).json({ error: 'Failed to get success stories' });
    }
  });

  return router;
}
