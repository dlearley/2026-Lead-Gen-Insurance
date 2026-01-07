import {
  OpenApiGeneratorV3,
  OpenAPIRegistry,
  extendZodWithOpenApi,
} from '@asteasolutions/zod-to-openapi';
import { z } from 'zod';
import * as yaml from 'js-yaml';
import { createLeadSchema, leadListSchema } from './utils/validation.js';

extendZodWithOpenApi(z);

const registry = new OpenAPIRegistry();

// Security Schemas
registry.registerComponent('securitySchemes', 'BearerAuth', {
  type: 'http',
  scheme: 'bearer',
  bearerFormat: 'JWT',
});

// Common Schemas
const ErrorSchema = registry.register(
  'Error',
  z.object({
    error: z.string().openapi({ example: 'Not found' }),
    details: z.array(z.unknown()).optional(),
  })
);

const LeadSchema = registry.register(
  'Lead',
  z.object({
    id: z.string().uuid().openapi({ example: '550e8400-e29b-41d4-a716-446655440000' }),
    source: z.string().openapi({ example: 'facebook_ads' }),
    email: z.string().email().openapi({ example: 'john@example.com' }),
    phone: z.string().optional().openapi({ example: '+1234567890' }),
    firstName: z.string().optional().openapi({ example: 'John' }),
    lastName: z.string().optional().openapi({ example: 'Doe' }),
    status: z
      .enum(['received', 'processing', 'qualified', 'routed', 'contacted', 'closed'])
      .openapi({ example: 'received' }),
    insuranceType: z.string().optional().openapi({ example: 'AUTO' }),
    createdAt: z.date().openapi({ example: '2024-01-15T10:30:00Z' }),
    updatedAt: z.date().openapi({ example: '2024-01-15T10:30:00Z' }),
  })
);

const NoteSchema = registry.register(
  'Note',
  z.object({
    id: z.string().uuid(),
    leadId: z.string().uuid(),
    authorId: z.string().uuid(),
    content: z.string(),
    visibility: z.enum(['PUBLIC', 'TEAM', 'PRIVATE']),
    createdAt: z.date(),
    updatedAt: z.date(),
  })
);

const TaskSchema = registry.register(
  'Task',
  z.object({
    id: z.string().uuid(),
    leadId: z.string().uuid(),
    title: z.string(),
    status: z.enum(['OPEN', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']),
    priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']),
    dueDate: z.date().optional(),
    createdAt: z.date(),
  })
);

const EmailSchema = registry.register(
  'Email',
  z.object({
    id: z.string().uuid(),
    leadId: z.string().uuid(),
    subject: z.string(),
    to: z.array(z.string().email()),
    status: z.enum(['PENDING', 'SENT', 'FAILED', 'DELIVERED', 'OPENED', 'CLICKED']),
    sentAt: z.date().optional(),
    createdAt: z.date(),
  })
);

// Leads API
registry.registerPath({
  method: 'get',
  path: '/leads',
  summary: 'List leads',
  tags: ['Leads'],
  security: [{ BearerAuth: [] }],
  request: {
    query: leadListSchema,
  },
  responses: {
    200: {
      description: 'List of leads',
      content: {
        'application/json': {
          schema: z.object({
            data: z.array(LeadSchema),
            pagination: z.object({
              skip: z.number(),
              take: z.number(),
              total: z.number(),
            }),
          }),
        },
      },
    },
    401: { description: 'Unauthorized', content: { 'application/json': { schema: ErrorSchema } } },
  },
});

registry.registerPath({
  method: 'post',
  path: '/leads',
  summary: 'Create a new lead',
  tags: ['Leads'],
  security: [{ BearerAuth: [] }],
  request: {
    body: {
      content: {
        'application/json': {
          schema: createLeadSchema,
        },
      },
    },
  },
  responses: {
    201: {
      description: 'Lead created successfully',
      content: {
        'application/json': {
          schema: LeadSchema,
        },
      },
    },
    400: {
      description: 'Validation error',
      content: { 'application/json': { schema: ErrorSchema } },
    },
  },
});

registry.registerPath({
  method: 'get',
  path: '/leads/{leadId}',
  summary: 'Get lead by ID',
  tags: ['Leads'],
  security: [{ BearerAuth: [] }],
  request: {
    params: z.object({ leadId: z.string().uuid() }),
  },
  responses: {
    200: { description: 'Lead found', content: { 'application/json': { schema: LeadSchema } } },
    404: {
      description: 'Lead not found',
      content: { 'application/json': { schema: ErrorSchema } },
    },
  },
});

// Notes API
registry.registerPath({
  method: 'get',
  path: '/leads/{leadId}/notes',
  summary: 'List notes for a lead',
  tags: ['Notes'],
  security: [{ BearerAuth: [] }],
  request: {
    params: z.object({ leadId: z.string().uuid() }),
  },
  responses: {
    200: {
      description: 'List of notes',
      content: {
        'application/json': {
          schema: z.object({
            data: z.array(NoteSchema),
          }),
        },
      },
    },
  },
});

// Tasks API
registry.registerPath({
  method: 'get',
  path: '/leads/{leadId}/tasks',
  summary: 'List tasks for a lead',
  tags: ['Tasks'],
  security: [{ BearerAuth: [] }],
  request: {
    params: z.object({ leadId: z.string().uuid() }),
  },
  responses: {
    200: {
      description: 'List of tasks',
      content: {
        'application/json': {
          schema: z.object({
            data: z.array(TaskSchema),
          }),
        },
      },
    },
  },
});

// Emails API
registry.registerPath({
  method: 'get',
  path: '/leads/{leadId}/emails',
  summary: 'List emails for a lead',
  tags: ['Emails'],
  security: [{ BearerAuth: [] }],
  request: {
    params: z.object({ leadId: z.string().uuid() }),
  },
  responses: {
    200: {
      description: 'List of emails',
      content: {
        'application/json': {
          schema: z.object({
            data: z.array(EmailSchema),
          }),
        },
      },
    },
  },
});

export function generateOpenApiSpec(): object {
  const generator = new OpenApiGeneratorV3(registry.definitions);

  return generator.generateDocument({
    openapi: '3.0.0',
    info: {
      version: '1.0.0',
      title: 'Insurance Lead Generation API',
      description: 'API for managing insurance leads and communication',
      contact: {
        name: 'Developer Support',
        email: 'dev-support@example.com',
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT',
      },
    },
    servers: [
      { url: '/api/v1', description: 'Production API' },
      { url: 'http://localhost:3000/api/v1', description: 'Local Development' },
    ],
  });
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const spec = generateOpenApiSpec();
  console.log(yaml.dump(spec));
}
