import { logger } from '@insurance-lead-gen/core';
import { dataServiceConfig } from '@insurance-lead-gen/config';
import { PrismaClient } from '@prisma/client';
import { createClient } from 'redis';
import { Neo4jDriver } from './neo4j.js';
import { QdrantClient } from './qdrant.js';
import { connectNats } from './nats.js';

// Initialize database connections
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: dataServiceConfig.databaseUrl,
    },
  },
});

// Initialize Redis client
const redisClient = createClient({
  url: dataServiceConfig.redisUrl,
});

// Initialize services
const neo4jDriver = new Neo4jDriver(dataServiceConfig.neo4j);
const qdrantClient = new QdrantClient(dataServiceConfig.qdrantUrl);

const PORT = dataServiceConfig.port;

async function initializeServices() {
  try {
    logger.info('Data service starting initialization', { port: PORT });

    // Connect to Redis
    await redisClient.connect();
    logger.info('Redis connection established');

    // Connect to Neo4j
    await neo4jDriver.connect();
    logger.info('Neo4j connection established');

    // Connect to Qdrant
    await qdrantClient.connect();
    logger.info('Qdrant connection established');

    // Connect to NATS
    const natsConnection = await connectNats(dataServiceConfig);
    logger.info('NATS connection established');

    // Test database connection
    await prisma.$connect();
    logger.info('PostgreSQL connection established');

    // Subscribe to NATS topics
    const subscription = natsConnection.subscribe('lead.received');
    (async () => {
      for await (const msg of subscription) {
        try {
          const leadData = JSON.parse(msg.data.toString());
          logger.info('Received lead for processing', { leadId: leadData.id });
          
          // TODO: Implement lead processing logic
          // 1. Store lead in PostgreSQL
          // 2. Create graph relationships in Neo4j
          // 3. Generate embeddings for Qdrant
          // 4. Publish lead.processed event
          
          logger.info('Lead processing completed', { leadId: leadData.id });
        } catch (error) {
          logger.error('Error processing lead', { error: error.message });
        }
      }
    })();

    logger.info('Data service running and ready to process leads', { port: PORT });

    // Keep the process alive
    setInterval(() => {
      logger.debug('Data service heartbeat');
    }, 60000);

  } catch (error) {
    logger.error('Failed to initialize data service', { error: error.message });
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully');
  
  try {
    await prisma.$disconnect();
    await redisClient.quit();
    await neo4jDriver.close();
    await qdrantClient.close();
    logger.info('All connections closed successfully');
  } catch (error) {
    logger.error('Error during shutdown', { error: error.message });
  } finally {
    process.exit(0);
  }
});

// Start the service
initializeServices();