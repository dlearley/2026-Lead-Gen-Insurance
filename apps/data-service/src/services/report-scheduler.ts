import { logger } from '@insurance-lead-gen/core';
import type {
  ReportConfig,
  ReportSchedule,
  ReportGeneration,
} from '@insurance-lead-gen/types';
import { ReportGenerator } from './report-generator.js';
import { ReportExporter } from './report-exporter.js';
import { promises as fs } from 'fs';
import path from 'path';

export class ReportScheduler {
  private readonly reportConfigs: Map<string, ReportConfig> = new Map();
  private readonly scheduledJobs: Map<string, NodeJS.Timeout> = new Map();
  private readonly reportGenerator: ReportGenerator;
  private readonly reportExporter: ReportExporter;
  private readonly reportsDir: string;

  constructor(reportsDir: string = './reports') {
    this.reportGenerator = new ReportGenerator();
    this.reportExporter = new ReportExporter();
    this.reportsDir = reportsDir;
    this.ensureReportsDirectory();
  }

  private async ensureReportsDirectory(): Promise<void> {
    try {
      await fs.mkdir(this.reportsDir, { recursive: true });
    } catch (error: unknown) {
      logger.error('Failed to create reports directory', { error });
    }
  }

  addReportConfig(config: ReportConfig): void {
    this.reportConfigs.set(config.id, config);

    if (config.enabled && config.schedule !== 'once') {
      this.scheduleReport(config);
    }

    logger.info('Report configuration added', { id: config.id, name: config.name });
  }

  removeReportConfig(configId: string): void {
    const job = this.scheduledJobs.get(configId);
    if (job) {
      clearInterval(job);
      this.scheduledJobs.delete(configId);
    }
    this.reportConfigs.delete(configId);
    logger.info('Report configuration removed', { id: configId });
  }

  updateReportConfig(configId: string, updates: Partial<ReportConfig>): void {
    const config = this.reportConfigs.get(configId);
    if (!config) {
      throw new Error(`Report configuration ${configId} not found`);
    }

    const updatedConfig = { ...config, ...updates, updatedAt: new Date() };
    this.reportConfigs.set(configId, updatedConfig);

    const job = this.scheduledJobs.get(configId);
    if (job) {
      clearInterval(job);
      this.scheduledJobs.delete(configId);
    }

    if (updatedConfig.enabled && updatedConfig.schedule !== 'once') {
      this.scheduleReport(updatedConfig);
    }

    logger.info('Report configuration updated', { id: configId });
  }

  private scheduleReport(config: ReportConfig): void {
    const interval = this.getScheduleInterval(config.schedule);
    if (!interval) return;

    const job = setInterval(() => {
      void this.executeReport(config);
    }, interval);

    this.scheduledJobs.set(config.id, job);

    const nextRun = new Date(Date.now() + interval);
    config.nextRunAt = nextRun;

    logger.info('Report scheduled', {
      id: config.id,
      schedule: config.schedule,
      nextRun: nextRun.toISOString(),
    });
  }

  private getScheduleInterval(schedule: ReportSchedule): number | null {
    switch (schedule) {
      case 'daily':
        return 24 * 60 * 60 * 1000;
      case 'weekly':
        return 7 * 24 * 60 * 60 * 1000;
      case 'monthly':
        return 30 * 24 * 60 * 60 * 1000;
      case 'once':
      default:
        return null;
    }
  }

  async generateReport(configId: string): Promise<ReportGeneration> {
    const config = this.reportConfigs.get(configId);
    if (!config) {
      throw new Error(`Report configuration ${configId} not found`);
    }

    return this.executeReport(config);
  }

  private async executeReport(config: ReportConfig): Promise<ReportGeneration> {
    const generation: ReportGeneration = {
      id: `gen-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      configId: config.id,
      status: 'generating',
      format: config.format,
      startedAt: new Date(),
    };

    logger.info('Starting report generation', {
      id: generation.id,
      config: config.name,
      type: config.type,
    });

    try {
      const reportData = await this.reportGenerator.generateReport(
        config.type,
        config.filters || {},
      );

      const buffer = await this.reportExporter.export(reportData, config.format);

      const fileName = this.generateFileName(config, generation.id);
      const filePath = path.join(this.reportsDir, fileName);

      await fs.writeFile(filePath, buffer);

      generation.status = 'completed';
      generation.completedAt = new Date();
      generation.fileUrl = filePath;
      generation.fileSize = buffer.length;

      config.lastRunAt = new Date();

      logger.info('Report generation completed', {
        id: generation.id,
        fileSize: generation.fileSize,
        duration: generation.completedAt.getTime() - generation.startedAt.getTime(),
      });

      if (config.recipients && config.recipients.length > 0) {
        this.sendReport(config);
      }
    } catch (error: unknown) {
      generation.status = 'failed';
      generation.completedAt = new Date();
      generation.error = error instanceof Error ? error.message : 'Unknown error';

      logger.error('Report generation failed', {
        id: generation.id,
        error: generation.error,
      });
    }

    return generation;
  }

  private generateFileName(config: ReportConfig, generationId: string): string {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const ext = config.format === 'pdf' ? 'html' : config.format;
    return `${config.name.toLowerCase().replace(/\s+/g, '-')}-${timestamp}-${generationId}.${ext}`;
  }

  private sendReport(config: ReportConfig): void {
    logger.info('Sending report to recipients', {
      config: config.name,
      recipients: config.recipients,
    });
  }

  getReportConfig(configId: string): ReportConfig | undefined {
    return this.reportConfigs.get(configId);
  }

  getAllReportConfigs(): ReportConfig[] {
    return Array.from(this.reportConfigs.values());
  }

  getScheduledReports(): Array<{ configId: string; nextRun: Date | undefined }> {
    return Array.from(this.reportConfigs.values())
      .filter((config) => config.enabled && config.schedule !== 'once')
      .map((config) => ({
        configId: config.id,
        nextRun: config.nextRunAt,
      }));
  }

  stop(): void {
    for (const job of this.scheduledJobs.values()) {
      clearInterval(job);
    }
    this.scheduledJobs.clear();
    logger.info('Report scheduler stopped');
  }
}
