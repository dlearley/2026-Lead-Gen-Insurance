import { PrismaClient } from '@prisma/client';
import {
  Course,
  CourseModule,
  LearningPath,
  CourseEnrollment,
  ModuleProgress,
  PathEnrollment,
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
  ContentType,
  ProgressStatus,
  EnrollmentStatus
} from '@insurance/types';

export class EducationRepository {
  constructor(private prisma: PrismaClient) {}

  // Course Management
  async createCourse(data: CreateCourseDto): Promise<Course> {
    return this.prisma.course.create({
      data: {
        title: data.title,
        description: data.description,
        category: data.category,
        level: data.level,
        duration: data.duration,
        estimatedHours: data.estimatedHours,
        thumbnailUrl: data.thumbnailUrl,
        contentType: data.contentType,
        isMandatory: data.isMandatory ?? false,
        objectives: data.objectives ?? [],
        prerequisites: data.prerequisites ?? [],
        tags: data.tags ?? []
      },
      include: {
        modules: {
          include: {
            quizzes: true,
            progresses: true
          }
        },
        enrollments: {
          include: {
            agent: true,
            moduleProgresses: {
              include: {
                module: true,
                quizAttempts: true
              }
            }
          }
        },
        certifications: {
          include: {
            agent: true
          }
        }
      }
    });
  }

  async updateCourse(id: string, data: UpdateCourseDto): Promise<Course> {
    return this.prisma.course.update({
      where: { id },
      data: {
        ...data,
        objectives: data.objectives ?? undefined,
        prerequisites: data.prerequisites ?? undefined,
        tags: data.tags ?? undefined
      },
      include: {
        modules: {
          include: {
            quizzes: true,
            progresses: true
          }
        },
        enrollments: {
          include: {
            agent: true,
            moduleProgresses: {
              include: {
                module: true,
                quizAttempts: true
              }
            }
          }
        },
        certifications: {
          include: {
            agent: true
          }
        }
      }
    });
  }

  async deleteCourse(id: string): Promise<void> {
    await this.prisma.course.delete({ where: { id } });
  }

  async getCourse(id: string): Promise<Course | null> {
    return this.prisma.course.findUnique({
      where: { id },
      include: {
        modules: {
          include: {
            quizzes: {
              include: {
                attempts: true
              }
            },
            progresses: true
          },
          orderBy: { orderIndex: 'asc' }
        },
        enrollments: {
          include: {
            agent: true,
            moduleProgresses: {
              include: {
                module: true,
                quizAttempts: true
              }
            }
          }
        },
        certifications: {
          include: {
            agent: true
          }
        }
      }
    });
  }

  async getCourses(filter?: CourseFilterParams): Promise<{ courses: Course[]; total: number }> {
    const where: Record<string, unknown> = {};
    
    if (filter?.category) where.category = filter.category;
    if (filter?.level) where.level = filter.level;
    if (filter?.contentType) where.contentType = filter.contentType;
    if (filter?.isMandatory !== undefined) where.isMandatory = filter.isMandatory;
    if (filter?.isActive !== undefined) where.isActive = filter.isActive;
    
    if (filter?.tags && filter.tags.length > 0) {
      where.tags = { hasSome: filter.tags };
    }
    
    if (filter?.search) {
      where.OR = [
        { title: { contains: filter.search, mode: 'insensitive' } },
        { description: { contains: filter.search, mode: 'insensitive' } }
      ];
    }

    const skip = ((filter?.page ?? 1) - 1) * (filter?.limit ?? 10);
    const take = filter?.limit ?? 10;

    const [courses, total] = await Promise.all([
      this.prisma.course.findMany({
        where,
        skip,
        take,
        include: {
          modules: {
            include: {
              quizzes: true,
              progresses: true
            },
            orderBy: { orderIndex: 'asc' }
          },
          enrollments: true,
          certifications: true
        },
        orderBy: { createdAt: 'desc' }
      }),
      this.prisma.course.count({ where })
    ]);

    return { courses, total };
  }

  // Learning Path Management
  async createLearningPath(data: CreateLearningPathDto): Promise<LearningPath> {
    return this.prisma.learningPath.create({
      data: {
        title: data.title,
        description: data.description,
        category: data.category,
        level: data.level,
        estimatedHours: data.estimatedHours,
        isMandatory: data.isMandatory ?? false,
        prerequisites: data.prerequisites ?? [],
        targetRoles: data.targetRoles ?? [],
        specialization: data.specialization,
        tags: data.tags ?? []
      },
      include: {
        courses: {
          include: {
            course: true
          },
          orderBy: { orderIndex: 'asc' }
        },
        enrollments: {
          include: {
            agent: true
          }
        }
      }
    });
  }

  async updateLearningPath(id: string, data: UpdateLearningPathDto): Promise<LearningPath> {
    return this.prisma.learningPath.update({
      where: { id },
      data: {
        ...data,
        prerequisites: data.prerequisites ?? undefined,
        targetRoles: data.targetRoles ?? undefined,
        specialization: data.specialization ?? undefined,
        tags: data.tags ?? undefined
      },
      include: {
        courses: {
          include: {
            course: true
          },
          orderBy: { orderIndex: 'asc' }
        },
        enrollments: {
          include: {
            agent: true
          }
        }
      }
    });
  }

  async getLearningPath(id: string): Promise<LearningPath | null> {
    return this.prisma.learningPath.findUnique({
      where: { id },
      include: {
        courses: {
          include: {
            course: {
              include: {
                modules: true,
                certifications: true
              }
            }
          },
          orderBy: { orderIndex: 'asc' }
        },
        enrollments: {
          include: {
            agent: true
          }
        }
      }
    });
  }

  async getLearningPaths(filter?: LearningPathFilterParams): Promise<{ paths: LearningPath[]; total: number }> {
    const where: Record<string, unknown> = {};
    
    if (filter?.category) where.category = filter.category;
    if (filter?.level) where.level = filter.level;
    if (filter?.isMandatory !== undefined) where.isMandatory = filter.isMandatory;
    if (filter?.isActive !== undefined) where.isActive = filter.isActive;
    
    if (filter?.tags && filter.tags.length > 0) {
      where.tags = { hasSome: filter.tags };
    }
    
    if (filter?.specialization) {
      where.specialization = { has: filter.specialization };
    }
    
    if (filter?.search) {
      where.OR = [
        { title: { contains: filter.search, mode: 'insensitive' } },
        { description: { contains: filter.search, mode: 'insensitive' } }
      ];
    }

    const skip = ((filter?.page ?? 1) - 1) * (filter?.limit ?? 10);
    const take = filter?.limit ?? 10;

    const [paths, total] = await Promise.all([
      this.prisma.learningPath.findMany({
        where,
        skip,
        take,
        include: {
          courses: {
            include: {
              course: true
            },
            orderBy: { orderIndex: 'asc' }
          },
          enrollments: true
        },
        orderBy: { createdAt: 'desc' }
      }),
      this.prisma.learningPath.count({ where })
    ]);

    return { paths, total };
  }

  // Enrollment Management
  async enrollInCourse(courseId: string, data: EnrollCourseDto): Promise<CourseEnrollment> {
    // Check if already enrolled
    const existingEnrollment = await this.prisma.courseEnrollment.findUnique({
      where: {
        courseId_agentId: {
          courseId,
          agentId: data.agentId
        }
      }
    });

    if (existingEnrollment) {
      throw new Error('Agent is already enrolled in this course');
    }

    return this.prisma.courseEnrollment.create({
      data: {
        courseId,
        agentId: data.agentId,
        status: 'ENROLLED'
      },
      include: {
        course: true,
        agent: true,
        moduleProgresses: {
          include: {
            module: true,
            quizAttempts: true
          }
        }
      }
    });
  }

  async enrollInLearningPath(learningPathId: string, data: EnrollLearningPathDto): Promise<PathEnrollment> {
    // Check if already enrolled
    const existingEnrollment = await this.prisma.pathEnrollment.findUnique({
      where: {
        learningPathId_agentId: {
          learningPathId,
          agentId: data.agentId
        }
      }
    });

    if (existingEnrollment) {
      throw new Error('Agent is already enrolled in this learning path');
    }

    return this.prisma.pathEnrollment.create({
      data: {
        learningPathId,
        agentId: data.agentId,
        status: 'ENROLLED'
      },
      include: {
        learningPath: {
          include: {
            courses: {
              include: {
                course: true
              },
              orderBy: { orderIndex: 'asc' }
            }
          }
        },
        agent: true
      }
    });
  }

  async getEnrollments(filter?: EnrollmentFilterParams): Promise<{ enrollments: CourseEnrollment[]; total: number }> {
    const where: Record<string, unknown> = {};
    
    if (filter?.agentId) where.agentId = filter.agentId;
    if (filter?.courseId) where.courseId = filter.courseId;
    if (filter?.status) where.status = filter.status;
    
    if (filter?.dateFrom || filter?.dateTo) {
      where.enrolledAt = {};
      if (filter.dateFrom) where.enrolledAt.gte = filter.dateFrom;
      if (filter.dateTo) where.enrolledAt.lte = filter.dateTo;
    }

    const skip = ((filter?.page ?? 1) - 1) * (filter?.limit ?? 10);
    const take = filter?.limit ?? 10;

    const [enrollments, total] = await Promise.all([
      this.prisma.courseEnrollment.findMany({
        where,
        skip,
        take,
        include: {
          course: true,
          agent: true,
          moduleProgresses: {
            include: {
              module: true,
              quizAttempts: true
            }
          }
        },
        orderBy: { enrolledAt: 'desc' }
      }),
      this.prisma.courseEnrollment.count({ where })
    ]);

    return { enrollments, total };
  }

  async updateModuleProgress(moduleProgressId: string, data: UpdateProgressDto): Promise<ModuleProgress> {
    return this.prisma.moduleProgress.update({
      where: { id: moduleProgressId },
      data: {
        ...data,
        startedAt: data.status === 'IN_PROGRESS' && !data.progress ? new Date() : undefined,
        completedAt: data.status === 'COMPLETED' ? new Date() : undefined
      },
      include: {
        module: true,
        quizAttempts: true,
        enrollment: {
          include: {
            course: true,
            agent: true
          }
        }
      }
    });
  }

  // Assessment System
  async submitQuiz(quizId: string, data: SubmitQuizDto): Promise<QuizAttempt> {
    const quiz = await this.prisma.moduleQuiz.findUnique({
      where: { id: quizId },
      include: {
        module: true
      }
    });

    if (!quiz) {
      throw new Error('Quiz not found');
    }

    const moduleProgress = await this.prisma.moduleProgress.findUnique({
      where: { id: data.moduleProgressId }
    });

    if (!moduleProgress) {
      throw new Error('Module progress not found');
    }

    // Get previous attempts
    const previousAttempts = await this.prisma.quizAttempt.count({
      where: { quizId, moduleProgressId: data.moduleProgressId }
    });

    if (previousAttempts >= quiz.maxAttempts) {
      throw new Error('Maximum attempts reached');
    }

    // Calculate score (simplified - would need proper implementation)
    const score = 85; // Placeholder - implement actual scoring logic
    const passed = score >= quiz.passingScore;

    return this.prisma.quizAttempt.create({
      data: {
        quizId,
        moduleProgressId: data.moduleProgressId,
        attemptNumber: previousAttempts + 1,
        score,
        passed,
        timeSpent: data.timeSpent,
        answers: data.answers,
        completedAt: new Date()
      },
      include: {
        quiz: true,
        moduleProgress: true
      }
    });
  }

  // Agent Education Management
  async updateAgentEducation(agentId: string, data: UpdateAgentEducationDto): Promise<Agent> {
    return this.prisma.agent.update({
      where: { id: agentId },
      data: {
        ...data,
        lastTrainingDate: data.educationLevel || data.expertiseAreas || data.skillAssessments ? new Date() : undefined
      }
    });
  }

  async getAgentEducationProfile(agentId: string): Promise<AgentEducationProfile | null> {
    const agent = await this.prisma.agent.findUnique({
      where: { id: agentId }
    });

    if (!agent) return null;

    const [enrollments, certifications, learningPaths] = await Promise.all([
      this.prisma.courseEnrollment.findMany({
        where: { agentId },
        include: {
          course: true,
          moduleProgresses: {
            include: {
              module: true,
              quizAttempts: true
            }
          }
        },
        orderBy: { enrolledAt: 'desc' }
      }),
      this.prisma.courseCertification.findMany({
        where: { agentId, isActive: true },
        include: {
          course: true
        },
        orderBy: { issuedAt: 'desc' }
      }),
      this.prisma.pathEnrollment.findMany({
        where: { agentId },
        include: {
          learningPath: {
            include: {
              courses: {
                include: {
                  course: true
                },
                orderBy: { orderIndex: 'asc' }
              }
            }
          }
        },
        orderBy: { enrolledAt: 'desc' }
      })
    ]);

    const completedCourses = enrollments.filter(e => e.status === 'COMPLETED');
    const skillAssessments = agent.skillAssessments as Record<string, unknown> || {};

    return {
      agent,
      enrolledCourses: enrollments,
      completedCourses,
      certifications,
      learningPaths,
      skillAssessments: skillAssessments as Record<string, {
        skill: string;
        level: number;
        lastAssessment: Date;
      }>,
      progressStats: {
        totalCoursesEnrolled: enrollments.length,
        totalCoursesCompleted: completedCourses.length,
        totalTrainingHours: agent.totalTrainingHours,
        averageScore: enrollments.filter(e => e.finalScore).reduce((acc, e) => acc + (e.finalScore || 0), 0) / enrollments.filter(e => e.finalScore).length || 0,
        certificationsEarned: certifications.length
      }
    };
  }

  // Statistics and Analytics
  async getEducationStats(): Promise<EducationStats> {
    const [
      totalCourses,
      totalEnrollments,
      totalCompletions,
      certifications,
      trainingHours
    ] = await Promise.all([
      this.prisma.course.count(),
      this.prisma.courseEnrollment.count(),
      this.prisma.courseEnrollment.count({ where: { status: 'COMPLETED' } }),
      this.prisma.courseCertification.count({ where: { isActive: true } }),
      this.prisma.agent.aggregate({
        _sum: { totalTrainingHours: true }
      })
    ]);

    // Calculate average completion time
    const completedEnrollments = await this.prisma.courseEnrollment.findMany({
      where: { status: 'COMPLETED', startedAt: { not: null }, completedAt: { not: null } },
      select: { startedAt: true, completedAt: true }
    });

    const averageCompletionTime = completedEnrollments.length > 0
      ? completedEnrollments.reduce((acc, e) => {
          const diff = e.completedAt!.getTime() - e.startedAt!.getTime();
          return acc + (diff / (1000 * 60 * 60 * 24)); // Convert to days
        }, 0) / completedEnrollments.length
      : 0;

    // Get top performing courses
    const topCourses = await this.prisma.course.findMany({
      take: 5,
      include: {
        enrollments: {
          select: {
            status: true,
            finalScore: true
          }
        }
      }
    });

    const topPerformingCourses = topCourses.map(course => {
      const totalEnrollments = course.enrollments.length;
      const completions = course.enrollments.filter(e => e.status === 'COMPLETED').length;
      const averageScore = course.enrollments
        .filter(e => e.finalScore)
        .reduce((acc, e) => acc + (e.finalScore || 0), 0) / course.enrollments.filter(e => e.finalScore).length || 0;

      return {
        courseId: course.id,
        title: course.title,
        completionRate: totalEnrollments > 0 ? (completions / totalEnrollments) * 100 : 0,
        averageScore
      };
    }).sort((a, b) => b.completionRate - a.completionRate);

    // Get agent progress stats
    const agents = await this.prisma.agent.findMany({
      take: 5,
      orderBy: { totalTrainingHours: 'desc' },
      include: {
        courseEnrollments: {
          where: { status: 'COMPLETED' },
          include: { course: true }
        }
      }
    });

    const topPerformers = agents.map(agent => ({
      agentId: agent.id,
      agentName: `${agent.firstName} ${agent.lastName}`,
      coursesCompleted: agent.courseEnrollments.length,
      totalHours: agent.totalTrainingHours
    }));

    // Calculate completion rates by category
    const categoryStats = await this.prisma.course.groupBy({
      by: ['category'],
      _count: { _all: true }
    });

    const categoryCompletions = await this.prisma.courseEnrollment.groupBy({
      by: ['status'],
      _count: { _all: true }
    });

    const completionRates: Record<CourseCategory, number> = {} as Record<CourseCategory, number>;
    categoryStats.forEach(stat => {
      const categoryEnrollments = this.prisma.courseEnrollment.count({
        where: { 
          course: { category: stat.category },
          status: 'COMPLETED'
        }
      });
      const categoryTotal = stat._count._all;
      completionRates[stat.category] = categoryTotal > 0 ? (categoryEnrollments / categoryTotal) * 100 : 0;
    });

    return {
      totalCourses,
      totalEnrollments,
      totalCompletions,
      averageCompletionTime,
      certificationRate: totalEnrollments > 0 ? (certifications / totalEnrollments) * 100 : 0,
      totalTrainingHours: trainingHours._sum.totalTrainingHours || 0,
      topPerformingCourses,
      agentProgressStats: {
        topPerformers,
        completionRates,
        averageScores: {} // Would need implementation
      }
    };
  }

  // Course Module Management
  async createCourseModule(courseId: string, data: {
    title: string;
    description?: string;
    orderIndex: number;
    content: Record<string, unknown>;
    duration?: number;
    isRequired?: boolean;
    hasQuiz?: boolean;
    passingScore?: number;
  }): Promise<CourseModule> {
    return this.prisma.courseModule.create({
      data: {
        courseId,
        title: data.title,
        description: data.description,
        orderIndex: data.orderIndex,
        content: data.content,
        duration: data.duration,
        isRequired: data.isRequired ?? true,
        hasQuiz: data.hasQuiz ?? false,
        passingScore: data.passingScore
      },
      include: {
        course: true,
        quizzes: true,
        progresses: true
      }
    });
  }

  async getCourseModules(courseId: string): Promise<CourseModule[]> {
    return this.prisma.courseModule.findMany({
      where: { courseId },
      include: {
        quizzes: true,
        progresses: true
      },
      orderBy: { orderIndex: 'asc' }
    });
  }
}
