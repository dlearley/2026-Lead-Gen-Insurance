# Phase 12.3: Broker Education & Competency - Implementation

**Status**: ✅ Complete

---

## Overview

Phase 12.3 implements a comprehensive broker education and competency management system. This feature enables brokers to enhance their skills through structured courses, assessments, learning paths, and competency tracking.

---

## Objectives

1. **Course Management**: Create, manage, and deliver structured learning content
2. **Assessment System**: Test knowledge with quizzes, exams, and certifications
3. **Progress Tracking**: Monitor learning progress and completion rates
4. **Competency Framework**: Define and track broker skills across multiple dimensions
5. **Learning Paths**: Create structured learning journeys for specific roles/levels
6. **Certifications**: Issue and manage professional certifications

---

## Implementation Details

### 1. Type Definitions

**File**: `packages/types/src/broker-education.ts`

Complete TypeScript type definitions for:

- **Course Management**: Course, Module, Lesson types
- **Assessment System**: Assessment, Question, AssessmentAttempt types
- **Enrollment & Progress**: Enrollment, LessonProgress, ProgressSummary types
- **Competency Framework**: Competency, AgentCompetency, CompetencyGap types
- **Learning Paths**: LearningPath, PathEnrollment, PathProgress types
- **Certificates**: Certificate, CertificateValidation types
- **Analytics**: EducationAnalytics, CoursePerformance, AgentEducationProfile types

---

### 2. Database Schema

**File**: `apps/data-service/prisma/schema.prisma`

Added 12 new models:

#### Core Models

1. **Course**: Course content with modules and metadata
   - Fields: title, description, category, level, status, estimatedHours
   - Relations: modules, enrollments, assessments, certificates

2. **Module**: Course modules containing lessons
   - Fields: title, description, order
   - Relations: course, lessons

3. **Lesson**: Individual learning units
   - Fields: title, content (text), videoUrl, resourcesUrl, durationMinutes
   - Relations: module, progress

4. **Assessment**: Tests and exams
   - Fields: title, type (QUIZ/EXAM/CERTIFICATION), passingScore, maxAttempts
   - Relations: course, questions, attempts, certificates

5. **Question**: Assessment questions
   - Fields: type (MULTIPLE_CHOICE/TRUE_FALSE/SHORT_ANSWER/ESSAY), text, options, correctAnswer
   - Relations: assessment

6. **AssessmentAttempt**: Agent test attempts
   - Fields: attemptNumber, score, passed, answers (JSON)
   - Relations: assessment

#### Progress Models

7. **Enrollment**: Course enrollments
   - Fields: status (NOT_STARTED/IN_PROGRESS/COMPLETED/FAILED/DROPPED), progress (%)
   - Relations: course, lessonProgress

8. **LessonProgress**: Per-lesson completion tracking
   - Fields: completed, timeSpentMinutes
   - Relations: enrollment, lesson

#### Competency Models

9. **Competency**: Skill definitions
   - Fields: name, description, category, level (NOVICE/BEGINNER/INTERMEDIATE/ADVANCED/EXPERT)
   - Relations: agentCompetencies

10. **AgentCompetency**: Broker skill levels
    - Fields: level, assessedAt, evidence[], assessmentMethod
    - Relations: competency

#### Learning Path Models

11. **LearningPath**: Structured learning journeys
    - Fields: title, category, targetRole, targetLevel, estimatedWeeks, requiredCourses[], electiveCourses[]
    - Relations: pathEnrollments

12. **PathEnrollment**: Learning path enrollments
    - Fields: status, progress, completedCourses[]
    - Relations: learningPath

#### Certificate Model

13. **Certificate**: Professional certifications
    - Fields: certificateNumber (unique), title, issueDate, expiryDate, status (ACTIVE/EXPIRED/REVOKED)
    - Relations: course, assessment

---

### 3. Service Layer

#### BrokerEducationService
**File**: `apps/data-service/src/services/broker-education.service.ts`

**Methods**:
- `getCourses(filters)`: Get courses with filtering
- `getCourseById(id)`: Get course with modules and lessons
- `createCourse(dto)`: Create new course
- `updateCourse(id, dto)`: Update course details
- `publishCourse(id)`: Mark course as published
- `deleteCourse(id)`: Delete course (cascades)
- `createModule(dto)`: Create module in course
- `deleteModule(id)`: Delete module (cascades)
- `createLesson(dto)`: Create lesson in module
- `updateLesson(id, updates)`: Update lesson content
- `deleteLesson(id)`: Delete lesson (cascades)

---

#### AssessmentService
**File**: `apps/data-service/src/services/assessment.service.ts`

**Methods**:
- `getAssessments(filters)`: Get assessments with filtering
- `getAssessmentById(id)`: Get assessment with questions
- `createAssessment(dto)`: Create new assessment
- `updateAssessment(id, updates)`: Update assessment
- `deleteAssessment(id)`: Delete assessment (cascades)
- `createQuestion(dto)`: Add question to assessment
- `updateQuestion(id, updates)`: Update question
- `deleteQuestion(id)`: Delete question
- `startAssessment(assessmentId, agentId)`: Start new attempt
- `submitAssessment(attemptId, answers)`: Submit and score attempt
- `getAgentAttempts(agentId, assessmentId?)`: Get agent's attempts

**Auto-certificate**: Automatically creates certificates when assessments are passed

---

#### EnrollmentService
**File**: `apps/data-service/src/services/enrollment.service.ts`

**Methods**:
- `getEnrollments(filters)`: Get enrollments with filtering
- `getEnrollmentById(id)`: Get enrollment with full progress
- `enrollAgent(courseId, agentId)`: Enroll agent in course
- `startEnrollment(id)`: Mark enrollment as in progress
- `completeEnrollment(id)`: Mark enrollment as complete
- `dropEnrollment(id)`: Drop enrollment
- `markLessonComplete(enrollmentId, lessonId, timeSpentMinutes)`: Mark lesson complete
- `updateLessonTime(enrollmentId, lessonId, timeSpentMinutes)`: Update time spent
- `getAgentProgressSummary(agentId)`: Get all course progress
- `getAgentEducationProfile(agentId)`: Get comprehensive education profile

**Progress calculation**: Automatically updates enrollment progress based on lesson completion

---

#### CompetencyService
**File**: `apps/data-service/src/services/competency.service.ts`

**Methods**:
- `getCompetencies(filters)`: Get competency definitions
- `getCompetencyById(id)`: Get single competency
- `createCompetency(dto)`: Create new competency
- `updateCompetency(id, updates)`: Update competency
- `deleteCompetency(id)`: Delete competency
- `getAgentCompetencies(agentId)`: Get agent's assessed competencies
- `setAgentCompetency(agentId, competencyId, level, options)`: Set competency level
- `assessAgentCompetency(agentId, competencyId, evidence, method)`: Assess competency from evidence
- `removeAgentCompetency(agentId, competencyId)`: Remove competency
- `analyzeAgentGaps(agentId, requiredCompetencies)`: Analyze skill gaps
- `getAgentSkillMatrix(agentId)`: Get skill level matrix

**Gap Analysis**: Compares current competency levels to required levels and recommends courses

---

#### LearningPathService
**File**: `apps/data-service/src/services/learning-path.service.ts`

**Methods**:
- `getLearningPaths(filters)`: Get learning paths with filtering
- `getLearningPathById(id)`: Get path with enrollments
- `createLearningPath(dto)`: Create new learning path
- `updateLearningPath(id, updates)`: Update path
- `deleteLearningPath(id)`: Delete path
- `getPathEnrollments(filters)`: Get path enrollments
- `enrollAgentInPath(learningPathId, agentId)`: Enroll agent in path
- `startPathEnrollment(id)`: Start path enrollment
- `completePathEnrollment(id)`: Complete path enrollment
- `updatePathProgress(enrollmentId)`: Update progress based on course completions
- `getAgentPathProgress(agentId)`: Get all path progress
- `getRecommendedPaths(agentId)`: Get recommended paths for agent

**Progress tracking**: Updates based on required course completions

---

#### CertificateService
**File**: `apps/data-service/src/services/certificate.service.ts`

**Methods**:
- `getCertificates(filters)`: Get certificates with filtering
- `getCertificateById(id)`: Get certificate with course/assessment details
- `createCertificate(dto)`: Create new certificate
- `revokeCertificate(id, reason)`: Revoke certificate
- `renewCertificate(id, newExpiryDate)`: Renew certificate
- `deleteCertificate(id)`: Delete certificate
- `validateCertificate(certificateNumber)`: Validate by certificate number
- `validateCertificateById(id)`: Validate by ID
- `checkExpiredCertificates()`: Update expired certificates (maintenance)
- `getExpiringSoon(days)`: Get certificates expiring soon
- `getCertificatesByAgent(agentId)`: Get agent's certificates

**Certificate number format**: `CERT-{timestamp}-{random6chars}`

---

### 4. API Routes

**File**: `apps/data-service/src/routes/broker-education.routes.ts`

All routes under `/api/v1/broker-education`:

#### Courses
- `GET /courses` - List courses (filters: status, category, level, search)
- `GET /courses/:id` - Get course with modules/lessons
- `POST /courses` - Create course
- `PUT /courses/:id` - Update course
- `POST /courses/:id/publish` - Publish course
- `DELETE /courses/:id` - Delete course

#### Modules
- `POST /modules` - Create module
- `DELETE /modules/:id` - Delete module

#### Lessons
- `POST /lessons` - Create lesson
- `PUT /lessons/:id` - Update lesson
- `DELETE /lessons/:id` - Delete lesson

#### Assessments
- `GET /assessments` - List assessments (filters: courseId, type, isActive)
- `GET /assessments/:id` - Get assessment with questions
- `POST /assessments` - Create assessment
- `PUT /assessments/:id` - Update assessment
- `DELETE /assessments/:id` - Delete assessment

#### Questions
- `POST /questions` - Create question
- `PUT /questions/:id` - Update question
- `DELETE /questions/:id` - Delete question

#### Assessment Attempts
- `POST /assessments/:assessmentId/start` - Start new attempt
- `POST /assessment-attempts/:attemptId/submit` - Submit answers
- `GET /agents/:agentId/attempts` - Get agent's attempts

#### Enrollments
- `GET /enrollments` - List enrollments (filters: agentId, courseId, status)
- `GET /enrollments/:id` - Get enrollment with progress
- `POST /enrollments` - Enroll agent in course
- `POST /enrollments/:id/start` - Start enrollment
- `POST /enrollments/:id/complete` - Complete enrollment
- `POST /enrollments/:id/drop` - Drop enrollment

#### Lesson Progress
- `POST /lesson-progress/complete` - Mark lesson complete
- `POST /lesson-progress/time` - Update lesson time spent

#### Progress Summaries
- `GET /agents/:agentId/progress` - Get agent's course progress
- `GET /agents/:agentId/profile` - Get agent education profile

#### Competencies
- `GET /competencies` - List competencies (filters: category, level)
- `GET /competencies/:id` - Get competency
- `POST /competencies` - Create competency
- `PUT /competencies/:id` - Update competency
- `DELETE /competencies/:id` - Delete competency

#### Agent Competencies
- `GET /agents/:agentId/competencies` - Get agent's competencies
- `POST /agents/:agentId/competencies` - Set competency level
- `POST /agents/:agentId/competencies/:competencyId/assess` - Assess competency
- `DELETE /agents/:agentId/competencies/:competencyId` - Remove competency
- `GET /agents/:agentId/gaps` - Analyze skill gaps

#### Learning Paths
- `GET /learning-paths` - List paths (filters: category, targetRole, isActive)
- `GET /learning-paths/:id` - Get path
- `POST /learning-paths` - Create path
- `PUT /learning-paths/:id` - Update path
- `DELETE /learning-paths/:id` - Delete path

#### Path Enrollments
- `GET /path-enrollments` - List path enrollments
- `POST /path-enrollments` - Enroll agent in path
- `POST /path-enrollments/:id/start` - Start path
- `POST /path-enrollments/:id/complete` - Complete path
- `POST /path-enrollments/:id/progress` - Update progress
- `GET /agents/:agentId/learning-paths` - Get agent's path progress
- `GET /agents/:agentId/recommended-paths` - Get recommended paths

#### Certificates
- `GET /certificates` - List certificates (filters: agentId, courseId, status)
- `GET /certificates/:id` - Get certificate
- `POST /certificates` - Create certificate
- `POST /certificates/:id/revoke` - Revoke certificate
- `POST /certificates/:id/renew` - Renew certificate
- `DELETE /certificates/:id` - Delete certificate

#### Certificate Validation
- `GET /certificates/validate/:certificateNumber` - Validate by number
- `POST /certificates/:id/validate` - Validate by ID
- `GET /certificates/expiring-soon` - Get expiring certificates (query: days)
- `GET /agents/:agentId/certificates` - Get agent's certificates

---

### 5. API Gateway Routes

**File**: `apps/api/src/routes/broker-education.ts`

Proxies all requests to the data service:
- Routes: `/api/v1/broker-education/*`
- Target: `DATA_SERVICE_URL` (default: http://localhost:3002)
- Headers: Forwards `user-id` header

---

## Key Features

### 1. Multi-Level Course Structure
- **Course** → **Modules** → **Lessons**
- Hierarchical organization for flexible content structure
- Support for text, video, and downloadable resources

### 2. Flexible Assessment System
- Multiple question types: Multiple Choice, True/False, Short Answer, Essay
- Configurable passing scores and attempt limits
- Automatic scoring for objective questions
- Manual grading support (via answers JSON)

### 3. Progress Tracking
- Real-time progress calculation based on lesson completion
- Time tracking per lesson
- Enrollment status management
- Automatic course completion detection

### 4. Competency Framework
- Five competency levels: NOVICE → BEGINNER → INTERMEDIATE → ADVANCED → EXPERT
- Evidence-based assessment
- Skill gap analysis
- Competency matrix visualization

### 5. Learning Paths
- Structured learning journeys
- Required vs elective courses
- Role-based paths (e.g., New Agent, Senior Producer)
- Progress tracking across multiple courses

### 6. Certificate Management
- Automatic certificate generation on course/assessment completion
- Unique certificate numbers
- Expiration date support
- Certificate validation API
- Revocation and renewal support

---

## Database Migration

To apply the schema changes:

```bash
cd apps/data-service
npx prisma migrate dev --name add_broker_education
npx prisma generate
```

---

## Example API Usage

### Create a Course

```bash
POST /api/v1/broker-education/courses
{
  "title": "Auto Insurance Fundamentals",
  "description": "Learn the basics of selling auto insurance",
  "category": "Auto Insurance",
  "level": "BEGINNER",
  "estimatedHours": 10,
  "tags": ["auto", "basics", "sales"],
  "objectives": [
    "Understand auto insurance coverage types",
    "Learn to quote policies effectively"
  ],
  "instructorName": "John Smith"
}
```

### Create an Assessment

```bash
POST /api/v1/broker-education/assessments
{
  "courseId": "course-uuid",
  "title": "Auto Insurance Quiz",
  "type": "QUIZ",
  "passingScore": 80,
  "maxAttempts": 3,
  "timeLimitMinutes": 30
}
```

### Add a Question

```bash
POST /api/v1/broker-education/questions
{
  "assessmentId": "assessment-uuid",
  "type": "MULTIPLE_CHOICE",
  "text": "What does liability coverage protect?",
  "options": [
    "Damage to your own vehicle",
    "Bodily injury and property damage to others",
    "Medical expenses for you",
    "Theft of your vehicle"
  ],
  "correctAnswer": "Bodily injury and property damage to others",
  "explanation": "Liability coverage protects others when you're at fault.",
  "points": 10,
  "order": 1
}
```

### Enroll an Agent

```bash
POST /api/v1/broker-education/enrollments
{
  "courseId": "course-uuid",
  "agentId": "agent-uuid"
}
```

### Start and Submit an Assessment

```bash
# Start assessment
POST /api/v1/broker-education/assessments/{assessmentId}/start
{
  "agentId": "agent-uuid"
}

# Submit answers
POST /api/v1/broker-education/assessment-attempts/{attemptId}/submit
{
  "answers": {
    "question-uuid-1": "Bodily injury and property damage to others",
    "question-uuid-2": "True"
  }
}
```

### Analyze Competency Gaps

```bash
POST /api/v1/broker-education/agents/{agentId}/gaps
{
  "requiredCompetencies": ["competency-uuid-1", "competency-uuid-2"]
}
```

### Create a Learning Path

```bash
POST /api/v1/broker-education/learning-paths
{
  "title": "New Agent Onboarding",
  "description": "Complete training path for new agents",
  "category": "Onboarding",
  "targetRole": "Insurance Agent",
  "targetLevel": "INTERMEDIATE",
  "estimatedWeeks": 8,
  "requiredCourses": [
    "course-uuid-1",
    "course-uuid-2",
    "course-uuid-3"
  ],
  "electiveCourses": [
    "course-uuid-4",
    "course-uuid-5"
  ]
}
```

### Validate a Certificate

```bash
GET /api/v1/broker-education/certificates/validate/CERT-1234567890-ABC123
```

---

## Integration Points

### 1. Agent Onboarding
- Auto-enroll new agents in "New Agent Onboarding" learning path
- Track completion as part of onboarding KPIs

### 2. Certification Requirements
- Require specific certifications before assignment of certain lead types
- Validate certificates before allowing lead routing

### 3. Performance Reviews
- Use competency levels as part of agent performance evaluation
- Link course completions to performance metrics

### 4. Compliance
- Track mandatory compliance training completion
- Alert on expiring certifications

### 5. Career Progression
- Define learning paths for different career stages
- Unlock advanced features based on competency levels

---

## Future Enhancements

1. **AI-Powered Recommendations**: Use ML to recommend courses based on performance
2. **Interactive Content**: Add support for simulations and interactive modules
3. **Social Learning**: Add discussion forums per course
4. **Gamification**: Add badges, leaderboards, and achievements
5. **Offline Mode**: Support offline content access and sync
6. **Video Hosting**: Integrate with video hosting services (Vimeo, YouTube)
7. **SCORM Support**: Support SCORM packages for e-learning compatibility
8. **Analytics Dashboard**: Comprehensive education analytics dashboard
9. **Instructor Portal**: Portal for instructors to manage their courses
10. **Peer Review**: Allow peer assessment for competency evaluation

---

## Success Metrics

- **Course Completion Rate**: Percentage of enrolled agents who complete courses
- **Assessment Pass Rate**: Percentage of first-time assessment passes
- **Competency Growth**: Average competency level improvement over time
- **Learning Path Adherence**: Percentage of agents following recommended paths
- **Certificate Validity**: Percentage of active, non-expired certificates
- **Engagement**: Average time spent per lesson and course

---

## Summary

Phase 12.3 successfully implements a comprehensive broker education and competency management system. The system provides:

✅ Multi-level course structure with modules and lessons
✅ Flexible assessment system with multiple question types
✅ Real-time progress tracking and automatic completion detection
✅ Competency framework with gap analysis
✅ Learning paths for structured development
✅ Professional certificate management with validation
✅ Comprehensive API with 60+ endpoints
✅ Full TypeScript type safety
✅ Database migrations ready

All services are integrated with the existing platform architecture and follow established patterns for consistency and maintainability.
