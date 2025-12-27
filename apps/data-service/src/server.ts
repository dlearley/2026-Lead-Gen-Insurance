import express, { Request, Response } from 'express';
import type { Express } from 'express';
import { logger } from '@insurance-lead-gen/core';
import { getConfig } from '@insurance-lead-gen/config';
import { reportsRouter } from './routes/reports.routes.js';
import { alertsRouter } from './routes/alerts.routes.js';
import carriersRouter from './routes/carriers.routes.js';
import brokersRouter from './routes/brokers.routes.js';
import integrationConfigsRouter from './routes/integration-configs.routes.js';
import integrationLogsRouter from './routes/integration-logs.routes.js';
import { AlertService } from './services/alert-service.js';

const config = getConfig();
const PORT = config.ports.dataService || 3001;

const app: Express = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');

  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }

  next();
});

app.use((req, res, next) => {
  logger.debug('Incoming request', {
    method: req.method,
    path: req.path,
    query: req.query,
  });
  next();
});

app.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    service: 'data-service',
    timestamp: new Date().toISOString(),
  });
});

app.use('/api/v1/reports', reportsRouter);
app.use('/api/v1/alerts', alertsRouter);
app.use('/api/v1/carriers', carriersRouter);
app.use('/api/v1/brokers', brokersRouter);
app.use('/api/v1/integration-configs', integrationConfigsRouter);
app.use('/api/v1/integration-logs', integrationLogsRouter);

app.use((err: Error, req: Request, res: Response, next: express.NextFunction) => {
  logger.error('Unhandled error', { error: err, path: req.path });
  res.status(500).json({
    success: false,
    error: 'Internal server error',
  });
});

const alertService = new AlertService();
const alertCheckInterval = setInterval(async () => {
  try {
    await alertService.checkMetrics();
  } catch (error) {
    logger.error('Alert check failed', { error });
  }
}, 5 * 60 * 1000);

export function startServer(): Promise<void> {
  return new Promise((resolve) => {
    app.listen(PORT, () => {
      logger.info('Data service HTTP server started', { port: PORT });
      resolve();
    });
  });
}

export function stopServer(): void {
  clearInterval(alertCheckInterval);
  logger.info('Data service HTTP server stopped');
}

export { app };
