import type { PrismaClient, LeadStatus } from '@prisma/client';
import type { LeadCreatePayload } from '@insurance-lead-gen/types';

export interface LeadRecord {
  id: string;
  source: string;
  email: string | null;
  phone: string | null;
  firstName: string | null;
  lastName: string | null;
  address: unknown;
  insuranceType: string | null;
  qualityScore: number | null;
  status: LeadStatus;
  metadata: unknown;
  createdAt: Date;
  updatedAt: Date;
}

export class LeadRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async createLead(leadId: string, payload: LeadCreatePayload): Promise<LeadRecord> {
    return this.prisma.lead.create({
      data: {
        id: leadId,
        source: payload.source,
        email: payload.email,
        phone: payload.phone,
        firstName: payload.firstName,
        lastName: payload.lastName,
        address: payload.address,
        insuranceType: payload.insuranceType,
        metadata: payload.metadata,
        status: 'received',
      },
    });
  }

  async getLeadById(leadId: string): Promise<LeadRecord | null> {
    return this.prisma.lead.findUnique({ where: { id: leadId } });
  }

  async updateLeadStatus(leadId: string, status: LeadStatus): Promise<LeadRecord> {
    return this.prisma.lead.update({
      where: { id: leadId },
      data: { status },
    });
  }
}
