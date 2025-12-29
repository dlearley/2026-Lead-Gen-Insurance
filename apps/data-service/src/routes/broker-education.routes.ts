import { Router, Request, Response } from 'express';
import { brokerEducationService } from '../services/broker-education.service.js';
import { enrollmentService } from '../services/enrollment.service.js';
import { assessmentService } from '../services/assessment.service.js';
import { competencyService } from '../services/competency.service.js';
import { learningPathService } from '../services/learning-path.service.js';
import { certificateService } from '../services/certificate.service.js';
import { logger } from '@insurance-lead-gen/core';

export function createBrokerEducationRoutes(): Router {
  const router = Router();

  // ========================================
  // Courses
  // ========================================

  router.get('/courses', async (req: Request, res: Response) => {
    try {
      const filters = {
        status: req.query.status as string,
        category: req.query.category as string,
        level: req.query.level as string,
        search: req.query.search as string,
      };
      const courses = await brokerEducationService.getCourses(filters);
      res.json(courses);
    } catch (error) {
      logger.error('Failed to get courses', { error, query: req.query });
      res.status(500).json({ error: 'Failed to get courses' });
    }
  });

  router.get('/courses/:id', async (req: Request, res: Response) => {
    try {
      const course = await brokerEducationService.getCourseById(req.params.id);
      if (!course) {
        return res.status(404).json({ error: 'Course not found' });
      }
      res.json(course);
    } catch (error) {
      logger.error('Failed to get course by id', { error, id: req.params.id });
      res.status(500).json({ error: 'Failed to get course' });
    }
  });

  router.post('/courses', async (req: Request, res: Response) => {
    try {
      const course = await brokerEducationService.createCourse(req.body);
      res.status(201).json(course);
    } catch (error) {
      logger.error('Failed to create course', { error, body: req.body });
      res.status(500).json({ error: 'Failed to create course' });
    }
  });

  router.put('/courses/:id', async (req: Request, res: Response) => {
    try {
      const course = await brokerEducationService.updateCourse(req.params.id, req.body);
      res.json(course);
    } catch (error) {
      logger.error('Failed to update course', { error, id: req.params.id, body: req.body });
      res.status(500).json({ error: 'Failed to update course' });
    }
  });

  router.post('/courses/:id/publish', async (req: Request, res: Response) => {
    try {
      const course = await brokerEducationService.publishCourse(req.params.id);
      res.json(course);
    } catch (error) {
      logger.error('Failed to publish course', { error, id: req.params.id });
      res.status(500).json({ error: 'Failed to publish course' });
    }
  });

  router.delete('/courses/:id', async (req: Request, res: Response) => {
    try {
      await brokerEducationService.deleteCourse(req.params.id);
      res.status(204).send();
    } catch (error) {
      logger.error('Failed to delete course', { error, id: req.params.id });
      res.status(500).json({ error: 'Failed to delete course' });
    }
  });

  // ========================================
  // Modules
  // ========================================

  router.post('/modules', async (req: Request, res: Response) => {
    try {
      const module = await brokerEducationService.createModule(req.body);
      res.status(201).json(module);
    } catch (error) {
      logger.error('Failed to create module', { error, body: req.body });
      res.status(500).json({ error: 'Failed to create module' });
    }
  });

  router.delete('/modules/:id', async (req: Request, res: Response) => {
    try {
      await brokerEducationService.deleteModule(req.params.id);
      res.status(204).send();
    } catch (error) {
      logger.error('Failed to delete module', { error, id: req.params.id });
      res.status(500).json({ error: 'Failed to delete module' });
    }
  });

  // ========================================
  // Lessons
  // ========================================

  router.post('/lessons', async (req: Request, res: Response) => {
    try {
      const lesson = await brokerEducationService.createLesson(req.body);
      res.status(201).json(lesson);
    } catch (error) {
      logger.error('Failed to create lesson', { error, body: req.body });
      res.status(500).json({ error: 'Failed to create lesson' });
    }
  });

  router.put('/lessons/:id', async (req: Request, res: Response) => {
    try {
      const lesson = await brokerEducationService.updateLesson(req.params.id, req.body);
      res.json(lesson);
    } catch (error) {
      logger.error('Failed to update lesson', { error, id: req.params.id, body: req.body });
      res.status(500).json({ error: 'Failed to update lesson' });
    }
  });

  router.delete('/lessons/:id', async (req: Request, res: Response) => {
    try {
      await brokerEducationService.deleteLesson(req.params.id);
      res.status(204).send();
    } catch (error) {
      logger.error('Failed to delete lesson', { error, id: req.params.id });
      res.status(500).json({ error: 'Failed to delete lesson' });
    }
  });

  // ========================================
  // Assessments
  // ========================================

  router.get('/assessments', async (req: Request, res: Response) => {
    try {
      const filters = {
        courseId: req.query.courseId as string,
        type: req.query.type as string,
        isActive: req.query.isActive === 'true' ? true : undefined,
      };
      const assessments = await assessmentService.getAssessments(filters);
      res.json(assessments);
    } catch (error) {
      logger.error('Failed to get assessments', { error, query: req.query });
      res.status(500).json({ error: 'Failed to get assessments' });
    }
  });

  router.get('/assessments/:id', async (req: Request, res: Response) => {
    try {
      const assessment = await assessmentService.getAssessmentById(req.params.id);
      if (!assessment) {
        return res.status(404).json({ error: 'Assessment not found' });
      }
      res.json(assessment);
    } catch (error) {
      logger.error('Failed to get assessment by id', { error, id: req.params.id });
      res.status(500).json({ error: 'Failed to get assessment' });
    }
  });

  router.post('/assessments', async (req: Request, res: Response) => {
    try {
      const assessment = await assessmentService.createAssessment(req.body);
      res.status(201).json(assessment);
    } catch (error) {
      logger.error('Failed to create assessment', { error, body: req.body });
      res.status(500).json({ error: 'Failed to create assessment' });
    }
  });

  router.put('/assessments/:id', async (req: Request, res: Response) => {
    try {
      const assessment = await assessmentService.updateAssessment(req.params.id, req.body);
      res.json(assessment);
    } catch (error) {
      logger.error('Failed to update assessment', { error, id: req.params.id, body: req.body });
      res.status(500).json({ error: 'Failed to update assessment' });
    }
  });

  router.delete('/assessments/:id', async (req: Request, res: Response) => {
    try {
      await assessmentService.deleteAssessment(req.params.id);
      res.status(204).send();
    } catch (error) {
      logger.error('Failed to delete assessment', { error, id: req.params.id });
      res.status(500).json({ error: 'Failed to delete assessment' });
    }
  });

  // ========================================
  // Questions
  // ========================================

  router.post('/questions', async (req: Request, res: Response) => {
    try {
      const question = await assessmentService.createQuestion(req.body);
      res.status(201).json(question);
    } catch (error) {
      logger.error('Failed to create question', { error, body: req.body });
      res.status(500).json({ error: 'Failed to create question' });
    }
  });

  router.put('/questions/:id', async (req: Request, res: Response) => {
    try {
      const question = await assessmentService.updateQuestion(req.params.id, req.body);
      res.json(question);
    } catch (error) {
      logger.error('Failed to update question', { error, id: req.params.id, body: req.body });
      res.status(500).json({ error: 'Failed to update question' });
    }
  });

  router.delete('/questions/:id', async (req: Request, res: Response) => {
    try {
      await assessmentService.deleteQuestion(req.params.id);
      res.status(204).send();
    } catch (error) {
      logger.error('Failed to delete question', { error, id: req.params.id });
      res.status(500).json({ error: 'Failed to delete question' });
    }
  });

  // ========================================
  // Assessment Attempts
  // ========================================

  router.post('/assessments/:assessmentId/start', async (req: Request, res: Response) => {
    try {
      const { agentId } = req.body;
      const attempt = await assessmentService.startAssessment(req.params.assessmentId, agentId);
      res.status(201).json(attempt);
    } catch (error) {
      logger.error('Failed to start assessment', { error, assessmentId: req.params.assessmentId });
      res.status(500).json({ error: 'Failed to start assessment' });
    }
  });

  router.post('/assessment-attempts/:attemptId/submit', async (req: Request, res: Response) => {
    try {
      const { answers } = req.body;
      const attempt = await assessmentService.submitAssessment(req.params.attemptId, answers);
      res.json(attempt);
    } catch (error) {
      logger.error('Failed to submit assessment', { error, attemptId: req.params.attemptId });
      res.status(500).json({ error: 'Failed to submit assessment' });
    }
  });

  router.get('/agents/:agentId/attempts', async (req: Request, res: Response) => {
    try {
      const assessmentId = req.query.assessmentId as string;
      const attempts = await assessmentService.getAgentAttempts(req.params.agentId, assessmentId);
      res.json(attempts);
    } catch (error) {
      logger.error('Failed to get agent attempts', { error, agentId: req.params.agentId });
      res.status(500).json({ error: 'Failed to get agent attempts' });
    }
  });

  // ========================================
  // Enrollments
  // ========================================

  router.get('/enrollments', async (req: Request, res: Response) => {
    try {
      const filters = {
        agentId: req.query.agentId as string,
        courseId: req.query.courseId as string,
        status: req.query.status as string,
      };
      const enrollments = await enrollmentService.getEnrollments(filters);
      res.json(enrollments);
    } catch (error) {
      logger.error('Failed to get enrollments', { error, query: req.query });
      res.status(500).json({ error: 'Failed to get enrollments' });
    }
  });

  router.get('/enrollments/:id', async (req: Request, res: Response) => {
    try {
      const enrollment = await enrollmentService.getEnrollmentById(req.params.id);
      if (!enrollment) {
        return res.status(404).json({ error: 'Enrollment not found' });
      }
      res.json(enrollment);
    } catch (error) {
      logger.error('Failed to get enrollment by id', { error, id: req.params.id });
      res.status(500).json({ error: 'Failed to get enrollment' });
    }
  });

  router.post('/enrollments', async (req: Request, res: Response) => {
    try {
      const { courseId, agentId } = req.body;
      const enrollment = await enrollmentService.enrollAgent(courseId, agentId);
      res.status(201).json(enrollment);
    } catch (error) {
      logger.error('Failed to create enrollment', { error, body: req.body });
      res.status(500).json({ error: 'Failed to create enrollment' });
    }
  });

  router.post('/enrollments/:id/start', async (req: Request, res: Response) => {
    try {
      const enrollment = await enrollmentService.startEnrollment(req.params.id);
      res.json(enrollment);
    } catch (error) {
      logger.error('Failed to start enrollment', { error, id: req.params.id });
      res.status(500).json({ error: 'Failed to start enrollment' });
    }
  });

  router.post('/enrollments/:id/complete', async (req: Request, res: Response) => {
    try {
      const enrollment = await enrollmentService.completeEnrollment(req.params.id);
      res.json(enrollment);
    } catch (error) {
      logger.error('Failed to complete enrollment', { error, id: req.params.id });
      res.status(500).json({ error: 'Failed to complete enrollment' });
    }
  });

  router.post('/enrollments/:id/drop', async (req: Request, res: Response) => {
    try {
      const enrollment = await enrollmentService.dropEnrollment(req.params.id);
      res.json(enrollment);
    } catch (error) {
      logger.error('Failed to drop enrollment', { error, id: req.params.id });
      res.status(500).json({ error: 'Failed to drop enrollment' });
    }
  });

  // ========================================
  // Lesson Progress
  // ========================================

  router.post('/lesson-progress/complete', async (req: Request, res: Response) => {
    try {
      const { enrollmentId, lessonId, timeSpentMinutes } = req.body;
      const progress = await enrollmentService.markLessonComplete(enrollmentId, lessonId, timeSpentMinutes);
      res.json(progress);
    } catch (error) {
      logger.error('Failed to mark lesson complete', { error, body: req.body });
      res.status(500).json({ error: 'Failed to mark lesson complete' });
    }
  });

  router.post('/lesson-progress/time', async (req: Request, res: Response) => {
    try {
      const { enrollmentId, lessonId, timeSpentMinutes } = req.body;
      const progress = await enrollmentService.updateLessonTime(enrollmentId, lessonId, timeSpentMinutes);
      res.json(progress);
    } catch (error) {
      logger.error('Failed to update lesson time', { error, body: req.body });
      res.status(500).json({ error: 'Failed to update lesson time' });
    }
  });

  // ========================================
  // Progress Summaries
  // ========================================

  router.get('/agents/:agentId/progress', async (req: Request, res: Response) => {
    try {
      const progress = await enrollmentService.getAgentProgressSummary(req.params.agentId);
      res.json(progress);
    } catch (error) {
      logger.error('Failed to get agent progress summary', { error, agentId: req.params.agentId });
      res.status(500).json({ error: 'Failed to get agent progress summary' });
    }
  });

  router.get('/agents/:agentId/profile', async (req: Request, res: Response) => {
    try {
      const profile = await enrollmentService.getAgentEducationProfile(req.params.agentId);
      res.json(profile);
    } catch (error) {
      logger.error('Failed to get agent education profile', { error, agentId: req.params.agentId });
      res.status(500).json({ error: 'Failed to get agent education profile' });
    }
  });

  // ========================================
  // Competencies
  // ========================================

  router.get('/competencies', async (req: Request, res: Response) => {
    try {
      const filters = {
        category: req.query.category as string,
        level: req.query.level as string,
      };
      const competencies = await competencyService.getCompetencies(filters);
      res.json(competencies);
    } catch (error) {
      logger.error('Failed to get competencies', { error, query: req.query });
      res.status(500).json({ error: 'Failed to get competencies' });
    }
  });

  router.get('/competencies/:id', async (req: Request, res: Response) => {
    try {
      const competency = await competencyService.getCompetencyById(req.params.id);
      if (!competency) {
        return res.status(404).json({ error: 'Competency not found' });
      }
      res.json(competency);
    } catch (error) {
      logger.error('Failed to get competency by id', { error, id: req.params.id });
      res.status(500).json({ error: 'Failed to get competency' });
    }
  });

  router.post('/competencies', async (req: Request, res: Response) => {
    try {
      const competency = await competencyService.createCompetency(req.body);
      res.status(201).json(competency);
    } catch (error) {
      logger.error('Failed to create competency', { error, body: req.body });
      res.status(500).json({ error: 'Failed to create competency' });
    }
  });

  router.put('/competencies/:id', async (req: Request, res: Response) => {
    try {
      const competency = await competencyService.updateCompetency(req.params.id, req.body);
      res.json(competency);
    } catch (error) {
      logger.error('Failed to update competency', { error, id: req.params.id, body: req.body });
      res.status(500).json({ error: 'Failed to update competency' });
    }
  });

  router.delete('/competencies/:id', async (req: Request, res: Response) => {
    try {
      await competencyService.deleteCompetency(req.params.id);
      res.status(204).send();
    } catch (error) {
      logger.error('Failed to delete competency', { error, id: req.params.id });
      res.status(500).json({ error: 'Failed to delete competency' });
    }
  });

  // ========================================
  // Agent Competencies
  // ========================================

  router.get('/agents/:agentId/competencies', async (req: Request, res: Response) => {
    try {
      const competencies = await competencyService.getAgentCompetencies(req.params.agentId);
      res.json(competencies);
    } catch (error) {
      logger.error('Failed to get agent competencies', { error, agentId: req.params.agentId });
      res.status(500).json({ error: 'Failed to get agent competencies' });
    }
  });

  router.post('/agents/:agentId/competencies', async (req: Request, res: Response) => {
    try {
      const { competencyId, level, evidence, assessmentMethod } = req.body;
      const competency = await competencyService.setAgentCompetency(
        req.params.agentId,
        competencyId,
        level,
        { evidence, assessmentMethod },
      );
      res.json(competency);
    } catch (error) {
      logger.error('Failed to set agent competency', { error, agentId: req.params.agentId, body: req.body });
      res.status(500).json({ error: 'Failed to set agent competency' });
    }
  });

  router.post('/agents/:agentId/competencies/:competencyId/assess', async (req: Request, res: Response) => {
    try {
      const { evidence, assessmentMethod } = req.body;
      const competency = await competencyService.assessAgentCompetency(
        req.params.agentId,
        req.params.competencyId,
        evidence,
        assessmentMethod,
      );
      res.json(competency);
    } catch (error) {
      logger.error('Failed to assess agent competency', {
        error,
        agentId: req.params.agentId,
        competencyId: req.params.competencyId,
      });
      res.status(500).json({ error: 'Failed to assess agent competency' });
    }
  });

  router.delete('/agents/:agentId/competencies/:competencyId', async (req: Request, res: Response) => {
    try {
      await competencyService.removeAgentCompetency(req.params.agentId, req.params.competencyId);
      res.status(204).send();
    } catch (error) {
      logger.error('Failed to remove agent competency', {
        error,
        agentId: req.params.agentId,
        competencyId: req.params.competencyId,
      });
      res.status(500).json({ error: 'Failed to remove agent competency' });
    }
  });

  router.get('/agents/:agentId/gaps', async (req: Request, res: Response) => {
    try {
      const { requiredCompetencies } = req.body;
      const gaps = await competencyService.analyzeAgentGaps(req.params.agentId, requiredCompetencies);
      res.json(gaps);
    } catch (error) {
      logger.error('Failed to analyze agent gaps', { error, agentId: req.params.agentId });
      res.status(500).json({ error: 'Failed to analyze agent gaps' });
    }
  });

  // ========================================
  // Learning Paths
  // ========================================

  router.get('/learning-paths', async (req: Request, res: Response) => {
    try {
      const filters = {
        category: req.query.category as string,
        targetRole: req.query.targetRole as string,
        isActive: req.query.isActive === 'true' ? true : undefined,
      };
      const paths = await learningPathService.getLearningPaths(filters);
      res.json(paths);
    } catch (error) {
      logger.error('Failed to get learning paths', { error, query: req.query });
      res.status(500).json({ error: 'Failed to get learning paths' });
    }
  });

  router.get('/learning-paths/:id', async (req: Request, res: Response) => {
    try {
      const path = await learningPathService.getLearningPathById(req.params.id);
      if (!path) {
        return res.status(404).json({ error: 'Learning path not found' });
      }
      res.json(path);
    } catch (error) {
      logger.error('Failed to get learning path by id', { error, id: req.params.id });
      res.status(500).json({ error: 'Failed to get learning path' });
    }
  });

  router.post('/learning-paths', async (req: Request, res: Response) => {
    try {
      const path = await learningPathService.createLearningPath(req.body);
      res.status(201).json(path);
    } catch (error) {
      logger.error('Failed to create learning path', { error, body: req.body });
      res.status(500).json({ error: 'Failed to create learning path' });
    }
  });

  router.put('/learning-paths/:id', async (req: Request, res: Response) => {
    try {
      const path = await learningPathService.updateLearningPath(req.params.id, req.body);
      res.json(path);
    } catch (error) {
      logger.error('Failed to update learning path', { error, id: req.params.id, body: req.body });
      res.status(500).json({ error: 'Failed to update learning path' });
    }
  });

  router.delete('/learning-paths/:id', async (req: Request, res: Response) => {
    try {
      await learningPathService.deleteLearningPath(req.params.id);
      res.status(204).send();
    } catch (error) {
      logger.error('Failed to delete learning path', { error, id: req.params.id });
      res.status(500).json({ error: 'Failed to delete learning path' });
    }
  });

  // ========================================
  // Path Enrollments
  // ========================================

  router.get('/path-enrollments', async (req: Request, res: Response) => {
    try {
      const filters = {
        agentId: req.query.agentId as string,
        learningPathId: req.query.learningPathId as string,
        status: req.query.status as string,
      };
      const enrollments = await learningPathService.getPathEnrollments(filters);
      res.json(enrollments);
    } catch (error) {
      logger.error('Failed to get path enrollments', { error, query: req.query });
      res.status(500).json({ error: 'Failed to get path enrollments' });
    }
  });

  router.post('/path-enrollments', async (req: Request, res: Response) => {
    try {
      const { learningPathId, agentId } = req.body;
      const enrollment = await learningPathService.enrollAgentInPath(learningPathId, agentId);
      res.status(201).json(enrollment);
    } catch (error) {
      logger.error('Failed to create path enrollment', { error, body: req.body });
      res.status(500).json({ error: 'Failed to create path enrollment' });
    }
  });

  router.post('/path-enrollments/:id/start', async (req: Request, res: Response) => {
    try {
      const enrollment = await learningPathService.startPathEnrollment(req.params.id);
      res.json(enrollment);
    } catch (error) {
      logger.error('Failed to start path enrollment', { error, id: req.params.id });
      res.status(500).json({ error: 'Failed to start path enrollment' });
    }
  });

  router.post('/path-enrollments/:id/complete', async (req: Request, res: Response) => {
    try {
      const enrollment = await learningPathService.completePathEnrollment(req.params.id);
      res.json(enrollment);
    } catch (error) {
      logger.error('Failed to complete path enrollment', { error, id: req.params.id });
      res.status(500).json({ error: 'Failed to complete path enrollment' });
    }
  });

  router.post('/path-enrollments/:id/progress', async (req: Request, res: Response) => {
    try {
      const enrollment = await learningPathService.updatePathProgress(req.params.id);
      res.json(enrollment);
    } catch (error) {
      logger.error('Failed to update path progress', { error, id: req.params.id });
      res.status(500).json({ error: 'Failed to update path progress' });
    }
  });

  router.get('/agents/:agentId/learning-paths', async (req: Request, res: Response) => {
    try {
      const progress = await learningPathService.getAgentPathProgress(req.params.agentId);
      res.json(progress);
    } catch (error) {
      logger.error('Failed to get agent path progress', { error, agentId: req.params.agentId });
      res.status(500).json({ error: 'Failed to get agent path progress' });
    }
  });

  router.get('/agents/:agentId/recommended-paths', async (req: Request, res: Response) => {
    try {
      const paths = await learningPathService.getRecommendedPaths(req.params.agentId);
      res.json(paths);
    } catch (error) {
      logger.error('Failed to get recommended paths', { error, agentId: req.params.agentId });
      res.status(500).json({ error: 'Failed to get recommended paths' });
    }
  });

  // ========================================
  // Certificates
  // ========================================

  router.get('/certificates', async (req: Request, res: Response) => {
    try {
      const filters = {
        agentId: req.query.agentId as string,
        courseId: req.query.courseId as string,
        status: req.query.status as string,
      };
      const certificates = await certificateService.getCertificates(filters);
      res.json(certificates);
    } catch (error) {
      logger.error('Failed to get certificates', { error, query: req.query });
      res.status(500).json({ error: 'Failed to get certificates' });
    }
  });

  router.get('/certificates/:id', async (req: Request, res: Response) => {
    try {
      const certificate = await certificateService.getCertificateById(req.params.id);
      if (!certificate) {
        return res.status(404).json({ error: 'Certificate not found' });
      }
      res.json(certificate);
    } catch (error) {
      logger.error('Failed to get certificate by id', { error, id: req.params.id });
      res.status(500).json({ error: 'Failed to get certificate' });
    }
  });

  router.post('/certificates', async (req: Request, res: Response) => {
    try {
      const certificate = await certificateService.createCertificate(req.body);
      res.status(201).json(certificate);
    } catch (error) {
      logger.error('Failed to create certificate', { error, body: req.body });
      res.status(500).json({ error: 'Failed to create certificate' });
    }
  });

  router.post('/certificates/:id/revoke', async (req: Request, res: Response) => {
    try {
      const { reason } = req.body;
      const certificate = await certificateService.revokeCertificate(req.params.id, reason);
      res.json(certificate);
    } catch (error) {
      logger.error('Failed to revoke certificate', { error, id: req.params.id });
      res.status(500).json({ error: 'Failed to revoke certificate' });
    }
  });

  router.post('/certificates/:id/renew', async (req: Request, res: Response) => {
    try {
      const { expiryDate } = req.body;
      const certificate = await certificateService.renewCertificate(req.params.id, new Date(expiryDate));
      res.json(certificate);
    } catch (error) {
      logger.error('Failed to renew certificate', { error, id: req.params.id });
      res.status(500).json({ error: 'Failed to renew certificate' });
    }
  });

  router.delete('/certificates/:id', async (req: Request, res: Response) => {
    try {
      await certificateService.deleteCertificate(req.params.id);
      res.status(204).send();
    } catch (error) {
      logger.error('Failed to delete certificate', { error, id: req.params.id });
      res.status(500).json({ error: 'Failed to delete certificate' });
    }
  });

  // ========================================
  // Certificate Validation
  // ========================================

  router.get('/certificates/validate/:certificateNumber', async (req: Request, res: Response) => {
    try {
      const validation = await certificateService.validateCertificate(req.params.certificateNumber);
      res.json(validation);
    } catch (error) {
      logger.error('Failed to validate certificate', { error, certificateNumber: req.params.certificateNumber });
      res.status(500).json({ error: 'Failed to validate certificate' });
    }
  });

  router.post('/certificates/:id/validate', async (req: Request, res: Response) => {
    try {
      const validation = await certificateService.validateCertificateById(req.params.id);
      res.json(validation);
    } catch (error) {
      logger.error('Failed to validate certificate by id', { error, id: req.params.id });
      res.status(500).json({ error: 'Failed to validate certificate' });
    }
  });

  router.get('/certificates/expiring-soon', async (req: Request, res: Response) => {
    try {
      const days = parseInt(req.query.days as string) || 30;
      const certificates = await certificateService.getExpiringSoon(days);
      res.json(certificates);
    } catch (error) {
      logger.error('Failed to get expiring certificates', { error });
      res.status(500).json({ error: 'Failed to get expiring certificates' });
    }
  });

  router.get('/agents/:agentId/certificates', async (req: Request, res: Response) => {
    try {
      const certificates = await certificateService.getCertificatesByAgent(req.params.agentId);
      res.json(certificates);
    } catch (error) {
      logger.error('Failed to get agent certificates', { error, agentId: req.params.agentId });
      res.status(500).json({ error: 'Failed to get agent certificates' });
    }
  });

  return router;
}
