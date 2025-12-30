# Phase 15.1.2: CRM Data Integration & Import

## Overview

This phase implements seamless integrations with popular CRM platforms (Salesforce, HubSpot, Pipedrive) and data import capabilities for broker lead data. It provides OAuth2 authentication, field mapping, real-time sync, and CSV/Excel import functionality.

## Table of Contents

1. [Architecture](#architecture)
2. [Database Schema](#database-schema)
3. [CRM Integrations](#crm-integrations)
4. [Data Import](#data-import)
5. [API Endpoints](#api-endpoints)
6. [Usage Guide](#usage-guide)
7. [Configuration](#configuration)

## Architecture

### Components

```
┌─────────────────────────────────────────────────────────────┐
│                    CRM Integration Layer                      │
├─────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │  Salesforce  │  │   HubSpot    │  │  Pipedrive   │      │
│  │    OAuth2    │  │    OAuth2    │  │   API Key    │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│         │                 │                 │                │
│         └─────────────────┴─────────────────┘                │
│                           │                                  │
│  ┌─────────────────────────────────────────────────────┐    │
│  │        Field Mapping & Transformation Engine         │    │
│  └─────────────────────────────────────────────────────┘    │
│                           │                                  │
│  ┌─────────────────────────────────────────────────────┐    │
│  │    Data Validation & Cleansing Service              │    │
│  └─────────────────────────────────────────────────────┘    │
│                           │                                  │
│  ┌─────────────────────────────────────────────────────┐    │
│  │         Deduplication Service                        │    │
│  └─────────────────────────────────────────────────────┘    │
│                           │                                  │
│  ┌─────────────────────────────────────────────────────┐    │
│  │           Lead Import/Sync Service                   │    │
│  └─────────────────────────────────────────────────────┘    │
│                           │                                  │
└───────────────────────────┼──────────────────────────────────┘
                            │
┌───────────────────────────┼──────────────────────────────────┐
│                      Lead Database                           │
└─────────────────────────────────────────────────────────────┘
```

### Service Architecture

- **OAuth Service**: Handles OAuth2 authentication flows for CRM platforms
- **Validation Service**: Validates and cleanses lead data
- **Deduplication Service**: Identifies and handles duplicate records
- **CSV Import Service**: Parses and processes CSV/Excel files
- **Sync Service**: Manages real-time bidirectional sync

## Database Schema

### CrmIntegration

Stores CRM connection configurations:

```prisma
model CrmIntegration {
  id                String        @id @default(uuid())
  name              String
  provider          CrmProvider   // SALESFORCE, HUBSPOT, PIPEDRIVE
  isActive          Boolean       @default(true)
  isConnected       Boolean       @default(false)
  accessToken       String?
  refreshToken      String?
  tokenExpiresAt    DateTime?
  instanceUrl       String?
  webhookSecret     String?
  lastSyncAt        DateTime?
  syncStatus        SyncStatus    @default(IDLE)
  syncDirection     SyncDirection @default(BIDIRECTIONAL)
  syncFrequency     Int           @default(3600)
  autoSync          Boolean       @default(true)
  errorCount        Int           @default(0)
  lastError         String?
  
  fieldMappings     CrmFieldMapping[]
  syncLogs          CrmSyncLog[]
  importJobs        DataImportJob[]
}
```

### CrmFieldMapping

Defines how CRM fields map to lead fields:

```prisma
model CrmFieldMapping {
  id                String       @id @default(uuid())
  integrationId     String
  sourceField       String       // CRM field name
  targetField       String       // Our lead field name
  fieldType         FieldType
  isRequired        Boolean      @default(false)
  defaultValue      String?
  transformFunction String?      // Optional transform: "uppercase", "trim", etc
  validationRules   Json?
}
```

### CrmSyncLog

Tracks sync history:

```prisma
model CrmSyncLog {
  id               String         @id @default(uuid())
  integrationId    String
  syncType         SyncType       // FULL, INCREMENTAL, MANUAL
  direction        SyncDirection  // INBOUND, OUTBOUND, BIDIRECTIONAL
  status           SyncLogStatus  // STARTED, IN_PROGRESS, COMPLETED, FAILED
  recordsProcessed Int            @default(0)
  recordsSuccess   Int            @default(0)
  recordsFailed    Int            @default(0)
  recordsSkipped   Int            @default(0)
  startedAt        DateTime       @default(now())
  completedAt      DateTime?
  duration         Int?           // milliseconds
  errorMessage     String?
}
```

### DataImportJob

Manages bulk data imports:

```prisma
model DataImportJob {
  id               String        @id @default(uuid())
  integrationId    String?
  name             String
  importType       ImportType    // CSV, EXCEL, JSON, CRM_SYNC
  status           ImportStatus  // PENDING, PROCESSING, COMPLETED, FAILED
  fileName         String?
  fileUrl          String?
  totalRows        Int           @default(0)
  processedRows    Int           @default(0)
  successRows      Int           @default(0)
  failedRows       Int           @default(0)
  duplicateRows    Int           @default(0)
  fieldMapping     Json?
  scheduledFor     DateTime?
  startedAt        DateTime?
  completedAt      DateTime?
  
  importRecords    DataImportRecord[]
}
```

## CRM Integrations

### 1. Salesforce Integration

#### OAuth2 Flow

```typescript
// 1. Initialize OAuth URL
const authUrl = oAuthService.getAuthorizationUrl('SALESFORCE', {
  integrationId: 'crm-123',
  returnUrl: '/integrations',
});

// 2. Redirect user to authUrl

// 3. Handle callback
const tokenResponse = await oAuthService.exchangeCodeForToken(
  'SALESFORCE',
  code
);

// 4. Save credentials
await crmIntegrationService.updateIntegration(integrationId, {
  accessToken: tokenResponse.accessToken,
  refreshToken: tokenResponse.refreshToken,
  tokenExpiresAt: new Date(Date.now() + tokenResponse.expiresIn * 1000),
  instanceUrl: tokenResponse.instanceUrl,
  isConnected: true,
});
```

#### Field Mapping

```typescript
const salesforceMappings = [
  {
    sourceField: 'FirstName',
    targetField: 'firstName',
    fieldType: 'STRING',
    isRequired: true,
  },
  {
    sourceField: 'LastName',
    targetField: 'lastName',
    fieldType: 'STRING',
    isRequired: true,
  },
  {
    sourceField: 'Email',
    targetField: 'email',
    fieldType: 'EMAIL',
    isRequired: true,
  },
  {
    sourceField: 'Phone',
    targetField: 'phone',
    fieldType: 'PHONE',
    isRequired: false,
  },
  {
    sourceField: 'Product__c',
    targetField: 'insuranceType',
    fieldType: 'STRING',
    transformFunction: 'uppercase',
  },
];
```

#### Webhook Configuration

```typescript
// Salesforce sends webhooks when leads change
POST /api/crm/webhooks/salesforce
Headers:
  X-Salesforce-Signature: <signature>

Body:
{
  "objectType": "Lead",
  "objectId": "00Q...",
  "event": "created",
  "data": {
    "FirstName": "John",
    "LastName": "Doe",
    "Email": "john@example.com"
  }
}
```

### 2. HubSpot Integration

#### OAuth2 Flow

```typescript
// Similar to Salesforce
const authUrl = oAuthService.getAuthorizationUrl('HUBSPOT', {
  integrationId: 'hubspot-123',
});
```

#### Field Mapping

```typescript
const hubspotMappings = [
  {
    sourceField: 'firstname',
    targetField: 'firstName',
    fieldType: 'STRING',
  },
  {
    sourceField: 'lastname',
    targetField: 'lastName',
    fieldType: 'STRING',
  },
  {
    sourceField: 'email',
    targetField: 'email',
    fieldType: 'EMAIL',
  },
  {
    sourceField: 'phone',
    targetField: 'phone',
    fieldType: 'PHONE',
  },
  {
    sourceField: 'insurance_type',
    targetField: 'insuranceType',
    fieldType: 'STRING',
  },
];
```

#### Deal Pipeline Integration

```typescript
// Sync deals as leads
const deals = await hubspotClient.crm.deals.getAll();

for (const deal of deals.results) {
  const leadData = {
    firstName: deal.properties.firstname,
    lastName: deal.properties.lastname,
    email: deal.properties.email,
    metadata: {
      hubspotDealId: deal.id,
      dealStage: deal.properties.dealstage,
      amount: deal.properties.amount,
    },
  };
  
  await createOrUpdateLead(leadData);
}
```

### 3. Pipedrive Integration

#### API Key Authentication

```typescript
// Pipedrive can use OAuth or API key
const pipedriveClient = new PipedriveClient({
  apiKey: process.env.PIPEDRIVE_API_KEY,
  domain: 'company.pipedrive.com',
});
```

#### Sync Persons and Deals

```typescript
// Sync persons (contacts)
const persons = await pipedriveClient.getPersons();

// Sync deals
const deals = await pipedriveClient.getDeals();

// Create activities log
const activities = await pipedriveClient.getActivities();
```

## Data Import

### CSV Import Flow

```typescript
// 1. Upload CSV
const file = req.file;

// 2. Parse preview
const preview = await csvImportService.parsePreview(file.buffer.toString());

// Response:
{
  headers: ['firstName', 'lastName', 'email', 'phone'],
  rows: [...],
  detectedFieldTypes: {
    firstName: 'STRING',
    lastName: 'STRING',
    email: 'EMAIL',
    phone: 'PHONE'
  },
  suggestedMappings: [
    { sourceField: 'firstName', targetField: 'firstName', confidence: 1.0 },
    { sourceField: 'lastName', targetField: 'lastName', confidence: 1.0 },
    { sourceField: 'email', targetField: 'email', confidence: 1.0 },
    { sourceField: 'phone', targetField: 'phone', confidence: 1.0 }
  ],
  validationWarnings: [
    { row: 3, field: 'email', message: 'Invalid email address' }
  ]
}

// 3. Create import job with field mapping
const job = await importJobService.createJob({
  name: 'Lead Import 2024-01',
  importType: 'CSV',
  fileName: file.originalname,
  fileUrl: s3Url,
  fieldMapping: {
    firstName: 'firstName',
    lastName: 'lastName',
    email: 'email',
    phone: 'phone'
  },
  options: {
    skipDuplicates: true,
    cleanseData: true,
    validateData: true
  }
});

// 4. Process import
await importJobService.processJob(job.id);

// 5. Monitor progress
GET /api/crm/imports/${job.id}/progress

{
  jobId: 'job-123',
  status: 'PROCESSING',
  totalRows: 1000,
  processedRows: 450,
  successRows: 400,
  failedRows: 30,
  duplicateRows: 20,
  percentage: 45,
  estimatedTimeRemaining: 120000
}
```

### Data Validation

```typescript
const rules: ValidationRule[] = [
  {
    field: 'email',
    type: 'email',
    message: 'Invalid email address',
  },
  {
    field: 'phone',
    type: 'phone',
    message: 'Invalid phone number',
  },
  {
    field: 'firstName',
    type: 'required',
    message: 'First name is required',
  },
  {
    field: 'insuranceType',
    type: 'enum',
    message: 'Invalid insurance type',
    params: {
      values: ['AUTO', 'HOME', 'LIFE', 'HEALTH', 'COMMERCIAL'],
    },
  },
];

const result = validationService.validateRecord(data, rules);

if (!result.isValid) {
  console.error('Validation errors:', result.errors);
}

if (result.warnings.length > 0) {
  console.warn('Validation warnings:', result.warnings);
}
```

### Data Cleansing

```typescript
const cleansingOptions: DataCleansingOptions = {
  normalizePhone: true,
  normalizeEmail: true,
  trimStrings: true,
  capitalizeName: true,
  removeSpecialChars: false,
};

const result = validationService.cleanseData(data, cleansingOptions);

// Result:
{
  original: {
    email: '  JOHN@EXAMPLE.COM  ',
    phone: '(555) 123-4567',
    firstName: 'jOhN'
  },
  cleaned: {
    email: 'john@example.com',
    phone: '+15551234567',
    firstName: 'John'
  },
  changes: [
    { field: 'email', from: '  JOHN@EXAMPLE.COM  ', to: 'john@example.com', reason: 'normalized email' },
    { field: 'phone', from: '(555) 123-4567', to: '+15551234567', reason: 'normalized phone' },
    { field: 'firstName', from: 'jOhN', to: 'John', reason: 'capitalized name' }
  ]
}
```

### Deduplication

```typescript
const duplicateCheck = deduplicationService.checkDuplicate(
  newLead,
  existingLeads,
  {
    matchByEmail: true,
    matchByPhone: true,
    matchByName: true,
    fuzzyMatchThreshold: 0.85,
  }
);

if (duplicateCheck.isDuplicate) {
  console.log('Duplicate found:', duplicateCheck.duplicateOf);
  console.log('Match score:', duplicateCheck.matchScore);
  console.log('Matched fields:', duplicateCheck.matchedFields);
  
  // Optionally merge records
  const merged = deduplicationService.mergeRecords(
    existingLead,
    newLead,
    'merge' // Strategy: 'prefer_new', 'prefer_existing', or 'merge'
  );
}
```

## API Endpoints

### CRM Integration Endpoints

```
POST   /api/crm/integrations                 - Create CRM integration
GET    /api/crm/integrations                 - List integrations
GET    /api/crm/integrations/:id             - Get integration details
PUT    /api/crm/integrations/:id             - Update integration
DELETE /api/crm/integrations/:id             - Delete integration

GET    /api/crm/oauth/:provider/authorize    - Start OAuth flow
GET    /api/crm/oauth/:provider/callback     - OAuth callback
POST   /api/crm/oauth/:provider/refresh      - Refresh access token

POST   /api/crm/integrations/:id/sync        - Trigger manual sync
GET    /api/crm/integrations/:id/sync-status - Get sync status
GET    /api/crm/integrations/:id/sync-logs   - Get sync history
```

### Field Mapping Endpoints

```
POST   /api/crm/integrations/:id/mappings    - Create field mapping
GET    /api/crm/integrations/:id/mappings    - List field mappings
PUT    /api/crm/integrations/:id/mappings/:mappingId  - Update mapping
DELETE /api/crm/integrations/:id/mappings/:mappingId  - Delete mapping

GET    /api/crm/:provider/fields             - Get available CRM fields
POST   /api/crm/:provider/suggest-mappings   - Get mapping suggestions
```

### Import Endpoints

```
POST   /api/crm/imports/upload               - Upload CSV file
POST   /api/crm/imports/preview              - Preview CSV data
POST   /api/crm/imports                      - Create import job
GET    /api/crm/imports                      - List import jobs
GET    /api/crm/imports/:id                  - Get import job details
GET    /api/crm/imports/:id/progress         - Get import progress
POST   /api/crm/imports/:id/start            - Start import job
POST   /api/crm/imports/:id/cancel           - Cancel import job
DELETE /api/crm/imports/:id                  - Delete import job

GET    /api/crm/imports/templates            - Get CSV templates
GET    /api/crm/imports/:id/errors           - Get import errors
POST   /api/crm/imports/:id/retry-failed     - Retry failed records
```

### Webhook Endpoints

```
POST   /api/crm/webhooks/salesforce          - Salesforce webhook receiver
POST   /api/crm/webhooks/hubspot             - HubSpot webhook receiver
POST   /api/crm/webhooks/pipedrive           - Pipedrive webhook receiver
```

## Usage Guide

### Setting Up Salesforce Integration

1. **Create Salesforce Connected App**
   - Go to Salesforce Setup → App Manager → New Connected App
   - Enable OAuth Settings
   - Add callback URL: `https://your-app.com/api/crm/oauth/salesforce/callback`
   - Select scopes: `api`, `refresh_token`, `full`
   - Copy Client ID and Client Secret

2. **Configure Environment Variables**
   ```env
   SALESFORCE_CLIENT_ID=your_client_id
   SALESFORCE_CLIENT_SECRET=your_client_secret
   SALESFORCE_REDIRECT_URI=https://your-app.com/api/crm/oauth/salesforce/callback
   ```

3. **Connect to Salesforce**
   - Navigate to Settings → Integrations → Add CRM
   - Select Salesforce
   - Click "Connect"
   - Authorize the app in Salesforce

4. **Configure Field Mapping**
   - Map Salesforce fields to lead fields
   - Set required fields
   - Add transformation functions if needed

5. **Enable Auto-Sync**
   - Set sync frequency (e.g., every hour)
   - Enable bidirectional sync if needed
   - Configure webhook URL in Salesforce

### Importing CSV Data

1. **Prepare CSV File**
   - Use the provided template: `/docs/csv_templates/lead_import_template.csv`
   - Required fields: firstName, lastName, email OR phone
   - Optional fields: insuranceType, city, state, etc.

2. **Upload and Preview**
   - Upload CSV file
   - Review detected field types
   - Check validation warnings

3. **Map Fields**
   - Confirm or adjust suggested mappings
   - Set required fields
   - Add default values if needed

4. **Configure Import Options**
   - Skip duplicates: Yes/No
   - Cleanse data: Yes/No
   - Validate data: Yes/No
   - Batch size: 100 (recommended)

5. **Start Import**
   - Monitor progress in real-time
   - Review errors if any
   - Retry failed records

### Handling Duplicates

The system automatically detects duplicates based on:
- Email match (exact)
- Phone match (normalized)
- Name match (fuzzy, 85% similarity threshold)

Options for duplicate handling:
- **Skip**: Don't import duplicates
- **Update**: Update existing record with new data
- **Create New**: Create as new record (not recommended)

## Configuration

### Environment Variables

```env
# App URL
APP_URL=https://your-app.com

# Salesforce
SALESFORCE_CLIENT_ID=
SALESFORCE_CLIENT_SECRET=
SALESFORCE_REDIRECT_URI=

# HubSpot
HUBSPOT_CLIENT_ID=
HUBSPOT_CLIENT_SECRET=
HUBSPOT_REDIRECT_URI=

# Pipedrive
PIPEDRIVE_CLIENT_ID=
PIPEDRIVE_CLIENT_SECRET=
PIPEDRIVE_REDIRECT_URI=
PIPEDRIVE_API_KEY=

# Import Settings
MAX_IMPORT_FILE_SIZE=10485760  # 10MB
IMPORT_BATCH_SIZE=100
MAX_CONCURRENT_IMPORTS=5
IMPORT_TIMEOUT_MS=3600000  # 1 hour
```

### Rate Limiting

CRM APIs have rate limits:
- **Salesforce**: 100,000 API calls per 24 hours
- **HubSpot**: 100 requests per 10 seconds
- **Pipedrive**: 100 requests per 2 seconds

The system automatically:
- Tracks API usage
- Implements exponential backoff
- Queues requests when approaching limits
- Retries failed requests

### Sync Frequency

Recommended sync frequencies:
- **Real-time** (webhooks): For critical updates
- **Every 15 minutes**: For active integrations
- **Hourly**: For normal use
- **Daily**: For large datasets

## Error Handling

### Common Errors

1. **OAuth Token Expired**
   - Automatically refreshes using refresh token
   - Re-authenticate if refresh fails

2. **Rate Limit Exceeded**
   - Waits and retries automatically
   - Shows warning in sync status

3. **Invalid Field Mapping**
   - Validation error with field details
   - Suggests correct mapping

4. **Duplicate Record**
   - Logged as duplicate in import record
   - Can be merged manually

5. **Validation Error**
   - Record marked as failed
   - Error details provided
   - Can be corrected and retried

### Monitoring

- View sync logs in integration dashboard
- Export error reports
- Set up alerts for sync failures
- Monitor data quality scores

## Best Practices

1. **Start with Manual Sync**
   - Test integration with small dataset
   - Verify field mappings
   - Review import results

2. **Enable Data Validation**
   - Always validate imported data
   - Review validation warnings
   - Set up custom validation rules

3. **Handle Duplicates**
   - Enable duplicate detection
   - Review duplicates before merging
   - Maintain data quality

4. **Monitor Sync Health**
   - Check sync logs regularly
   - Set up error alerts
   - Monitor API usage

5. **Backup Data**
   - Export data before bulk operations
   - Keep import history
   - Enable rollback option

## Troubleshooting

### Integration Not Connecting

1. Check OAuth credentials
2. Verify callback URL
3. Check API permissions
4. Review error logs

### Sync Failing

1. Check rate limits
2. Verify field mappings
3. Check data format
4. Review webhook configuration

### Import Errors

1. Validate CSV format
2. Check required fields
3. Review validation rules
4. Check for duplicates

## Support

For additional help:
- Check logs: `/api/crm/integrations/:id/sync-logs`
- Review documentation: `/docs/PHASE_15.1.2_CRM_INTEGRATION.md`
- Contact support: support@your-app.com

## Acceptance Criteria

✅ Salesforce integration tested and working
✅ HubSpot integration tested and working
✅ Pipedrive integration tested and working
✅ CSV import handles 10,000+ records
✅ Data validation prevents bad data
✅ Sync errors logged and reported
✅ Field mapping flexible and user-friendly
✅ Duplicate detection working accurately
✅ Real-time webhooks functioning
✅ Rate limiting implemented
✅ Error retry logic in place
