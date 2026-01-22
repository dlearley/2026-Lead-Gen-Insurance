import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import request from 'supertest';
import { app } from '../../../apps/api/src/app.js';
import { PrismaClient } from '@prisma/client';

let prisma: PrismaClient;
let authToken: string;

describe('Education API Integration Tests', () => {
  beforeAll(async () => {
    prisma = new PrismaClient();
    await prisma.$connect();

    // In a real scenario, we would login to get a token
    authToken = 'test-api-token';
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('GET /api/v1/broker-education/courses', () => {
    it('should return a list of courses', async () => {
      const response = await request(app)
        .get('/api/v1/broker-education/courses')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });
  });

  describe('POST /api/v1/broker-education/courses', () => {
    it('should create a new course', async () => {
      const courseData = {
        title: 'Integration Test Course',
        description: 'Testing the API',
        category: 'technology',
        level: 'beginner',
        estimatedHours: 2,
      };

      const response = await request(app)
        .post('/api/v1/broker-education/courses')
        .set('Authorization', `Bearer ${authToken}`)
        .send(courseData)
        .expect(201);

      expect(response.body.title).toBe(courseData.title);
      expect(response.body.id).toBeDefined();

      // Cleanup
      await (prisma.course as any).delete({ where: { id: response.body.id } });
    });
  });

  describe('Enrollment Flow', () => {
    let courseId: string;

    beforeAll(async () => {
      // Create a test course
      const course = await (prisma.course as any).create({
        data: {
          title: 'Enrollment Test Course',
          description: 'Testing enrollment',
          category: 'compliance',
          level: 'beginner',
          status: 'PUBLISHED',
        },
      });
      courseId = course.id;
    });

    afterAll(async () => {
      if (courseId) {
        await (prisma.course as any).delete({ where: { id: courseId } });
      }
    });

    it('should enroll an agent in a course', async () => {
      const agentId = 'test-agent-123';

      const response = await request(app)
        .post('/api/v1/broker-education/enrollments')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ courseId, agentId })
        .expect(201);

      expect(response.body.courseId).toBe(courseId);
      expect(response.body.agentId).toBe(agentId);

      // Cleanup
      await (prisma.enrollment as any).delete({ where: { id: response.body.id } });
    });
  });
});
