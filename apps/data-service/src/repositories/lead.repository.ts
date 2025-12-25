import { PrismaClient, Lead, LeadStatus, InsuranceType } from '@prisma/client';
import { logger } from '@insurance-lead-gen/core';
import type { Lead as LeadType } from '@insurance-lead-gen/types';

export class LeadRepository {
  constructor(private prisma: PrismaClient) {}

  async createLead(leadData: Partial<LeadType>): Promise<Lead> {
    try {
      const lead = await this.prisma.lead.create({
        data: {
          source: leadData.source || 'unknown',
          email: leadData.email,
          phone: leadData.phone,
          firstName: leadData.firstName,
          lastName: leadData.lastName,
          street: leadData.address?.street,
          city: leadData.address?.city,
          state: leadData.address?.state,
          zipCode: leadData.address?.zipCode,
          country: leadData.address?.country,
          insuranceType: leadData.insuranceType as InsuranceType | undefined,
          qualityScore: leadData.qualityScore,
          status: leadData.status as LeadStatus | 'RECEIVED',
          metadata: leadData.metadata as any,
        },
      });

      logger.info('Lead created successfully', { leadId: lead.id });
      return lead;
    } catch (error) {
      logger.error('Failed to create lead', { error, leadData });
      throw error;
    }
  }

  async getLeadById(leadId: string): Promise<Lead | null> {
    try {
      const lead = await this.prisma.lead.findUnique({
        where: { id: leadId },
        include: {
          assignments: true,
          events: true,
        },
      });

      if (!lead) {
        logger.warn('Lead not found', { leadId });
        return null;
      }

      logger.debug('Lead retrieved successfully', { leadId });
      return lead;
    } catch (error) {
      logger.error('Failed to get lead', { error, leadId });
      throw error;
    }
  }

  async updateLead(leadId: string, updateData: Partial<LeadType>): Promise<Lead> {
    try {
      const lead = await this.prisma.lead.update({
        where: { id: leadId },
        data: {
          email: updateData.email,
          phone: updateData.phone,
          firstName: updateData.firstName,
          lastName: updateData.lastName,
          street: updateData.address?.street,
          city: updateData.address?.city,
          state: updateData.address?.state,
          zipCode: updateData.address?.zipCode,
          country: updateData.address?.country,
          insuranceType: updateData.insuranceType as InsuranceType | undefined,
          qualityScore: updateData.qualityScore,
          status: updateData.status as LeadStatus | undefined,
          metadata: updateData.metadata as any,
        },
      });

      logger.info('Lead updated successfully', { leadId });
      return lead;
    } catch (error) {
      logger.error('Failed to update lead', { error, leadId });
      throw error;
    }
  }

  async assignLead(leadId: string, agentId: string): Promise<any> {
    try {
      // Check if lead exists
      const lead = await this.prisma.lead.findUnique({
        where: { id: leadId },
      });

      if (!lead) {
        throw new Error('Lead not found');
      }

      // Check if agent exists
      const agent = await this.prisma.agent.findUnique({
        where: { id: agentId },
      });

      if (!agent) {
        throw new Error('Agent not found');
      }

      // Create assignment
      const assignment = await this.prisma.leadAssignment.create({
        data: {
          leadId,
          agentId,
          status: 'PENDING',
        },
      });

      // Update agent's current lead count
      await this.prisma.agent.update({
        where: { id: agentId },
        data: {
          currentLeadCount: agent.currentLeadCount + 1,
        },
      });

      logger.info('Lead assigned successfully', { leadId, agentId });
      return assignment;
    } catch (error) {
      logger.error('Failed to assign lead', { error, leadId, agentId });
      throw error;
    }
  }

  async getLeadsByStatus(status: LeadStatus): Promise<Lead[]> {
    try {
      const leads = await this.prisma.lead.findMany({
        where: { status },
        orderBy: { createdAt: 'desc' },
      });

      logger.debug('Retrieved leads by status', { status, count: leads.length });
      return leads;
    } catch (error) {
      logger.error('Failed to get leads by status', { error, status });
      throw error;
    }
  }

  async searchLeads(query: any): Promise<Lead[]> {
    try {
      const leads = await this.prisma.lead.findMany({
        where: {
          OR: [
            { email: { contains: query.search } },
            { phone: { contains: query.search } },
            { firstName: { contains: query.search } },
            { lastName: { contains: query.search } },
          ],
        },
        take: query.limit || 50,
        skip: query.offset || 0,
        orderBy: { createdAt: 'desc' },
      });

      logger.debug('Lead search completed', { query, count: leads.length });
      return leads;
    } catch (error) {
      logger.error('Failed to search leads', { error, query });
      throw error;
    }
  }
}