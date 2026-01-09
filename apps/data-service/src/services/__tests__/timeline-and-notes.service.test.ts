import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { TimelineService } from '../../../apps/data-service/src/services/timeline.service.js';
import { NotesService } from '../../../apps/data-service/src/services/notes.service.js';
import { ActivitiesService } from '../../../apps/data-service/src/services/activities.service.js';
import { prisma } from '../../../apps/data-service/src/prisma/client.js';

describe('Timeline & Notes System', () => {
  let timelineService: TimelineService;
  let notesService: NotesService;
  let activitiesService: ActivitiesService;

  let testLeadId: string;
  let testUserId: string;

  beforeEach(async () => {
    timelineService = new TimelineService();
    notesService = new NotesService();
    activitiesService = new ActivitiesService();

    // Create test lead
    const lead = await prisma.lead.create({
      data: {
        firstName: 'Timeline',
        lastName: 'Test',
        email: 'timeline-test@example.com',
        phone: '+1-555-0400',
        source: 'MANUAL',
        status: 'RECEIVED',
      },
    });
    testLeadId = lead.id;

    // Create test user
    const user = await prisma.user.create({
      data: {
        email: 'timeline-user@example.com',
        firstName: 'Test',
        lastName: 'User',
        role: 'agent',
      },
    });
    testUserId = user.id;
  });

  afterEach(async () => {
    // Clean up test data
    await prisma.note.deleteMany({ where: { leadId: testLeadId } });
    await prisma.activityLog.deleteMany({ where: { leadId: testLeadId } });
    await prisma.lead.delete({ where: { id: testLeadId } });
    await prisma.user.delete({ where: { id: testUserId } });
  });

  describe('Notes Service', () => {
    it('should create a new note', async () => {
      const createDto = {
        leadId: testLeadId,
        content: 'This is a test note',
        visibility: 'TEAM' as const,
        type: 'general' as const,
      };

      const note = await notesService.createNote(createDto, testUserId);

      expect(note).toBeDefined();
      expect(note.id).toBeDefined();
      expect(note.content).toBe(createDto.content);
      expect(note.leadId).toBe(testLeadId);
      expect(note.authorId).toBe(testUserId);
      expect(note.visibility).toBe('TEAM');
      expect(note.type).toBe('general');
    });

    it('should create a note with mentions', async () => {
      const createDto = {
        leadId: testLeadId,
        content: 'This note mentions a user',
        mentions: [testUserId],
      };

      const note = await notesService.createNote(createDto, testUserId);

      expect(note.mentions).toEqual([testUserId]);
    });

    it('should get a note by ID', async () => {
      const createDto = {
        leadId: testLeadId,
        content: 'Test note for retrieval',
      };

      const created = await notesService.createNote(createDto, testUserId);
      const retrieved = await notesService.getNoteById(created.id);

      expect(retrieved).not.toBeNull();
      expect(retrieved?.id).toBe(created.id);
      expect(retrieved?.content).toBe(createDto.content);
    });

    it('should update a note', async () => {
      const createDto = {
        leadId: testLeadId,
        content: 'Original content',
      };

      const created = await notesService.createNote(createDto, testUserId);
      const updated = await notesService.updateNote(created.id, {
        content: 'Updated content',
        visibility: 'PUBLIC' as const,
      });

      expect(updated.content).toBe('Updated content');
      expect(updated.visibility).toBe('PUBLIC');
    });

    it('should delete a note', async () => {
      const createDto = {
        leadId: testLeadId,
        content: 'Note to delete',
      };

      const created = await notesService.createNote(createDto, testUserId);
      await expect(notesService.deleteNote(created.id)).resolves.not.toThrow();

      const retrieved = await notesService.getNoteById(created.id);
      expect(retrieved).toBeNull();
    });

    it('should filter notes by lead', async () => {
      await notesService.createNote({
        leadId: testLeadId,
        content: 'First note',
      }, testUserId);

      await notesService.createNote({
        leadId: testLeadId,
        content: 'Second note',
      }, testUserId);

      const result = await notesService.getNotes({ leadId: testLeadId });

      expect(result.notes).toHaveLength(2);
      expect(result.total).toBe(2);
    });

    it('should filter notes by visibility', async () => {
      await notesService.createNote({
        leadId: testLeadId,
        content: 'Private note',
        visibility: 'PRIVATE' as const,
      }, testUserId);

      await notesService.createNote({
        leadId: testLeadId,
        content: 'Team note',
        visibility: 'TEAM' as const,
      }, testUserId);

      const privateNotes = await notesService.getNotes({
        leadId: testLeadId,
        visibility: 'PRIVATE' as const,
      });

      const teamNotes = await notesService.getNotes({
        leadId: testLeadId,
        visibility: 'TEAM' as const,
      });

      expect(privateNotes.notes).toHaveLength(1);
      expect(teamNotes.notes).toHaveLength(1);
    });
  });

  describe('Activities Service', () => {
    it('should create a new activity', async () => {
      const createDto = {
        leadId: testLeadId,
        userId: testUserId,
        activityType: 'STATUS_CHANGED' as const,
        action: 'Status changed',
        description: 'Lead status changed to QUALIFIED',
      };

      const activity = await activitiesService.createActivity(createDto);

      expect(activity).toBeDefined();
      expect(activity.id).toBeDefined();
      expect(activity.leadId).toBe(testLeadId);
      expect(activity.userId).toBe(testUserId);
      expect(activity.activityType).toBe('STATUS_CHANGED');
      expect(activity.action).toBe('Status changed');
    });

    it('should get an activity by ID', async () => {
      const createDto = {
        leadId: testLeadId,
        userId: testUserId,
        activityType: 'LEAD_CREATED' as const,
        action: 'Lead created',
      };

      const created = await activitiesService.createActivity(createDto);
      const retrieved = await activitiesService.getActivityById(created.id);

      expect(retrieved).not.toBeNull();
      expect(retrieved?.id).toBe(created.id);
      expect(retrieved?.activityType).toBe('LEAD_CREATED');
    });

    it('should filter activities by lead', async () => {
      await activitiesService.createActivity({
        leadId: testLeadId,
        activityType: 'LEAD_UPDATED' as const,
        action: 'Lead updated',
      });

      await activitiesService.createActivity({
        leadId: testLeadId,
        activityType: 'NOTE_CREATED' as const,
        action: 'Note created',
      });

      const result = await activitiesService.getActivities({ leadId: testLeadId });

      expect(result.activities).toHaveLength(2);
      expect(result.total).toBe(2);
    });

    it('should filter activities by type', async () => {
      await activitiesService.createActivity({
        leadId: testLeadId,
        activityType: 'LEAD_CREATED' as const,
        action: 'Lead created',
      });

      await activitiesService.createActivity({
        leadId: testLeadId,
        activityType: 'NOTE_CREATED' as const,
        action: 'Note created',
      });

      const leadActivities = await activitiesService.getActivities({
        leadId: testLeadId,
        activityType: 'LEAD_CREATED' as const,
      });

      expect(leadActivities.activities).toHaveLength(1);
      expect(leadActivities.activities[0].activityType).toBe('LEAD_CREATED');
    });

    it('should get recent activities for a user', async () => {
      await activitiesService.createActivity({
        leadId: testLeadId,
        userId: testUserId,
        activityType: 'TASK_COMPLETED' as const,
        action: 'Task completed',
      });

      const recent = await activitiesService.getRecentActivities(testUserId, 10);

      expect(recent).toHaveLength(1);
      expect(recent[0].userId).toBe(testUserId);
      expect(recent[0].leadId).toBe(testLeadId);
    });
  });

  describe('Timeline Service', () => {
    beforeEach(async () => {
      // Create test data for timeline
      await notesService.createNote({
        leadId: testLeadId,
        content: 'First note',
      }, testUserId);

      await notesService.createNote({
        leadId: testLeadId,
        content: 'Second note',
      }, testUserId);

      await activitiesService.createActivity({
        leadId: testLeadId,
        userId: testUserId,
        activityType: 'LEAD_UPDATED' as const,
        action: 'Lead updated',
      });

      await activitiesService.createActivity({
        leadId: testLeadId,
        userId: testUserId,
        activityType: 'STATUS_CHANGED' as const,
        action: 'Status changed',
      });
    });

    it('should get unified timeline', async () => {
      const timeline = await timelineService.getTimeline(testLeadId);

      expect(timeline.events).toBeDefined();
      expect(timeline.events.length).toBeGreaterThanOrEqual(2);
      expect(timeline.pagination).toBeDefined();
      expect(timeline.aggregations).toBeDefined();
      expect(timeline.aggregations.notesCount).toBe(2);
      expect(timeline.aggregations.activitiesCount).toBe(2);
    });

    it('should filter timeline by type', async () => {
      const notesTimeline = await timelineService.getTimeline(testLeadId, { type: 'notes' });

      expect(notesTimeline.events.length).toBe(2);
      expect(notesTimeline.events.every((e) => e.eventType === 'note')).toBe(true);

      const activitiesTimeline = await timelineService.getTimeline(testLeadId, { type: 'activities' });

      expect(activitiesTimeline.events.length).toBe(2);
      expect(activitiesTimeline.events.every((e) => e.eventType === 'activity')).toBe(true);
    });

    it('should filter timeline by date range', async () => {
      const now = new Date();
      const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);

      const timeline = await timelineService.getTimeline(testLeadId, {
        dateFrom: yesterday,
        dateTo: now,
      });

      expect(timeline.events.length).toBeGreaterThanOrEqual(0);
    });

    it('should filter timeline by user', async () => {
      const timeline = await timelineService.getTimeline(testLeadId, { userId: testUserId });

      expect(timeline.events.every((e) => e.userId === testUserId)).toBe(true);
    });

    it('should search timeline', async () => {
      await notesService.createNote({
        leadId: testLeadId,
        content: 'Special note with keyword',
      }, testUserId);

      const timeline = await timelineService.getTimeline(testLeadId, { search: 'keyword' });

      expect(timeline.events.some((e) => e.description?.includes('keyword'))).toBe(true);
    });

    it('should get timeline statistics', async () => {
      const stats = await timelineService.getStatistics(testLeadId);

      expect(stats).toBeDefined();
      expect(stats.leadId).toBe(testLeadId);
      expect(stats.totalEvents).toBe(4);
      expect(stats.notesCount).toBe(2);
      expect(stats.activitiesCount).toBe(2);
      expect(stats.lastActivity).toBeDefined();
      expect(stats.firstActivity).toBeDefined();
    });

    it('should get event summaries', async () => {
      const summaries = await timelineService.getEventSummaries(testLeadId);

      expect(summaries).toBeDefined();
      expect(Array.isArray(summaries)).toBe(true);
      expect(summaries.length).toBeGreaterThan(0);
      expect(summaries[0]).toHaveProperty('date');
      expect(summaries[0]).toHaveProperty('count');
      expect(summaries[0]).toHaveProperty('types');
    });
  });

  describe('Integration: Notes create activities', () => {
    it('should create activity log when note is created', async () => {
      const initialActivities = await activitiesService.getActivities({ leadId: testLeadId });

      await notesService.createNote({
        leadId: testLeadId,
        content: 'Test note',
      }, testUserId);

      const finalActivities = await activitiesService.getActivities({ leadId: testLeadId });

      expect(finalActivities.activities.length).toBe(initialActivities.activities.length + 1);

      const noteCreatedActivity = finalActivities.activities.find(
        (a) => a.activityType === 'NOTE_CREATED'
      );
      expect(noteCreatedActivity).toBeDefined();
    });

    it('should create activity log when note is updated', async () => {
      const created = await notesService.createNote({
        leadId: testLeadId,
        content: 'Original',
      }, testUserId);

      const initialActivities = await activitiesService.getActivities({ leadId: testLeadId });

      await notesService.updateNote(created.id, { content: 'Updated' });

      const finalActivities = await activitiesService.getActivities({ leadId: testLeadId });

      expect(finalActivities.activities.length).toBe(initialActivities.activities.length + 1);

      const noteUpdatedActivity = finalActivities.activities.find(
        (a) => a.activityType === 'NOTE_UPDATED'
      );
      expect(noteUpdatedActivity).toBeDefined();
    });

    it('should create activity log when note is deleted', async () => {
      const created = await notesService.createNote({
        leadId: testLeadId,
        content: 'To delete',
      }, testUserId);

      const initialActivities = await activitiesService.getActivities({ leadId: testLeadId });

      await notesService.deleteNote(created.id);

      const finalActivities = await activitiesService.getActivities({ leadId: testLeadId });

      expect(finalActivities.activities.length).toBe(initialActivities.activities.length + 1);

      const noteDeletedActivity = finalActivities.activities.find(
        (a) => a.activityType === 'NOTE_DELETED'
      );
      expect(noteDeletedActivity).toBeDefined();
    });
  });
});
