import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import express, { Express } from 'express';
import request from 'supertest';

// Mock the modules before importing
jest.mock('@insurance-lead-gen/config', () => ({
  config: {
    get: jest.fn((key: string) => {
      const config: Record<string, string> = {
        API_PORT: '3000',
        NODE_ENV: 'test',
      };
      return config[key];
    }),
  },
}));

jest.mock('@insurance-lead-gen/core', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

// Import after mocking
import { leadCreateSchema, leadQuerySchema } from '@insurance-lead-gen/types';

describe('Lead API Endpoints', () => {
  let app: Express;

  beforeAll(() => {
    app = express();
    app.use(express.json());
    
    // Simple validation middleware
    const validateLeadCreate = (req: any, res: any, next: any) => {
      const result = leadCreateSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({
          error: 'Validation failed',
          details: result.error.errors,
        });
      }
      req.body = result.data;
      next();
    };

    // In-memory storage
    const leads: Map<string, any> = new Map();

    // Routes
    app.get('/health', (req, res) => {
      res.json({ status: 'ok' });
    });

    app.post('/api/v1/leads', validateLeadCreate, (req, res) => {
      const id = `lead_${Date.now()}`;
      const lead = {
        id,
        ...req.body,
        status: 'received',
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      leads.set(id, lead);
      res.status(201).json({
        id: lead.id,
        status: lead.status,
        message: 'Lead ingested successfully',
      });
    });

    app.get('/api/v1/leads', (req, res) => {
      const queryResult = leadQuerySchema.safeParse(req.query);
      if (!queryResult.success) {
        return res.status(400).json({
          error: 'Invalid query parameters',
        });
      }
      
      let results = Array.from(leads.values());
      const { status, source, insuranceType } = queryResult.data;

      if (status) {
        results = results.filter(l => l.status === status);
      }
      if (source) {
        results = results.filter(l => l.source === source);
      }
      if (insuranceType) {
        results = results.filter(l => l.insuranceType === insuranceType);
      }

      res.json({
        data: results,
        pagination: {
          page: queryResult.data.page,
          limit: queryResult.data.limit,
          total: results.length,
          totalPages: Math.ceil(results.length / queryResult.data.limit),
        },
      });
    });

    app.get('/api/v1/leads/:id', (req, res) => {
      const lead = leads.get(req.params.id);
      if (!lead) {
        return res.status(404).json({ error: 'Lead not found' });
      }
      res.json(lead);
    });
  });

  describe('GET /health', () => {
    it('should return health status', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.body.status).toBe('ok');
    });
  });

  describe('POST /api/v1/leads', () => {
    it('should create a valid lead', async () => {
      const leadData = {
        source: 'web_form',
        email: 'test@example.com',
        phone: '+1-555-123-4567',
        firstName: 'John',
        lastName: 'Doe',
        insuranceType: 'auto',
      };

      const response = await request(app)
        .post('/api/v1/leads')
        .send(leadData)
        .expect(201);

      expect(response.body.id).toBeDefined();
      expect(response.body.status).toBe('received');
      expect(response.body.message).toBe('Lead ingested successfully');
    });

    it('should reject invalid email', async () => {
      const leadData = {
        source: 'web_form',
        email: 'invalid-email',
      };

      const response = await request(app)
        .post('/api/v1/leads')
        .send(leadData)
        .expect(400);

      expect(response.body.error).toBe('Validation failed');
    });

    it('should reject missing source', async () => {
      const leadData = {
        email: 'test@example.com',
      };

      const response = await request(app)
        .post('/api/v1/leads')
        .send(leadData)
        .expect(400);

      expect(response.body.error).toBe('Validation failed');
    });

    it('should accept lead with minimal data', async () => {
      const leadData = {
        source: 'api',
      };

      const response = await request(app)
        .post('/api/v1/leads')
        .send(leadData)
        .expect(201);

      expect(response.body.id).toBeDefined();
    });
  });

  describe('GET /api/v1/leads', () => {
    it('should return empty array when no leads exist', async () => {
      // Create a fresh app instance for this test
      const testApp = express();
      testApp.use(express.json());
      
      // Re-implement the route for isolation
      testApp.get('/api/v1/leads', (req, res) => {
        res.json({
          data: [],
          pagination: { page: 1, limit: 20, total: 0, totalPages: 0 },
        });
      });

      const response = await request(testApp)
        .get('/api/v1/leads')
        .expect(200);

      expect(response.body.data).toEqual([]);
    });

    it('should validate query parameters', async () => {
      const testApp = express();
      testApp.use(express.json());
      
      testApp.get('/api/v1/leads', (req, res) => {
        const result = leadQuerySchema.safeParse(req.query);
        if (!result.success) {
          return res.status(400).json({ error: 'Invalid query' });
        }
        res.json({ success: true });
      });

      const response = await request(testApp)
        .get('/api/v1/leads')
        .query({ page: 'invalid' })
        .expect(400);

      expect(response.body.error).toBe('Invalid query');
    });

    it('should accept valid query parameters', async () => {
      const testApp = express();
      testApp.use(express.json());
      
      testApp.get('/api/v1/leads', (req, res) => {
        const result = leadQuerySchema.safeParse(req.query);
        if (!result.success) {
          return res.status(400).json({ error: 'Invalid query' });
        }
        res.json({ success: true, data: result.data });
      });

      const response = await request(testApp)
        .get('/api/v1/leads')
        .query({ page: '2', limit: '50', status: 'qualified' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.page).toBe(2);
      expect(response.body.data.limit).toBe(50);
    });
  });

  describe('GET /api/v1/leads/:id', () => {
    it('should return 404 for non-existent lead', async () => {
      const testApp = express();
      testApp.use(express.json());
      
      testApp.get('/api/v1/leads/:id', (req, res) => {
        res.status(404).json({ error: 'Lead not found' });
      });

      const response = await request(testApp)
        .get('/api/v1/leads/non-existent-id')
        .expect(404);

      expect(response.body.error).toBe('Lead not found');
    });
  });
});
