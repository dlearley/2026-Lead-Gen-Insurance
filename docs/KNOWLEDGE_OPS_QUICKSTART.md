# Knowledge Transfer & Operations Enablement - Quick Start Guide

## Overview

This guide provides a quick introduction to using the Knowledge Transfer & Operations Enablement system.

## Prerequisites

- Services running (API Service on port 3000, Data Service on port 3001)
- Valid authentication token
- Basic understanding of operational procedures

## Quick Start Steps

### 1. Create Your First Knowledge Article

```bash
# Create a runbook article
curl -X POST http://localhost:3000/api/v1/knowledge-ops/articles \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "title": "Restart Application Service",
    "type": "runbook",
    "category": "operations",
    "content": "# Restart Application Service\n\n## Steps\n1. Check service status\n2. Gracefully stop service\n3. Verify shutdown\n4. Start service\n5. Verify startup",
    "summary": "Step-by-step guide to restart application service",
    "tags": ["operations", "restart", "service"],
    "author": "your-user-id",
    "metadata": {
      "estimatedReadTime": 5,
      "difficulty": "beginner",
      "applicableServices": ["api-service"]
    }
  }'
```

### 2. Create a Runbook

```bash
# Create a structured runbook
curl -X POST http://localhost:3000/api/v1/knowledge-ops/runbooks \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "title": "Clear Redis Cache",
    "description": "Procedure to clear Redis cache",
    "category": "operations",
    "steps": [
      {
        "orderIndex": 0,
        "title": "Connect to Redis",
        "description": "Connect to Redis instance",
        "command": "redis-cli -h localhost -p 6379",
        "expectedOutput": "redis>",
        "notes": "Use production credentials if targeting production"
      },
      {
        "orderIndex": 1,
        "title": "Clear cache",
        "description": "Execute FLUSHDB command",
        "command": "FLUSHDB",
        "expectedOutput": "OK",
        "validationChecks": ["Verify cache is empty with DBSIZE"]
      }
    ],
    "estimatedDuration": 5,
    "requiredPermissions": ["redis:admin"],
    "tags": ["redis", "cache"],
    "createdBy": "your-user-id"
  }'
```

### 3. Execute a Runbook

```bash
# Start runbook execution
curl -X POST http://localhost:3000/api/v1/knowledge-ops/runbooks/execute \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "runbookId": "RUNBOOK_ID",
    "executedBy": "your-user-id",
    "context": {
      "environment": "staging",
      "reason": "Testing cache clear procedure"
    }
  }'

# Update execution status
curl -X PUT http://localhost:3000/api/v1/knowledge-ops/runbooks/executions/EXECUTION_ID \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "status": "completed",
    "outcome": {
      "success": true,
      "notes": "Cache cleared successfully",
      "lessonsLearned": ["Command executed without issues"]
    }
  }'
```

### 4. Report an Incident

```bash
# Create incident
curl -X POST http://localhost:3000/api/v1/knowledge-ops/incidents \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "title": "API Service High Latency",
    "description": "API response times increased by 300%",
    "severity": "sev2",
    "affectedServices": ["api-service"],
    "metadata": {
      "oncallEngineer": "engineer-id",
      "customerImpact": "Slow page loads"
    }
  }'

# Add timeline event
curl -X POST http://localhost:3000/api/v1/knowledge-ops/incidents/INCIDENT_ID/timeline \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "eventType": "update",
    "description": "Identified high database query latency as root cause",
    "author": "engineer-id"
  }'

# Update incident status
curl -X PUT http://localhost:3000/api/v1/knowledge-ops/incidents/INCIDENT_ID \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "status": "resolved",
    "rootCause": "Database query missing index",
    "resolution": "Added index to frequently queried column"
  }'
```

### 5. Create a Postmortem

```bash
curl -X POST http://localhost:3000/api/v1/knowledge-ops/postmortems \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "incidentId": "INCIDENT_ID",
    "title": "API Latency Incident - 2026-01-26",
    "summary": "API latency increased due to missing database index",
    "impact": {
      "duration": 7200000,
      "affectedServices": ["api-service"],
      "severity": "sev2"
    },
    "timeline": [
      {
        "timestamp": "2026-01-26T10:00:00Z",
        "description": "High latency alerts triggered"
      },
      {
        "timestamp": "2026-01-26T10:15:00Z",
        "description": "Identified missing database index"
      },
      {
        "timestamp": "2026-01-26T12:00:00Z",
        "description": "Index added, latency returned to normal"
      }
    ],
    "rootCause": {
      "description": "Missing database index on frequently queried column",
      "contributingFactors": ["Query pattern changed after recent feature"],
      "fiveyWhys": [
        "Why was API slow? Database queries were slow",
        "Why were queries slow? Missing index",
        "Why was index missing? Not added during feature development",
        "Why wasn\u0027t it caught? No query performance testing",
        "Why no testing? Not part of standard QA process"
      ]
    },
    "resolution": {
      "description": "Added database index",
      "permanentFixes": ["Add query performance testing to QA"]
    },
    "actionItems": [
      {
        "title": "Implement query performance testing",
        "priority": "high",
        "assignee": "qa-lead",
        "status": "open"
      }
    ],
    "lessonsLearned": ["Always test query performance", "Monitor query execution plans"],
    "whatWentWell": ["Quick identification of root cause"],
    "whatWentWrong": ["No performance testing before deployment"],
    "author": "incident-commander"
  }'
```

### 6. Set Up Team Handoff

```bash
# Create handoff checklist for new team member
curl -X POST http://localhost:3000/api/v1/knowledge-ops/handoff/checklists \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "teamMemberId": "new-engineer-id",
    "phase": "documentation_review",
    "items": [
      {
        "category": "Documentation",
        "title": "Review architecture documentation",
        "description": "Read system architecture docs",
        "required": true
      },
      {
        "category": "Operations",
        "title": "Review operational runbooks",
        "description": "Familiarize with all runbooks",
        "required": true
      }
    ]
  }'

# Mark checklist item as complete
curl -X PUT http://localhost:3000/api/v1/knowledge-ops/handoff/checklists/CHECKLIST_ID/items/ITEM_ID \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "completed": true,
    "completedBy": "new-engineer-id",
    "notes": "Reviewed all architecture documentation"
  }'
```

### 7. Schedule Shadowing Session

```bash
# Create shadowing session
curl -X POST http://localhost:3000/api/v1/knowledge-ops/team/shadowing \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "type": "shadowing",
    "traineeId": "trainee-id",
    "mentorId": "mentor-id",
    "activity": "On-call shift",
    "description": "Shadow mentor during on-call shift",
    "scheduledAt": "2026-02-01T09:00:00Z",
    "duration": 480
  }'

# Complete session with feedback
curl -X PUT http://localhost:3000/api/v1/knowledge-ops/team/shadowing/SESSION_ID \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "completed": true,
    "completedAt": "2026-02-01T17:00:00Z",
    "feedback": {
      "mentorFeedback": "Trainee showed good understanding of incident response",
      "traineeFeedback": "Great learning experience, mentor explained everything clearly",
      "skillsDemonstrated": ["incident triage", "communication", "problem solving"],
      "areasForImprovement": ["database troubleshooting"],
      "rating": 5
    }
  }'
```

### 8. Conduct Readiness Assessment

```bash
curl -X POST http://localhost:3000/api/v1/knowledge-ops/team/assessments \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "teamMemberId": "engineer-id",
    "assessor": "team-lead-id",
    "readinessLevel": "ready",
    "areas": [
      {
        "area": "Incident Response",
        "score": 90,
        "maxScore": 100,
        "notes": "Handled multiple incidents independently"
      },
      {
        "area": "System Architecture",
        "score": 85,
        "maxScore": 100,
        "notes": "Strong understanding of system design"
      },
      {
        "area": "Operations",
        "score": 80,
        "maxScore": 100,
        "notes": "Proficient with all runbooks"
      }
    ],
    "overallScore": 85,
    "shadowingSessions": 8,
    "incidentsHandled": 5,
    "runbooksExecuted": 15,
    "strengths": ["Quick learner", "Good communicator", "Problem solver"],
    "improvementAreas": ["Advanced database optimization"],
    "recommendations": ["Take advanced database course"],
    "approvedForProduction": true
  }'
```

### 9. Search Knowledge Base

```bash
curl -X POST http://localhost:3000/api/v1/knowledge-ops/articles/search \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "query": "database backup",
    "type": "runbook",
    "category": "operations",
    "status": "published"
  }'
```

### 10. View Operations Metrics

```bash
curl "http://localhost:3000/api/v1/knowledge-ops/metrics?startDate=2026-01-01&endDate=2026-01-31" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## Common Use Cases

### Use Case 1: New Team Member Onboarding

1. Create handoff checklist for documentation review phase
2. Assign knowledge articles and courses
3. Schedule shadowing sessions with mentors
4. Track completion of checklist items
5. Progress to hands-on shadowing phase
6. Conduct readiness assessments
7. Certify for production access

### Use Case 2: Incident Response & Learning

1. Create incident when issue detected
2. Add timeline events as investigation progresses
3. Link relevant runbooks to incident
4. Execute runbooks and track execution
5. Update incident with root cause and resolution
6. Create postmortem for learning
7. Define action items with owners
8. Publish postmortem for team learning

### Use Case 3: Building Operational Knowledge

1. Create knowledge articles for procedures
2. Convert articles to structured runbooks
3. Test runbooks through execution tracking
4. Gather feedback from executions
5. Iterate and improve runbooks
6. Link runbooks to related articles
7. Track usage metrics

### Use Case 4: Team Readiness Tracking

1. Set up handoff checklists for phases
2. Schedule regular shadowing sessions
3. Conduct periodic readiness assessments
4. Track certifications and training completion
5. Monitor practical experience metrics
6. Identify improvement areas
7. Certify team members for production

## Best Practices

### Knowledge Articles
- Keep articles concise and focused
- Use clear, descriptive titles
- Tag articles appropriately for discoverability
- Link related articles and resources
- Keep articles up to date
- Include estimated read time

### Runbooks
- Break complex procedures into clear steps
- Include validation checks for each step
- Document rollback procedures
- Specify required permissions
- Test runbooks regularly
- Track execution outcomes

### Incidents
- Report incidents immediately
- Update timeline as events occur
- Link relevant runbooks and articles
- Document root cause thoroughly
- Create postmortems for major incidents
- Share learnings with team

### Postmortems
- Focus on learning, not blame
- Use Five Whys for root cause analysis
- Document both successes and failures
- Create actionable items with owners
- Publish promptly after incident
- Review action items regularly

### Team Handoff
- Follow structured phases
- Use comprehensive checklists
- Schedule sufficient shadowing sessions
- Provide constructive feedback
- Document progress regularly
- Certify only when truly ready

## Troubleshooting

### Articles Not Found
- Check article status (may be in draft)
- Verify article ID is correct
- Ensure you have permission to view

### Runbook Execution Fails
- Check required permissions
- Verify prerequisites are met
- Review execution context
- Check for service availability

### Checklist Not Progressing
- Verify all required items are marked complete
- Check item completion timestamps
- Ensure completedBy field is set

### Metrics Not Showing
- Verify date range parameters
- Check that data exists for the period
- Ensure proper authentication

## Next Steps

1. **Explore the API**: Review full API documentation in `docs/PHASE_KNOWLEDGE_OPS.md`
2. **Set Up Your Team**: Create handoff checklists and start shadowing sessions
3. **Build Knowledge Base**: Document your operational procedures
4. **Track Operations**: Monitor incidents, runbooks, and team readiness
5. **Integrate with Training**: Link knowledge articles to education courses

## Support

For issues or questions:
- Review the full documentation: `docs/PHASE_KNOWLEDGE_OPS.md`
- Check the API endpoints: `apps/data-service/src/routes/knowledge-ops.routes.ts`
- Review type definitions: `packages/types/src/knowledge-ops.ts`
