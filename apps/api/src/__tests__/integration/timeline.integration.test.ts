import request from 'supertest';
import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { app } from '../../app.js';
import { prisma } from '@insurance-lead-gen/data-service';

const AUTH_HEADER = { Authorization: 'Bearer dev-token' };

describe('Timeline API Integration Tests', () => {
  let testLeadId: string;
  let testUserId: string;
  let createdNotes: string[] = [];

  beforeEach(async () => {
    // Create test user
    const user = await prisma.user.create({
      data: {
        email: 'timeline-user@example.com',
        firstName: 'Timeline',
        lastName: 'User',
        role: 'agent',
      },
    });
    testUserId = user.id;

    // Create test lead
    const lead = await prisma.lead.create({
      data: {
        firstName: 'Timeline',
        lastName: 'Test',
        email: 'timeline-test@example.com',
        phone: '+1-555-0500',
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
        where: { id: { in: createdNotes } },
      });
      createdNotes = [];
    }

    if (testLeadId) {
      await prisma.activityLog.deleteMany({ where: { leadId: testLeadId } });
      await prisma.lead.delete({ where: { id: testLeadId } });
    }

    if (testUserId) {
      await prisma.user.delete({ where: { id: testUserId } });
    }
  });

  describe('GET /api/v1/leads/:leadId/timeline', () => {
    beforeEach(async () => {
      // Create test notes and activities
      const note1 = await prisma.note.create({
        data: {
          leadId: testLeadId,
          authorId: testUserId,
          content: 'First timeline note',
        },
      });
      createdNotes.push(note1.id);

      const note2 = await prisma.note.create({
        data: {
          leadId: testLeadId,
          authorId: testUserId,
          content: 'Second timeline note',
        },
      });
      createdNotes.push(note2.id);

      await prisma.activityLog.create({
        data: {
          leadId: testLeadId,
          userId: testUserId,
          activityType: 'LEAD_UPDATED',
          action: 'Lead updated',
          description: 'Updated lead information',
        },
      });

      await prisma.activityLog.create({
        data: {
          leadId: testLeadId,
          userId: testUserId,
          activityType: 'STATUS_CHANGED',
          action: 'Status changed',
          description: 'Status changed to QUALIFIED',
        },
      });
    });

    it('should get unified timeline for a lead', async () => {
      const response = await request(app)
        .get(`/api/v1/leads/${testLeadId}/timeline`)
        .set(AUTH_HEADER)
        .expect(200)
        .expect('Content-Type', /json/);

      expect(response.body).toMatchObject({
        success: true,
        data: expect.any(Array),
        pagination: {
          page: 1,
          limit: 50,
          total: expect.any(Number),
          totalPages: expect.any(Number),
        },
        aggregations: {
          notesCount: expect.any(Number),
          activitiesCount: expect.any(Number),
          emailsCount: 0,
          tasksCount: 0,
          callsCount: 0,
          meetingsCount: 0,
        },
      });

      expect(response.body.data.length).toBeGreaterThanOrEqual(2);
      expect(response.body.aggregations.notesCount).toBe(2);
      expect(response.body.aggregations.activitiesCount).toBe(2);
    });

    it('should filter timeline by type - notes', async () => {
      const response = await request(app)
        .get(`/api/v1/leads/${testLeadId}/timeline?type=notes`)
        .set(AUTH_HEADER)
        .expect(200);

      expect(response.body.data.every((e: any) => e.eventType === 'note')).toBe(true);
      expect(response.body.data.length).toBe(2);
    });

    it('should filter timeline by type - activities', async () => {
      const response = await request(app)
        .get(`/api/v1/leads/${testLeadId}/timeline?type=activities`)
        .set(AUTH_HEADER)
        .expect(200);

      expect(response.body.data.every((e: any) => e.eventType === 'activity')).toBe(true);
      expect(response.body.data.length).toBe(2);
    });

    it('should filter timeline by user', async () => {
      const response = await request(app)
        .get(`/api/v1/leads/${testLeadId}/timeline?userId=${testUserId}`)
        .set(AUTH_HEADER)
        .expect(200);

      expect(response.body.data.every((e: any) => e.userId === testUserId)).toBe(true);
    });

    it('should search timeline content', async () => {
      const response = await request(app)
        .get(`/api/v1/leads/${testLeadId}/timeline?search=timeline`)
        .set(AUTH_HEADER)
        .expect(200);

      const hasMatch = response.body.data.some((e: any) =>
        e.description?.toLowerCase().includes('timeline') ||
        e.title?.toLowerCase().includes('timeline')
      );
      expect(hasMatch).toBe(true);
    });

    it('should support pagination', async () => {
      const response = await request(app)
        .get(`/api/v1/leads/${testLeadId}/timeline?page=1&limit=2`)
        .set(AUTH_HEADER)
        .expect(200);

      expect(response.body.data.length).toBeLessThanOrEqual(2);
      expect(response.body.pagination.page).toBe(1);
      expect(response.body.pagination.limit).toBe(2);
    });

    it('should return 404 for non-existent lead', async () => {
      await request(app)
        .get('/api/v1/leads/00000000-0000-0000-0000-000000000000/timeline')
        .set(AUTH_HEADER)
        .expect(404);
    });
  });

  describe('GET /api/v1/leads/:leadId/timeline/statistics', () => {
    beforeEach(async () => {
      // Create test data
      const note1 = await prisma.note.create({
        data: {
          leadId: testLeadId,
          authorId: testUserId,
          content: 'Note 1',
        },
      });
      createdNotes.push(note1.id);

      const note2 = await prisma.note.create({
        data: {
          leadId: testLeadId,
          authorId: testUserId,
          content: 'Note 2',
        },
      });
      createdNotes.push(note2.id);

      await prisma.activityLog.create({
        data: {
          leadId: testLeadId,
          userId: testUserId,
          activityType: 'LEAD_CREATED',
          action: 'Lead created',
        },
      });
    });

    it('should get timeline statistics', async () => {
      const response = await request(app)
        .get(`/api/v1/leads/${testLeadId}/timeline/statistics`)
        .set(AUTH_HEADER)
        .expect(200)
        .expect('Content-Type', /json/);

      expect(response.body).toMatchObject({
        success: true,
        data: {
          leadId: testLeadId,
          totalEvents: expect.any(Number),
          notesCount: 2,
          activitiesCount: 1,
          emailsCount: 0,
          tasksCount: 0,
          callsCount: 0,
          lastActivity: expect.any(String),
          firstActivity: expect.any(String),
          averageActivitiesPerDay: expect.any(Number),
        },
      });
    });

    it('should identify most active user', async () => {
      const response = await request(app)
        .get(`/api/v1/leads/${testLeadId}/timeline/statistics`)
        .set(AUTH_HEADER)
        .expect(200);

      expect(response.body.data.mostActiveUser).toBeDefined();
      expect(response.body.data.mostActiveUser.userId).toBe(testUserId);
      expect(response.body.data.mostActiveUser.activityCount).toBeGreaterThan(0);
    });

    it('should return 404 for non-existent lead', async () => {
      await request(app)
        .get('/api/v1/leads/00000000-0000-0000-0000-000000000000/timeline/statistics')
        .set(AUTH_HEADER)
        .expect(404);
    });
  });

  describe('Timeline integration with notes', () => {
    it('should include newly created notes in timeline', async () => {
      // Get initial timeline
      const initialResponse = await request(app)
        .get(`/api/v1/leads/${testLeadId}/timeline`)
        .set(AUTH_HEADER)
        .expect(200);

      const initialCount = initialResponse.body.data.length;

      // Create a new note
      const note = await prisma.note.create({
        data: {
          leadId: testLeadId,
          authorId: testUserId,
          content: 'New timeline note',
        },
      });
      createdNotes.push(note.id);

      // Get updated timeline
      const updatedResponse = await request(app)
        .get(`/api/v1/leads/${testLeadId}/timeline`)
        .set(AUTH_HEADER)
        .expect(200);

      expect(updatedResponse.body.data.length).toBe(initialCount + 1);
      expect(
        updatedResponse.body.data.some((e: any) => e.id === note.id)
      ).toBe(true);
    });

    it('should show correct activity after note update', async () => {
      // Create a note
      const note = await prisma.note.create({
        data: {
          leadId: testLeadId,
          authorId: testUserId,
          content: 'Original content',
        },
      });
      createdNotes.push(note.id);

      // Update the note via API
      await request(app)
        .put(`/api/v1/leads/${testLeadId}/notes/${note.id}`)
        .set(AUTH_HEADER)
        .send({ content: 'Updated content' })
        .expect(200);

      // Get timeline
      const response = await request(app)
        .get(`/api/v1/leads/${testLeadId}/timeline`)
        .set(AUTH_HEADER)
        .expect(200);

      // Should have NOTE_UPDATED activity
      const hasUpdateActivity = response.body.data.some((e: any) =>
        e.eventType === 'activity' && e.type === 'NOTE_UPDATED'
      );
      expect(hasUpdateActivity).toBe(true);
    });
  });
});
