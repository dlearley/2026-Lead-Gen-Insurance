# Task 6.1: AI Talk Track Generator

## Overview

The AI Talk Track Generator is a comprehensive system for creating, managing, and analyzing personalized sales conversation scripts using artificial intelligence. It empowers sales agents with AI-generated talk tracks tailored to specific leads, industries, competitors, and sales stages.

## Features

### 1. AI-Powered Talk Track Generation

Generate personalized sales conversation scripts based on:
- **Lead Context**: Company size, pain points, budget, timeline, industry
- **Competitive Intelligence**: Competitor strengths, weaknesses, and positioning
- **Sales Stage**: Discovery, demo, closing, follow-up, negotiation
- **Tone Preferences**: Professional, friendly, formal, casual, direct, consultative
- **Custom Instructions**: Agent-specific guidance and requirements

### 2. Talk Track Types

Support for multiple conversation scenarios:
- **DISCOVERY**: Initial qualification calls
- **DEMO**: Product demonstrations
- **CLOSING**: Final sales conversations
- **FOLLOW_UP**: Post-meeting follow-ups
- **NEGOTIATION**: Pricing and terms discussions
- **OBJECTION_HANDLING**: Addressing customer objections
- **COLD_CALL**: Outbound cold calling scripts
- **WARM_CALL**: Follow-up on leads with existing interest
- **PARTNERSHIP**: Partnership discussion scripts
- **RENEWAL**: Customer renewal conversations

### 3. Smart Objection Handling

Generate AI-powered objection handlers:
- 10 common objection types (price, timing, authority, need, competition, etc.)
- Multiple response techniques (Feel-Felt-Found, Reframe, Clarify, Pivot)
- Fallback responses for continued dialogue
- Confidence scoring for effectiveness

### 4. Talk Track Templates

Create and manage reusable templates:
- Pre-built conversation frameworks
- Industry-specific templates
- Product-focused templates
- Organization-wide standards

### 5. Usage Analytics

Track and analyze talk track performance:
- Usage frequency and patterns
- Average ratings and feedback
- Success rates by stage
- Duration analysis
- Section popularity
- Feedback trends over time

### 6. Personalization Features

- **Favorites**: Save frequently used talk tracks
- **Customizations**: Agent-specific modifications
- **Notes**: Personal annotations and tips
- **Versioning**: Track changes over time

## Architecture

### Components

```
┌─────────────────────────────────────────────────────────────┐
│                    API Layer                                │
│  - talk-track.routes.ts (data-service)                     │
│  - talk-track.ts (api)                                     │
└───────────────┬─────────────────────────────────────────────┘
                │
                ↓
┌─────────────────────────────────────────────────────────────┐
│            Talk Track Generator Service                    │
│  - talk-track-generator.service.ts                         │
│  - TalkTrackGeneratorService                                │
└───────────────┬─────────────────────────────────────────────┘
                │
                ↓
┌─────────────────────────────────────────────────────────────┐
│                    Data Layer                              │
│  - talk_tracks table                                       │
│  - talk_track_sections table                               │
│  - objection_handlers table                                │
│  - talk_track_usage table                                  │
│  - talk_track_favorites table                              │
│  - talk_track_customizations table                         │
└─────────────────────────────────────────────────────────────┘
                │
                ↓
┌─────────────────────────────────────────────────────────────┐
│                   AI Service                               │
│  - OpenAI GPT-4 integration                              │
│  - Prompt engineering                                    │
│  - Response parsing and validation                        │
└─────────────────────────────────────────────────────────────┘
                │
                ↓
┌─────────────────────────────────────────────────────────────┐
│             Integration Points                             │
│  - Competitive Intelligence (battle cards)                 │
│  - Lead Management (lead context)                        │
│  - CRM (usage tracking)                                  │
│  - Analytics (performance metrics)                        │
└─────────────────────────────────────────────────────────────┘
```

## Database Schema

### Talk Track Models

#### talk_tracks
- `id`: Primary key
- `organizationId`: Organization ownership
- `name`: Talk track name
- `type`: Talk track type (enum)
- `tone`: Conversation tone (enum)
- `status`: Draft/Approved/Archived (enum)
- `targetAudience`: Array of target personas
- `industry`: Array of industries
- `productFocus`: Array of products
- `estimatedDuration`: Length in minutes
- `tags`: Searchable tags
- `createdBy`: Creator (system or user)
- `version`: Version number
- `parentId`: Parent for derived tracks
- `isTemplate`: Template flag
- `usageCount`: Usage counter
- `createdAt`: Creation timestamp
- `updatedAt`: Last update timestamp

#### talk_track_sections
- `id`: Primary key
- `talkTrackId`: Parent talk track
- `title`: Section title
- `order`: Display order
- `content`: Script content
- `tips`: Agent tips
- `keyPoints`: Key message points
- `requiredFields`: Lead fields to reference
- `createdAt`: Creation timestamp

#### objection_handlers
- `id`: Primary key
- `talkTrackId`: Associated talk track (optional)
- `objectionType`: Type of objection (enum)
- `objection`: Objection text or pattern
- `response`: Suggested response
- `techniques`: Techniques used (array)
- `fallbackResponses`: Alternative responses
- `confidence`: Effectiveness confidence (0-1)
- `createdAt`: Creation timestamp
- `updatedAt`: Last update timestamp

#### talk_track_usage
- `id`: Primary key
- `talkTrackId`: Talk track used
- `agentId`: Agent who used it
- `leadId`: Lead context (optional)
- `context`: Usage context (stage, duration, sections used, outcome)
- `feedback`: Agent feedback (rating, comments)
- `usedAt`: Usage timestamp

#### talk_track_favorites
- `id`: Primary key
- `talkTrackId`: Favorited talk track
- `agentId`: Agent
- `notes`: Personal notes
- `addedAt`: Timestamp

#### talk_track_customizations
- `id`: Primary key
- `talkTrackId`: Talk track customized
- `agentId`: Agent
- `customizations`: Array of customizations
- `createdAt`: Creation timestamp
- `updatedAt`: Last update timestamp

## API Endpoints

### Talk Track Generation

#### POST /api/v1/talk-tracks/generate
Generate a new AI-powered talk track

**Request Body:**
```typescript
{
  organizationId: string;
  type: TalkTrackType;
  tone?: TalkTrackTone;
  targetAudience?: string[];
  industry?: string;
  productFocus?: string[];
  leadContext?: LeadContext;
  competitorContext?: CompetitorContext;
  customInstructions?: string;
  sections?: string[];
  excludeSections?: string[];
  maxDuration?: number;
}
```

**Response:**
```typescript
{
  talkTrack: TalkTrack;
  metadata: {
    model: string;
    generatedAt: Date;
    promptTokens: number;
    completionTokens: number;
    totalTime: number;
    sources: string[];
    customizations: string[];
  };
  confidence: number; // 0-1
}
```

#### POST /api/v1/talk-tracks/generate/batch
Generate multiple talk tracks in batch

### Talk Track CRUD

#### GET /api/v1/talk-tracks/:id
Get a specific talk track with all sections

#### GET /api/v1/talk-tracks
List talk tracks with filters and search

**Query Parameters:**
- `organizationId`: Required
- `filters`: JSON string of filters
  - `type`: TalkTrackType
  - `tone`: TalkTrackTone
  - `status`: TalkTrackStatus
  - `industry`: string[]
  - `tags`: string[]
  - `isTemplate`: boolean
  - `dateRange`: { start, end }
- `searchTerm`: Search in name and tags
- `sortBy`: createdAt | updatedAt | name | usageCount | rating
- `sortOrder`: asc | desc
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 50)

#### PUT /api/v1/talk-tracks/:id
Update a talk track (increments version)

#### DELETE /api/v1/talk-tracks/:id
Delete a talk track

#### POST /api/v1/talk-tracks/:id/approve
Approve a talk track (status: APPROVED)

#### POST /api/v1/talk-tracks/:id/archive
Archive a talk track (status: ARCHIVED)

### Templates

#### POST /api/v1/talk-tracks/templates
Create a reusable template

**Request Body:**
```typescript
{
  organizationId: string;
  name: string;
  type: TalkTrackType;
  tone: TalkTrackTone;
  description: string;
  targetAudience?: string[];
  industry?: string[];
  estimatedDuration?: number;
  sections: TalkTrackSectionTemplate[];
  tags: string[];
}
```

#### GET /api/v1/talk-tracks/templates
Get all templates for an organization

**Query Parameters:**
- `organizationId`: Required

### Objection Handlers

#### POST /api/v1/talk-tracks/objections/generate
Generate objection handlers

**Request Body:**
```typescript
{
  organizationId: string;
  objectionType: ObjectionType;
  customObjection?: string;
  context?: {
    industry?: string;
    productFocus?: string[];
    competitor?: string;
  };
  tone?: TalkTrackTone;
  generateAlternatives?: boolean;
}
```

**Response:**
```typescript
[
  {
    id: string;
    objectionType: ObjectionType;
    objection: string;
    response: string;
    techniques: string[];
    fallbackResponses: string[];
    confidence: number;
  }
]
```

### Usage Tracking

#### POST /api/v1/talk-tracks/:id/usage
Track talk track usage

**Request Body:**
```typescript
{
  agentId: string;
  context: {
    stage: SalesStage;
    duration?: number;
    sectionsUsed?: string[];
    modifications?: string[];
    outcome?: 'scheduled' | 'no_interest' | 'follow_up' | 'closed' | 'not_qualified';
  };
  feedback?: {
    rating?: number; // 1-5
    helpful?: boolean;
    comments?: string;
    whatWorked?: string[];
    whatDidntWork?: string[];
    suggestions?: string;
  };
}
```

#### GET /api/v1/talk-tracks/:id/analytics
Get usage analytics for a talk track

**Response:**
```typescript
{
  talkTrackId: string;
  totalUsage: number;
  avgRating: number;
  successRate: number;
  avgDuration: number;
  mostUsedSections: string[];
  leastUsedSections: string[];
  feedbackTrends: FeedbackTrend[];
  topObjections: ObjectionStats[];
}
```

### Favorites

#### POST /api/v1/talk-tracks/:id/favorites
Add talk track to favorites

**Request Body:**
```typescript
{
  agentId: string;
  notes?: string;
}
```

#### GET /api/v1/talk-tracks/favorites
Get agent's favorite talk tracks

**Query Parameters:**
- `agentId`: Required

#### DELETE /api/v1/talk-tracks/:id/favorites
Remove talk track from favorites

**Query Parameters:**
- `agentId`: Required

### Customizations

#### POST /api/v1/talk-tracks/:id/customizations
Create agent customizations for a talk track

**Request Body:**
```typescript
{
  agentId: string;
  customizations: [
    {
      sectionId?: string;
      originalContent: string;
      customContent: string;
      reason?: string;
    }
  ];
}
```

#### GET /api/v1/talk-tracks/customizations
Get agent's customizations

**Query Parameters:**
- `agentId`: Required

## Usage Examples

### Generate a Discovery Call Talk Track

```typescript
const response = await fetch('/api/v1/talk-tracks/generate', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    organizationId: 'org-123',
    type: 'DISCOVERY',
    tone: 'CONSULTATIVE',
    targetAudience: ['decision-makers', 'c-level'],
    industry: 'healthcare',
    leadContext: {
      leadName: 'John Smith',
      company: 'Acme Healthcare',
      size: 'medium',
      painPoints: ['slow lead follow-up', 'poor conversion rates'],
      budgetRange: '$10,000 - $25,000',
      timeline: 'Next quarter',
      decisionMaker: true,
      source: 'referral',
      stage: 'QUALIFIED'
    },
    customInstructions: 'Focus on ROI and ease of implementation',
    maxDuration: 20
  })
});
```

### Generate Objection Handlers

```typescript
const response = await fetch('/api/v1/talk-tracks/objections/generate', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    organizationId: 'org-123',
    objectionType: 'PRICE',
    context: {
      industry: 'healthcare',
      competitor: 'CompetitorX',
    },
    tone: 'PROFESSIONAL',
    generateAlternatives: true
  })
});
```

### Track Usage and Provide Feedback

```typescript
const response = await fetch('/api/v1/talk-tracks/tt-123/usage', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    agentId: 'agent-456',
    context: {
      stage: 'DISCOVERY',
      duration: 18,
      sectionsUsed: ['Introduction', 'Discovery Questions', 'Value Proposition'],
      outcome: 'scheduled'
    },
    feedback: {
      rating: 5,
      helpful: true,
      comments: 'Very effective introduction',
      whatWorked: ['The value prop questions', 'ROI framing'],
      suggestions: 'Add more about competitive differentiation'
    }
  })
});
```

## Integration with Competitive Intelligence

The AI Talk Track Generator integrates with the Competitive Intelligence platform:

1. **Battle Cards**: Automatically pulls talking points, strengths, and weaknesses
2. **Competitor Context**: Incorporates specific competitor positioning
3. **Objection Patterns**: Uses historical win/loss data to anticipate objections
4. **Winning Strategies**: Generates approaches based on successful deal patterns

## Best Practices

### 1. Generation

- Provide rich lead context for better personalization
- Include competitor information when relevant
- Specify tone preferences for consistency
- Use custom instructions for organization-specific messaging
- Start with templates for consistent structure

### 2. Usage

- Track all usage for accurate analytics
- Provide detailed feedback for AI improvement
- Customize talk tracks based on agent experience
- Use favorites for frequently used scripts
- Review analytics regularly to identify top performers

### 3. Management

- Maintain a library of approved templates
- Regularly archive outdated talk tracks
- Version major changes to track evolution
- Share successful customizations across teams
- Update talk tracks based on market changes

### 4. Quality

- Review AI-generated content before use
- Test talk tracks in controlled environments
- Monitor success rates by type and tone
- Iterate based on agent feedback
- Combine AI generation with human expertise

## Future Enhancements

1. **Multi-language Support**: Generate talk tracks in multiple languages
2. **Voice Integration**: Text-to-speech for practice calls
3. **Real-time Coaching**: Suggest responses during live calls
4. **A/B Testing**: Test different talk track variations
5. **CRM Integration**: Auto-generate talk tracks based on lead data
6. **Voice Analysis**: Analyze recorded calls for improvement
7. **Team Collaboration**: Shared talk track libraries
8. **Performance Prediction**: Predict talk track success before use
9. **Dynamic Adaptation**: Adjust talk track based on conversation flow
10. **Industry Templates**: Pre-built industry-specific templates

## Files Created

1. `packages/types/src/talk-track.ts` - Type definitions
2. `apps/data-service/src/services/talk-track-generator.service.ts` - Core service logic
3. `apps/data-service/src/routes/talk-track.routes.ts` - Data service API endpoints
4. `apps/api/src/routes/talk-track.ts` - API proxy routes

## Files Modified

1. `packages/types/src/index.ts` - Added talk-track exports
2. `apps/data-service/src/index.ts` - Registered talk track routes at `/api/v1/talk-tracks`
3. `apps/api/src/app.ts` - Registered talk track routes at `/api/v1/talk-tracks` and `/api/talk-tracks`

## Status

✅ Task 6.1: AI Talk Track Generator - Complete

All core functionality implemented:
- Type definitions ✓
- Service layer ✓
- API endpoints ✓
- Integration points ✓
- Documentation ✓
