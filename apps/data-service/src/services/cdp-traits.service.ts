import { PrismaClient } from '@prisma/client';
import { CustomerTrait, SetTraitDto, SetTraitsDto } from '@insurance/types';

export class CDPTraitsService {
  constructor(private prisma: PrismaClient) {}

  async setTrait(customerId: string, data: SetTraitDto): Promise<CustomerTrait> {
    const trait = await this.prisma.customerTrait.upsert({
      where: {
        customerId_traitKey: {
          customerId,
          traitKey: data.traitKey,
        },
      },
      create: {
        customerId,
        traitKey: data.traitKey,
        traitValue: data.traitValue as any,
        traitType: data.traitType,
        source: data.source || 'system',
        computedAt: data.computedAt,
        expiresAt: data.expiresAt,
        metadata: data.metadata as any,
      },
      update: {
        traitValue: data.traitValue as any,
        traitType: data.traitType,
        source: data.source || 'system',
        computedAt: data.computedAt,
        expiresAt: data.expiresAt,
        metadata: data.metadata as any,
        updatedAt: new Date(),
      },
    });

    return this.mapToTrait(trait);
  }

  async setTraits(customerId: string, data: SetTraitsDto): Promise<CustomerTrait[]> {
    const traits: CustomerTrait[] = [];

    for (const traitData of data.traits) {
      const trait = await this.setTrait(customerId, traitData);
      traits.push(trait);
    }

    return traits;
  }

  async getTrait(customerId: string, traitKey: string): Promise<CustomerTrait | null> {
    const trait = await this.prisma.customerTrait.findUnique({
      where: {
        customerId_traitKey: {
          customerId,
          traitKey,
        },
      },
    });

    if (!trait) return null;
    return this.mapToTrait(trait);
  }

  async getTraits(customerId: string): Promise<CustomerTrait[]> {
    const traits = await this.prisma.customerTrait.findMany({
      where: { customerId },
      orderBy: { createdAt: 'desc' },
    });

    return traits.map((t) => this.mapToTrait(t));
  }

  async deleteTrait(customerId: string, traitKey: string): Promise<void> {
    await this.prisma.customerTrait.delete({
      where: {
        customerId_traitKey: {
          customerId,
          traitKey,
        },
      },
    });
  }

  async deleteExpiredTraits(): Promise<number> {
    const result = await this.prisma.customerTrait.deleteMany({
      where: {
        expiresAt: {
          lte: new Date(),
        },
      },
    });

    return result.count;
  }

  async computeEngagementTraits(customerId: string): Promise<void> {
    const eventCounts = await this.prisma.customerEvent.groupBy({
      by: ['eventType'],
      where: {
        customerId,
        timestamp: {
          gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        },
      },
      _count: true,
    });

    const totalEvents = eventCounts.reduce((sum, item) => sum + item._count, 0);

    await this.setTrait(customerId, {
      traitKey: 'engagement_30d',
      traitValue: totalEvents,
      traitType: 'ENGAGEMENT',
      source: 'computed',
      computedAt: new Date(),
    });

    const lastEvent = await this.prisma.customerEvent.findFirst({
      where: { customerId },
      orderBy: { timestamp: 'desc' },
    });

    if (lastEvent) {
      const daysSinceLastActivity = Math.floor(
        (Date.now() - lastEvent.timestamp.getTime()) / (1000 * 60 * 60 * 24)
      );

      await this.setTrait(customerId, {
        traitKey: 'days_since_last_activity',
        traitValue: daysSinceLastActivity,
        traitType: 'BEHAVIORAL',
        source: 'computed',
        computedAt: new Date(),
      });
    }
  }

  private mapToTrait(trait: any): CustomerTrait {
    return {
      id: trait.id,
      customerId: trait.customerId,
      traitKey: trait.traitKey,
      traitValue: trait.traitValue,
      traitType: trait.traitType,
      source: trait.source,
      computedAt: trait.computedAt || undefined,
      expiresAt: trait.expiresAt || undefined,
      metadata: trait.metadata || undefined,
      createdAt: trait.createdAt,
      updatedAt: trait.updatedAt,
    };
  }
}
