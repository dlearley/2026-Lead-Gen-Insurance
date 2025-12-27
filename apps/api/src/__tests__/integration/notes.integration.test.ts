import request from 'supertest';
import { describe, it, expect, beforeEach } from '@jest/globals';
import { app } from '../../app.js';
import { resetStore } from '../../storage/in-memory.js';

const AUTH_HEADER = { Authorization: 'Bearer dev-token' };

describe('Notes API Integration Tests', () => {
  let testLeadId: string;

  beforeEach(async () => {
    resetStore();

    const leadResponse = await request(app)
      .post('/api/v1/leads')
      .set(AUTH_HEADER)
      .send({
        firstName: 'Notes',
        lastName: 'Test',
        email: 'notes-test@example.com',
        phone: '+1-555-0200',
        insuranceType: 'AUTO',
        source: 'WEB_FORM',
        city: 'Seattle',
        state: 'WA',
        zipCode: '98101',
      })
      .expect(201);

    testLeadId = leadResponse.body.id;
  });

  describe('POST /api/v1/leads/:leadId/notes', () => {
    it('should create a new note', async () => {
      const newNote = {
        content: 'This is a test note',
      };

      const response = await request(app)
        .post(`/api/v1/leads/${testLeadId}/notes`)
        .set(AUTH_HEADER)
        .send(newNote)
        .expect(201)
        .expect('Content-Type', /json/);

      expect(response.body).toMatchObject({
        id: expect.any(String),
        leadId: testLeadId,
        content: 'This is a test note',
        authorId: '00000000-0000-0000-0000-000000000001',
      });
    });

    it('should validate required fields', async () => {
      const invalidNote = {};

      const response = await request(app)
        .post(`/api/v1/leads/${testLeadId}/notes`)
        .set(AUTH_HEADER)
        .send(invalidNote)
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('GET /api/v1/leads/:leadId/notes', () => {
    it('should get all notes for a lead', async () => {
      await request(app)
        .post(`/api/v1/leads/${testLeadId}/notes`)
        .set(AUTH_HEADER)
        .send({ content: 'First note' });

      await request(app)
        .post(`/api/v1/leads/${testLeadId}/notes`)
        .set(AUTH_HEADER)
        .send({ content: 'Second note' });

      const response = await request(app)
        .get(`/api/v1/leads/${testLeadId}/notes`)
        .set(AUTH_HEADER)
        .expect(200)
        .expect('Content-Type', /json/);

      expect(response.body).toMatchObject({
        data: expect.any(Array),
        page: 1,
        limit: 20,
        total: expect.any(Number),
        totalPages: expect.any(Number),
      });

      expect(response.body.data.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('PUT /api/v1/leads/:leadId/notes/:noteId', () => {
    it('should update a note', async () => {
      const createResponse = await request(app)
        .post(`/api/v1/leads/${testLeadId}/notes`)
        .set(AUTH_HEADER)
        .send({ content: 'Original content' });

      const noteId = createResponse.body.id;

      const response = await request(app)
        .put(`/api/v1/leads/${testLeadId}/notes/${noteId}`)
        .set(AUTH_HEADER)
        .send({ content: 'Updated content' })
        .expect(200)
        .expect('Content-Type', /json/);

      expect(response.body).toMatchObject({
        id: noteId,
        content: 'Updated content',
      });
    });
  });

  describe('DELETE /api/v1/leads/:leadId/notes/:noteId', () => {
    it('should delete a note', async () => {
      const createResponse = await request(app)
        .post(`/api/v1/leads/${testLeadId}/notes`)
        .set(AUTH_HEADER)
        .send({ content: 'Note to delete' });

      const noteId = createResponse.body.id;

      await request(app)
        .delete(`/api/v1/leads/${testLeadId}/notes/${noteId}`)
        .set(AUTH_HEADER)
        .expect(204);

      await request(app)
        .get(`/api/v1/leads/${testLeadId}/notes/${noteId}`)
        .set(AUTH_HEADER)
        .expect(404);
    });
  });
});
