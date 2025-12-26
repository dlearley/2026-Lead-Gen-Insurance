import { logger } from '@insurance-lead-gen/core';
import type {
  ReportType,
  ReportFormat,
  ReportFilters,
  ReportData,
  ReportSection,
} from '@insurance-lead-gen/types';
import { prisma } from '../prisma/client.js';

export class ReportGenerator {
  async generateReport(
    type: ReportType,
    filters: ReportFilters = {},
  ): Promise<ReportData> {
    logger.info('Generating report', { type, filters });

    const dateFrom = filters.dateFrom || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const dateTo = filters.dateTo || new Date();

    switch (type) {
      case 'lead_funnel':
        return this.generateLeadFunnelReport(dateFrom, dateTo, filters);
      case 'agent_performance':
        return this.generateAgentPerformanceReport(dateFrom, dateTo, filters);
      case 'ai_metrics':
        return this.generateAIMetricsReport(dateFrom, dateTo, filters);
      case 'system_health':
        return this.generateSystemHealthReport(dateFrom, dateTo, filters);
      case 'lead_volume':
        return this.generateLeadVolumeReport(dateFrom, dateTo, filters);
      case 'conversion_summary':
        return this.generateConversionSummaryReport(dateFrom, dateTo, filters);
      default:
        throw new Error(`Unsupported report type: ${type}`);
    }
  }

  private async generateLeadFunnelReport(
    dateFrom: Date,
    dateTo: Date,
    filters: ReportFilters,
  ): Promise<ReportData> {
    const leads = await prisma.lead.groupBy({
      by: ['status'],
      where: {
        createdAt: {
          gte: dateFrom,
          lte: dateTo,
        },
        ...(filters.insuranceType?.length && {
          insuranceType: { in: filters.insuranceType },
        }),
        ...(filters.leadSource?.length && {
          source: { in: filters.leadSource },
        }),
      },
      _count: true,
    });

    const funnelData = leads.map((item) => ({
      stage: item.status,
      count: item._count,
    }));

    const totalLeads = funnelData.reduce((sum, item) => sum + item.count, 0);

    return {
      title: 'Lead Funnel Report',
      generatedAt: new Date(),
      dateRange: { from: dateFrom, to: dateTo },
      summary: {
        totalLeads,
        stages: funnelData,
      },
      sections: [
        {
          title: 'Funnel Breakdown',
          description: 'Lead progression through funnel stages',
          data: funnelData,
          charts: [
            {
              type: 'bar',
              title: 'Leads by Stage',
              data: funnelData,
            },
          ],
        },
      ],
    };
  }

  private async generateAgentPerformanceReport(
    dateFrom: Date,
    dateTo: Date,
    filters: ReportFilters,
  ): Promise<ReportData> {
    const assignments = await prisma.leadAssignment.groupBy({
      by: ['agentId', 'status'],
      where: {
        assignedAt: {
          gte: dateFrom,
          lte: dateTo,
        },
        ...(filters.agentIds?.length && {
          agentId: { in: filters.agentIds },
        }),
      },
      _count: true,
    });

    const agentData = assignments.reduce(
      (acc, item) => {
        if (!acc[item.agentId]) {
          acc[item.agentId] = { agentId: item.agentId, total: 0, byStatus: {} };
        }
        acc[item.agentId].total += item._count;
        acc[item.agentId].byStatus[item.status] = item._count;
        return acc;
      },
      {} as Record<string, { agentId: string; total: number; byStatus: Record<string, number> }>,
    );

    const performanceData = Object.values(agentData);

    return {
      title: 'Agent Performance Report',
      generatedAt: new Date(),
      dateRange: { from: dateFrom, to: dateTo },
      summary: {
        totalAgents: performanceData.length,
        totalAssignments: performanceData.reduce((sum, item) => sum + item.total, 0),
      },
      sections: [
        {
          title: 'Agent Performance',
          description: 'Performance metrics by agent',
          data: performanceData,
          charts: [
            {
              type: 'table',
              title: 'Agent Statistics',
              data: performanceData,
            },
          ],
        },
      ],
    };
  }

  private async generateAIMetricsReport(
    dateFrom: Date,
    dateTo: Date,
    filters: ReportFilters,
  ): Promise<ReportData> {
    const leads = await prisma.lead.findMany({
      where: {
        createdAt: {
          gte: dateFrom,
          lte: dateTo,
        },
        qualityScore: { not: null },
      },
      select: {
        qualityScore: true,
        status: true,
        insuranceType: true,
      },
    });

    const avgScore = leads.reduce((sum, lead) => sum + (lead.qualityScore || 0), 0) / leads.length;
    const scoresByInsuranceType = leads.reduce(
      (acc, lead) => {
        const type = lead.insuranceType || 'unknown';
        if (!acc[type]) {
          acc[type] = { sum: 0, count: 0 };
        }
        acc[type].sum += lead.qualityScore || 0;
        acc[type].count++;
        return acc;
      },
      {} as Record<string, { sum: number; count: number }>,
    );

    const aiMetrics = Object.entries(scoresByInsuranceType).map(([type, data]) => ({
      insuranceType: type,
      averageScore: data.sum / data.count,
      count: data.count,
    }));

    return {
      title: 'AI Metrics Report',
      generatedAt: new Date(),
      dateRange: { from: dateFrom, to: dateTo },
      summary: {
        totalLeadsScored: leads.length,
        averageQualityScore: avgScore,
      },
      sections: [
        {
          title: 'AI Scoring Metrics',
          description: 'AI model performance and accuracy',
          data: aiMetrics,
          charts: [
            {
              type: 'bar',
              title: 'Average Score by Insurance Type',
              data: aiMetrics,
            },
          ],
        },
      ],
    };
  }

  private async generateSystemHealthReport(
    dateFrom: Date,
    dateTo: Date,
    filters: ReportFilters,
  ): Promise<ReportData> {
    const leadCount = await prisma.lead.count({
      where: {
        createdAt: {
          gte: dateFrom,
          lte: dateTo,
        },
      },
    });

    const assignmentCount = await prisma.leadAssignment.count({
      where: {
        assignedAt: {
          gte: dateFrom,
          lte: dateTo,
        },
      },
    });

    return {
      title: 'System Health Report',
      generatedAt: new Date(),
      dateRange: { from: dateFrom, to: dateTo },
      summary: {
        leadsProcessed: leadCount,
        assignmentsCreated: assignmentCount,
        systemStatus: 'healthy',
      },
      sections: [
        {
          title: 'System Metrics',
          description: 'Overall system health and performance',
          data: {
            leadsProcessed: leadCount,
            assignmentsCreated: assignmentCount,
          },
        },
      ],
    };
  }

  private async generateLeadVolumeReport(
    dateFrom: Date,
    dateTo: Date,
    filters: ReportFilters,
  ): Promise<ReportData> {
    const leads = await prisma.lead.groupBy({
      by: ['source', 'insuranceType'],
      where: {
        createdAt: {
          gte: dateFrom,
          lte: dateTo,
        },
        ...(filters.insuranceType?.length && {
          insuranceType: { in: filters.insuranceType },
        }),
        ...(filters.leadSource?.length && {
          source: { in: filters.leadSource },
        }),
      },
      _count: true,
    });

    const volumeData = leads.map((item) => ({
      source: item.source,
      insuranceType: item.insuranceType || 'unknown',
      count: item._count,
    }));

    const totalLeads = volumeData.reduce((sum, item) => sum + item.count, 0);

    return {
      title: 'Lead Volume Report',
      generatedAt: new Date(),
      dateRange: { from: dateFrom, to: dateTo },
      summary: {
        totalLeads,
        sourceCount: new Set(volumeData.map((item) => item.source)).size,
      },
      sections: [
        {
          title: 'Lead Volume by Source',
          description: 'Lead distribution across sources and insurance types',
          data: volumeData,
          charts: [
            {
              type: 'bar',
              title: 'Leads by Source',
              data: volumeData,
            },
          ],
        },
      ],
    };
  }

  private async generateConversionSummaryReport(
    dateFrom: Date,
    dateTo: Date,
    _filters: ReportFilters,
  ): Promise<ReportData> {
    const totalLeads = await prisma.lead.count({
      where: {
        createdAt: {
          gte: dateFrom,
          lte: dateTo,
        },
      },
    });

    const convertedLeads = await prisma.lead.count({
      where: {
        createdAt: {
          gte: dateFrom,
          lte: dateTo,
        },
        status: 'converted',
      },
    });

    const conversionRate = totalLeads > 0 ? (convertedLeads / totalLeads) * 100 : 0;

    const conversionsByType = await prisma.lead.groupBy({
      by: ['insuranceType'],
      where: {
        createdAt: {
          gte: dateFrom,
          lte: dateTo,
        },
        status: 'converted',
      },
      _count: true,
    });

    const conversionData = conversionsByType.map((item) => ({
      insuranceType: item.insuranceType || 'unknown',
      conversions: item._count,
    }));

    return {
      title: 'Conversion Summary Report',
      generatedAt: new Date(),
      dateRange: { from: dateFrom, to: dateTo },
      summary: {
        totalLeads,
        convertedLeads,
        conversionRate: conversionRate.toFixed(2) + '%',
      },
      sections: [
        {
          title: 'Conversion Metrics',
          description: 'Lead conversion performance',
          data: conversionData,
          charts: [
            {
              type: 'pie',
              title: 'Conversions by Insurance Type',
              data: conversionData,
            },
          ],
        },
      ],
    };
  }
}
