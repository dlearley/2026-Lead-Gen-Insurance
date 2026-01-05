import { PrismaClient } from '@prisma/client';

export type TrendAnalysis = {
  metricType: string;
  points: Array<{ period: string; value: number }>;
};

export type Comparison = {
  reportType: string;
  period1: string;
  period2: string;
  diff: Record<string, number>;
};

export type Insight = {
  title: string;
  description: string;
};

export type Forecast = {
  metricType: string;
  forecast: Array<{ period: string; value: number }>;
};

export class ReportAnalyticsService {
  constructor(private readonly prisma: PrismaClient) {}

  async analyzeMetricsTrend(metricType: string, periods: string[]): Promise<TrendAnalysis> {
    const reports = await this.prisma.complianceReportMetrics.findMany({
      where: { metricType },
      orderBy: { createdAt: 'asc' },
    });

    const points = periods.map((p) => {
      const match = reports.find((r) => r.trend === p);
      const value = match ? safeParseNumber(match.data) : 0;
      return { period: p, value };
    });

    return { metricType, points };
  }

  async comparePeriodsData(reportType: string, period1: string, period2: string): Promise<Comparison> {
    const [r1, r2] = await Promise.all([
      this.prisma.complianceReport.findFirst({ where: { reportType, reportPeriod: period1 } }),
      this.prisma.complianceReport.findFirst({ where: { reportType, reportPeriod: period2 } }),
    ]);

    const m1 = safeParseJson<Record<string, number>>(r1?.metrics ?? '{}') ?? {};
    const m2 = safeParseJson<Record<string, number>>(r2?.metrics ?? '{}') ?? {};

    const keys = new Set([...Object.keys(m1), ...Object.keys(m2)]);
    const diff: Record<string, number> = {};
    for (const k of keys) {
      diff[k] = (m2[k] ?? 0) - (m1[k] ?? 0);
    }

    return { reportType, period1, period2, diff };
  }

  async generateInsights(reportType: string, jurisdiction: string): Promise<Insight[]> {
    const latest = await this.prisma.complianceReport.findFirst({
      where: { reportType, jurisdiction },
      orderBy: { generatedDate: 'desc' },
    });

    if (!latest) return [];

    const violations = latest.violations;
    return violations > 0
      ? [
          {
            title: 'Potential compliance risk',
            description: `Detected ${violations} violation-related signals in the reporting period.`,
          },
        ]
      : [
          {
            title: 'Stable compliance posture',
            description: 'No violation signals detected in the latest reporting period.',
          },
        ];
  }

  async forecastMetrics(metricType: string, periods: string[]): Promise<Forecast> {
    const trend = await this.analyzeMetricsTrend(metricType, periods);
    const last = trend.points[trend.points.length - 1]?.value ?? 0;

    return {
      metricType,
      forecast: periods.map((p, idx) => ({ period: p, value: last + idx })),
    };
  }
}

function safeParseJson<T>(value: string): T | null {
  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}

function safeParseNumber(value: string): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}
