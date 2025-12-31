# Phase 15.1.3: Agent Configuration & Customization

This document describes the implementation of the Agent Configuration & Customization system for the Insurance Lead Generation AI Platform.

## Overview

The Agent Configuration & Customization system provides comprehensive management of agent preferences, settings, availability, and profile customization. This enables agents to personalize their experience, control lead routing preferences, and manage their availability schedules.

## Features

### 1. Agent Availability Management

Agents can configure their work schedules, break times, and time off:

**Work Hours Configuration:**
- Day-by-day schedule (Monday through Sunday)
- Start and end times for each day
- Enable/disable specific days
- Timezone support
- Break times within work hours
- Vacation/time off periods

**Availability Status:**
- `available` - Ready to receive leads
- `busy` - Not accepting new leads temporarily
- `away` - Extended absence
- `offline` - Not working

**Auto-accept Settings:**
- Enable/disable automatic lead acceptance
- Configure maximum concurrent leads
- Smart capacity management

### 2. Lead Preferences

Agents can specify their lead preferences to receive the most relevant opportunities:

**Insurance Type Preferences:**
- `preferred` - Actively seeking these leads
- `neutral` - Will accept if available
- `avoid` - Do not send these leads

**Quality & Budget Filters:**
- Minimum lead quality score (0-100)
- Maximum lead quality score
- Minimum budget threshold
- Maximum budget threshold

**Location Preferences:**
- Preferred locations (states, cities, zip codes)
- Excluded locations

**Source Preferences:**
- Preferred lead sources
- Excluded lead sources

**Language Support:**
- Languages the agent speaks

### 3. Notification Preferences

Configure how agents receive notifications across multiple channels:

**Notification Channels:**
- Email
- SMS
- Push notifications
- In-app notifications

**Notification Types:**
- **Lead Assignment** - New lead notifications
  - Configurable channels
  - Quiet hours (no notifications during specified times)
- **Lead Updates** - Status changes and updates
- **Performance Alerts** - Threshold warnings and achievements
- **System Notifications** - Platform announcements

### 4. Profile Customization

Agents can customize their public profiles:

**Profile Fields:**
- Bio/description
- Profile image URL
- Professional headline
- Years of experience
- Languages spoken
- Awards and recognitions
- Social media links (LinkedIn, Twitter, website)
- Video introduction URL
- Professional tagline

### 5. Certifications & Skills

**Certifications Management:**
- Certification name and issuing organization
- Certification number
- Issue and expiration dates
- Document upload
- Status tracking (active, expired, pending_renewal, suspended)
- Verification tracking

**Skills Management:**
- Skill name and category
- Proficiency level (1-5 scale)
- Years of experience per skill
- Endorsement tracking
- Last used date

### 6. Performance Thresholds

Agents can set personal performance targets and configure alerts:

**Performance Targets:**
- Monthly lead goal
- Monthly conversion goal
- Target conversion rate (%)
- Target response time (minutes)
- Minimum quality rating (1-5)

**Performance Alerts:**
- Low conversion rate alert (with threshold)
- Slow response time alert (with threshold)
- Capacity warning (when approaching max capacity)

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                  Agent Configuration Service                     │
├─────────────────────────────────────────────────────────────────┤
│  AgentConfigurationService                                      │
│  ├── Availability Management                                    │
│  │   ├── createAvailability()                                   │
│  │   ├── updateAvailability()                                   │
│  │   ├── getAvailability()                                      │
│  │   └── isAgentAvailable()                                     │
│  ├── Lead Preferences                                           │
│  │   ├── createLeadPreferences()                                │
│  │   ├── updateLeadPreferences()                                │
│  │   ├── getLeadPreferences()                                   │
│  │   └── doesLeadMatchPreferences()                             │
│  ├── Notification Preferences                                   │
│  │   ├── createNotificationPreferences()                        │
│  │   ├── updateNotificationPreferences()                        │
│  │   └── getNotificationPreferences()                           │
│  ├── Profile Customization                                      │
│  │   ├── createProfileCustomization()                           │
│  │   ├── updateProfileCustomization()                           │
│  │   └── getProfileCustomization()                              │
│  ├── Performance Thresholds                                     │
│  │   ├── createPerformanceThresholds()                          │
│  │   ├── updatePerformanceThresholds()                          │
│  │   └── getPerformanceThresholds()                             │
│  ├── Certifications & Skills                                    │
│  │   ├── addCertification() / updateCertification()             │
│  │   ├── getCertifications()                                    │
│  │   ├── addSkill() / updateSkill()                             │
│  │   └── getSkills()                                            │
│  └── Complete Configuration                                     │
│      ├── getCompleteConfiguration()                             │
│      └── initializeDefaultConfiguration()                       │
└─────────────────────────────────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│                        API Routes                                │
├─────────────────────────────────────────────────────────────────┤
│  POST   /api/v1/agents/:agentId/availability                    │
│  PUT    /api/v1/agents/:agentId/availability                    │
│  GET    /api/v1/agents/:agentId/availability                    │
│  GET    /api/v1/agents/:agentId/availability/check              │
│                                                                  │
│  POST   /api/v1/agents/:agentId/preferences                     │
│  PUT    /api/v1/agents/:agentId/preferences                     │
│  GET    /api/v1/agents/:agentId/preferences                     │
│                                                                  │
│  POST   /api/v1/agents/:agentId/notifications                   │
│  PUT    /api/v1/agents/:agentId/notifications                   │
│  GET    /api/v1/agents/:agentId/notifications                   │
│                                                                  │
│  POST   /api/v1/agents/:agentId/profile                         │
│  PUT    /api/v1/agents/:agentId/profile                         │
│  GET    /api/v1/agents/:agentId/profile                         │
│                                                                  │
│  POST   /api/v1/agents/:agentId/thresholds                      │
│  PUT    /api/v1/agents/:agentId/thresholds                      │
│  GET    /api/v1/agents/:agentId/thresholds                      │
│                                                                  │
│  POST   /api/v1/agents/:agentId/certifications                  │
│  GET    /api/v1/agents/:agentId/certifications                  │
│  PUT    /api/v1/agents/certifications/:certificationId          │
│                                                                  │
│  POST   /api/v1/agents/:agentId/skills                          │
│  GET    /api/v1/agents/:agentId/skills                          │
│  PUT    /api/v1/agents/skills/:skillId                          │
│                                                                  │
│  GET    /api/v1/agents/:agentId/configuration                   │
│  POST   /api/v1/agents/:agentId/configuration/initialize        │
└─────────────────────────────────────────────────────────────────┘
```

## API Endpoints

### Availability Management

#### Create Availability Schedule
```http
POST /api/v1/agents/:agentId/availability
Content-Type: application/json

{
  "status": "available",
  "workHours": [
    {
      "dayOfWeek": "monday",
      "startTime": "09:00",
      "endTime": "17:00",
      "isEnabled": true,
      "timezone": "America/New_York"
    }
  ],
  "breakTimes": [
    {
      "startTime": "12:00",
      "endTime": "13:00",
      "description": "Lunch break"
    }
  ],
  "timeOff": [
    {
      "startDate": "2024-12-25T00:00:00Z",
      "endDate": "2024-12-26T23:59:59Z",
      "reason": "Holiday"
    }
  ],
  "maxConcurrentLeads": 10,
  "autoAcceptLeads": false
}
```

#### Update Availability
```http
PUT /api/v1/agents/:agentId/availability
Content-Type: application/json

{
  "status": "busy",
  "maxConcurrentLeads": 5
}
```

#### Get Availability
```http
GET /api/v1/agents/:agentId/availability
```

#### Check Current Availability
```http
GET /api/v1/agents/:agentId/availability/check
```

**Response:**
```json
{
  "agentId": "agent_123",
  "isAvailable": true,
  "checkedAt": "2024-01-15T10:30:00.000Z"
}
```

### Lead Preferences

#### Create Lead Preferences
```http
POST /api/v1/agents/:agentId/preferences
Content-Type: application/json

{
  "insuranceTypes": {
    "auto": "preferred",
    "home": "preferred",
    "life": "neutral",
    "health": "neutral",
    "commercial": "avoid"
  },
  "minLeadQualityScore": 60,
  "maxLeadQualityScore": 100,
  "preferredLocations": ["CA", "NY", "FL"],
  "excludedLocations": ["AK", "HI"],
  "minBudget": 1000,
  "maxBudget": 10000,
  "preferredLeadSources": ["website", "referral"],
  "excludedLeadSources": ["cold_call"],
  "languages": ["en", "es"]
}
```

#### Update Lead Preferences
```http
PUT /api/v1/agents/:agentId/preferences
Content-Type: application/json

{
  "insuranceTypes": {
    "life": "preferred"
  },
  "minLeadQualityScore": 70
}
```

### Notification Preferences

#### Create Notification Preferences
```http
POST /api/v1/agents/:agentId/notifications
Content-Type: application/json

{
  "channels": {
    "email": true,
    "sms": true,
    "push": true,
    "in_app": true
  },
  "leadAssignment": {
    "enabled": true,
    "channels": ["email", "push"],
    "quietHours": {
      "startTime": "22:00",
      "endTime": "08:00"
    }
  },
  "leadUpdates": {
    "enabled": true,
    "channels": ["in_app"]
  },
  "performanceAlerts": {
    "enabled": true,
    "channels": ["email"]
  },
  "systemNotifications": {
    "enabled": true,
    "channels": ["in_app"]
  }
}
```

### Profile Customization

#### Create Profile Customization
```http
POST /api/v1/agents/:agentId/profile
Content-Type: application/json

{
  "bio": "Experienced insurance agent specializing in auto and home insurance...",
  "profileImageUrl": "https://example.com/profile.jpg",
  "headline": "Senior Auto & Home Insurance Specialist",
  "yearsOfExperience": 12,
  "languages": ["English", "Spanish"],
  "awards": ["Top Agent 2023", "Customer Service Excellence Award"],
  "socialLinks": {
    "linkedin": "https://linkedin.com/in/johndoe",
    "twitter": "https://twitter.com/johndoe_insurance",
    "website": "https://johndoe-insurance.com"
  },
  "videoIntroUrl": "https://example.com/video-intro.mp4",
  "tagline": "Your Trusted Insurance Partner"
}
```

### Performance Thresholds

#### Create Performance Thresholds
```http
POST /api/v1/agents/:agentId/thresholds
Content-Type: application/json

{
  "targets": {
    "monthlyLeadGoal": 50,
    "monthlyConversionGoal": 15,
    "targetConversionRate": 30,
    "targetResponseTime": 20,
    "minQualityRating": 4.5
  },
  "alerts": {
    "lowConversionRate": {
      "enabled": true,
      "threshold": 20
    },
    "slowResponseTime": {
      "enabled": true,
      "threshold": 60
    },
    "capacityWarning": {
      "enabled": true,
      "threshold": 85
    }
  }
}
```

### Certifications

#### Add Certification
```http
POST /api/v1/agents/:agentId/certifications
Content-Type: application/json

{
  "name": "Certified Insurance Counselor (CIC)",
  "issuingOrganization": "The National Alliance",
  "certificationNumber": "CIC-2024-12345",
  "issueDate": "2024-01-15T00:00:00Z",
  "expirationDate": "2027-01-15T00:00:00Z",
  "documentUrl": "https://example.com/cert.pdf"
}
```

#### Get Certifications
```http
GET /api/v1/agents/:agentId/certifications
```

**Response:**
```json
{
  "agentId": "agent_123",
  "certifications": [
    {
      "id": "cert_abc123",
      "agentId": "agent_123",
      "name": "Certified Insurance Counselor (CIC)",
      "issuingOrganization": "The National Alliance",
      "status": "active",
      "issueDate": "2024-01-15T00:00:00Z",
      "expirationDate": "2027-01-15T00:00:00Z"
    }
  ],
  "total": 1
}
```

### Skills

#### Add Skill
```http
POST /api/v1/agents/:agentId/skills
Content-Type: application/json

{
  "skillName": "Auto Insurance Sales",
  "category": "insurance_type",
  "proficiencyLevel": 5,
  "yearsOfExperience": 10
}
```

#### Get Skills
```http
GET /api/v1/agents/:agentId/skills
```

### Complete Configuration

#### Get Complete Configuration
```http
GET /api/v1/agents/:agentId/configuration
```

**Response:**
```json
{
  "agentId": "agent_123",
  "availability": { ... },
  "leadPreferences": { ... },
  "notificationPreferences": { ... },
  "profileCustomization": { ... },
  "performanceThresholds": { ... },
  "updatedAt": "2024-01-15T10:30:00.000Z"
}
```

#### Initialize Default Configuration
```http
POST /api/v1/agents/:agentId/configuration/initialize
```

This endpoint creates a complete default configuration for a new agent with sensible defaults:
- 9-5 weekday schedule
- Neutral preferences for all insurance types
- Email and push notifications enabled
- Basic performance thresholds

## Integration with Lead Routing

The agent configuration system integrates with the lead routing service to:

1. **Check Availability** - Only route leads to available agents
2. **Match Preferences** - Respect agent lead preferences
3. **Respect Capacity** - Honor max concurrent leads settings
4. **Auto-accept** - Automatically accept leads if enabled

Example integration:

```typescript
import { AgentConfigurationService } from '@insurance-lead-gen/orchestrator';

const configService = new AgentConfigurationService();

// Check if agent can receive lead
const isAvailable = await configService.isAgentAvailable(agentId);

// Check if lead matches preferences
const { matches, reasons } = await configService.doesLeadMatchPreferences(agentId, {
  insuranceType: 'auto',
  qualityScore: 85,
  location: 'CA',
  budget: 5000,
  source: 'website'
});

if (isAvailable && matches) {
  // Route lead to agent
  await routingService.assignLead(leadId, agentId);
}
```

## Files Created/Modified

### New Files

1. **packages/types/src/agent-config.ts**
   - Complete type definitions for agent configuration
   - 30+ interfaces and types
   - DTOs for all operations

2. **apps/orchestrator/src/services/agent-configuration.service.ts**
   - Main service implementation (900+ lines)
   - In-memory storage (ready for database integration)
   - Complete CRUD operations for all configuration types
   - Smart availability checking
   - Lead preference matching

3. **apps/api/src/routes/agent-config.ts**
   - 20+ API endpoints
   - Comprehensive validation schemas
   - Error handling
   - Full CRUD support

### Modified Files

1. **packages/types/src/index.ts**
   - Added export for agent-config module

2. **apps/api/src/app.ts**
   - Added agent configuration routes
   - Integrated with existing agents routes

## Usage Examples

### Setting Up a New Agent

```typescript
// 1. Initialize default configuration
const config = await configService.initializeDefaultConfiguration('agent_123');

// 2. Customize availability
await configService.updateAvailability('agent_123', {
  workHours: [
    { dayOfWeek: 'monday', startTime: '08:00', endTime: '18:00', isEnabled: true },
    { dayOfWeek: 'tuesday', startTime: '08:00', endTime: '18:00', isEnabled: true },
    // ... other days
  ],
  maxConcurrentLeads: 15,
  autoAcceptLeads: true
});

// 3. Set lead preferences
await configService.updateLeadPreferences('agent_123', {
  insuranceTypes: {
    auto: 'preferred',
    home: 'preferred',
    life: 'neutral'
  },
  minLeadQualityScore: 70,
  preferredLocations: ['CA', 'NY']
});

// 4. Add certifications
await configService.addCertification('agent_123', {
  name: 'Licensed Insurance Agent',
  issuingOrganization: 'State Insurance Board',
  issueDate: new Date(),
  expirationDate: new Date('2027-01-01')
});

// 5. Add skills
await configService.addSkill('agent_123', {
  skillName: 'Auto Insurance Sales',
  category: 'insurance_type',
  proficiencyLevel: 5,
  yearsOfExperience: 10
});
```

### Checking Agent Availability

```typescript
// Real-time availability check
const isAvailable = await configService.isAgentAvailable('agent_123');

if (isAvailable) {
  // Check preferences match
  const { matches, reasons } = await configService.doesLeadMatchPreferences('agent_123', {
    insuranceType: 'auto',
    qualityScore: 85,
    location: 'CA'
  });
  
  if (matches) {
    // Assign lead to agent
  } else {
    console.log('Lead does not match preferences:', reasons);
  }
}
```

## Best Practices

1. **Initialize Configuration Early** - Create default configuration immediately when an agent account is created
2. **Validate Time Formats** - Use 24-hour HH:MM format for all time fields
3. **Handle Timezones** - Store timezone with work hours for accurate availability checking
4. **Update Regularly** - Encourage agents to keep their availability and preferences current
5. **Monitor Performance** - Track how configuration affects lead acceptance and conversion rates
6. **Provide Defaults** - Offer sensible defaults but allow full customization

## Testing

### Unit Tests

Test the configuration service methods:

```typescript
describe('AgentConfigurationService', () => {
  describe('createAvailability', () => {
    it('should create agent availability schedule', async () => {
      const service = new AgentConfigurationService();
      const availability = await service.createAvailability('agent_123', {
        workHours: [
          { dayOfWeek: 'monday', startTime: '09:00', endTime: '17:00', isEnabled: true }
        ]
      });
      
      expect(availability.agentId).toBe('agent_123');
      expect(availability.workHours).toHaveLength(1);
    });
  });

  describe('isAgentAvailable', () => {
    it('should check if agent is available during work hours', async () => {
      // Test implementation
    });

    it('should return false if agent is on break', async () => {
      // Test implementation
    });

    it('should return false if agent is on time off', async () => {
      // Test implementation
    });
  });

  describe('doesLeadMatchPreferences', () => {
    it('should match lead to agent preferences', async () => {
      // Test implementation
    });

    it('should reject lead if insurance type is avoided', async () => {
      // Test implementation
    });
  });
});
```

### Integration Tests

Test API endpoints:

```typescript
describe('Agent Configuration API', () => {
  it('POST /api/v1/agents/:agentId/availability', async () => {
    const response = await request(app)
      .post('/api/v1/agents/agent_123/availability')
      .send({
        workHours: [
          { dayOfWeek: 'monday', startTime: '09:00', endTime: '17:00', isEnabled: true }
        ]
      });
    
    expect(response.status).toBe(201);
    expect(response.body.agentId).toBe('agent_123');
  });
});
```

## Future Enhancements

1. **Database Integration** - Migrate from in-memory storage to PostgreSQL/Prisma
2. **Advanced Scheduling** - Recurring patterns, holiday calendars
3. **AI-Powered Preferences** - Suggest optimal preferences based on performance
4. **Team Coordination** - Shared availability calendars for team routing
5. **Mobile App Integration** - Quick availability status updates
6. **Analytics Dashboard** - Visualize how configuration affects performance
7. **A/B Testing** - Test different configurations to optimize conversions
8. **Smart Notifications** - Context-aware notification delivery
9. **Peer Endorsements** - Allow other agents to endorse skills
10. **Certification Reminders** - Alert agents before certifications expire

## Security Considerations

1. **Authentication** - All endpoints should require agent authentication
2. **Authorization** - Agents can only modify their own configuration
3. **Data Privacy** - Profile information visibility settings
4. **Audit Logging** - Track all configuration changes
5. **Rate Limiting** - Prevent abuse of configuration updates
6. **Input Validation** - Strict validation of all inputs
7. **Sensitive Data** - Encrypt stored certification documents

## Performance Considerations

1. **Caching** - Cache frequently accessed configurations (Redis)
2. **Batch Updates** - Support bulk configuration updates
3. **Async Operations** - Non-blocking configuration saves
4. **Database Indexes** - Index agentId and status fields
5. **Query Optimization** - Efficient availability checks
6. **CDN for Media** - Store profile images on CDN

## Acceptance Criteria

- ✅ Agent can configure work hours and availability
- ✅ Agent can set lead preferences (types, quality, location)
- ✅ Agent can configure notification preferences
- ✅ Agent can customize profile with bio, photo, links
- ✅ Agent can add and manage certifications
- ✅ Agent can add and manage skills
- ✅ Agent can set performance thresholds and alerts
- ✅ System can check real-time agent availability
- ✅ System can match leads to agent preferences
- ✅ Default configuration initialized for new agents
- ✅ Complete API documentation provided
- ✅ All configuration types have CRUD operations
- ✅ Validation schemas enforce data integrity
- ✅ Error handling covers edge cases

## Conclusion

The Agent Configuration & Customization system provides a comprehensive solution for managing agent preferences and settings. It enables agents to personalize their experience, control lead routing, and manage their work schedules effectively. The system integrates seamlessly with the lead routing service to ensure leads are distributed to the most appropriate and available agents.
