import type { InsuranceType, Lead, LeadStatus, PrismaClient } from '@prisma/client';
import type { LeadCreatePayload } from '@insurance-lead-gen/types';

const mapInsuranceType = (
  insuranceType?: LeadCreatePayload['insuranceType']
): InsuranceType | undefined => {
  if (!insuranceType) return undefined;

  const mapping: Record<NonNullable<LeadCreatePayload['insuranceType']>, InsuranceType> = {
    auto: 'AUTO',
    home: 'HOME',
    life: 'LIFE',
    health: 'HEALTH',
    commercial: 'COMMERCIAL',
  };

  return mapping[insuranceType];
};

export class LeadRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async createLead(leadId: string, payload: LeadCreatePayload): Promise<Lead> {
    return this.prisma.lead.create({
      data: {
        id: leadId,
        source: payload.source,
        email: payload.email ?? null,
        phone: payload.phone ?? null,
        firstName: payload.firstName ?? null,
        lastName: payload.lastName ?? null,
        street: payload.address?.street ?? null,
        city: payload.address?.city ?? null,
        state: payload.address?.state ?? null,
        zipCode: payload.address?.zipCode ?? null,
        country: payload.address?.country ?? null,
        insuranceType: mapInsuranceType(payload.insuranceType),
        metadata: (payload.metadata ?? null) as any,
        status: 'RECEIVED',
      },
    });
  }

  async getLeadById(leadId: string): Promise<Lead | null> {
    return this.prisma.lead.findUnique({ where: { id: leadId } });
  }

  async updateLeadStatus(leadId: string, status: LeadStatus): Promise<Lead> {
    return this.prisma.lead.update({
      where: { id: leadId },
      data: { status },
    });
  }
}
