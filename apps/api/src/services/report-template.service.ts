import { PrismaClient, type RegulatoryReportTemplate } from '@prisma/client';
import { type TemplateFilters, type ValidationResult } from './regulatory-reporting.service-types.js';

export type TemplateData = Omit<
  RegulatoryReportTemplate,
  'id' | 'createdAt' | 'updatedAt'
>;

export class ReportTemplateService {
  constructor(private readonly prisma: PrismaClient) {}

  async getTemplate(jurisdiction: string, reportType: string): Promise<RegulatoryReportTemplate | null> {
    return this.prisma.regulatoryReportTemplate.findFirst({
      where: { jurisdiction, reportType, status: 'Active' },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async createTemplate(templateData: TemplateData): Promise<RegulatoryReportTemplate> {
    return this.prisma.regulatoryReportTemplate.create({ data: templateData });
  }

  async updateTemplate(templateId: string, updates: Partial<TemplateData>): Promise<RegulatoryReportTemplate> {
    return this.prisma.regulatoryReportTemplate.update({
      where: { id: templateId },
      data: updates,
    });
  }

  async validateReportAgainstTemplate(reportId: string): Promise<ValidationResult> {
    const report = await this.prisma.complianceReport.findUniqueOrThrow({ where: { id: reportId } });
    const template = await this.getTemplate(report.jurisdiction, report.reportType);

    if (!template) {
      return { valid: true, missingMetrics: [] };
    }

    const metrics = safeParseJson<Record<string, unknown>>(report.metrics) ?? {};
    const missingMetrics = template.requiredMetrics.filter((key) => !(key in metrics));

    return {
      valid: missingMetrics.length === 0,
      missingMetrics,
    };
  }

  async listTemplates(filters: TemplateFilters = {}): Promise<RegulatoryReportTemplate[]> {
    return this.prisma.regulatoryReportTemplate.findMany({
      where: {
        jurisdiction: filters.jurisdiction,
        reportType: filters.reportType,
        status: filters.status,
      },
      orderBy: { updatedAt: 'desc' },
    });
  }
}

function safeParseJson<T>(value: string): T | null {
  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}
