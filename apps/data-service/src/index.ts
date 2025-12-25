import { logger } from '@insurance-lead-gen/core';
import { connectNATS, disconnectNATS, isNATSConnected, publishLeadCreatedEvent } from './events.js';
import { leadRepository, InMemoryLeadRepository } from './repositories.js';

const PORT = process.env.DATA_SERVICE_PORT || 3001;

// Database connection states
let prismaClient: any = null;
let redisClient: any = null;
let neo4jClient: any = null;
let qdrantClient: any = null;

// Initialize Prisma client
async function initPrisma(): Promise<void> {
  try {
    // In production: import { PrismaClient } from '@prisma/client';
    // prismaClient = new PrismaClient();
    logger.info('Prisma client would be initialized');
    prismaClient = {}; // Placeholder
  } catch (error) {
    logger.error('Failed to initialize Prisma client', { error });
    throw error;
  }
}

// Initialize Redis connection
async function initRedis(): Promise<void> {
  try {
    // In production: import Redis from 'ioredis';
    // redisClient = new Redis({ host: process.env.REDIS_HOST, port: parseInt(process.env.REDIS_PORT || '6379') });
    logger.info('Redis client would be initialized');
    redisClient = {
      get: async () => null,
      set: async () => 'OK',
      del: async () => 1,
    };
  } catch (error) {
    logger.error('Failed to initialize Redis client', { error });
    throw error;
  }
}

// Initialize Neo4j connection
async function initNeo4j(): Promise<void> {
  try {
    // In production: import neo4j from 'neo4j-driver';
    // neo4jClient = neo4j.driver(process.env.NEO4J_URI, neo4j.auth.basic(...));
    logger.info('Neo4j client would be initialized');
    neo4jClient = {}; // Placeholder
  } catch (error) {
    logger.error('Failed to initialize Neo4j client', { error });
    throw error;
  }
}

// Initialize Qdrant connection
async function initQdrant(): Promise<void> {
  try {
    // In production: import { QdrantClient } from '@qdrant/js-client-rest';
    // qdrantClient = new QdrantClient({ url: process.env.QDRANT_URL });
    logger.info('Qdrant client would be initialized');
    qdrantClient = {}; // Placeholder
  } catch (error) {
    logger.error('Failed to initialize Qdrant client', { error });
    throw error;
  }
}

// Initialize all database connections
async function initDatabaseConnections(): Promise<void> {
  logger.info('Initializing database connections...');
  
  await initPrisma();
  await initRedis();
  await initNeo4j();
  await initQdrant();
  
  logger.info('All database connections initialized');
}

// Graceful shutdown handler
async function shutdown(signal: string): Promise<void> {
  logger.info(`${signal} received, shutting down gracefully`);
  
  // Close NATS connection
  await disconnectNATS();
  
  // Close database connections
  if (prismaClient) {
    await prismaClient.$disconnect();
    logger.info('Prisma connection closed');
  }
  
  if (redisClient) {
    await redisClient.quit();
    logger.info('Redis connection closed');
  }
  
  if (neo4jClient) {
    await neo4jClient.close();
    logger.info('Neo4j connection closed');
  }
  
  logger.info('Shutdown complete');
  process.exit(0);
}

// Example lead creation with event publishing
async function createLeadWithEvents(leadData: any): Promise<any> {
  const lead = await leadRepository.create({
    source: leadData.source,
    email: leadData.email,
    phone: leadData.phone,
    firstName: leadData.firstName,
    lastName: leadData.lastName,
    address: leadData.address,
    insuranceType: leadData.insuranceType,
    metadata: leadData.metadata,
  });

  // Publish event if NATS is connected
  if (isNATSConnected()) {
    await publishLeadCreatedEvent({
      leadId: lead.id,
      source: lead.source,
      email: lead.email || undefined,
      phone: lead.phone || undefined,
      firstName: lead.firstName || undefined,
      lastName: lead.lastName || undefined,
      insuranceType: lead.insuranceType || undefined,
      createdAt: lead.createdAt,
      metadata: lead.metadata || undefined,
    });
  }

  return lead;
}

// Main startup function
async function main(): Promise<void> {
  logger.info('Data service starting', { port: PORT });

  // Initialize database connections
  await initDatabaseConnections();

  // Connect to NATS
  const natsUrl = process.env.NATS_URL || 'nats://localhost:4222';
  await connectNATS(natsUrl);

  logger.info(`Data service running on port ${PORT}`);

  // Keep the process alive with periodic heartbeat logging
  setInterval(() => {
    logger.debug('Data service heartbeat', {
      memory: process.memoryUsage(),
      uptime: process.uptime(),
    });
  }, 60000);
}

// Start the service
main().catch((error) => {
  logger.error('Failed to start data service', { error });
  process.exit(1);
});

// Register shutdown handlers
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

// Export for testing
export {
  initDatabaseConnections,
  initPrisma,
  initRedis,
  initNeo4j,
  initQdrant,
  createLeadWithEvents,
  leadRepository,
};
