import { Prisma, Lead, LeadStatus, InsuranceType, LeadSource, Urgency } from '@prisma/client';
import prisma from '../db/prisma.js';
import { logger } from '@insurance-lead-gen/core';

export interface CreateLeadInput {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  dateOfBirth?: Date;
  insuranceType: InsuranceType;
  insuranceTypes?: InsuranceType[];
  currentProvider?: string;
  policyExpiryDate?: Date;
  source?: LeadSource;
  status?: LeadStatus;
  qualityScore?: number;
  urgency?: Urgency;
  intent?: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  country?: string;
  notes?: string;
  metadata?: Prisma.InputJsonValue;
}

export interface UpdateLeadInput {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  dateOfBirth?: Date;
  insuranceType?: InsuranceType;
  insuranceTypes?: InsuranceType[];
  currentProvider?: string;
  policyExpiryDate?: Date;
  source?: LeadSource;
  status?: LeadStatus;
  qualityScore?: number;
  urgency?: Urgency;
  intent?: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  country?: string;
  notes?: string;
  metadata?: Prisma.InputJsonValue;
  enrichedData?: Prisma.InputJsonValue;
  aiProcessedAt?: Date;
  aiScoreReason?: string;
  similarityScore?: number;
}

export interface LeadFilters {
  status?: LeadStatus | LeadStatus[];
  insuranceType?: InsuranceType | InsuranceType[];
  source?: LeadSource | LeadSource[];
  minQualityScore?: number;
  maxQualityScore?: number;
  urgency?: Urgency | Urgency[];
  createdAfter?: Date;
  createdBefore?: Date;
  state?: string;
  zipCode?: string;
}

export class LeadRepository {
  async create(input: CreateLeadInput): Promise<Lead> {
    try {
      logger.info('Creating new lead', { email: input.email });

      const lead = await prisma.lead.create({
        data: input,
      });

      logger.info('Lead created successfully', { leadId: lead.id });
      return lead;
    } catch (error) {
      logger.error('Failed to create lead', { error, input });
      throw error;
    }
  }

  async findById(id: string): Promise<Lead | null> {
    try {
      return await prisma.lead.findUnique({
        where: { id },
        include: {
          assignments: true,
          events: true,
        },
      });
    } catch (error) {
      logger.error('Failed to find lead by ID', { error, id });
      throw error;
    }
  }

  async findByEmail(email: string): Promise<Lead | null> {
    try {
      return await prisma.lead.findFirst({
        where: { email },
        include: {
          assignments: true,
        },
      });
    } catch (error) {
      logger.error('Failed to find lead by email', { error, email });
      throw error;
    }
  }

  async findMany(filters?: LeadFilters, skip = 0, take = 20): Promise<Lead[]> {
    try {
      const where: Prisma.LeadWhereInput = {};

      if (filters) {
        if (filters.status) {
          where.status = Array.isArray(filters.status) ? { in: filters.status } : filters.status;
        }

        if (filters.insuranceType) {
          where.insuranceType = Array.isArray(filters.insuranceType)
            ? { in: filters.insuranceType }
            : filters.insuranceType;
        }

        if (filters.source) {
          where.source = Array.isArray(filters.source) ? { in: filters.source } : filters.source;
        }

        if (filters.urgency) {
          where.urgency = Array.isArray(filters.urgency)
            ? { in: filters.urgency }
            : filters.urgency;
        }

        if (filters.minQualityScore !== undefined || filters.maxQualityScore !== undefined) {
          where.qualityScore = {};
          if (filters.minQualityScore !== undefined) {
            where.qualityScore.gte = filters.minQualityScore;
          }
          if (filters.maxQualityScore !== undefined) {
            where.qualityScore.lte = filters.maxQualityScore;
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

        if (filters.state) {
          where.state = filters.state;
        }

        if (filters.zipCode) {
          where.zipCode = filters.zipCode;
        }
      }

      return await prisma.lead.findMany({
        where,
        skip,
        take,
        orderBy: {
          createdAt: 'desc',
        },
        include: {
          assignments: {
            include: {
              agent: true,
            },
          },
        },
      });
    } catch (error) {
      logger.error('Failed to find leads', { error, filters });
      throw error;
    }
  }

  async count(filters?: LeadFilters): Promise<number> {
    try {
      const where: Prisma.LeadWhereInput = {};

      if (filters) {
        if (filters.status) {
          where.status = Array.isArray(filters.status) ? { in: filters.status } : filters.status;
        }

        if (filters.insuranceType) {
          where.insuranceType = Array.isArray(filters.insuranceType)
            ? { in: filters.insuranceType }
            : filters.insuranceType;
        }
      }

      return await prisma.lead.count({ where });
    } catch (error) {
      logger.error('Failed to count leads', { error, filters });
      throw error;
    }
  }

  async update(id: string, input: UpdateLeadInput): Promise<Lead> {
    try {
      logger.info('Updating lead', { leadId: id });

      const lead = await prisma.lead.update({
        where: { id },
        data: input,
      });

      logger.info('Lead updated successfully', { leadId: lead.id });
      return lead;
    } catch (error) {
      logger.error('Failed to update lead', { error, id, input });
      throw error;
    }
  }

  async delete(id: string): Promise<Lead> {
    try {
      logger.info('Deleting lead', { leadId: id });

      const lead = await prisma.lead.delete({
        where: { id },
      });

      logger.info('Lead deleted successfully', { leadId: lead.id });
      return lead;
    } catch (error) {
      logger.error('Failed to delete lead', { error, id });
      throw error;
    }
  }

  async updateStatus(id: string, status: LeadStatus): Promise<Lead> {
    return this.update(id, { status });
  }

  async updateQualityScore(
    id: string,
    qualityScore: number,
    aiScoreReason?: string
  ): Promise<Lead> {
    return this.update(id, {
      qualityScore,
      aiScoreReason,
      aiProcessedAt: new Date(),
    });
  }

  async getLeadsByInsuranceType(insuranceType: InsuranceType, limit = 50): Promise<Lead[]> {
    try {
      return await prisma.lead.findMany({
        where: {
          insuranceType,
          status: {
            in: [LeadStatus.NEW, LeadStatus.QUALIFIED, LeadStatus.ASSIGNED],
          },
        },
        take: limit,
        orderBy: [{ qualityScore: 'desc' }, { createdAt: 'desc' }],
      });
    } catch (error) {
      logger.error('Failed to get leads by insurance type', { error, insuranceType });
      throw error;
    }
  }

  async getHighQualityLeads(minScore = 70, limit = 50): Promise<Lead[]> {
    try {
      return await prisma.lead.findMany({
        where: {
          qualityScore: {
            gte: minScore,
          },
          status: {
            in: [LeadStatus.NEW, LeadStatus.QUALIFIED],
          },
        },
        take: limit,
        orderBy: [{ qualityScore: 'desc' }, { createdAt: 'desc' }],
      });
    } catch (error) {
      logger.error('Failed to get high quality leads', { error, minScore });
      throw error;
    }
  }

  async getUnassignedLeads(limit = 50): Promise<Lead[]> {
    try {
      return await prisma.lead.findMany({
        where: {
          status: {
            in: [LeadStatus.NEW, LeadStatus.QUALIFIED],
          },
          assignments: {
            none: {},
          },
        },
        take: limit,
        orderBy: [{ qualityScore: 'desc' }, { createdAt: 'desc' }],
      });
    } catch (error) {
      logger.error('Failed to get unassigned leads', { error });
      throw error;
    }
  }
}

export const leadRepository = new LeadRepository();
