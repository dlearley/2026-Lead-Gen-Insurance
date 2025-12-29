import { PrismaClient, ReferralStatus } from '@prisma/client';
import { prisma } from '../prisma/client.js';

export class ReferralNetworkService {
  private prisma: PrismaClient;

  constructor() {
    this.prisma = prisma;
  }

  async createReferral(referrerId: string, data: {
    refereeId: string;
    leadId: string;
    reason: string;
    commissionPercentage?: number;
  }) {
    if (referrerId === data.refereeId) {
      throw new Error('Cannot refer to yourself');
    }

    return this.prisma.agentReferral.create({
      data: {
        referrerId,
        refereeId: data.refereeId,
        leadId: data.leadId,
        reason: data.reason,
        commissionPercentage: data.commissionPercentage ?? 10,
        status: ReferralStatus.PENDING,
      },
    });
  }

  async updateReferral(referralId: string, data: {
    status?: ReferralStatus;
    commissionAmount?: number;
  }) {
    return this.prisma.agentReferral.update({
      where: { id: referralId },
      data,
    });
  }

  async getReferral(referralId: string) {
    return this.prisma.agentReferral.findUnique({
      where: { id: referralId },
    });
  }

  async getReferralsByAgent(agentId: string, type: 'sent' | 'received' | 'all' = 'all') {
    const where: any = {};

    if (type === 'sent') {
      where.referrerId = agentId;
    } else if (type === 'received') {
      where.refereeId = agentId;
    } else {
      where.OR = [{ referrerId: agentId }, { refereeId: agentId }];
    }

    return this.prisma.agentReferral.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
  }

  async getReferralStats(agentId: string) {
    const [sent, received] = await Promise.all([
      this.prisma.agentReferral.findMany({ where: { referrerId: agentId } }),
      this.prisma.agentReferral.findMany({ where: { refereeId: agentId } }),
    ]);

    const totalReferrals = sent.length;
    const acceptedReferrals = sent.filter(r => r.status === ReferralStatus.ACCEPTED).length;
    const convertedReferrals = sent.filter(r => r.status === ReferralStatus.CONVERTED).length;

    const totalCommission = sent
      .filter(r => r.status === ReferralStatus.CONVERTED && r.commissionAmount)
      .reduce((sum, r) => sum + (r.commissionAmount || 0), 0);

    const pendingCommission = sent
      .filter(r => r.status === ReferralStatus.ACCEPTED)
      .reduce((sum, r) => sum + ((r.commissionAmount || 0) * (r.commissionPercentage / 100)), 0);

    const acceptanceRate = totalReferrals > 0 ? acceptedReferrals / totalReferrals : 0;
    const conversionRate = acceptedReferrals > 0 ? convertedReferrals / acceptedReferrals : 0;

    return {
      totalReferrals,
      acceptedReferrals,
      convertedReferrals,
      totalCommission,
      pendingCommission,
      acceptanceRate,
      conversionRate,
      receivedCount: received.length,
    };
  }

  async markCommissionPaid(referralId: string, commissionAmount: number) {
    return this.prisma.agentReferral.update({
      where: { id: referralId },
      data: {
        commissionAmount,
        paidAt: new Date(),
      },
    });
  }
}

export const referralNetworkService = new ReferralNetworkService();
