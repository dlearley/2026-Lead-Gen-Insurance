import { PrismaClient } from '@prisma/client';
import { logger } from '@insurance-lead-gen/core';
import type {
  Course,
  Module,
  Lesson,
  CreateCourseDto,
  UpdateCourseDto,
  CreateModuleDto,
  CreateLessonDto,
} from '@insurance-lead-gen/types';

const prisma = new PrismaClient();

export class BrokerEducationService {
  // ========================================
  // Course Management
  // ========================================

  async getCourses(filters: {
    status?: string;
    category?: string;
    level?: string;
    search?: string;
  } = {}): Promise<Course[]> {
    try {
      const { status, category, level, search } = filters;

      const courses = await prisma.course.findMany({
        where: {
          status: status as any,
          category,
          level: level as any,
          OR: search
            ? [
                { title: { contains: search, mode: 'insensitive' } },
                { description: { contains: search, mode: 'insensitive' } },
              ]
            : undefined,
        },
        include: {
          modules: {
            include: { lessons: true },
            orderBy: { order: 'asc' },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      return courses;
    } catch (error) {
      logger.error('Failed to get courses', { error, filters });
      throw error;
    }
  }

  async getCourseById(id: string): Promise<Course | null> {
    try {
      const course = await prisma.course.findUnique({
        where: { id },
        include: {
          modules: {
            include: { lessons: true },
            orderBy: { order: 'asc' },
          },
          assessments: true,
        },
      });

      return course;
    } catch (error) {
      logger.error('Failed to get course by id', { error, id });
      throw error;
    }
  }

  async createCourse(dto: CreateCourseDto): Promise<Course> {
    try {
      const course = await prisma.course.create({
        data: {
          title: dto.title,
          description: dto.description,
          category: dto.category,
          level: dto.level,
          estimatedHours: dto.estimatedHours,
          prerequisites: dto.prerequisites || [],
          tags: dto.tags || [],
          objectives: dto.objectives || [],
          instructorName: dto.instructorName,
        },
      });

      logger.info('Course created', { courseId: course.id, title: course.title });
      return course;
    } catch (error) {
      logger.error('Failed to create course', { error, dto });
      throw error;
    }
  }

  async updateCourse(id: string, dto: UpdateCourseDto): Promise<Course> {
    try {
      const course = await prisma.course.update({
        where: { id },
        data: {
          ...dto,
          updatedAt: new Date(),
        },
      });

      logger.info('Course updated', { courseId: course.id });
      return course;
    } catch (error) {
      logger.error('Failed to update course', { error, id, dto });
      throw error;
    }
  }

  async publishCourse(id: string): Promise<Course> {
    try {
      const course = await prisma.course.update({
        where: { id },
        data: {
          status: 'PUBLISHED',
          publishedAt: new Date(),
          version: { increment: 1 },
        },
      });

      logger.info('Course published', { courseId: course.id });
      return course;
    } catch (error) {
      logger.error('Failed to publish course', { error, id });
      throw error;
    }
  }

  async deleteCourse(id: string): Promise<void> {
    try {
      await prisma.course.delete({
        where: { id },
      });

      logger.info('Course deleted', { courseId: id });
    } catch (error) {
      logger.error('Failed to delete course', { error, id });
      throw error;
    }
  }

  // ========================================
  // Module Management
  // ========================================

  async createModule(dto: CreateModuleDto): Promise<Module> {
    try {
      const module = await prisma.module.create({
        data: dto,
      });

      // Update course lesson count
      const courseTotalLessons = await prisma.lesson.count({
        where: { moduleId: module.id },
      });
      await prisma.course.update({
        where: { id: dto.courseId },
        data: { totalLessons: courseTotalLessons },
      });

      logger.info('Module created', { moduleId: module.id, courseId: dto.courseId });
      return module;
    } catch (error) {
      logger.error('Failed to create module', { error, dto });
      throw error;
    }
  }

  async deleteModule(id: string): Promise<void> {
    try {
      const module = await prisma.module.findUnique({ where: { id } });
      if (!module) {
        throw new Error('Module not found');
      }

      await prisma.module.delete({ where: { id } });

      // Update course lesson count
      const courseTotalLessons = await prisma.lesson.count({
        where: { moduleId: id },
      });
      await prisma.course.update({
        where: { id: module.courseId },
        data: { totalLessons: courseTotalLessons },
      });

      logger.info('Module deleted', { moduleId: id });
    } catch (error) {
      logger.error('Failed to delete module', { error, id });
      throw error;
    }
  }

  // ========================================
  // Lesson Management
  // ========================================

  async createLesson(dto: CreateLessonDto): Promise<Lesson> {
    try {
      const lesson = await prisma.lesson.create({
        data: dto,
      });

      // Update course lesson count
      const courseTotalLessons = await prisma.lesson.count({
        where: { moduleId: dto.moduleId },
      });
      const module = await prisma.module.findUnique({ where: { id: dto.moduleId } });
      if (module) {
        await prisma.course.update({
          where: { id: module.courseId },
          data: { totalLessons: courseTotalLessons },
        });
      }

      logger.info('Lesson created', { lessonId: lesson.id, moduleId: dto.moduleId });
      return lesson;
    } catch (error) {
      logger.error('Failed to create lesson', { error, dto });
      throw error;
    }
  }

  async updateLesson(id: string, updates: Partial<CreateLessonDto>): Promise<Lesson> {
    try {
      const lesson = await prisma.lesson.update({
        where: { id },
        data: { ...updates, updatedAt: new Date() },
      });

      logger.info('Lesson updated', { lessonId: id });
      return lesson;
    } catch (error) {
      logger.error('Failed to update lesson', { error, id, updates });
      throw error;
    }
  }

  async deleteLesson(id: string): Promise<void> {
    try {
      const lesson = await prisma.lesson.findUnique({ where: { id } });
      if (!lesson) {
        throw new Error('Lesson not found');
      }

      await prisma.lesson.delete({ where: { id } });

      // Update course lesson count
      const module = await prisma.module.findUnique({ where: { id: lesson.moduleId } });
      if (module) {
        const courseTotalLessons = await prisma.lesson.count({
          where: { moduleId: lesson.moduleId },
        });
        await prisma.course.update({
          where: { id: module.courseId },
          data: { totalLessons: courseTotalLessons },
        });
      }

      logger.info('Lesson deleted', { lessonId: id });
    } catch (error) {
      logger.error('Failed to delete lesson', { error, id });
      throw error;
    }
  }
}

export const brokerEducationService = new BrokerEducationService();
