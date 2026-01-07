import { PrismaClient } from '@prisma/client';
import { EducationRepository } from '../repositories/education.repository';
import {
  Course,
  LearningPath,
  CourseEnrollment,
  ModuleProgress,
  QuizAttempt,
  CourseCertification,
  Agent,
  CreateCourseDto,
  UpdateCourseDto,
  CreateLearningPathDto,
  UpdateLearningPathDto,
  CourseFilterParams,
  LearningPathFilterParams,
  EnrollmentFilterParams,
  EducationStats,
  AgentEducationProfile,
  EnrollCourseDto,
  EnrollLearningPathDto,
  UpdateProgressDto,
  SubmitQuizDto,
  UpdateAgentEducationDto,
  InsuranceType,
  CourseCategory,
  CourseLevel,
  ProgressStatus,
  EnrollmentStatus
} from '@insurance/types';

export class EducationService {
  constructor(private educationRepository: EducationRepository, private prisma: PrismaClient) {}

  // Course Management
  async createCourse(data: CreateCourseDto, createdBy?: string): Promise<Course> {
    // Validate prerequisites
    if (data.prerequisites && data.prerequisites.length > 0) {
      await this.validateCoursePrerequisites(data.prerequisites);
    }

    const courseData = {
      ...data,
      createdBy
    };

    return this.educationRepository.createCourse(courseData);
  }

  async updateCourse(id: string, data: UpdateCourseDto): Promise<Course> {
    // Check if course exists
    const existingCourse = await this.educationRepository.getCourse(id);
    if (!existingCourse) {
      throw new Error('Course not found');
    }

    // Validate prerequisites if being updated
    if (data.prerequisites && data.prerequisites.length > 0) {
      await this.validateCoursePrerequisites(data.prerequisites);
    }

    return this.educationRepository.updateCourse(id, data);
  }

  private async validateCoursePrerequisites(prerequisiteIds: string[]): Promise<void> {
    for (const prerequisiteId of prerequisiteIds) {
      const prerequisite = await this.educationRepository.getCourse(prerequisiteId);
      if (!prerequisite) {
        throw new Error(`Prerequisite course not found: ${prerequisiteId}`);
      }
    }
  }

  async getCoursesWithAvailability(filter?: CourseFilterParams): Promise<{ courses: Course[]; total: number }> {
    const result = await this.educationRepository.getCourses(filter);
    
    // Add availability information to each course
    const coursesWithAvailability = result.courses.map(course => ({
      ...course,
      isAvailable: this.isCourseAvailable(course)
    }));

    return {
      courses: coursesWithAvailability,
      total: result.total
    };
  }

  private isCourseAvailable(course: Course): boolean {
    // Check if course is active
    if (!course.isActive) return false;

    // Check if prerequisites are met (for course prerequisites)
    // This would need to be checked against individual agent profiles
    return true; // For now, assume available if active
  }

  // Learning Path Management
  async createLearningPath(data: CreateLearningPathDto, createdBy?: string): Promise<LearningPath> {
    // Validate courses in path
    const courses = await Promise.all(
      data.specialization.map(spec => this.getCoursesBySpecialization(spec))
    );

    if (courses.flat().length === 0) {
      throw new Error('No courses found for the specified specializations');
    }

    const pathData = {
      ...data,
      createdBy
    };

    return this.educationRepository.createLearningPath(pathData);
  }

  async addCourseToPath(learningPathId: string, courseId: string, orderIndex: number, isRequired = true, passingScore?: number): Promise<void> {
    // Verify both learning path and course exist
    const [path, course] = await Promise.all([
      this.educationRepository.getLearningPath(learningPathId),
      this.educationRepository.getCourse(courseId)
    ]);

    if (!path) {
      throw new Error('Learning path not found');
    }

    if (!course) {
      throw new Error('Course not found');
    }

    // Add course to path (would need to implement this method in repository)
    // await this.educationRepository.addCourseToPath(learningPathId, courseId, orderIndex, isRequired, passingScore);
  }

  // Enrollment Management
  async enrollInCourse(courseId: string, data: EnrollCourseDto): Promise<CourseEnrollment> {
    const [course, agent] = await Promise.all([
      this.educationRepository.getCourse(courseId),
      this.prisma.agent.findUnique({ where: { id: data.agentId } })
    ]);

    if (!course) {
      throw new Error('Course not found');
    }

    if (!agent) {
      throw new Error('Agent not found');
    }

    // Check if agent meets prerequisites
    await this.validateAgentPrerequisites(data.agentId, course.prerequisites);

    // Check capacity limits
    await this.checkEnrollmentCapacity(agent.id);

    const enrollment = await this.educationRepository.enrollInCourse(courseId, data);

    // Auto-enroll in prerequisites if not completed
    await this.autoEnrollPrerequisites(courseId, data.agentId);

    // Update agent's last training date
    await this.prisma.agent.update({
      where: { id: data.agentId },
      data: { lastTrainingDate: new Date() }
    });

    return enrollment;
  }

  async enrollInLearningPath(learningPathId: string, data: EnrollLearningPathDto): Promise<PathEnrollment> {
    const path = await this.educationRepository.getLearningPath(learningPathId);
    const agent = await this.prisma.agent.findUnique({ where: { id: data.agentId } });

    if (!path) {
      throw new Error('Learning path not found');
    }

    if (!agent) {
      throw new Error('Agent not found');
    }

    // Check if agent meets prerequisites
    await this.validateAgentPrerequisites(data.agentId, path.prerequisites);

    // Check capacity
    await this.checkEnrollmentCapacity(agent.id);

    const enrollment = await this.educationRepository.enrollInLearningPath(learningPathId, data);

    // Auto-enroll in all courses in the path
    for (const pathCourse of path.courses || []) {
      if (pathCourse.isRequired) {
        try {
          await this.enrollInCourse(pathCourse.courseId, { agentId: data.agentId });
        } catch (error) {
          console.warn(`Failed to auto-enroll in course ${pathCourse.courseId}:`, error);
        }
      }
    }

    // Update agent's last training date
    await this.prisma.agent.update({
      where: { id: data.agentId },
      data: { lastTrainingDate: new Date() }
    });

    return enrollment;
  }

  private async validateAgentPrerequisites(agentId: string, prerequisites: string[]): Promise<void> {
    if (!prerequisites || prerequisites.length === 0) return;

    const completedCourses = await this.prisma.courseEnrollment.findMany({
      where: {
        agentId,
        status: 'COMPLETED'
      },
      include: {
        course: true
      }
    });

    const completedCourseIds = completedCourses.map(enrollment => enrollment.courseId);

    for (const prerequisiteId of prerequisites) {
      if (!completedCourseIds.includes(prerequisiteId)) {
        const prerequisite = await this.educationRepository.getCourse(prerequisiteId);
        throw new Error(`Prerequisite not completed: ${prerequisite?.title || prerequisiteId}`);
      }
    }
  }

  private async checkEnrollmentCapacity(agentId: string): Promise<void> {
    const agent = await this.prisma.agent.findUnique({
      where: { id: agentId }
    });

    if (!agent) {
      throw new Error('Agent not found');
    }

    const activeEnrollments = await this.prisma.courseEnrollment.count({
      where: {
        agentId,
        status: { in: ['ENROLLED', 'IN_PROGRESS'] }
      }
    });

    const maxConcurrentCourses = 5; // Configurable limit
    if (activeEnrollments >= maxConcurrentCourses) {
      throw new Error(`Maximum concurrent course limit reached (${maxConcurrentCourses})`);
    }
  }

  private async autoEnrollPrerequisites(courseId: string, agentId: string): Promise<void> {
    const course = await this.educationRepository.getCourse(courseId);
    if (!course || !course.prerequisites) return;

    for (const prerequisiteId of course.prerequisites) {
      // Check if already enrolled
      const existingEnrollment = await this.prisma.courseEnrollment.findUnique({
        where: {
          courseId_agentId: {
            courseId: prerequisiteId,
            agentId
          }
        }
      });

      if (!existingEnrollment) {
        try {
          await this.enrollInCourse(prerequisiteId, { agentId });
        } catch (error) {
          console.warn(`Failed to auto-enroll in prerequisite ${prerequisiteId}:`, error);
        }
      }
    }
  }

  // Progress Tracking
  async updateModuleProgress(moduleProgressId: string, data: UpdateProgressDto): Promise<ModuleProgress> {
    const progress = await this.educationRepository.updateModuleProgress(moduleProgressId, data);

    // Check if course is completed
    await this.checkCourseCompletion(progress.enrollmentId);

    // Update agent training hours
    if (data.timeSpent) {
      await this.updateAgentTrainingHours(progress.enrollmentId, data.timeSpent);
    }

    return progress;
  }

  private async checkCourseCompletion(enrollmentId: string): Promise<void> {
    const enrollment = await this.prisma.courseEnrollment.findUnique({
      where: { id: enrollmentId },
      include: {
        course: {
          include: {
            modules: {
              where: { isRequired: true }
            }
          }
        },
        moduleProgresses: true
      }
    });

    if (!enrollment) return;

    const requiredModules = enrollment.course.modules;
    const completedModules = enrollment.moduleProgresses.filter(
      mp => mp.status === 'COMPLETED' && mp.progress >= 70
    );

    if (requiredModules.length === completedModules.length) {
      // Course completed
      const finalScore = this.calculateFinalScore(enrollment.moduleProgresses);
      
      await this.prisma.courseEnrollment.update({
        where: { id: enrollmentId },
        data: {
          status: 'COMPLETED',
          progress: 100,
          completedAt: new Date(),
          finalScore,
          passingScore: finalScore >= 70 ? finalScore : undefined
        }
      });

      // Issue certificate if score is passing
      if (finalScore >= 70) {
        await this.issueCertificate(enrollment.courseId, enrollment.agentId, finalScore);
      }

      // Update agent stats
      await this.updateAgentEducationStats(enrollment.agentId);
    }
  }

  private calculateFinalScore(moduleProgresses: ModuleProgress[]): number {
    const scores = moduleProgresses
      .filter(mp => mp.status === 'COMPLETED' && mp.module)
      .map(mp => {
        // Calculate average of quiz scores if available
        const quizScores = mp.quizAttempts?.map(attempt => attempt.score) || [];
        const avgQuizScore = quizScores.length > 0 
          ? quizScores.reduce((sum, score) => sum + score, 0) / quizScores.length 
          : mp.progress;

        return avgQuizScore;
      });

    return scores.length > 0 
      ? Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length)
      : 0;
  }

  private async issueCertificate(courseId: string, agentId: string, score: number): Promise<CourseCertification> {
    const certificateNumber = `CERT-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

    return this.prisma.courseCertification.create({
      data: {
        courseId,
        agentId,
        certificateNumber,
        score,
        expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) // 1 year from now
      }
    });
  }

  private async updateAgentTrainingHours(enrollmentId: string, additionalMinutes: number): Promise<void> {
    const enrollment = await this.prisma.courseEnrollment.findUnique({
      where: { id: enrollmentId }
    });

    if (!enrollment) return;

    await this.prisma.agent.update({
      where: { id: enrollment.agentId },
      data: {
        totalTrainingHours: {
          increment: Math.round(additionalMinutes / 60 * 100) / 100 // Round to 2 decimal places
        }
      }
    });
  }

  private async updateAgentEducationStats(agentId: string): Promise<void> {
    const [certificationsCount, agent] = await Promise.all([
      this.prisma.courseCertification.count({
        where: { agentId, isActive: true }
      }),
      this.prisma.agent.findUnique({
        where: { id: agentId }
      })
    ]);

    if (agent) {
      await this.prisma.agent.update({
        where: { id: agentId },
        data: {
          certificationsCount,
          lastTrainingDate: new Date()
        }
      });
    }
  }

  // Assessment System
  async submitQuiz(quizId: string, data: SubmitQuizDto): Promise<QuizAttempt> {
    const attempt = await this.educationRepository.submitQuiz(quizId, data);

    // Update module progress if quiz was passed
    if (attempt.passed) {
      const moduleProgress = await this.prisma.moduleProgress.findUnique({
        where: { id: data.moduleProgressId }
      });

      if (moduleProgress) {
        await this.updateModuleProgress(moduleProgress.id, {
          status: 'COMPLETED',
          progress: 100
        });
      }
    }

    return attempt;
  }

  // Agent Education Management
  async updateAgentEducation(agentId: string, data: UpdateAgentEducationDto): Promise<Agent> {
    return this.educationRepository.updateAgentEducation(agentId, data);
  }

  async getAgentEducationProfile(agentId: string): Promise<AgentEducationProfile | null> {
    const profile = await this.educationRepository.getAgentEducationProfile(agentId);
    
    if (!profile) return null;

    // Add computed fields
    const computedProfile = {
      ...profile,
      progressStats: {
        ...profile.progressStats,
        completionRate: profile.progressStats.totalCoursesEnrolled > 0 
          ? (profile.progressStats.totalCoursesCompleted / profile.progressStats.totalCoursesEnrolled) * 100 
          : 0
      }
    };

    return computedProfile;
  }

  // Helper Methods
  private async getCoursesBySpecialization(specialization: InsuranceType): Promise<Course[]> {
    const result = await this.educationRepository.getCourses({
      isActive: true
    });

    return result.courses.filter(course => 
      course.tags.includes(specialization) || 
      course.category === 'SPECIALIZATIONS'
    );
  }

  // Analytics and Reporting
  async getEducationAnalytics(): Promise<EducationStats> {
    return this.educationRepository.getEducationStats();
  }

  async getAgentProgressReport(agentId: string): Promise<{
    agent: Agent;
    progress: {
      totalCourses: number;
      completedCourses: number;
      inProgressCourses: number;
      totalHours: number;
      certifications: number;
      averageScore: number;
    };
    recentActivity: Array<{
      type: 'enrollment' | 'completion' | 'certification';
      courseName: string;
      date: Date;
      score?: number;
    }>;
  }> {
    const agent = await this.prisma.agent.findUnique({
      where: { id: agentId }
    });

    if (!agent) {
      throw new Error('Agent not found');
    }

    const enrollments = await this.prisma.courseEnrollment.findMany({
      where: { agentId },
      include: { course: true }
    });

    const certifications = await this.prisma.courseCertification.findMany({
      where: { agentId, isActive: true },
      include: { course: true }
    });

    const progress = {
      totalCourses: enrollments.length,
      completedCourses: enrollments.filter(e => e.status === 'COMPLETED').length,
      inProgressCourses: enrollments.filter(e => e.status === 'IN_PROGRESS').length,
      totalHours: agent.totalTrainingHours,
      certifications: certifications.length,
      averageScore: enrollments
        .filter(e => e.finalScore)
        .reduce((sum, e) => sum + (e.finalScore || 0), 0) / enrollments.filter(e => e.finalScore).length || 0
    };

    const recentActivity = [
      ...enrollments
        .filter(e => e.enrolledAt)
        .map(e => ({
          type: 'enrollment' as const,
          courseName: e.course.title,
          date: e.enrolledAt
        })),
      ...enrollments
        .filter(e => e.completedAt)
        .map(e => ({
          type: 'completion' as const,
          courseName: e.course.title,
          date: e.completedAt,
          score: e.finalScore
        })),
      ...certifications
        .map(c => ({
          type: 'certification' as const,
          courseName: c.course.title,
          date: c.issuedAt,
          score: c.score
        }))
    ].sort((a, b) => b.date.getTime() - a.date.getTime()).slice(0, 10);

    return {
      agent,
      progress,
      recentActivity
    };
  }

  // Bulk Operations
  async enrollAgentInRecommendedCourses(agentId: string): Promise<CourseEnrollment[]> {
    const agent = await this.prisma.agent.findUnique({
      where: { id: agentId }
    });

    if (!agent) {
      throw new Error('Agent not found');
    }

    // Get recommendations based on agent's specialization and performance
    const recommendations = await this.getPersonalizedRecommendations(agentId);
    const enrollments: CourseEnrollment[] = [];

    for (const courseId of recommendations) {
      try {
        const enrollment = await this.enrollInCourse(courseId, { agentId });
        enrollments.push(enrollment);
      } catch (error) {
        console.warn(`Failed to enroll in recommended course ${courseId}:`, error);
      }
    }

    return enrollments;
  }

  private async getPersonalizedRecommendations(agentId: string): Promise<string[]> {
    const agent = await this.prisma.agent.findUnique({
      where: { id: agentId }
    });

    if (!agent) return [];

    // Get agent's current enrollments
    const currentEnrollments = await this.prisma.courseEnrollment.findMany({
      where: { agentId }
    });

    const enrolledCourseIds = currentEnrollments.map(e => e.courseId);

    // Get courses based on agent's specialization
    const courses = await this.educationRepository.getCourses({
      isActive: true
    });

    // Filter out already enrolled courses and return recommendations
    return courses.courses
      .filter(course => !enrolledCourseIds.includes(course.id))
      .filter(course => 
        agent.specializations.some(spec => 
          course.tags.includes(spec) || course.category === 'SPECIALIZATIONS'
        )
      )
      .slice(0, 5) // Return top 5 recommendations
      .map(course => course.id);
  }

  // Compliance and Reporting
  async getComplianceReport(): Promise<{
    totalAgents: number;
    compliantAgents: number;
    nonCompliantAgents: Array<{
      agent: Agent;
      missingCourses: string[];
      expiredCertifications: CourseCertification[];
    }>;
    complianceRate: number;
  }> {
    const agents = await this.prisma.agent.findMany({
      where: { isActive: true }
    });

    const mandatoryCourses = await this.educationRepository.getCourses({
      isMandatory: true,
      isActive: true
    });

    const complianceResults = await Promise.all(
      agents.map(async (agent) => {
        const [completedEnrollments, certifications] = await Promise.all([
          this.prisma.courseEnrollment.findMany({
            where: {
              agentId: agent.id,
              status: 'COMPLETED'
            },
            include: { course: true }
          }),
          this.prisma.courseCertification.findMany({
            where: {
              agentId: agent.id,
              isActive: true
            }
          })
        ]);

        const completedCourseIds = completedEnrollments.map(e => e.courseId);
        const missingCourses = mandatoryCourses.courses
          .filter(course => !completedCourseIds.includes(course.id))
          .map(course => course.title);

        const expiredCertifications = certifications.filter(
          cert => cert.expiresAt && cert.expiresAt < new Date()
        );

        return {
          agent,
          missingCourses,
          expiredCertifications,
          isCompliant: missingCourses.length === 0 && expiredCertifications.length === 0
        };
      })
    );

    const compliantAgents = complianceResults.filter(result => result.isCompliant).length;

    return {
      totalAgents: agents.length,
      compliantAgents,
      nonCompliantAgents: complianceResults
        .filter(result => !result.isCompliant)
        .map(result => ({
          agent: result.agent,
          missingCourses: result.missingCourses,
          expiredCertifications: result.expiredCertifications
        })),
      complianceRate: agents.length > 0 ? (compliantAgents / agents.length) * 100 : 0
    };
  }
}
