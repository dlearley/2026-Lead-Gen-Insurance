import { logger } from '@insurance-lead-gen/core';
import { NATSConnection } from './nats.js';
import { BullMQQueue } from './queue.js';
import { OpenAIClient } from './ai/openai.js';
import { LeadQualificationService } from './services/lead-qualification.js';
import { AgentMatchingService } from './services/agent-matching.js';
import { config } from '@insurance-lead-gen/config';

const PORT = process.env.ORCHESTRATOR_PORT || 3002;

// Initialize services
const natsConnection = new NATSConnection();
const bullMQQueue = new BullMQQueue();
const openAIClient = new OpenAIClient();
const leadQualificationService = new LeadQualificationService(openAIClient);
const agentMatchingService = new AgentMatchingService();

async function initializeService() {
  try {
    logger.info('Orchestrator service starting', { port: PORT });

    // Connect to NATS
    await natsConnection.connect();
    logger.info('Connected to NATS');

    // Connect to BullMQ
    await bullMQQueue.connect();
    logger.info('Connected to BullMQ');

    // Initialize OpenAI client
    await openAIClient.initialize();
    logger.info('OpenAI client initialized');

    // Set up event listeners
    await setupEventListeners();

    logger.info('Orchestrator service initialized successfully');

    // Keep the process alive
    setInterval(() => {
      logger.debug('Orchestrator service heartbeat');
    }, 60000);

  } catch (error) {
    logger.error('Failed to initialize orchestrator service', { error });
    process.exit(1);
  }
}

async function setupEventListeners() {
  // Subscribe to lead.processed events
  await natsConnection.subscribe('lead.processed', async (data) => {
    try {
      logger.info('Processing lead.processed event', { leadId: data.id });
      
      // Add lead to qualification queue
      await bullMQQueue.addJob('lead-qualification', data, {
        priority: 'high',
        attempts: 3,
      });
      
      logger.info('Lead added to qualification queue', { leadId: data.id });
    } catch (error) {
      logger.error('Error processing lead.processed event', { error, leadId: data.id });
    }
  });

  // Process qualification jobs
  await bullMQQueue.processJobs('lead-qualification', async (job) => {
    try {
      const leadData = job.data;
      logger.info('Qualifying lead', { leadId: leadData.id });

      // Qualify the lead using AI
      const qualificationResult = await leadQualificationService.qualifyLead(leadData);

      // Publish lead.qualified event
      await natsConnection.publish('lead.qualified', {
        id: leadData.id,
        qualityScore: qualificationResult.qualityScore,
        insuranceType: qualificationResult.insuranceType,
        intent: qualificationResult.intent,
        urgency: qualificationResult.urgency,
      });

      logger.info('Lead qualified successfully', {
        leadId: leadData.id,
        qualityScore: qualificationResult.qualityScore,
        insuranceType: qualificationResult.insuranceType,
      });

      // Add to routing queue
      await bullMQQueue.addJob('lead-routing', {
        ...leadData,
        ...qualificationResult,
      }, {
        priority: 'high',
        attempts: 3,
      });

    } catch (error) {
      logger.error('Error qualifying lead', { error, leadId: leadData.id });
      throw error; // This will trigger retry
    }
  });

  // Process routing jobs
  await bullMQQueue.processJobs('lead-routing', async (job) => {
    try {
      const leadData = job.data;
      logger.info('Routing lead to agent', { leadId: leadData.id });

      // Find best agent for this lead
      const agent = await agentMatchingService.findBestAgent(leadData);

      if (!agent) {
        logger.warn('No suitable agent found for lead', { leadId: leadData.id });
        // TODO: Handle case where no agent is available
        return;
      }

      // Publish lead.routed event
      await natsConnection.publish('lead.routed', {
        leadId: leadData.id,
        agentId: agent.id,
        assignedAt: new Date().toISOString(),
      });

      logger.info('Lead routed successfully', {
        leadId: leadData.id,
        agentId: agent.id,
      });

    } catch (error) {
      logger.error('Error routing lead', { error, leadId: leadData.id });
      throw error; // This will trigger retry
    }
  });
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully');

  try {
    await natsConnection.close();
    await bullMQQueue.close();
    logger.info('All connections closed');
  } catch (error) {
    logger.error('Error during shutdown', { error });
  } finally {
    process.exit(0);
  }
});

// Start the service
initializeService().catch((error) => {
  logger.error('Fatal error in orchestrator service', { error });
  process.exit(1);
});

export { natsConnection, bullMQQueue, openAIClient, leadQualificationService, agentMatchingService };