import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';

import { logger } from '@insurance-lead-gen/core';

import { createLeadsRouter } from './routes/leads.routes.js';
import type { EventBus } from './infra/event-bus.js';

export const createApp = (params: {
  eventBus: EventBus;
  jwtSecret: string;
  rateLimit: {
    points: number;
    durationSeconds: number;
  };
}): express.Express => {
  const app = express();

  app.use(helmet());
  app.use(cors());
  app.use(compression());
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true }));

  app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  app.get('/api-docs/openapi.json', (req, res) => {
    res.json({
      openapi: '3.0.0',
      info: {
        title: 'Insurance Lead Gen API',
        version: '0.1.0',
      },
      paths: {
        '/api/v1/leads': {
          post: {
            summary: 'Create lead',
            responses: {
              '201': { description: 'Created' },
            },
          },
        },
        '/api/v1/leads/{id}': {
          get: {
            summary: 'Get lead',
            parameters: [
              {
                name: 'id',
                in: 'path',
                required: true,
                schema: { type: 'string' },
              },
            ],
            responses: {
              '200': { description: 'OK' },
              '404': { description: 'Not found' },
            },
          },
        },
      },
    });
  });

  app.use('/api/v1/leads', createLeadsRouter(params));

  app.use(
    (err: unknown, req: express.Request, res: express.Response, next: express.NextFunction) => {
      logger.error('Unhandled API error', {
        error: err,
        method: req.method,
        path: req.path,
      });

      if (res.headersSent) {
        next(err);
        return;
      }

      res.status(500).json({ error: 'internal_server_error' });
    }
  );

  return app;
};
