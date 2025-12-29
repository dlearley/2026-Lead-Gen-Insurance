import { PrismaClient } from '@prisma/client';
import { logger } from '@insurance-lead-gen/core';
import type {
  LearningPath,
  PathEnrollment,
  CreateLearningPathDto,
  PathProgress,
  EnrollmentStatus,
} from '@insurance-lead-gen/types';

const prisma = new PrismaClient();

export class LearningPathService {
  // ========================================
  // Learning Path Management
  // ========================================

  async getLearningPaths(filters: { category?: string; targetRole?: string; isActive?: boolean } = {}): Promise<LearningPath[]> {
    try {
      const { category, targetRole, isActive } = filters;

      const paths = await prisma.learningPath.findMany({
        where: {
          category,
          targetRole,
          isActive: isActive !== undefined ? isActive : undefined,
        },
        include: {
          pathEnrollments: true,
        },
        orderBy: { createdAt: 'desc' },
      });

      return paths;
    } catch (error) {
      logger.error('Failed to get learning paths', { error, filters });
      throw error;
    }
  }

  async getLearningPathById(id: string): Promise<LearningPath | null> {
    try {
      const path = await prisma.learningPath.findUnique({
        where: { id },
        include: {
          pathEnrollments: {
            include: { learningPath: true },
          },
        },
      });

      return path;
    } catch (error) {
      logger.error('Failed to get learning path by id', { error, id });
      throw error;
    }
  }

  async createLearningPath(dto: CreateLearningPathDto): Promise<LearningPath> {
    try {
      const path = await prisma.learningPath.create({
        data: {
          title: dto.title,
          description: dto.description,
          category: dto.category,
          targetRole: dto.targetRole,
          targetLevel: dto.targetLevel,
          estimatedWeeks: dto.estimatedWeeks,
          requiredCourses: dto.requiredCourses,
          electiveCourses: dto.electiveCourses || [],
        },
      });

      logger.info('Learning path created', { pathId: path.id, title: dto.title });
      return path;
    } catch (error) {
      logger.error('Failed to create learning path', { error, dto });
      throw error;
    }
  }

  async updateLearningPath(id: string, updates: Partial<CreateLearningPathDto>): Promise<LearningPath> {
    try {
      const path = await prisma.learningPath.update({
        where: { id },
        data: { ...updates, updatedAt: new Date() },
      });

      logger.info('Learning path updated', { pathId: id });
      return path;
    } catch (error) {
      logger.error('Failed to update learning path', { error, id, updates });
      throw error;
    }
  }

  async deleteLearningPath(id: string): Promise<void> {
    try {
      await prisma.learningPath.delete({ where: { id } });
      logger.info('Learning path deleted', { pathId: id });
    } catch (error) {
      logger.error('Failed to delete learning path', { error, id });
      throw error;
    }
  }

  // ========================================
  // Path Enrollment Management
  // ========================================

  async getPathEnrollments(filters: {
    agentId?: string;
    learningPathId?: string;
    status?: EnrollmentStatus;
  } = {}): Promise<PathEnrollment[]> {
    try {
      const { agentId, learningPathId, status } = filters;

      const enrollments = await prisma.pathEnrollment.findMany({
        where: {
          agentId,
          learningPathId,
          status: status as any,
        },
        include: { learningPath: true },
        orderBy: { enrolledAt: 'desc' },
      });

      return enrollments;
    } catch (error) {
      logger.error('Failed to get path enrollments', { error, filters });
      throw error;
    }
  }

  async enrollAgentInPath(learningPathId: string, agentId: string): Promise<PathEnrollment> {
    try {
      // Check if already enrolled
      const existing = await prisma.pathEnrollment.findUnique({
        where: {
          learningPathId_agentId: { learningPathId, agentId },
        },
      });

      if (existing) {
        throw new Error('Already enrolled in this learning path');
      }

      const enrollment = await prisma.pathEnrollment.create({
        data: {
          learningPathId,
          agentId,
          status: 'NOT_STARTED',
          progress: 0,
          completedCourses: [],
        },
      });

      logger.info('Agent enrolled in learning path', { enrollmentId: enrollment.id, agentId, learningPathId });
      return enrollment;
    } catch (error) {
      logger.error('Failed to enroll agent in path', { error, learningPathId, agentId });
      throw error;
    }
  }

  async startPathEnrollment(enrollmentId: string): Promise<PathEnrollment> {
    try {
      const enrollment = await prisma.pathEnrollment.update({
        where: { id: enrollmentId },
        data: {
          status: 'IN_PROGRESS',
        },
      });

      logger.info('Path enrollment started', { enrollmentId });
      return enrollment;
    } catch (error) {
      logger.error('Failed to start path enrollment', { error, enrollmentId });
      throw error;
    }
  }

  async completePathEnrollment(enrollmentId: string): Promise<PathEnrollment> {
    try {
      const enrollment = await prisma.pathEnrollment.update({
        where: { id: enrollmentId },
        data: {
          status: 'COMPLETED',
          progress: 100,
          completedAt: new Date(),
        },
      });

      logger.info('Path enrollment completed', { enrollmentId, agentId: enrollment.agentId });
      return enrollment;
    } catch (error) {
      logger.error('Failed to complete path enrollment', { error, enrollmentId });
      throw error;
    }
  }

  async updatePathProgress(enrollmentId: string): Promise<PathEnrollment> {
    try {
      const enrollment = await prisma.pathEnrollment.findUnique({
        where: { id: enrollmentId },
        include: { learningPath: true },
      });

      if (!enrollment) {
        throw new Error('Enrollment not found');
      }

      // Get all course enrollments for this agent in the path's required courses
      const courseEnrollments = await prisma.enrollment.findMany({
        where: {
          agentId: enrollment.agentId,
          courseId: { in: enrollment.learningPath.requiredCourses },
          status: 'COMPLETED',
        },
      });

      const completedCourseIds = courseEnrollments.map(e => e.courseId);
      const progress = Math.round((completedCourseIds.length / enrollment.learningPath.requiredCourses.length) * 100);

      // Update enrollment
      const updated = await prisma.pathEnrollment.update({
        where: { id: enrollmentId },
        data: {
          progress,
          completedCourses: completedCourseIds,
        },
      });

      // Auto-complete if all required courses done
      if (progress === 100 && enrollment.status !== 'COMPLETED') {
        await this.completePathEnrollment(enrollmentId);
      }

      return updated;
    } catch (error) {
      logger.error('Failed to update path progress', { error, enrollmentId });
      throw error;
    }
  }

  // ========================================
  // Progress Summaries
  // ========================================

  async getAgentPathProgress(agentId: string): Promise<PathProgress[]> {
    try {
      const enrollments = await prisma.pathEnrollment.findMany({
        where: { agentId },
        include: { learningPath: true },
      });

      const progress: PathProgress[] = [];

      for (const enrollment of enrollments) {
        const completedRequired = enrollment.learningPath.requiredCourses.filter(c =>
          enrollment.completedCourses.includes(c),
        ).length;

        // Find next recommended course
        const nextRecommended = enrollment.learningPath.requiredCourses.find(c =>
          !enrollment.completedCourses.includes(c),
        );

        // Calculate estimated completion date
        let estimatedCompletionDate: Date | undefined;
        if (enrollment.status !== 'COMPLETED' && enrollment.progress > 0) {
          const weeksRemaining = enrollment.learningPath.estimatedWeeks * ((100 - enrollment.progress) / 100);
          estimatedCompletionDate = new Date(enrollment.enrolledAt.getTime() + weeksRemaining * 7 * 24 * 60 * 60 * 1000);
        }

        progress.push({
          learningPathId: enrollment.learningPathId,
          learningPathTitle: enrollment.learningPath.title,
          status: enrollment.status as any,
          progress: enrollment.progress,
          completedCourses: enrollment.completedCourses,
          totalRequiredCourses: enrollment.learningPath.requiredCourses.length,
          completedRequiredCourses: completedRequired,
          nextRecommendedCourse: nextRecommended,
          enrolledAt: enrollment.enrolledAt,
          estimatedCompletionDate,
        });
      }

      return progress;
    } catch (error) {
      logger.error('Failed to get agent path progress', { error, agentId });
      throw error;
    }
  }

  async getRecommendedPaths(agentId: string): Promise<LearningPath[]> {
    try {
      // Get agent's current competencies
      const agentCompetencies = await prisma.agentCompetency.findMany({
        where: { agentId },
      });

      // In a real implementation, this would use AI to recommend paths
      // based on agent's current level, goals, and role.
      // For now, we'll return active paths ordered by relevance.

      const paths = await prisma.learningPath.findMany({
        where: { isActive: true },
        orderBy: { createdAt: 'desc' },
        take: 10,
      });

      return paths;
    } catch (error) {
      logger.error('Failed to get recommended paths', { error, agentId });
      throw error;
    }
  }
}

export const learningPathService = new LearningPathService();
