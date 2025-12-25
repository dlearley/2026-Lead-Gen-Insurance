import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import { config, apiConfig } from '@insurance-lead-gen/config';
import { logger } from '@insurance-lead-gen/core';
import type { Lead } from '@insurance-lead-gen/types';
import { connectNats } from './nats.js';
import { publishEvent } from './events.js';
import { validateLead } from './validation.js';

const app = express();
const PORT = apiConfig.port;

// Middleware
app.use(helmet());
app.use(cors());
app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// NATS connection for event publishing
let natsConnection: any = null;

async function initializeApi() {
  try {
    // Connect to NATS
    natsConnection = await connectNats(config);
    logger.info('NATS connection established for API service');

    // Health check endpoint
    app.get('/health', (req, res) => {
      res.json({ 
        status: 'ok',
        timestamp: new Date().toISOString(),
        service: 'api',
        version: '1.0.0'
      });
    });

    // Lead creation endpoint
    app.post('/api/v1/leads', async (req, res) => {
      try {
        const leadData: Partial<Lead> = req.body;
        logger.info('Received lead creation request', { lead: leadData });

        // Validate lead data
        const validationResult = validateLead(leadData);
        if (!validationResult.valid) {
          return res.status(400).json({
            error: 'Invalid lead data',
            details: validationResult.errors,
          });
        }

        // Generate lead ID
        const leadId = 'lead_' + Date.now();
        const createdLead: Lead = {
          id: leadId,
          source: leadData.source || 'api',
          email: leadData.email,
          phone: leadData.phone,
          firstName: leadData.firstName,
          lastName: leadData.lastName,
          address: leadData.address,
          insuranceType: leadData.insuranceType,
          qualityScore: leadData.qualityScore || 0,
          status: 'received',
          metadata: leadData.metadata,
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        // Publish lead.received event
        await publishEvent(natsConnection, 'lead.received', {
          id: leadId,
          data: createdLead,
          timestamp: new Date().toISOString(),
        });

        logger.info('Lead created and event published', { leadId });

        res.status(201).json({
          id: leadId,
          status: 'received',
          message: 'Lead ingested successfully',
          timestamp: new Date().toISOString(),
        });

      } catch (error) {
        logger.error('Error creating lead', { error: error.message });
        res.status(500).json({ 
          error: 'Internal server error',
          details: error.message
        });
      }
    });

    // Lead retrieval endpoint
    app.get('/api/v1/leads/:id', async (req, res) => {
      try {
        const { id } = req.params;
        logger.info('Fetching lead', { leadId: id });

        // TODO: Implement actual lead retrieval from database
        // For now, return mock data
        const mockLead: Lead = {
          id,
          source: 'api',
          status: 'processing',
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        res.json({
          id,
          status: mockLead.status,
          message: 'Lead found',
          data: mockLead,
        });

      } catch (error) {
        logger.error('Error fetching lead', { error: error.message });
        res.status(500).json({ 
          error: 'Internal server error',
          details: error.message
        });
      }
    });

    // Start server
    const server = app.listen(PORT, () => {
      logger.info(`API service running on port ${PORT}`);
    });

    // Graceful shutdown
    process.on('SIGTERM', async () => {
      logger.info('SIGTERM received, shutting down gracefully');
      
      try {
        if (natsConnection) {
          await natsConnection.close();
        }
        server.close(() => {
          logger.info('API service shutdown complete');
          process.exit(0);
        });
      } catch (error) {
        logger.error('Error during shutdown', { error: error.message });
        process.exit(1);
      }
    });

  } catch (error) {
    logger.error('Failed to initialize API service', { error: error.message });
    process.exit(1);
  }
}

// Start the API service
initializeApi();

export default app;