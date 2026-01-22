import { describe, it, expect, beforeAll, afterAll, jest } from '@jest/globals';
import { BrokerEducationService } from '../../apps/data-service/src/services/broker-education.service.js';
import { CreateCourseDto, CreateModuleDto, CreateLessonDto } from '@insurance-lead-gen/types';

// Mock PrismaClient
const mockPrisma = {
  course: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
  },
  module: {
    create: jest.fn(),
    delete: jest.fn(),
    findUnique: jest.fn(),
  },
  lesson: {
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
    findUnique: jest.fn(),
  },
} as any;

// Mock the global prisma instance if it's used directly in the service
jest.mock('../../apps/data-service/src/prisma/client.js', () => ({
  prisma: mockPrisma,
}));

describe('BrokerEducationService Unit Tests', () => {
  let brokerEducationService: BrokerEducationService;

  beforeAll(() => {
    brokerEducationService = new BrokerEducationService();
  });

  afterAll(() => {
    jest.clearAllMocks();
  });

  describe('Course Management', () => {
    it('should get courses with filters', async () => {
      const mockCourses = [{ id: 'course-1', title: 'Test Course' }];
      mockPrisma.course.findMany.mockResolvedValue(mockCourses);

      const result = await brokerEducationService.getCourses({ category: 'technology' });

      expect(result).toEqual(mockCourses);
      expect(mockPrisma.course.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ category: 'technology' }),
        })
      );
    });

    it('should create a course', async () => {
      const dto: CreateCourseDto = {
        title: 'New Course',
        description: 'Desc',
        category: 'compliance' as any,
        level: 'beginner' as any,
      };
      const mockCourse = { id: 'course-new', ...dto };
      mockPrisma.course.create.mockResolvedValue(mockCourse);

      const result = await brokerEducationService.createCourse(dto);

      expect(result).toEqual(mockCourse);
      expect(mockPrisma.course.create).toHaveBeenCalled();
    });

    it('should publish a course', async () => {
      const courseId = 'course-123';
      const mockCourse = { id: courseId, status: 'PUBLISHED' };
      mockPrisma.course.update.mockResolvedValue(mockCourse);

      const result = await brokerEducationService.publishCourse(courseId);

      expect(result.status).toBe('PUBLISHED');
      expect(mockPrisma.course.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: courseId },
          data: expect.objectContaining({ status: 'PUBLISHED' }),
        })
      );
    });
  });

  describe('Module & Lesson Management', () => {
    it('should create a module and update course lesson count', async () => {
      const dto: CreateModuleDto = {
        title: 'Mod 1',
        courseId: 'course-1',
        order: 1,
        description: 'Desc',
        type: 'VIDEO' as any,
      };
      const mockModule = { id: 'mod-1', ...dto };

      mockPrisma.module.create.mockResolvedValue(mockModule);
      mockPrisma.lesson.count.mockResolvedValue(0);
      mockPrisma.course.update.mockResolvedValue({});

      const result = await brokerEducationService.createModule(dto);

      expect(result).toEqual(mockModule);
      expect(mockPrisma.module.create).toHaveBeenCalledWith({ data: dto });
      expect(mockPrisma.course.update).toHaveBeenCalled();
    });

    it('should create a lesson', async () => {
      const dto: CreateLessonDto = {
        title: 'Lesson 1',
        moduleId: 'mod-1',
        content: '...',
        order: 1,
        type: 'VIDEO' as any,
        duration: 10,
      };
      const mockLesson = { id: 'lesson-1', ...dto };
      const mockModule = { id: 'mod-1', courseId: 'course-1' };

      mockPrisma.lesson.create.mockResolvedValue(mockLesson);
      mockPrisma.lesson.count.mockResolvedValue(1);
      mockPrisma.module.findUnique.mockResolvedValue(mockModule);
      mockPrisma.course.update.mockResolvedValue({});

      const result = await brokerEducationService.createLesson(dto);

      expect(result).toEqual(mockLesson);
      expect(mockPrisma.lesson.create).toHaveBeenCalled();
    });
  });
});
