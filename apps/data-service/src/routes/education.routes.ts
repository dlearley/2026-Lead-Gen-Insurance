import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { EducationRepository } from '../repositories/education.repository';
import {
  CreateCourseDto,
  UpdateCourseDto,
  CreateLearningPathDto,
  UpdateLearningPathDto,
  CourseFilterParams,
  LearningPathFilterParams,
  EnrollmentFilterParams,
  EnrollCourseDto,
  EnrollLearningPathDto,
  UpdateProgressDto,
  SubmitQuizDto,
  UpdateAgentEducationDto
} from '@insurance/types';

const router = Router();
const prisma = new PrismaClient();
const educationRepository = new EducationRepository(prisma);

// Course Management Routes
router.post('/courses', async (req, res) => {
  try {
    const data: CreateCourseDto = req.body;
    const course = await educationRepository.createCourse(data);
    res.status(201).json(course);
  } catch (error) {
    console.error('Error creating course:', error);
    res.status(400).json({ error: error instanceof Error ? error.message : 'Failed to create course' });
  }
});

router.get('/courses', async (req, res) => {
  try {
    const filter: CourseFilterParams = {
      category: req.query.category as any,
      level: req.query.level as any,
      contentType: req.query.contentType as any,
      isMandatory: req.query.isMandatory === 'true',
      isActive: req.query.isActive !== 'false',
      tags: req.query.tags ? String(req.query.tags).split(',') : undefined,
      search: req.query.search as string,
      page: req.query.page ? parseInt(String(req.query.page)) : undefined,
      limit: req.query.limit ? parseInt(String(req.query.limit)) : undefined
    };

    const { courses, total } = await educationRepository.getCourses(filter);
    
    res.json({
      courses,
      pagination: {
        page: filter.page || 1,
        limit: filter.limit || 10,
        total,
        totalPages: Math.ceil(total / (filter.limit || 10))
      }
    });
  } catch (error) {
    console.error('Error fetching courses:', error);
    res.status(500).json({ error: 'Failed to fetch courses' });
  }
});

router.get('/courses/:id', async (req, res) => {
  try {
    const course = await educationRepository.getCourse(req.params.id);
    if (!course) {
      return res.status(404).json({ error: 'Course not found' });
    }
    res.json(course);
  } catch (error) {
    console.error('Error fetching course:', error);
    res.status(500).json({ error: 'Failed to fetch course' });
  }
});

router.put('/courses/:id', async (req, res) => {
  try {
    const data: UpdateCourseDto = req.body;
    const course = await educationRepository.updateCourse(req.params.id, data);
    res.json(course);
  } catch (error) {
    console.error('Error updating course:', error);
    res.status(400).json({ error: error instanceof Error ? error.message : 'Failed to update course' });
  }
});

router.delete('/courses/:id', async (req, res) => {
  try {
    await educationRepository.deleteCourse(req.params.id);
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting course:', error);
    res.status(400).json({ error: error instanceof Error ? error.message : 'Failed to delete course' });
  }
});

// Learning Path Management Routes
router.post('/learning-paths', async (req, res) => {
  try {
    const data: CreateLearningPathDto = req.body;
    const path = await educationRepository.createLearningPath(data);
    res.status(201).json(path);
  } catch (error) {
    console.error('Error creating learning path:', error);
    res.status(400).json({ error: error instanceof Error ? error.message : 'Failed to create learning path' });
  }
});

router.get('/learning-paths', async (req, res) => {
  try {
    const filter: LearningPathFilterParams = {
      category: req.query.category as any,
      level: req.query.level as any,
      isMandatory: req.query.isMandatory === 'true',
      isActive: req.query.isActive !== 'false',
      tags: req.query.tags ? String(req.query.tags).split(',') : undefined,
      specialization: req.query.specialization as any,
      search: req.query.search as string,
      page: req.query.page ? parseInt(String(req.query.page)) : undefined,
      limit: req.query.limit ? parseInt(String(req.query.limit)) : undefined
    };

    const { paths, total } = await educationRepository.getLearningPaths(filter);
    
    res.json({
      paths,
      pagination: {
        page: filter.page || 1,
        limit: filter.limit || 10,
        total,
        totalPages: Math.ceil(total / (filter.limit || 10))
      }
    });
  } catch (error) {
    console.error('Error fetching learning paths:', error);
    res.status(500).json({ error: 'Failed to fetch learning paths' });
  }
});

router.get('/learning-paths/:id', async (req, res) => {
  try {
    const path = await educationRepository.getLearningPath(req.params.id);
    if (!path) {
      return res.status(404).json({ error: 'Learning path not found' });
    }
    res.json(path);
  } catch (error) {
    console.error('Error fetching learning path:', error);
    res.status(500).json({ error: 'Failed to fetch learning path' });
  }
});

router.put('/learning-paths/:id', async (req, res) => {
  try {
    const data: UpdateLearningPathDto = req.body;
    const path = await educationRepository.updateLearningPath(req.params.id, data);
    res.json(path);
  } catch (error) {
    console.error('Error updating learning path:', error);
    res.status(400).json({ error: error instanceof Error ? error.message : 'Failed to update learning path' });
  }
});

// Enrollment Management Routes
router.post('/courses/:id/enroll', async (req, res) => {
  try {
    const data: EnrollCourseDto = { ...req.body, agentId: req.body.agentId };
    const enrollment = await educationRepository.enrollInCourse(req.params.id, data);
    res.status(201).json(enrollment);
  } catch (error) {
    console.error('Error enrolling in course:', error);
    res.status(400).json({ error: error instanceof Error ? error.message : 'Failed to enroll in course' });
  }
});

router.post('/learning-paths/:id/enroll', async (req, res) => {
  try {
    const data: EnrollLearningPathDto = { ...req.body, agentId: req.body.agentId };
    const enrollment = await educationRepository.enrollInLearningPath(req.params.id, data);
    res.status(201).json(enrollment);
  } catch (error) {
    console.error('Error enrolling in learning path:', error);
    res.status(400).json({ error: error instanceof Error ? error.message : 'Failed to enroll in learning path' });
  }
});

router.get('/enrollments', async (req, res) => {
  try {
    const filter: EnrollmentFilterParams = {
      agentId: req.query.agentId as string,
      courseId: req.query.courseId as string,
      status: req.query.status as any,
      dateFrom: req.query.dateFrom ? new Date(String(req.query.dateFrom)) : undefined,
      dateTo: req.query.dateTo ? new Date(String(req.query.dateTo)) : undefined,
      page: req.query.page ? parseInt(String(req.query.page)) : undefined,
      limit: req.query.limit ? parseInt(String(req.query.limit)) : undefined
    };

    const { enrollments, total } = await educationRepository.getEnrollments(filter);
    
    res.json({
      enrollments,
      pagination: {
        page: filter.page || 1,
        limit: filter.limit || 10,
        total,
        totalPages: Math.ceil(total / (filter.limit || 10))
      }
    });
  } catch (error) {
    console.error('Error fetching enrollments:', error);
    res.status(500).json({ error: 'Failed to fetch enrollments' });
  }
});

// Progress Tracking Routes
router.put('/progress/:id', async (req, res) => {
  try {
    const data: UpdateProgressDto = req.body;
    const progress = await educationRepository.updateModuleProgress(req.params.id, data);
    res.json(progress);
  } catch (error) {
    console.error('Error updating progress:', error);
    res.status(400).json({ error: error instanceof Error ? error.message : 'Failed to update progress' });
  }
});

// Assessment Routes
router.post('/quizzes/:id/submit', async (req, res) => {
  try {
    const data: SubmitQuizDto = {
      ...req.body,
      moduleProgressId: req.body.moduleProgressId
    };
    const attempt = await educationRepository.submitQuiz(req.params.id, data);
    res.status(201).json(attempt);
  } catch (error) {
    console.error('Error submitting quiz:', error);
    res.status(400).json({ error: error instanceof Error ? error.message : 'Failed to submit quiz' });
  }
});

// Agent Education Management Routes
router.put('/agents/:id/education', async (req, res) => {
  try {
    const data: UpdateAgentEducationDto = req.body;
    const agent = await educationRepository.updateAgentEducation(req.params.id, data);
    res.json(agent);
  } catch (error) {
    console.error('Error updating agent education:', error);
    res.status(400).json({ error: error instanceof Error ? error.message : 'Failed to update agent education' });
  }
});

router.get('/agents/:id/education-profile', async (req, res) => {
  try {
    const profile = await educationRepository.getAgentEducationProfile(req.params.id);
    if (!profile) {
      return res.status(404).json({ error: 'Agent education profile not found' });
    }
    res.json(profile);
  } catch (error) {
    console.error('Error fetching agent education profile:', error);
    res.status(500).json({ error: 'Failed to fetch agent education profile' });
  }
});

// Analytics and Statistics Routes
router.get('/stats', async (req, res) => {
  try {
    const stats = await educationRepository.getEducationStats();
    res.json(stats);
  } catch (error) {
    console.error('Error fetching education stats:', error);
    res.status(500).json({ error: 'Failed to fetch education statistics' });
  }
});

// Course Module Management Routes
router.post('/courses/:id/modules', async (req, res) => {
  try {
    const module = await educationRepository.createCourseModule(req.params.id, req.body);
    res.status(201).json(module);
  } catch (error) {
    console.error('Error creating course module:', error);
    res.status(400).json({ error: error instanceof Error ? error.message : 'Failed to create course module' });
  }
});

router.get('/courses/:id/modules', async (req, res) => {
  try {
    const modules = await educationRepository.getCourseModules(req.params.id);
    res.json(modules);
  } catch (error) {
    console.error('Error fetching course modules:', error);
    res.status(500).json({ error: 'Failed to fetch course modules' });
  }
});

export default router;
