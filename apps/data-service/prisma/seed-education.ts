import { PrismaClient } from '@prisma/client';
import {
  CourseCategory,
  CourseLevel,
  ContentType,
  InsuranceType,
  EducationLevel,
  LearningStyle
} from '@insurance/types';

const prisma = new PrismaClient();

// Sample course data
const sampleCourses = [
  // Onboarding Courses
  {
    title: 'Insurance Industry Fundamentals',
    description: 'Introduction to the insurance industry, key concepts, and terminology',
    category: 'ONBOARDING' as CourseCategory,
    level: 'BEGINNER' as CourseLevel,
    duration: 120, // 2 hours
    estimatedHours: 2,
    contentType: 'VIDEO' as ContentType,
    isMandatory: true,
    objectives: [
      'Understand the insurance industry structure',
      'Learn key insurance terminology',
      'Identify different types of insurance products',
      'Recognize regulatory requirements'
    ],
    prerequisites: [],
    tags: ['insurance-basics', 'fundamentals', 'introduction']
  },
  {
    title: 'Company Policies and Procedures',
    description: 'Overview of company culture, policies, and operational procedures',
    category: 'ONBOARDING' as CourseCategory,
    level: 'BEGINNER' as CourseLevel,
    duration: 90,
    estimatedHours: 1.5,
    contentType: 'DOCUMENT' as ContentType,
    isMandatory: true,
    objectives: [
      'Understand company values and culture',
      'Learn operational procedures',
      'Know compliance requirements',
      'Navigate company systems and tools'
    ],
    prerequisites: [],
    tags: ['company-policies', 'procedures', 'compliance']
  },

  // Compliance Courses
  {
    title: 'State Insurance Licensing Requirements',
    description: 'Comprehensive guide to state-specific licensing requirements and renewal procedures',
    category: 'COMPLIANCE' as CourseCategory,
    level: 'INTERMEDIATE' as CourseLevel,
    duration: 180,
    estimatedHours: 3,
    contentType: 'WEBINAR' as ContentType,
    isMandatory: true,
    objectives: [
      'Understand state licensing requirements',
      'Learn renewal procedures',
      'Know continuing education requirements',
      'Maintain compliance standards'
    ],
    prerequisites: ['insurance-basics'],
    tags: ['licensing', 'compliance', 'state-requirements']
  },
  {
    title: 'Anti-Money Laundering (AML) Training',
    description: 'Essential training on AML regulations and reporting requirements',
    category: 'COMPLIANCE' as CourseCategory,
    level: 'INTERMEDIATE' as CourseLevel,
    duration: 60,
    estimatedHours: 1,
    contentType: 'INTERACTIVE' as ContentType,
    isMandatory: true,
    objectives: [
      'Understand AML regulations',
      'Recognize suspicious activities',
      'Know reporting procedures',
      'Implement prevention measures'
    ],
    prerequisites: [],
    tags: ['aml', 'compliance', 'money-laundering']
  },
  {
    title: 'Data Privacy and Security (GDPR/CCPA)',
    description: 'Training on data protection laws and privacy requirements',
    category: 'COMPLIANCE' as CourseCategory,
    level: 'ADVANCED' as CourseLevel,
    duration: 90,
    estimatedHours: 1.5,
    contentType: 'VIDEO' as ContentType,
    isMandatory: true,
    objectives: [
      'Understand GDPR and CCPA requirements',
      'Learn data handling procedures',
      'Know breach notification requirements',
      'Implement privacy controls'
    ],
    prerequisites: [],
    tags: ['privacy', 'gdpr', 'ccpa', 'data-security']
  },

  // Product Courses - Auto Insurance
  {
    title: 'Auto Insurance Fundamentals',
    description: 'Core concepts of auto insurance products and coverage types',
    category: 'PRODUCTS' as CourseCategory,
    level: 'BEGINNER' as CourseLevel,
    duration: 150,
    estimatedHours: 2.5,
    contentType: 'VIDEO' as ContentType,
    isMandatory: false,
    objectives: [
      'Understand auto insurance basics',
      'Learn coverage types and options',
      'Know pricing factors',
      'Explain policy benefits to customers'
    ],
    prerequisites: ['insurance-basics'],
    tags: ['auto-insurance', 'products', 'basics']
  },
  {
    title: 'Commercial Auto Insurance',
    description: 'Specialized training for commercial vehicle insurance products',
    category: 'PRODUCTS' as CourseCategory,
    level: 'ADVANCED' as CourseLevel,
    duration: 200,
    estimatedHours: 3.5,
    contentType: 'INTERACTIVE' as ContentType,
    isMandatory: false,
    objectives: [
      'Understand commercial auto products',
      'Learn risk assessment for businesses',
      'Know fleet management considerations',
      'Handle complex commercial cases'
    ],
    prerequisites: ['auto-insurance-basics'],
    tags: ['commercial-auto', 'business-insurance', 'advanced']
  },

  // Product Courses - Home Insurance
  {
    title: 'Homeowners Insurance Essentials',
    description: 'Comprehensive coverage of homeowners insurance products and options',
    category: 'PRODUCTS' as CourseCategory,
    level: 'BEGINNER' as CourseLevel,
    duration: 140,
    estimatedHours: 2.3,
    contentType: 'VIDEO' as ContentType,
    isMandatory: false,
    objectives: [
      'Understand homeowners insurance basics',
      'Learn coverage options and exclusions',
      'Know valuation methods',
      'Explain policy features to clients'
    ],
    prerequisites: ['insurance-basics'],
    tags: ['homeowners', 'property-insurance', 'basics']
  },
  {
    title: 'High-Value Home Insurance',
    description: 'Specialized training for luxury and high-value residential properties',
    category: 'PRODUCTS' as CourseCategory,
    level: 'EXPERT' as CourseLevel,
    duration: 240,
    estimatedHours: 4,
    contentType: 'SIMULATION' as ContentType,
    isMandatory: false,
    objectives: [
      'Understand high-value property risks',
      'Learn specialized coverage options',
      'Know valuation and appraisal processes',
      'Handle complex claims scenarios'
    ],
    prerequisites: ['homeowners-basics'],
    tags: ['high-value-homes', 'luxury-properties', 'specialized']
  },

  // Sales Techniques
  {
    title: 'Consultative Selling for Insurance',
    description: 'Modern consultative selling techniques specifically for insurance products',
    category: 'SALES_TECHNIQUES' as CourseCategory,
    level: 'INTERMEDIATE' as CourseLevel,
    duration: 180,
    estimatedHours: 3,
    contentType: 'INTERACTIVE' as ContentType,
    isMandatory: false,
    objectives: [
      'Master consultative selling techniques',
      'Build rapport with prospects',
      'Identify customer needs effectively',
      'Present solutions confidently'
    ],
    prerequisites: ['insurance-basics'],
    tags: ['sales', 'consultative-selling', 'techniques']
  },
  {
    title: 'Objection Handling and Closing',
    description: 'Advanced techniques for handling objections and closing insurance sales',
    category: 'SALES_TECHNIQUES' as CourseCategory,
    level: 'ADVANCED' as CourseLevel,
    duration: 160,
    estimatedHours: 2.7,
    contentType: 'SIMULATION' as ContentType,
    isMandatory: false,
    objectives: [
      'Master objection handling strategies',
      'Learn closing techniques',
      'Build confidence in sales situations',
      'Increase conversion rates'
    ],
    prerequisites: ['consultative-selling'],
    tags: ['objection-handling', 'closing', 'advanced-sales']
  },

  // Customer Service
  {
    title: 'Excellent Customer Service',
    description: 'Fundamentals of providing exceptional customer service in insurance',
    category: 'CUSTOMER_SERVICE' as CourseCategory,
    level: 'BEGINNER' as CourseLevel,
    duration: 90,
    estimatedHours: 1.5,
    contentType: 'VIDEO' as ContentType,
    isMandatory: false,
    objectives: [
      'Understand customer service principles',
      'Learn communication best practices',
      'Handle difficult situations professionally',
      'Build long-term customer relationships'
    ],
    prerequisites: [],
    tags: ['customer-service', 'communication', 'basics']
  },
  {
    title: 'Claims Support and Advocacy',
    description: 'Training on supporting customers through the claims process',
    category: 'CUSTOMER_SERVICE' as CourseCategory,
    level: 'INTERMEDIATE' as CourseLevel,
    duration: 120,
    estimatedHours: 2,
    contentType: 'INTERACTIVE' as ContentType,
    isMandatory: false,
    objectives: [
      'Understand the claims process',
      'Support customers during claims',
      'Navigate complex claim scenarios',
      'Advocate effectively for clients'
    ],
    prerequisites: ['excellent-customer-service'],
    tags: ['claims', 'customer-support', 'advocacy']
  },

  // Technology
  {
    title: 'Digital Tools and CRM Systems',
    description: 'Training on company technology tools and CRM systems',
    category: 'TECHNOLOGY' as CourseCategory,
    level: 'BEGINNER' as CourseLevel,
    duration: 75,
    estimatedHours: 1.25,
    contentType: 'INTERACTIVE' as ContentType,
    isMandatory: true,
    objectives: [
      'Navigate company CRM system',
      'Use digital tools effectively',
      'Maintain accurate records',
      'Leverage technology for efficiency'
    ],
    prerequisites: [],
    tags: ['technology', 'crm', 'digital-tools']
  },
  {
    title: 'AI-Powered Lead Scoring',
    description: 'Understanding and utilizing AI-powered lead qualification tools',
    category: 'TECHNOLOGY' as CourseCategory,
    level: 'ADVANCED' as CourseLevel,
    duration: 110,
    estimatedHours: 1.8,
    contentType: 'SIMULATION' as ContentType,
    isMandatory: false,
    objectives: [
      'Understand AI lead scoring',
      'Interpret AI recommendations',
      'Use technology for lead prioritization',
      'Combine AI with human judgment'
    ],
    prerequisites: ['digital-tools'],
    tags: ['ai', 'lead-scoring', 'technology']
  }
];

// Sample learning paths
const sampleLearningPaths = [
  {
    title: 'New Agent Onboarding Path',
    description: 'Essential courses for newly hired insurance agents',
    category: 'ONBOARDING' as CourseCategory,
    level: 'BEGINNER' as CourseLevel,
    estimatedHours: 8,
    isMandatory: true,
    prerequisites: [],
    targetRoles: ['new-agent', 'junior-agent'],
    specialization: [] as InsuranceType[],
    tags: ['onboarding', 'new-hire', 'mandatory'],
    courseIds: [] // Will be populated after course creation
  },
  {
    title: 'Auto Insurance Specialist',
    description: 'Comprehensive path for becoming an auto insurance specialist',
    category: 'SPECIALIZATIONS' as CourseCategory,
    level: 'INTERMEDIATE' as CourseLevel,
    estimatedHours: 12,
    isMandatory: false,
    prerequisites: ['insurance-basics'],
    targetRoles: ['agent', 'senior-agent'],
    specialization: ['auto'] as InsuranceType[],
    tags: ['auto-insurance', 'specialization', 'intermediate'],
    courseIds: []
  },
  {
    title: 'Sales Excellence Program',
    description: 'Advanced sales training for insurance professionals',
    category: 'SALES_TECHNIQUES' as CourseCategory,
    level: 'ADVANCED' as CourseLevel,
    estimatedHours: 15,
    isMandatory: false,
    prerequisites: ['insurance-basics'],
    targetRoles: ['agent', 'senior-agent', 'sales-lead'],
    specialization: [] as InsuranceType[],
    tags: ['sales', 'excellence', 'advanced'],
    courseIds: []
  }
];

async function seedEducationSystem() {
  console.log('🌱 Starting education system seeding...');

  try {
    // Create courses
    console.log('📚 Creating courses...');
    const createdCourses = [];
    
    for (const courseData of sampleCourses) {
      const course = await prisma.course.create({
        data: {
          ...courseData,
          isActive: true,
          objectives: courseData.objectives || [],
          prerequisites: courseData.prerequisites || [],
          tags: courseData.tags || []
        }
      });
      createdCourses.push(course);
      console.log(`✅ Created course: ${course.title}`);
    }

    console.log(`🎓 Created ${createdCourses.length} courses`);

    // Update learning paths with actual course IDs
    sampleLearningPaths[0].courseIds = [
      createdCourses.find(c => c.title === 'Insurance Industry Fundamentals')?.id!,
      createdCourses.find(c => c.title === 'Company Policies and Procedures')?.id!,
      createdCourses.find(c => c.title === 'State Insurance Licensing Requirements')?.id!,
      createdCourses.find(c => c.title === 'Anti-Money Laundering (AML) Training')?.id!,
      createdCourses.find(c => c.title === 'Digital Tools and CRM Systems')?.id!
    ];

    sampleLearningPaths[1].courseIds = [
      createdCourses.find(c => c.title === 'Auto Insurance Fundamentals')?.id!,
      createdCourses.find(c => c.title === 'Commercial Auto Insurance')?.id!,
      createdCourses.find(c => c.title === 'Consultative Selling for Insurance')?.id!
    ];

    sampleLearningPaths[2].courseIds = [
      createdCourses.find(c => c.title === 'Consultative Selling for Insurance')?.id!,
      createdCourses.find(c => c.title === 'Objection Handling and Closing')?.id!,
      createdCourses.find(c => c.title === 'Excellent Customer Service')?.id!,
      createdCourses.find(c => c.title === 'Claims Support and Advocacy')?.id!,
      createdCourses.find(c => c.title === 'AI-Powered Lead Scoring')?.id!
    ];

    // Create learning paths
    console.log('🛤️  Creating learning paths...');
    const createdPaths = [];
    
    for (const pathData of sampleLearningPaths) {
      const path = await prisma.learningPath.create({
        data: {
          title: pathData.title,
          description: pathData.description,
          category: pathData.category,
          level: pathData.level,
          estimatedHours: pathData.estimatedHours,
          isMandatory: pathData.isMandatory,
          prerequisites: pathData.prerequisites,
          targetRoles: pathData.targetRoles,
          specialization: pathData.specialization,
          tags: pathData.tags,
          isActive: true
        }
      });
      createdPaths.push(path);
      console.log(`✅ Created learning path: ${path.title}`);
    }

    // Create path-course relationships
    console.log('🔗 Creating path-course relationships...');
    for (let i = 0; i < sampleLearningPaths.length; i++) {
      const path = createdPaths[i];
      const courseIds = sampleLearningPaths[i].courseIds;
      
      for (let j = 0; j < courseIds.length; j++) {
        await prisma.pathCourse.create({
          data: {
            learningPathId: path.id,
            courseId: courseIds[j],
            orderIndex: j,
            isRequired: true,
            passingScore: 70
          }
        });
      }
      console.log(`✅ Linked ${courseIds.length} courses to path: ${path.title}`);
    }

    // Create sample modules for key courses
    console.log('📖 Creating course modules...');
    const autoInsuranceCourse = createdCourses.find(c => c.title === 'Auto Insurance Fundamentals');
    if (autoInsuranceCourse) {
      const modules = [
        {
          title: 'Introduction to Auto Insurance',
          description: 'Basic concepts and terminology',
          orderIndex: 1,
          content: {
            type: 'video',
            url: 'https://example.com/video1.mp4',
            duration: 30,
            transcript: 'This is the transcript...'
          },
          duration: 30,
          isRequired: true,
          hasQuiz: true,
          passingScore: 70
        },
        {
          title: 'Types of Auto Coverage',
          description: 'Understanding liability, collision, comprehensive coverage',
          orderIndex: 2,
          content: {
            type: 'interactive',
            slides: [
              { title: 'Liability Coverage', content: '...' },
              { title: 'Collision Coverage', content: '...' },
              { title: 'Comprehensive Coverage', content: '...' }
            ]
          },
          duration: 45,
          isRequired: true,
          hasQuiz: true,
          passingScore: 75
        },
        {
          title: 'Pricing Factors',
          description: 'How insurance companies determine premiums',
          orderIndex: 3,
          content: {
            type: 'document',
            sections: [
              'Driver factors',
              'Vehicle factors',
              'Location factors',
              'Coverage factors'
            ]
          },
          duration: 45,
          isRequired: true,
          hasQuiz: false,
          passingScore: 70
        }
      ];

      for (const moduleData of modules) {
        await prisma.courseModule.create({
          data: {
            ...moduleData,
            courseId: autoInsuranceCourse.id
          }
        });
      }
      console.log(`✅ Created ${modules.length} modules for Auto Insurance course`);
    }

    // Create sample agents with education profiles
    console.log('👥 Creating sample agents with education profiles...');
    
    const agents = [
      {
        firstName: 'Sarah',
        lastName: 'Johnson',
        email: 'sarah.johnson@insuranceco.com',
        phone: '555-0101',
        licenseNumber: 'A123456789',
        specializations: ['auto', 'home'] as InsuranceType[],
        city: 'Denver',
        state: 'CO',
        country: 'USA',
        educationLevel: 'BACHELOR' as EducationLevel,
        expertiseAreas: ['auto-insurance', 'customer-service'],
        learningGoals: ['commercial-auto', 'sales-techniques'],
        preferredLearningStyle: 'VIDEO' as LearningStyle
      },
      {
        firstName: 'Michael',
        lastName: 'Chen',
        email: 'michael.chen@insuranceco.com',
        phone: '555-0102',
        licenseNumber: 'A987654321',
        specializations: ['life', 'health'] as InsuranceType[],
        city: 'Seattle',
        state: 'WA',
        country: 'USA',
        educationLevel: 'MASTER' as EducationLevel,
        expertiseAreas: ['life-insurance', 'financial-planning'],
        learningGoals: ['advanced-products', 'leadership'],
        preferredLearningStyle: 'INTERACTIVE' as LearningStyle
      },
      {
        firstName: 'Emily',
        lastName: 'Rodriguez',
        email: 'emily.rodriguez@insuranceco.com',
        phone: '555-0103',
        licenseNumber: 'A555666777',
        specializations: ['commercial', 'home'] as InsuranceType[],
        city: 'Austin',
        state: 'TX',
        country: 'USA',
        educationLevel: 'ASSOCIATE' as EducationLevel,
        expertiseAreas: ['commercial-insurance', 'property'],
        learningGoals: ['compliance', 'technology'],
        preferredLearningStyle: 'TEXT' as LearningStyle
      }
    ];

    const createdAgents = [];
    for (const agentData of agents) {
      const agent = await prisma.agent.create({
        data: {
          ...agentData,
          rating: 4.2 + Math.random() * 0.8,
          averageResponseTime: Math.floor(Math.random() * 60) + 30,
          conversionRate: 0.15 + Math.random() * 0.15,
          totalLeadsAssigned: Math.floor(Math.random() * 500) + 100,
          totalLeadsConverted: Math.floor(Math.random() * 100) + 25,
          maxLeadCapacity: 15,
          currentLeadCount: Math.floor(Math.random() * 8) + 2,
          status: 'ACTIVE',
          isActive: true,
          totalTrainingHours: Math.floor(Math.random() * 40) + 10,
          certificationsCount: Math.floor(Math.random() * 5) + 1
        }
      });
      createdAgents.push(agent);
      console.log(`✅ Created agent: ${agent.firstName} ${agent.lastName}`);
    }

    // Create sample enrollments
    console.log('📝 Creating sample enrollments...');
    
    // Enroll agents in onboarding path
    const onboardingPath = createdPaths.find(p => p.title === 'New Agent Onboarding Path');
    if (onboardingPath && createdAgents.length > 0) {
      for (const agent of createdAgents.slice(0, 2)) {
        await prisma.pathEnrollment.create({
          data: {
            learningPathId: onboardingPath.id,
            agentId: agent.id,
            status: 'IN_PROGRESS',
            progress: Math.floor(Math.random() * 80) + 10,
            startedAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000) // Random date in last 30 days
          }
        });
      }
    }

    // Enroll agents in some courses
    const autoFundamentals = createdCourses.find(c => c.title === 'Auto Insurance Fundamentals');
    const consultativeSelling = createdCourses.find(c => c.title === 'Consultative Selling for Insurance');
    
    if (autoFundamentals && createdAgents.length > 0) {
      for (const agent of createdAgents) {
        const enrollment = await prisma.courseEnrollment.create({
          data: {
            courseId: autoFundamentals.id,
            agentId: agent.id,
            status: Math.random() > 0.3 ? 'COMPLETED' : 'IN_PROGRESS',
            progress: Math.random() > 0.3 ? 100 : Math.floor(Math.random() * 80) + 10,
            finalScore: Math.random() > 0.3 ? Math.floor(Math.random() * 30) + 70 : undefined,
            enrolledAt: new Date(Date.now() - Math.random() * 60 * 24 * 60 * 60 * 1000), // Random date in last 60 days
            startedAt: new Date(Date.now() - Math.random() * 45 * 24 * 60 * 60 * 1000), // Random date in last 45 days
            completedAt: Math.random() > 0.3 ? new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000) : undefined
          }
        });

        // Create module progress
        const modules = await prisma.courseModule.findMany({
          where: { courseId: autoFundamentals.id }
        });

        for (const module of modules) {
          await prisma.moduleProgress.create({
            data: {
              enrollmentId: enrollment.id,
              moduleId: module.id,
              status: Math.random() > 0.5 ? 'COMPLETED' : 'IN_PROGRESS',
              progress: Math.random() > 0.5 ? 100 : Math.floor(Math.random() * 80) + 10,
              timeSpent: Math.floor(Math.random() * 120) + 30,
              startedAt: new Date(Date.now() - Math.random() * 20 * 24 * 60 * 60 * 1000),
              completedAt: Math.random() > 0.5 ? new Date(Date.now() - Math.random() * 10 * 24 * 60 * 60 * 1000) : undefined
            }
          });
        }
      }
    }

    if (consultativeSelling && createdAgents.length > 0) {
      for (const agent of createdAgents.slice(0, 2)) {
        await prisma.courseEnrollment.create({
          data: {
            courseId: consultativeSelling.id,
            agentId: agent.id,
            status: 'ENROLLED',
            progress: 0,
            enrolledAt: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000) // Random date in last 7 days
          }
        });
      }
    }

    // Create sample certifications
    console.log('🏆 Creating sample certifications...');
    const completedEnrollments = await prisma.courseEnrollment.findMany({
      where: { status: 'COMPLETED' },
      include: { course: true }
    });

    for (const enrollment of completedEnrollments.slice(0, 3)) {
      await prisma.courseCertification.create({
        data: {
          courseId: enrollment.courseId,
          agentId: enrollment.agentId,
          certificateNumber: `CERT-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
          score: enrollment.finalScore || 85,
          issuedAt: enrollment.completedAt || new Date(),
          expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year from now
          version: '1.0',
          isActive: true
        }
      });
    }

    console.log('🎉 Education system seeding completed successfully!');
    
    // Print summary
    console.log('\n📊 Seeding Summary:');
    console.log(`- ${createdCourses.length} courses created`);
    console.log(`- ${createdPaths.length} learning paths created`);
    console.log(`- ${createdAgents.length} agents created with education profiles`);
    console.log(`- Sample enrollments and progress tracking established`);
    console.log(`- Certifications issued for completed courses`);

    return {
      courses: createdCourses,
      paths: createdPaths,
      agents: createdAgents
    };

  } catch (error) {
    console.error('❌ Error seeding education system:', error);
    throw error;
  }
}

// Run the seeding
if (import.meta.url === `file://${process.argv[1]}`) {
  seedEducationSystem()
    .then(() => {
      console.log('✅ Education system seeding completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Education system seeding failed:', error);
      process.exit(1);
    });
}

export { seedEducationSystem };
