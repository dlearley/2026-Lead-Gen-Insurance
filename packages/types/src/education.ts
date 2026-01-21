// ========================================
// EDUCATION & TRAINING TYPES (Phase 29)
// ========================================

export type CourseCategory = 
  | 'ONBOARDING'
  | 'COMPLIANCE'
  | 'PRODUCTS'
  | 'SALES_TECHNIQUES'
  | 'CUSTOMER_SERVICE'
  | 'REGULATORY'
  | 'TECHNOLOGY'
  | 'LEADERSHIP'
  | 'SPECIALIZATIONS'
  | 'CONTINUING_EDUCATION';

export type CourseLevel = 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' | 'EXPERT';

export type ContentType = 'VIDEO' | 'DOCUMENT' | 'INTERACTIVE' | 'WEBINAR' | 'SIMULATION' | 'QUIZ';

export type ProgressStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED';

export type EnrollmentStatus = 'ENROLLED' | 'IN_PROGRESS' | 'COMPLETED' | 'DROPPED' | 'FAILED';

export type EducationLevel = 'NONE' | 'HIGH_SCHOOL' | 'ASSOCIATE' | 'BACHELOR' | 'MASTER' | 'DOCTORATE';

export type LearningStyle = 'VIDEO' | 'TEXT' | 'INTERACTIVE' | 'HANDS_ON' | 'GROUP';

export interface Course {
  id: string;
  title: string;
  description?: string;
  category: CourseCategory;
  level: CourseLevel;
  duration: number; // Duration in minutes
  estimatedHours?: number;
  thumbnailUrl?: string;
  contentType: ContentType;
  isMandatory: boolean;
  isActive: boolean;
  objectives: string[];
  prerequisites: string[];
  tags: string[];
  createdBy?: string;
  createdAt: Date;
  updatedAt: Date;
  modules?: CourseModule[];
  enrollments?: CourseEnrollment[];
  certifications?: CourseCertification[];
}

export interface CourseModule {
  id: string;
  courseId: string;
  title: string;
  description?: string;
  orderIndex: number;
  content: Record<string, unknown>; // Flexible content structure
  duration?: number;
  isRequired: boolean;
  hasQuiz: boolean;
  passingScore?: number;
  createdAt: Date;
  updatedAt: Date;
  quizzes?: ModuleQuiz[];
  progresses?: ModuleProgress[];
}

export interface ModuleQuiz {
  id: string;
  moduleId: string;
  title: string;
  description?: string;
  questions: Record<string, unknown>; // Quiz questions structure
  timeLimit?: number;
  maxAttempts: number;
  passingScore: number;
  shuffleQuestions: boolean;
  shuffleAnswers: boolean;
  createdAt: Date;
  updatedAt: Date;
  attempts?: QuizAttempt[];
}

export interface LearningPath {
  id: string;
  title: string;
  description?: string;
  category: CourseCategory;
  level: CourseLevel;
  estimatedHours?: number;
  isMandatory: boolean;
  isActive: boolean;
  prerequisites: string[];
  targetRoles: string[];
  specialization: InsuranceType[];
  tags: string[];
  createdBy?: string;
  createdAt: Date;
  updatedAt: Date;
  courses?: PathCourse[];
  enrollments?: PathEnrollment[];
}

export interface PathCourse {
  id: string;
  learningPathId: string;
  courseId: string;
  orderIndex: number;
  isRequired: boolean;
  passingScore?: number;
  createdAt: Date;
  learningPath?: LearningPath;
  course?: Course;
}

export interface CourseEnrollment {
  id: string;
  courseId: string;
  agentId: string;
  status: EnrollmentStatus;
  progress: number; // 0-100
  completedAt?: Date;
  finalScore?: number;
  passingScore?: number;
  enrolledAt: Date;
  startedAt?: Date;
  course?: Course;
  agent?: Agent;
  moduleProgresses?: ModuleProgress[];
}

export interface ModuleProgress {
  id: string;
  status: ProgressStatus;
  progress: number; // 0-100
  timeSpent: number; // Time spent in minutes
  startedAt?: Date;
  completedAt?: Date;
  enrollment?: CourseEnrollment;
  module?: CourseModule;
  quizAttempts?: QuizAttempt[];
}

export interface PathEnrollment {
  id: string;
  learningPathId: string;
  agentId: string;
  status: EnrollmentStatus;
  progress: number; // 0-100
  enrolledAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  learningPath?: LearningPath;
  agent?: Agent;
}

export interface QuizAttempt {
  id: string;
  quizId: string;
  moduleProgressId: string;
  attemptNumber: number;
  score: number; // Score achieved (0-100)
  passed: boolean;
  timeSpent?: number;
  answers: Record<string, unknown>; // User's answers
  correctAnswers?: Record<string, unknown>; // Correct answers (for review)
  startedAt: Date;
  completedAt?: Date;
  quiz?: ModuleQuiz;
  moduleProgress?: ModuleProgress;
}

export interface CourseCertification {
  id: string;
  courseId: string;
  agentId: string;
  certificateNumber: string;
  score: number;
  issuedAt: Date;
  expiresAt?: Date;
  version: string;
  isActive: boolean;
  course?: Course;
  agent?: Agent;
}

// Enhanced Agent interface for education
export interface Agent {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  licenseNumber: string;
  specializations: InsuranceType[];
  city: string;
  state: string;
  country: string;
  zipCode?: string;
  rating: number;
  averageResponseTime: number;
  conversionRate: number;
  totalLeadsAssigned: number;
  totalLeadsConverted: number;
  maxLeadCapacity: number;
  currentLeadCount: number;
  status: AgentStatus;
  isActive: boolean;
  passwordHash?: string;
  lastLoginAt?: Date;
  // Education fields
  educationLevel: EducationLevel;
  totalTrainingHours: number;
  certificationsCount: number;
  lastTrainingDate?: Date;
  expertiseAreas: string[];
  skillAssessments?: Record<string, unknown>;
  learningGoals: string[];
  preferredLearningStyle: LearningStyle;
  educationMetadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export type AgentStatus = 'ACTIVE' | 'INACTIVE' | 'SUSPENDED' | 'PENDING_VERIFICATION';

// Import InsuranceType from scoring.ts
import type { InsuranceType } from './scoring.js';

// DTOs for API requests
export interface CreateCourseDto {
  title: string;
  description?: string;
  category: CourseCategory;
  level: CourseLevel;
  duration: number;
  estimatedHours?: number;
  thumbnailUrl?: string;
  contentType: ContentType;
  isMandatory?: boolean;
  objectives?: string[];
  prerequisites?: string[];
  tags?: string[];
}

export interface UpdateCourseDto {
  title?: string;
  description?: string;
  category?: CourseCategory;
  level?: CourseLevel;
  duration?: number;
  estimatedHours?: number;
  thumbnailUrl?: string;
  contentType?: ContentType;
  isMandatory?: boolean;
  isActive?: boolean;
  objectives?: string[];
  prerequisites?: string[];
  tags?: string[];
}

export interface CreateLearningPathDto {
  title: string;
  description?: string;
  category: CourseCategory;
  level: CourseLevel;
  estimatedHours?: number;
  isMandatory?: boolean;
  prerequisites?: string[];
  targetRoles?: string[];
  specialization: InsuranceType[];
  tags?: string[];
}

export interface UpdateLearningPathDto {
  title?: string;
  description?: string;
  category?: CourseCategory;
  level?: CourseLevel;
  estimatedHours?: number;
  isMandatory?: boolean;
  isActive?: boolean;
  prerequisites?: string[];
  targetRoles?: string[];
  specialization?: InsuranceType[];
  tags?: string[];
}

export interface EnrollCourseDto {
  agentId: string;
}

export interface EnrollLearningPathDto {
  agentId: string;
}

export interface UpdateProgressDto {
  progress?: number;
  timeSpent?: number;
  status?: ProgressStatus;
}

export interface SubmitQuizDto {
  moduleProgressId: string;
  answers: Record<string, unknown>;
  timeSpent?: number;
}

export interface UpdateAgentEducationDto {
  educationLevel?: EducationLevel;
  expertiseAreas?: string[];
  skillAssessments?: Record<string, unknown>;
  learningGoals?: string[];
  preferredLearningStyle?: LearningStyle;
  educationMetadata?: Record<string, unknown>;
}

// Query parameters for filtering
export interface CourseFilterParams {
  category?: CourseCategory;
  level?: CourseLevel;
  contentType?: ContentType;
  isMandatory?: boolean;
  isActive?: boolean;
  tags?: string[];
  search?: string;
  page?: number;
  limit?: number;
}

export interface LearningPathFilterParams {
  category?: CourseCategory;
  level?: CourseLevel;
  isMandatory?: boolean;
  isActive?: boolean;
  tags?: string[];
  specialization?: InsuranceType;
  search?: string;
  page?: number;
  limit?: number;
}

export interface EnrollmentFilterParams {
  agentId?: string;
  courseId?: string;
  status?: EnrollmentStatus;
  dateFrom?: Date;
  dateTo?: Date;
  page?: number;
  limit?: number;
}

// Statistics and Analytics
export interface EducationStats {
  totalCourses: number;
  totalEnrollments: number;
  totalCompletions: number;
  averageCompletionTime: number;
  certificationRate: number;
  totalTrainingHours: number;
  topPerformingCourses: Array<{
    courseId: string;
    title: string;
    completionRate: number;
    averageScore: number;
  }>;
  agentProgressStats: {
    topPerformers: Array<{
      agentId: string;
      agentName: string;
      coursesCompleted: number;
      totalHours: number;
    }>;
    completionRates: Record<CourseCategory, number>;
    averageScores: Record<CourseCategory, number>;
  };
}

export interface AgentEducationProfile {
  agent: Agent;
  enrolledCourses: CourseEnrollment[];
  completedCourses: CourseEnrollment[];
  certifications: CourseCertification[];
  learningPaths: PathEnrollment[];
  skillAssessments: Record<string, {
    skill: string;
    level: number;
    lastAssessment: Date;
  }>;
  progressStats: {
    totalCoursesEnrolled: number;
    totalCoursesCompleted: number;
    totalTrainingHours: number;
    averageScore: number;
    certificationsEarned: number;
  };
}
