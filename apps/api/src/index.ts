import express, { Express } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import { logger } from '@insurance-lead-gen/core';
import type { Lead } from '@insurance-lead-gen/types';

const app: Express = express();
const PORT = process.env.API_PORT ?? 3000;

app.use(helmet());
app.use(cors());
app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.post('/api/v1/leads', (req, res) => {
  try {
    const leadData: Partial<Lead> = req.body;
    logger.info('Received lead', { lead: leadData });

    // TODO: Implement lead creation logic
    res.status(201).json({
      id: 'lead_' + Date.now(),
      status: 'received',
      message: 'Lead ingested successfully',
    });
  } catch (error) {
    logger.error('Error creating lead', { error });
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/v1/leads/:id', (req, res) => {
  try {
    const { id } = req.params;
    logger.info('Fetching lead', { leadId: id });

    // TODO: Implement lead retrieval logic
    res.json({
      id,
      status: 'processing',
      message: 'Lead found',
    });
  } catch (error) {
    logger.error('Error fetching lead', { error });
    res.status(500).json({ error: 'Internal server error' });
  }
});

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
