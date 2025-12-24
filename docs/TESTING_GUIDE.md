# Testing the Lead Communication System

## Quick Test Suite

This guide provides curl commands to test all major features of the communication system.

### Prerequisites

1. Start the API server:
   ```bash
   cd apps/api
   npm run dev
   ```

2. API should be running at `http://localhost:3000`

### Test 1: Health Check

```bash
curl http://localhost:3000/health
```

Expected: `{"status":"ok",...}`

### Test 2: Create a Lead

```bash
curl -X POST http://localhost:3000/api/v1/leads \
  -H "Authorization: Bearer dev-token" \
  -H "Content-Type: application/json" \
  -d '{
    "source": "facebook_ads",
    "email": "test.customer@example.com",
    "phone": "+1234567890",
    "firstName": "Test",
    "lastName": "Customer",
    "city": "San Francisco",
    "state": "CA",
    "insuranceType": "AUTO"
  }'
```

Save the returned `id` for subsequent tests. Let's call it `LEAD_ID`.

### Test 3: Get Lead

```bash
curl -X GET http://localhost:3000/api/v1/leads/LEAD_ID \
  -H "Authorization: Bearer dev-token"
```

### Test 4: Add a Note

```bash
curl -X POST http://localhost:3000/api/v1/leads/LEAD_ID/notes \
  -H "Authorization: Bearer dev-token" \
  -H "Content-Type: application/json" \
  -d '{
    "content": "Initial contact made. Customer is interested in comprehensive auto coverage with low deductible.",
    "visibility": "TEAM"
  }'
```

Save the returned note `id` as `NOTE_ID`.

### Test 5: Add Another Note

```bash
curl -X POST http://localhost:3000/api/v1/leads/LEAD_ID/notes \
  -H "Authorization: Bearer dev-token" \
  -H "Content-Type: application/json" \
  -d '{
    "content": "Customer mentioned they have a clean driving record for 5+ years. Eligible for good driver discount.",
    "visibility": "TEAM"
  }'
```

### Test 6: List All Notes

```bash
curl -X GET "http://localhost:3000/api/v1/leads/LEAD_ID/notes" \
  -H "Authorization: Bearer dev-token"
```

Should return 2 notes.

### Test 7: Search Notes

```bash
curl -X GET "http://localhost:3000/api/v1/leads/LEAD_ID/notes?search=driving" \
  -H "Authorization: Bearer dev-token"
```

Should return the second note.

### Test 8: Update a Note

```bash
curl -X PUT http://localhost:3000/api/v1/leads/LEAD_ID/notes/NOTE_ID \
  -H "Authorization: Bearer dev-token" \
  -H "Content-Type: application/json" \
  -d '{
    "content": "Initial contact made. Customer is VERY interested in comprehensive auto coverage.",
    "visibility": "TEAM"
  }'
```

### Test 9: View Activity Timeline

```bash
curl -X GET "http://localhost:3000/api/v1/leads/LEAD_ID/activity" \
  -H "Authorization: Bearer dev-token"
```

Should show:
- Lead created
- Note created (x2)
- Note updated

### Test 10: Filter Activity by Type

```bash
curl -X GET "http://localhost:3000/api/v1/leads/LEAD_ID/activity?activityType=NOTE_CREATED" \
  -H "Authorization: Bearer dev-token"
```

### Test 11: Send an Email

```bash
curl -X POST http://localhost:3000/api/v1/leads/LEAD_ID/send-email \
  -H "Authorization: Bearer dev-token" \
  -H "Content-Type: application/json" \
  -d '{
    "to": ["test.customer@example.com"],
    "subject": "Your Auto Insurance Quote is Ready",
    "body": "Dear Test Customer,\n\nThank you for your interest in our auto insurance. Based on your information, we'\''ve prepared a comprehensive quote.\n\nBest regards,\nInsurance Team"
  }'
```

Save the returned email `id` as `EMAIL_ID`.

### Test 12: List Emails

```bash
curl -X GET "http://localhost:3000/api/v1/leads/LEAD_ID/emails" \
  -H "Authorization: Bearer dev-token"
```

### Test 13: Get Email Templates

```bash
curl -X GET "http://localhost:3000/api/v1/leads/LEAD_ID/emails/templates" \
  -H "Authorization: Bearer dev-token"
```

### Test 14: Create a Task

```bash
curl -X POST http://localhost:3000/api/v1/leads/LEAD_ID/tasks \
  -H "Authorization: Bearer dev-token" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Follow up on quote acceptance",
    "description": "Customer requested time to review quote. Follow up in 2 days.",
    "priority": "HIGH",
    "dueDate": "2024-12-31T15:00:00Z"
  }'
```

Save the returned task `id` as `TASK_ID`.

### Test 15: List Tasks

```bash
curl -X GET "http://localhost:3000/api/v1/leads/LEAD_ID/tasks" \
  -H "Authorization: Bearer dev-token"
```

### Test 16: Update Task Status

```bash
curl -X PUT http://localhost:3000/api/v1/leads/LEAD_ID/tasks/TASK_ID \
  -H "Authorization: Bearer dev-token" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "IN_PROGRESS"
  }'
```

### Test 17: Complete Task

```bash
curl -X PUT http://localhost:3000/api/v1/leads/LEAD_ID/tasks/TASK_ID \
  -H "Authorization: Bearer dev-token" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "COMPLETED"
  }'
```

### Test 18: View Notifications

```bash
curl -X GET "http://localhost:3000/api/v1/notifications" \
  -H "Authorization: Bearer dev-token"
```

Note: Since we didn't assign the task to anyone else, there may be no notifications.

### Test 19: Check Unread Count

```bash
curl -X GET "http://localhost:3000/api/v1/notifications/unread-count" \
  -H "Authorization: Bearer dev-token"
```

### Test 20: Export Activity Timeline

```bash
curl -X GET "http://localhost:3000/api/v1/leads/LEAD_ID/activity/export" \
  -H "Authorization: Bearer dev-token" \
  -o lead_activity.csv
```

Check the CSV file:
```bash
cat lead_activity.csv
```

### Test 21: Update Lead Status

```bash
curl -X PUT http://localhost:3000/api/v1/leads/LEAD_ID \
  -H "Authorization: Bearer dev-token" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "QUALIFIED",
    "qualityScore": 85
  }'
```

### Test 22: Final Activity Check

```bash
curl -X GET "http://localhost:3000/api/v1/leads/LEAD_ID/activity" \
  -H "Authorization: Bearer dev-token"
```

Should now show all activities including the status change.

### Test 23: Pagination Test

Create multiple notes:

```bash
for i in {1..25}; do
  curl -X POST http://localhost:3000/api/v1/leads/LEAD_ID/notes \
    -H "Authorization: Bearer dev-token" \
    -H "Content-Type: application/json" \
    -d "{\"content\": \"Test note number $i\"}"
done
```

Get first page:
```bash
curl -X GET "http://localhost:3000/api/v1/leads/LEAD_ID/notes?page=1&limit=10" \
  -H "Authorization: Bearer dev-token"
```

Get second page:
```bash
curl -X GET "http://localhost:3000/api/v1/leads/LEAD_ID/notes?page=2&limit=10" \
  -H "Authorization: Bearer dev-token"
```

### Test 24: Delete a Note

```bash
curl -X DELETE http://localhost:3000/api/v1/leads/LEAD_ID/notes/NOTE_ID \
  -H "Authorization: Bearer dev-token"
```

Verify it's gone:
```bash
curl -X GET http://localhost:3000/api/v1/leads/LEAD_ID/notes/NOTE_ID \
  -H "Authorization: Bearer dev-token"
```

Should return 404.

## Automated Test Script

Save this as `test.sh`:

```bash
#!/bin/bash

BASE_URL="http://localhost:3000"
AUTH="Authorization: Bearer dev-token"

echo "Testing Lead Communication System..."

# Create lead
echo "\n1. Creating lead..."
LEAD_RESPONSE=$(curl -s -X POST $BASE_URL/api/v1/leads \
  -H "$AUTH" \
  -H "Content-Type: application/json" \
  -d '{
    "source": "test",
    "email": "test@example.com",
    "firstName": "Test",
    "lastName": "User",
    "insuranceType": "AUTO"
  }')
LEAD_ID=$(echo $LEAD_RESPONSE | jq -r '.id')
echo "Lead ID: $LEAD_ID"

# Add note
echo "\n2. Adding note..."
NOTE_RESPONSE=$(curl -s -X POST $BASE_URL/api/v1/leads/$LEAD_ID/notes \
  -H "$AUTH" \
  -H "Content-Type: application/json" \
  -d '{"content": "Test note"}')
NOTE_ID=$(echo $NOTE_RESPONSE | jq -r '.id')
echo "Note ID: $NOTE_ID"

# Send email
echo "\n3. Sending email..."
curl -s -X POST $BASE_URL/api/v1/leads/$LEAD_ID/send-email \
  -H "$AUTH" \
  -H "Content-Type: application/json" \
  -d '{
    "to": ["test@example.com"],
    "subject": "Test",
    "body": "Test email"
  }' | jq '.status'

# Create task
echo "\n4. Creating task..."
TASK_RESPONSE=$(curl -s -X POST $BASE_URL/api/v1/leads/$LEAD_ID/tasks \
  -H "$AUTH" \
  -H "Content-Type: application/json" \
  -d '{"title": "Test task", "priority": "HIGH"}')
TASK_ID=$(echo $TASK_RESPONSE | jq -r '.id')
echo "Task ID: $TASK_ID"

# Get activity
echo "\n5. Getting activity timeline..."
curl -s -X GET "$BASE_URL/api/v1/leads/$LEAD_ID/activity" \
  -H "$AUTH" | jq '.total'

echo "\n✅ All tests completed!"
```

Run it:
```bash
chmod +x test.sh
./test.sh
```

## Expected Results

After running all tests, you should have:
- 1 lead created
- Multiple notes
- 1 email sent
- 1 task completed
- Complete activity timeline
- CSV export of activities

## Common Issues

**401 Unauthorized**: Missing or invalid auth header
**404 Not Found**: Wrong ID or entity doesn't exist
**400 Bad Request**: Invalid request body

## Performance Testing

Test pagination and filtering with large datasets:

```bash
# Create 100 notes
for i in {1..100}; do
  curl -X POST http://localhost:3000/api/v1/leads/LEAD_ID/notes \
    -H "Authorization: Bearer dev-token" \
    -H "Content-Type: application/json" \
    -d "{\"content\": \"Performance test note $i\"}" &
done
wait

# Test pagination performance
time curl -X GET "http://localhost:3000/api/v1/leads/LEAD_ID/notes?limit=100" \
  -H "Authorization: Bearer dev-token"
```

## Integration Testing

Test the complete workflow:

1. Create lead
2. Add initial note
3. Send welcome email
4. Create follow-up task
5. Update lead status
6. Complete task
7. Export activity
8. Verify timeline

This simulates a real user journey through the system.
