import { logger } from '@insurance-lead-gen/core';
import { initializeObservability, createOtelLogger } from '@insurance-lead-gen/core';
import { app } from './app.js';

// Initialize observability
const obs = initializeObservability({
  serviceName: 'api-service',
  serviceVersion: '1.0.0',
  environment: process.env.NODE_ENV || 'development',
  tracingEnabled: true,
  metricsEnabled: true,
});

// Create structured logger with trace context
const structuredLogger = createOtelLogger({
  serviceName: 'api-service',
  environment: process.env.NODE_ENV || 'development',
  level: process.env.LOG_LEVEL || 'info',
});

const PORT = process.env.API_PORT || 3000;

const server = app.listen(PORT, () => {
  structuredLogger.info(`API service running on port ${PORT}`);
  logger.info(`API service running on port ${PORT}`);
});

process.on('SIGTERM', async () => {
  structuredLogger.info('SIGTERM received, shutting down gracefully');
  logger.info('SIGTERM received, shutting down gracefully');
  
  // Shutdown observability
  await obs.shutdown();
  
  server.close(() => {
    process.exit(0);
  });
});

process.on('SIGINT', async () => {
  structuredLogger.info('SIGINT received, shutting down gracefully');
  logger.info('SIGINT received, shutting down gracefully');
  
  // Shutdown observability
  await obs.shutdown();
  
  server.close(() => {
    process.exit(0);
  });
});

export default app;