# Phase 12.5: Enhanced Community Features

## Overview

Phase 12.5 significantly expands the community platform introduced in Phase 9.6c, transforming it from a basic discussion forum into a comprehensive agent collaboration and development ecosystem. This phase introduces Groups, Events, Badges/Achievements, Mentorship Programs, Enhanced Profiles, and Social Connections.

## Features Implemented

### 1. Community Groups/Forums

Create and manage specialized communities for different topics, insurance types, regions, or expertise levels.

**Features:**
- Public and private groups
- Group categories and topics
- Member roles (Member, Moderator, Admin)
- Group-specific discussions
- Cover images and descriptions
- Member management

**Database Models:**
- `CommunityGroup` - Group information and settings
- `CommunityGroupMember` - Group membership with roles

**API Endpoints:**
```
POST   /api/v1/community/groups              - Create a new group
GET    /api/v1/community/groups              - List groups (filtered by category)
GET    /api/v1/community/groups/:id          - Get group details with members
POST   /api/v1/community/groups/:id/join     - Join a group
POST   /api/v1/community/groups/:id/leave    - Leave a group
```

### 2. Community Events

Host and attend virtual and in-person events including webinars, workshops, training sessions, and networking events.

**Features:**
- Multiple event types (Webinar, Workshop, Training, Networking, Q&A, Meetup)
- Virtual and in-person events
- Event registration and attendance tracking
- Maximum attendee limits
- Meeting links for virtual events
- Event cover images

**Database Models:**
- `CommunityEvent` - Event information and scheduling
- `CommunityEventAttendee` - Registration and attendance tracking

**API Endpoints:**
```
POST   /api/v1/community/events              - Create a new event
GET    /api/v1/community/events              - List events (filtered by type/date)
GET    /api/v1/community/events/:id          - Get event details with attendees
POST   /api/v1/community/events/:id/register - Register for an event
POST   /api/v1/community/events/:id/cancel   - Cancel event registration
```

### 3. Badges & Achievements

Gamification system to recognize and reward agent accomplishments and community participation.

**Badge Types:**
- **Community Engagement:**
  - `FIRST_POST` - Posted first community message
  - `FIRST_COMMENT` - Left first comment
  - `TOP_CONTRIBUTOR` - Highly active community member
  - `HELPFUL_ANSWER` - Provided valuable answers
  - `EXPERT_ADVISOR` - Recognized expert in their field
  - `COMMUNITY_LEADER` - Leading community discussions

- **Milestones:**
  - `MILESTONE_10_LEADS` - Converted 10 leads
  - `MILESTONE_50_LEADS` - Converted 50 leads
  - `MILESTONE_100_LEADS` - Converted 100 leads
  - `MILESTONE_500_LEADS` - Converted 500 leads

- **Performance:**
  - `HIGH_CONVERSION_RATE` - Exceptional conversion performance
  - `PERFECT_ATTENDANCE` - Attended all scheduled events

- **Special:**
  - `EARLY_ADOPTER` - Early platform user
  - `MENTOR` - Active as a mentor

**Database Model:**
- `AgentBadge` - Badges earned by agents with metadata

**API Endpoints:**
```
GET    /api/v1/community/badges/types                  - List all badge types
GET    /api/v1/community/badges/agents/:agentId        - Get agent's badges
POST   /api/v1/community/badges/agents/:agentId/award  - Award a badge (admin)
GET    /api/v1/community/badges/leaderboard            - Badge leaderboard
```

### 4. Mentorship Program

Structured mentorship system to pair experienced agents with newer agents for knowledge transfer and career development.

**Features:**
- Mentor-mentee relationship management
- Request and approval workflow
- Session scheduling and tracking
- Session notes and completion tracking
- Multiple mentorship relationships per agent

**Relationship Statuses:**
- `PENDING` - Request sent, awaiting acceptance
- `ACTIVE` - Active mentorship relationship
- `COMPLETED` - Mentorship successfully completed
- `CANCELLED` - Relationship cancelled

**Session Statuses:**
- `SCHEDULED` - Session scheduled
- `COMPLETED` - Session completed with notes
- `CANCELLED` - Session cancelled
- `NO_SHOW` - Mentee didn't attend

**Database Models:**
- `MentorshipRelationship` - Mentor-mentee pairings
- `MentorshipSession` - Individual mentoring sessions

**API Endpoints:**
```
POST   /api/v1/community/mentorship/request                      - Request mentorship
POST   /api/v1/community/mentorship/:id/accept                   - Accept mentorship request
GET    /api/v1/community/mentorship/mentor/:mentorId             - Get mentorships as mentor
GET    /api/v1/community/mentorship/mentee/:menteeId             - Get mentorships as mentee
POST   /api/v1/community/mentorship/:id/sessions                 - Schedule a session
GET    /api/v1/community/mentorship/:id/sessions                 - Get relationship sessions
POST   /api/v1/community/mentorship/sessions/:sessionId/complete - Complete a session
```

### 5. Enhanced Agent Profiles

Rich agent profiles with social links, specialties, and interests.

**Profile Fields:**
- Bio/About me
- Avatar and cover images
- Specialties (skills and expertise)
- Interests (topics of interest)
- Social links (LinkedIn, Twitter, Facebook, personal website)
- Profile visibility (public/private)

**Database Model:**
- `AgentProfile` - Extended agent information

**API Endpoints:**
```
GET    /api/v1/community/profiles/:agentId  - Get agent profile
PUT    /api/v1/community/profiles/:agentId  - Update agent profile
```

### 6. Social Connections

Follow system for agents to build their professional network.

**Features:**
- Send connection requests
- Accept/reject connection requests
- View followers and following
- Connection status tracking
- Pending requests management

**Connection Statuses:**
- `PENDING` - Connection request sent
- `ACCEPTED` - Connection accepted
- `BLOCKED` - User blocked

**Database Model:**
- `AgentConnection` - Agent-to-agent connections

**API Endpoints:**
```
POST   /api/v1/community/connections/request            - Send connection request
POST   /api/v1/community/connections/accept             - Accept connection
POST   /api/v1/community/connections/remove             - Remove connection
GET    /api/v1/community/connections/:agentId/followers - Get followers
GET    /api/v1/community/connections/:agentId/following - Get following
GET    /api/v1/community/connections/:agentId/pending   - Get pending requests
```

## Technical Implementation

### Architecture

**Data Service:**
- Repositories for each feature domain
- Business logic encapsulation
- Prisma ORM for database operations
- Comprehensive error handling

**API Gateway:**
- Proxy routes to data service
- Request validation
- Response formatting
- Error handling and logging

### Database Schema

All models include:
- UUID primary keys
- Timestamps (createdAt, updatedAt)
- Foreign key relationships with cascade deletes
- Indexes on frequently queried fields
- Unique constraints where applicable

### Prisma Models

```typescript
// Groups
model CommunityGroup
model CommunityGroupMember
enum GroupMemberRole

// Events
model CommunityEvent
model CommunityEventAttendee
enum CommunityEventType
enum EventAttendeeStatus

// Badges
model AgentBadge
enum BadgeType

// Mentorship
model MentorshipRelationship
model MentorshipSession
enum MentorshipStatus
enum MentorshipSessionStatus

// Profiles
model AgentProfile

// Connections
model AgentConnection
enum ConnectionStatus
```

### Integration with Existing Features

**VIP Program Integration:**
- Badges can be awarded based on VIP tier achievements
- Community participation contributes to VIP points
- Featured events for VIP members

**Phase 9.6c Integration:**
- Group posts linked to community groups
- Event announcements through community posts
- Badge awards trigger community notifications

## Usage Examples

### 1. Creating a Community Group

```bash
curl -X POST http://localhost:3000/api/v1/community/groups \
  -H "Content-Type: application/json" \
  -d '{
    "createdById": "agent-uuid",
    "name": "Auto Insurance Experts",
    "description": "A community for sharing auto insurance best practices",
    "category": "Auto Insurance",
    "isPrivate": false,
    "coverImage": "https://example.com/cover.jpg"
  }'
```

### 2. Creating an Event

```bash
curl -X POST http://localhost:3000/api/v1/community/events \
  -H "Content-Type: application/json" \
  -d '{
    "hostId": "agent-uuid",
    "title": "Mastering Life Insurance Sales",
    "description": "Learn advanced techniques for life insurance consultations",
    "eventType": "WEBINAR",
    "startTime": "2024-02-01T18:00:00Z",
    "endTime": "2024-02-01T19:30:00Z",
    "isVirtual": true,
    "meetingLink": "https://zoom.us/j/123456789",
    "maxAttendees": 100
  }'
```

### 3. Requesting Mentorship

```bash
curl -X POST http://localhost:3000/api/v1/community/mentorship/request \
  -H "Content-Type: application/json" \
  -d '{
    "mentorId": "experienced-agent-uuid",
    "menteeId": "new-agent-uuid"
  }'
```

### 4. Awarding a Badge

```bash
curl -X POST http://localhost:3000/api/v1/community/badges/agents/{agentId}/award \
  -H "Content-Type: application/json" \
  -d '{
    "badgeType": "MILESTONE_50_LEADS",
    "metadata": {
      "achievedAt": "2024-01-15",
      "leadCount": 50
    }
  }'
```

### 5. Updating Agent Profile

```bash
curl -X PUT http://localhost:3000/api/v1/community/profiles/{agentId} \
  -H "Content-Type: application/json" \
  -d '{
    "bio": "Experienced insurance agent specializing in commercial policies",
    "specialties": ["Commercial Insurance", "Risk Management"],
    "interests": ["Business Development", "Client Relations"],
    "linkedin": "https://linkedin.com/in/agent",
    "website": "https://myagency.com"
  }'
```

### 6. Following an Agent

```bash
curl -X POST http://localhost:3000/api/v1/community/connections/request \
  -H "Content-Type: application/json" \
  -d '{
    "followerId": "my-agent-uuid",
    "followingId": "other-agent-uuid"
  }'
```

## Gamification Strategy

### Badge Progression

1. **Engagement Path:**
   - FIRST_POST → TOP_CONTRIBUTOR → COMMUNITY_LEADER

2. **Performance Path:**
   - MILESTONE_10_LEADS → MILESTONE_50_LEADS → MILESTONE_100_LEADS → MILESTONE_500_LEADS

3. **Expertise Path:**
   - HELPFUL_ANSWER → EXPERT_ADVISOR

4. **Leadership Path:**
   - MENTOR → COMMUNITY_LEADER

### VIP Points Integration

- Creating valuable community content
- Attending and hosting events
- Mentoring other agents
- Earning achievement badges

## Future Enhancements

### Phase 12.6 (Potential):
- Direct messaging between agents
- Community polls and surveys
- Resource library with file sharing
- Advanced moderation tools
- Community analytics dashboard
- Reputation scoring system
- Expert Q&A sessions
- Live streaming for events

### Phase 12.7 (Potential):
- Mobile app for community features
- Push notifications for events and connections
- Advanced search and discovery
- Recommended connections based on specialties
- Integration with external learning platforms
- Certification tracking and display

## Database Migration

After implementing this phase, run:

```bash
cd apps/data-service
npx prisma generate
npx prisma migrate dev --name phase-12-5-community-enhancements
```

## Testing

### Key Test Scenarios:

1. **Groups:**
   - Create public/private groups
   - Join/leave groups
   - Group member role management

2. **Events:**
   - Create various event types
   - Register/cancel registration
   - Attendee limits enforcement

3. **Badges:**
   - Award badges to agents
   - Prevent duplicate badges
   - Badge leaderboard accuracy

4. **Mentorship:**
   - Request/accept mentorship
   - Schedule sessions
   - Complete sessions with notes

5. **Profiles:**
   - Create/update profiles
   - Privacy settings
   - Social link validation

6. **Connections:**
   - Send/accept connection requests
   - View followers/following
   - Remove connections

## Performance Considerations

- Indexed fields for common queries (category, eventType, status, dates)
- Pagination for lists (groups, events, badges)
- Eager loading of related data (members, attendees)
- Caching for badge leaderboards
- Efficient queries for follower/following counts

## Security Considerations

- Profile visibility controls
- Private group access restrictions
- Event registration limits
- Connection request spam prevention
- Badge award authorization (admin only)
- Data validation on all inputs

## Monitoring & Analytics

Track the following metrics:
- Active groups and members
- Event registration and attendance rates
- Badge distribution
- Active mentorship relationships
- Profile completion rates
- Connection network growth
- Feature engagement rates

## Summary

Phase 12.5 transforms the Insurance Lead Gen platform into a thriving agent community with:
- 🏘️ **Groups** - Specialized communities
- 📅 **Events** - Learning and networking opportunities
- 🏆 **Badges** - Recognition and gamification
- 🎓 **Mentorship** - Knowledge transfer
- 👤 **Profiles** - Professional identity
- 🤝 **Connections** - Network building

Total New Models: 11
Total New Endpoints: 34
Total New Enums: 6

This creates a comprehensive ecosystem for agent collaboration, learning, and professional development.
