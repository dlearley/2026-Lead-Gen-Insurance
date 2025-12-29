import { Router, Request, Response } from 'express';
import { EducationService } from '../services/education.service.js';
import { prisma } from '../prisma/client.js';
import { logger } from '@insurance-lead-gen/core';
import type {
  CourseCategory,
  CourseDifficulty,
  CourseStatus,
  ModuleType,
} from '@insurance-lead-gen/types';

// Create education service instance
const educationService = new EducationService(prisma);

export function createEducationRoutes(): Router {
  const router = Router();

  // ========================================
  // COURSE ROUTES
  // ========================================

  /**
   * Create a new course
   */
  router.post('/courses', async (req: Request, res: Response) => {
    try {
      const {
        title,
        description,
        category,
        difficulty,
        duration,
        objectives,
        prerequisites,
        tags,
        createdBy,
      } = req.body;

      if (!title || !description || !category || !difficulty || !createdBy) {
        return res.status(400).json({ error: 'Missing required fields' });
      }

      const course = await educationService.createCourse({
        title,
        description,
        category,
        difficulty,
        duration: duration || 0,
        objectives: objectives || [],
        prerequisites: prerequisites || [],
        tags: tags || [],
        createdBy,
      });

      res.status(201).json({ success: true, data: course });
    } catch (error) {
      logger.error('Failed to create course', { error });
      res.status(500).json({ error: 'Failed to create course' });
    }
  });

  /**
   * Get course by ID
   */
  router.get('/courses/:courseId', async (req: Request, res: Response) => {
    try {
      const { courseId } = req.params;
      const course = await educationService.getCourseById(courseId);

      if (!course) {
        return res.status(404).json({ error: 'Course not found' });
      }

      res.json({ success: true, data: course });
    } catch (error) {
      logger.error('Failed to get course', { error, courseId: req.params.courseId });
      res.status(500).json({ error: 'Failed to get course' });
    }
  });

  /**
   * List courses
   */
  router.get('/courses', async (req: Request, res: Response) => {
    try {
      const { category, difficulty, status, search, limit, offset } = req.query;

      const result = await educationService.listCourses({
        category: category as CourseCategory | undefined,
        difficulty: difficulty as CourseDifficulty | undefined,
        status: status as CourseStatus | undefined,
        search: search as string | undefined,
        limit: limit ? parseInt(limit as string) : undefined,
        offset: offset ? parseInt(offset as string) : undefined,
      });

      res.json({ success: true, ...result });
    } catch (error) {
      logger.error('Failed to list courses', { error });
      res.status(500).json({ error: 'Failed to list courses' });
    }
  });

  /**
   * Update course
   */
  router.put('/courses/:courseId', async (req: Request, res: Response) => {
    try {
      const { courseId } = req.params;
      const updates = req.body;

      const course = await educationService.updateCourse(courseId, updates);

      if (!course) {
        return res.status(404).json({ error: 'Course not found' });
      }

      res.json({ success: true, data: course });
    } catch (error) {
      logger.error('Failed to update course', { error, courseId: req.params.courseId });
      res.status(500).json({ error: 'Failed to update course' });
    }
  });

  /**
   * Publish course
   */
  router.post('/courses/:courseId/publish', async (req: Request, res: Response) => {
    try {
      const { courseId } = req.params;
      const course = await educationService.publishCourse(courseId);

      if (!course) {
        return res.status(404).json({ error: 'Course not found' });
      }

      res.json({ success: true, data: course });
    } catch (error) {
      logger.error('Failed to publish course', { error, courseId: req.params.courseId });
      res.status(500).json({ error: 'Failed to publish course' });
    }
  });

  /**
   * Archive course
   */
  router.post('/courses/:courseId/archive', async (req: Request, res: Response) => {
    try {
      const { courseId } = req.params;
      const course = await educationService.archiveCourse(courseId);

      if (!course) {
        return res.status(404).json({ error: 'Course not found' });
      }

      res.json({ success: true, data: course });
    } catch (error) {
      logger.error('Failed to archive course', { error, courseId: req.params.courseId });
      res.status(500).json({ error: 'Failed to archive course' });
    }
  });

  /**
   * Add module to course
   */
  router.post('/courses/:courseId/modules', async (req: Request, res: Response) => {
    try {
      const { courseId } = req.params;
      const moduleData = req.body;

      const course = await educationService.addModuleToCourse(courseId, moduleData);

      if (!course) {
        return res.status(404).json({ error: 'Course not found' });
      }

      res.status(201).json({ success: true, data: course });
    } catch (error) {
      logger.error('Failed to add module to course', { error, courseId: req.params.courseId });
      res.status(500).json({ error: 'Failed to add module' });
    }
  });

  // ========================================
  // ENROLLMENT ROUTES
  // ========================================

  /**
   * Enroll agent in course
   */
  router.post('/enrollments', async (req: Request, res: Response) => {
    try {
      const { courseId, agentId } = req.body;

      if (!courseId || !agentId) {
        return res.status(400).json({ error: 'courseId and agentId are required' });
      }

      const enrollment = await educationService.enrollAgent({ courseId, agentId });

      res.status(201).json({ success: true, data: enrollment });
    } catch (error) {
      logger.error('Failed to enroll agent', { error });
      res.status(500).json({ error: 'Failed to enroll agent' });
    }
  });

  /**
   * Get enrollment by ID
   */
  router.get('/enrollments/:enrollmentId', async (req: Request, res: Response) => {
    try {
      const { enrollmentId } = req.params;
      const enrollment = await educationService.getEnrollmentById(enrollmentId);

      if (!enrollment) {
        return res.status(404).json({ error: 'Enrollment not found' });
      }

      res.json({ success: true, data: enrollment });
    } catch (error) {
      logger.error('Failed to get enrollment', { error, enrollmentId: req.params.enrollmentId });
      res.status(500).json({ error: 'Failed to get enrollment' });
    }
  });

  /**
   * Start course
   */
  router.post('/enrollments/:enrollmentId/start', async (req: Request, res: Response) => {
    try {
      const { enrollmentId } = req.params;
      const enrollment = await educationService.startCourse(enrollmentId);

      if (!enrollment) {
        return res.status(404).json({ error: 'Enrollment not found' });
      }

      res.json({ success: true, data: enrollment });
    } catch (error) {
      logger.error('Failed to start course', { error, enrollmentId: req.params.enrollmentId });
      res.status(500).json({ error: 'Failed to start course' });
    }
  });

  /**
   * Complete module
   */
  router.post('/enrollments/:enrollmentId/modules/:moduleId/complete', async (req: Request, res: Response) => {
    try {
      const { enrollmentId, moduleId } = req.params;
      const { timeSpent, quizScore } = req.body;

      const enrollment = await educationService.completeModule({
        enrollmentId,
        moduleId,
        timeSpent,
        quizScore,
      });

      if (!enrollment) {
        return res.status(404).json({ error: 'Enrollment not found' });
      }

      res.json({ success: true, data: enrollment });
    } catch (error) {
      logger.error('Failed to complete module', { error, enrollmentId: req.params.enrollmentId, moduleId: req.params.moduleId });
      res.status(500).json({ error: 'Failed to complete module' });
    }
  });

  /**
   * Get agent enrollments
   */
  router.get('/agents/:agentId/enrollments', async (req: Request, res: Response) => {
    try {
      const { agentId } = req.params;
      const enrollments = await educationService.getAgentEnrollments(agentId);

      res.json({ success: true, data: enrollments });
    } catch (error) {
      logger.error('Failed to get agent enrollments', { error, agentId: req.params.agentId });
      res.status(500).json({ error: 'Failed to get enrollments' });
    }
  });

  /**
   * Get course enrollments
   */
  router.get('/courses/:courseId/enrollments', async (req: Request, res: Response) => {
    try {
      const { courseId } = req.params;
      const enrollments = await educationService.getCourseEnrollments(courseId);

      res.json({ success: true, data: enrollments });
    } catch (error) {
      logger.error('Failed to get course enrollments', { error, courseId: req.params.courseId });
      res.status(500).json({ error: 'Failed to get enrollments' });
    }
  });

  // ========================================
  // CERTIFICATE ROUTES
  // ========================================

  /**
   * Issue certificate
   */
  router.post('/certificates', async (req: Request, res: Response) => {
    try {
      const { courseId, agentId, score } = req.body;

      if (!courseId || !agentId) {
        return res.status(400).json({ error: 'courseId and agentId are required' });
      }

      const certificate = await educationService.issueCertificate({ courseId, agentId, score });

      res.status(201).json({ success: true, data: certificate });
    } catch (error) {
      logger.error('Failed to issue certificate', { error });
      res.status(500).json({ error: 'Failed to issue certificate' });
    }
  });

  /**
   * Get certificate by ID
   */
  router.get('/certificates/:certificateId', async (req: Request, res: Response) => {
    try {
      const { certificateId } = req.params;
      const certificate = await educationService.getCertificateById(certificateId);

      if (!certificate) {
        return res.status(404).json({ error: 'Certificate not found' });
      }

      res.json({ success: true, data: certificate });
    } catch (error) {
      logger.error('Failed to get certificate', { error, certificateId: req.params.certificateId });
      res.status(500).json({ error: 'Failed to get certificate' });
    }
  });

  /**
   * Verify certificate
   */
  router.get('/certificates/verify/:certificateNumber', async (req: Request, res: Response) => {
    try {
      const { certificateNumber } = req.params;
      const certificate = await educationService.verifyCertificate(certificateNumber);

      if (!certificate) {
        return res.status(404).json({ error: 'Certificate not found', valid: false });
      }

      res.json({ success: true, data: { valid: true, certificate } });
    } catch (error) {
      logger.error('Failed to verify certificate', { error, certificateNumber: req.params.certificateNumber });
      res.status(500).json({ error: 'Failed to verify certificate' });
    }
  });

  /**
   * Get agent certificates
   */
  router.get('/agents/:agentId/certificates', async (req: Request, res: Response) => {
    try {
      const { agentId } = req.params;
      const certificates = await educationService.getAgentCertificates(agentId);

      res.json({ success: true, data: certificates });
    } catch (error) {
      logger.error('Failed to get agent certificates', { error, agentId: req.params.agentId });
      res.status(500).json({ error: 'Failed to get certificates' });
    }
  });

  /**
   * Revoke certificate
   */
  router.post('/certificates/:certificateId/revoke', async (req: Request, res: Response) => {
    try {
      const { certificateId } = req.params;
      const certificate = await educationService.revokeCertificate(certificateId);

      if (!certificate) {
        return res.status(404).json({ error: 'Certificate not found' });
      }

      res.json({ success: true, data: certificate });
    } catch (error) {
      logger.error('Failed to revoke certificate', { error, certificateId: req.params.certificateId });
      res.status(500).json({ error: 'Failed to revoke certificate' });
    }
  });

  // ========================================
  // LEARNING PATH ROUTES
  // ========================================

  /**
   * Create learning path
   */
  router.post('/learning-paths', async (req: Request, res: Response) => {
    try {
      const { title, description, courses, estimatedDuration, certification, certificateName } = req.body;

      if (!title || !description || !courses || courses.length === 0) {
        return res.status(400).json({ error: 'Missing required fields' });
      }

      const learningPath = await educationService.createLearningPath({
        title,
        description,
        courses,
        estimatedDuration: estimatedDuration || 0,
        certification: certification || false,
        certificateName,
      });

      res.status(201).json({ success: true, data: learningPath });
    } catch (error) {
      logger.error('Failed to create learning path', { error });
      res.status(500).json({ error: 'Failed to create learning path' });
    }
  });

  /**
   * Get learning path by ID
   */
  router.get('/learning-paths/:pathId', async (req: Request, res: Response) => {
    try {
      const { pathId } = req.params;
      const learningPath = await educationService.getLearningPathById(pathId);

      if (!learningPath) {
        return res.status(404).json({ error: 'Learning path not found' });
      }

      res.json({ success: true, data: learningPath });
    } catch (error) {
      logger.error('Failed to get learning path', { error, pathId: req.params.pathId });
      res.status(500).json({ error: 'Failed to get learning path' });
    }
  });

  /**
   * List learning paths
   */
  router.get('/learning-paths', async (req: Request, res: Response) => {
    try {
      const learningPaths = await educationService.listLearningPaths();

      res.json({ success: true, data: learningPaths });
    } catch (error) {
      logger.error('Failed to list learning paths', { error });
      res.status(500).json({ error: 'Failed to list learning paths' });
    }
  });

  // ========================================
  // RECOMMENDATIONS ROUTES
  // ========================================

  /**
   * Get training recommendations for agent
   */
  router.get('/agents/:agentId/recommendations', async (req: Request, res: Response) => {
    try {
      const { agentId } = req.params;
      const recommendations = await educationService.generateRecommendations(agentId);

      res.json({ success: true, data: recommendations });
    } catch (error) {
      logger.error('Failed to generate recommendations', { error, agentId: req.params.agentId });
      res.status(500).json({ error: 'Failed to generate recommendations' });
    }
  });

  // ========================================
  // ANALYTICS ROUTES
  // ========================================

  /**
   * Get training analytics
   */
  router.get('/analytics', async (req: Request, res: Response) => {
    try {
      const analytics = await educationService.getTrainingAnalytics();

      res.json({ success: true, data: analytics });
    } catch (error) {
      logger.error('Failed to get training analytics', { error });
      res.status(500).json({ error: 'Failed to get analytics' });
    }
  });

  // ========================================
  // ASSESSMENT ROUTES
  // ========================================

  /**
   * Submit assessment
   */
  router.post('/enrollments/:enrollmentId/assessment', async (req: Request, res: Response) => {
    try {
      const { enrollmentId } = req.params;
      const { answers } = req.body;

      if (!answers) {
        return res.status(400).json({ error: 'Answers are required' });
      }

      const result = await educationService.submitAssessment({ enrollmentId, answers });

      res.json({ success: true, data: result });
    } catch (error) {
      logger.error('Failed to submit assessment', { error, enrollmentId: req.params.enrollmentId });
      res.status(500).json({ error: 'Failed to submit assessment' });
    }
  });

  return router;
}
