import { describe, it, expect, beforeAll, afterAll, jest } from '@jest/globals';
import { EducationService } from '../../apps/data-service/src/services/education.service.js';
import { EducationRepository } from '../../apps/data-service/src/repositories/education.repository.js';
import { PrismaClient } from '@prisma/client';
import { CreateCourseDto } from '@insurance-lead-gen/types';

// Mock EducationRepository
const mockEducationRepository = {
  createCourse: jest.fn(),
  updateCourse: jest.fn(),
  getCourse: jest.fn(),
  getCourses: jest.fn(),
  deleteCourse: jest.fn(),
  createLearningPath: jest.fn(),
  updateLearningPath: jest.fn(),
  getLearningPath: jest.fn(),
  getLearningPaths: jest.fn(),
  enrollInCourse: jest.fn(),
  enrollInLearningPath: jest.fn(),
  getEnrollments: jest.fn(),
  updateModuleProgress: jest.fn(),
  submitQuiz: jest.fn(),
  updateAgentEducation: jest.fn(),
  getAgentEducationProfile: jest.fn(),
  getEducationStats: jest.fn(),
} as any;

// Mock PrismaClient
const mockPrisma = {
  agent: {
    findUnique: jest.fn(),
    update: jest.fn(),
  },
  courseEnrollment: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    count: jest.fn(),
    update: jest.fn(),
  },
  courseCertification: {
    create: jest.fn(),
    count: jest.fn(),
  },
  moduleProgress: {
    findUnique: jest.fn(),
  },
} as any;

describe('EducationService Unit Tests', () => {
  let educationService: EducationService;
  let educationRepository: EducationRepository;
  let prisma: PrismaClient;

  beforeAll(() => {
    educationRepository = mockEducationRepository as EducationRepository;
    prisma = mockPrisma;
    educationService = new EducationService(educationRepository, prisma);
  });

  afterAll(() => {
    jest.clearAllMocks();
  });

  describe('Course Management', () => {
    it('should create a course successfully', async () => {
      const courseData: CreateCourseDto = {
        title: 'Introduction to Insurance',
        description: 'Learn the basics of insurance',
        category: 'PRODUCT_TRAINING' as any,
        level: 'BEGINNER' as any,
        duration: 60,
        tags: ['basics', 'intro'],
      };

      const mockCourse = { id: 'course-123', ...courseData, createdAt: new Date() };
      mockEducationRepository.createCourse.mockResolvedValue(mockCourse);

      const result = await educationService.createCourse(courseData, 'admin-123');

      expect(result).toEqual(mockCourse);
      expect(mockEducationRepository.createCourse).toHaveBeenCalledWith({
        ...courseData,
        createdBy: 'admin-123',
      });
    });

    it('should validate prerequisites when creating a course', async () => {
      const courseData = {
        title: 'Advanced Insurance',
        prerequisites: ['course-123'],
      };

      mockEducationRepository.getCourse.mockResolvedValueOnce(null);

      await expect(educationService.createCourse(courseData as any)).rejects.toThrow(
        'Prerequisite course not found: course-123'
      );
    });
  });

  describe('Enrollment Management', () => {
    it('should enroll an agent in a course', async () => {
      const courseId = 'course-123';
      const agentId = 'agent-123';
      const mockCourse = { id: courseId, title: 'Intro', prerequisites: [] };
      const mockAgent = { id: agentId, name: 'Agent Smith' };
      const mockEnrollment = { id: 'enroll-123', courseId, agentId, status: 'ENROLLED' };

      mockEducationRepository.getCourse.mockResolvedValue(mockCourse);
      mockPrisma.agent.findUnique.mockResolvedValue(mockAgent);
      mockPrisma.courseEnrollment.count.mockResolvedValue(0);
      mockEducationRepository.enrollInCourse.mockResolvedValue(mockEnrollment);
      mockPrisma.agent.update.mockResolvedValue(mockAgent);

      const result = await educationService.enrollInCourse(courseId, { agentId });

      expect(result).toEqual(mockEnrollment);
      expect(mockEducationRepository.enrollInCourse).toHaveBeenCalledWith(courseId, { agentId });
    });

    it('should throw error if course not found during enrollment', async () => {
      mockEducationRepository.getCourse.mockResolvedValue(null);

      await expect(
        educationService.enrollInCourse('invalid-course', { agentId: 'agent-123' })
      ).rejects.toThrow('Course not found');
    });

    it('should check agent capacity before enrollment', async () => {
      const courseId = 'course-123';
      const agentId = 'agent-123';
      mockEducationRepository.getCourse.mockResolvedValue({ id: courseId, prerequisites: [] });
      mockPrisma.agent.findUnique.mockResolvedValue({ id: agentId });
      mockPrisma.courseEnrollment.count.mockResolvedValue(5); // Max capacity reached

      await expect(educationService.enrollInCourse(courseId, { agentId })).rejects.toThrow(
        'Maximum concurrent course limit reached (5)'
      );
    });
  });

  describe('Progress Tracking', () => {
    it('should update module progress', async () => {
      const moduleProgressId = 'mp-123';
      const updateData = { status: 'COMPLETED', progress: 100, timeSpent: 30 };
      const mockProgress = { id: moduleProgressId, enrollmentId: 'enroll-123', ...updateData };

      mockEducationRepository.updateModuleProgress.mockResolvedValue(mockProgress);
      mockPrisma.courseEnrollment.findUnique.mockResolvedValue(null); // Simple case: no completion check

      const result = await educationService.updateModuleProgress(
        moduleProgressId,
        updateData as any
      );

      expect(result).toEqual(mockProgress);
      expect(mockEducationRepository.updateModuleProgress).toHaveBeenCalledWith(
        moduleProgressId,
        updateData
      );
    });
  });

  describe('Analytics and Profile', () => {
    it('should return agent education profile with completion rate', async () => {
      const agentId = 'agent-123';
      const mockProfile = {
        agentId,
        progressStats: {
          totalCoursesEnrolled: 10,
          totalCoursesCompleted: 5,
        },
      };

      mockEducationRepository.getAgentEducationProfile.mockResolvedValue(mockProfile);

      const result = await educationService.getAgentEducationProfile(agentId);

      expect(result?.progressStats.completionRate).toBe(50);
    });

    it('should return null if agent profile not found', async () => {
      mockEducationRepository.getAgentEducationProfile.mockResolvedValue(null);

      const result = await educationService.getAgentEducationProfile('invalid-agent');

      expect(result).toBeNull();
    });
  });
});
