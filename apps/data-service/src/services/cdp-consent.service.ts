import { PrismaClient } from '@prisma/client';
import { CustomerConsent, SetConsentDto } from '@insurance/types';

export class CDPConsentService {
  constructor(private prisma: PrismaClient) {}

  async setConsent(customerId: string, data: SetConsentDto): Promise<CustomerConsent> {
    const now = new Date();

    const consent = await this.prisma.customerConsent.upsert({
      where: {
        customerId_consentType: {
          customerId,
          consentType: data.consentType,
        },
      },
      create: {
        customerId,
        consentType: data.consentType,
        granted: data.granted,
        grantedAt: data.granted ? now : null,
        revokedAt: data.granted ? null : now,
        expiresAt: data.expiresAt,
        source: data.source,
        ipAddress: data.ipAddress,
        metadata: data.metadata as any,
      },
      update: {
        granted: data.granted,
        grantedAt: data.granted ? now : null,
        revokedAt: data.granted ? null : now,
        expiresAt: data.expiresAt,
        source: data.source,
        ipAddress: data.ipAddress,
        metadata: data.metadata as any,
        updatedAt: now,
      },
    });

    return this.mapToConsent(consent);
  }

  async getConsents(customerId: string): Promise<CustomerConsent[]> {
    const consents = await this.prisma.customerConsent.findMany({
      where: { customerId },
      orderBy: { updatedAt: 'desc' },
    });

    return consents.map((c) => this.mapToConsent(c));
  }

  async getConsent(customerId: string, consentType: string): Promise<CustomerConsent | null> {
    const consent = await this.prisma.customerConsent.findUnique({
      where: {
        customerId_consentType: {
          customerId,
          consentType: consentType as any,
        },
      },
    });

    if (!consent) return null;
    return this.mapToConsent(consent);
  }

  private mapToConsent(consent: any): CustomerConsent {
    return {
      id: consent.id,
      customerId: consent.customerId,
      consentType: consent.consentType,
      granted: consent.granted,
      grantedAt: consent.grantedAt || undefined,
      revokedAt: consent.revokedAt || undefined,
      expiresAt: consent.expiresAt || undefined,
      source: consent.source || undefined,
      ipAddress: consent.ipAddress || undefined,
      metadata: consent.metadata || undefined,
      createdAt: consent.createdAt,
      updatedAt: consent.updatedAt,
    };
  }
}
