import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import { config } from '@insurance-lead-gen/config';
import { logger } from '@insurance-lead-gen/core';
import type { Lead } from '@insurance-lead-gen/types';
import { NATSConnection } from './nats.js';
import { validateLead } from './validation.js';
import { rateLimiter } from './middleware/rate-limiter.js';
import { authMiddleware } from './middleware/auth.js';

const app = express();
const PORT = process.env.API_PORT || 3000;

// Initialize NATS connection
const natsConnection = new NATSConnection();

app.use(helmet());
app.use(cors());
app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Apply rate limiting
app.use(rateLimiter);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Lead webhook endpoint
app.post('/api/v1/leads', authMiddleware, async (req, res) => {
  try {
    const leadData: Partial<Lead> = req.body;
    
    // Validate lead data
    const validationResult = validateLead(leadData);
    if (!validationResult.success) {
      logger.warn('Lead validation failed', { errors: validationResult.errors });
      return res.status(400).json({
        error: 'Validation failed',
        details: validationResult.errors,
      });
    }

    // Generate lead ID
    const leadId = 'lead_' + Date.now();
    
    // Publish lead.received event to NATS
    await natsConnection.publish('lead.received', {
      id: leadId,
      ...leadData,
      status: 'received',
      createdAt: new Date().toISOString(),
    });

    logger.info('Lead received and published to NATS', { leadId });
    
    res.status(201).json({
      id: leadId,
      status: 'received',
      message: 'Lead ingested successfully',
    });
  } catch (error) {
    logger.error('Error creating lead', { error });
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get lead status endpoint
app.get('/api/v1/leads/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    logger.info('Fetching lead status', { leadId: id });

    // TODO: Query database for lead status
    // For now, return a mock response
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

// Get agent leads endpoint
app.get('/api/v1/agents/:agentId/leads', authMiddleware, async (req, res) => {
  try {
    const { agentId } = req.params;
    logger.info('Fetching leads for agent', { agentId });

    // TODO: Query database for agent leads
    res.json({
      agentId,
      leads: [],
      message: 'Agent leads retrieved',
    });
  } catch (error) {
    logger.error('Error fetching agent leads', { error });
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Start server after connecting to NATS
const server = app.listen(PORT, async () => {
  try {
    await natsConnection.connect();
    logger.info(`API service running on port ${PORT}`);
    logger.info('Connected to NATS for event publishing');
  } catch (error) {
    logger.error('Failed to connect to NATS', { error });
    process.exit(1);
  }
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully');
  
  try {
    await natsConnection.close();
    server.close(() => {
      logger.info('API service stopped');
      process.exit(0);
    });
  } catch (error) {
    logger.error('Error during shutdown', { error });
    process.exit(1);
  }
});

export default app;