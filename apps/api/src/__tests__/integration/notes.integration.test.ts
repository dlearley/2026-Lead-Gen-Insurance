import request from 'supertest';
import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { app } from '../../app.js';
import { prisma } from '@insurance-lead-gen/data-service';

const AUTH_HEADER = { Authorization: 'Bearer dev-token' };

describe('Notes API Integration Tests', () => {
  let testLeadId: string;
  let createdNotes: string[] = [];

  beforeEach(async () => {
    // Create test lead
    const lead = await prisma.lead.create({
      data: {
        firstName: 'Notes',
        lastName: 'Test',
        email: 'notes-test@example.com',
        phone: '+1-555-0200',
        source: 'WEB_FORM',
        status: 'RECEIVED',
      },
    });
    testLeadId = lead.id;
  });

  afterEach(async () => {
    // Clean up test data
    if (createdNotes.length > 0) {
      await prisma.note.deleteMany({
        where: {
          id: {
            in: createdNotes,
          },
        },
      });
      createdNotes = [];
    }
    if (testLeadId) {
      await prisma.lead.delete({
        where: { id: testLeadId },
      });
    }
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
        success: true,
        data: {
          id: expect.any(String),
          leadId: testLeadId,
          content: 'This is a test note',
          visibility: 'TEAM',
          type: 'general',
        },
      });

      createdNotes.push(response.body.data.id);
    });

    it('should create a note with custom visibility', async () => {
      const newNote = {
        content: 'This is a private note',
        visibility: 'PRIVATE',
      };

      const response = await request(app)
        .post(`/api/v1/leads/${testLeadId}/notes`)
        .set(AUTH_HEADER)
        .send(newNote)
        .expect(201);

      expect(response.body.data.visibility).toBe('PRIVATE');
      createdNotes.push(response.body.data.id);
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

    it('should return 404 for non-existent lead', async () => {
      const response = await request(app)
        .post('/api/v1/leads/00000000-0000-0000-0000-000000000000/notes')
        .set(AUTH_HEADER)
        .send({ content: 'Test' })
        .expect(404);

      expect(response.body).toHaveProperty('error', 'Lead not found');
    });
  });

  describe('GET /api/v1/leads/:leadId/notes', () => {
    beforeEach(async () => {
      // Create test notes
      const note1 = await prisma.note.create({
        data: {
          leadId: testLeadId,
          authorId: '00000000-0000-0000-0000-000000000001',
          content: 'First note',
        },
      });
      createdNotes.push(note1.id);

      const note2 = await prisma.note.create({
        data: {
          leadId: testLeadId,
          authorId: '00000000-0000-0000-0000-000000000001',
          content: 'Second note',
        },
      });
      createdNotes.push(note2.id);
    });

    it('should get all notes for a lead', async () => {
      const response = await request(app)
        .get(`/api/v1/leads/${testLeadId}/notes`)
        .set(AUTH_HEADER)
        .expect(200)
        .expect('Content-Type', /json/);

      expect(response.body).toMatchObject({
        success: true,
        data: expect.any(Array),
        pagination: {
          page: 1,
          limit: 20,
          total: expect.any(Number),
          totalPages: expect.any(Number),
        },
      });

      expect(response.body.data.length).toBeGreaterThanOrEqual(2);
    });

    it('should support pagination', async () => {
      const response = await request(app)
        .get(`/api/v1/leads/${testLeadId}/notes?page=1&limit=1`)
        .set(AUTH_HEADER)
        .expect(200);

      expect(response.body.data.length).toBe(1);
      expect(response.body.pagination.page).toBe(1);
      expect(response.body.pagination.limit).toBe(1);
    });

    it('should return 404 for non-existent lead', async () => {
      await request(app)
        .get('/api/v1/leads/00000000-0000-0000-0000-000000000000/notes')
        .set(AUTH_HEADER)
        .expect(404);
    });
  });

  describe('GET /api/v1/leads/:leadId/notes/:noteId', () => {
    it('should get a specific note', async () => {
      const note = await prisma.note.create({
        data: {
          leadId: testLeadId,
          authorId: '00000000-0000-0000-0000-000000000001',
          content: 'Specific note',
        },
      });
      createdNotes.push(note.id);

      const response = await request(app)
        .get(`/api/v1/leads/${testLeadId}/notes/${note.id}`)
        .set(AUTH_HEADER)
        .expect(200);

      expect(response.body.data.id).toBe(note.id);
      expect(response.body.data.content).toBe('Specific note');
    });

    it('should return 404 for non-existent note', async () => {
      await request(app)
        .get(`/api/v1/leads/${testLeadId}/notes/00000000-0000-0000-0000-000000000000`)
        .set(AUTH_HEADER)
        .expect(404);
    });
  });

  describe('PUT /api/v1/leads/:leadId/notes/:noteId', () => {
    it('should update a note', async () => {
      const note = await prisma.note.create({
        data: {
          leadId: testLeadId,
          authorId: '00000000-0000-0000-0000-000000000001',
          content: 'Original content',
        },
      });
      createdNotes.push(note.id);

      const response = await request(app)
        .put(`/api/v1/leads/${testLeadId}/notes/${note.id}`)
        .set(AUTH_HEADER)
        .send({ content: 'Updated content' })
        .expect(200);

      expect(response.body.data.id).toBe(note.id);
      expect(response.body.data.content).toBe('Updated content');
    });

    it('should update note visibility', async () => {
      const note = await prisma.note.create({
        data: {
          leadId: testLeadId,
          authorId: '00000000-0000-0000-0000-000000000001',
          content: 'Test note',
          visibility: 'TEAM',
        },
      });
      createdNotes.push(note.id);

      const response = await request(app)
        .put(`/api/v1/leads/${testLeadId}/notes/${note.id}`)
        .set(AUTH_HEADER)
        .send({ visibility: 'PUBLIC' })
        .expect(200);

      expect(response.body.data.visibility).toBe('PUBLIC');
    });

    it('should return 404 for non-existent note', async () => {
      await request(app)
        .put(`/api/v1/leads/${testLeadId}/notes/00000000-0000-0000-0000-000000000000`)
        .set(AUTH_HEADER)
        .send({ content: 'Updated' })
        .expect(404);
    });
  });

  describe('DELETE /api/v1/leads/:leadId/notes/:noteId', () => {
    it('should delete a note', async () => {
      const note = await prisma.note.create({
        data: {
          leadId: testLeadId,
          authorId: '00000000-0000-0000-0000-000000000001',
          content: 'Note to delete',
        },
      });

      await request(app)
        .delete(`/api/v1/leads/${testLeadId}/notes/${note.id}`)
        .set(AUTH_HEADER)
        .expect(204);

      const deleted = await prisma.note.findUnique({ where: { id: note.id } });
      expect(deleted).toBeNull();
    });

    it('should return 404 for non-existent note', async () => {
      await request(app)
        .delete(`/api/v1/leads/${testLeadId}/notes/00000000-0000-0000-0000-000000000000`)
        .set(AUTH_HEADER)
        .expect(404);
    });
  });
});
