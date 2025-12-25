import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'rate-limiter-flexible';
import { config } from '@insurance-lead-gen/config';
import { logger } from '@insurance-lead-gen/core';
import {
  Lead,
  leadCreateSchema,
  leadQuerySchema,
  ValidationError,
  NotFoundError,
} from '@insurance-lead-gen/types';

// Rate limiter configuration
const rateLimiter = rateLimit({
  points: 100, // Number of requests
  duration: 60, // Per 60 seconds
  blockDuration: 60, // Block for 60 seconds if exceeded
});

// In-memory lead storage for demonstration (would be replaced by data-service calls)
const leads = new Map<string, Lead & { _metadata?: { processedAt?: Date } }>();

const app = express();
const PORT = process.env.API_PORT || 3000;

// Middleware
app.use(helmet());
app.use(cors());
app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Rate limiting middleware
app.use(async (req: Request, res: Response, next: NextFunction) => {
  try {
    await rateLimiter.consume(req.ip || 'unknown');
    next();
  } catch (rateLimiterRes) {
    logger.warn('Rate limit exceeded', { ip: req.ip, path: req.path });
    res.status(429).json({
      error: 'Too Many Requests',
      message: 'Rate limit exceeded. Please try again later.',
      retryAfter: Math.ceil(rateLimiterRes.msBeforeNext / 1000),
    });
  }
});

// Request logging middleware
app.use((req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.info('Request completed', {
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      duration,
    });
  });
  next();
});

// Health check endpoint
app.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'api',
    version: '0.1.0',
  });
});

// Lead validation middleware
const validateLeadCreate = (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = leadCreateSchema.safeParse(req.body);
    if (!result.success) {
      const errors = result.error.errors.map((e) => ({
        field: e.path.join('.'),
        message: e.message,
      }));
      throw new ValidationError(`Validation failed: ${JSON.stringify(errors)}`);
    }
    req.body = result.data;
    next();
  } catch (error) {
    next(error);
  }
};

// Create lead endpoint
app.post('/api/v1/leads', validateLeadCreate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const leadData = req.body;
    const id = `lead_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const lead: Lead = {
      id,
      source: leadData.source,
      email: leadData.email,
      phone: leadData.phone,
      firstName: leadData.firstName,
      lastName: leadData.lastName,
      address: leadData.address,
      insuranceType: leadData.insuranceType,
      status: 'received',
      metadata: leadData.metadata,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    leads.set(id, lead);

    logger.info('Lead created', { leadId: id, source: lead.source });

    res.status(201).json({
      id: lead.id,
      status: lead.status,
      message: 'Lead ingested successfully',
      createdAt: lead.createdAt,
    });
  } catch (error) {
    next(error);
  }
});

// Get lead by ID endpoint
app.get('/api/v1/leads/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const lead = leads.get(id);

    if (!lead) {
      throw new NotFoundError(`Lead with ID ${id} not found`);
    }

    logger.info('Lead retrieved', { leadId: id });

    res.json({
      ...lead,
      _metadata: {
        processedAt: new Date(),
      },
    });
  } catch (error) {
    next(error);
  }
});

// Query leads endpoint
app.get('/api/v1/leads', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const queryResult = leadQuerySchema.safeParse(req.query);

    if (!queryResult.success) {
      throw new ValidationError(`Invalid query parameters: ${queryResult.error.message}`);
    }

    const query = queryResult.data;
    let filteredLeads = Array.from(leads.values());

    // Apply filters
    if (query.status) {
      filteredLeads = filteredLeads.filter((l) => l.status === query.status);
    }
    if (query.source) {
      filteredLeads = filteredLeads.filter((l) => l.source === query.source);
    }
    if (query.insuranceType) {
      filteredLeads = filteredLeads.filter((l) => l.insuranceType === query.insuranceType);
    }
    if (query.minScore !== undefined) {
      filteredLeads = filteredLeads.filter((l) => (l.qualityScore || 0) >= query.minScore!);
    }
    if (query.maxScore !== undefined) {
      filteredLeads = filteredLeads.filter((l) => (l.qualityScore || 0) <= query.maxScore!);
    }
    if (query.fromDate) {
      filteredLeads = filteredLeads.filter((l) => l.createdAt >= query.fromDate!);
    }
    if (query.toDate) {
      filteredLeads = filteredLeads.filter((l) => l.createdAt <= query.toDate!);
    }

    // Sort by createdAt descending
    filteredLeads.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    // Pagination
    const total = filteredLeads.length;
    const page = query.page;
    const limit = query.limit;
    const offset = (page - 1) * limit;
    const paginatedLeads = filteredLeads.slice(offset, offset + limit);

    logger.info('Leads queried', { query, resultCount: paginatedLeads.length, total });

    res.json({
      data: paginatedLeads,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    next(error);
  }
});

// Update lead endpoint
app.patch('/api/v1/leads/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const lead = leads.get(id);

    if (!lead) {
      throw new NotFoundError(`Lead with ID ${id} not found`);
    }

    const updatedLead: Lead = {
      ...lead,
      ...req.body,
      id: lead.id, // Prevent ID modification
      createdAt: lead.createdAt, // Prevent creation date modification
      updatedAt: new Date(),
    };

    leads.set(id, updatedLead);

    logger.info('Lead updated', { leadId: id });

    res.json({
      ...updatedLead,
      message: 'Lead updated successfully',
    });
  } catch (error) {
    next(error);
  }
});

// Delete lead endpoint
app.delete('/api/v1/leads/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const lead = leads.get(id);

    if (!lead) {
      throw new NotFoundError(`Lead with ID ${id} not found`);
    }

    leads.delete(id);

    logger.info('Lead deleted', { leadId: id });

    res.json({
      message: 'Lead deleted successfully',
      id,
    });
  } catch (error) {
    next(error);
  }
});

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Route ${req.method} ${req.path} not found`,
  });
});

// Global error handler
app.use((err: Error, req: Request, res: Response, _next: NextFunction) => {
  logger.error('Request error', {
    error: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
  });

  const statusCode = (err as any).statusCode || 500;
  const message = statusCode === 500 ? 'Internal server error' : err.message;

  res.status(statusCode).json({
    error: err.constructor.name || 'Error',
    message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
});

// Graceful shutdown
const server = app.listen(PORT, () => {
  logger.info(`API service running on port ${PORT}`);
});

process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  server.close(() => {
    logger.info('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');
  server.close(() => {
    logger.info('Server closed');
    process.exit(0);
  });
});

export default app;
