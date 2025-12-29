import { logger } from '@insurance-lead-gen/core';
import type { PrismaClient } from '@prisma/client';
import type {
  Course,
  CourseModule,
  CourseEnrollment,
  CourseProgress,
  Certificate,
  LearningPath,
  TrainingAnalytics,
  TrainingRecommendation,
  CourseCategory,
  CourseDifficulty,
  CourseStatus,
  EnrollmentStatus,
  CertificateStatus,
  ModuleType,
  AssessmentType,
} from '@insurance-lead-gen/types';

// In-memory storage for education entities (simulating database)
// In production, these would be Prisma models
const courses: Map<string, Course> = new Map();
const enrollments: Map<string, CourseEnrollment> = new Map();
const certificates: Map<string, Certificate> = new Map();
const learningPaths: Map<string, LearningPath> = new Map();

// Helper to generate unique IDs
const generateId = (): string => crypto.randomUUID();

// Helper to generate certificate number
const generateCertificateNumber = (courseId: string, agentId: string): string => {
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `CERT-${courseId.slice(0, 4).toUpperCase()}-${agentId.slice(0, 4).toUpperCase()}-${date}-${random}`;
};

export class EducationService {
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
    logger.info('EducationService initialized');
  }

  // ========================================
  // COURSE MANAGEMENT
  // ========================================

  /**
   * Create a new course
   */
  async createCourse(params: {
    title: string;
    description: string;
    category: CourseCategory;
    difficulty: CourseDifficulty;
    duration: number;
    objectives: string[];
    prerequisites: string[];
    tags: string[];
    createdBy: string;
    modules?: CourseModule[];
  }): Promise<Course> {
    const course: Course = {
      id: generateId(),
      title: params.title,
      description: params.description,
      category: params.category,
      difficulty: params.difficulty,
      status: 'draft',
      duration: params.duration,
      objectives: params.objectives,
      prerequisites: params.prerequisites,
      tags: params.tags,
      createdBy: params.createdBy,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      modules: params.modules || [],
    };

    courses.set(course.id, course);
    logger.info('Course created', { courseId: course.id, title: course.title });
    return course;
  }

  /**
   * Get course by ID
   */
  async getCourseById(courseId: string): Promise<Course | null> {
    return courses.get(courseId) || null;
  }

  /**
   * List all courses with optional filters
   */
  async listCourses(params?: {
    category?: CourseCategory;
    difficulty?: CourseDifficulty;
    status?: CourseStatus;
    search?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ courses: Course[]; total: number }> {
    let filteredCourses = Array.from(courses.values());

    if (params?.category) {
      filteredCourses = filteredCourses.filter(c => c.category === params.category);
    }
    if (params?.difficulty) {
      filteredCourses = filteredCourses.filter(c => c.difficulty === params.difficulty);
    }
    if (params?.status) {
      filteredCourses = filteredCourses.filter(c => c.status === params.status);
    }
    if (params?.search) {
      const searchLower = params.search.toLowerCase();
      filteredCourses = filteredCourses.filter(c =>
        c.title.toLowerCase().includes(searchLower) ||
        c.description.toLowerCase().includes(searchLower)
      );
    }

    const total = filteredCourses.length;
    const offset = params?.offset || 0;
    const limit = params?.limit || 20;
    filteredCourses = filteredCourses.slice(offset, offset + limit);

    return { courses: filteredCourses, total };
  }

  /**
   * Update course
   */
  async updateCourse(courseId: string, updates: Partial<Course>): Promise<Course | null> {
    const course = courses.get(courseId);
    if (!course) return null;

    const updatedCourse: Course = {
      ...course,
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    courses.set(courseId, updatedCourse);
    return updatedCourse;
  }

  /**
   * Publish course
   */
  async publishCourse(courseId: string): Promise<Course | null> {
    return this.updateCourse(courseId, { status: 'published' });
  }

  /**
   * Archive course
   */
  async archiveCourse(courseId: string): Promise<Course | null> {
    return this.updateCourse(courseId, { status: 'archived' });
  }

  /**
   * Add module to course
   */
  async addModuleToCourse(courseId: string, module: Omit<CourseModule, 'id' | 'courseId' | 'orderIndex'>): Promise<Course | null> {
    const course = courses.get(courseId);
    if (!course) return null;

    const newModule: CourseModule = {
      ...module,
      id: generateId(),
      courseId,
      orderIndex: course.modules.length,
    };

    course.modules.push(newModule);
    course.updatedAt = new Date().toISOString();
    courses.set(courseId, course);
    return course;
  }

  // ========================================
  // ENROLLMENT MANAGEMENT
  // ========================================

  /**
   * Enroll agent in course
   */
  async enrollAgent(params: {
    courseId: string;
    agentId: string;
  }): Promise<CourseEnrollment> {
    const existingEnrollment = Array.from(enrollments.values()).find(
      e => e.courseId === params.courseId && e.agentId === params.agentId
    );

    if (existingEnrollment) {
      return existingEnrollment;
    }

    const enrollment: CourseEnrollment = {
      id: generateId(),
      courseId: params.courseId,
      agentId: params.agentId,
      status: 'enrolled',
      enrolledAt: new Date().toISOString(),
      progress: {
        completedModules: [],
        overallProgress: 0,
        timeSpent: 0,
        quizScores: {},
      },
      assessmentAttempts: 0,
    };

    enrollments.set(enrollment.id, enrollment);
    logger.info('Agent enrolled in course', { enrollmentId: enrollment.id, agentId: params.agentId, courseId: params.courseId });
    return enrollment;
  }

  /**
   * Start course
   */
  async startCourse(enrollmentId: string): Promise<CourseEnrollment | null> {
    const enrollment = enrollments.get(enrollmentId);
    if (!enrollment) return null;

    enrollment.status = 'in_progress';
    enrollment.startedAt = new Date().toISOString();
    enrollment.progress.lastAccessedAt = new Date().toISOString();
    enrollments.set(enrollmentId, enrollment);
    return enrollment;
  }

  /**
   * Complete module
   */
  async completeModule(params: {
    enrollmentId: string;
    moduleId: string;
    timeSpent?: number;
    quizScore?: number;
  }): Promise<CourseEnrollment | null> {
    const enrollment = enrollments.get(params.enrollmentId);
    if (!enrollment) return null;

    const course = courses.get(enrollment.courseId);
    if (!course) return null;

    // Add module to completed if not already
    if (!enrollment.progress.completedModules.includes(params.moduleId)) {
      enrollment.progress.completedModules.push(params.moduleId);
    }

    // Update quiz score if provided
    if (params.quizScore !== undefined) {
      enrollment.progress.quizScores[params.moduleId] = params.quizScore;
    }

    // Update time spent
    if (params.timeSpent) {
      enrollment.progress.timeSpent += params.timeSpent;
    }

    // Calculate overall progress
    const totalModules = course.modules.filter(m => m.isRequired).length;
    const completedRequired = enrollment.progress.completedModules.filter(mId =>
      course.modules.find(m => m.id === mId)?.isRequired
    ).length;
    enrollment.progress.overallProgress = totalModules > 0
      ? Math.round((completedRequired / totalModules) * 100)
      : 0;

    // Check if course is complete
    if (enrollment.progress.overallProgress === 100) {
      enrollment.status = 'completed';
      enrollment.completedAt = new Date().toISOString();
    }

    enrollment.progress.lastAccessedAt = new Date().toISOString();
    enrollments.set(params.enrollmentId, enrollment);
    return enrollment;
  }

  /**
   * Get enrollment by ID
   */
  async getEnrollmentById(enrollmentId: string): Promise<CourseEnrollment | null> {
    return enrollments.get(enrollmentId) || null;
  }

  /**
   * Get agent enrollments
   */
  async getAgentEnrollments(agentId: string): Promise<CourseEnrollment[]> {
    return Array.from(enrollments.values()).filter(e => e.agentId === agentId);
  }

  /**
   * Get course enrollments
   */
  async getCourseEnrollments(courseId: string): Promise<CourseEnrollment[]> {
    return Array.from(enrollments.values()).filter(e => e.courseId === courseId);
  }

  // ========================================
  // CERTIFICATE MANAGEMENT
  // ========================================

  /**
   * Issue certificate for completed course
   */
  async issueCertificate(params: {
    courseId: string;
    agentId: string;
    score?: number;
  }): Promise<Certificate> {
    const certificate: Certificate = {
      id: generateId(),
      courseId: params.courseId,
      agentId: params.agentId,
      certificateNumber: generateCertificateNumber(params.courseId, params.agentId),
      status: 'earned',
      issuedAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(), // 1 year
      score: params.score,
      verificationUrl: `/api/v1/education/certificates/verify/${generateCertificateNumber(params.courseId, params.agentId)}`,
    };

    certificates.set(certificate.id, certificate);
    logger.info('Certificate issued', { certificateId: certificate.id, agentId: params.agentId });
    return certificate;
  }

  /**
   * Get certificate by ID
   */
  async getCertificateById(certificateId: string): Promise<Certificate | null> {
    return certificates.get(certificateId) || null;
  }

  /**
   * Verify certificate
   */
  async verifyCertificate(certificateNumber: string): Promise<Certificate | null> {
    const certificate = Array.from(certificates.values()).find(
      c => c.certificateNumber === certificateNumber
    );
    return certificate || null;
  }

  /**
   * Get agent certificates
   */
  async getAgentCertificates(agentId: string): Promise<Certificate[]> {
    return Array.from(certificates.values()).filter(c => c.agentId === agentId);
  }

  /**
   * Revoke certificate
   */
  async revokeCertificate(certificateId: string): Promise<Certificate | null> {
    const certificate = certificates.get(certificateId);
    if (!certificate) return null;

    certificate.status = 'revoked';
    certificates.set(certificateId, certificate);
    return certificate;
  }

  // ========================================
  // LEARNING PATH MANAGEMENT
  // ========================================

  /**
   * Create learning path
   */
  async createLearningPath(params: {
    title: string;
    description: string;
    courses: string[];
    estimatedDuration: number;
    certification: boolean;
    certificateName?: string;
  }): Promise<LearningPath> {
    const learningPath: LearningPath = {
      id: generateId(),
      title: params.title,
      description: params.description,
      courses: params.courses,
      estimatedDuration: params.estimatedDuration,
      certification: params.certification,
      certificateName: params.certificateName,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    learningPaths.set(learningPath.id, learningPath);
    logger.info('Learning path created', { learningPathId: learningPath.id, title: learningPath.title });
    return learningPath;
  }

  /**
   * Get learning path by ID
   */
  async getLearningPathById(pathId: string): Promise<LearningPath | null> {
    return learningPaths.get(pathId) || null;
  }

  /**
   * List learning paths
   */
  async listLearningPaths(): Promise<LearningPath[]> {
    return Array.from(learningPaths.values());
  }

  // ========================================
  // TRAINING RECOMMENDATIONS
  // ========================================

  /**
   * Generate training recommendations for an agent
   */
  async generateRecommendations(agentId: string): Promise<TrainingRecommendation[]> {
    const recommendations: TrainingRecommendation[] = [];
    const agentEnrollments = await this.getAgentEnrollments(agentId);
    const completedCourseIds = agentEnrollments
      .filter(e => e.status === 'completed')
      .map(e => e.courseId);

    // Find courses that match agent's specialization gaps
    const allCourses = Array.from(courses.values()).filter(c => c.status === 'published');

    for (const course of allCourses) {
      if (!completedCourseIds.includes(course.id)) {
        // Check if prerequisites are met
        const prerequisitesMet = course.prerequisites.every(p =>
          completedCourseIds.includes(p)
        );

        if (prerequisitesMet) {
          recommendations.push({
            agentId,
            recommendedCourses: [course.id],
            reason: `Enhance your ${course.category.replace('_', ' ')} knowledge`,
            priority: course.difficulty === 'advanced' ? 'high' : 'medium',
            basedOnPerformance: false,
          });
        }
      }
    }

    return recommendations.slice(0, 5);
  }

  // ========================================
  // ANALYTICS
  // ========================================

  /**
   * Get training analytics
   */
  async getTrainingAnalytics(): Promise<TrainingAnalytics> {
    const allCourses = Array.from(courses.values());
    const allEnrollments = Array.from(enrollments.values());

    // Calculate completion rate
    const completedEnrollments = allEnrollments.filter(e => e.status === 'completed');
    const completionRate = allEnrollments.length > 0
      ? (completedEnrollments.length / allEnrollments.length) * 100
      : 0;

    // Calculate average score
    const scores = completedEnrollments
      .filter(e => e.assessmentScore !== undefined)
      .map(e => e.assessmentScore!);
    const averageScore = scores.length > 0
      ? scores.reduce((a, b) => a + b, 0) / scores.length
      : 0;

    // Category distribution
    const categoryDistribution: Record<CourseCategory, number> = {
      product_training: 0,
      compliance: 0,
      sales_techniques: 0,
      customer_service: 0,
      technology: 0,
      lead_generation: 0,
      closing_skills: 0,
      market_knowledge: 0,
    };

    for (const course of allCourses) {
      categoryDistribution[course.category]++;
    }

    // Popular courses
    const courseEnrollments: Record<string, number> = {};
    for (const enrollment of allEnrollments) {
      courseEnrollments[enrollment.courseId] = (courseEnrollments[enrollment.courseId] || 0) + 1;
    }

    const popularCourses = Object.entries(courseEnrollments)
      .map(([courseId, count]) => {
        const course = courses.get(courseId);
        return {
          courseId,
          title: course?.title || 'Unknown',
          enrollments: count,
        };
      })
      .sort((a, b) => b.enrollments - a.enrollments)
      .slice(0, 5);

    return {
      totalCourses: allCourses.length,
      totalEnrollments: allEnrollments.length,
      completionRate,
      averageScore,
      popularCourses,
      categoryDistribution,
    };
  }

  // ========================================
  // ASSESSMENTS
  // ========================================

  /**
   * Submit assessment
   */
  async submitAssessment(params: {
    enrollmentId: string;
    answers: Record<string, string | string[]>;
  }): Promise<{ passed: boolean; score: number; feedback: string[] }> {
    const enrollment = enrollments.get(params.enrollmentId);
    if (!enrollment) {
      return { passed: false, score: 0, feedback: ['Enrollment not found'] };
    }

    const course = courses.get(enrollment.courseId);
    if (!course || !course.assessment) {
      return { passed: false, score: 0, feedback: ['Assessment not found'] };
    }

    if (enrollment.assessmentAttempts >= course.assessment.maxAttempts) {
      return { passed: false, score: 0, feedback: ['Maximum attempts reached'] };
    }

    // Calculate score
    let correctAnswers = 0;
    const feedback: string[] = [];

    for (const question of course.assessment.questions) {
      const userAnswer = params.answers[question.id];
      const isCorrect = Array.isArray(userAnswer)
        ? JSON.stringify(userAnswer.sort()) === JSON.stringify(
            Array.isArray(question.correctAnswer) ? question.correctAnswer.sort() : [question.correctAnswer]
          )
        : userAnswer === question.correctAnswer;

      if (isCorrect) {
        correctAnswers++;
      } else {
        feedback.push(`Question "${question.question}": Incorrect. ${question.correctAnswer}`);
      }
    }

    const score = Math.round((correctAnswers / course.assessment.questions.length) * 100);
    const passed = score >= course.assessment.passingScore;

    enrollment.assessmentScore = score;
    enrollment.assessmentAttempts++;
    enrollments.set(params.enrollmentId, enrollment);

    if (passed) {
      // Issue certificate
      await this.issueCertificate({
        courseId: enrollment.courseId,
        agentId: enrollment.agentId,
        score,
      });
      enrollment.status = 'certified';
      enrollments.set(params.enrollmentId, enrollment);
    }

    return { passed, score, feedback };
  }
}
