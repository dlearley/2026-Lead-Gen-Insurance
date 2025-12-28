import { Router } from 'express';
import type { Request, Response } from 'express';
import { z } from 'zod';
import { logger } from '@insurance-lead-gen/core';
import { prisma } from '@insurance-lead-gen/data-service';

import { authMiddleware } from '../middleware/auth.js';
import { validateBody, createLeadSchema, updateLeadSchema } from '../utils/validation.js';

const router = Router();

const toInt = (value: unknown, fallback: number): number => {
  if (typeof value !== 'string') return fallback;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const mapStatusQueryToDb = (status: string): string | undefined => {
  const normalized = status.trim().toUpperCase();

  // Historical API variants
  if (normalized === 'NEW') return 'RECEIVED';
  if (normalized === 'CONTACTED') return 'PROCESSING';
  if (normalized === 'UNQUALIFIED' || normalized === 'LOST') return 'REJECTED';

  const allowed = new Set(['RECEIVED', 'PROCESSING', 'QUALIFIED', 'ROUTED', 'CONVERTED', 'REJECTED']);
  if (allowed.has(normalized)) return normalized;

  return undefined;
};

router.post('/', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const validated = validateBody(createLeadSchema, req.body);

    const lead = await prisma.lead.create({
      data: {
        source: validated.source,
        email: validated.email,
        phone: validated.phone,
        firstName: validated.firstName,
        lastName: validated.lastName,
        street: validated.street,
        city: validated.city,
        state: validated.state,
        zipCode: validated.zipCode,
        country: validated.country,
        insuranceType: validated.insuranceType as any,
        metadata: validated.metadata as any,
      },
    });

    res.status(201).json({ success: true, data: lead });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Validation error', details: error.errors });
      return;
    }

    logger.error('Error creating lead', { error });
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const skip = Math.max(0, toInt(req.query.skip, 0));
    const take = Math.min(100, Math.max(1, toInt(req.query.take, 50)));

    const where: Record<string, unknown> = {};

    if (typeof req.query.status === 'string') {
      const mapped = mapStatusQueryToDb(req.query.status);
      if (mapped) {
        where.status = mapped as any;
      }
    }

    if (typeof req.query.insuranceType === 'string') {
      where.insuranceType = req.query.insuranceType.toUpperCase() as any;
    }

    if (typeof req.query.source === 'string') {
      where.source = req.query.source;
    }

    if (typeof req.query.city === 'string') {
      where.city = req.query.city;
    }

    if (typeof req.query.state === 'string') {
      where.state = req.query.state;
    }

    if (typeof req.query.minQualityScore === 'string') {
      const min = toInt(req.query.minQualityScore, 0);
      where.qualityScore = { gte: min };
    }

    const [total, leads] = await Promise.all([
      prisma.lead.count({ where: where as any }),
      prisma.lead.findMany({
        where: where as any,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    res.json({
      success: true,
      data: leads,
      pagination: {
        skip,
        take,
        total,
      },
    });
  } catch (error) {
    logger.error('Error listing leads', { error });
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/:leadId', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const { leadId } = req.params;

    const lead = await prisma.lead.findUnique({ where: { id: leadId } });

    if (!lead) {
      res.status(404).json({ error: 'Lead not found' });
      return;
    }

    res.json({ success: true, data: lead });
  } catch (error) {
    logger.error('Error fetching lead', { error });
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/:leadId', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const { leadId } = req.params;
    const validated = validateBody(updateLeadSchema, req.body);

    const data: Record<string, unknown> = {};

    if (validated.source !== undefined) data.source = validated.source;
    if (validated.email !== undefined) data.email = validated.email;
    if (validated.phone !== undefined) data.phone = validated.phone;
    if (validated.firstName !== undefined) data.firstName = validated.firstName;
    if (validated.lastName !== undefined) data.lastName = validated.lastName;
    if (validated.street !== undefined) data.street = validated.street;
    if (validated.city !== undefined) data.city = validated.city;
    if (validated.state !== undefined) data.state = validated.state;
    if (validated.zipCode !== undefined) data.zipCode = validated.zipCode;
    if (validated.country !== undefined) data.country = validated.country;

    if (validated.insuranceType !== undefined) data.insuranceType = validated.insuranceType as any;
    if (validated.status !== undefined) data.status = validated.status as any;
    if (validated.qualityScore !== undefined) data.qualityScore = validated.qualityScore;
    if (validated.metadata !== undefined) data.metadata = validated.metadata as any;

    const lead = await prisma.lead.update({
      where: { id: leadId },
      data: data as any,
    });

    res.json({ success: true, data: lead });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Validation error', details: error.errors });
      return;
    }

    // Prisma not-found error
    if (typeof error === 'object' && error && 'code' in error && (error as any).code === 'P2025') {
      res.status(404).json({ error: 'Lead not found' });
      return;
    }

    logger.error('Error updating lead', { error });
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/:leadId', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const { leadId } = req.params;

    await prisma.lead.delete({ where: { id: leadId } });

    res.json({ success: true, message: 'Lead deleted successfully' });
  } catch (error) {
    if (typeof error === 'object' && error && 'code' in error && (error as any).code === 'P2025') {
      res.status(404).json({ error: 'Lead not found' });
      return;
    }

    logger.error('Error deleting lead', { error });
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
