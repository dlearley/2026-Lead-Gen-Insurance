# CRM Integration Quick Start Guide

This guide will help you quickly set up and use the CRM integration features.

## Prerequisites

- Node.js 20+
- PostgreSQL database running
- Redis running
- Environment variables configured

## Setup

### 1. Install Dependencies

```bash
npm install
# or
pnpm install
```

### 2. Configure Environment Variables

Copy `.env.example` to `.env` and configure:

```env
# App URL
APP_URL=http://localhost:3000

# Salesforce (if using)
SALESFORCE_CLIENT_ID=your_client_id
SALESFORCE_CLIENT_SECRET=your_client_secret

# HubSpot (if using)
HUBSPOT_CLIENT_ID=your_client_id
HUBSPOT_CLIENT_SECRET=your_client_secret

# Pipedrive (if using)
PIPEDRIVE_API_KEY=your_api_key
```

### 3. Run Database Migrations

```bash
# Main database
npx prisma migrate dev

# Data service database
cd apps/data-service
npx prisma migrate dev
```

### 4. Start Services

```bash
# Start all services
npm run dev

# Or start individually
npm run dev:api          # API service on port 3000
npm run dev:data-service # Data service on port 3001
```

## Usage

### Connecting to Salesforce

1. **Get Authorization URL**:
```bash
curl http://localhost:3001/api/v1/crm/oauth/salesforce/authorize
```

2. **Visit the URL** in your browser and authorize

3. **Handle callback** - System automatically saves tokens

### Importing CSV Data

1. **Prepare your CSV file** using the template:
   - Download: `/docs/csv_templates/lead_import_template.csv`
   - Fill with your lead data

2. **Preview the import**:
```bash
curl -X POST http://localhost:3001/api/v1/crm/imports/preview \
  -H "Content-Type: application/json" \
  -d '{
    "content": "firstName,lastName,email,phone\nJohn,Doe,john@example.com,5551234567"
  }'
```

3. **Create import job** (after implementing job processor):
```bash
curl -X POST http://localhost:3001/api/v1/crm/imports \
  -H "Content-Type: application/json" \
  -d '{
    "name": "January Leads",
    "importType": "CSV",
    "fileName": "leads.csv",
    "fieldMapping": {
      "firstName": "firstName",
      "lastName": "lastName",
      "email": "email",
      "phone": "phone"
    }
  }'
```

### Validating Data

```bash
curl -X POST http://localhost:3001/api/v1/crm/validate \
  -H "Content-Type: application/json" \
  -d '{
    "record": {
      "firstName": "John",
      "lastName": "Doe",
      "email": "john@example.com",
      "phone": "555-123-4567"
    }
  }'
```

### Checking for Duplicates

```bash
curl -X POST http://localhost:3001/api/v1/crm/deduplicate \
  -H "Content-Type: application/json" \
  -d '{
    "record": {
      "firstName": "John",
      "lastName": "Doe",
      "email": "john@example.com"
    },
    "existingRecords": [],
    "options": {
      "matchByEmail": true,
      "matchByPhone": true,
      "fuzzyMatchThreshold": 0.85
    }
  }'
```

## API Endpoints

### CRM Integrations
- `POST /api/v1/crm/integrations` - Create integration
- `GET /api/v1/crm/integrations` - List integrations
- `GET /api/v1/crm/integrations/:id` - Get integration
- `PUT /api/v1/crm/integrations/:id` - Update integration
- `DELETE /api/v1/crm/integrations/:id` - Delete integration

### OAuth
- `GET /api/v1/crm/oauth/:provider/authorize` - Get auth URL
- `GET /api/v1/crm/oauth/:provider/callback` - OAuth callback

### Data Operations
- `POST /api/v1/crm/imports/preview` - Preview CSV
- `POST /api/v1/crm/validate` - Validate record
- `POST /api/v1/crm/deduplicate` - Check duplicates

## Examples

### Example: Connect Salesforce

```javascript
// 1. Create integration record
const integration = await fetch('http://localhost:3001/api/v1/crm/integrations', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    name: 'My Salesforce',
    provider: 'SALESFORCE',
    syncDirection: 'BIDIRECTIONAL',
    autoSync: true,
  }),
});

// 2. Get OAuth URL
const authResponse = await fetch(
  `http://localhost:3001/api/v1/crm/oauth/salesforce/authorize?integrationId=${integration.id}`
);
const { url } = await authResponse.json();

// 3. Redirect user to URL
window.location.href = url;

// 4. After callback, integration is connected!
```

### Example: Import CSV

```javascript
// 1. Preview
const preview = await fetch('http://localhost:3001/api/v1/crm/imports/preview', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    content: csvContent,
  }),
});

const previewData = await preview.json();
console.log('Suggested mappings:', previewData.data.suggestedMappings);
console.log('Validation warnings:', previewData.data.validationWarnings);

// 2. Create import job (when processor is ready)
const job = await createImportJob({
  name: 'Leads Import',
  importType: 'CSV',
  fieldMapping: previewData.data.suggestedMappings,
});
```

## Common Tasks

### Validate Email

```javascript
import { validationService } from '@insurance-lead-gen/core';

const result = validationService.validateRecord(
  { email: 'test@example.com' },
  [{ field: 'email', type: 'email', message: 'Invalid email' }]
);

if (!result.isValid) {
  console.error('Validation failed:', result.errors);
}
```

### Check for Duplicates

```javascript
import { deduplicationService } from '@insurance-lead-gen/core';

const result = deduplicationService.checkDuplicate(
  newLead,
  existingLeads,
  { 
    matchByEmail: true, 
    fuzzyMatchThreshold: 0.85 
  }
);

if (result.isDuplicate) {
  console.log('Duplicate found:', result.duplicateOf);
  console.log('Match score:', result.matchScore);
}
```

### Parse CSV

```javascript
import { csvImportService } from '@insurance-lead-gen/core';

const preview = await csvImportService.parsePreview(csvContent);
console.log('Headers:', preview.headers);
console.log('Detected types:', preview.detectedFieldTypes);
console.log('Suggested mappings:', preview.suggestedMappings);
```

## Troubleshooting

### OAuth Not Working
- Check CLIENT_ID and CLIENT_SECRET
- Verify redirect URI matches in CRM settings
- Check logs for specific error

### Import Failing
- Verify CSV format (UTF-8, comma-delimited)
- Check required fields (firstName, lastName, email OR phone)
- Review validation warnings from preview

### Duplicates Not Detected
- Check matching options (email, phone, name)
- Adjust fuzzy match threshold (default: 0.85)
- Verify data is normalized

## Next Steps

1. **Implement Frontend UI** - Build user interfaces for:
   - CRM connection wizard
   - Field mapping interface
   - CSV upload and import wizard
   - Sync dashboard

2. **Implement Webhooks** - Add real-time sync:
   - Webhook receivers
   - Signature verification
   - Event processing

3. **Implement Job Processor** - Background processing:
   - Import job queue
   - Sync scheduler
   - Error retry logic

## Resources

- [Full Documentation](./PHASE_15.1.2_CRM_INTEGRATION.md)
- [CSV Templates](./csv_templates/)
- [API Reference](./PHASE_15.1.2_CRM_INTEGRATION.md#api-endpoints)
- [Type Definitions](../packages/types/src/crm.ts)

## Support

For issues or questions:
- Check the full documentation
- Review error logs
- Check validation warnings
- Contact development team
