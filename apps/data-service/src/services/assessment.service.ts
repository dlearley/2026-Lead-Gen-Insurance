import { PrismaClient } from '@prisma/client';
import { logger } from '@insurance-lead-gen/core';
import type {
  Assessment,
  Question,
  AssessmentAttempt,
  CreateAssessmentDto,
  CreateQuestionDto,
  CreateAssessmentAttemptDto,
} from '@insurance-lead-gen/types';

const prisma = new PrismaClient();

export class AssessmentService {
  // ========================================
  // Assessment Management
  // ========================================

  async getAssessments(filters: { courseId?: string; type?: string; isActive?: boolean } = {}): Promise<Assessment[]> {
    try {
      const { courseId, type, isActive } = filters;

      const assessments = await prisma.assessment.findMany({
        where: {
          courseId,
          type: type as any,
          isActive: isActive !== undefined ? isActive : undefined,
        },
        include: {
          questions: {
            orderBy: { order: 'asc' },
          },
          course: {
            select: { id: true, title: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      return assessments;
    } catch (error) {
      logger.error('Failed to get assessments', { error, filters });
      throw error;
    }
  }

  async getAssessmentById(id: string): Promise<Assessment | null> {
    try {
      const assessment = await prisma.assessment.findUnique({
        where: { id },
        include: {
          questions: {
            orderBy: { order: 'asc' },
          },
          course: true,
        },
      });

      return assessment;
    } catch (error) {
      logger.error('Failed to get assessment by id', { error, id });
      throw error;
    }
  }

  async createAssessment(dto: CreateAssessmentDto): Promise<Assessment> {
    try {
      const assessment = await prisma.assessment.create({
        data: {
          courseId: dto.courseId,
          title: dto.title,
          description: dto.description,
          type: dto.type,
          timeLimitMinutes: dto.timeLimitMinutes,
          passingScore: dto.passingScore,
          maxAttempts: dto.maxAttempts,
        },
      });

      logger.info('Assessment created', { assessmentId: assessment.id, courseId: dto.courseId });
      return assessment;
    } catch (error) {
      logger.error('Failed to create assessment', { error, dto });
      throw error;
    }
  }

  async updateAssessment(id: string, updates: Partial<CreateAssessmentDto>): Promise<Assessment> {
    try {
      const assessment = await prisma.assessment.update({
        where: { id },
        data: { ...updates, updatedAt: new Date() },
      });

      logger.info('Assessment updated', { assessmentId: id });
      return assessment;
    } catch (error) {
      logger.error('Failed to update assessment', { error, id, updates });
      throw error;
    }
  }

  async deleteAssessment(id: string): Promise<void> {
    try {
      await prisma.assessment.delete({ where: { id } });
      logger.info('Assessment deleted', { assessmentId: id });
    } catch (error) {
      logger.error('Failed to delete assessment', { error, id });
      throw error;
    }
  }

  // ========================================
  // Question Management
  // ========================================

  async createQuestion(dto: CreateQuestionDto): Promise<Question> {
    try {
      const question = await prisma.question.create({
        data: dto,
      });

      // Update assessment question count
      const questionsCount = await prisma.question.count({
        where: { assessmentId: dto.assessmentId },
      });
      await prisma.assessment.update({
        where: { id: dto.assessmentId },
        data: { questionsCount },
      });

      logger.info('Question created', { questionId: question.id, assessmentId: dto.assessmentId });
      return question;
    } catch (error) {
      logger.error('Failed to create question', { error, dto });
      throw error;
    }
  }

  async updateQuestion(id: string, updates: Partial<CreateQuestionDto>): Promise<Question> {
    try {
      const question = await prisma.question.update({
        where: { id },
        data: updates,
      });

      logger.info('Question updated', { questionId: id });
      return question;
    } catch (error) {
      logger.error('Failed to update question', { error, id, updates });
      throw error;
    }
  }

  async deleteQuestion(id: string): Promise<void> {
    try {
      const question = await prisma.question.findUnique({ where: { id } });
      if (!question) {
        throw new Error('Question not found');
      }

      await prisma.question.delete({ where: { id } });

      // Update assessment question count
      const questionsCount = await prisma.question.count({
        where: { assessmentId: question.assessmentId },
      });
      await prisma.assessment.update({
        where: { id: question.assessmentId },
        data: { questionsCount },
      });

      logger.info('Question deleted', { questionId: id });
    } catch (error) {
      logger.error('Failed to delete question', { error, id });
      throw error;
    }
  }

  // ========================================
  // Assessment Attempts
  // ========================================

  async startAssessment(assessmentId: string, agentId: string): Promise<AssessmentAttempt> {
    try {
      const assessment = await prisma.assessment.findUnique({
        where: { id: assessmentId },
      });

      if (!assessment) {
        throw new Error('Assessment not found');
      }

      // Check if assessment is active
      if (!assessment.isActive) {
        throw new Error('Assessment is not active');
      }

      // Count previous attempts
      const previousAttempts = await prisma.assessmentAttempt.count({
        where: { assessmentId, agentId },
      });

      if (previousAttempts >= assessment.maxAttempts) {
        throw new Error('Maximum attempts reached');
      }

      const attempt = await prisma.assessmentAttempt.create({
        data: {
          assessmentId,
          agentId,
          attemptNumber: previousAttempts + 1,
          score: 0,
          passed: false,
          answers: {},
        },
      });

      logger.info('Assessment started', { attemptId: attempt.id, agentId, assessmentId });
      return attempt;
    } catch (error) {
      logger.error('Failed to start assessment', { error, assessmentId, agentId });
      throw error;
    }
  }

  async submitAssessment(attemptId: string, answers: Record<string, string>): Promise<AssessmentAttempt> {
    try {
      const attempt = await prisma.assessmentAttempt.findUnique({
        where: { id: attemptId },
        include: { assessment: { include: { questions: true } } },
      });

      if (!attempt) {
        throw new Error('Attempt not found');
      }

      if (attempt.completedAt) {
        throw new Error('Attempt already completed');
      }

      // Calculate score
      let totalPoints = 0;
      let earnedPoints = 0;

      for (const question of attempt.assessment.questions) {
        totalPoints += question.points;
        const userAnswer = answers[question.id];

        if (userAnswer === question.correctAnswer) {
          earnedPoints += question.points;
        }
      }

      const score = totalPoints > 0 ? Math.round((earnedPoints / totalPoints) * 100) : 0;
      const passed = score >= attempt.assessment.passingScore;

      const completedAttempt = await prisma.assessmentAttempt.update({
        where: { id: attemptId },
        data: {
          score,
          passed,
          answers,
          completedAt: new Date(),
        },
      });

      logger.info('Assessment completed', {
        attemptId,
        agentId: attempt.agentId,
        score,
        passed,
      });

      // Auto-create certificate if passed
      if (passed) {
        await this.maybeCreateCertificate(attempt.agentId, attempt.assessmentId, attempt.assessment.courseId);
      }

      return completedAttempt;
    } catch (error) {
      logger.error('Failed to submit assessment', { error, attemptId });
      throw error;
    }
  }

  async getAgentAttempts(agentId: string, assessmentId?: string): Promise<AssessmentAttempt[]> {
    try {
      const attempts = await prisma.assessmentAttempt.findMany({
        where: {
          agentId,
          assessmentId,
        },
        include: { assessment: true },
        orderBy: { startedAt: 'desc' },
      });

      return attempts;
    } catch (error) {
      logger.error('Failed to get agent attempts', { error, agentId, assessmentId });
      throw error;
    }
  }

  private async maybeCreateCertificate(agentId: string, assessmentId: string, courseId: string | null): Promise<void> {
    try {
      // Check if certificate already exists
      const existing = await prisma.certificate.findFirst({
        where: {
          agentId,
          assessmentId,
          status: 'ACTIVE',
        },
      });

      if (existing) {
        return;
      }

      const assessment = await prisma.assessment.findUnique({
        where: { id: assessmentId },
        include: { course: true },
      });

      if (!assessment) {
        return;
      }

      // Generate certificate number
      const certificateNumber = `CERT-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

      await prisma.certificate.create({
        data: {
          agentId,
          assessmentId,
          courseId,
          certificateNumber,
          title: assessment.title,
          description: `Completed ${assessment.title} assessment successfully`,
          status: 'ACTIVE',
        },
      });

      logger.info('Certificate created', { agentId, assessmentId, certificateNumber });
    } catch (error) {
      logger.error('Failed to create certificate', { error, agentId, assessmentId });
      // Don't throw - this is a non-critical operation
    }
  }
}

export const assessmentService = new AssessmentService();
