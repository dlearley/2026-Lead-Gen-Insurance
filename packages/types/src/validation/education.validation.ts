import { z } from 'zod';
import {
  CourseCategory,
  CourseLevel,
  ContentType,
  ProgressStatus,
  EnrollmentStatus,
  EducationLevel,
  LearningStyle,
  InsuranceType
} from '@insurance/types';

// Course Schemas
export const createCourseSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  category: z.nativeEnum(CourseCategory),
  level: z.nativeEnum(CourseLevel),
  duration: z.number().min(1, 'Duration must be at least 1 minute'),
  estimatedHours: z.number().positive().optional(),
  thumbnailUrl: z.string().url().optional(),
  contentType: z.nativeEnum(ContentType),
  isMandatory: z.boolean().default(false),
  objectives: z.array(z.string()).default([]),
  prerequisites: z.array(z.string()).default([]),
  tags: z.array(z.string()).default([])
});

export const updateCourseSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  category: z.nativeEnum(CourseCategory).optional(),
  level: z.nativeEnum(CourseLevel).optional(),
  duration: z.number().min(1).optional(),
  estimatedHours: z.number().positive().optional(),
  thumbnailUrl: z.string().url().optional(),
  contentType: z.nativeEnum(ContentType).optional(),
  isMandatory: z.boolean().optional(),
  isActive: z.boolean().optional(),
  objectives: z.array(z.string()).optional(),
  prerequisites: z.array(z.string()).optional(),
  tags: z.array(z.string()).optional()
});

// Learning Path Schemas
export const createLearningPathSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  category: z.nativeEnum(CourseCategory),
  level: z.nativeEnum(CourseLevel),
  estimatedHours: z.number().positive().optional(),
  isMandatory: z.boolean().default(false),
  prerequisites: z.array(z.string()).default([]),
  targetRoles: z.array(z.string()).default([]),
  specialization: z.array(z.nativeEnum(InsuranceType)),
  tags: z.array(z.string()).default([])
});

export const updateLearningPathSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  category: z.nativeEnum(CourseCategory).optional(),
  level: z.nativeEnum(CourseLevel).optional(),
  estimatedHours: z.number().positive().optional(),
  isMandatory: z.boolean().optional(),
  isActive: z.boolean().optional(),
  prerequisites: z.array(z.string()).optional(),
  targetRoles: z.array(z.string()).optional(),
  specialization: z.array(z.nativeEnum(InsuranceType)).optional(),
  tags: z.array(z.string()).optional()
});

// Course Module Schema
export const createCourseModuleSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  orderIndex: z.number().int().min(0, 'Order index must be non-negative'),
  content: z.record(z.unknown()),
  duration: z.number().positive().optional(),
  isRequired: z.boolean().default(true),
  hasQuiz: z.boolean().default(false),
  passingScore: z.number().min(0).max(100).optional()
});

// Quiz Schema
export const createModuleQuizSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  questions: z.record(z.unknown()),
  timeLimit: z.number().positive().optional(),
  maxAttempts: z.number().int().min(1).default(3),
  passingScore: z.number().min(0).max(100).default(70),
  shuffleQuestions: z.boolean().default(false),
  shuffleAnswers: z.boolean().default(false)
});

// Enrollment Schemas
export const enrollCourseSchema = z.object({
  agentId: z.string().uuid('Invalid agent ID')
});

export const enrollLearningPathSchema = z.object({
  agentId: z.string().uuid('Invalid agent ID')
});

// Progress Schemas
export const updateProgressSchema = z.object({
  progress: z.number().min(0).max(100).optional(),
  timeSpent: z.number().min(0).optional(),
  status: z.nativeEnum(ProgressStatus).optional()
});

// Quiz Submission Schema
export const submitQuizSchema = z.object({
  moduleProgressId: z.string().uuid('Invalid module progress ID'),
  answers: z.record(z.unknown()),
  timeSpent: z.number().positive().optional()
});

// Agent Education Schema
export const updateAgentEducationSchema = z.object({
  educationLevel: z.nativeEnum(EducationLevel).optional(),
  expertiseAreas: z.array(z.string()).optional(),
  skillAssessments: z.record(z.unknown()).optional(),
  learningGoals: z.array(z.string()).optional(),
  preferredLearningStyle: z.nativeEnum(LearningStyle).optional(),
  educationMetadata: z.record(z.unknown()).optional()
});

// Query Parameter Schemas
export const courseFilterSchema = z.object({
  category: z.nativeEnum(CourseCategory).optional(),
  level: z.nativeEnum(CourseLevel).optional(),
  contentType: z.nativeEnum(ContentType).optional(),
  isMandatory: z.string().transform(val => val === 'true').optional(),
  isActive: z.string().transform(val => val !== 'false').optional(),
  tags: z.string().transform(tags => tags.split(',')).optional(),
  search: z.string().optional(),
  page: z.string().transform(val => parseInt(val, 10)).optional(),
  limit: z.string().transform(val => parseInt(val, 10)).optional()
});

export const learningPathFilterSchema = z.object({
  category: z.nativeEnum(CourseCategory).optional(),
  level: z.nativeEnum(CourseLevel).optional(),
  isMandatory: z.string().transform(val => val === 'true').optional(),
  isActive: z.string().transform(val => val !== 'false').optional(),
  tags: z.string().transform(tags => tags.split(',')).optional(),
  specialization: z.nativeEnum(InsuranceType).optional(),
  search: z.string().optional(),
  page: z.string().transform(val => parseInt(val, 10)).optional(),
  limit: z.string().transform(val => parseInt(val, 10)).optional()
});

export const enrollmentFilterSchema = z.object({
  agentId: z.string().uuid().optional(),
  courseId: z.string().uuid().optional(),
  status: z.nativeEnum(EnrollmentStatus).optional(),
  dateFrom: z.string().transform(val => new Date(val)).optional(),
  dateTo: z.string().transform(val => new Date(val)).optional(),
  page: z.string().transform(val => parseInt(val, 10)).optional(),
  limit: z.string().transform(val => parseInt(val, 10)).optional()
});

// Export types for convenience
export type CreateCourseInput = z.infer<typeof createCourseSchema>;
export type UpdateCourseInput = z.infer<typeof updateCourseSchema>;
export type CreateLearningPathInput = z.infer<typeof createLearningPathSchema>;
export type UpdateLearningPathInput = z.infer<typeof updateLearningPathSchema>;
export type CreateCourseModuleInput = z.infer<typeof createCourseModuleSchema>;
export type CreateModuleQuizInput = z.infer<typeof createModuleQuizSchema>;
export type EnrollCourseInput = z.infer<typeof enrollCourseSchema>;
export type EnrollLearningPathInput = z.infer<typeof enrollLearningPathSchema>;
export type UpdateProgressInput = z.infer<typeof updateProgressSchema>;
export type SubmitQuizInput = z.infer<typeof submitQuizSchema>;
export type UpdateAgentEducationInput = z.infer<typeof updateAgentEducationSchema>;
export type CourseFilterInput = z.infer<typeof courseFilterSchema>;
export type LearningPathFilterInput = z.infer<typeof learningPathFilterSchema>;
export type EnrollmentFilterInput = z.infer<typeof enrollmentFilterSchema>;
