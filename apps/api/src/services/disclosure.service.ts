import { RequiredDisclosure, DisclosureDelivery } from '@prisma/client';
import { prisma } from '../infra/prisma.js';

export class DisclosureService {
  /**
   * Gets required disclosures for a state and product type
   */
  async getRequiredDisclosures(state: string, productType: string): Promise<RequiredDisclosure[]> {
    return prisma.requiredDisclosure.findMany({
      where: {
        productType,
        OR: [
          { jurisdiction: state },
          { jurisdiction: 'Federal' }
        ],
        status: 'Active',
      },
    });
  }

  /**
   * Creates a new disclosure template
   */
  async createDisclosure(disclosureData: any): Promise<RequiredDisclosure> {
    return prisma.requiredDisclosure.create({
      data: {
        jurisdiction: disclosureData.jurisdiction,
        productType: disclosureData.productType,
        disclosureType: disclosureData.disclosureType,
        disclosureText: disclosureData.disclosureText,
        format: disclosureData.format,
        timing: disclosureData.timing,
        isRequired: disclosureData.isRequired ?? true,
        isSensitive: disclosureData.isSensitive ?? false,
        effectiveDate: disclosureData.effectiveDate || new Date(),
        status: 'Active',
      },
    });
  }

  /**
   * Gets the text for a specific disclosure
   */
  async getDisclosureText(jurisdiction: string, productType: string, disclosureType: string): Promise<string | null> {
    const disclosure = await prisma.requiredDisclosure.findUnique({
      where: {
        jurisdiction_productType_disclosureType: {
          jurisdiction,
          productType,
          disclosureType,
        },
      },
    });

    return disclosure?.disclosureText || null;
  }

  /**
   * Delivers a disclosure to a lead
   */
  async deliverDisclosure(leadId: string, disclosureId: string, method: string): Promise<DisclosureDelivery> {
    const disclosure = await prisma.requiredDisclosure.findUnique({
      where: { id: disclosureId },
    });

    if (!disclosure) throw new Error("Disclosure not found");

    return prisma.disclosureDelivery.create({
      data: {
        leadId,
        disclosureId,
        disclosureType: disclosure.disclosureType,
        productType: disclosure.productType,
        state: disclosure.jurisdiction,
        deliveryMethod: method,
        deliveryDate: new Date(),
      },
    });
  }

  /**
   * Tracks the delivery status of a disclosure
   */
  async trackDisclosureDelivery(disclosureId: string, leadId: string): Promise<any> {
    const delivery = await prisma.disclosureDelivery.findFirst({
      where: { disclosureId, leadId },
      orderBy: { deliveryDate: 'desc' },
    });

    return delivery;
  }

  /**
   * Requests acknowledgment of a disclosure from a lead
   */
  async requestDisclosureAcknowledgment(leadId: string, disclosureId: string): Promise<void> {
    // This would typically send an email or notification
    console.log(`Requesting acknowledgment for lead ${leadId} and disclosure ${disclosureId}`);
  }

  /**
   * Acknowledges a disclosure
   */
  async acknowledgeDisclosure(leadId: string, disclosureId: string): Promise<void> {
    await prisma.disclosureDelivery.updateMany({
      where: { leadId, disclosureId },
      data: {
        acknowledged: true,
        acknowledgmentDate: new Date(),
      },
    });
  }

  /**
   * Generates a report on disclosure compliance
   */
  async generateDisclosureReport(startDate: Date, endDate: Date): Promise<any> {
    const totalDeliveries = await prisma.disclosureDelivery.count({
      where: {
        deliveryDate: { gte: startDate, lte: endDate },
      },
    });

    const acknowledgedDeliveries = await prisma.disclosureDelivery.count({
      where: {
        deliveryDate: { gte: startDate, lte: endDate },
        acknowledged: true,
      },
    });

    return {
      period: { start: startDate, end: endDate },
      totalDeliveries,
      acknowledgedDeliveries,
      complianceRate: totalDeliveries > 0 ? (acknowledgedDeliveries / totalDeliveries) * 100 : 100,
    };
  }

  /**
   * Validates if all required disclosures have been delivered and acknowledged
   */
  async validateDisclosureCompliance(leadId: string, state: string, productType: string): Promise<boolean> {
    const required = await this.getRequiredDisclosures(state, productType);
    
    for (const disc of required) {
      const delivery = await prisma.disclosureDelivery.findFirst({
        where: {
          leadId,
          disclosureId: disc.id,
          acknowledged: disc.isRequired ? true : undefined,
        },
      });

      if (disc.isRequired && (!delivery || !delivery.acknowledged)) {
        return false;
      }
    }

    return true;
  }
}
