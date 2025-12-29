// ========================================
// EDUCATION & TRAINING TYPES
// Phase 12.3: Education System for Agents & Brokers
// ========================================

export type CourseCategory = 
  | 'product_training'
  | 'compliance'
  | 'sales_techniques'
  | 'customer_service'
  | 'technology'
  | 'lead_generation'
  | 'closing_skills'
  | 'market_knowledge';

export type CourseDifficulty = 'beginner' | 'intermediate' | 'advanced' | 'expert';

export type CourseStatus = 'draft' | 'published' | 'archived';

export type EnrollmentStatus = 'not_enrolled' | 'enrolled' | 'in_progress' | 'completed' | 'certified';

export type ModuleType = 'video' | 'reading' | 'quiz' | 'assignment' | 'live_session';

export type AssessmentType = 'quiz' | 'practical' | 'peer_review' | 'final_exam';

export type CertificateStatus = 'pending' | 'earned' | 'expired' | 'revoked';

export interface Course {
  id: string;
  title: string;
  description: string;
  category: CourseCategory;
  difficulty: CourseDifficulty;
  status: CourseStatus;
  duration: number; // in minutes
  thumbnailUrl?: string;
  objectives: string[];
  prerequisites: string[];
  tags: string[];
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  modules: CourseModule[];
  assessment?: CourseAssessment;
}

export interface CourseModule {
  id: string;
  courseId: string;
  title: string;
  description: string;
  type: ModuleType;
  orderIndex: number;
  duration: number;
  content: ModuleContent;
  isRequired: boolean;
}

export interface ModuleContent {
  videoUrl?: string;
  videoDuration?: number;
  textContent?: string;
  readingTime?: number;
  quizQuestions?: QuizQuestion[];
  assignmentInstructions?: string;
  liveSessionUrl?: string;
  liveSessionDate?: string;
  resources?: Resource[];
}

export interface QuizQuestion {
  id: string;
  question: string;
  type: 'multiple_choice' | 'true_false' | 'short_answer';
  options?: string[];
  correctAnswer: string | string[];
  explanation?: string;
  points: number;
}

export interface CourseAssessment {
  id: string;
  courseId: string;
  type: AssessmentType;
  passingScore: number; // percentage
  maxAttempts: number;
  timeLimit?: number; // in minutes
  questions: AssessmentQuestion[];
}

export interface AssessmentQuestion {
  id: string;
  question: string;
  type: 'multiple_choice' | 'true_false' | 'scenario';
  options?: string[];
  correctAnswer: string | string[];
  points: number;
}

export interface CourseEnrollment {
  id: string;
  courseId: string;
  agentId: string;
  status: EnrollmentStatus;
  enrolledAt: string;
  startedAt?: string;
  completedAt?: string;
  progress: CourseProgress;
  assessmentScore?: number;
  assessmentAttempts: number;
}

export interface CourseProgress {
  completedModules: string[];
  currentModuleId?: string;
  overallProgress: number; // percentage
  timeSpent: number; // in minutes
  lastAccessedAt?: string;
  quizScores: Record<string, number>;
}

export interface Certificate {
  id: string;
  courseId: string;
  agentId: string;
  certificateNumber: string;
  status: CertificateStatus;
  issuedAt?: string;
  expiresAt?: string;
  score?: number;
  verificationUrl: string;
}

export interface LearningPath {
  id: string;
  title: string;
  description: string;
  courses: string[]; // course IDs
  estimatedDuration: number;
  certification: boolean;
  certificateName?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AgentLearning {
  agentId: string;
  enrollments: CourseEnrollment[];
  certificates: Certificate[];
  completedCourses: string[];
  inProgressCourses: string[];
  totalTimeSpent: number;
  skillsAcquired: string[];
  learningStreak: number;
  lastActivityAt?: string;
}

export interface Resource {
  id: string;
  title: string;
  type: 'document' | 'video' | 'link' | 'template' | 'checklist';
  url: string;
  description?: string;
  fileSize?: number;
  downloadCount: number;
}

export interface TrainingRecommendation {
  agentId: string;
  recommendedCourses: string[];
  reason: string;
  priority: 'low' | 'medium' | 'high';
  basedOnPerformance: boolean;
}

export interface TrainingAnalytics {
  totalCourses: number;
  totalEnrollments: number;
  completionRate: number;
  averageScore: number;
  popularCourses: { courseId: string; title: string; enrollments: number }[];
  categoryDistribution: Record<CourseCategory, number>;
}
