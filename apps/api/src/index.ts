import { logger } from '@insurance-lead-gen/core';
import { app } from './app.js';

const PORT = process.env.API_PORT || 3000;

const server = app.listen(PORT, () => {
  logger.info(`API service running on port ${PORT}`);
});

process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  server.close(() => {
    process.exit(0);
  });
});

export default app;