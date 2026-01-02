import { createServer } from 'http';
import { Server } from 'socket.io';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import winston from 'winston';
import { CopilotWebSocketController } from './ws/copilot-ws.controller';
import { CopilotService } from './services/copilot.service';
import { ConversationAnalysisService } from './services/conversation-analysis.service';
import { RecommendationEngine } from './services/recommendation-engine.service';
import { KnowledgeBaseService } from './services/knowledge-base.service';
import { PerformanceInsightsService } from './services/performance-insights.service';
import { monitoring } from './monitoring/observability';

dotenv.config();

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
    methods: ['GET', 'POST'],
    credentials: true,
  },
  transports: ['websocket', 'polling'],
});

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json(),
    winston.format.errors({ stack: true })
  ),
  defaultMeta: { service: 'copilot-service' },
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      ),
    }),
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' }),
  ],
});

global.logger = logger;

app.use(helmet());
app.use(
  cors({
    origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
    credentials: true,
  })
);
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

app.get('/health', (req, res) => {
  const healthcheck = {
    uptime: process.uptime(),
    message: 'OK',
    timestamp: Date.now(),
    version: process.env.npm_package_version,
  };
  res.status(200).json(healthcheck);
});

app.get('/metrics', async (req, res) => {
  try {
    const metrics = await monitoring.getMetrics();
    res.set('Content-Type', 'text/plain');
    res.send(metrics);
  } catch (error) {
    logger.error('Failed to fetch metrics', { error });
    res.status(500).send('Failed to fetch metrics');
  }
});

app.get('/debug/sockets', (req, res) => {
  const sockets = Array.from(io.sockets.sockets.values()).map((socket) => ({
    id: socket.id,
    rooms: Array.from(socket.rooms),
    handshake: {
      headers: socket.handshake.headers,
      query: socket.handshake.query,
      auth: socket.handshake.auth,
    },
  }));

  res.json({
    totalConnections: sockets.length,
    sockets,
  });
});

const PORT = process.env.PORT || 4000;

async function startServer() {
  try {
    monitoring.initialize();
    
    const knowledgeBaseService = new KnowledgeBaseService();
    await knowledgeBaseService.initialize();

    const conversationAnalysisService = new ConversationAnalysisService();
    const recommendationEngine = new RecommendationEngine(knowledgeBaseService);
    const performanceInsightsService = new PerformanceInsightsService();

    const copilotService = new CopilotService(
      conversationAnalysisService,
      recommendationEngine,
      performanceInsightsService,
      knowledgeBaseService
    );

    const wsController = new CopilotWebSocketController(io, copilotService);
    wsController.initialize();

    server.listen(PORT, () => {
      logger.info(`Copilot service running on port ${PORT}`, {
        environment: process.env.NODE_ENV || 'development',
        version: process.env.npm_package_version,
      });
      monitoring.recordEvent('server.started', { port: PORT });
    });

    process.on('SIGTERM', async () => {
      logger.info('SIGTERM received, shutting down gracefully');
      monitoring.recordEvent('server.shutdown', { signal: 'SIGTERM' });
      server.close(() => {
        logger.info('Server closed');
        process.exit(0);
      });
    });

    process.on('SIGINT', async () => {
      logger.info('SIGINT received, shutting down gracefully');
      monitoring.recordEvent('server.shutdown', { signal: 'SIGINT' });
      server.close(() => {
        logger.info('Server closed');
        process.exit(0);
      });
    });

  } catch (error) {
    logger.error('Failed to start copilot service', { error });
    process.exit(1);
  }
}

startServer();

export { io, logger };