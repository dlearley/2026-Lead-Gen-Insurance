import { PrismaClient, type RegulatoryCommLog } from '@prisma/client';

export type CommunicationData = {
  commId?: string;
  regulatoryBody: string;
  jurisdiction: string;
  commType: string;
  subject: string;
  content: string;
  sentDate?: Date;
  sentBy: string;
  sentTo: string;
  deliveryProof?: string;
};

export type OutstandingIssue = {
  commId: string;
  regulatoryBody: string;
  jurisdiction: string;
  subject: string;
  sentDate: Date;
};

export class RegulatoryCommunicationService {
  constructor(private readonly prisma: PrismaClient) {}

  async logCommunication(comm: CommunicationData): Promise<RegulatoryCommLog> {
    return this.prisma.regulatoryCommLog.create({
      data: {
        commId: comm.commId ?? `COMM-${Date.now()}`,
        regulatoryBody: comm.regulatoryBody,
        jurisdiction: comm.jurisdiction,
        commType: comm.commType,
        subject: comm.subject,
        content: comm.content,
        sentDate: comm.sentDate ?? new Date(),
        sentBy: comm.sentBy,
        sentTo: comm.sentTo,
        deliveryProof: comm.deliveryProof,
      },
    });
  }

  async getCommunicationHistory(regulatoryBody: string, jurisdiction: string): Promise<RegulatoryCommLog[]> {
    return this.prisma.regulatoryCommLog.findMany({
      where: { regulatoryBody, jurisdiction },
      orderBy: { sentDate: 'desc' },
    });
  }

  async generateCommunicationReport(dateRange: { startDate: Date; endDate: Date }): Promise<{ count: number }> {
    const count = await this.prisma.regulatoryCommLog.count({
      where: {
        sentDate: { gte: dateRange.startDate, lt: dateRange.endDate },
      },
    });

    return { count };
  }

  async trackOutstandingIssues(): Promise<OutstandingIssue[]> {
    const logs = await this.prisma.regulatoryCommLog.findMany({
      where: { responseReceived: false },
      orderBy: { sentDate: 'asc' },
    });

    return logs.map((l) => ({
      commId: l.commId,
      regulatoryBody: l.regulatoryBody,
      jurisdiction: l.jurisdiction,
      subject: l.subject,
      sentDate: l.sentDate,
    }));
  }
}
