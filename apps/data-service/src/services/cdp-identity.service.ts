import { PrismaClient } from '@prisma/client';
import type {
  CustomerIdentity,
  CreateIdentityDto,
  IdentityMergeRequest,
  IdentityType,
} from '@insurance/types';

export class CDPIdentityService {
  constructor(private prisma: PrismaClient) {}

  async createIdentity(
    customerId: string,
    data: CreateIdentityDto
  ): Promise<CustomerIdentity> {
    const identity = await this.prisma.customerIdentity.create({
      data: {
        customerId,
        identityType: data.identityType,
        identityValue: data.identityValue,
        provider: data.provider,
        verifiedAt: data.verifiedAt,
        isPrimary: data.isPrimary || false,
        metadata: data.metadata as any,
      },
    });

    return this.mapToIdentity(identity);
  }

  async getIdentities(customerId: string): Promise<CustomerIdentity[]> {
    const identities = await this.prisma.customerIdentity.findMany({
      where: { customerId },
      orderBy: [{ isPrimary: 'desc' }, { createdAt: 'desc' }],
    });

    return identities.map((i) => this.mapToIdentity(i));
  }

  async findByIdentity(
    identityType: IdentityType,
    identityValue: string
  ): Promise<CustomerIdentity | null> {
    const identity = await this.prisma.customerIdentity.findUnique({
      where: {
        identityType_identityValue: {
          identityType,
          identityValue,
        },
      },
    });

    if (!identity) return null;
    return this.mapToIdentity(identity);
  }

  async resolveCustomer(
    identityType: IdentityType,
    identityValue: string
  ): Promise<string | null> {
    const identity = await this.findByIdentity(identityType, identityValue);
    return identity?.customerId || null;
  }

  async mergeIdentities(request: IdentityMergeRequest): Promise<void> {
    const { sourceCustomerId, targetCustomerId, mergeStrategy } = request;

    if (mergeStrategy === 'merge') {
      await this.prisma.customerIdentity.updateMany({
        where: { customerId: sourceCustomerId },
        data: { customerId: targetCustomerId },
      });

      await this.prisma.customerEvent.updateMany({
        where: { customerId: sourceCustomerId },
        data: { customerId: targetCustomerId },
      });

      await this.prisma.customerTrait.updateMany({
        where: { customerId: sourceCustomerId },
        data: { customerId: targetCustomerId },
      });
    }
  }

  async verifyIdentity(
    customerId: string,
    identityType: IdentityType,
    identityValue: string
  ): Promise<CustomerIdentity> {
    const identity = await this.prisma.customerIdentity.update({
      where: {
        identityType_identityValue: {
          identityType,
          identityValue,
        },
      },
      data: {
        verifiedAt: new Date(),
      },
    });

    return this.mapToIdentity(identity);
  }

  async setPrimaryIdentity(
    customerId: string,
    identityType: IdentityType,
    identityValue: string
  ): Promise<void> {
    await this.prisma.$transaction([
      this.prisma.customerIdentity.updateMany({
        where: { customerId, identityType },
        data: { isPrimary: false },
      }),
      this.prisma.customerIdentity.update({
        where: {
          identityType_identityValue: {
            identityType,
            identityValue,
          },
        },
        data: { isPrimary: true },
      }),
    ]);
  }

  private mapToIdentity(identity: any): CustomerIdentity {
    return {
      id: identity.id,
      customerId: identity.customerId,
      identityType: identity.identityType,
      identityValue: identity.identityValue,
      provider: identity.provider,
      verifiedAt: identity.verifiedAt,
      isPrimary: identity.isPrimary,
      metadata: identity.metadata,
      createdAt: identity.createdAt,
      updatedAt: identity.updatedAt,
    };
  }
}
