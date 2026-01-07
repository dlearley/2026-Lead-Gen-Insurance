# Run 27.6: Personalization & Behavior Analytics

## Overview

This implementation adds comprehensive behavior tracking, personalization, and analytics capabilities to the insurance lead generation platform. The system enables real-time behavior analysis, dynamic segmentation, AI-powered personalization, A/B testing, and automated behavioral triggers to optimize lead conversion and customer experience.

## 🎯 Key Features

### 1. Behavior Tracking System
- **Real-time Event Tracking**: Track 20+ behavior event types (page views, form interactions, email engagement, etc.)
- **Session Management**: Comprehensive session tracking with context and metadata
- **Multi-source Tracking**: Web, email, SMS, phone, and offline interactions
- **Contextual Data**: User agent, device, location, referrer, and custom properties

### 2. Behavioral Segmentation
- **Dynamic Segments**: Auto-updating segments based on behavior patterns
- **Advanced Criteria**: Time-based, frequency, sequence, and aggregation filters
- **Real-time Calculation**: Live segment membership updates
- **Segment Analytics**: Lead counts, member tracking, and performance metrics

### 3. Personalization Engine
- **AI-Driven Content**: Dynamic content based on behavior patterns
- **Rule-based Targeting**: Conditional personalization with priority-based execution
- **Multi-channel Personalization**: Email, SMS, web, and push notifications
- **Performance Tracking**: Success rates and conversion impact measurement

### 4. A/B Testing Framework
- **Experiment Management**: Create, manage, and analyze behavior-based experiments
- **Traffic Allocation**: Random, segment-based, and behavior-based allocation
- **Statistical Analysis**: Automated significance testing and confidence intervals
- **Multi-variant Support**: Test multiple variations simultaneously

### 5. Behavioral Triggers
- **Event-driven Automation**: Trigger actions based on behavior patterns
- **Condition Engine**: Complex condition evaluation with multiple criteria
- **Action Library**: Email, SMS, agent assignment, task creation, and more
- **Cooldown Management**: Prevent spam and manage trigger frequency

### 6. Advanced Analytics
- **Behavior Scoring**: Engagement, interest, intent, and conversion probability scores
- **Pattern Recognition**: Automatic behavior pattern detection and insights
- **Funnel Analysis**: Track conversion paths and identify drop-off points
- **Cohort Analysis**: User retention and lifetime value analysis

## 🏗️ Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Frontend      │    │   API Service    │    │  Data Service   │
│  (Web/React)   │◄──►│  (Express/Nest)  │◄──►│   (Express)     │
└─────────────────┘    └──────────────────┘    └─────────────────┘
         │                       │                       │
         │              ┌────────▼────────┐             │
         └──────────────┤ Behavior Routes │
                        └─────────────────┘
                                │
                                ▼
                    ┌─────────────────────┐
                    │ Behavior Analytics  │
                    │     Service         │
                    └─────────────────────┘
                                │
                    ┌────────────▼────────────┐
                    │    PostgreSQL Database   │
                    │  (Behavior Events &     │
                    │   Analytics Tables)     │
                    └────────────────────────┘
```

## 📊 Database Schema

### Core Tables Added

#### `BehaviorEvent`
Stores all behavior tracking events with full context and metadata.

```sql
- id: UUID (Primary Key)
- lead_id: UUID (Foreign Key to Lead)
- session_id: String
- user_id: String
- event_type: BehaviorEventType
- category: BehaviorCategory
- timestamp: DateTime
- source: String
- page: JSON (URL, title, referrer)
- properties: JSON (Event-specific data)
- context: JSON (User agent, device, location)
- value: Float (Numeric value)
- metadata: JSON (Additional metadata)
```

#### `BehavioralSegment`
Stores dynamic and static behavioral segments.

```sql
- id: UUID (Primary Key)
- name: String
- description: String
- type: SegmentType (STATIC/DYNAMIC/BEHAVIORAL)
- status: SegmentStatus (ACTIVE/INACTIVE/DRAFT)
- criteria: JSON (Segment criteria)
- lead_count: Int
- is_public: Boolean
- tags: String[]
- created_at: DateTime
- updated_at: DateTime
- last_calculated: DateTime
```

#### `PersonalizationRule`
Stores personalization rules and targeting criteria.

```sql
- id: UUID (Primary Key)
- name: String
- description: String
- type: PersonalizationType
- status: PersonalizationStatus
- priority: Int
- target_segments: String[]
- conditions: JSON (Condition criteria)
- actions: JSON (Personalization actions)
- start_date: DateTime
- end_date: DateTime
- is_active: Boolean
- tags: String[]
```

#### `BehaviorExperiment`
A/B testing experiments with variants and traffic allocation.

```sql
- id: UUID (Primary Key)
- name: String
- description: String
- type: ExperimentType
- status: ExperimentStatus
- hypothesis: String
- success_metrics: String[]
- target_segments: String[]
- traffic_allocation: JSON (Traffic split)
- variants: JSON (Experiment variants)
- start_date: DateTime
- end_date: DateTime
```

#### `BehavioralTrigger`
Automated triggers based on behavior patterns.

```sql
- id: UUID (Primary Key)
- name: String
- description: String
- event: TriggerEvent
- status: TriggerStatus
- conditions: JSON (Trigger conditions)
- actions: JSON (Actions to execute)
- target_segments: String[]
- cooldown: Int (Minutes)
- priority: Int
- trigger_count: Int
- last_triggered: DateTime
```

#### `TriggerExecution`
Log of all trigger executions and results.

```sql
- id: UUID (Primary Key)
- trigger_id: UUID (Foreign Key)
- lead_id: String
- executed_at: DateTime
- actions: JSON (Executed actions)
- context: JSON (Execution context)
```

#### `BehaviorAnalytics`
Computed analytics and scores for leads/sessions.

```sql
- id: UUID (Primary Key)
- lead_id: UUID
- session_id: String
- total_events: Int
- unique_event_types: Int
- total_time_spent: Int (Seconds)
- average_session_duration: Int (Seconds)
- engagement_score: Float (0-100)
- interest_score: Float (0-100)
- intent_score: Float (0-100)
- conversion_probability: Float (0-100)
- segments: String[]
- behavior_pattern: String
- last_activity: DateTime
```

## 🔌 API Endpoints

### Behavior Tracking

#### POST `/api/behavior/events`
Track a new behavior event.

```typescript
interface TrackBehaviorEventRequest {
  eventType: BehaviorEventType;
  category: BehaviorCategory;
  properties?: Record<string, unknown>;
  context?: Partial<BehaviorEvent['context']>;
  value?: number;
  metadata?: Record<string, unknown>;
}
```

#### GET `/api/behavior/analytics`
Get behavior analytics for a lead or session.

```typescript
interface GetBehaviorAnalyticsRequest {
  leadId?: string;
  sessionId?: string;
  timeRange?: {
    start: Date;
    end: Date;
  };
  includeEvents?: boolean;
}
```

### Behavioral Segmentation

#### POST `/api/behavior/segments`
Create a new behavioral segment.

```typescript
interface CreateSegmentRequest {
  name: string;
  description?: string;
  type: SegmentType;
  criteria: BehavioralCriteria;
  isPublic?: boolean;
  tags?: string[];
}
```

#### GET `/api/behavior/segments`
List all behavioral segments.

#### PUT `/api/behavior/segments/:segmentId`
Update segment criteria and recalculate membership.

#### DELETE `/api/behavior/segments/:segmentId`
Delete a segment.

### Personalization

#### POST `/api/behavior/personalization-rules`
Create a personalization rule.

```typescript
interface CreatePersonalizationRuleRequest {
  name: string;
  description?: string;
  type: PersonalizationType;
  priority: number;
  targetSegments: string[];
  conditions: PersonalizationCondition[];
  actions: PersonalizationAction[];
  startDate?: Date;
  endDate?: Date;
  tags?: string[];
}
```

#### GET `/api/behavior/personalization/:leadId`
Get personalized content for a lead.

### A/B Testing

#### POST `/api/behavior/experiments`
Create a behavior experiment.

```typescript
interface CreateExperimentRequest {
  name: string;
  description?: string;
  type: ExperimentType;
  hypothesis: string;
  successMetrics: string[];
  targetSegments: string[];
  trafficAllocation: TrafficAllocation;
  variants: Omit<ExperimentVariant, 'id'>[];
}
```

#### GET `/api/behavior/experiments/:experimentId/variants/:userId`
Get experiment variant assignment for a user.

### Behavioral Triggers

#### POST `/api/behavior/triggers`
Create a behavioral trigger.

```typescript
interface CreateTriggerRequest {
  name: string;
  description?: string;
  event: TriggerEvent;
  conditions: TriggerCondition[];
  actions: TriggerActionConfig[];
  targetSegments: string[];
  cooldown: number;
  priority: number;
}
```

#### GET `/api/behavior/triggers/:triggerId/executions`
Get trigger execution history.

### Analytics & Reporting

#### GET `/api/behavior/dashboard`
Get behavior analytics dashboard data.

```typescript
interface AnalyticsDashboardResponse {
  behavior: {
    totalEvents: number;
    uniqueUsers: number;
    averageEngagement: number;
    topEvents: Array<{
      eventType: BehaviorEventType;
      count: number;
      percentage: number;
    }>;
    segments: {
      total: number;
      active: number;
      totalMembers: number;
    };
  };
  personalization: {
    activeRules: number;
    runningExperiments: number;
    triggeredActions: number;
    successRate: number;
  };
  triggers: {
    activeTriggers: number;
    executionsToday: number;
    successRate: number;
  };
  trends: {
    engagementTrend: Array<{ date: string; score: number }>;
    conversionTrend: Array<{ date: string; rate: number }>;
    segmentGrowth: Array<{ date: string; members: number }>;
  };
}
```

#### GET `/api/behavior/funnel-analysis`
Get conversion funnel analysis.

## 🚀 Implementation Guide

### 1. Initialize Behavior Analytics Service

```typescript
import { BehaviorAnalyticsService } from '@insurance-lead-gen/core';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const behaviorService = new BehaviorAnalyticsService(prisma);
```

### 2. Track User Behavior

```typescript
// Track a page view
await behaviorService.trackEvent('session-123', {
  eventType: 'page_view',
  category: 'engagement',
  properties: {
    url: '/quote/auto',
    title: 'Auto Insurance Quote',
  },
  context: {
    userAgent: 'Mozilla/5.0...',
    country: 'US',
    device: 'desktop',
  },
}, 'lead-456');

// Track form interaction
await behaviorService.trackEvent('session-123', {
  eventType: 'form_start',
  category: 'intent',
  properties: {
    formId: 'quote-form',
    step: 1,
    fields: ['email', 'phone'],
  },
}, 'lead-456');
```

### 3. Create Behavioral Segment

```typescript
const segment = await behaviorService.createSegment({
  name: 'High Intent Leads',
  description: 'Leads showing high purchase intent',
  type: 'dynamic',
  criteria: {
    logicOperator: 'AND',
    eventFilters: [
      {
        eventType: 'quote_request',
        minFrequency: 1,
      },
      {
        eventType: 'form_submit',
        minFrequency: 1,
      },
    ],
    frequencyFilters: [
      {
        eventTypes: ['page_view', 'form_start'],
        minCount: 5,
        timeRange: {
          start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
          end: new Date(),
        },
      },
    ],
  },
  tags: ['high-value', 'auto-qualified'],
});
```

### 4. Create Personalization Rule

```typescript
const rule = await behaviorService.createPersonalizationRule({
  name: 'Urgent Quote Follow-up',
  description: 'Send immediate follow-up for urgent quote requests',
  type: 'message',
  priority: 100,
  targetSegments: ['high-intent-leads'],
  conditions: [
    {
      id: 'condition-1',
      field: 'intentScore',
      operator: 'greater_than',
      value: 80,
    },
  ],
  actions: [
    {
      id: 'action-1',
      type: 'message',
      template: 'urgent-followup',
      variables: {
        urgency: 'high',
        callToAction: 'Call Now',
      },
      channel: 'email',
      delay: 0,
    },
  ],
  tags: ['urgent', 'email'],
});
```

### 5. Create A/B Test

```typescript
const experiment = await behaviorService.createExperiment({
  name: 'Quote Page CTA Test',
  description: 'Test different call-to-action buttons',
  type: 'content',
  hypothesis: 'More specific CTAs will increase quote requests',
  successMetrics: ['quote_requests', 'conversion_rate'],
  targetSegments: ['all-visitors'],
  trafficAllocation: {
    total: 100,
    allocationMethod: 'random',
    variants: [
      {
        name: 'Control',
        description: 'Current CTA',
        content: {
          ctaText: 'Get Quote',
          ctaColor: 'blue',
        },
        isControl: true,
        trafficPercentage: 50,
      },
      {
        name: 'Variant A',
        description: 'Urgent CTA',
        content: {
          ctaText: 'Get Instant Quote',
          ctaColor: 'red',
        },
        isControl: false,
        trafficPercentage: 50,
      },
    ],
  },
});
```

### 6. Create Behavioral Trigger

```typescript
const trigger = await behaviorService.createTrigger({
  name: 'Form Abandonment Recovery',
  description: 'Recover abandoned quote forms',
  event: 'form_abandon',
  conditions: [
    {
      id: 'cond-1',
      type: 'behavior',
      field: 'formCompletion',
      operator: 'less_than',
      value: 100,
    },
  ],
  actions: [
    {
      id: 'action-1',
      action: 'send_email',
      parameters: {
        template: 'form-abandon-recovery',
        subject: 'Complete Your Quote',
      },
      delay: 60, // Wait 1 hour
    },
    {
      id: 'action-2',
      action: 'assign_agent',
      parameters: {
        reason: 'Form abandonment',
      },
      delay: 120, // Wait 2 hours
    },
  ],
  targetSegments: ['qualified-leads'],
  cooldown: 1440, // 24 hours
  priority: 80,
});
```

## 📈 Analytics & Insights

### Behavior Scoring Algorithm

The system calculates four key scores for each lead/session:

1. **Engagement Score (0-100)**: Based on interaction depth and frequency
   - Page views: 1 point each
   - Form interactions: 3-5 points each
   - Email engagement: 2-4 points each
   - Quote/application: 8-15 points each

2. **Interest Score (0-100)**: Measures content consumption and exploration
   - High-value content views (pricing, features)
   - Form starts and exploration
   - Video plays and downloads
   - Return visit patterns

3. **Intent Score (0-100)**: Purchase readiness indicators
   - Quote requests
   - Application starts/completions
   - High-frequency interactions
   - Short time to conversion

4. **Conversion Probability (0-100)**: Likelihood of conversion
   - Recent activity (within 7 days)
   - Multi-step funnel progression
   - Engagement pattern matching
   - Historical similarity

### Pattern Recognition

The system automatically identifies behavior patterns:

- **High Intent**: Recent application completion or quote request
- **Qualified Interest**: Multiple form interactions and content consumption
- **Exploring**: Browsing without clear intent signals
- **Researching**: Comparison shopping and detailed content consumption
- **At Risk**: No recent activity or form abandonment

### Real-time Insights

The system generates insights in real-time:

- **Pattern Insights**: "User shows consistent engagement across multiple touchpoints"
- **Risk Insights**: "Form abandonment detected - trigger recovery campaign"
- **Opportunity Insights**: "High conversion probability - assign to top agent"
- **Anomaly Insights**: "Unusual behavior pattern detected"

## 🔧 Configuration

### Environment Variables

```bash
# Behavior Analytics Configuration
BEHAVIOR_CACHE_TTL=60000
BEHAVIOR_BATCH_SIZE=100
BEHAVIOR_PROCESSING_INTERVAL=5000

# Personalization Engine
PERSONALIZATION_MAX_RULES=50
PERSONALIZATION_CACHE_TTL=300000

# A/B Testing
EXPERIMENT_DEFAULT_DURATION=14
EXPERIMENT_MIN_SAMPLE_SIZE=100
EXPERIMENT_SIGNIFICANCE_LEVEL=0.05

# Triggers
TRIGGER_MAX_EXECUTION_RATE=1000
TRIGGER_DEFAULT_COOLDOWN=1440
```

### Behavior Event Types

```typescript
const BEHAVIOR_EVENT_TYPES = {
  // Engagement Events
  PAGE_VIEW: 'page_view',
  TIME_ON_PAGE: 'time_on_page',
  SCROLL_DEPTH: 'scroll_depth',
  CLICK_OUTBOUND: 'click_outbound',
  
  // Form Events
  FORM_START: 'form_start',
  FORM_SUBMIT: 'form_submit',
  FORM_ABANDON: 'form_abandon',
  FILTER_USAGE: 'filter_usage',
  
  // Email Events
  EMAIL_OPEN: 'email_open',
  EMAIL_CLICK: 'email_click',
  EMAIL_REPLY: 'email_reply',
  
  // Content Events
  VIDEO_PLAY: 'video_play',
  DOWNLOAD: 'download',
  SOCIAL_SHARE: 'social_share',
  
  // Business Events
  SEARCH_QUERY: 'search_query',
  QUOTE_REQUEST: 'quote_request',
  APPLICATION_START: 'application_start',
  APPLICATION_COMPLETE: 'application_complete',
  
  // Communication Events
  PHONE_CALL: 'phone_call',
  TEXT_INTERACTION: 'text_interaction',
} as const;
```

## 🧪 Testing

### Unit Tests

```bash
# Test behavior tracking
pnpm test -- behavior-analytics.test.ts

# Test segmentation logic
pnpm test -- segmentation.test.ts

# Test personalization engine
pnpm test -- personalization.test.ts

# Test A/B testing
pnpm test -- experiments.test.ts

# Test triggers
pnpm test -- triggers.test.ts
```

### Integration Tests

```bash
# Test complete behavior flow
pnpm test -- behavior-integration.test.ts

# Test API endpoints
pnpm test -- behavior-api.test.ts
```

### Performance Tests

```bash
# Load test behavior tracking
k6 run behavior-tracking-load-test.js

# Performance test segmentation
k6 run segmentation-performance-test.js
```

## 📊 Monitoring & Observability

### Metrics to Monitor

1. **Behavior Tracking Metrics**:
   - Events per second
   - Event processing latency
   - Cache hit rates
   - Error rates

2. **Segmentation Metrics**:
   - Segment calculation time
   - Segment membership accuracy
   - Dynamic segment updates

3. **Personalization Metrics**:
   - Rules triggered per second
   - Personalization success rate
   - Content recommendation accuracy

4. **A/B Testing Metrics**:
   - Experiment assignment accuracy
   - Statistical significance detection
   - Results calculation time

5. **Trigger Metrics**:
   - Trigger execution rate
   - Action success rate
   - Cooldown compliance

### Alerting

Set up alerts for:

- High event processing latency (>100ms)
- Low cache hit rates (<80%)
- Trigger execution failures (>5%)
- Segmentation calculation errors
- Personalization rule conflicts

## 🔒 Security & Privacy

### Data Protection

- **PII Handling**: Lead identifiers are hashed/anonymized where possible
- **Data Retention**: Configurable retention policies for behavior data
- **GDPR Compliance**: User consent tracking and data deletion
- **Access Control**: Role-based access to behavior data

### Security Measures

- **Event Validation**: Strict validation of all behavior events
- **Rate Limiting**: Prevent abuse of tracking endpoints
- **Data Encryption**: At rest and in transit encryption
- **Audit Logging**: All behavior data access is logged

## 🚀 Deployment

### Database Migration

```bash
# Generate migration
npx prisma migrate dev --name add-behavior-tracking

# Deploy to production
npx prisma migrate deploy
```

### Service Integration

```typescript
// In data-service/src/index.ts
import { createBehaviorAnalyticsRoutes } from './routes/behavior.routes.js';

const behaviorService = new BehaviorAnalyticsService(prisma);
app.use('/api/behavior', createBehaviorAnalyticsRoutes(behaviorService));
```

### Frontend Integration

```typescript
// Track behavior events from frontend
import { BehaviorTracker } from '@insurance-lead-gen/behavior-tracker';

const tracker = new BehaviorTracker({
  apiEndpoint: '/api/behavior/events',
  batchSize: 10,
  flushInterval: 5000,
});

// Track events
tracker.track('page_view', {
  url: window.location.href,
  title: document.title,
});

tracker.track('form_start', {
  formId: 'quote-form',
  fields: ['email', 'phone'],
});
```

## 🎯 Business Impact

### Expected Outcomes

1. **Conversion Rate Improvement**: 15-25% increase through personalized experiences
2. **Lead Quality Enhancement**: Better qualification through behavior analysis
3. **Response Time Reduction**: Automated triggers for faster agent follow-up
4. **User Experience Optimization**: Data-driven UX improvements via A/B testing
5. **Campaign Effectiveness**: Behavioral segmentation for targeted campaigns

### ROI Metrics

- **Cost per Lead**: Reduction through better qualification
- **Conversion Rate**: Improvement through personalization
- **Agent Productivity**: Increase through automated lead scoring
- **Customer Lifetime Value**: Better matching and service quality
- **Campaign ROI**: Improved targeting and personalization

## 📚 Additional Resources

### Documentation

- [Behavior Analytics API Reference](./API_REFERENCE.md)
- [Segmentation Guide](./SEGMENTATION_GUIDE.md)
- [Personalization Best Practices](./PERSONALIZATION_GUIDE.md)
- [A/B Testing Methodology](./AB_TESTING_GUIDE.md)

### Example Implementations

- [E-commerce Behavior Tracking](../examples/ecommerce-tracking/)
- [SaaS User Onboarding](../examples/saas-onboarding/)
- [Financial Services Compliance](../examples/financial-compliance/)

### Third-party Integrations

- **Google Analytics 4**: Enhanced ecommerce tracking
- **Segment**: Customer data platform integration
- **Mixpanel**: Product analytics and user segmentation
- **Amplitude**: Behavioral analytics and user journey mapping

---

*This implementation provides a comprehensive foundation for behavior-driven personalization and analytics. The modular design allows for easy extension and customization based on specific business needs.*