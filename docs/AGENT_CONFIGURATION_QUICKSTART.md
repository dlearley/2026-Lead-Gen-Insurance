# Agent Configuration & Customization - Quick Start Guide

Get started with Agent Configuration & Customization in 5 minutes.

## Table of Contents

1. [Overview](#overview)
2. [Quick Setup](#quick-setup)
3. [Common Use Cases](#common-use-cases)
4. [API Examples](#api-examples)
5. [Testing](#testing)

## Overview

The Agent Configuration & Customization system allows insurance agents to:

- Set their work hours and availability
- Define lead preferences (types, quality, location)
- Configure notification settings
- Customize their profile
- Manage certifications and skills
- Set performance targets

## Quick Setup

### 1. Initialize Agent Configuration

When a new agent is created, initialize their configuration with defaults:

```bash
curl -X POST http://localhost:3000/api/v1/agents/agent_123/configuration/initialize \
  -H "Content-Type: application/json"
```

This creates:
- 9-5 weekday availability
- Neutral preferences for all insurance types
- Email and push notifications enabled
- Default performance targets

### 2. Customize Availability

Update work hours to match the agent's schedule:

```bash
curl -X PUT http://localhost:3000/api/v1/agents/agent_123/availability \
  -H "Content-Type: application/json" \
  -d '{
    "workHours": [
      {
        "dayOfWeek": "monday",
        "startTime": "08:00",
        "endTime": "18:00",
        "isEnabled": true
      },
      {
        "dayOfWeek": "tuesday",
        "startTime": "08:00",
        "endTime": "18:00",
        "isEnabled": true
      },
      {
        "dayOfWeek": "wednesday",
        "startTime": "08:00",
        "endTime": "18:00",
        "isEnabled": true
      },
      {
        "dayOfWeek": "thursday",
        "startTime": "08:00",
        "endTime": "18:00",
        "isEnabled": true
      },
      {
        "dayOfWeek": "friday",
        "startTime": "08:00",
        "endTime": "18:00",
        "isEnabled": true
      },
      {
        "dayOfWeek": "saturday",
        "startTime": "09:00",
        "endTime": "13:00",
        "isEnabled": true
      },
      {
        "dayOfWeek": "sunday",
        "startTime": "09:00",
        "endTime": "13:00",
        "isEnabled": false
      }
    ],
    "maxConcurrentLeads": 15,
    "autoAcceptLeads": true
  }'
```

### 3. Set Lead Preferences

Configure which leads the agent wants to receive:

```bash
curl -X PUT http://localhost:3000/api/v1/agents/agent_123/preferences \
  -H "Content-Type: application/json" \
  -d '{
    "insuranceTypes": {
      "auto": "preferred",
      "home": "preferred",
      "life": "neutral",
      "health": "neutral",
      "commercial": "avoid"
    },
    "minLeadQualityScore": 70,
    "preferredLocations": ["CA", "NY", "TX"],
    "languages": ["en", "es"]
  }'
```

## Common Use Cases

### Use Case 1: Agent Goes On Vacation

```bash
# Add time off
curl -X PUT http://localhost:3000/api/v1/agents/agent_123/availability \
  -H "Content-Type: application/json" \
  -d '{
    "status": "away",
    "timeOff": [
      {
        "startDate": "2024-12-24T00:00:00Z",
        "endDate": "2024-12-31T23:59:59Z",
        "reason": "Holiday vacation"
      }
    ]
  }'
```

### Use Case 2: Agent Specializes in Auto Insurance

```bash
# Update preferences to focus on auto insurance
curl -X PUT http://localhost:3000/api/v1/agents/agent_123/preferences \
  -H "Content-Type: application/json" \
  -d '{
    "insuranceTypes": {
      "auto": "preferred",
      "home": "neutral",
      "life": "avoid",
      "health": "avoid",
      "commercial": "avoid"
    },
    "minLeadQualityScore": 75
  }'

# Add auto insurance certification
curl -X POST http://localhost:3000/api/v1/agents/agent_123/certifications \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Certified Auto Insurance Specialist",
    "issuingOrganization": "National Auto Insurance Association",
    "issueDate": "2024-01-15T00:00:00Z",
    "expirationDate": "2027-01-15T00:00:00Z"
  }'

# Add auto insurance skill
curl -X POST http://localhost:3000/api/v1/agents/agent_123/skills \
  -H "Content-Type: application/json" \
  -d '{
    "skillName": "Auto Insurance Sales",
    "category": "insurance_type",
    "proficiencyLevel": 5,
    "yearsOfExperience": 12
  }'
```

### Use Case 3: Configure Quiet Hours

```bash
# Set notification quiet hours (no notifications 10pm-8am)
curl -X PUT http://localhost:3000/api/v1/agents/agent_123/notifications \
  -H "Content-Type: application/json" \
  -d '{
    "leadAssignment": {
      "enabled": true,
      "channels": ["email", "push"],
      "quietHours": {
        "startTime": "22:00",
        "endTime": "08:00"
      }
    }
  }'
```

### Use Case 4: Agent at Full Capacity

```bash
# Temporarily stop accepting new leads
curl -X PUT http://localhost:3000/api/v1/agents/agent_123/availability \
  -H "Content-Type: application/json" \
  -d '{
    "status": "busy",
    "autoAcceptLeads": false
  }'
```

### Use Case 5: Set Performance Goals

```bash
# Set monthly targets and alerts
curl -X PUT http://localhost:3000/api/v1/agents/agent_123/thresholds \
  -H "Content-Type: application/json" \
  -d '{
    "targets": {
      "monthlyLeadGoal": 60,
      "monthlyConversionGoal": 20,
      "targetConversionRate": 33,
      "targetResponseTime": 15
    },
    "alerts": {
      "lowConversionRate": {
        "enabled": true,
        "threshold": 25
      },
      "slowResponseTime": {
        "enabled": true,
        "threshold": 30
      },
      "capacityWarning": {
        "enabled": true,
        "threshold": 90
      }
    }
  }'
```

## API Examples

### Check Current Availability

```bash
curl http://localhost:3000/api/v1/agents/agent_123/availability/check
```

Response:
```json
{
  "agentId": "agent_123",
  "isAvailable": true,
  "checkedAt": "2024-01-15T14:30:00.000Z"
}
```

### Get Complete Configuration

```bash
curl http://localhost:3000/api/v1/agents/agent_123/configuration
```

### Get All Certifications

```bash
curl http://localhost:3000/api/v1/agents/agent_123/certifications
```

### Get All Skills

```bash
curl http://localhost:3000/api/v1/agents/agent_123/skills
```

### Update Profile

```bash
curl -X PUT http://localhost:3000/api/v1/agents/agent_123/profile \
  -H "Content-Type: application/json" \
  -d '{
    "bio": "Experienced insurance agent with 15+ years in the industry...",
    "headline": "Senior Insurance Specialist - Auto & Home",
    "yearsOfExperience": 15,
    "languages": ["English", "Spanish", "French"],
    "tagline": "Your Trusted Insurance Partner"
  }'
```

## Testing

### Using the Service Directly

```typescript
import { AgentConfigurationService } from '@insurance-lead-gen/orchestrator';

const configService = new AgentConfigurationService();

// Initialize new agent
const config = await configService.initializeDefaultConfiguration('agent_123');
console.log('Default config created:', config);

// Check availability
const isAvailable = await configService.isAgentAvailable('agent_123');
console.log('Agent available:', isAvailable);

// Check lead match
const { matches, reasons } = await configService.doesLeadMatchPreferences('agent_123', {
  insuranceType: 'auto',
  qualityScore: 85,
  location: 'CA'
});
console.log('Lead matches:', matches, reasons);
```

### Running Unit Tests

```bash
cd apps/orchestrator
pnpm test agent-configuration
```

### Testing with Postman

Import the API endpoints into Postman:

1. Create a new collection "Agent Configuration"
2. Add requests for all endpoints
3. Set base URL: `http://localhost:3000/api/v1/agents`
4. Test each endpoint with sample data

## Integration with Lead Routing

When routing leads, the system automatically:

1. **Checks availability** - Only routes to available agents
2. **Matches preferences** - Respects insurance type, quality, location preferences
3. **Respects capacity** - Won't exceed `maxConcurrentLeads`
4. **Auto-accepts** - Automatically assigns if `autoAcceptLeads` is true

Example routing logic:

```typescript
import { AgentConfigurationService } from '@insurance-lead-gen/orchestrator';

const configService = new AgentConfigurationService();

async function canAssignLead(agentId: string, lead: any): Promise<boolean> {
  // Check availability
  const isAvailable = await configService.isAgentAvailable(agentId);
  if (!isAvailable) {
    return false;
  }

  // Check preferences
  const { matches } = await configService.doesLeadMatchPreferences(agentId, {
    insuranceType: lead.insuranceType,
    qualityScore: lead.qualityScore,
    location: lead.location,
    budget: lead.budget,
    source: lead.source
  });

  return matches;
}
```

## Troubleshooting

### Agent Not Receiving Leads

1. Check availability status:
   ```bash
   curl http://localhost:3000/api/v1/agents/agent_123/availability
   ```

2. Verify current time is within work hours

3. Check if agent has time off scheduled

4. Review lead preferences to ensure they're not too restrictive

### Notifications Not Working

1. Check notification preferences:
   ```bash
   curl http://localhost:3000/api/v1/agents/agent_123/notifications
   ```

2. Verify channels are enabled

3. Check if current time is within quiet hours

4. Ensure notification service is running

### Performance Alerts Not Triggering

1. Verify performance thresholds are set:
   ```bash
   curl http://localhost:3000/api/v1/agents/agent_123/thresholds
   ```

2. Check that alerts are enabled

3. Verify actual performance metrics cross thresholds

## Next Steps

- [Full API Documentation](./PHASE_15.1.3_AGENT_CONFIGURATION.md)
- [Agent Management Guide](./AGENTS.md)
- [Lead Routing Integration](./ROUTING.md)
- [Performance Monitoring](./MONITORING.md)

## Support

For issues or questions:
- Check the full documentation
- Review API examples
- Test with sample data
- Contact support team
