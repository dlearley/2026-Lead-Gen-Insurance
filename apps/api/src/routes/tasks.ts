import { Router } from 'express';
import type { Request, Response } from 'express';
import { z } from 'zod';
import { authMiddleware } from '../middleware/auth.js';
import { validateBody, validateQuery, createTaskSchema, updateTaskSchema, taskFilterSchema } from '../utils/validation.js';
import { store, generateId } from '../storage/in-memory.js';
import type { Task } from '@insurance-lead-gen/types';
import { paginate } from '../utils/pagination.js';
import { logger } from '@insurance-lead-gen/core';

const router = Router({ mergeParams: true });

router.post('/', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const { leadId } = req.params;
    const user = req.user!;

    const lead = store.leads.get(leadId);
    if (!lead) {
      res.status(404).json({ error: 'Lead not found' });
      return;
    }

    const validated = validateBody(createTaskSchema, req.body);
    const now = new Date();

    const task: Task = {
      id: generateId(),
      leadId,
      creatorId: user.id,
      assigneeId: validated.assigneeId,
      title: validated.title,
      description: validated.description,
      status: 'open',
      priority: validated.priority.toLowerCase() as Task['priority'],
      dueDate: validated.dueDate ? new Date(validated.dueDate) : undefined,
      createdAt: now,
      updatedAt: now,
      creator: store.users.get(user.id),
      assignee: validated.assigneeId ? store.users.get(validated.assigneeId) : undefined,
    };

    store.tasks.set(task.id, task);

    const activity = {
      id: generateId(),
      leadId,
      userId: user.id,
      activityType: 'task_created' as const,
      action: 'Created task',
      description: `Task created: ${task.title}`,
      metadata: { taskId: task.id },
      createdAt: now,
      user: store.users.get(user.id),
    };
    store.activities.set(activity.id, activity);

    if (task.assigneeId) {
      const notification = {
        id: generateId(),
        userId: task.assigneeId,
        type: 'task_assigned' as const,
        title: 'Task assigned',
        message: `You were assigned a task: ${task.title}`,
        entityType: 'task',
        entityId: task.id,
        isRead: false,
        createdAt: now,
      };
      store.notifications.set(notification.id, notification);
    }

    res.status(201).json(task);
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Validation error', details: error.errors });
      return;
    }
    logger.error('Error creating task', { error });
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const { leadId } = req.params;

    const lead = store.leads.get(leadId);
    if (!lead) {
      res.status(404).json({ error: 'Lead not found' });
      return;
    }

    const filters = validateQuery(taskFilterSchema, req.query);

    let tasks = Array.from(store.tasks.values()).filter((t) => t.leadId === leadId);

    if (filters.creatorId) {
      tasks = tasks.filter((t) => t.creatorId === filters.creatorId);
    }

    if (filters.assigneeId) {
      tasks = tasks.filter((t) => t.assigneeId === filters.assigneeId);
    }

    if (filters.status) {
      tasks = tasks.filter((t) => t.status.toUpperCase() === filters.status);
    }

    if (filters.priority) {
      tasks = tasks.filter((t) => t.priority.toUpperCase() === filters.priority);
    }

    if (filters.dueDateFrom) {
      const from = new Date(filters.dueDateFrom);
      tasks = tasks.filter((t) => (t.dueDate ? t.dueDate >= from : false));
    }

    if (filters.dueDateTo) {
      const to = new Date(filters.dueDateTo);
      tasks = tasks.filter((t) => (t.dueDate ? t.dueDate <= to : false));
    }

    if (filters.search) {
      const s = filters.search.toLowerCase();
      tasks = tasks.filter((t) => `${t.title} ${t.description ?? ''}`.toLowerCase().includes(s));
    }

    tasks.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    const result = paginate(tasks, filters.page, filters.limit);
    res.json(result);
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Validation error', details: error.errors });
      return;
    }
    logger.error('Error fetching tasks', { error });
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/:taskId', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const { leadId, taskId } = req.params;

    const task = store.tasks.get(taskId);
    if (!task || task.leadId !== leadId) {
      res.status(404).json({ error: 'Task not found' });
      return;
    }

    res.json(task);
  } catch (error) {
    logger.error('Error fetching task', { error });
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/:taskId', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const { leadId, taskId } = req.params;
    const user = req.user!;

    const task = store.tasks.get(taskId);
    if (!task || task.leadId !== leadId) {
      res.status(404).json({ error: 'Task not found' });
      return;
    }

    const validated = validateBody(updateTaskSchema, req.body);

    if (validated.title !== undefined) task.title = validated.title;
    if (validated.description !== undefined) task.description = validated.description;
    if (validated.assigneeId !== undefined) task.assigneeId = validated.assigneeId;
    if (validated.priority !== undefined) task.priority = validated.priority.toLowerCase() as Task['priority'];
    if (validated.status !== undefined) task.status = validated.status.toLowerCase() as Task['status'];
    if (validated.dueDate !== undefined) task.dueDate = validated.dueDate ? new Date(validated.dueDate) : undefined;

    if (validated.status === 'COMPLETED') {
      task.completedAt = new Date();
    }

    task.updatedAt = new Date();
    store.tasks.set(task.id, task);

    const activity = {
      id: generateId(),
      leadId,
      userId: user.id,
      activityType: validated.status === 'COMPLETED' ? ('task_completed' as const) : ('task_updated' as const),
      action: validated.status === 'COMPLETED' ? 'Completed task' : 'Updated task',
      description: `Task updated: ${task.title}`,
      metadata: { taskId: task.id },
      createdAt: new Date(),
      user: store.users.get(user.id),
    };
    store.activities.set(activity.id, activity);

    res.json(task);
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Validation error', details: error.errors });
      return;
    }
    logger.error('Error updating task', { error });
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/:taskId', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const { leadId, taskId } = req.params;

    const task = store.tasks.get(taskId);
    if (!task || task.leadId !== leadId) {
      res.status(404).json({ error: 'Task not found' });
      return;
    }

    store.tasks.delete(taskId);
    res.status(204).send();
  } catch (error) {
    logger.error('Error deleting task', { error });
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
