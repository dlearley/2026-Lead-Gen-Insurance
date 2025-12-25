import { logger } from '@insurance-lead-gen/core';
import { createRequire } from 'module';
import { PrismaClient } from '@prisma/client';
import Redis from 'ioredis';
import { Neo4jDriver } from './neo4j.js';
import { NATSConnection } from './nats.js';
import { LeadRepository } from './repositories/lead.repository.js';
import { AgentRepository } from './repositories/agent.repository.js';
import { EventRepository } from './repositories/event.repository.js';
import { config } from '@insurance-lead-gen/config';

const require = createRequire(import.meta.url);

const PORT = process.env.DATA_SERVICE_PORT || 3001;

// Initialize database connections
const prisma = new PrismaClient();
const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD || undefined,
});

// Initialize repositories
const leadRepository = new LeadRepository(prisma);
const agentRepository = new AgentRepository(prisma);
const eventRepository = new EventRepository(prisma);

// Initialize external services
const neo4jDriver = new Neo4jDriver();
const natsConnection = new NATSConnection();

async function initializeService() {
  try {
    logger.info('Data service starting', { port: PORT });

    // Connect to Neo4j
    await neo4jDriver.connect();
    logger.info('Connected to Neo4j');

    // Connect to NATS
    await natsConnection.connect();
    logger.info('Connected to NATS');

    // Test database connections
    await prisma.$connect();
    logger.info('Connected to PostgreSQL');

    // Test Redis connection
    await redis.ping();
    logger.info('Connected to Redis');

    // Initialize Neo4j schema
    await neo4jDriver.initializeSchema();
    logger.info('Neo4j schema initialized');

    // Set up event listeners
    await setupEventListeners();

    logger.info('Data service initialized successfully');

    // Keep the process alive
    setInterval(() => {
      logger.debug('Data service heartbeat');
    }, 60000);

  } catch (error) {
    logger.error('Failed to initialize data service', { error });
    process.exit(1);
  }
}

async function setupEventListeners() {
  // Subscribe to lead events
  await natsConnection.subscribe('lead.received', async (data) => {
    try {
      logger.info('Processing lead.received event', { leadId: data.id });
      
      // Store the lead in database
      const lead = await leadRepository.createLead(data);
      
      // Publish lead.processed event
      await natsConnection.publish('lead.processed', {
        id: lead.id,
        status: 'processing',
        timestamp: new Date().toISOString()
      });
      
      logger.info('Lead processed successfully', { leadId: lead.id });
    } catch (error) {
      logger.error('Error processing lead', { error, leadId: data.id });
    }
  });

  // Subscribe to lead.qualified events
  await natsConnection.subscribe('lead.qualified', async (data) => {
    try {
      logger.info('Processing lead.qualified event', { leadId: data.id });
      
      // Update lead with qualification results
      await leadRepository.updateLead(data.id, {
        qualityScore: data.qualityScore,
        insuranceType: data.insuranceType,
        status: 'QUALIFIED'
      });
      
      // Create event record
      await eventRepository.createEvent({
        type: 'lead.qualified',
        source: 'orchestrator',
        entityType: 'lead',
        entityId: data.id,
        data: {
          qualityScore: data.qualityScore,
          insuranceType: data.insuranceType
        }
      });
      
      logger.info('Lead qualified successfully', { leadId: data.id });
    } catch (error) {
      logger.error('Error processing qualified lead', { error, leadId: data.id });
    }
  });

  // Subscribe to lead.routed events
  await natsConnection.subscribe('lead.routed', async (data) => {
    try {
      logger.info('Processing lead.routed event', { leadId: data.leadId, agentId: data.agentId });
      
      // Create lead assignment
      await leadRepository.assignLead(data.leadId, data.agentId);
      
      // Update lead status
      await leadRepository.updateLead(data.leadId, { status: 'ROUTED' });
      
      // Create event record
      await eventRepository.createEvent({
        type: 'lead.routed',
        source: 'orchestrator',
        entityType: 'lead',
        entityId: data.leadId,
        data: {
          agentId: data.agentId,
          assignedAt: new Date().toISOString()
        }
      });
      
      logger.info('Lead routed successfully', { leadId: data.leadId, agentId: data.agentId });
    } catch (error) {
      logger.error('Error processing routed lead', { error, leadId: data.leadId });
    }
  });
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully');
  
  try {
    await prisma.$disconnect();
    await redis.quit();
    await neo4jDriver.close();
    await natsConnection.close();
    logger.info('All connections closed');
  } catch (error) {
    logger.error('Error during shutdown', { error });
  } finally {
    process.exit(0);
  }
});

// Start the service
initializeService().catch((error) => {
  logger.error('Fatal error in data service', { error });
  process.exit(1);
});

export { prisma, redis, leadRepository, agentRepository, eventRepository, neo4jDriver, natsConnection };