# Phase 8.6: Insurance Carrier & Broker Integrations - Quick Start

## Overview

Phase 8.6 enables seamless integration with external insurance carriers and broker management systems for lead submission, quote requests, and status tracking.

## Quick Start

### 1. Database Migration

Apply the new database schema:

```bash
# Generate Prisma client
pnpm db:generate

# Push schema to database (development)
pnpm db:push

# Or create and run migration (production)
pnpm db:migrate
```

### 2. Create Your First Carrier

```bash
curl -X POST http://localhost:3000/api/v1/carriers \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Example Insurance",
    "code": "EXAMPLE",
    "website": "https://example-insurance.com",
    "contactEmail": "api@example-insurance.com",
    "supportedProducts": ["AUTO", "HOME", "LIFE"],
    "apiEndpoint": "https://api.example-insurance.com/v1",
    "integrationType": "REST_API",
    "apiKey": "your-api-key-here",
    "isActive": true,
    "priority": 1,
    "rateLimit": 100,
    "rateLimitWindow": 60
  }'
```

### 3. Test the Integration

```bash
curl -X POST http://localhost:3000/api/v1/carriers/{carrier-id}/test
```

### 4. Submit a Lead

```bash
curl -X POST http://localhost:3000/api/v1/carriers/{carrier-id}/leads \
  -H "Content-Type: application/json" \
  -d '{
    "leadId": "lead-uuid-here",
    "submissionData": {
      "firstName": "John",
      "lastName": "Doe",
      "email": "john.doe@example.com",
      "phone": "+1-555-0123",
      "insuranceType": "AUTO",
      "coverageAmount": 50000
    },
    "priority": "high"
  }'
```

### 5. Check Integration Health

```bash
curl http://localhost:3000/api/v1/carriers/{carrier-id}/health
```

### 6. View Integration Logs

```bash
curl "http://localhost:3000/api/v1/integration-logs?carrierId={carrier-id}&limit=20"
```

## API Endpoints

### Carriers

| Method | Endpoint | Description |
|---------|-----------|-------------|
| GET | `/api/v1/carriers` | List carriers |
| GET | `/api/v1/carriers/:id` | Get carrier details |
| POST | `/api/v1/carriers` | Create carrier |
| PUT | `/api/v1/carriers/:id` | Update carrier |
| DELETE | `/api/v1/carriers/:id` | Delete carrier |
| POST | `/api/v1/carriers/:id/test` | Test integration |
| GET | `/api/v1/carriers/:id/health` | Get health status |
| POST | `/api/v1/carriers/:id/leads` | Submit lead |

### Brokers

| Method | Endpoint | Description |
|---------|-----------|-------------|
| GET | `/api/v1/brokers` | List brokers |
| GET | `/api/v1/brokers/:id` | Get broker details |
| POST | `/api/v1/brokers` | Create broker |
| PUT | `/api/v1/brokers/:id` | Update broker |
| DELETE | `/api/v1/brokers/:id` | Delete broker |
| POST | `/api/v1/brokers/:id/test` | Test integration |
| GET | `/api/v1/brokers/:id/health` | Get health status |
| POST | `/api/v1/brokers/:id/leads` | Submit lead |

### Integration Configs

| Method | Endpoint | Description |
|---------|-----------|-------------|
| GET | `/api/v1/integration-configs` | List configs |
| GET | `/api/v1/integration-configs/:id` | Get config |
| POST | `/api/v1/integration-configs` | Create config |
| PUT | `/api/v1/integration-configs/:id` | Update config |
| DELETE | `/api/v1/integration-configs/:id` | Delete config |
| GET | `/api/v1/integration-configs/template/:type` | Get template |
| POST | `/api/v1/integration-configs/:id/enable` | Enable config |
| POST | `/api/v1/integration-configs/:id/disable` | Disable config |

### Integration Logs

| Method | Endpoint | Description |
|---------|-----------|-------------|
| GET | `/api/v1/integration-logs` | List logs |
| GET | `/api/v1/integration-logs/:id` | Get log details |
| DELETE | `/api/v1/integration-logs` | Delete logs |
| GET | `/api/v1/integration-logs/stats/summary` | Get statistics |

## Key Features

### 1. Generic API Client

Automatic retry logic with exponential backoff, rate limit handling, and comprehensive error management.

### 2. Health Monitoring

Track success rates, response times, and consecutive failures for all integrations.

### 3. Configuration Management

Flexible configuration system with templates for API endpoints, mapping rules, validation rules, etc.

### 4. Comprehensive Logging

Full audit trail of all integration activities with request/response logging and performance metrics.

### 5. Rate Limiting

Configurable rate limits per carrier/broker with automatic compliance.

## Health Status

- **Healthy**: Success rate ≥ 95%, no consecutive failures
- **Degraded**: Success rate ≥ 80%, < 5 consecutive failures
- **Unhealthy**: Below degraded thresholds

## Common Operations

### Create a Broker

```bash
curl -X POST http://localhost:3000/api/v1/brokers \
  -H "Content-Type: application/json" \
  -d '{
    "name": "ABC Brokerage",
    "code": "ABC-BROKER",
    "carrierId": "carrier-id",
    "licenseNumber": "LIC-12345",
    "ein": "12-3456789",
    "apiKey": "broker-api-key",
    "isActive": true
  }'
```

### Create Integration Config

```bash
curl -X POST http://localhost:3000/api/v1/integration-configs \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Carrier API Endpoints",
    "description": "API endpoint configuration",
    "carrierId": "carrier-id",
    "configType": "API_ENDPOINTS",
    "config": {
      "endpoints": [
        {
          "name": "submit_lead",
          "method": "POST",
          "path": "/leads",
          "timeout": 30000
        }
      ]
    }
  }'
```

### Get Statistics

```bash
curl "http://localhost:3000/api/v1/integration-logs/stats/summary?entityType=INSURANCE_CARRIER&dateFrom=2024-01-01"
```

## Filtering and Pagination

Most list endpoints support filtering and pagination:

```bash
# Filter by carrier
curl "http://localhost:3000/api/v1/integration-logs?carrierId={carrier-id}"

# Filter by success status
curl "http://localhost:3000/api/v1/integration-logs?success=false"

# Filter by date range
curl "http://localhost:3000/api/v1/integration-logs?dateFrom=2024-01-01&dateTo=2024-12-31"

# Paginate results
curl "http://localhost:3000/api/v1/carriers?page=1&limit=20"

# Sort results
curl "http://localhost:3000/api/v1/carriers?sortBy=priority&sortOrder=desc"
```

## Error Handling

### Integration Exception

All integration errors follow a standard format:

```json
{
  "error": "API request failed: Rate limit exceeded",
  "code": "RATE_LIMIT_EXCEEDED",
  "details": {
    "attempts": 3,
    "duration": 5000
  }
}
```

### Error Codes

- `API_REQUEST_FAILED`: Generic API request failure
- `BAD_REQUEST`: HTTP 400 error
- `UNAUTHORIZED`: HTTP 401 error
- `FORBIDDEN`: HTTP 403 error
- `NOT_FOUND`: HTTP 404 error
- `RATE_LIMIT_EXCEEDED`: HTTP 429 error
- `INTERNAL_SERVER_ERROR`: HTTP 500 error

## Troubleshooting

### Lead Submission Fails

1. Check carrier health status
2. Verify API credentials
3. Review integration logs for errors
4. Check rate limit settings
5. Validate submission data format

### Health Status Degraded

1. Review recent integration logs
2. Check for rate limit violations
3. Verify API endpoint availability
4. Check authentication credentials

### Integration Tests Fail

1. Verify network connectivity to carrier API
2. Check API credentials are correct
3. Confirm API endpoint is accessible
4. Review error messages in test response

## Next Steps

1. **Configure Production Carriers**: Add real carrier credentials
2. **Set Up Mappings**: Create field mapping configurations
3. **Implement Webhooks**: Set up inbound webhook handling (future)
4. **Monitor Health**: Set up alerts for integration failures
5. **Optimize Performance**: Tune rate limits and retry settings

## Documentation

For detailed documentation, see:
- [Phase 8.6 Implementation Guide](./PHASE_8.6_IMPLEMENTATION.md)
- [API Endpoints](../README.md#api-endpoints)
- [Database Schema](../apps/backend/docs/DATABASE_SCHEMA.md)

## Support

For issues or questions:
1. Check the implementation guide
2. Review integration logs
3. Test with `/test` endpoint
4. Check carrier/broker API documentation
