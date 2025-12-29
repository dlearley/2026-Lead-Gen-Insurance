import { PrismaClient } from '@prisma/client';
import { logger } from '@insurance-lead-gen/core';
import type {
  Enrollment,
  LessonProgress,
  ProgressSummary,
  AgentEducationProfile,
  EnrollmentStatus,
} from '@insurance-lead-gen/types';

const prisma = new PrismaClient();

export class EnrollmentService {
  // ========================================
  // Enrollment Management
  // ========================================

  async getEnrollments(filters: {
    agentId?: string;
    courseId?: string;
    status?: EnrollmentStatus;
  } = {}): Promise<Enrollment[]> {
    try {
      const { agentId, courseId, status } = filters;

      const enrollments = await prisma.enrollment.findMany({
        where: {
          agentId,
          courseId,
          status: status as any,
        },
        include: {
          course: {
            include: {
              modules: {
                include: { lessons: true },
                orderBy: { order: 'asc' },
              },
            },
          },
        },
        orderBy: { enrolledAt: 'desc' },
      });

      return enrollments;
    } catch (error) {
      logger.error('Failed to get enrollments', { error, filters });
      throw error;
    }
  }

  async getEnrollmentById(id: string): Promise<Enrollment | null> {
    try {
      const enrollment = await prisma.enrollment.findUnique({
        where: { id },
        include: {
          course: {
            include: {
              modules: {
                include: { lessons: true },
                orderBy: { order: 'asc' },
              },
            },
          },
          lessonProgress: {
            include: { lesson: true },
          },
        },
      });

      return enrollment;
    } catch (error) {
      logger.error('Failed to get enrollment by id', { error, id });
      throw error;
    }
  }

  async enrollAgent(courseId: string, agentId: string): Promise<Enrollment> {
    try {
      // Check if already enrolled
      const existing = await prisma.enrollment.findUnique({
        where: {
          courseId_agentId: { courseId, agentId },
        },
      });

      if (existing) {
        throw new Error('Already enrolled in this course');
      }

      const enrollment = await prisma.enrollment.create({
        data: {
          courseId,
          agentId,
          status: 'NOT_STARTED',
          progress: 0,
        },
      });

      logger.info('Agent enrolled in course', { enrollmentId: enrollment.id, agentId, courseId });
      return enrollment;
    } catch (error) {
      logger.error('Failed to enroll agent', { error, courseId, agentId });
      throw error;
    }
  }

  async startEnrollment(enrollmentId: string): Promise<Enrollment> {
    try {
      const enrollment = await prisma.enrollment.update({
        where: { id: enrollmentId },
        data: {
          status: 'IN_PROGRESS',
          lastAccessedAt: new Date(),
        },
      });

      logger.info('Enrollment started', { enrollmentId });
      return enrollment;
    } catch (error) {
      logger.error('Failed to start enrollment', { error, enrollmentId });
      throw error;
    }
  }

  async completeEnrollment(enrollmentId: string): Promise<Enrollment> {
    try {
      const enrollment = await prisma.enrollment.update({
        where: { id: enrollmentId },
        data: {
          status: 'COMPLETED',
          progress: 100,
          completedAt: new Date(),
        },
        include: { course: true },
      });

      logger.info('Enrollment completed', { enrollmentId, agentId: enrollment.agentId });

      // Auto-create certificate if course has no assessments
      await this.maybeCreateCourseCertificate(enrollment);

      return enrollment;
    } catch (error) {
      logger.error('Failed to complete enrollment', { error, enrollmentId });
      throw error;
    }
  }

  async dropEnrollment(enrollmentId: string): Promise<Enrollment> {
    try {
      const enrollment = await prisma.enrollment.update({
        where: { id: enrollmentId },
        data: {
          status: 'DROPPED',
        },
      });

      logger.info('Enrollment dropped', { enrollmentId });
      return enrollment;
    } catch (error) {
      logger.error('Failed to drop enrollment', { error, enrollmentId });
      throw error;
    }
  }

  // ========================================
  // Lesson Progress
  // ========================================

  async markLessonComplete(enrollmentId: string, lessonId: string, timeSpentMinutes: number): Promise<LessonProgress> {
    try {
      const progress = await prisma.lessonProgress.upsert({
        where: {
          enrollmentId_lessonId: { enrollmentId, lessonId },
        },
        create: {
          enrollmentId,
          lessonId,
          completed: true,
          timeSpentMinutes,
          completedAt: new Date(),
        },
        update: {
          completed: true,
          timeSpentMinutes: { increment: timeSpentMinutes },
          completedAt: new Date(),
        },
      });

      // Update enrollment progress
      await this.updateEnrollmentProgress(enrollmentId);

      logger.info('Lesson completed', { progressId: progress.id, lessonId, enrollmentId });
      return progress;
    } catch (error) {
      logger.error('Failed to mark lesson complete', { error, enrollmentId, lessonId });
      throw error;
    }
  }

  async updateLessonTime(enrollmentId: string, lessonId: string, timeSpentMinutes: number): Promise<LessonProgress> {
    try {
      const progress = await prisma.lessonProgress.upsert({
        where: {
          enrollmentId_lessonId: { enrollmentId, lessonId },
        },
        create: {
          enrollmentId,
          lessonId,
          completed: false,
          timeSpentMinutes,
        },
        update: {
          timeSpentMinutes: { increment: timeSpentMinutes },
        },
      });

      return progress;
    } catch (error) {
      logger.error('Failed to update lesson time', { error, enrollmentId, lessonId });
      throw error;
    }
  }

  private async updateEnrollmentProgress(enrollmentId: string): Promise<void> {
    try {
      const enrollment = await prisma.enrollment.findUnique({
        where: { id: enrollmentId },
        include: {
          course: {
            include: {
              modules: { include: { lessons: true } },
            },
          },
        },
      });

      if (!enrollment) {
        return;
      }

      // Count total lessons
      let totalLessons = 0;
      for (const module of enrollment.course.modules) {
        totalLessons += module.lessons.length;
      }

      // Count completed lessons
      const completedLessons = await prisma.lessonProgress.count({
        where: {
          enrollmentId,
          completed: true,
        },
      });

      // Calculate progress percentage
      const progress = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;

      // Update enrollment
      await prisma.enrollment.update({
        where: { id: enrollmentId },
        data: {
          progress,
          lastAccessedAt: new Date(),
        },
      });

      // Auto-complete if all lessons done
      if (progress === 100 && enrollment.status !== 'COMPLETED') {
        await this.completeEnrollment(enrollmentId);
      }
    } catch (error) {
      logger.error('Failed to update enrollment progress', { error, enrollmentId });
    }
  }

  private async maybeCreateCourseCertificate(enrollment: any): Promise<void> {
    try {
      // Check if course has assessments
      const assessments = await prisma.assessment.findMany({
        where: { courseId: enrollment.courseId },
      });

      if (assessments.length > 0) {
        // Don't auto-create if there are assessments - they must pass those first
        return;
      }

      // Check if certificate already exists
      const existing = await prisma.certificate.findFirst({
        where: {
          agentId: enrollment.agentId,
          courseId: enrollment.courseId,
          status: 'ACTIVE',
        },
      });

      if (existing) {
        return;
      }

      // Generate certificate number
      const certificateNumber = `CERT-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

      await prisma.certificate.create({
        data: {
          agentId: enrollment.agentId,
          courseId: enrollment.courseId,
          certificateNumber,
          title: `${enrollment.course.title} - Completion`,
          description: `Successfully completed ${enrollment.course.title}`,
          status: 'ACTIVE',
        },
      });

      logger.info('Course completion certificate created', {
        enrollmentId: enrollment.id,
        certificateNumber,
      });
    } catch (error) {
      logger.error('Failed to create course certificate', { error, enrollmentId: enrollment.id });
    }
  }

  // ========================================
  // Progress Summaries
  // ========================================

  async getAgentProgressSummary(agentId: string): Promise<ProgressSummary[]> {
    try {
      const enrollments = await prisma.enrollment.findMany({
        where: { agentId },
        include: {
          course: {
            include: {
              modules: { include: { lessons: true } },
            },
          },
        },
      });

      const summaries: ProgressSummary[] = [];

      for (const enrollment of enrollments) {
        const totalLessons = enrollment.course.modules.reduce((sum, m) => sum + m.lessons.length, 0);
        const completedLessons = await prisma.lessonProgress.count({
          where: { enrollmentId: enrollment.id, completed: true },
        });
        const totalMinutes = await prisma.lessonProgress.aggregate({
          where: { enrollmentId: enrollment.id },
          _sum: { timeSpentMinutes: true },
        });

        summaries.push({
          courseId: enrollment.courseId,
          courseTitle: enrollment.course.title,
          status: enrollment.status as any,
          progress: enrollment.progress,
          completedLessons,
          totalLessons,
          timeSpentMinutes: totalMinutes._sum.timeSpentMinutes || 0,
          enrolledAt: enrollment.enrolledAt,
          lastAccessedAt: enrollment.lastAccessedAt || undefined,
        });
      }

      return summaries;
    } catch (error) {
      logger.error('Failed to get agent progress summary', { error, agentId });
      throw error;
    }
  }

  async getAgentEducationProfile(agentId: string): Promise<AgentEducationProfile> {
    try {
      const [enrollments, completed, certificates] = await Promise.all([
        prisma.enrollment.count({ where: { agentId } }),
        prisma.enrollment.count({ where: { agentId, status: 'COMPLETED' } }),
        prisma.certificate.count({ where: { agentId, status: 'ACTIVE' } }),
      ]);

      const activeEnrollments = enrollments - completed;

      // Calculate total learning hours
      const progress = await prisma.lessonProgress.findMany({
        where: {
          enrollment: { agentId },
        },
      });

      const totalLearningHours =
        progress.reduce((sum, p) => sum + (p.timeSpentMinutes || 0), 0) / 60;

      return {
        agentId,
        agentName: '', // Would need to join with Agent table
        totalEnrollments: enrollments,
        completedCourses: completed,
        activeEnrollments,
        certificates,
        competencies: [],
        learningPaths: [],
        skillGaps: [],
        totalLearningHours: Math.round(totalLearningHours * 10) / 10,
      };
    } catch (error) {
      logger.error('Failed to get agent education profile', { error, agentId });
      throw error;
    }
  }
}

export const enrollmentService = new EnrollmentService();
