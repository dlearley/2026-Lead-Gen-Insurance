# Lead Communication System - User Guide

## Introduction

This guide walks you through using the Lead Communication, Notes, and Activity Tracking system for the Insurance Lead Generation platform.

## Getting Started

### Prerequisites

- API access credentials
- Authorization token (For development: `dev-token`)
- Lead ID (obtained from creating a lead)

### Authentication

All API requests require an authorization header:

```
Authorization: Bearer dev-token
```

## Common Workflows

### 1. Creating and Managing a Lead

#### Step 1: Create a Lead

```bash
curl -X POST http://localhost:3000/api/v1/leads \
  -H "Authorization: Bearer dev-token" \
  -H "Content-Type: application/json" \
  -d '{
    "source": "facebook_ads",
    "email": "customer@example.com",
    "phone": "+1234567890",
    "firstName": "Jane",
    "lastName": "Smith",
    "city": "San Francisco",
    "state": "CA",
    "insuranceType": "AUTO"
  }'
```

**Response:**
```json
{
  "id": "abc123...",
  "status": "received",
  "email": "customer@example.com",
  ...
}
```

Save the `id` - you'll need it for all further operations.

#### Step 2: Add Notes

```bash
curl -X POST http://localhost:3000/api/v1/leads/abc123.../notes \
  -H "Authorization: Bearer dev-token" \
  -H "Content-Type: application/json" \
  -d '{
    "content": "Initial contact made. Customer interested in comprehensive auto coverage.",
    "visibility": "TEAM"
  }'
```

**Visibility Options:**
- `PRIVATE` - Only you can see
- `TEAM` - All team members can see (default)
- `PUBLIC` - Everyone can see

#### Step 3: View Activity Timeline

```bash
curl -X GET "http://localhost:3000/api/v1/leads/abc123.../activity" \
  -H "Authorization: Bearer dev-token"
```

This shows all actions taken on the lead: creation, notes added, emails sent, tasks created, etc.

### 2. Email Communication

#### Sending an Email

```bash
curl -X POST http://localhost:3000/api/v1/leads/abc123.../send-email \
  -H "Authorization: Bearer dev-token" \
  -H "Content-Type: application/json" \
  -d '{
    "to": ["customer@example.com"],
    "subject": "Your Auto Insurance Quote",
    "body": "Hi Jane,\n\nThank you for your interest in auto insurance..."
  }'
```

#### Using Email Templates

First, get available templates:

```bash
curl -X GET "http://localhost:3000/api/v1/leads/abc123.../emails/templates" \
  -H "Authorization: Bearer dev-token"
```

Then send using a template:

```bash
curl -X POST http://localhost:3000/api/v1/leads/abc123.../send-email \
  -H "Authorization: Bearer dev-token" \
  -H "Content-Type: application/json" \
  -d '{
    "to": ["customer@example.com"],
    "templateId": "template-uuid",
    "subject": "Following up on your inquiry",
    "body": "..."
  }'
```

#### Scheduling an Email

```bash
curl -X POST http://localhost:3000/api/v1/leads/abc123.../send-email \
  -H "Authorization: Bearer dev-token" \
  -H "Content-Type: application/json" \
  -d '{
    "to": ["customer@example.com"],
    "subject": "Your Quote is Ready",
    "body": "...",
    "scheduledFor": "2024-01-20T09:00:00Z"
  }'
```

#### View Email History

```bash
curl -X GET "http://localhost:3000/api/v1/leads/abc123.../emails" \
  -H "Authorization: Bearer dev-token"
```

### 3. Task Management

#### Creating a Task

```bash
curl -X POST http://localhost:3000/api/v1/leads/abc123.../tasks \
  -H "Authorization: Bearer dev-token" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Follow up with customer",
    "description": "Customer requested callback to discuss coverage options",
    "priority": "HIGH",
    "dueDate": "2024-01-22T15:00:00Z",
    "assigneeId": "user-uuid-here"
  }'
```

**Priority Levels:**
- `LOW` - Can wait
- `MEDIUM` - Normal priority (default)
- `HIGH` - Important
- `URGENT` - Drop everything

#### Viewing Tasks

```bash
# All tasks for a lead
curl -X GET "http://localhost:3000/api/v1/leads/abc123.../tasks" \
  -H "Authorization: Bearer dev-token"

# Filter by status
curl -X GET "http://localhost:3000/api/v1/leads/abc123.../tasks?status=OPEN" \
  -H "Authorization: Bearer dev-token"

# Filter by assignee
curl -X GET "http://localhost:3000/api/v1/leads/abc123.../tasks?assigneeId=user-uuid" \
  -H "Authorization: Bearer dev-token"
```

#### Completing a Task

```bash
curl -X PUT http://localhost:3000/api/v1/leads/abc123.../tasks/task-uuid \
  -H "Authorization: Bearer dev-token" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "COMPLETED"
  }'
```

**Task Statuses:**
- `OPEN` - Not started
- `IN_PROGRESS` - Working on it
- `COMPLETED` - Done
- `CANCELLED` - No longer needed

### 4. Notifications

#### View Your Notifications

```bash
curl -X GET "http://localhost:3000/api/v1/notifications" \
  -H "Authorization: Bearer dev-token"
```

#### Check Unread Count

```bash
curl -X GET "http://localhost:3000/api/v1/notifications/unread-count" \
  -H "Authorization: Bearer dev-token"
```

#### Mark as Read

```bash
curl -X PUT http://localhost:3000/api/v1/notifications/notif-uuid/read \
  -H "Authorization: Bearer dev-token"
```

#### Mark All as Read

```bash
curl -X PUT http://localhost:3000/api/v1/notifications/mark-all-read \
  -H "Authorization: Bearer dev-token"
```

## Advanced Features

### Filtering and Searching

#### Filter Notes by Date

```bash
curl -X GET "http://localhost:3000/api/v1/leads/abc123.../notes?dateFrom=2024-01-01T00:00:00Z&dateTo=2024-01-31T23:59:59Z" \
  -H "Authorization: Bearer dev-token"
```

#### Search in Notes

```bash
curl -X GET "http://localhost:3000/api/v1/leads/abc123.../notes?search=insurance" \
  -H "Authorization: Bearer dev-token"
```

#### Filter Activity by Type

```bash
curl -X GET "http://localhost:3000/api/v1/leads/abc123.../activity?activityType=EMAIL_SENT" \
  -H "Authorization: Bearer dev-token"
```

### Pagination

All list endpoints support pagination:

```bash
curl -X GET "http://localhost:3000/api/v1/leads/abc123.../notes?page=2&limit=10" \
  -H "Authorization: Bearer dev-token"
```

**Response includes:**
```json
{
  "data": [...],
  "page": 2,
  "limit": 10,
  "total": 45,
  "totalPages": 5
}
```

### Exporting Data

#### Export Activity Log

```bash
curl -X GET "http://localhost:3000/api/v1/leads/abc123.../activity/export" \
  -H "Authorization: Bearer dev-token" \
  -o activity.csv
```

This downloads a CSV file with the complete activity history.

## Best Practices

### 1. Note Taking

**Do:**
- Use descriptive, detailed notes
- Set visibility appropriately (PRIVATE for sensitive info, TEAM for shared)
- Add notes after every customer interaction

**Don't:**
- Include sensitive personal information (SSN, credit cards) in notes
- Use notes for tasks (use the task system instead)

### 2. Email Communication

**Do:**
- Use templates for consistency
- Keep subject lines clear and professional
- Schedule emails for appropriate times

**Don't:**
- Send emails outside business hours (use scheduling)
- Include unverified information

### 3. Task Management

**Do:**
- Set realistic due dates
- Assign priority appropriately
- Mark tasks complete promptly
- Add descriptions for complex tasks

**Don't:**
- Create duplicate tasks
- Leave tasks open indefinitely

### 4. Activity Timeline

**Use the timeline to:**
- Review customer journey
- Understand what happened when
- Find specific interactions
- Export for reporting

## Troubleshooting

### Common Issues

**Problem: "Unauthorized - No token provided"**

Solution: Add the Authorization header:
```bash
-H "Authorization: Bearer dev-token"
```

**Problem: "Lead not found"**

Solution: Verify the lead ID is correct and the lead exists.

**Problem: "Validation error"**

Solution: Check your request body matches the required schema. Common issues:
- Missing required fields
- Wrong data types
- Invalid enum values (e.g., using "HIGH" instead of "HIGH")

**Problem: "Forbidden - Can only edit your own notes"**

Solution: You can only edit/delete notes you created (unless you're an admin).

### Getting Help

- Check the [API Documentation](./API.md) for endpoint details
- Review error messages - they often contain helpful details
- Check the activity log to see what actions were taken
- Contact support if issues persist

## Examples by Role

### Sales Agent

**Daily workflow:**

1. **Check assigned leads**
   ```bash
   curl -X GET "http://localhost:3000/api/v1/leads" \
     -H "Authorization: Bearer dev-token"
   ```

2. **Review lead details and activity**
   ```bash
   curl -X GET "http://localhost:3000/api/v1/leads/abc123.../activity" \
     -H "Authorization: Bearer dev-token"
   ```

3. **Add notes after calls**
   ```bash
   curl -X POST http://localhost:3000/api/v1/leads/abc123.../notes \
     -H "Authorization: Bearer dev-token" \
     -H "Content-Type: application/json" \
     -d '{"content": "Spoke with customer..."}'
   ```

4. **Send follow-up emails**
   ```bash
   curl -X POST http://localhost:3000/api/v1/leads/abc123.../send-email \
     -H "Authorization: Bearer dev-token" \
     -H "Content-Type: application/json" \
     -d '{"to": [...], "subject": "...", "body": "..."}'
   ```

### Team Lead

**Management workflow:**

1. **Review team activity**
   ```bash
   curl -X GET "http://localhost:3000/api/v1/leads/abc123.../activity" \
     -H "Authorization: Bearer dev-token"
   ```

2. **Create tasks for team members**
   ```bash
   curl -X POST http://localhost:3000/api/v1/leads/abc123.../tasks \
     -H "Authorization: Bearer dev-token" \
     -H "Content-Type: application/json" \
     -d '{"title": "...", "assigneeId": "agent-uuid", "priority": "HIGH"}'
   ```

3. **Monitor task completion**
   ```bash
   curl -X GET "http://localhost:3000/api/v1/leads/abc123.../tasks?status=COMPLETED" \
     -H "Authorization: Bearer dev-token"
   ```

4. **Export activity for reporting**
   ```bash
   curl -X GET "http://localhost:3000/api/v1/leads/abc123.../activity/export" \
     -H "Authorization: Bearer dev-token" -o report.csv
   ```

## Keyboard Shortcuts & Tips

When building a UI on top of this API, consider these UX patterns:

- **Quick note**: Ctrl+N to open note editor
- **Send email**: Ctrl+E to compose email
- **Create task**: Ctrl+T to create task
- **Search**: Ctrl+F to search notes/activity
- **Refresh**: Ctrl+R to reload timeline

## Next Steps

- Read the [API Documentation](./API.md) for complete endpoint reference
- Review [Communication Features](./COMMUNICATION_FEATURES.md) for technical details
- Check the [Architecture Documentation](./ARCHITECTURE.md) for system overview

## Feedback

Your feedback helps improve the system. If you have suggestions or encounter issues:
- Create a GitHub issue
- Contact the development team
- Review the troubleshooting guide
