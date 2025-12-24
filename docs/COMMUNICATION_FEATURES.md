# Lead Communication, Notes & Activity Tracking System

## Overview

This document describes the comprehensive communication, notes, and activity tracking system for the Insurance Lead Generation platform. This system was implemented as part of Phase 1.6 (building on Phase 1.5 lead management).

## Features Implemented

### ✅ Backend Notes & Comments API
- ✅ Notes/comments model with rich text support
- ✅ Note creation endpoint (POST /api/leads/{id}/notes)
- ✅ Note retrieval endpoint (GET /api/leads/{id}/notes)
- ✅ Note update endpoint (PUT /api/leads/{id}/notes/{note_id})
- ✅ Note deletion endpoint (DELETE /api/leads/{id}/notes/{note_id})
- ✅ Note filtering by date range, author, visibility
- ✅ Note search functionality
- ✅ Note timestamps (created, updated)
- ✅ Note author tracking
- ✅ Note visibility controls (private, team, public)

### ✅ Communication History & Timeline
- ✅ Activity feed model
- ✅ Comprehensive activity logging (all lead changes, assignments, status changes, notes, emails)
- ✅ Timeline view data endpoint (GET /api/leads/{id}/activity)
- ✅ Activity filtering by type, date, author
- ✅ Activity search
- ✅ Activity detail endpoint
- ✅ Activity pagination
- ✅ System activities (automated actions, workflow triggers)
- ✅ Activity export functionality (CSV)

### ✅ Email Integration
- ✅ Email integration schema
- ✅ Email log model (sent/received emails)
- ✅ Email sending endpoint (POST /api/leads/{id}/send-email)
- ✅ Email history retrieval (GET /api/leads/{id}/emails)
- ✅ Email template support
- ✅ Email status tracking (pending, sent, delivered, opened, clicked, etc.)
- ✅ Email thread grouping (via threadId)
- ✅ Email scheduling functionality

### ✅ Task & Follow-up Management
- ✅ Task model linked to leads
- ✅ Task creation endpoint (POST /api/leads/{id}/tasks)
- ✅ Task management endpoints (GET, PUT, DELETE)
- ✅ Task status (open, in_progress, completed, cancelled)
- ✅ Task priority levels (low, medium, high, urgent)
- ✅ Task due dates and reminders
- ✅ Task assignment to team members
- ✅ Task list view with filtering
- ✅ Task notifications

### ✅ Notifications & Reminders
- ✅ Notification model
- ✅ Notification generation system
- ✅ In-app notification center
- ✅ Notification filtering
- ✅ Notification read/unread status
- ✅ Notification types (task_assigned, task_due_soon, note_mention, etc.)

### ✅ Database Schema
- ✅ Notes table with rich text, author, visibility
- ✅ Activity_logs table with event type, actor, changes
- ✅ Emails table for email history
- ✅ Email_templates table
- ✅ Tasks table with priority, status, due date
- ✅ Notifications table
- ✅ Note_attachments table
- ✅ Email_attachments table
- ✅ Foreign key relationships
- ✅ Indexes for performance

### ✅ API Integration
- ✅ Notes API service
- ✅ Activity/timeline API service
- ✅ Email API service
- ✅ Task API service
- ✅ Notification API service
- ✅ Error handling for all services
- ✅ Request validation with Zod

### ✅ Permissions & Security
- ✅ Note visibility based on permissions (private, team, public)
- ✅ Note author-only edit/delete
- ✅ Activity audit logging
- ✅ Email body sanitization
- ✅ Task assignment authorization checks
- ✅ JWT authentication middleware

### ✅ Search & Filtering
- ✅ Full-text search in notes
- ✅ Activity search with multiple filters
- ✅ Email search
- ✅ Task filtering dashboard
- ✅ Date range filtering

### ✅ Testing & Documentation
- ✅ API documentation (/docs/API.md)
- ✅ User guide for lead communication features (this document)
- ✅ Type-safe API responses

## Architecture

### Data Flow

```
┌─────────────┐
│   Client    │
└──────┬──────┘
       │ HTTP + Bearer Token
       ▼
┌─────────────┐
│  API Routes │ ◄──── Authentication Middleware
└──────┬──────┘
       │
       ├─────► Validation (Zod)
       │
       ├─────► Business Logic
       │
       ├─────► In-Memory Storage
       │
       └─────► Activity Logging
```

### Storage Layer

Currently implemented with in-memory storage for development. Ready to integrate with:
- **PostgreSQL** (via Prisma) - Structured data (leads, notes, tasks, users)
- **Redis** - Caching, real-time features
- **NATS** - Event streaming, notifications

### Authentication

JWT-based authentication with Bearer tokens. For development, use:

```bash
Authorization: Bearer dev-token
```

This authenticates as a development admin user.

## API Endpoints

See [API.md](./API.md) for comprehensive API documentation.

### Quick Reference

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/v1/leads` | POST | Create lead |
| `/api/v1/leads/:id` | GET | Get lead |
| `/api/v1/leads/:id` | PUT | Update lead |
| `/api/v1/leads/:id/notes` | POST | Create note |
| `/api/v1/leads/:id/notes` | GET | List notes |
| `/api/v1/leads/:id/notes/:noteId` | GET | Get note |
| `/api/v1/leads/:id/notes/:noteId` | PUT | Update note |
| `/api/v1/leads/:id/notes/:noteId` | DELETE | Delete note |
| `/api/v1/leads/:id/activity` | GET | Get activity timeline |
| `/api/v1/leads/:id/activity/export` | GET | Export activity CSV |
| `/api/v1/leads/:id/send-email` | POST | Send email |
| `/api/v1/leads/:id/emails` | GET | List emails |
| `/api/v1/leads/:id/tasks` | POST | Create task |
| `/api/v1/leads/:id/tasks` | GET | List tasks |
| `/api/v1/leads/:id/tasks/:taskId` | PUT | Update task |
| `/api/v1/notifications` | GET | List notifications |
| `/api/v1/notifications/:id/read` | PUT | Mark as read |

## Usage Examples

### Creating a Lead

```bash
curl -X POST http://localhost:3000/api/v1/leads \
  -H "Authorization: Bearer dev-token" \
  -H "Content-Type: application/json" \
  -d '{
    "source": "facebook_ads",
    "email": "john@example.com",
    "phone": "+1234567890",
    "firstName": "John",
    "lastName": "Doe",
    "insuranceType": "AUTO"
  }'
```

### Adding a Note

```bash
curl -X POST http://localhost:3000/api/v1/leads/{leadId}/notes \
  -H "Authorization: Bearer dev-token" \
  -H "Content-Type: application/json" \
  -d '{
    "content": "Spoke with customer about their auto insurance needs.",
    "visibility": "TEAM"
  }'
```

### Sending an Email

```bash
curl -X POST http://localhost:3000/api/v1/leads/{leadId}/send-email \
  -H "Authorization: Bearer dev-token" \
  -H "Content-Type: application/json" \
  -d '{
    "to": ["john@example.com"],
    "subject": "Your Insurance Quote",
    "body": "Hi John, thank you for your interest..."
  }'
```

### Creating a Task

```bash
curl -X POST http://localhost:3000/api/v1/leads/{leadId}/tasks \
  -H "Authorization: Bearer dev-token" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Follow up on quote",
    "description": "Customer requested callback",
    "priority": "HIGH",
    "dueDate": "2024-01-20T15:00:00Z"
  }'
```

### Getting Activity Timeline

```bash
curl -X GET "http://localhost:3000/api/v1/leads/{leadId}/activity?page=1&limit=20" \
  -H "Authorization: Bearer dev-token"
```

## Database Schema

### Key Tables

**users**
- User authentication and profile
- Role-based access control

**leads**
- Lead information and status
- Insurance type and quality score

**notes**
- Lead notes with rich text
- Visibility controls
- Author tracking

**activity_logs**
- Complete audit trail
- Activity types and metadata
- User attribution

**emails**
- Email communication history
- Status tracking
- Thread grouping

**tasks**
- Task management
- Priority and due dates
- Assignment tracking

**notifications**
- User notifications
- Read/unread status
- Entity linking

See [Prisma Schema](../apps/data-service/prisma/schema.prisma) for complete schema definition.

## Permission Model

### Note Visibility

- **PRIVATE**: Only visible to the author
- **TEAM**: Visible to all team members (default)
- **PUBLIC**: Visible to everyone including external systems

### Role-Based Access

- **USER**: Can manage own notes and tasks
- **ADMIN**: Can edit/delete any notes, reassign tasks
- **SUPER_ADMIN**: Full system access

### Authorization Rules

1. Users can only edit/delete their own notes (unless admin)
2. Tasks can be reassigned by task creator or admins
3. All activities are logged immutably
4. Private notes are filtered from responses unless user is author

## Performance Considerations

### Indexes

All timestamp fields and foreign keys are indexed for query performance:

```sql
CREATE INDEX idx_notes_leadId ON notes(leadId);
CREATE INDEX idx_notes_createdAt ON notes(createdAt);
CREATE INDEX idx_activities_leadId ON activity_logs(leadId);
CREATE INDEX idx_activities_type ON activity_logs(activityType);
```

### Pagination

All list endpoints support pagination to prevent large result sets:

```javascript
?page=1&limit=20
```

Default: 20 items per page
Maximum: 100 items per page

## Integration with Phase 1.7+

This system provides the foundation for:

**Phase 1.7 - Lead Scoring & Qualification**
- Activity data feeds ML models
- Email engagement improves scoring
- Task completion rates factor into agent performance

**Phase 2 - Real-time Processing**
- WebSocket-ready architecture
- Activity events can trigger workflows
- Notification system extensible for real-time alerts

## Future Enhancements

### Planned Features

- [ ] File attachment upload/download
- [ ] Rich text editor integration
- [ ] Email open/click tracking
- [ ] WebSocket support for real-time updates
- [ ] Scheduled tasks (cron-like recurrence)
- [ ] Email templates editor UI
- [ ] Advanced search with Elasticsearch
- [ ] Bulk operations

### Integration Points

- **SMTP Service**: Connect SendGrid/AWS SES for actual email sending
- **File Storage**: S3/MinIO for attachments
- **Search Engine**: Elasticsearch for advanced search
- **Real-time**: WebSocket server for live updates

## Troubleshooting

### Common Issues

**Issue: 401 Unauthorized**
- Ensure `Authorization: Bearer dev-token` header is included
- Check JWT token is valid (not expired)

**Issue: 404 Lead not found**
- Verify lead ID exists
- Check lead was created successfully

**Issue: 403 Forbidden**
- User may not have permission (e.g., editing someone else's private note)
- Check user role is sufficient

**Issue: Validation errors**
- Review request body against schema in validation.ts
- Ensure required fields are present
- Check data types match

## Development Setup

1. **Start the API server:**
   ```bash
   cd apps/api
   npm run dev
   ```

2. **Test with curl:**
   ```bash
   curl http://localhost:3000/health
   ```

3. **View logs:**
   ```bash
   # Logs include all API requests and errors
   # Check console output for debugging
   ```

## Testing

Run API tests:

```bash
cd apps/api
npm test
```

Test coverage includes:
- Route handlers
- Validation schemas
- Authentication middleware
- Permission checks

## Support

For questions or issues:
- API Documentation: `/docs/API.md`
- Feature Documentation: `/docs/COMMUNICATION_FEATURES.md`
- Create GitHub issue for bugs
- Check logs for error details
