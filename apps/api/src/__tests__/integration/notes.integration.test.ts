import request from 'supertest';
import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import { app } from '../app.js';
import { prisma } from '@insurance-lead-gen/data-service';

describe('Notes API Integration Tests', () => {
  let testLeadId: string;
  let testNoteId: string;

  beforeAll(async () => {
    await prisma.$connect();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    // Create a test lead
    const lead = await prisma.lead.create({
      data: {
        firstName: 'Notes',
        lastName: 'Test',
        email: 'notes-test@example.com',
        phone: '+1-555-0200',
        insuranceType: 'AUTO',
        source: 'WEB_FORM',
        city: 'Seattle',
        state: 'WA',
        zipCode: '98101',
      },
    });

    testLeadId = lead.id;
  });

  describe('POST /api/v1/leads/:leadId/notes', () => {
    it('should create a new note', async () => {
      const newNote = {
        content: 'This is a test note',
        authorId: 'user_123',
      };

      const response = await request(app)
        .post(`/api/v1/leads/${testLeadId}/notes`)
        .send(newNote)
        .expect(201)
        .expect('Content-Type', /json/);

      expect(response.body).toMatchObject({
        success: true,
        data: {
          id: expect.any(String),
          leadId: testLeadId,
          content: 'This is a test note',
          authorId: 'user_123',
        },
      });

      testNoteId = response.body.data.id;
    });

    it('should validate required fields', async () => {
      const invalidNote = {
        authorId: 'user_123',
      };

      const response = await request(app)
        .post(`/api/v1/leads/${testLeadId}/notes`)
        .send(invalidNote)
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('GET /api/v1/leads/:leadId/notes', () => {
    it('should get all notes for a lead', async () => {
      // Create some notes
      await request(app)
        .post(`/api/v1/leads/${testLeadId}/notes`)
        .send({ content: 'First note', authorId: 'user_1' });

      await request(app)
        .post(`/api/v1/leads/${testLeadId}/notes`)
        .send({ content: 'Second note', authorId: 'user_2' });

      const response = await request(app)
        .get(`/api/v1/leads/${testLeadId}/notes`)
        .expect(200)
        .expect('Content-Type', /json/);

      expect(response.body).toMatchObject({
        success: true,
        data: expect.any(Array),
      });

      expect(response.body.data.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('PUT /api/v1/leads/:leadId/notes/:noteId', () => {
    it('should update a note', async () => {
      // Create a note first
      const createResponse = await request(app)
        .post(`/api/v1/leads/${testLeadId}/notes`)
        .send({ content: 'Original content', authorId: 'user_123' });

      const noteId = createResponse.body.data.id;

      // Update it
      const updateData = {
        content: 'Updated content',
      };

      const response = await request(app)
        .put(`/api/v1/leads/${testLeadId}/notes/${noteId}`)
        .send(updateData)
        .expect(200)
        .expect('Content-Type', /json/);

      expect(response.body).toMatchObject({
        success: true,
        data: {
          id: noteId,
          content: 'Updated content',
        },
      });
    });
  });

  describe('DELETE /api/v1/leads/:leadId/notes/:noteId', () => {
    it('should delete a note', async () => {
      // Create a note first
      const createResponse = await request(app)
        .post(`/api/v1/leads/${testLeadId}/notes`)
        .send({ content: 'Note to delete', authorId: 'user_123' });

      const noteId = createResponse.body.data.id;

      // Delete it
      const response = await request(app)
        .delete(`/api/v1/leads/${testLeadId}/notes/${noteId}`)
        .expect(200)
        .expect('Content-Type', /json/);

      expect(response.body).toMatchObject({
        success: true,
        message: expect.any(String),
      });

      // Verify it's deleted
      await request(app)
        .get(`/api/v1/leads/${testLeadId}/notes/${noteId}`)
        .expect(404);
    });
  });
});
