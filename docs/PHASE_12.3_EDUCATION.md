# Phase 12.3: Education & Training System

## Overview

Phase 12.3 implements a comprehensive Education and Training System for the Insurance Lead Generation AI Platform. This system enables brokers and agents to enhance their skills through structured courses, certifications, and learning paths.

## Features Implemented

### 1. Course Management

#### Course Features
- **Course Creation**: Create comprehensive training courses with titles, descriptions, and objectives
- **Categorization**: Organize courses by category (product training, compliance, sales techniques, etc.)
- **Difficulty Levels**: Beginner, Intermediate, Advanced, Expert levels
- **Module System**: Support for multiple module types:
  - Video content
  - Reading materials
  - Quizzes
  - Assignments
  - Live sessions
- **Publishing Workflow**: Draft → Published → Archived states
- **Tags & Prerequisites**: Tag-based organization and prerequisite course linking

#### Course Categories
- `product_training`: Product-specific insurance training
- `compliance`: Regulatory and compliance training
- `sales_techniques`: Sales methodology and techniques
- `customer_service`: Customer service best practices
- `technology`: Platform and tools training
- `lead_generation`: Lead generation strategies
- `closing_skills`: Closing and conversion techniques
- `market_knowledge`: Insurance market understanding

### 2. Enrollment & Progress Tracking

#### Enrollment Features
- **Agent Enrollment**: Enroll agents in courses
- **Progress Tracking**: Track module completion, time spent, and quiz scores
- **Status Management**: Not Enrolled → Enrolled → In Progress → Completed → Certified
- **Resume Capability**: Continue where you left off with current module tracking

#### Progress Metrics
- Module completion percentage
- Time spent on each module
- Quiz scores per module
- Overall course progress
- Last accessed timestamp

### 3. Certification System

#### Certificate Features
- **Automatic Issuance**: Certificates issued upon course completion
- **Unique Certificate Numbers**: Format: `CERT-{COURSE}-{AGENT}-{DATE}-{RANDOM}`
- **Verification**: Public certificate verification endpoint
- **Expiry**: 1-year certificate validity (configurable)
- **Revocation**: Admin ability to revoke certificates

#### Certificate Status
- `pending`: Certificate processing
- `earned`: Active and valid
- `expired`: Past validity period
- `revoked`: Administratively revoked

### 4. Learning Paths

#### Learning Path Features
- **Structured Learning**: Combine multiple courses into learning paths
- **Estimated Duration**: Track expected completion time
- **Certification**: Award certificates upon path completion
- **Course Sequencing**: Define prerequisite ordering

### 5. Training Recommendations

#### AI-Powered Recommendations
- **Performance-Based**: Suggest courses based on agent performance gaps
- **Category Matching**: Recommend courses matching agent specialization
- **Prerequisite Tracking**: Only recommend courses when prerequisites are met
- **Priority Levels**: High, Medium, Low priority recommendations

### 6. Analytics & Reporting

#### Training Analytics
- **Course Metrics**: Total courses, enrollments, completion rates
- **Performance Metrics**: Average assessment scores, pass rates
- **Popular Courses**: Most enrolled courses
- **Category Distribution**: Course distribution by category
- **Agent Progress**: Individual agent learning progress

## API Endpoints

### Course Management

```
POST   /api/v1/education/courses              # Create course
GET    /api/v1/education/courses              # List courses
GET    /api/v1/education/courses/:courseId    # Get course by ID
PUT    /api/v1/education/courses/:courseId    # Update course
POST   /api/v1/education/courses/:courseId/publish   # Publish course
POST   /api/v1/education/courses/:courseId/archive   # Archive course
POST   /api/v1/education/courses/:courseId/modules    # Add module
```

### Enrollment Management

```
POST   /api/v1/education/enrollments                    # Enroll in course
GET    /api/v1/education/enrollments/:id                # Get enrollment
POST   /api/v1/education/enrollments/:id/start          # Start course
POST   /api/v1/education/enrollments/:id/modules/:modId/complete  # Complete module
POST   /api/v1/education/enrollments/:id/assessment     # Submit assessment
GET    /api/v1/education/agents/:agentId/enrollments    # Get agent enrollments
GET    /api/v1/education/courses/:courseId/enrollments  # Get course enrollments
```

### Certificate Management

```
POST   /api/v1/education/certificates                   # Issue certificate
GET    /api/v1/education/certificates/:id               # Get certificate
GET    /api/v1/education/certificates/verify/:number    # Verify certificate
GET    /api/v1/education/agents/:agentId/certificates   # Get agent certificates
POST   /api/v1/education/certificates/:id/revoke        # Revoke certificate
```

### Learning Paths

```
POST   /api/v1/education/learning-paths          # Create learning path
GET    /api/v1/education/learning-paths          # List learning paths
GET    /api/v1/education/learning-paths/:id      # Get learning path
```

### Analytics & Recommendations

```
GET    /api/v1/education/analytics                      # Get training analytics
GET    /api/v1/education/agents/:agentId/recommendations # Get recommendations
```

## Type Definitions

### Course Types

```typescript
type CourseCategory = 
  | 'product_training'
  | 'compliance'
  | 'sales_techniques'
  | 'customer_service'
  | 'technology'
  | 'lead_generation'
  | 'closing_skills'
  | 'market_knowledge';

type CourseDifficulty = 'beginner' | 'intermediate' | 'advanced' | 'expert';
type CourseStatus = 'draft' | 'published' | 'archived';
type EnrollmentStatus = 'not_enrolled' | 'enrolled' | 'in_progress' | 'completed' | 'certified';
type ModuleType = 'video' | 'reading' | 'quiz' | 'assignment' | 'live_session';
type CertificateStatus = 'pending' | 'earned' | 'expired' | 'revoked';
```

### Data Models

```typescript
interface Course {
  id: string;
  title: string;
  description: string;
  category: CourseCategory;
  difficulty: CourseDifficulty;
  status: CourseStatus;
  duration: number;
  objectives: string[];
  prerequisites: string[];
  tags: string[];
  modules: CourseModule[];
  assessment?: CourseAssessment;
}

interface CourseEnrollment {
  id: string;
  courseId: string;
  agentId: string;
  status: EnrollmentStatus;
  progress: CourseProgress;
  assessmentScore?: number;
  assessmentAttempts: number;
}

interface Certificate {
  id: string;
  courseId: string;
  agentId: string;
  certificateNumber: string;
  status: CertificateStatus;
  issuedAt: string;
  expiresAt: string;
  score?: number;
}

interface LearningPath {
  id: string;
  title: string;
  description: string;
  courses: string[];
  estimatedDuration: number;
  certification: boolean;
  certificateName?: string;
}
```

## Usage Examples

### Creating a Course

```bash
curl -X POST http://localhost:3001/api/v1/education/courses \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Auto Insurance Fundamentals",
    "description": "Learn the basics of auto insurance products",
    "category": "product_training",
    "difficulty": "beginner",
    "duration": 120,
    "objectives": ["Understand coverage types", "Calculate premiums"],
    "prerequisites": [],
    "tags": ["auto", "insurance", "basics"],
    "createdBy": "admin-user-id"
  }'
```

### Enrolling an Agent

```bash
curl -X POST http://localhost:3001/api/v1/education/enrollments \
  -H "Content-Type: application/json" \
  -d '{
    "courseId": "course-uuid",
    "agentId": "agent-uuid"
  }'
```

### Completing a Module

```bash
curl -X POST http://localhost:3001/api/v1/education/enrollments/:enrollmentId/modules/:moduleId/complete \
  -H "Content-Type: application/json" \
  -d '{
    "timeSpent": 30,
    "quizScore": 85
  }'
```

### Verifying a Certificate

```bash
curl http://localhost:3001/api/v1/education/certificates/verify/CERT-AUTO-ABCD-20260101-XXXXXX
```

### Getting Training Analytics

```bash
curl http://localhost:3001/api/v1/education/analytics
```

## File Structure

### New Files Created

```
packages/types/src/
└── education.ts                    # Education type definitions

apps/data-service/src/
├── services/
│   └── education.service.ts        # Education service logic
└── routes/
    └── education.routes.ts         # Education API routes

apps/api/src/
└── routes/
    └── education.ts                # API proxy routes

docs/
└── PHASE_12.3_EDUCATION.md         # This documentation
```

### Modified Files

```
packages/types/src/index.ts         # Added education exports
apps/data-service/src/index.ts      # Registered education routes
apps/api/src/app.ts                 # Registered education routes
```

## Database Schema

### Tables (Future Prisma Implementation)

```prisma
model Course {
  id            String   @id @default(uuid())
  title         String
  description   String
  category      String
  difficulty    String
  status        String   @default("draft")
  duration      Int      @default(0)
  objectives    String[]
  prerequisites String[]
  tags          String[]
  createdBy     String
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
  modules       CourseModule[]
  assessment    CourseAssessment?
}

model CourseModule {
  id          String   @id @default(uuid())
  courseId    String
  title       String
  description String
  type        String
  orderIndex  Int
  duration    Int      @default(0)
  content     Json
  isRequired  Boolean  @default(true)
}

model CourseEnrollment {
  id                    String   @id @default(uuid())
  courseId              String
  agentId               String
  status                String   @default("enrolled")
  enrolledAt            DateTime @default(now())
  startedAt             DateTime?
  completedAt           DateTime?
  progress              Json
  assessmentScore       Float?
  assessmentAttempts    Int      @default(0)
}

model Certificate {
  id               String   @id @default(uuid())
  courseId         String
  agentId          String
  certificateNumber String  @unique
  status           String   @default("earned")
  issuedAt         DateTime @default(now())
  expiresAt        DateTime?
  score            Float?
  verificationUrl  String
}

model LearningPath {
  id               String   @id @default(uuid())
  title            String
  description      String
  courses          String[]
  estimatedDuration Int     @default(0)
  certification    Boolean  @default(false)
  certificateName  String?
  createdAt        DateTime @default(now())
  updatedAt        DateTime @updatedAt
}
```

## Integration with Other Modules

### VIP System Integration
- Training completion awards VIP points
- Certificates contribute to VIP tier progression
- Learning streak tracked for VIP benefits

### Broker Network Integration
- Certifications displayed on broker profiles
- Training progress visible in network stats
- Required certifications for network participation

### Analytics Integration
- Training data included in agent performance metrics
- Course effectiveness measured by agent conversion rates
- Skill gaps identified through BI analysis

## Security Considerations

1. **Authentication**: All endpoints require JWT authentication
2. **Authorization**: Agents can only view their own enrollments; admins manage all
3. **Certificate Verification**: Public endpoint for verification without authentication
4. **Data Validation**: All inputs validated using Zod schemas
5. **Audit Logging**: Certificate issuance and revocations logged

## Future Enhancements

### Short Term
1. **Video Streaming**: Integration with video hosting (Vimeo, YouTube)
2. **SCORM Support**: Import SCORM-compliant courses
3. **Gamification**: Badges, achievements, leaderboards
4. **Mobile App**: Offline course access and progress sync

### Long Term
1. **Live Sessions**: Real-time instructor-led training
2. **Peer Learning**: Discussion forums and study groups
3. **AI Tutor**: Personalized learning recommendations
4. **Skill Assessment**: Dynamic skill level testing
5. **Compliance Tracking**: Automated compliance certification renewal

## Testing

### Unit Tests
```bash
# Test education service
apps/data-service/src/__tests__/unit/education.service.test.ts
```

### Integration Tests
```bash
# Test API endpoints
apps/api/src/__tests__/integration/education.integration.test.ts
```

## Success Metrics

- **Course Completion Rate**: Target 70%+
- **Average Assessment Score**: Target 80%+
- **Certificate Verification**: 100% accuracy
- **Agent Adoption**: 90%+ enrolled in required training
- **Learning Engagement**: Average 2+ hours per week

## Conclusion

Phase 12.3 successfully implements a comprehensive Education and Training System for the Insurance Lead Generation AI Platform. The system provides agents and brokers with structured learning opportunities, skill verification through certifications, and data-driven training recommendations to continuously improve performance.
