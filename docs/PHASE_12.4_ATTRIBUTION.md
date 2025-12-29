# Phase 12.4: Attribution - Prove Marketing ROI

## Overview

This phase implements a comprehensive attribution system that enables insurance agencies to track the source of leads, measure marketing campaign effectiveness, and calculate return on investment (ROI). The attribution system provides insights into which marketing channels, campaigns, and sources are generating the most valuable leads and conversions.

## Features Implemented

### 1. Marketing Source Management

#### Marketing Source Model

- **Source Tracking**: Comprehensive tracking of different marketing sources (organic search, paid search, social media, email, referrals, etc.)
- **Cost Tracking**: Track cost per lead for each source
- **Performance Metrics**: Monitor source effectiveness over time
- **Status Management**: Active/inactive source management

#### Source Types Supported

- `ORGANIC_SEARCH`: Organic search engine traffic
- `PAID_SEARCH`: Paid search advertising (Google Ads, Bing Ads)
- `SOCIAL_MEDIA`: Social media platforms (Facebook, LinkedIn, Twitter)
- `EMAIL`: Email marketing campaigns
- `REFERRAL`: Referral traffic from other websites
- `DIRECT`: Direct traffic (typed URLs, bookmarks)
- `AFFILIATE`: Affiliate marketing programs
- `CONTENT_MARKETING`: Content marketing efforts
- `EVENT`: Event-based marketing
- `OTHER`: Custom source types

### 2. Campaign Management

#### Campaign Model

- **Campaign Tracking**: Create and manage marketing campaigns
- **Budget Management**: Track campaign budgets and spending
- **Date Ranges**: Define campaign start and end dates
- **Status Tracking**: Campaign lifecycle management (Draft → Active → Paused → Completed → Cancelled → Archived)
- **Objective Tracking**: Define campaign objectives and target audiences

#### Campaign Statuses

- **DRAFT**: Campaign is being planned
- **ACTIVE**: Campaign is currently running
- **PAUSED**: Campaign is temporarily paused
- **COMPLETED**: Campaign has finished successfully
- **CANCELLED**: Campaign was cancelled
- **ARCHIVED**: Campaign is archived for historical reference

### 3. Attribution Tracking

#### Attribution Model

- **Lead Attribution**: Track which source and campaign generated each lead
- **UTM Parameter Support**: Capture UTM parameters (source, medium, campaign, term, content)
- **Referral Tracking**: Track referral sources and domains
- **Landing Page Tracking**: Record the landing page URL
- **Attribution Types**: Support multiple attribution models

#### Attribution Types

- **FIRST_TOUCH**: Credit to the first interaction
- **LAST_TOUCH**: Credit to the last interaction before conversion
- **MULTI_TOUCH**: Distribute credit across multiple touchpoints
- **LINEAR**: Equal credit to all touchpoints
- **TIME_DECAY**: More credit to recent touchpoints
- **POSITION_BASED**: More credit to first and last touchpoints

### 4. Performance Metrics

#### Campaign Metrics

- **Leads Generated**: Total leads from the campaign
- **Leads Qualified**: Leads that passed qualification
- **Leads Converted**: Leads that resulted in sales
- **Conversion Rate**: Percentage of leads that converted
- **Cost Per Lead**: Marketing cost per lead generated
- **Cost Per Conversion**: Marketing cost per conversion
- **Revenue Generated**: Total revenue from campaign conversions
- **ROI**: Return on investment calculation
- **Click Through Rate**: Engagement metrics
- **Engagement Score**: Overall engagement quality

#### Source Metrics

- **Leads Generated**: Total leads from the source
- **Leads Qualified**: Qualified leads from the source
- **Leads Converted**: Converted leads from the source
- **Conversion Rate**: Source conversion performance
- **Cost Per Lead**: Cost efficiency
- **Cost Per Conversion**: Conversion cost efficiency
- **Revenue Generated**: Revenue attribution
- **ROI**: Source-level ROI

### 5. ROI Calculation

#### ROI Formula

```
ROI = (Total Revenue - Total Cost) / Total Cost * 100
```

#### Key ROI Metrics

- **Total Spend**: Total marketing expenditure
- **Total Revenue**: Revenue generated from marketing efforts
- **ROI**: Return on investment percentage
- **ROI Percentage**: ROI expressed as percentage
- **Cost Per Lead**: Marketing cost per lead
- **Cost Per Conversion**: Marketing cost per conversion
- **Conversion Rate**: Lead-to-conversion rate

### 6. Analytics & Reporting

#### Attribution Analytics

- **Overall Performance**: Aggregate metrics across all sources and campaigns
- **Top Sources**: Best performing marketing sources
- **Top Campaigns**: Most effective campaigns
- **Trend Analysis**: Performance over time
- **Conversion Funnel**: Lead progression analysis

#### Report Generation

- **Custom Date Ranges**: Analyze specific time periods
- **Performance Breakdown**: Detailed metrics by source and campaign
- **ROI Analysis**: Comprehensive ROI calculations
- **Recommendations**: AI-generated optimization suggestions

## API Endpoints

### Marketing Source Management

#### Create Marketing Source

```http
POST /api/v1/attribution/sources
Content-Type: application/json

{
  "name": "Google Ads",
  "type": "PAID_SEARCH",
  "description": "Google Ads search campaigns",
  "costPerLead": 15.50,
  "isActive": true
}
```

#### Get Marketing Source

```http
GET /api/v1/attribution/sources/:id
```

#### Update Marketing Source

```http
PUT /api/v1/attribution/sources/:id
Content-Type: application/json

{
  "name": "Google Ads - Updated",
  "costPerLead": 16.25
}
```

#### List Marketing Sources

```http
GET /api/v1/attribution/sources?type=PAID_SEARCH&isActive=true&page=1&limit=50
```

#### Delete Marketing Source

```http
DELETE /api/v1/attribution/sources/:id
```

#### Get Source Metrics

```http
GET /api/v1/attribution/sources/:id/metrics?startDate=2024-01-01&endDate=2024-12-31
```

### Campaign Management

#### Create Campaign

```http
POST /api/v1/attribution/campaigns
Content-Type: application/json

{
  "name": "Q1 Auto Insurance Campaign",
  "description": "Targeted campaign for auto insurance leads",
  "sourceId": "source-uuid",
  "startDate": "2024-01-01T00:00:00Z",
  "endDate": "2024-03-31T23:59:59Z",
  "budget": 5000.00,
  "status": "ACTIVE",
  "objective": "Generate 200 qualified auto insurance leads",
  "targetAudience": "Adults 25-55 with clean driving records"
}
```

#### Get Campaign

```http
GET /api/v1/attribution/campaigns/:id
```

#### Update Campaign

```http
PUT /api/v1/attribution/campaigns/:id
Content-Type: application/json

{
  "status": "PAUSED",
  "budget": 5500.00
}
```

#### List Campaigns

```http
GET /api/v1/attribution/campaigns?sourceId=source-uuid&status=ACTIVE&page=1&limit=50
```

#### Delete Campaign

```http
DELETE /api/v1/attribution/campaigns/:id
```

#### Get Campaign Metrics

```http
GET /api/v1/attribution/campaigns/:id/metrics?startDate=2024-01-01&endDate=2024-12-31
```

#### Calculate Campaign ROI

```http
GET /api/v1/attribution/campaigns/:id/roi
```

Response:

```json
{
  "success": true,
  "data": {
    "roi": 15000,
    "roiPercentage": 300,
    "costPerLead": 25,
    "costPerConversion": 100,
    "conversionRate": 25,
    "totalSpend": 5000,
    "totalRevenue": 20000
  }
}
```

### Attribution Management

#### Create Attribution

```http
POST /api/v1/attribution/attributions
Content-Type: application/json

{
  "leadId": "lead-uuid",
  "sourceId": "source-uuid",
  "campaignId": "campaign-uuid",
  "attributionType": "FIRST_TOUCH",
  "utmSource": "google",
  "utmMedium": "cpc",
  "utmCampaign": "auto_insurance_q1",
  "utmTerm": "cheap auto insurance",
  "utmContent": "ad_variant_1",
  "referralSource": "referral-partner.com",
  "referringDomain": "referral-partner.com",
  "landingPage": "https://insurance.com/auto-quote"
}
```

#### Get Attribution

```http
GET /api/v1/attribution/attributions/:id
```

#### Update Attribution

```http
PUT /api/v1/attribution/attributions/:id
Content-Type: application/json

{
  "attributionType": "LAST_TOUCH",
  "campaignId": "new-campaign-uuid"
}
```

#### List Attributions

```http
GET /api/v1/attribution/attributions?leadId=lead-uuid&sourceId=source-uuid&campaignId=campaign-uuid&attributionType=FIRST_TOUCH&page=1&limit=50
```

#### Delete Attribution

```http
DELETE /api/v1/attribution/attributions/:id
```

### Analytics & Reporting

#### Get Attribution Analytics

```http
GET /api/v1/attribution/analytics?startDate=2024-01-01&endDate=2024-12-31
```

Response:

```json
{
  "success": true,
  "data": {
    "totalLeads": 1500,
    "totalConversions": 375,
    "overallConversionRate": 25,
    "averageCostPerLead": 12.50,
    "averageCostPerConversion": 50,
    "totalRevenue": 75000,
    "overallRoi": 150,
    "topSources": [
      {
        "sourceId": "source-uuid",
        "sourceName": "Google Ads",
        "leads": 800,
        "conversions": 240,
        "conversionRate": 30,
        "revenue": 48000,
        "roi": 200
      }
    ],
    "topCampaigns": [
      {
        "campaignId": "campaign-uuid",
        "campaignName": "Q1 Auto Campaign",
        "leads": 600,
        "conversions": 180,
        "conversionRate": 30,
        "revenue": 36000,
        "roi": 180
      }
    ]
  }
}
```

#### Generate Attribution Report

```http
POST /api/v1/attribution/reports
Content-Type: application/json

{
  "reportName": "Q1 Marketing Performance Report",
  "startDate": "2024-01-01",
  "endDate": "2024-03-31"
}
```

Response:

```json
{
  "success": true,
  "data": {
    "reportId": "report-uuid",
    "reportName": "Q1 Marketing Performance Report",
    "generatedAt": "2024-04-01T10:30:00Z",
    "dateRange": {
      "startDate": "2024-01-01T00:00:00Z",
      "endDate": "2024-03-31T23:59:59Z"
    },
    "overallPerformance": {
      "totalLeads": 1500,
      "totalConversions": 375,
      "conversionRate": 25,
      "totalRevenue": 75000,
      "totalCost": 25000,
      "roi": 200
    },
    "sourcePerformance": [],
    "campaignPerformance": [],
    "recommendations": [
      "Overall conversion rate is good at 25%. Consider optimizing top-performing campaigns.",
      "Google Ads source shows strong performance with 30% conversion rate."
    ]
  }
}
```

## Database Models

### MarketingSource

```prisma
model MarketingSource {
  id          String
  name        String
  type        MarketingSourceType
  description String?
  costPerLead Float?
  isActive    Boolean
  createdAt   DateTime
  updatedAt   DateTime
  campaigns   Campaign[]
  attributions Attribution[]
}
```

### Campaign

```prisma
model Campaign {
  id              String
  name            String
  description     String?
  sourceId        String
  startDate       DateTime
  endDate         DateTime?
  budget          Float
  status          CampaignStatus
  objective       String?
  targetAudience  String?
  createdAt       DateTime
  updatedAt       DateTime
  source          MarketingSource
  attributions    Attribution[]
  metrics         CampaignMetric[]
}
```

### Attribution

```prisma
model Attribution {
  id              String
  leadId          String
  sourceId        String
  campaignId      String?
  attributionType AttributionType
  utmSource       String?
  utmMedium       String?
  utmCampaign     String?
  utmTerm         String?
  utmContent      String?
  referralSource  String?
  referringDomain String?
  landingPage     String?
  createdAt       DateTime
  updatedAt       DateTime
  lead             Lead
  source           MarketingSource
  campaign         Campaign?
}
```

### CampaignMetric

```prisma
model CampaignMetric {
  id                    String
  campaignId            String
  date                  DateTime
  leadsGenerated        Int
  leadsQualified        Int
  leadsConverted        Int
  conversionRate        Float
  costPerLead           Float
  costPerConversion     Float
  revenueGenerated      Float
  roi                   Float
  clickThroughRate      Float
  engagementScore       Float
  campaign              Campaign
}
```

### MarketingSourceMetric

```prisma
model MarketingSourceMetric {
  id                    String
  sourceId              String
  date                  DateTime
  leadsGenerated        Int
  leadsQualified        Int
  leadsConverted        Int
  conversionRate        Float
  costPerLead           Float
  costPerConversion     Float
  revenueGenerated      Float
  roi                   Float
  source                MarketingSource
}
```

## Integration Points

### Lead Creation Integration

When leads are created, the system should capture attribution data:

```typescript
// Example: Creating attribution when a lead is received
const attribution = await attributionService.createAttributionFromLead(
  lead.id,
  {
    utmSource: req.query.utm_source,
    utmMedium: req.query.utm_medium,
    utmCampaign: req.query.utm_campaign,
    utmTerm: req.query.utm_term,
    utmContent: req.query.utm_content,
  },
  {
    referralSource: req.headers.referer,
    referringDomain: getDomainFromReferrer(req.headers.referer),
    landingPage: req.originalUrl,
  }
);
```

### Conversion Tracking Integration

When leads are converted, update attribution metrics:

```typescript
// Example: Updating metrics when a lead converts
const campaignMetrics = await attributionService.getCampaignMetrics(campaignId);
const updatedMetrics = campaignMetrics.map(metric => ({
  ...metric,
  leadsConverted: metric.leadsConverted + 1,
  conversionRate: (metric.leadsConverted + 1) / metric.leadsGenerated * 100,
  // Update revenue based on policy value
  revenueGenerated: metric.revenueGenerated + policyValue,
  roi: (metric.revenueGenerated + policyValue - campaignBudget) / campaignBudget * 100
}));
```

## Business Value

### Key Benefits

1. **Data-Driven Decision Making**: Make informed decisions about marketing spend allocation
2. **ROI Proof**: Demonstrate the return on investment for marketing activities
3. **Performance Optimization**: Identify and focus on high-performing channels and campaigns
4. **Budget Allocation**: Allocate marketing budgets to the most effective sources
5. **Campaign Optimization**: Improve campaign performance based on real data
6. **Stakeholder Reporting**: Provide clear reports to stakeholders on marketing effectiveness

### Success Metrics

- **Marketing Efficiency**: Reduction in cost per lead and cost per conversion
- **ROI Improvement**: Increase in overall marketing ROI
- **Conversion Rate**: Improvement in lead-to-conversion rates
- **Budget Optimization**: Better allocation of marketing budgets
- **Campaign Performance**: Higher performing marketing campaigns

## Implementation Notes

### Technical Implementation

- **Database**: PostgreSQL with Prisma ORM
- **Services**: Dedicated attribution service with comprehensive methods
- **API**: RESTful API endpoints for all attribution functionality
- **Integration**: Seamless integration with existing lead management system
- **Analytics**: Advanced analytics and reporting capabilities

### Future Enhancements

- **Multi-Touch Attribution**: Enhanced multi-touch attribution models
- **AI-Powered Insights**: Machine learning for attribution insights
- **Real-Time Analytics**: Real-time dashboard updates
- **Predictive ROI**: AI-driven ROI predictions
- **Automated Optimization**: Automatic campaign optimization suggestions

## Conclusion

Phase 12.4 provides a comprehensive attribution system that enables insurance agencies to track marketing performance, calculate ROI, and make data-driven decisions about marketing investments. The system integrates seamlessly with existing lead management workflows and provides powerful analytics to optimize marketing spend and improve overall business performance.