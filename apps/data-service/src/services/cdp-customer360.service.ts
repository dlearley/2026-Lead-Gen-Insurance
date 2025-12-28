import { PrismaClient } from '@prisma/client';
import { Customer360View } from '@insurance/types';
import { CDPIdentityService } from './cdp-identity.service.js';
import { CDPTraitsService } from './cdp-traits.service.js';
import { CDPConsentService } from './cdp-consent.service.js';
import { CDPEventsService } from './cdp-events.service.js';

export class CDPCustomer360Service {
  private identityService: CDPIdentityService;
  private traitsService: CDPTraitsService;
  private consentService: CDPConsentService;
  private eventsService: CDPEventsService;

  constructor(private prisma: PrismaClient) {
    this.identityService = new CDPIdentityService(prisma);
    this.traitsService = new CDPTraitsService(prisma);
    this.consentService = new CDPConsentService(prisma);
    this.eventsService = new CDPEventsService(prisma);
  }

  async getCustomer360View(customerId: string): Promise<Customer360View | null> {
    const customer = await this.prisma.customer.findUnique({
      where: { id: customerId },
      include: {
        profile: true,
      },
    });

    if (!customer) {
      return null;
    }

    const [
      identities,
      traits,
      consents,
      segmentMemberships,
      engagementScore,
      lifetimeValue,
      recentEvents,
      journeySteps,
    ] = await Promise.all([
      this.identityService.getIdentities(customerId),
      this.traitsService.getTraits(customerId),
      this.consentService.getConsents(customerId),
      this.getSegmentMemberships(customerId),
      this.getEngagementScore(customerId),
      this.getLifetimeValue(customerId),
      this.eventsService.getRecentEvents(customerId, 20),
      this.getJourneySteps(customerId, 10),
    ]);

    return {
      customer: {
        id: customer.id,
        email: customer.email,
        phoneNumber: customer.phoneNumber || undefined,
        isVerified: customer.isVerified,
        lastLoginAt: customer.lastLoginAt || undefined,
        createdAt: customer.createdAt,
      },
      profile: customer.profile
        ? {
            dateOfBirth: customer.profile.dateOfBirth || undefined,
            preferredContact: customer.profile.preferredContact,
            address: customer.profile.address || undefined,
            emergencyContact: customer.profile.emergencyContact || undefined,
            preferences: customer.profile.preferences || undefined,
          }
        : undefined,
      identities,
      traits,
      segments: segmentMemberships.map((sm: any) => ({
        id: sm.segment.id,
        name: sm.segment.name,
        segmentType: sm.segment.segmentType,
        joinedAt: sm.joinedAt,
      })),
      consents,
      engagementScore,
      lifetimeValue,
      recentEvents,
      journeySteps,
    };
  }

  private async getSegmentMemberships(customerId: string): Promise<any[]> {
    return await this.prisma.customerSegmentMembership.findMany({
      where: {
        customerId,
        isActive: true,
      },
      include: {
        segment: {
          select: {
            id: true,
            name: true,
            segmentType: true,
          },
        },
      },
      orderBy: { joinedAt: 'desc' },
    });
  }

  private async getEngagementScore(customerId: string) {
    const score = await this.prisma.customerEngagementScore.findUnique({
      where: { customerId },
    });

    if (!score) return undefined;

    return {
      id: score.id,
      customerId: score.customerId,
      overallScore: score.overallScore,
      emailScore: score.emailScore,
      webScore: score.webScore,
      portalScore: score.portalScore,
      recencyScore: score.recencyScore,
      frequencyScore: score.frequencyScore,
      monetaryScore: score.monetaryScore,
      computedAt: score.computedAt,
      metadata: score.metadata || undefined,
    };
  }

  private async getLifetimeValue(customerId: string) {
    const ltv = await this.prisma.customerLifetimeValue.findUnique({
      where: { customerId },
    });

    if (!ltv) return undefined;

    return {
      id: ltv.id,
      customerId: ltv.customerId,
      currentValue: ltv.currentValue,
      predictedValue: ltv.predictedValue,
      totalPurchases: ltv.totalPurchases,
      averagePurchaseValue: ltv.averagePurchaseValue,
      purchaseFrequency: ltv.purchaseFrequency,
      customerTenure: ltv.customerTenure,
      churnProbability: ltv.churnProbability || undefined,
      computedAt: ltv.computedAt,
      metadata: ltv.metadata || undefined,
    };
  }

  private async getJourneySteps(customerId: string, limit: number) {
    const steps = await this.prisma.customerJourneyStep.findMany({
      where: { customerId },
      orderBy: { timestamp: 'desc' },
      take: limit,
    });

    return steps.map((step) => ({
      id: step.id,
      customerId: step.customerId,
      stepName: step.stepName,
      stepType: step.stepType,
      stepOrder: step.stepOrder,
      timestamp: step.timestamp,
      duration: step.duration || undefined,
      completed: step.completed,
      exitPoint: step.exitPoint,
      metadata: step.metadata || undefined,
    }));
  }

  async computeEngagementScore(customerId: string): Promise<void> {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const eventCounts = await this.prisma.customerEvent.groupBy({
      by: ['eventType'],
      where: {
        customerId,
        timestamp: { gte: thirtyDaysAgo },
      },
      _count: true,
    });

    const totalEvents = eventCounts.reduce((sum, item) => sum + item._count, 0);

    const loginEvents = eventCounts.find((e) => e.eventType === 'LOGIN')?._count || 0;
    const pageViews = eventCounts.find((e) => e.eventType === 'PAGE_VIEW')?._count || 0;

    const lastEvent = await this.prisma.customerEvent.findFirst({
      where: { customerId },
      orderBy: { timestamp: 'desc' },
    });

    const recencyScore = lastEvent
      ? Math.max(0, 100 - Math.floor((Date.now() - lastEvent.timestamp.getTime()) / (1000 * 60 * 60 * 24)))
      : 0;

    const frequencyScore = Math.min(100, totalEvents * 2);
    const webScore = Math.min(100, pageViews * 5);
    const portalScore = Math.min(100, loginEvents * 20);

    const overallScore = (recencyScore + frequencyScore + webScore + portalScore) / 4;

    await this.prisma.customerEngagementScore.upsert({
      where: { customerId },
      create: {
        customerId,
        overallScore,
        emailScore: 0,
        webScore,
        portalScore,
        recencyScore,
        frequencyScore,
        monetaryScore: 0,
      },
      update: {
        overallScore,
        webScore,
        portalScore,
        recencyScore,
        frequencyScore,
        computedAt: new Date(),
      },
    });
  }

  async computeLifetimeValue(customerId: string): Promise<void> {
    const customer = await this.prisma.customer.findUnique({
      where: { id: customerId },
    });

    if (!customer) return;

    const tenure = Math.floor(
      (Date.now() - customer.createdAt.getTime()) / (1000 * 60 * 60 * 24)
    );

    await this.prisma.customerLifetimeValue.upsert({
      where: { customerId },
      create: {
        customerId,
        currentValue: 0,
        predictedValue: 0,
        totalPurchases: 0,
        averagePurchaseValue: 0,
        purchaseFrequency: 0,
        customerTenure: tenure,
        churnProbability: 0,
      },
      update: {
        customerTenure: tenure,
        computedAt: new Date(),
      },
    });
  }
}
