import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { logger, ValidationError, NotFoundError, BaseError } from '@insurance-lead-gen/core';
import { Neo4jService } from './neo4j.js';
import type { Agent, Lead } from '@insurance-lead-gen/types';

const PORT = process.env.DATA_SERVICE_PORT || 3001;

const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

const neo4jService = Neo4jService.getInstance();

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Agent management endpoints
app.post('/api/v1/agents', async (req, res, next) => {
  try {
    const agentData: Partial<Agent> = req.body;
    
    if (!agentData.email || !agentData.licenseNumber) {
      throw new ValidationError('Email and license number are required');
    }

    const agent: Agent = {
      id: agentData.id || `agent_${Date.now()}`,
      firstName: agentData.firstName || '',
      lastName: agentData.lastName || '',
      email: agentData.email,
      phone: agentData.phone || '',
      licenseNumber: agentData.licenseNumber,
      specializations: agentData.specializations || [],
      location: {
        city: agentData.location?.city || 'Unknown',
        state: agentData.location?.state || 'Unknown',
        country: agentData.location?.country || 'US'
      },
      rating: agentData.rating || 0,
      isActive: agentData.isActive ?? true,
      maxLeadCapacity: agentData.maxLeadCapacity || 10,
      currentLeadCount: agentData.currentLeadCount || 0,
      averageResponseTime: agentData.averageResponseTime || 0,
      conversionRate: agentData.conversionRate || 0,
      createdAt: agentData.createdAt || new Date(),
      updatedAt: new Date()
    };

    await neo4jService.createAgentNode(agent);

    logger.info('Agent created successfully', { agentId: agent.id });
    res.status(201).json({ 
      success: true, 
      data: agent,
      message: 'Agent created successfully' 
    });
  } catch (error) {
    next(error);
  }
});

app.get('/api/v1/agents/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const agentNode = await neo4jService.findBestMatchingAgents(id, 1);
    
    if (!agentNode || agentNode.length === 0) {
      throw new NotFoundError('Agent not found');
    }

    const agent = agentNode[0].agent;
    const specializations = await neo4jService.getAgentSpecialties(id);
    const metrics = await neo4jService.getAgentPerformanceMetrics(id);

    const fullAgent: Agent = {
      ...agent,
      specializations,
      maxLeadCapacity: agent.maxLeadCapacity,
      currentLeadCount: agent.currentLeadCount,
      email: agent.email,
      phone: agent.phone,
      licenseNumber: agent.licenseNumber,
      conversionRate: metrics.conversionRate
    };

    res.json({ success: true, data: fullAgent });
  } catch (error) {
    next(error);
  }
});

app.get('/api/v1/agents/:id/specializations', async (req, res, next) => {
  try {
    const { id } = req.params;
    const specializations = await neo4jService.getAgentSpecialties(id);
    
    res.json({ success: true, data: specializations });
  } catch (error) {
    next(error);
  }
});

app.get('/api/v1/agents/:id/metrics', async (req, res, next) => {
  try {
    const { id } = req.params;
    const metrics = await neo4jService.getAgentPerformanceMetrics(id);
    
    res.json({ success: true, data: metrics });
  } catch (error) {
    next(error);
  }
});

// Lead management endpoints
app.post('/api/v1/leads', async (req, res, next) => {
  try {
    const leadData: Partial<Lead> = req.body;
    
    if (!leadData.source) {
      throw new ValidationError('Lead source is required');
    }

    const lead: Lead = {
      id: leadData.id || `lead_${Date.now()}`,
      source: leadData.source,
      email: leadData.email,
      phone: leadData.phone,
      firstName: leadData.firstName,
      lastName: leadData.lastName,
      address: leadData.address,
      insuranceType: leadData.insuranceType,
      qualityScore: leadData.qualityScore || 50,
      status: leadData.status || 'received',
      metadata: leadData.metadata,
      createdAt: leadData.createdAt || new Date(),
      updatedAt: new Date()
    };

    await neo4jService.createLeadNode(lead);

    logger.info('Lead created successfully', { leadId: lead.id });
    res.status(201).json({ 
      success: true, 
      data: lead,
      message: 'Lead created successfully' 
    });
  } catch (error) {
    next(error);
  }
});

app.get('/api/v1/leads/:id/matching-agents', async (req, res, next) => {
  try {
    const { id } = req.params;
    const limit = parseInt(req.query.limit as string) || 5;
    
    const matches = await neo4jService.findBestMatchingAgents(id, limit);
    
    // Enrich agents with their specializations
    const enrichedMatches = await Promise.all(
      matches.map(async (match) => {
        const specializations = await neo4jService.getAgentSpecialties(match.agent.id);
        const agent: Agent = {
          ...match.agent,
          specializations,
          email: match.agent.email,
          phone: match.agent.phone,
          licenseNumber: match.agent.licenseNumber
        };
        return { agent, score: match.score };
      })
    );

    res.json({ success: true, data: enrichedMatches });
  } catch (error) {
    next(error);
  }
});

// Lead assignment endpoint
app.post('/api/v1/leads/:leadId/assign/:agentId', async (req, res, next) => {
  try {
    const { leadId, agentId } = req.params;
    await neo4jService.assignLeadToAgent(leadId, agentId);
    
    res.json({ 
      success: true, 
      message: 'Lead assigned successfully',
      data: { leadId, agentId }
    });
  } catch (error) {
    next(error);
  }
});

// Error handling middleware
app.use((error: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  logger.error('Error handling request', { 
    error: error.message, 
    stack: error.stack,
    path: req.path,
    method: req.method 
  });

  if (error instanceof BaseError) {
    res.status(error.statusCode).json({
      success: false,
      error: error.message,
    });
  } else {
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
});

process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully');
  await neo4jService.close();
  process.exit(0);
});

const server = app.listen(PORT, () => {
  logger.info(`Data service running on port ${PORT}`);
});

export default app;