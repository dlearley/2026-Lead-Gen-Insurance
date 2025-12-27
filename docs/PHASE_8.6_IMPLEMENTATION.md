# Phase 8.6: Insurance Carrier & Broker Integrations - Implementation Documentation

## Overview

Phase 8.6 implements comprehensive integration capabilities for connecting the Insurance Lead Generation platform with external insurance carriers and broker management systems. This implementation enables seamless lead submission, quote requests, and status tracking through RESTful APIs.

## Implementation Date

December 27, 2024

## Objectives

1. **Carrier Integration Management**: Complete CRUD operations for insurance carriers
2. **Broker Integration Management**: Manage broker relationships and configurations
3. **API Client Infrastructure**: Generic HTTP client with retry logic and rate limiting
4. **Lead Submission**: Submit leads to carriers and brokers
5. **Quote Requests**: Request insurance quotes from multiple carriers
6. **Integration Health Monitoring**: Track integration health and performance
7. **Configuration Management**: Flexible configuration system for integrations
8. **Comprehensive Logging**: Detailed logging of all integration activities

## Architecture

### Data Models

#### InsuranceCarrier
- **Purpose**: Stores insurance carrier information and API credentials
- **Key Fields**:
  - `code` (unique): Carrier identifier code
  - `name`: Carrier display name
  - `apiEndpoint`: Base URL for carrier API
  - `supportedProducts`: Array of insurance types supported
  - `integrationType`: REST_API, SOAP_API, WEBHOOK, etc.
  - `apiKey`, `apiSecret`: Authentication credentials
  - `isActive`, `isPrimary`: Status flags
  - `rateLimit`, `rateLimitWindow`: Rate limiting configuration

#### Broker
- **Purpose**: Manages broker relationships and their carrier associations
- **Key Fields**:
  - `code` (unique): Broker identifier code
  - `name`: Broker display name
  - `carrierId`: Associated insurance carrier
  - `licenseNumber`, `ein`: Business identifiers
  - `integrationType`: Type of integration
  - `apiKey`, `apiSecret`: Broker API credentials

#### IntegrationConfig
- **Purpose**: Stores integration-specific configurations
- **Key Fields**:
  - `configType`: API_ENDPOINTS, MAPPING_RULES, VALIDATION_RULES, etc.
  - `config`: JSON configuration data
  - `isActive`, `isEnabled`: Status flags
  - Association with carrier or broker

#### IntegrationLog
- **Purpose**: Comprehensive audit trail of all integration activities
- **Key Fields**:
  - `entityType`, `entityId`: What entity was involved
  - `action`: LEAD_SUBMITTED, QUOTE_REQUESTED, etc.
  - `direction`: INBOUND or OUTBOUND
  - `success`: Boolean success indicator
  - `duration`: Request duration in milliseconds
  - `requestData`, `responseData`: Full request/response logging

### Service Layer

#### ApiClientService
- **Location**: `apps/data-service/src/services/api-client.service.ts`
- **Responsibilities**:
  - Generic HTTP request handling (GET, POST, PUT, PATCH, DELETE)
  - Automatic retry logic with exponential backoff
  - Rate limit detection and handling
  - Error handling and logging
  - Request/response sanitization for security

#### CarrierIntegrationService
- **Location**: `apps/data-service/src/services/carrier-integration.service.ts`
- **Responsibilities**:
  - CRUD operations for insurance carriers
  - Lead submission to carrier APIs
  - Quote requests from multiple carriers
  - Integration health monitoring
  - Authentication header management
  - Integration log creation

#### BrokerIntegrationService
- **Location**: `apps/data-service/src/services/broker-integration.service.ts`
- **Responsibilities**:
  - CRUD operations for brokers
  - Lead submission to broker APIs
  - Broker integration testing
  - Health monitoring for brokers
  - Association with carrier systems

#### IntegrationConfigService
- **Location**: `apps/data-service/src/services/integration-config.service.ts`
- **Responsibilities**:
  - CRUD operations for integration configurations
  - Configuration validation
  - Configuration templates
  - Enable/disable functionality
  - Configuration retrieval by type/entity

### API Endpoints

#### Carriers (`/api/v1/carriers`)
- `GET /` - List carriers with filtering and pagination
- `GET /:id` - Get specific carrier
- `POST /` - Create new carrier
- `PUT /:id` - Update carrier
- `PATCH /:id` - Partial update
- `DELETE /:id` - Delete carrier
- `POST /:id/test` - Test carrier integration
- `GET /:id/health` - Get carrier health status
- `POST /:id/leads` - Submit lead to carrier

#### Brokers (`/api/v1/brokers`)
- `GET /` - List brokers with filtering and pagination
- `GET /:id` - Get specific broker
- `POST /` - Create new broker
- `PUT /:id` - Update broker
- `PATCH /:id` - Partial update
- `DELETE /:id` - Delete broker
- `POST /:id/test` - Test broker integration
- `GET /:id/health` - Get broker health status
- `POST /:id/leads` - Submit lead to broker

#### Integration Configs (`/api/v1/integration-configs`)
- `GET /` - List configs with filtering
- `GET /:id` - Get specific config
- `GET /type/:configType` - Get configs by type
- `GET /template/:configType` - Get configuration template
- `POST /` - Create new config
- `PUT /:id` - Update config
- `PATCH /:id` - Partial update
- `DELETE /:id` - Delete config
- `POST /:id/enable` - Enable config
- `POST /:id/disable` - Disable config

#### Integration Logs (`/api/v1/integration-logs`)
- `GET /` - List logs with filtering and pagination
- `GET /:id` - Get specific log
- `DELETE /` - Delete logs with optional filters
- `GET /stats/summary` - Get logs statistics

## Key Features

### 1. Generic API Client

The `ApiClientService` provides a robust foundation for external API communication:

```typescript
// Automatic retry logic with exponential backoff
// Smart rate limit detection and handling
// Request sanitization for logging
// Configurable timeouts
```

### 2. Carrier Management

Complete lifecycle management for insurance carriers:

- **Multi-product support**: Each carrier can support multiple insurance types
- **Priority routing**: Assign priority levels for intelligent routing
- **Health monitoring**: Track success rates, response times, and consecutive failures
- **Rate limiting**: Configurable rate limits per carrier

### 3. Broker Integration

Comprehensive broker management:

- **Carrier associations**: Brokers can be associated with specific carriers
- **Independent APIs**: Brokers can have their own API endpoints
- **Health tracking**: Separate health monitoring from carriers

### 4. Lead Submission

Submit leads to carriers and brokers with full tracking:

```typescript
{
  leadId: string;
  carrierId?: string;
  brokerId?: string;
  submissionData: Record<string, unknown>;
  priority?: 'low' | 'medium' | 'high';
}
```

- **Automatic logging**: Every submission creates an integration log
- **Error handling**: Failed submissions are logged with error details
- **Duration tracking**: Track performance of each submission

### 5. Quote Requests

Request quotes from multiple carriers in parallel:

```typescript
{
  leadId: string;
  insuranceType: string;
  coverageData: Record<string, unknown>;
  carrierIds?: string[];
  brokerId?: string;
}
```

- **Parallel execution**: Request from multiple carriers simultaneously
- **Filtering**: Request from specific carriers or all active ones
- **Error resilience**: Individual carrier failures don't affect others

### 6. Integration Health

Comprehensive health monitoring for all integrations:

```typescript
{
  entityType: 'INSURANCE_CARRIER' | 'BROKER';
  entityId: string;
  name: string;
  status: 'healthy' | 'degraded' | 'unhealthy';
  lastSuccessfulAt?: Date;
  lastFailedAt?: Date;
  consecutiveFailures: number;
  averageResponseTime?: number;
  totalRequests: number;
  successRate: number;
  lastCheckAt: Date;
}
```

**Health Criteria**:
- **Healthy**: Success rate ≥ 95%, no consecutive failures
- **Degraded**: Success rate ≥ 80%, < 5 consecutive failures
- **Unhealthy**: Below degraded thresholds

### 7. Configuration Management

Flexible configuration system with templates:

**Config Types**:
- `API_ENDPOINTS`: Define API endpoints for integrations
- `MAPPING_RULES`: Field mapping between systems
- `VALIDATION_RULES`: Data validation rules
- `TRANSFORMATION_RULES`: Data transformation logic
- `NOTIFICATION_SETTINGS`: Configure notifications
- `RATE_LIMITING`: Rate limit settings
- `AUTHENTICATION`: Authentication configuration

**Configuration Templates**: Each config type has a default template to get started quickly.

### 8. Comprehensive Logging

Detailed audit trail of all integration activities:

```typescript
{
  entityType: 'INSURANCE_CARRIER' | 'BROKER' | 'LEAD' | 'POLICY' | 'CLAIM' | 'QUOTE';
  entityId: string;
  carrierId?: string;
  brokerId?: string;
  configId?: string;
  action: 'LEAD_SUBMITTED' | 'QUOTE_REQUESTED' | ...;
  direction: 'INBOUND' | 'OUTBOUND';
  requestData?: Record<string, unknown>;
  responseData?: Record<string, unknown>;
  statusCode?: number;
  success: boolean;
  error?: string;
  duration?: number;
  createdAt: Date;
}
```

**Features**:
- Full request/response logging
- Duration tracking for performance
- Success/failure tracking
- Filtering and search capabilities
- Statistics and summaries

## Database Schema Changes

### New Models

```prisma
model InsuranceCarrier {
  id                String               @id @default(uuid())
  name              String
  code              String               @unique
  website           String?
  logoUrl           String?
  contactEmail      String?
  contactPhone      String?
  supportedProducts InsuranceType[]
  apiEndpoint       String?
  webhookUrl        String?
  documentationUrl  String?
  integrationType   IntegrationType      @default(REST_API)
  apiKey            String?
  apiSecret         String?
  apiVersion        String?
  isActive          Boolean              @default(true)
  isPrimary         Boolean              @default(false)
  priority          Int                  @default(0)
  rateLimit         Int                  @default(100)
  rateLimitWindow   Int                  @default(60)
  metadata          Json?
  createdAt         DateTime             @default(now())
  updatedAt         DateTime             @updatedAt

  brokers           Broker[]
  configs           IntegrationConfig[]
  logs              IntegrationLog[]
}

model Broker {
  id                String               @id @default(uuid())
  name              String
  code              String               @unique
  website           String?
  logoUrl           String?
  contactEmail      String?
  contactPhone      String?
  licenseNumber     String?
  ein               String?
  businessAddress   Json?
  carrierId         String?
  carrier           InsuranceCarrier?
  integrationType   IntegrationType      @default(REST_API)
  apiKey            String?
  apiSecret         String?
  apiVersion        String?
  isActive          Boolean              @default(true)
  priority          Int                  @default(0)
  rateLimit         Int                  @default(100)
  rateLimitWindow   Int                  @default(60)
  metadata          Json?
  createdAt         DateTime             @default(now())
  updatedAt         DateTime             @updatedAt

  configs           IntegrationConfig[]
  logs              IntegrationLog[]
}

model IntegrationConfig {
  id          String               @id @default(uuid())
  name        String
  description String?
  carrierId   String?
  carrier     InsuranceCarrier?
  brokerId    String?
  broker      Broker?
  configType  IntegrationConfigType
  config      Json
  isActive    Boolean              @default(true)
  isEnabled   Boolean              @default(true)
  metadata    Json?
  createdAt   DateTime             @default(now())
  updatedAt   DateTime             @updatedAt

  logs        IntegrationLog[]
}

model IntegrationLog {
  id          String             @id @default(uuid())
  entityType  IntegrationEntityType
  entityId    String
  carrierId   String?
  carrier     InsuranceCarrier?
  brokerId    String?
  broker      Broker?
  configId    String?
  config      IntegrationConfig?
  action      IntegrationAction
  direction   Direction          @default(OUTBOUND)
  requestData Json?
  responseData Json?
  statusCode  Int?
  success     Boolean
  error       String?
  duration    Int?
  metadata    Json?
  createdAt   DateTime           @default(now())
}
```

### New Enums

```prisma
enum IntegrationType {
  REST_API
  SOAP_API
  WEBHOOK
  FTP
  SFTP
  FILE_IMPORT
  FILE_EXPORT
}

enum IntegrationConfigType {
  API_ENDPOINTS
  MAPPING_RULES
  VALIDATION_RULES
  TRANSFORMATION_RULES
  NOTIFICATION_SETTINGS
  RATE_LIMITING
  AUTHENTICATION
}

enum IntegrationEntityType {
  INSURANCE_CARRIER
  BROKER
  LEAD
  POLICY
  CLAIM
  QUOTE
}

enum IntegrationAction {
  LEAD_SUBMITTED
  LEAD_STATUS_UPDATE
  QUOTE_REQUESTED
  QUOTE_RECEIVED
  POLICY_CREATED
  POLICY_UPDATED
  CLAIM_SUBMITTED
  CLAIM_STATUS_UPDATE
  WEBHOOK_RECEIVED
  DATA_SYNC
  VALIDATION_CHECK
  ERROR_RETRY
}

enum Direction {
  INBOUND
  OUTBOUND
}
```

## Type Definitions

All integration types are exported from `@insurance/types`:

```typescript
import {
  InsuranceCarrier,
  Broker,
  IntegrationConfig,
  IntegrationLog,
  CreateInsuranceCarrierDto,
  UpdateInsuranceCarrierDto,
  CreateBrokerDto,
  UpdateBrokerDto,
  LeadSubmissionRequest,
  QuoteRequest,
  IntegrationHealth,
  PaginatedResponse,
} from '@insurance/types';
```

Type definitions are located at:
- `packages/types/src/integrations.ts`

## Usage Examples

### Creating a Carrier

```typescript
POST /api/v1/carriers
{
  "name": "Acme Insurance",
  "code": "ACME",
  "website": "https://acme-insurance.com",
  "contactEmail": "api@acme-insurance.com",
  "supportedProducts": ["AUTO", "HOME", "LIFE"],
  "apiEndpoint": "https://api.acme-insurance.com/v1",
  "integrationType": "REST_API",
  "apiKey": "your-api-key",
  "isActive": true,
  "priority": 1,
  "rateLimit": 100,
  "rateLimitWindow": 60
}
```

### Submitting a Lead to a Carrier

```typescript
POST /api/v1/carriers/{carrierId}/leads
{
  "leadId": "550e8400-e29b-41d4-a716-446655440000",
  "submissionData": {
    "firstName": "John",
    "lastName": "Doe",
    "email": "john.doe@example.com",
    "phone": "+1-555-0123",
    "insuranceType": "AUTO",
    "coverageAmount": 50000
  },
  "priority": "high"
}
```

### Requesting Quotes

```typescript
POST /api/v1/carriers/quotes
{
  "leadId": "550e8400-e29b-41d4-a716-446655440000",
  "insuranceType": "AUTO",
  "coverageData": {
    "vehicleYear": 2023,
    "vehicleMake": "Toyota",
    "vehicleModel": "Camry",
    "driverAge": 35,
    "zipCode": "90210"
  },
  "carrierIds": ["carrier-id-1", "carrier-id-2"]
}
```

### Creating an Integration Config

```typescript
POST /api/v1/integration-configs
{
  "name": "Acme API Endpoints",
  "description": "API endpoints for Acme Insurance",
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
}
```

### Getting Integration Logs

```typescript
GET /api/v1/integration-logs?entityType=INSURANCE_CARRIER&carrierId={carrierId}&success=false&dateFrom=2024-01-01&dateTo=2024-12-31&page=1&limit=50
```

### Getting Health Status

```typescript
GET /api/v1/carriers/{carrierId}/health

Response:
{
  "entityType": "INSURANCE_CARRIER",
  "entityId": "carrier-id",
  "name": "Acme Insurance",
  "status": "healthy",
  "lastSuccessfulAt": "2024-12-27T10:30:00.000Z",
  "lastFailedAt": null,
  "consecutiveFailures": 0,
  "averageResponseTime": 450,
  "totalRequests": 150,
  "successRate": 0.9866,
  "lastCheckAt": "2024-12-27T12:00:00.000Z"
}
```

## Error Handling

### Integration Exception

All integration errors use the `IntegrationException` class:

```typescript
export class IntegrationException extends Error {
  code: string;
  details?: Record<string, unknown>;

  constructor(message: string, code: string, details?: Record<string, unknown>);
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
- `BAD_GATEWAY`: HTTP 502 error
- `SERVICE_UNAVAILABLE`: HTTP 503 error
- `GATEWAY_TIMEOUT`: HTTP 504 error

## Rate Limiting

Carriers and brokers support configurable rate limiting:

```typescript
{
  "rateLimit": 100,      // Maximum requests
  "rateLimitWindow": 60   // Time window in seconds
}
```

The system respects these limits and automatically handles rate limit errors (HTTP 429) with exponential backoff.

## Security Considerations

1. **API Key Storage**: API keys are stored in the database (production should use secrets manager)
2. **Request Sanitization**: URLs are sanitized in logs to remove sensitive data
3. **HTTPS**: All external API communications should use HTTPS
4. **Authentication**: Supports Bearer token authentication
5. **Audit Logging**: All integration activities are logged

## Monitoring and Observability

### Health Monitoring

- Real-time health status for all carriers and brokers
- Success rate tracking (24-hour window)
- Consecutive failure tracking
- Average response time calculation

### Performance Metrics

- Request duration tracking
- Success/failure rates
- Rate limit compliance
- Error type distribution

### Logging

- Structured JSON logging
- Request/response logging (configurable)
- Error details and stack traces
- Performance metrics

## Testing

### Manual Testing

1. **Create a test carrier** with valid credentials
2. **Test the connection** using the `/test` endpoint
3. **Submit a test lead** and verify the submission
4. **Check health status** after requests
5. **Review integration logs** for detailed activity

### Integration Testing

The system includes integration endpoints for testing:

- `POST /api/v1/carriers/:id/test` - Test carrier connection
- `POST /api/v1/brokers/:id/test` - Test broker connection

These endpoints make a health check request to the configured API endpoint and log the result.

## Future Enhancements

### Potential Improvements

1. **Webhook Handling**: Receive and process inbound webhooks from carriers
2. **File-Based Integrations**: Support for FTP/SFTP file uploads
3. **SOAP API Support**: Add SOAP protocol support
4. **Batch Processing**: Process multiple lead submissions in batches
5. **Async Processing**: Queue-based lead submission for high volume
6. **Retry Queues**: Automatic retry queue for failed submissions
7. **Transformations**: Data transformation engine for field mapping
8. **Validation Engine**: Advanced validation rules and schemas

### Webhook Support

Future implementation should include:

- Webhook endpoint registration
- Signature verification
- Event type routing
- Payload validation
- Retry logic for failed webhooks

## Migration Notes

### Database Migration

Run the following to apply schema changes:

```bash
# Generate Prisma migration
pnpm db:generate

# Push schema changes (for development)
pnpm db:push

# Or create and run migration (for production)
pnpm db:migrate
```

### Data Seeding

Example seed script for creating sample carriers:

```typescript
await prisma.insuranceCarrier.create({
  data: {
    name: 'Sample Carrier',
    code: 'SAMPLE',
    supportedProducts: ['AUTO', 'HOME'],
    apiEndpoint: 'https://api.example.com/v1',
    integrationType: 'REST_API',
    isActive: true,
    priority: 1,
  },
});
```

## Troubleshooting

### Common Issues

1. **API Connection Failures**
   - Check network connectivity
   - Verify API credentials
   - Review rate limit settings
   - Check carrier/broker status

2. **Lead Submission Failures**
   - Validate submission data format
   - Check carrier-specific requirements
   - Review integration logs for errors
   - Verify mapping rules

3. **Health Status Degraded**
   - Review recent integration logs
   - Check for rate limit violations
   - Verify API endpoint availability
   - Check authentication credentials

## Performance Considerations

### Optimization Strategies

1. **Parallel Quote Requests**: Request quotes from multiple carriers simultaneously
2. **Caching**: Cache carrier health status and configuration
3. **Connection Pooling**: Reuse HTTP connections
4. **Batch Operations**: Group multiple operations where possible
5. **Rate Limiting**: Implement client-side rate limiting

### Scalability

- Each carrier/broker has independent rate limits
- Health checks are based on recent logs (efficient queries)
- Pagination support for large datasets
- Indexes on frequently queried fields

## Documentation

- **API Documentation**: Available via API routes and Swagger (if configured)
- **Type Definitions**: `packages/types/src/integrations.ts`
- **Service Documentation**: In-code comments and JSDoc
- **This Document**: Comprehensive implementation guide

## Conclusion

Phase 8.6 provides a robust, scalable foundation for integrating with insurance carriers and broker management systems. The implementation includes:

- ✅ Complete CRUD operations for carriers and brokers
- ✅ Generic API client with retry logic
- ✅ Lead submission and quote request capabilities
- ✅ Health monitoring for all integrations
- ✅ Flexible configuration system
- ✅ Comprehensive logging and auditing
- ✅ Rate limiting support
- ✅ RESTful API endpoints
- ✅ Type-safe TypeScript implementation

The system is production-ready and designed for extensibility, making it easy to add new carriers, brokers, and integration types as needed.
