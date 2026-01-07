/**
 * Phase 30: Partner Ecosystem & Integrations
 * Billing Service - Handles usage tracking, invoicing, and revenue sharing
 */

import { PrismaClient } from '@prisma/client';
import type {
  PartnerPricing,
  PartnerInvoice,
  PartnerPayout,
  PricingModel,
  InvoiceStatus,
  PayoutStatus,
} from '@insurance-platform/types';

export class BillingService {
  constructor(private prisma: PrismaClient) {}

  /**
   * Set partner pricing
   */
  async setPricing(
    partnerId: string,
    pricing: {
      pricingModel: PricingModel;
      revenueSharePercentage?: number;
      flatFeeMonthly?: number;
      flatFeeAnnual?: number;
      usageTiers?: Array<{
        minUsage: number;
        maxUsage?: number;
        pricePerUnit: number;
      }>;
      currency?: string;
      effectiveDate: Date;
      expirationDate?: Date;
    }
  ): Promise<PartnerPricing> {
    const partnerPricing = await this.prisma.partnerPricing.create({
      data: {
        partnerId,
        pricingModel: pricing.pricingModel,
        revenueSharePercentage: pricing.revenueSharePercentage,
        flatFeeMonthly: pricing.flatFeeMonthly,
        flatFeeAnnual: pricing.flatFeeAnnual,
        usageTiers: pricing.usageTiers || [],
        currency: pricing.currency || 'USD',
        effectiveDate: pricing.effectiveDate,
        expirationDate: pricing.expirationDate,
      },
    });

    return partnerPricing as PartnerPricing;
  }

  /**
   * Get current pricing for partner
   */
  async getCurrentPricing(partnerId: string): Promise<PartnerPricing | null> {
    const now = new Date();
    const pricing = await this.prisma.partnerPricing.findFirst({
      where: {
        partnerId,
        effectiveDate: { lte: now },
        OR: [
          { expirationDate: null },
          { expirationDate: { gte: now } },
        ],
      },
      orderBy: { effectiveDate: 'desc' },
    });

    return pricing as PartnerPricing | null;
  }

  /**
   * Track usage metric
   */
  async trackUsage(
    partnerId: string,
    appId: string | undefined,
    metricName: string,
    metricValue: number,
    unit: string
  ): Promise<void> {
    const usageDate = new Date();

    await this.prisma.partnerUsage.create({
      data: {
        partnerId,
        appId,
        usageDate,
        metricName,
        metricValue: BigInt(metricValue),
        unit,
      },
    });
  }

  /**
   * Get usage summary for period
   */
  async getUsageSummary(
    partnerId: string,
    startDate: Date,
    endDate: Date,
    appId?: string
  ): Promise<{
    totalApiCalls: bigint;
    totalDataProcessed: bigint;
    metrics: Array<{ metricName: string; total: bigint; unit: string }>;
  }> {
    const where: any = {
      partnerId,
      usageDate: {
        gte: startDate,
        lte: endDate,
      },
    };

    if (appId) {
      where.appId = appId;
    }

    const usage = await this.prisma.partnerUsage.findMany({
      where,
    });

    // Aggregate by metric
    const metricsMap = new Map<string, { total: bigint; unit: string }>();

    usage.forEach((record) => {
      const key = record.metricName;
      const existing = metricsMap.get(key);

      if (existing) {
        existing.total += record.metricValue;
      } else {
        metricsMap.set(key, {
          total: record.metricValue,
          unit: record.unit,
        });
      }
    });

    return {
      totalApiCalls: metricsMap.get('api_calls')?.total || BigInt(0),
      totalDataProcessed: metricsMap.get('data_processed')?.total || BigInt(0),
      metrics: Array.from(metricsMap.entries()).map(([metricName, data]) => ({
        metricName,
        total: data.total,
        unit: data.unit,
      })),
    };
  }

  /**
   * Generate invoice for partner
   */
  async generateInvoice(
    partnerId: string,
    billingPeriodStart: Date,
    billingPeriodEnd: Date
  ): Promise<PartnerInvoice> {
    const pricing = await this.getCurrentPricing(partnerId);

    if (!pricing) {
      throw new Error('No pricing configuration found for partner');
    }

    const usage = await this.getUsageSummary(
      partnerId,
      billingPeriodStart,
      billingPeriodEnd
    );

    let subtotal = 0;

    // Calculate based on pricing model
    switch (pricing.pricingModel) {
      case 'FLAT_FEE':
        // Determine if monthly or annual
        const monthsDiff = this.getMonthsDifference(billingPeriodStart, billingPeriodEnd);
        if (monthsDiff >= 11) {
          subtotal = pricing.flatFeeAnnual || 0;
        } else {
          subtotal = (pricing.flatFeeMonthly || 0) * monthsDiff;
        }
        break;

      case 'USAGE_BASED':
        // Calculate based on usage tiers
        const apiCalls = Number(usage.totalApiCalls);
        subtotal = this.calculateUsageBasedCost(apiCalls, pricing.usageTiers as any);
        break;

      case 'HYBRID':
        // Flat fee + usage
        subtotal = pricing.flatFeeMonthly || 0;
        const extraCalls = Number(usage.totalApiCalls);
        subtotal += this.calculateUsageBasedCost(extraCalls, pricing.usageTiers as any);
        break;

      case 'REVENUE_SHARE':
        // This is calculated in payouts, not invoices
        subtotal = 0;
        break;
    }

    const taxes = subtotal * 0.08; // 8% tax (simplified)
    const totalAmount = subtotal + taxes;

    // Set due date to 30 days from end of billing period
    const dueDate = new Date(billingPeriodEnd);
    dueDate.setDate(dueDate.getDate() + 30);

    const invoice = await this.prisma.partnerInvoice.create({
      data: {
        partnerId,
        billingPeriodStart,
        billingPeriodEnd,
        usage: usage.metrics.map((m) => ({
          metricName: m.metricName,
          total: m.total.toString(),
          unit: m.unit,
        })),
        subtotal,
        taxes,
        totalAmount,
        status: 'DRAFT',
        dueDate,
      },
    });

    return invoice as PartnerInvoice;
  }

  /**
   * Send invoice to partner
   */
  async sendInvoice(invoiceId: string): Promise<PartnerInvoice> {
    const invoice = await this.prisma.partnerInvoice.update({
      where: { id: invoiceId },
      data: {
        status: 'SENT',
      },
    });

    // TODO: Send email to partner with invoice

    return invoice as PartnerInvoice;
  }

  /**
   * Mark invoice as paid
   */
  async markInvoicePaid(
    invoiceId: string,
    paymentDate: Date
  ): Promise<PartnerInvoice> {
    const invoice = await this.prisma.partnerInvoice.update({
      where: { id: invoiceId },
      data: {
        status: 'PAID',
        paymentDate,
      },
    });

    return invoice as PartnerInvoice;
  }

  /**
   * Get partner invoices
   */
  async getInvoices(
    partnerId: string,
    filters?: {
      status?: InvoiceStatus;
      startDate?: Date;
      endDate?: Date;
      limit?: number;
    }
  ): Promise<PartnerInvoice[]> {
    const where: any = { partnerId };

    if (filters?.status) {
      where.status = filters.status;
    }

    if (filters?.startDate || filters?.endDate) {
      where.billingPeriodStart = {};
      if (filters.startDate) where.billingPeriodStart.gte = filters.startDate;
      if (filters.endDate) where.billingPeriodStart.lte = filters.endDate;
    }

    const invoices = await this.prisma.partnerInvoice.findMany({
      where,
      orderBy: { billingPeriodStart: 'desc' },
      take: filters?.limit || 50,
    });

    return invoices as PartnerInvoice[];
  }

  /**
   * Generate payout for partner (for revenue share model)
   */
  async generatePayout(
    partnerId: string,
    payoutPeriodStart: Date,
    payoutPeriodEnd: Date,
    totalRevenue: number
  ): Promise<PartnerPayout> {
    const pricing = await this.getCurrentPricing(partnerId);

    if (!pricing) {
      throw new Error('No pricing configuration found for partner');
    }

    if (
      pricing.pricingModel !== 'REVENUE_SHARE' &&
      pricing.pricingModel !== 'HYBRID'
    ) {
      throw new Error('Revenue share is not enabled for this partner');
    }

    const revenueSharePercentage = pricing.revenueSharePercentage || 0;
    const revenueShareAmount = (totalRevenue * revenueSharePercentage) / 100;

    // Apply any deductions (fees, adjustments, etc.)
    const deductions = 0; // TODO: Calculate deductions

    const netPayout = revenueShareAmount - deductions;

    const payout = await this.prisma.partnerPayout.create({
      data: {
        partnerId,
        payoutPeriodStart,
        payoutPeriodEnd,
        totalRevenue,
        revenueShareAmount,
        deductions,
        netPayout,
        status: 'PENDING',
      },
    });

    return payout as PartnerPayout;
  }

  /**
   * Process payout
   */
  async processPayout(
    payoutId: string,
    paymentMethodId: string
  ): Promise<PartnerPayout> {
    const payout = await this.prisma.partnerPayout.update({
      where: { id: payoutId },
      data: {
        status: 'PROCESSING',
        paymentMethodId,
      },
    });

    // TODO: Integrate with payment processor
    // For now, mark as completed
    await new Promise((resolve) => setTimeout(resolve, 1000));

    const completed = await this.prisma.partnerPayout.update({
      where: { id: payoutId },
      data: {
        status: 'COMPLETED',
        paidDate: new Date(),
      },
    });

    return completed as PartnerPayout;
  }

  /**
   * Get partner payouts
   */
  async getPayouts(
    partnerId: string,
    filters?: {
      status?: PayoutStatus;
      startDate?: Date;
      endDate?: Date;
      limit?: number;
    }
  ): Promise<PartnerPayout[]> {
    const where: any = { partnerId };

    if (filters?.status) {
      where.status = filters.status;
    }

    if (filters?.startDate || filters?.endDate) {
      where.payoutPeriodStart = {};
      if (filters.startDate) where.payoutPeriodStart.gte = filters.startDate;
      if (filters.endDate) where.payoutPeriodStart.lte = filters.endDate;
    }

    const payouts = await this.prisma.partnerPayout.findMany({
      where,
      orderBy: { payoutPeriodStart: 'desc' },
      take: filters?.limit || 50,
    });

    return payouts as PartnerPayout[];
  }

  /**
   * Get revenue forecast for partner
   */
  async getRevenueForecast(
    partnerId: string,
    forecastMonths: number = 3
  ): Promise<{
    estimatedRevenue: number;
    breakdown: Array<{ month: string; estimated: number }>;
  }> {
    // Get historical data
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

    const historicalInvoices = await this.prisma.partnerInvoice.findMany({
      where: {
        partnerId,
        status: 'PAID',
        billingPeriodStart: { gte: threeMonthsAgo },
      },
      orderBy: { billingPeriodStart: 'desc' },
    });

    if (historicalInvoices.length === 0) {
      return {
        estimatedRevenue: 0,
        breakdown: [],
      };
    }

    // Calculate average monthly revenue
    const avgMonthlyRevenue =
      historicalInvoices.reduce((sum, inv) => sum + inv.totalAmount, 0) /
      historicalInvoices.length;

    // Generate forecast
    const breakdown: Array<{ month: string; estimated: number }> = [];
    let totalEstimated = 0;

    for (let i = 0; i < forecastMonths; i++) {
      const forecastDate = new Date();
      forecastDate.setMonth(forecastDate.getMonth() + i + 1);
      const monthStr = forecastDate.toISOString().substring(0, 7);

      breakdown.push({
        month: monthStr,
        estimated: avgMonthlyRevenue,
      });

      totalEstimated += avgMonthlyRevenue;
    }

    return {
      estimatedRevenue: totalEstimated,
      breakdown,
    };
  }

  /**
   * Calculate usage-based cost using tiers
   */
  private calculateUsageBasedCost(
    usage: number,
    tiers: Array<{ minUsage: number; maxUsage?: number; pricePerUnit: number }>
  ): number {
    let cost = 0;
    let remainingUsage = usage;

    // Sort tiers by minUsage
    const sortedTiers = [...tiers].sort((a, b) => a.minUsage - b.minUsage);

    for (const tier of sortedTiers) {
      if (remainingUsage <= 0) break;

      const tierUsage = tier.maxUsage
        ? Math.min(remainingUsage, tier.maxUsage - tier.minUsage)
        : remainingUsage;

      cost += tierUsage * tier.pricePerUnit;
      remainingUsage -= tierUsage;
    }

    return cost;
  }

  /**
   * Calculate months difference between two dates
   */
  private getMonthsDifference(start: Date, end: Date): number {
    return (
      (end.getFullYear() - start.getFullYear()) * 12 +
      (end.getMonth() - start.getMonth()) +
      1
    );
  }
}
