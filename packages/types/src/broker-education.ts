// ========================================
// Broker Education & Competency Types
// ========================================

export enum CourseStatus {
  DRAFT = 'DRAFT',
  PUBLISHED = 'PUBLISHED',
  ARCHIVED = 'ARCHIVED',
}

export enum EnrollmentStatus {
  NOT_STARTED = 'NOT_STARTED',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  DROPPED = 'DROPPED',
}

export enum QuestionType {
  MULTIPLE_CHOICE = 'MULTIPLE_CHOICE',
  TRUE_FALSE = 'TRUE_FALSE',
  SHORT_ANSWER = 'SHORT_ANSWER',
  ESSAY = 'ESSAY',
}

export enum AssessmentType {
  QUIZ = 'QUIZ',
  EXAM = 'EXAM',
  CERTIFICATION = 'CERTIFICATION',
}

export enum CompetencyLevel {
  NOVICE = 'NOVICE',
  BEGINNER = 'BEGINNER',
  INTERMEDIATE = 'INTERMEDIATE',
  ADVANCED = 'ADVANCED',
  EXPERT = 'EXPERT',
}

export enum CertificateStatus {
  ACTIVE = 'ACTIVE',
  EXPIRED = 'EXPIRED',
  REVOKED = 'REVOKED',
}

// ========================================
// Course Types
// ========================================

export interface Course {
  id: string;
  title: string;
  description: string;
  category: string;
  level: CompetencyLevel;
  status: CourseStatus;
  thumbnailUrl?: string;
  estimatedHours: number;
  totalLessons: number;
  prerequisites?: string[];
  tags: string[];
  objectives: string[];
  instructorName?: string;
  version: number;
  publishedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateCourseDto {
  title: string;
  description: string;
  category: string;
  level: CompetencyLevel;
  estimatedHours: number;
  prerequisites?: string[];
  tags?: string[];
  objectives?: string[];
  instructorName?: string;
}

export interface UpdateCourseDto {
  title?: string;
  description?: string;
  category?: string;
  level?: CompetencyLevel;
  status?: CourseStatus;
  thumbnailUrl?: string;
  estimatedHours?: number;
  prerequisites?: string[];
  tags?: string[];
  objectives?: string[];
  instructorName?: string;
}

export interface Module {
  id: string;
  courseId: string;
  title: string;
  description: string;
  order: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateModuleDto {
  courseId: string;
  title: string;
  description?: string;
  order: number;
}

export interface Lesson {
  id: string;
  moduleId: string;
  title: string;
  content: string;
  videoUrl?: string;
  resourcesUrl?: string;
  order: number;
  durationMinutes?: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateLessonDto {
  moduleId: string;
  title: string;
  content: string;
  videoUrl?: string;
  resourcesUrl?: string;
  order: number;
  durationMinutes?: number;
}

// ========================================
// Assessment Types
// ========================================

export interface Assessment {
  id: string;
  courseId: string;
  title: string;
  description: string;
  type: AssessmentType;
  timeLimitMinutes?: number;
  passingScore: number;
  maxAttempts: number;
  questionsCount: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateAssessmentDto {
  courseId: string;
  title: string;
  description?: string;
  type: AssessmentType;
  timeLimitMinutes?: number;
  passingScore: number;
  maxAttempts: number;
}

export interface Question {
  id: string;
  assessmentId: string;
  type: QuestionType;
  text: string;
  options?: string[];
  correctAnswer: string;
  explanation?: string;
  points: number;
  order: number;
}

export interface CreateQuestionDto {
  assessmentId: string;
  type: QuestionType;
  text: string;
  options?: string[];
  correctAnswer: string;
  explanation?: string;
  points: number;
  order: number;
}

export interface AssessmentAttempt {
  id: string;
  assessmentId;
  agentId: string;
  attemptNumber: number;
  score: number;
  passed: boolean;
  startedAt: Date;
  completedAt?: Date;
  answers: Json;
}

export interface CreateAssessmentAttemptDto {
  assessmentId: string;
  agentId: string;
  answers: Record<string, string>;
}

// ========================================
// Enrollment & Progress Types
// ========================================

export interface Enrollment {
  id: string;
  courseId: string;
  agentId: string;
  status: EnrollmentStatus;
  progress: number;
  currentLessonId?: string;
  enrolledAt: Date;
  completedAt?: Date;
  lastAccessedAt?: Date;
}

export interface LessonProgress {
  id: string;
  enrollmentId: string;
  lessonId: string;
  completed: boolean;
  timeSpentMinutes: number;
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface ProgressSummary {
  courseId: string;
  courseTitle: string;
  status: EnrollmentStatus;
  progress: number;
  completedLessons: number;
  totalLessons: number;
  timeSpentMinutes: number;
  enrolledAt: Date;
  lastAccessedAt?: Date;
}

// ========================================
// Competency Types
// ========================================

export interface Competency {
  id: string;
  name: string;
  description: string;
  category: string;
  level: CompetencyLevel;
  skills: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface AgentCompetency {
  id: string;
  agentId: string;
  competencyId: string;
  level: CompetencyLevel;
  assessedAt: Date;
  evidence?: string[];
  assessmentMethod?: string;
}

export interface CompetencyGap {
  competencyId: string;
  competencyName: string;
  currentLevel: CompetencyLevel;
  requiredLevel: CompetencyLevel;
  gapLevel: CompetencyLevel;
  recommendedCourses: string[];
}

export interface CreateCompetencyDto {
  name: string;
  description: string;
  category: string;
  level: CompetencyLevel;
  skills: string[];
}

// ========================================
// Learning Path Types
// ========================================

export interface LearningPath {
  id: string;
  title: string;
  description: string;
  category: string;
  targetRole?: string;
  targetLevel: CompetencyLevel;
  estimatedWeeks: number;
  requiredCourses: string[];
  electiveCourses: string[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateLearningPathDto {
  title: string;
  description: string;
  category: string;
  targetRole?: string;
  targetLevel: CompetencyLevel;
  estimatedWeeks: number;
  requiredCourses: string[];
  electiveCourses?: string[];
}

export interface PathEnrollment {
  id: string;
  learningPathId: string;
  agentId: string;
  status: EnrollmentStatus;
  progress: number;
  enrolledAt: Date;
  completedAt?: Date;
  completedCourses: string[];
}

export interface PathProgress {
  learningPathId: string;
  learningPathTitle: string;
  status: EnrollmentStatus;
  progress: number;
  completedCourses: string[];
  totalRequiredCourses: number;
  completedRequiredCourses: number;
  nextRecommendedCourse?: string;
  enrolledAt: Date;
  estimatedCompletionDate?: Date;
}

// ========================================
// Certificate Types
// ========================================

export interface Certificate {
  id: string;
  agentId: string;
  courseId?: string;
  assessmentId?: string;
  certificateNumber: string;
  title: string;
  description: string;
  issueDate: Date;
  expiryDate?: Date;
  status: CertificateStatus;
  verificationUrl?: string;
  credentialId?: string;
}

export interface CreateCertificateDto {
  agentId: string;
  courseId?: string;
  assessmentId?: string;
  title: string;
  description: string;
  expiryDate?: Date;
  credentialId?: string;
}

export interface CertificateValidation {
  valid: boolean;
  certificate: Certificate;
  agentName?: string;
  courseTitle?: string;
  status: CertificateStatus;
}

// ========================================
// Analytics Types
// ========================================

export interface EducationAnalytics {
  totalCourses: number;
  totalEnrollments: number;
  activeEnrollments: number;
  completionRate: number;
  averageCompletionTime: number;
  topPerformingCourses: CoursePerformance[];
  skillGaps: CompetencyGap[];
}

export interface CoursePerformance {
  courseId: string;
  courseTitle: string;
  enrollments: number;
  completions: number;
  completionRate: number;
  averageScore: number;
  averageTimeToComplete: number;
}

export interface AgentEducationProfile {
  agentId: string;
  agentName: string;
  totalEnrollments: number;
  completedCourses: number;
  activeEnrollments: number;
  certificates: number;
  competencies: AgentCompetency[];
  learningPaths: PathProgress[];
  skillGaps: CompetencyGap[];
  totalLearningHours: number;
}
