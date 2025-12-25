import { logger } from '@insurance-lead-gen/core';
import { orchestratorConfig } from '@insurance-lead-gen/config';
import { connectNats } from './nats.js';
import { OpenAIClient } from './openai.js';
import { LangChainEngine } from './langchain.js';
import { EnrichmentService } from './enrichment.js';
import { QueueManager } from './queues.js';

const PORT = orchestratorConfig.port;

async function initializeOrchestrator() {
  try {
    logger.info('Orchestrator service starting initialization', { port: PORT });

    // Initialize OpenAI client
    const openaiClient = new OpenAIClient(orchestratorConfig.openaiApiKey);
    logger.info('OpenAI client initialized');

    // Initialize Enrichment service
    const enrichmentService = new EnrichmentService();
    logger.info('Enrichment service initialized');

    // Initialize LangChain engine
    const langchainEngine = new LangChainEngine(openaiClient, enrichmentService);
    logger.info('LangChain engine initialized');

    // Initialize queue manager
    const queueManager = new QueueManager();
    await queueManager.connect();
    logger.info('Queue manager initialized');

    // Connect to NATS
    const natsConnection = await connectNats(orchestratorConfig);
    logger.info('NATS connection established');

    // Subscribe to lead.processed events
    const subscription = natsConnection.subscribe('lead.processed');
    (async () => {
      for await (const msg of subscription) {
        try {
          const leadData = JSON.parse(msg.data.toString());
          logger.info('Received lead for AI processing', { leadId: leadData.id });

          // Add to processing queue
          await queueManager.addLeadProcessingJob(leadData);
          logger.info('Lead added to processing queue', { leadId: leadData.id });

        } catch (error) {
          logger.error('Error processing lead event', { error: error.message });
        }
      }
    })();

    // Start processing queue
    await queueManager.startProcessingQueue(langchainEngine, natsConnection);

    logger.info('Orchestrator service running and ready to process leads', { port: PORT });

    // Keep the process alive
    setInterval(() => {
      logger.debug('Orchestrator service heartbeat');
    }, 60000);

  } catch (error) {
    logger.error('Failed to initialize orchestrator service', { error: error.message });
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

// Start the service
initializeOrchestrator();