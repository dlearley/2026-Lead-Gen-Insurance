/**
 * Phase 30: Partner Ecosystem & Integrations
 * Partner Service - Handles partner management operations
 */

import { PrismaClient } from '@prisma/client';
import type {
  Partner,
  PartnerContact,
  PartnerAgreement,
  PartnerStatus,
  PartnerTier,
  PartnerType,
  CreatePartnerRequest,
  UpdatePartnerRequest,
} from '@insurance-platform/types';

export class PartnerService {
  constructor(private prisma: PrismaClient) {}

  /**
   * Create a new partner
   */
  async createPartner(data: CreatePartnerRequest): Promise<Partner> {
    const partner = await this.prisma.partner.create({
      data: {
        partnerName: data.partnerName,
        description: data.description,
        partnerType: data.partnerType,
        website: data.website,
        tier: data.tier || 'BASIC',
        status: 'PENDING',
        contacts: {
          create: data.contacts.map((contact) => ({
            contactName: contact.contactName,
            email: contact.email,
            phone: contact.phone,
            role: contact.role,
            isPrimary: contact.isPrimary || false,
          })),
        },
      },
      include: {
        contacts: true,
      },
    });

    return this.mapPrismaPartner(partner);
  }

  /**
   * Get partner by ID
   */
  async getPartnerById(id: string): Promise<Partner | null> {
    const partner = await this.prisma.partner.findUnique({
      where: { id },
      include: {
        contacts: true,
        agreements: true,
        applications: true,
        pricing: true,
      },
    });

    return partner ? this.mapPrismaPartner(partner) : null;
  }

  /**
   * List partners with filters
   */
  async listPartners(filters: {
    status?: PartnerStatus;
    type?: PartnerType;
    tier?: PartnerTier;
    search?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ partners: Partner[]; total: number }> {
    const where: any = {};

    if (filters.status) {
      where.status = filters.status;
    }

    if (filters.type) {
      where.partnerType = filters.type;
    }

    if (filters.tier) {
      where.tier = filters.tier;
    }

    if (filters.search) {
      where.OR = [
        { partnerName: { contains: filters.search, mode: 'insensitive' } },
        { description: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    const [partners, total] = await Promise.all([
      this.prisma.partner.findMany({
        where,
        include: {
          contacts: true,
        },
        take: filters.limit || 50,
        skip: filters.offset || 0,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.partner.count({ where }),
    ]);

    return {
      partners: partners.map((p) => this.mapPrismaPartner(p)),
      total,
    };
  }

  /**
   * Update partner
   */
  async updatePartner(id: string, data: UpdatePartnerRequest): Promise<Partner> {
    const partner = await this.prisma.partner.update({
      where: { id },
      data: {
        partnerName: data.partnerName,
        description: data.description,
        website: data.website,
        logoUrl: data.logoUrl,
        status: data.status,
        tier: data.tier,
      },
      include: {
        contacts: true,
      },
    });

    return this.mapPrismaPartner(partner);
  }

  /**
   * Delete partner
   */
  async deletePartner(id: string): Promise<void> {
    await this.prisma.partner.delete({
      where: { id },
    });
  }

  /**
   * Activate partner
   */
  async activatePartner(id: string): Promise<Partner> {
    return this.updatePartner(id, { status: 'ACTIVE' });
  }

  /**
   * Suspend partner
   */
  async suspendPartner(id: string, reason?: string): Promise<Partner> {
    const partner = await this.prisma.partner.update({
      where: { id },
      data: { status: 'SUSPENDED' },
      include: { contacts: true },
    });

    // TODO: Notify partner of suspension
    // TODO: Revoke all active API keys
    // TODO: Disable all integrations

    return this.mapPrismaPartner(partner);
  }

  /**
   * Add partner contact
   */
  async addContact(
    partnerId: string,
    contact: {
      contactName: string;
      email: string;
      phone?: string;
      role?: string;
      isPrimary?: boolean;
    }
  ): Promise<PartnerContact> {
    // If setting as primary, unset other primary contacts
    if (contact.isPrimary) {
      await this.prisma.partnerContact.updateMany({
        where: { partnerId, isPrimary: true },
        data: { isPrimary: false },
      });
    }

    const partnerContact = await this.prisma.partnerContact.create({
      data: {
        partnerId,
        contactName: contact.contactName,
        email: contact.email,
        phone: contact.phone,
        role: contact.role,
        isPrimary: contact.isPrimary || false,
      },
    });

    return partnerContact as PartnerContact;
  }

  /**
   * Get partner contacts
   */
  async getContacts(partnerId: string): Promise<PartnerContact[]> {
    const contacts = await this.prisma.partnerContact.findMany({
      where: { partnerId },
      orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }],
    });

    return contacts as PartnerContact[];
  }

  /**
   * Create partner agreement
   */
  async createAgreement(
    partnerId: string,
    agreement: {
      agreementType: string;
      effectiveDate: Date;
      expirationDate?: Date;
      terms?: Record<string, any>;
      documentUrl?: string;
    }
  ): Promise<PartnerAgreement> {
    const partnerAgreement = await this.prisma.partnerAgreement.create({
      data: {
        partnerId,
        agreementType: agreement.agreementType,
        effectiveDate: agreement.effectiveDate,
        expirationDate: agreement.expirationDate,
        terms: agreement.terms,
        documentUrl: agreement.documentUrl,
        status: 'DRAFT',
      },
    });

    return partnerAgreement as PartnerAgreement;
  }

  /**
   * Sign agreement
   */
  async signAgreement(agreementId: string, signedDate: Date): Promise<PartnerAgreement> {
    const agreement = await this.prisma.partnerAgreement.update({
      where: { id: agreementId },
      data: {
        status: 'SIGNED',
        signedDate,
      },
    });

    return agreement as PartnerAgreement;
  }

  /**
   * Get partner agreements
   */
  async getAgreements(partnerId: string): Promise<PartnerAgreement[]> {
    const agreements = await this.prisma.partnerAgreement.findMany({
      where: { partnerId },
      orderBy: { createdAt: 'desc' },
    });

    return agreements as PartnerAgreement[];
  }

  /**
   * Get partner statistics
   */
  async getPartnerStatistics(partnerId: string): Promise<{
    applications: number;
    activeIntegrations: number;
    totalApiCalls: bigint;
    revenue: number;
  }> {
    const [applications, integrations, usage] = await Promise.all([
      this.prisma.partnerApplication.count({
        where: { partnerId, status: { in: ['APPROVED', 'PUBLISHED'] } },
      }),
      this.prisma.integration.count({
        where: { partnerId, status: 'ACTIVE' },
      }),
      this.prisma.partnerUsage.aggregate({
        where: {
          partnerId,
          metricName: 'api_calls',
        },
        _sum: {
          metricValue: true,
        },
      }),
    ]);

    // Get revenue from payouts
    const payouts = await this.prisma.partnerPayout.aggregate({
      where: {
        partnerId,
        status: 'COMPLETED',
      },
      _sum: {
        netPayout: true,
      },
    });

    return {
      applications,
      activeIntegrations: integrations,
      totalApiCalls: usage._sum.metricValue || BigInt(0),
      revenue: payouts._sum.netPayout || 0,
    };
  }

  /**
   * Map Prisma partner to domain model
   */
  private mapPrismaPartner(partner: any): Partner {
    return {
      id: partner.id,
      organizationId: partner.organizationId,
      partnerName: partner.partnerName,
      description: partner.description,
      partnerType: partner.partnerType as PartnerType,
      website: partner.website,
      logoUrl: partner.logoUrl,
      status: partner.status as PartnerStatus,
      tier: partner.tier as PartnerTier,
      createdAt: partner.createdAt,
      updatedAt: partner.updatedAt,
    };
  }
}
