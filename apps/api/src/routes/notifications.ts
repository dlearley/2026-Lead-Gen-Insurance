import { Router } from 'express';
import type { Request, Response } from 'express';
import { z } from 'zod';
import { authMiddleware } from '../middleware/auth.js';
import { validateQuery, notificationFilterSchema } from '../utils/validation.js';
import { store } from '../storage/in-memory.js';
import { paginate } from '../utils/pagination.js';
import { logger } from '@insurance-lead-gen/core';

const router = Router();

router.get('/', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const user = req.user!;
    const filters = validateQuery(notificationFilterSchema, req.query);

    let notifications = Array.from(store.notifications.values()).filter((n) => n.userId === user.id);

    if (filters.type) {
      notifications = notifications.filter((n) => n.type.toUpperCase() === filters.type);
    }

    if (filters.isRead !== undefined) {
      notifications = notifications.filter((n) => n.isRead === filters.isRead);
    }

    if (filters.dateFrom) {
      const dateFrom = new Date(filters.dateFrom);
      notifications = notifications.filter((n) => n.createdAt >= dateFrom);
    }

    if (filters.dateTo) {
      const dateTo = new Date(filters.dateTo);
      notifications = notifications.filter((n) => n.createdAt <= dateTo);
    }

    notifications.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    const result = paginate(notifications, filters.page, filters.limit);
    res.json(result);
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Validation error', details: error.errors });
      return;
    }
    logger.error('Error fetching notifications', { error });
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/unread-count', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const user = req.user!;
    const unreadCount = Array.from(store.notifications.values()).filter((n) => n.userId === user.id && !n.isRead).length;
    res.json({ count: unreadCount });
  } catch (error) {
    logger.error('Error fetching unread count', { error });
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/:notificationId/read', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const { notificationId } = req.params;
    const user = req.user!;

    const notification = store.notifications.get(notificationId);
    if (!notification || notification.userId !== user.id) {
      res.status(404).json({ error: 'Notification not found' });
      return;
    }

    notification.isRead = true;
    notification.readAt = new Date();
    store.notifications.set(notificationId, notification);

    res.json(notification);
  } catch (error) {
    logger.error('Error marking notification as read', { error });
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/mark-all-read', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const user = req.user!;
    const now = new Date();

    Array.from(store.notifications.values())
      .filter((n) => n.userId === user.id && !n.isRead)
      .forEach((n) => {
        n.isRead = true;
        n.readAt = now;
        store.notifications.set(n.id, n);
      });

    res.json({ message: 'All notifications marked as read' });
  } catch (error) {
    logger.error('Error marking all as read', { error });
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/:notificationId', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const { notificationId } = req.params;
    const user = req.user!;

    const notification = store.notifications.get(notificationId);
    if (!notification || notification.userId !== user.id) {
      res.status(404).json({ error: 'Notification not found' });
      return;
    }

    store.notifications.delete(notificationId);
    res.status(204).send();
  } catch (error) {
    logger.error('Error deleting notification', { error });
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
