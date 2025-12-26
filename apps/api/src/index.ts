import express from 'express';
import cors from 'cors';
import fetch from 'node-fetch';
import helmet from 'helmet';
import compression from 'compression';
import { config } from '@insurance-lead-gen/config';
import { logger } from '@insurance-lead-gen/core';
import type { Lead } from '@insurance-lead-gen/types';

const app = express();
const PORT = process.env.API_PORT || 3000;

app.use(helmet());
app.use(cors());
app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.post('/api/v1/leads', async (req, res) => {
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

app.get('/api/v1/leads/:id', async (req, res) => {
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

// Agent management endpoints
app.post('/api/v1/agents', async (req, res) => {
  try {
    const agentData = req.body;
    const dataServiceUrl = `http://localhost:${process.env.DATA_SERVICE_PORT || 3001}`;
    
    const response = await fetch(`${dataServiceUrl}/api/v1/agents`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(agentData),
    });
    
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (error) {
    logger.error('Error creating agent', { error });
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/v1/agents/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const dataServiceUrl = `http://localhost:${process.env.DATA_SERVICE_PORT || 3001}`;
    
    const response = await fetch(`${dataServiceUrl}/api/v1/agents/${id}`);
    const data = await response.json();
    
    res.json(data);
  } catch (error) {
    logger.error('Error fetching agent', { error });
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/v1/agents/:id/specializations', async (req, res) => {
  try {
    const { id } = req.params;
    const dataServiceUrl = `http://localhost:${process.env.DATA_SERVICE_PORT || 3001}`;
    
    const response = await fetch(`${dataServiceUrl}/api/v1/agents/${id}/specializations`);
    const data = await response.json();
    
    res.json(data);
  } catch (error) {
    logger.error('Error fetching agent specializations', { error });
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/v1/agents/:id/metrics', async (req, res) => {
  try {
    const { id } = req.params;
    const dataServiceUrl = `http://localhost:${process.env.DATA_SERVICE_PORT || 3001}`;
    
    const response = await fetch(`${dataServiceUrl}/api/v1/agents/${id}/metrics`);
    const data = await response.json();
    
    res.json(data);
  } catch (error) {
    logger.error('Error fetching agent metrics', { error });
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Lead routing endpoints
app.post('/api/v1/leads/:id/route', async (req, res) => {
  try {
    const { id } = req.params;
    const orchestratorUrl = `http://localhost:${process.env.ORCHESTRATOR_PORT || 3002}`;
    
    const response = await fetch(`${orchestratorUrl}/api/v1/routing/route/${id}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (error) {
    logger.error('Error routing lead', { error });
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/v1/leads/:id/matching-agents', async (req, res) => {
  try {
    const { id } = req.params;
    const limit = req.query.limit || '5';
    const dataServiceUrl = `http://localhost:${process.env.DATA_SERVICE_PORT || 3001}`;
    
    const response = await fetch(`${dataServiceUrl}/api/v1/leads/${id}/matching-agents?limit=${limit}`);
    const data = await response.json();
    
    res.json(data);
  } catch (error) {
    logger.error('Error fetching matching agents', { error });
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/v1/leads/:leadId/assign/:agentId', async (req, res) => {
  try {
    const { leadId, agentId } = req.params;
    const dataServiceUrl = `http://localhost:${process.env.DATA_SERVICE_PORT || 3001}`;
    
    const response = await fetch(`${dataServiceUrl}/api/v1/leads/${leadId}/assign/${agentId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (error) {
    logger.error('Error assigning lead', { error });
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Orchestrator endpoints for routing configuration
app.get('/api/v1/orchestrator/routing/config', async (req, res) => {
  try {
    const orchestratorUrl = `http://localhost:${process.env.ORCHESTRATOR_PORT || 3002}`;
    
    const response = await fetch(`${orchestratorUrl}/api/v1/routing/config`);
    const data = await response.json();
    
    res.json(data);
  } catch (error) {
    logger.error('Error fetching routing config', { error });
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.put('/api/v1/orchestrator/routing/config', async (req, res) => {
  try {
    const config = req.body;
    const orchestratorUrl = `http://localhost:${process.env.ORCHESTRATOR_PORT || 3002}`;
    
    const response = await fetch(`${orchestratorUrl}/api/v1/routing/config`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config),
    });
    
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (error) {
    logger.error('Error updating routing config', { error });
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default app;