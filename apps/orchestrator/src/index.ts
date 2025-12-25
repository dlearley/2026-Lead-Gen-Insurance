import { logger } from '@insurance-lead-gen/core';
import { Queue, Worker } from 'bullmq';

const PORT = process.env.ORCHESTRATOR_PORT || 3002;

// AI/LLM Configuration
const openAIConfig = {
  model: process.env.OPENAI_MODEL || 'gpt-4-turbo-preview',
  apiKey: process.env.OPENAI_API_KEY || '',
  temperature: 0.1,
  maxTokens: 2000,
};

// Lead scoring prompts
export const PROMPTS = {
  LEAD_QUALIFICATION: `You are an insurance lead qualification expert. Analyze the following lead information and provide:
1. A qualification score (0-100)
2. Primary insurance interest (auto, home, life, health, commercial)
3. Urgency level (low, medium, high)
4. Key qualification factors
5. Recommended next steps

Lead Information:
{source_info}

Please respond in JSON format with the following structure:
{
  "score": <number>,
  "primaryInterest": "<insurance_type>",
  "urgency": "<level>",
  "factors": [<array of key factors>],
  "nextSteps": [<array of recommended actions>]
}`,

  LEAD_ROUTING: `As an intelligent insurance agent routing system, analyze this lead and match it with the best agent.

Lead Details:
- Quality Score: {score}
- Insurance Type: {insuranceType}
- Location: {location}
- Urgency: {urgency}

Available Agents:
{agents}

Provide the best agent match based on:
1. Specialization match (highest priority)
2. Geographic proximity
3. Performance rating
4. Current workload

Respond in JSON format:
{
  "agentId": "<matched_agent_id>",
  "confidence": <number 0-1>,
  "reasoning": "<explanation of the match>"
}`,
};

// Types for AI processing
export interface LeadQualificationResult {
  score: number;
  primaryInterest: string;
  urgency: string;
  factors: string[];
  nextSteps: string[];
}

export interface LeadRoutingResult {
  agentId: string;
  confidence: number;
  reasoning: string;
}

// NATS connection for orchestrator
let natsConnection: any = null;
let isNATSConnected = false;

export async function connectNATS(url: string): Promise<void> {
  try {
    logger.info('NATS connection would be established', { url });
    isNATSConnected = true;
    natsConnection = {};
  } catch (error) {
    logger.error('Failed to connect to NATS', { error });
    throw error;
  }
}

export async function disconnectNATS(): Promise<void> {
  if (natsConnection) {
    logger.info('NATS connection closed');
    natsConnection = null;
    isNATSConnected = false;
  }
}

// BullMQ queues for orchestrator
const queues = new Map<string, Queue>();

export async function initQueues(): Promise<void> {
  const redisHost = process.env.REDIS_HOST || 'localhost';
  const redisPort = parseInt(process.env.REDIS_PORT || '6379');

  const queueOptions = {
    connection: {
      host: redisHost,
      port: redisPort,
    },
    defaultJobOptions: {
      removeOnComplete: 50,
      removeOnFail: 25,
      attempts: 2,
    },
  };

  queues.set('ai-processing', new Queue('ai-processing', queueOptions));
  queues.set('agent-matching', new Queue('agent-matching', queueOptions));

  logger.info('Orchestrator queues initialized');
}

export async function closeQueues(): Promise<void> {
  for (const queue of queues.values()) {
    await queue.close();
  }
  queues.clear();
}

// AI/LLM Processing Functions
export async function qualifyLead(leadData: Record<string, unknown>): Promise<LeadQualificationResult> {
  logger.info('Qualifying lead with AI', { leadId: leadData.leadId });

  // In production, this would call OpenAI API
  // const openai = new OpenAI({ apiKey: openAIConfig.apiKey });
  // const response = await openai.chat.completions.create({...});

  // Simulated AI response for development
  const mockResult: LeadQualificationResult = {
    score: Math.floor(Math.random() * 40) + 60, // 60-100
    primaryInterest: 'auto',
    urgency: 'medium',
    factors: ['Complete contact information', 'Clear insurance intent', 'Responsive lead'],
    nextSteps: ['Assign to auto insurance specialist', 'Schedule follow-up call'],
  };

  logger.info('Lead qualification complete', { leadId: leadData.leadId, score: mockResult.score });

  return mockResult;
}

export async function matchAgent(
  leadData: Record<string, unknown>,
  agents: Array<{ id: string; specializations: string[]; rating: number }>
): Promise<LeadRoutingResult> {
  logger.info('Matching agent for lead', { leadId: leadData.leadId });

  // In production, this would use Neo4j graph queries and AI matching
  const insuranceType = (leadData.insuranceType as string) || 'auto';

  // Find best matching agent
  const bestAgent = agents
    .filter((a) => a.specializations.includes(insuranceType))
    .sort((a, b) => b.rating - a.rating)[0];

  if (bestAgent) {
    return {
      agentId: bestAgent.id,
      confidence: 0.85,
      reasoning: `Agent ${bestAgent.id} has highest rating among ${insuranceType} specialists`,
    };
  }

  // Fallback to highest rated agent
  const fallbackAgent = agents.sort((a, b) => b.rating - a.rating)[0];
  return {
    agentId: fallbackAgent?.id || 'agent_default',
    confidence: 0.5,
    reasoning: 'Fallback: No specialized agent available, assigned to highest rated agent',
  };
}

// Job processors
export const processors = {
  async aiQualificationProcessor(job: any): Promise<LeadQualificationResult> {
    const { leadId, leadData } = job.data;
    logger.info('Processing AI qualification job', { jobId: job.id, leadId });

    try {
      const result = await qualifyLead({ leadId, ...leadData });
      return result;
    } catch (error) {
      logger.error('AI qualification failed', { jobId: job.id, error });
      throw error;
    }
  },

  async agentMatchingProcessor(job: any): Promise<LeadRoutingResult> {
    const { leadId, leadData, agents } = job.data;
    logger.info('Processing agent matching job', { jobId: job.id, leadId });

    try {
      const result = await matchAgent({ leadId, ...leadData }, agents || []);
      return result;
    } catch (error) {
      logger.error('Agent matching failed', { jobId: job.id, error });
      throw error;
    }
  },
};

// Create workers
export function createWorkers(): void {
  const redisHost = process.env.REDIS_HOST || 'localhost';
  const redisPort = parseInt(process.env.REDIS_PORT || '6379');

  const workerOptions = {
    connection: {
      host: redisHost,
      port: redisPort,
    },
    concurrency: 3,
  };

  new Worker(
    'ai-processing',
    async (job) => {
      return await processors.aiQualificationProcessor(job);
    },
    workerOptions
  );

  new Worker(
    'agent-matching',
    async (job) => {
      return await processors.agentMatchingProcessor(job);
    },
    workerOptions
  );

  logger.info('Orchestrator workers created');
}

// Graceful shutdown
async function shutdown(signal: string): Promise<void> {
  logger.info(`${signal} received, shutting down gracefully`);

  await disconnectNATS();
  await closeQueues();

  logger.info('Shutdown complete');
  process.exit(0);
}

// Main startup
async function main(): Promise<void> {
  logger.info('Orchestrator service starting', { port: PORT });

  // Initialize queues
  await initQueues();
  createWorkers();

  // Connect to NATS
  const natsUrl = process.env.NATS_URL || 'nats://localhost:4222';
  await connectNATS(natsUrl);

  logger.info(`Orchestrator service running on port ${PORT}`);

  // Periodic heartbeat
  setInterval(() => {
    logger.debug('Orchestrator service heartbeat', {
      memory: process.memoryUsage(),
      uptime: process.uptime(),
    });
  }, 60000);
}

// Start the service
main().catch((error) => {
  logger.error('Failed to start orchestrator service', { error });
  process.exit(1);
});

// Register shutdown handlers
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

// Export for testing
export { queues, processors };
