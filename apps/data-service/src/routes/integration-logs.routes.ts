import { Router, Request, Response } from 'express';
import { getPrismaClient } from '../prisma/client.js';
import { IntegrationLogFilterParams, PaginatedResponse } from '@insurance/types';
import logger from '../logger.js';

const router = Router();
const prisma = getPrismaClient();

/**
 * GET /api/v1/integration-logs
 * Get integration logs with filtering and pagination
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const filters: IntegrationLogFilterParams = {
      entityType: req.query.entityType as any,
      entityId: req.query.entityId as string,
      carrierId: req.query.carrierId as string,
      brokerId: req.query.brokerId as string,
      configId: req.query.configId as string,
      action: req.query.action as any,
      direction: req.query.direction as any,
      success: req.query.success === 'true' ? true : req.query.success === 'false' ? false : undefined,
      dateFrom: req.query.dateFrom ? new Date(req.query.dateFrom as string) : undefined,
      dateTo: req.query.dateTo ? new Date(req.query.dateTo as string) : undefined,
      page: req.query.page ? parseInt(req.query.page as string) : undefined,
      limit: req.query.limit ? parseInt(req.query.limit as string) : undefined,
    };

    const page = filters.page ?? 1;
    const limit = filters.limit ?? 50;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};

    if (filters.entityType) {
      where.entityType = filters.entityType;
    }

    if (filters.entityId) {
      where.entityId = filters.entityId;
    }

    if (filters.carrierId) {
      where.carrierId = filters.carrierId;
    }

    if (filters.brokerId) {
      where.brokerId = filters.brokerId;
    }

    if (filters.configId) {
      where.configId = filters.configId;
    }

    if (filters.action) {
      where.action = filters.action;
    }

    if (filters.direction) {
      where.direction = filters.direction;
    }

    if (filters.success !== undefined) {
      where.success = filters.success;
    }

    if (filters.dateFrom || filters.dateTo) {
      where.createdAt = {};
      if (filters.dateFrom) {
        (where.createdAt as Record<string, Date>).gte = filters.dateFrom;
      }
      if (filters.dateTo) {
        (where.createdAt as Record<string, Date>).lte = filters.dateTo;
      }
    }

    const [logs, total] = await Promise.all([
      prisma.integrationLog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          carrier: {
            select: {
              id: true,
              name: true,
              code: true,
            },
          },
          broker: {
            select: {
              id: true,
              name: true,
              code: true,
            },
          },
          config: {
            select: {
              id: true,
              name: true,
              configType: true,
            },
          },
        },
      }),
      prisma.integrationLog.count({ where }),
    ]);

    const response: PaginatedResponse<any> = {
      data: logs,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNext: page * limit < total,
        hasPrevious: page > 1,
      },
    };

    res.json(response);
  } catch (error) {
    logger.error('Error getting integration logs', { error });
    res.status(500).json({ error: 'Failed to get integration logs' });
  }
});

/**
 * GET /api/v1/integration-logs/:id
 * Get a specific integration log by ID
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const log = await prisma.integrationLog.findUnique({
      where: { id },
      include: {
        carrier: true,
        broker: true,
        config: true,
      },
    });

    if (!log) {
      return res.status(404).json({ error: 'Integration log not found' });
    }

    res.json(log);
  } catch (error) {
    logger.error('Error getting integration log', { id: req.params.id, error });
    res.status(500).json({ error: 'Failed to get integration log' });
  }
});

/**
 * DELETE /api/v1/integration-logs
 * Delete integration logs (with optional filters)
 */
router.delete('/', async (req: Request, res: Response) => {
  try {
    const { entityType, entityId, beforeDate } = req.query;

    const where: Record<string, unknown> = {};

    if (entityType) {
      where.entityType = entityType;
    }

    if (entityId) {
      where.entityId = entityId;
    }

    if (beforeDate) {
      where.createdAt = {
        lt: new Date(beforeDate as string),
      };
    }

    const result = await prisma.integrationLog.deleteMany({ where });

    logger.info('Integration logs deleted', { count: result.count });

    res.json({
      success: true,
      deleted: result.count,
    });
  } catch (error) {
    logger.error('Error deleting integration logs', { error });
    res.status(500).json({ error: 'Failed to delete integration logs' });
  }
});

/**
 * GET /api/v1/integration-logs/stats/summary
 * Get integration logs summary statistics
 */
router.get('/stats/summary', async (req: Request, res: Response) => {
  try {
    const { entityId, entityType, dateFrom, dateTo } = req.query;

    const where: Record<string, unknown> = {};

    if (entityId) {
      where.entityId = entityId;
    }

    if (entityType) {
      where.entityType = entityType;
    }

    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) {
        (where.createdAt as Record<string, Date>).gte = new Date(dateFrom as string);
      }
      if (dateTo) {
        (where.createdAt as Record<string, Date>).lte = new Date(dateTo as string);
      }
    }

    const [total, successful, failed, avgDuration] = await Promise.all([
      prisma.integrationLog.count({ where }),
      prisma.integrationLog.count({
        where: { ...where, success: true },
      }),
      prisma.integrationLog.count({
        where: { ...where, success: false },
      }),
      prisma.integrationLog.aggregate({
        where: { ...where, duration: { not: null } },
        _avg: {
          duration: true,
        },
      }),
    ]);

    // Get logs by action
    const logsByAction = await prisma.integrationLog.groupBy({
      by: ['action'],
      where,
      _count: {
        id: true,
      },
    });

    // Get logs by entity type
    const logsByEntityType = await prisma.integrationLog.groupBy({
      by: ['entityType'],
      where,
      _count: {
        id: true,
      },
    });

    res.json({
      total,
      successful,
      failed,
      successRate: total > 0 ? successful / total : 0,
      averageDuration: avgDuration._avg.duration || 0,
      byAction: logsByAction.map(item => ({
        action: item.action,
        count: item._count.id,
      })),
      byEntityType: logsByEntityType.map(item => ({
        entityType: item.entityType,
        count: item._count.id,
      })),
    });
  } catch (error) {
    logger.error('Error getting integration logs stats', { error });
    res.status(500).json({ error: 'Failed to get integration logs stats' });
  }
});

export default router;
