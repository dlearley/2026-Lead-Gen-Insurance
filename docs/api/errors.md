# API Errors

This page describes the standard error format returned by the API and how to respond to common error types.

For the full reference and examples, see [API Overview](./overview.md#errors).

## Error Response Format
Errors are returned as JSON with a stable `error` code and a human-readable `message`.

```json
{
  "error": "validation_error",
  "message": "Email is required",
  "details": {
    "field": "email"
  },
  "request_id": "req_1234567890"
}
```

## Common Status Codes
- **400**: Bad request (malformed input)
- **401**: Unauthorized (missing/invalid auth)
- **403**: Forbidden (insufficient permissions)
- **404**: Not found
- **409**: Conflict (duplicate / state conflict)
- **422**: Validation error
- **429**: Rate limit exceeded
- **500/503**: Server error / service unavailable

## Recommended Client Handling
- Treat `error` as stable for program logic; display `message` to humans
- Log `request_id` for support escalation
- Retry only when safe:
  - Use retries for 429/503 with exponential backoff
  - Avoid retrying on 4xx validation errors
