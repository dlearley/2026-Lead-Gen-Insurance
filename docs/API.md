# Lead Communication & Activity Tracking API Documentation

## Overview

This document describes the REST API endpoints for the Insurance Lead Generation platform's communication, notes, and activity tracking system.

## Base URL

```
http://localhost:3000/api/v1
```

## Authentication

All endpoints require authentication via Bearer token:

```
Authorization: Bearer <token>
```

For development, use `Bearer dev-token` to authenticate as a development admin user.

## Table of Contents

- [Leads](#leads)
- [Notes](#notes)
- [Activity Timeline](#activity-timeline)
- [Email Communication](#email-communication)
- [Tasks](#tasks)
- [Notifications](#notifications)

---

## Leads

### Create Lead

Create a new lead in the system.

**Endpoint:** `POST /leads`

**Request Body:**
```json
{
  "source": "facebook_ads",
  "email": "john@example.com",
  "phone": "+1234567890",
  "firstName": "John",
  "lastName": "Doe",
  "street": "123 Main St",
  "city": "San Francisco",
  "state": "CA",
  "zipCode": "94102",
  "country": "USA",
  "insuranceType": "AUTO",
  "metadata": {
    "campaign": "spring_2024"
  }
}
```

**Response:** `201 Created`
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "source": "facebook_ads",
  "email": "john@example.com",
  "status": "received",
  "createdAt": "2024-01-15T10:30:00Z",
  "updatedAt": "2024-01-15T10:30:00Z"
}
```

### Get Lead

**Endpoint:** `GET /leads/:leadId`

**Response:** `200 OK`
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "source": "facebook_ads",
  "email": "john@example.com",
  "status": "processing",
  ...
}
```

### Update Lead

**Endpoint:** `PUT /leads/:leadId`

**Request Body:**
```json
{
  "status": "QUALIFIED",
  "qualityScore": 85,
  "insuranceType": "HOME"
}
```

**Response:** `200 OK`

---

## Notes

### Create Note

Add a note to a lead.

**Endpoint:** `POST /leads/:leadId/notes`

**Request Body:**
```json
{
  "content": "Spoke with customer about their auto insurance needs. They're interested in comprehensive coverage.",
  "visibility": "TEAM"
}
```

**Field Descriptions:**
- `content` (required): Note content (1-50000 characters)
- `visibility` (optional): `PRIVATE`, `TEAM`, or `PUBLIC`. Default: `TEAM`

**Response:** `201 Created`
```json
{
  "id": "note-uuid",
  "leadId": "550e8400-e29b-41d4-a716-446655440000",
  "authorId": "user-uuid",
  "content": "Spoke with customer...",
  "visibility": "team",
  "createdAt": "2024-01-15T10:35:00Z",
  "updatedAt": "2024-01-15T10:35:00Z",
  "author": {
    "id": "user-uuid",
    "email": "dev@example.com",
    "firstName": "Dev",
    "lastName": "Admin"
  }
}
```

### List Notes

Get all notes for a lead with optional filtering and pagination.

**Endpoint:** `GET /leads/:leadId/notes`

**Query Parameters:**
- `authorId` (optional): Filter by author UUID
- `visibility` (optional): Filter by visibility (`PRIVATE`, `TEAM`, `PUBLIC`)
- `dateFrom` (optional): ISO 8601 datetime
- `dateTo` (optional): ISO 8601 datetime
- `search` (optional): Search in note content
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 20, max: 100)

**Response:** `200 OK`
```json
{
  "data": [
    {
      "id": "note-uuid",
      "leadId": "550e8400-e29b-41d4-a716-446655440000",
      "content": "...",
      "visibility": "team",
      "createdAt": "2024-01-15T10:35:00Z",
      "author": { ... }
    }
  ],
  "page": 1,
  "limit": 20,
  "total": 45,
  "totalPages": 3
}
```

### Get Note

**Endpoint:** `GET /leads/:leadId/notes/:noteId`

**Response:** `200 OK`

### Update Note

Only the author or admins can update notes.

**Endpoint:** `PUT /leads/:leadId/notes/:noteId`

**Request Body:**
```json
{
  "content": "Updated note content",
  "visibility": "PUBLIC"
}
```

**Response:** `200 OK`

### Delete Note

Only the author or admins can delete notes.

**Endpoint:** `DELETE /leads/:leadId/notes/:noteId`

**Response:** `204 No Content`

---

## Activity Timeline

### Get Activity Log

Retrieve the complete activity timeline for a lead.

**Endpoint:** `GET /leads/:leadId/activity`

**Query Parameters:**
- `userId` (optional): Filter by user UUID
- `activityType` (optional): Filter by type (see below)
- `dateFrom` (optional): ISO 8601 datetime
- `dateTo` (optional): ISO 8601 datetime
- `search` (optional): Search in activity data
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 20, max: 100)

**Activity Types:**
- `LEAD_CREATED`
- `LEAD_UPDATED`
- `STATUS_CHANGED`
- `NOTE_CREATED`
- `NOTE_UPDATED`
- `NOTE_DELETED`
- `EMAIL_SENT`
- `EMAIL_RECEIVED`
- `TASK_CREATED`
- `TASK_UPDATED`
- `TASK_COMPLETED`
- `SYSTEM_ACTION`
- `WORKFLOW_TRIGGERED`

**Response:** `200 OK`
```json
{
  "data": [
    {
      "id": "activity-uuid",
      "leadId": "550e8400-e29b-41d4-a716-446655440000",
      "userId": "user-uuid",
      "activityType": "note_created",
      "action": "Created note",
      "description": "Note created by dev@example.com",
      "metadata": { "noteId": "note-uuid" },
      "createdAt": "2024-01-15T10:35:00Z",
      "user": { ... }
    }
  ],
  "page": 1,
  "limit": 20,
  "total": 128,
  "totalPages": 7
}
```

### Export Activity Log

Export activity log as CSV.

**Endpoint:** `GET /leads/:leadId/activity/export`

**Response:** `200 OK`
```
Content-Type: text/csv
Content-Disposition: attachment; filename="lead_550e8400-e29b-41d4-a716-446655440000_activity.csv"

id,createdAt,activityType,action,description,userId
...
```

### Get Activity Detail

**Endpoint:** `GET /leads/:leadId/activity/:activityId`

**Response:** `200 OK`

---

## Email Communication

### Send Email

Send an email to a lead.

**Endpoint:** `POST /leads/:leadId/emails/send`

**Request Body:**
```json
{
  "to": ["john@example.com"],
  "cc": ["manager@example.com"],
  "bcc": [],
  "subject": "Your Insurance Quote",
  "body": "Hi John,\n\nThank you for your interest...",
  "bodyHtml": "<p>Hi John,</p><p>Thank you...</p>",
  "templateId": "template-uuid",
  "scheduledFor": "2024-01-16T09:00:00Z"
}
```

**Field Descriptions:**
- `to` (required): Array of recipient emails
- `cc` (optional): CC recipients
- `bcc` (optional): BCC recipients
- `subject` (required): Email subject (1-500 characters)
- `body` (required): Plain text body
- `bodyHtml` (optional): HTML version of body
- `templateId` (optional): UUID of email template to use
- `scheduledFor` (optional): Schedule for future sending

**Response:** `201 Created`
```json
{
  "id": "email-uuid",
  "leadId": "550e8400-e29b-41d4-a716-446655440000",
  "senderId": "user-uuid",
  "to": ["john@example.com"],
  "subject": "Your Insurance Quote",
  "status": "sent",
  "sentAt": "2024-01-15T10:40:00Z",
  "createdAt": "2024-01-15T10:40:00Z"
}
```

**Email Statuses:**
- `pending`: Queued for sending
- `scheduled`: Scheduled for future sending
- `sent`: Successfully sent
- `delivered`: Confirmed delivered
- `opened`: Recipient opened email
- `clicked`: Recipient clicked link
- `failed`: Failed to send
- `bounced`: Email bounced

### List Emails

**Endpoint:** `GET /leads/:leadId/emails`

**Query Parameters:**
- `senderId` (optional): Filter by sender UUID
- `threadId` (optional): Filter by thread UUID
- `status` (optional): Filter by status
- `dateFrom` / `dateTo` (optional)
- `search` (optional): Search in subject/body
- `page` / `limit` (optional)

**Response:** `200 OK`

### Get Email

**Endpoint:** `GET /leads/:leadId/emails/:emailId`

**Response:** `200 OK`

### Get Email Templates

**Endpoint:** `GET /leads/:leadId/emails/templates`

**Response:** `200 OK`
```json
{
  "data": [
    {
      "id": "template-uuid",
      "name": "Default Follow-up",
      "subject": "Following up on your insurance inquiry",
      "body": "Hi {{firstName}},\n\nThanks for reaching out...",
      "variables": ["firstName", "agentName"],
      "isActive": true
    }
  ]
}
```

---

## Tasks

### Create Task

Create a task/follow-up for a lead.

**Endpoint:** `POST /leads/:leadId/tasks`

**Request Body:**
```json
{
  "title": "Follow up on quote",
  "description": "Customer requested callback to discuss coverage options",
  "assigneeId": "user-uuid",
  "priority": "HIGH",
  "dueDate": "2024-01-20T15:00:00Z",
  "recurrence": "weekly"
}
```

**Field Descriptions:**
- `title` (required): Task title (1-500 characters)
- `description` (optional): Task description (max 5000 characters)
- `assigneeId` (optional): UUID of user to assign task to
- `priority` (optional): `LOW`, `MEDIUM`, `HIGH`, `URGENT` (default: `MEDIUM`)
- `dueDate` (optional): ISO 8601 datetime
- `recurrence` (optional): Recurrence pattern (e.g., "daily", "weekly", "monthly")

**Response:** `201 Created`
```json
{
  "id": "task-uuid",
  "leadId": "550e8400-e29b-41d4-a716-446655440000",
  "creatorId": "user-uuid",
  "assigneeId": "user-uuid",
  "title": "Follow up on quote",
  "status": "open",
  "priority": "high",
  "dueDate": "2024-01-20T15:00:00Z",
  "createdAt": "2024-01-15T10:45:00Z"
}
```

**Task Statuses:**
- `open`: Not started
- `in_progress`: In progress
- `completed`: Completed
- `cancelled`: Cancelled

### List Tasks

**Endpoint:** `GET /leads/:leadId/tasks`

**Query Parameters:**
- `creatorId` / `assigneeId` (optional)
- `status` / `priority` (optional)
- `dueDateFrom` / `dueDateTo` (optional)
- `search` (optional)
- `page` / `limit` (optional)

**Response:** `200 OK`

### Get Task

**Endpoint:** `GET /leads/:leadId/tasks/:taskId`

**Response:** `200 OK`

### Update Task

**Endpoint:** `PUT /leads/:leadId/tasks/:taskId`

**Request Body:**
```json
{
  "status": "COMPLETED",
  "description": "Called customer, they'll think about it"
}
```

**Response:** `200 OK`

### Delete Task

**Endpoint:** `DELETE /leads/:leadId/tasks/:taskId`

**Response:** `204 No Content`

---

## Notifications

### List Notifications

Get notifications for the authenticated user.

**Endpoint:** `GET /notifications`

**Query Parameters:**
- `type` (optional): Notification type
- `isRead` (optional): `true` or `false`
- `dateFrom` / `dateTo` (optional)
- `page` / `limit` (optional)

**Notification Types:**
- `TASK_ASSIGNED`
- `TASK_DUE_SOON`
- `TASK_OVERDUE`
- `NOTE_MENTION`
- `EMAIL_RECEIVED`
- `LEAD_ASSIGNED`
- `LEAD_UPDATED`
- `SYSTEM_ALERT`

**Response:** `200 OK`
```json
{
  "data": [
    {
      "id": "notification-uuid",
      "userId": "user-uuid",
      "type": "task_assigned",
      "title": "Task assigned",
      "message": "You were assigned a task: Follow up on quote",
      "entityType": "task",
      "entityId": "task-uuid",
      "isRead": false,
      "createdAt": "2024-01-15T10:45:00Z"
    }
  ],
  "page": 1,
  "limit": 20,
  "total": 5,
  "totalPages": 1
}
```

### Get Unread Count

**Endpoint:** `GET /notifications/unread-count`

**Response:** `200 OK`
```json
{
  "count": 5
}
```

### Mark as Read

**Endpoint:** `PUT /notifications/:notificationId/read`

**Response:** `200 OK`

### Mark All as Read

**Endpoint:** `PUT /notifications/mark-all-read`

**Response:** `200 OK`
```json
{
  "message": "All notifications marked as read"
}
```

### Delete Notification

**Endpoint:** `DELETE /notifications/:notificationId`

**Response:** `204 No Content`

---

## Error Responses

All endpoints may return the following error responses:

### 400 Bad Request
```json
{
  "error": "Validation error",
  "details": [
    {
      "path": ["content"],
      "message": "Content is required"
    }
  ]
}
```

### 401 Unauthorized
```json
{
  "error": "Unauthorized - No token provided"
}
```

### 403 Forbidden
```json
{
  "error": "Forbidden - Can only edit your own notes"
}
```

### 404 Not Found
```json
{
  "error": "Lead not found"
}
```

### 500 Internal Server Error
```json
{
  "error": "Internal server error"
}
```

---

## Pagination

All list endpoints support pagination with the following query parameters:

- `page`: Page number (default: 1)
- `limit`: Items per page (default: 20, max: 100)

Paginated responses include:

```json
{
  "data": [...],
  "page": 1,
  "limit": 20,
  "total": 150,
  "totalPages": 8
}
```

---

## Rate Limiting

API requests are rate-limited to prevent abuse. Rate limiting headers:

```
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 1610723400
```

---

## Versioning

The API is versioned via URL path (`/api/v1/`). When breaking changes are needed, a new version will be released.

---

## Support

For API support and questions:
- Documentation: `/docs/API.md`
- Issues: Create GitHub issue
