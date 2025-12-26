import { Router, Request, Response } from 'express';
import type { Router as RouterType } from 'express';
import { logger } from '@insurance-lead-gen/core';
import type {
  ReportConfig,
  CreateReportConfigDto,
  UpdateReportConfigDto,
  GenerateReportDto,
  ReportType,
  ReportFormat,
  ReportSchedule,
} from '@insurance-lead-gen/types';
import { ReportScheduler } from '../services/report-scheduler.js';
import { ReportGenerator } from '../services/report-generator.js';
import { ReportExporter } from '../services/report-exporter.js';

const router: RouterType = Router();
const reportScheduler = new ReportScheduler();
const reportGenerator = new ReportGenerator();
const reportExporter = new ReportExporter();

router.post('/configs', async (req: Request, res: Response) => {
  try {
    const dto = req.body as CreateReportConfigDto;

    const config: ReportConfig = {
      id: `config-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name: dto.name,
      description: dto.description,
      type: dto.type,
      format: dto.format,
      schedule: dto.schedule,
      scheduleTime: dto.scheduleTime,
      enabled: dto.enabled ?? true,
      filters: dto.filters,
      recipients: dto.recipients,
      createdBy: 'user-id',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    reportScheduler.addReportConfig(config);

    res.status(201).json({
      success: true,
      data: config,
    });
  } catch (error) {
    logger.error('Failed to create report config', { error });
    res.status(500).json({
      success: false,
      error: 'Failed to create report configuration',
    });
  }
});

router.get('/configs', async (req: Request, res: Response) => {
  try {
    const configs = reportScheduler.getAllReportConfigs();

    res.json({
      success: true,
      data: configs,
      count: configs.length,
    });
  } catch (error) {
    logger.error('Failed to fetch report configs', { error });
    res.status(500).json({
      success: false,
      error: 'Failed to fetch report configurations',
    });
  }
});

router.get('/configs/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const config = reportScheduler.getReportConfig(id);

    if (!config) {
      return res.status(404).json({
        success: false,
        error: 'Report configuration not found',
      });
    }

    res.json({
      success: true,
      data: config,
    });
  } catch (error) {
    logger.error('Failed to fetch report config', { error });
    res.status(500).json({
      success: false,
      error: 'Failed to fetch report configuration',
    });
  }
});

router.put('/configs/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updates = req.body as UpdateReportConfigDto;

    reportScheduler.updateReportConfig(id, updates as Partial<ReportConfig>);

    const updatedConfig = reportScheduler.getReportConfig(id);

    res.json({
      success: true,
      data: updatedConfig,
    });
  } catch (error) {
    logger.error('Failed to update report config', { error });
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update report configuration',
    });
  }
});

router.delete('/configs/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    reportScheduler.removeReportConfig(id);

    res.json({
      success: true,
      message: 'Report configuration deleted',
    });
  } catch (error) {
    logger.error('Failed to delete report config', { error });
    res.status(500).json({
      success: false,
      error: 'Failed to delete report configuration',
    });
  }
});

router.post('/generate', async (req: Request, res: Response) => {
  try {
    const dto = req.body as GenerateReportDto;

    if (dto.configId) {
      const generation = await reportScheduler.generateReport(dto.configId);
      return res.json({
        success: true,
        data: generation,
      });
    }

    const reportData = await reportGenerator.generateReport(dto.type, dto.filters || {});

    const buffer = await reportExporter.export(reportData, dto.format);

    res.set('Content-Type', getContentType(dto.format));
    res.set(
      'Content-Disposition',
      `attachment; filename="report-${Date.now()}.${getFileExtension(dto.format)}"`,
    );
    res.send(buffer);
  } catch (error) {
    logger.error('Failed to generate report', { error });
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to generate report',
    });
  }
});

router.get('/scheduled', async (req: Request, res: Response) => {
  try {
    const scheduled = reportScheduler.getScheduledReports();

    res.json({
      success: true,
      data: scheduled,
      count: scheduled.length,
    });
  } catch (error) {
    logger.error('Failed to fetch scheduled reports', { error });
    res.status(500).json({
      success: false,
      error: 'Failed to fetch scheduled reports',
    });
  }
});

router.post('/configs/:id/run', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const generation = await reportScheduler.generateReport(id);

    res.json({
      success: true,
      data: generation,
    });
  } catch (error) {
    logger.error('Failed to run report', { error });
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to run report',
    });
  }
});

function getContentType(format: ReportFormat): string {
  switch (format) {
    case 'json':
      return 'application/json';
    case 'csv':
      return 'text/csv';
    case 'pdf':
      return 'text/html';
    default:
      return 'application/octet-stream';
  }
}

function getFileExtension(format: ReportFormat): string {
  switch (format) {
    case 'json':
      return 'json';
    case 'csv':
      return 'csv';
    case 'pdf':
      return 'html';
    default:
      return 'txt';
  }
}

export { router as reportsRouter };
