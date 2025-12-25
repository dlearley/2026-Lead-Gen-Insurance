import { Prisma, Lead, LeadStatus, InsuranceType } from '@prisma/client';
import { prisma } from '../database/prisma.client.js';
import { logger } from '@insurance-lead-gen/core';

export interface CreateLeadInput {
  firstName?: string;
  lastName?: string;
  email: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
  source: string;
  insuranceType?: InsuranceType;
  metadata?: Prisma.InputJsonValue;
  rawData?: Prisma.InputJsonValue;
  externalId?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  referrerUrl?: string;
  landingPageUrl?: string;
}

export interface UpdateLeadInput {
  firstName?: string;
  lastName?: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
  status?: LeadStatus;
  insuranceType?: InsuranceType;
  qualityScore?: number;
  priority?: string;
  intent?: string;
  urgency?: string;
  estimatedValue?: Prisma.Decimal | number;
  metadata?: Prisma.InputJsonValue;
  enrichmentData?: Prisma.InputJsonValue;
  tags?: string[];
  notes?: string;
  aiQualificationData?: Prisma.InputJsonValue;
  aiClassificationData?: Prisma.InputJsonValue;
  embeddingId?: string;
  lastContactedAt?: Date;
  convertedAt?: Date;
}

export interface LeadFilters {
  status?: LeadStatus;
  source?: string;
  insuranceType?: InsuranceType;
  qualityScoreMin?: number;
  qualityScoreMax?: number;
  createdAfter?: Date;
  createdBefore?: Date;
  email?: string;
  phone?: string;
  externalId?: string;
}

export class LeadRepository {
  async create(data: CreateLeadInput): Promise<Lead> {
    try {
      const lead = await prisma.lead.create({
        data: {
          ...data,
          source: data.source as any,
          status: LeadStatus.NEW,
        },
      });

      logger.info('Lead created', { leadId: lead.id, email: lead.email });
      return lead;
    } catch (error) {
      logger.error('Failed to create lead', { error, data });
      throw error;
    }
  }

  async findById(id: string): Promise<Lead | null> {
    try {
      return await prisma.lead.findUnique({
        where: { id },
        include: {
          assignments: true,
          activities: {
            orderBy: { createdAt: 'desc' },
            take: 10,
          },
          documents: true,
        },
      });
    } catch (error) {
      logger.error('Failed to find lead by id', { error, id });
      throw error;
    }
  }

  async findByEmail(email: string): Promise<Lead | null> {
    try {
      return await prisma.lead.findUnique({
        where: { email },
      });
    } catch (error) {
      logger.error('Failed to find lead by email', { error, email });
      throw error;
    }
  }

  async findByExternalId(externalId: string): Promise<Lead | null> {
    try {
      return await prisma.lead.findUnique({
        where: { externalId },
      });
    } catch (error) {
      logger.error('Failed to find lead by external id', { error, externalId });
      throw error;
    }
  }

  async update(id: string, data: UpdateLeadInput): Promise<Lead> {
    try {
      const lead = await prisma.lead.update({
        where: { id },
        data,
      });

      logger.info('Lead updated', { leadId: lead.id });
      return lead;
    } catch (error) {
      logger.error('Failed to update lead', { error, id, data });
      throw error;
    }
  }

  async delete(id: string): Promise<void> {
    try {
      await prisma.lead.delete({
        where: { id },
      });

      logger.info('Lead deleted', { leadId: id });
    } catch (error) {
      logger.error('Failed to delete lead', { error, id });
      throw error;
    }
  }

  async findMany(
    filters: LeadFilters = {},
    page = 1,
    limit = 50
  ): Promise<{ leads: Lead[]; total: number; page: number; totalPages: number }> {
    try {
      const where: Prisma.LeadWhereInput = {};

      if (filters.status) {
        where.status = filters.status;
      }

      if (filters.source) {
        where.source = filters.source as any;
      }

      if (filters.insuranceType) {
        where.insuranceType = filters.insuranceType;
      }

      if (filters.qualityScoreMin !== undefined || filters.qualityScoreMax !== undefined) {
        where.qualityScore = {};
        if (filters.qualityScoreMin !== undefined) {
          where.qualityScore.gte = filters.qualityScoreMin;
        }
        if (filters.qualityScoreMax !== undefined) {
          where.qualityScore.lte = filters.qualityScoreMax;
        }
      }

      if (filters.createdAfter || filters.createdBefore) {
        where.createdAt = {};
        if (filters.createdAfter) {
          where.createdAt.gte = filters.createdAfter;
        }
        if (filters.createdBefore) {
          where.createdAt.lte = filters.createdBefore;
        }
      }

      if (filters.email) {
        where.email = { contains: filters.email, mode: 'insensitive' };
      }

      if (filters.phone) {
        where.phone = { contains: filters.phone };
      }

      if (filters.externalId) {
        where.externalId = filters.externalId;
      }

      const skip = (page - 1) * limit;

      const [leads, total] = await Promise.all([
        prisma.lead.findMany({
          where,
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' },
        }),
        prisma.lead.count({ where }),
      ]);

      const totalPages = Math.ceil(total / limit);

      return { leads, total, page, totalPages };
    } catch (error) {
      logger.error('Failed to find leads', { error, filters });
      throw error;
    }
  }

  async updateStatus(id: string, status: LeadStatus): Promise<Lead> {
    return this.update(id, { status });
  }

  async updateQualityScore(id: string, qualityScore: number): Promise<Lead> {
    return this.update(id, { qualityScore });
  }

  async addActivity(leadId: string, activityType: string, description: string, metadata?: Prisma.InputJsonValue): Promise<void> {
    try {
      await prisma.leadActivity.create({
        data: {
          leadId,
          activityType,
          description,
          metadata,
        },
      });

      logger.info('Lead activity added', { leadId, activityType });
    } catch (error) {
      logger.error('Failed to add lead activity', { error, leadId, activityType });
      throw error;
    }
  }

  async getLeadStats(): Promise<{
    total: number;
    byStatus: { status: LeadStatus; count: number }[];
    bySource: { source: string; count: number }[];
    byInsuranceType: { type: string; count: number }[];
  }> {
    try {
      const [total, byStatus, bySource, byInsuranceType] = await Promise.all([
        prisma.lead.count(),
        prisma.lead.groupBy({
          by: ['status'],
          _count: true,
        }),
        prisma.lead.groupBy({
          by: ['source'],
          _count: true,
        }),
        prisma.lead.groupBy({
          by: ['insuranceType'],
          _count: true,
        }),
      ]);

      return {
        total,
        byStatus: byStatus.map((s) => ({ status: s.status, count: s._count })),
        bySource: bySource.map((s) => ({ source: s.source, count: s._count })),
        byInsuranceType: byInsuranceType
          .filter((t) => t.insuranceType !== null)
          .map((t) => ({ type: t.insuranceType!, count: t._count })),
      };
    } catch (error) {
      logger.error('Failed to get lead stats', { error });
      throw error;
    }
  }
}

export const leadRepository = new LeadRepository();
