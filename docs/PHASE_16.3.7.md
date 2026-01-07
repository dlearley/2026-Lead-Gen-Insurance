# Phase 16.3.7: Lead Enrichment & Real-time Personalization Engine

## Overview

This phase implements a comprehensive lead enrichment and personalization system that transforms analytical insights into actionable real-time recommendations for insurance agents. The system bridges analytics to outcomes by providing:

1. **Third-party data enrichment** from multiple providers
2. **Real-time personalized offer recommendations**
3. **Dynamic agent coaching suggestions**
4. **Fraud and compliance validation**
5. **Comprehensive analytics and measurement**

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    API Layer (apps/api)                      │
│  /api/leads/:id/enrich                                    │
│  /api/leads/:id/personalized-offers                         │
│  /api/leads/:id/coaching-suggestions                       │
│  /api/leads/:id/validate                                   │
│  /api/personalization/analytics                              │
└────────────────────┬────────────────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────────────────┐
│           Service Layer (apps/data-service)                   │
│                                                             │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │      DataProviderAdapter                              │  │
│  │  - ZoomInfo, Apollo, Clearbit, D&B                  │  │
│  │  - Rate limiting, caching, error handling              │  │
│  └──────────────────┬────────────────────────────────────┘  │
│                     │                                      │
│  ┌──────────────────▼────────────────────────────────────┐  │
│  │   LeadEnrichmentService                            │  │
│  │  - Orchestrates enrichment workflow                 │  │
│  │  - Merges data from multiple providers             │  │
│  │  - Resolves conflicts, calculates confidence         │  │
│  └──────────────────┬────────────────────────────────────┘  │
│                     │                                      │
│  ┌──────────────────▼────────────────────────────────────┐  │
│  │   OfferRecommendationEngine                         │  │
│  │  - Generates personalized offers                    │  │
│  │  - Calculates fit scores and conversion prob          │  │
│  │  - A/B testing framework                          │  │
│  └──────────────────┬────────────────────────────────────┘  │
│                     │                                      │
│  ┌──────────────────▼────────────────────────────────────┐  │
│  │   CoachingSuggestionService                        │  │
│  │  - Real-time agent coaching                        │  │
│  │  - Sentiment-aware messaging                       │  │
│  │  - Objection handling suggestions                  │  │
│  └──────────────────┬────────────────────────────────────┘  │
│                     │                                      │
│  ┌──────────────────▼────────────────────────────────────┐  │
│  │   RiskValidationService                           │  │
│  │  - Fraud detection                                │  │
│  │  - Compliance validation                          │  │
│  │  - Risk scoring                                  │  │
│  └──────────────────┬────────────────────────────────────┘  │
│                     │                                      │
│  ┌──────────────────▼────────────────────────────────────┐  │
│  │   PersonalizationAnalyticsService                  │  │
│  │  - Tracks effectiveness metrics                    │  │
│  │  - Calculates ROI and uplift                     │  │
│  │  - Identifies top-performing combinations          │  │
│  └─────────────────────────────────────────────────────┘  │
└────────────────────┬────────────────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────────────────┐
│              Database Layer (PostgreSQL)                       │
│  - data_providers                                          │
│  - lead_enrichment_profiles                                 │
│  - personalized_offers                                      │
│  - coaching_suggestions                                     │
│  - risk_validation_results                                   │
│  - offer_acceptance_history                                 │
│  - personalization_effectiveness_metrics                      │
└─────────────────────────────────────────────────────────────────┘
```

## Components

### 1. Data Provider Adapter

**Location:** `apps/data-service/src/services/data-provider-adapter.ts`

**Purpose:** Abstracts third-party data provider APIs with unified interface

**Features:**
- Pluggable adapter architecture for multiple providers
- Automatic rate limiting and quota management
- Intelligent caching with configurable TTL
- Timeout and error handling
- Provider health monitoring
- Data conflict detection and resolution

**Supported Providers:**
- ZoomInfo
- Apollo
- Clearbit
- Dun & Bradstreet
- Custom providers

**Key Methods:**
```typescript
enrichLead(query, providerIds, options): Promise<EnrichmentResult>
validateProviderCredentials(providerId): Promise<boolean>
getProviderHealth(providerId): Promise<ProviderHealth>
```

### 2. Lead Enrichment Service

**Location:** `apps/data-service/src/services/lead-enrichment-service.ts`

**Purpose:** Orchestrates multi-provider enrichment workflow

**Features:**
- Pre-call enrichment (30-60 seconds before/during call)
- Dynamic enrichment updates during conversation
- Composite profile builder
- Confidence scoring
- Data conflict resolution
- Cache-aware enrichment (graceful degradation)

**Enrichment Data Types:**
- **Demographics:** age, income, occupation, homeowner status
- **Firmographics:** company size, industry, revenue, stage
- **Behavioral:** web activity, content engagement, intent signals
- **Risk Indicators:** fraud risk, credit score proxy, financial stability
- **Property Data:** property type, value, claims history
- **Vehicle Data:** year, make, model, ownership, coverage

**API Endpoints:**
```
POST /api/leads/:leadId/enrich
GET /api/leads/:leadId/enriched-profile
```

### 3. Offer Recommendation Engine

**Location:** `apps/data-service/src/services/offer-recommendation-engine.ts`

**Purpose:** Generates personalized insurance offers based on lead data

**Features:**
- Dynamic offer recommendation
- Multi-tier recommendations (primary, secondary, tertiary)
- Fit scoring and conversion probability estimation
- Explainable reasoning for transparency
- A/B testing framework
- Personalized premium calculation

**Offer Types:**
- Auto Insurance
- Home Insurance
- Life Insurance
- Health Insurance
- Commercial Insurance
- Bundle Offers

**Offer Components:**
```typescript
{
  tier: 'primary' | 'secondary' | 'tertiary',
  offerType: 'auto' | 'home' | 'life' | 'health' | 'commercial' | 'bundle',
  fitScore: number, // 0-100
  confidence: number, // 0-100
  estimatedConversionProbability: number, // 0-100
  reasoning: Array<{
    category: 'demographic_fit' | 'intent_match' | 'risk_profile' | ...,
    reason: string,
    impact: 'positive' | 'neutral' | 'negative',
    weight: number
  }>,
  competitiveAdvantages: string[]
}
```

**API Endpoints:**
```
GET /api/leads/:leadId/personalized-offers
POST /api/offers/:offerId/present
POST /api/offers/:offerId/accept
POST /api/offers/:offerId/reject
```

### 4. Coaching Suggestion Service

**Location:** `apps/data-service/src/services/coaching-suggestion-service.ts`

**Purpose:** Provides real-time coaching for agents during calls

**Features:**
- Sentiment-aware messaging
- Objection prediction and response suggestions
- Pain point detection → scripted responses
- Competitive positioning talking points
- Confidence-based prioritization
- Agent feedback loop

**Suggestion Types:**
- `sentiment_adjustment` - Adjust approach based on lead mood
- `objection_handling` - Address price, trust, competitor objections
- `pain_point_response` - Address specific concerns
- `competitive_positioning` - Highlight differentiators
- `risk_awareness` - Compliance and fraud alerts
- `upsell_opportunity` - Bundle and cross-sell suggestions
- `cross_sell_opportunity` - Related product suggestions
- `compliance_reminder` - Regulatory requirements

**Suggestion Structure:**
```typescript
{
  type: SuggestionType,
  title: string,
  content: string,
  suggestedScript: string,
  talkingPoints: string[],
  confidence: 'high' | 'medium' | 'low',
  priority: 'urgent' | 'high' | 'medium' | 'low',
  triggeredBy: Array<{
    type: 'sentiment' | 'intent' | 'pain' | 'objection',
    value: string,
    detectedAt: Date,
    confidence: number
  }>,
  context: {
    currentSentiment: string,
    detectedIntents: string[],
    painPoints: string[],
    objections: string[]
  }
}
```

**API Endpoints:**
```
GET /api/leads/:leadId/coaching-suggestions
GET /api/calls/:callId/coaching-suggestions
POST /api/suggestions/:suggestionId/feedback
```

### 5. Risk Validation Service

**Location:** `apps/data-service/src/services/risk-validation-service.ts`

**Purpose:** Validates leads for fraud risk and compliance

**Features:**
- Real-time fraud risk assessment
- Synthetic identity detection
- Phone/email/address verification
- Behavioral anomaly detection
- Compliance validation (age, geographic, coverage)
- Automatic escalation for high-risk leads

**Validation Categories:**
- **Identity:** phone, email, address validation
- **Contact:** contact completeness verification
- **Behavioral:** synthetic identity, anomaly detection
- **Compliance:** age eligibility, geographic restrictions
- **Financial:** credit score proxy, stability indicators

**Risk Scoring:**
```typescript
{
  overallRiskScore: number, // 0-100
  severity: 'low' | 'medium' | 'high' | 'critical',
  isApproved: boolean,
  requiresReview: boolean,
  autoEscalate: boolean,
  validationChecks: Array<{
    name: string,
    category: string,
    status: 'passed' | 'failed' | 'warning',
    severity: 'low' | 'medium' | 'high' | 'critical',
    result: boolean,
    message: string
  }>
}
```

**API Endpoints:**
```
POST /api/leads/:leadId/validate
GET /api/leads/:leadId/risk-validation
```

### 6. Personalization Analytics Service

**Location:** `apps/data-service/src/services/personalization-analytics-service.ts`

**Purpose:** Tracks and measures personalization effectiveness

**Metrics Tracked:**
- Conversion rate uplift (with vs without personalization)
- Offer acceptance rates by tier
- Agent utilization of suggestions
- Sentiment improvement metrics
- Cost analysis (enrichment cost vs conversion uplift)
- ROI calculation
- Top-performing combinations

**Analytics Dashboard:**
```typescript
{
  conversionUplift: number, // percentage
  agentUtilization: number, // percentage
  roi: number, // return on investment
  totalEnrichmentCost: number,
  offerMetrics: {
    totalOffers: number,
    primaryOfferAcceptanceRate: number,
    averageOfferResponseTime: number
  },
  suggestionMetrics: {
    totalSuggestions: number,
    agentUtilizationRate: number,
    averageEffectivenessRating: number
  }
}
```

**API Endpoints:**
```
GET /api/personalization/analytics
GET /api/personalization/dashboard
GET /api/personalization/trend
```

## Database Schema

### New Models

#### DataProvider
```prisma
model DataProvider {
  id                  String   @id @default(uuid())
  name                String
  type                String   // zoominfo, apollo, clearbit, etc.
  apiEndpoint         String?
  apiKey              String?
  rateLimitPerMinute  Int?
  cacheTtlMinutes     Int      @default(1440)
  status              String   @default("active")
  priority            Int
  isEnabled           Boolean
  successRate         Float
  // ... other fields
}
```

#### LeadEnrichmentProfile
```prisma
model LeadEnrichmentProfile {
  id                  String   @id @default(uuid())
  leadId              String   @unique
  demographics        Json?    // EnrichmentDemographics
  firmographics       Json?    // EnrichmentFirmographics
  behavioral          Json?    // EnrichmentBehavioral
  risk                Json?    // EnrichmentRisk
  propertyData        Json?    // EnrichmentProperty
  vehicleData         Json?    // EnrichmentVehicle[]
  confidenceScore     Float
  dataSources         String[]
  enrichmentMetadata  Json
  expiresAt           DateTime
  // ... relationships
}
```

#### PersonalizedOffer
```prisma
model PersonalizedOffer {
  id                    String   @id @default(uuid())
  leadId                String
  tier                  String   // primary, secondary, tertiary
  offerType             String
  fitScore              Float
  confidence            Float
  estimatedConversionProbability Float
  reasoning             Json[]
  competitiveAdvantages String[]
  abTestVariant         String?
  status                String   @default("suggested")
  validUntil            DateTime
  // ... other fields
}
```

#### CoachingSuggestion
```prisma
model CoachingSuggestion {
  id                    String   @id @default(uuid())
  leadId                String
  callId                String?
  type                  String
  title                 String
  content               String
  suggestedScript       String?
  confidence            String   // high, medium, low
  priority              String
  triggeredBy           Json[]
  context               Json
  status                String   @default("pending")
  // ... other fields
}
```

#### RiskValidationResult
```prisma
model RiskValidationResult {
  id                    String   @id @default(uuid())
  leadId                String
  validationType        String   // fraud, compliance, quality
  overallRiskScore      Float
  severity              String
  isApproved            Boolean
  requiresReview        Boolean
  autoEscalate          Boolean
  validationChecks      Json[]
  validationMetadata    Json
  expiresAt             DateTime
  // ... relationships
}
```

## API Documentation

### Lead Enrichment

#### Enrich a Lead
```http
POST /api/leads/:leadId/enrich
Content-Type: application/json

{
  "forceRefresh": false,
  "includeProviders": ["provider-1", "provider-2"],
  "excludeProviders": ["provider-3"],
  "enrichmentPriority": "normal"
}
```

#### Get Enriched Profile
```http
GET /api/leads/:leadId/enriched-profile?includeExpired=false&minimalData=false
```

### Personalized Offers

#### Get Personalized Offers
```http
GET /api/leads/:leadId/personalized-offers?maxOffers=5&includeTiers=primary,secondary&abTestGroup=A
```

#### Present an Offer
```http
POST /api/offers/:offerId/present
Content-Type: application/json

{
  "callId": "call-123"
}
```

#### Accept/Reject Offer
```http
POST /api/offers/:offerId/accept
POST /api/offers/:offerId/reject

{
  "agentId": "agent-123",
  "callId": "call-123",
  "agentFeedback": "Great rate, customer was interested"
}
```

### Coaching Suggestions

#### Get Coaching Suggestions for Lead
```http
GET /api/leads/:leadId/coaching-suggestions?maxSuggestions=10&minConfidence=medium
```

#### Get Suggestions for Active Call
```http
GET /api/calls/:callId/coaching-suggestions
```

#### Submit Feedback
```http
POST /api/suggestions/:suggestionId/feedback
Content-Type: application/json

{
  "used": true,
  "usedScript": true,
  "effectivenessRating": 5,
  "notes": "Very helpful suggestion"
}
```

### Risk Validation

#### Validate Lead
```http
POST /api/leads/:leadId/validate
Content-Type: application/json

{
  "validationType": "fraud"
}
```

#### Get Validation Result
```http
GET /api/leads/:leadId/risk-validation
```

### Analytics

#### Get Analytics
```http
GET /api/personalization/analytics?startDate=2024-01-01&endDate=2024-01-31&groupBy=week
```

#### Dashboard Metrics
```http
GET /api/personalization/dashboard?days=30
```

#### Daily Trend
```http
GET /api/personalization/trend?days=30
```

## Integration Guide

### Setting Up Data Providers

1. **Register a new provider:**
```typescript
POST /api/data-providers

{
  "name": "ZoomInfo",
  "type": "zoominfo",
  "apiEndpoint": "https://api.zoominfo.com",
  "apiKey": "your-api-key",
  "rateLimitPerMinute": 60,
  "cacheTtlMinutes": 1440,
  "priority": 1
}
```

2. **Implement provider adapter:**
```typescript
class ZoomInfoAdapter implements IDataProviderAdapter {
  async enrich(query: EnrichmentQuery): Promise<EnrichmentResponse> {
    // Make API call to ZoomInfo
    // Return normalized data
  }

  async validateCredentials(): Promise<boolean> {
    // Validate API credentials
  }
}
```

### Integrating with Voice Orchestrator

```typescript
// Before call starts
const enrichedProfile = await enrichmentService.getEnrichedProfile(leadId);
const offers = await offerEngine.generateOffers(leadId, enrichedProfile);
const suggestions = await suggestionService.generateSuggestions(leadId, enrichedProfile);

// Push to call UI
callUI.update({
  profile: enrichedProfile,
  offers: offers,
  suggestions: suggestions
});

// During call - update with real-time sentiment
const updatedSuggestions = await suggestionService.generateSuggestions(
  leadId,
  enrichedProfile,
  undefined,
  {
    currentSentiment: realTimeSentiment,
    detectedIntents: realTimeIntents
  }
);
callUI.updateSuggestions(updatedSuggestions);
```

### Integrating with NLP Service

```typescript
// Consume NLP analysis results
nlpService.on('sentimentUpdate', async (data) => {
  const suggestions = await suggestionService.generateSuggestions(
    data.leadId,
    data.enrichedProfile,
    undefined,
    {
      currentSentiment: data.sentiment,
      detectedIntents: data.intents
    }
  );

  // Send to call UI
  websocket.send(JSON.stringify({
    type: 'suggestions_update',
    data: suggestions
  }));
});

nlpService.on('intentDetected', async (data) => {
  // Trigger offer regeneration with new intent
  const offers = await offerEngine.generateOffers(
    data.leadId,
    data.enrichedProfile,
    { abTestGroup: data.callContext.abTestGroup }
  );
});
```

## Configuration

### Environment Variables

```env
# Data Provider Configuration
ZOOMINFO_API_KEY=your-zoominfo-key
APOLLO_API_KEY=your-apollo-key
CLEARBIT_API_KEY=your-clearbit-key
DUN_BRADSTREET_API_KEY=your-dnb-key

# Caching Configuration
ENRICHMENT_CACHE_TTL_MINUTES=1440
ENRICHMENT_CACHE_MAX_SIZE=10000

# Rate Limiting
DEFAULT_RATE_LIMIT_PER_MINUTE=60
DEFAULT_RATE_LIMIT_PER_DAY=1000

# Offer Configuration
OFFER_VALIDITY_HOURS=168
MAX_OFFERS_PER_LEAD=5
AB_TEST_ENABLED=true

# Risk Thresholds
FRAUD_RISK_THRESHOLD=50
COMPLIANCE_AUTO_ESCALATE_THRESHOLD=80
```

### Provider Configuration

```json
{
  "dataProviders": {
    "zoominfo": {
      "enabled": true,
      "priority": 1,
      "cacheTtlMinutes": 1440,
      "rateLimitPerMinute": 60
    },
    "apollo": {
      "enabled": true,
      "priority": 2,
      "cacheTtlMinutes": 10080,
      "rateLimitPerMinute": 120
    }
  }
}
```

## Performance Considerations

### Caching Strategy

- **Provider-level caching:** Each provider has configurable TTL
- **Aggregated profile caching:** Profiles cached for 24 hours by default
- **In-memory cache:** Frequent access patterns cached in memory
- **Cache warming:** Pre-warm cache for high-priority leads

### Rate Limiting

- Per-provider rate limits enforced
- Token bucket algorithm for smooth throttling
- Automatic backoff on rate limit errors
- Priority-based queue for important leads

### Batch Processing

- Bulk enrichment for lead lists
- Batch API calls to reduce overhead
- Parallel provider requests
- Configurable concurrency limits

## Cost Optimization

1. **Selective Enrichment:**
   - Only enrich high-quality leads
   - Use lead scoring to prioritize
   - Set minimum score thresholds

2. **Smart Caching:**
   - Cache provider responses
   - Re-use enrichment profiles
   - Invalidate only stale data

3. **Provider Selection:**
   - Use cheaper providers first
   - Fallback to premium providers only when needed
   - Mix providers based on data quality requirements

4. **Cost Tracking:**
   - Monitor per-lead enrichment cost
   - Calculate ROI for personalization
   - Set cost budgets and alerts

## Privacy & Compliance

### Data Minimization

- Collect only necessary data
- Mask PII in cache
- Support data deletion requests
- Minimal profile mode for privacy

### Audit Trail

- Log all enrichment activities
- Track data source provenance
- Record data access
- Maintain consent status

### Compliance Validation

- Age eligibility checks
- Geographic restrictions
- Coverage appropriateness
- Regulatory requirement checks

## Monitoring & Observability

### Key Metrics

- **Enrichment:**
  - Enrichment success rate
  - Average enrichment time (target: <2s p99)
  - Provider success rates
  - Cache hit rates

- **Offers:**
  - Offer acceptance rate (target: >30% for primary)
  - Time to acceptance
  - Fit score distribution
  - Conversion by tier

- **Suggestions:**
  - Agent utilization rate (target: >60%)
  - Suggestion effectiveness rating
  - Feedback loop participation
  - Type distribution

- **Risk:**
  - Fraud detection rate
  - False positive rate
  - Escalation rate
  - Validation time

### Alerts

- High enrichment failure rate
- Provider service degradation
- Low suggestion utilization
- Fraud risk spike
- Cost budget exceeded

## Testing

### Unit Tests

```bash
# Test individual services
npm test -- services/data-provider-adapter.test.ts
npm test -- services/lead-enrichment-service.test.ts
npm test -- services/offer-recommendation-engine.test.ts
```

### Integration Tests

```bash
# Test full enrichment flow
npm test -- integration/enrichment-flow.test.ts

# Test offer generation
npm test -- integration/offer-generation.test.ts
```

### Load Tests

```bash
# Test enrichment under load
npm run load-test:enrichment

# Test offer generation throughput
npm run load-test:offers
```

## Success Metrics

- ✅ Lead conversion rate improvement: +5-15%
- ✅ Offer acceptance rate: >30% for primary recommendations
- ✅ Agent utilization: >60% engagement with suggestions
- ✅ Data enrichment latency: <2 seconds (p99)
- ✅ System availability: >99.5% uptime
- ✅ Cost per conversion uplift: <$50

## Future Enhancements

1. **Machine Learning:**
   - Learn from conversion data
   - Improve offer ranking
   - Optimize suggestion timing

2. **Advanced NLP:**
   - Real-time transcription analysis
   - Emotion detection
   - Conversation flow optimization

3. **Multi-Channel Personalization:**
   - Email personalization
   - SMS recommendations
   - Chatbot integration

4. **Predictive Analytics:**
   - Predict lead lifetime value
   - Forecast conversion probability
   - Optimize follow-up timing

## Troubleshooting

### Common Issues

**Enrichment timing out:**
- Check provider rate limits
- Verify API credentials
- Increase timeout configuration
- Reduce number of providers

**Low offer acceptance rate:**
- Review fit score calculation
- Update offer templates
- Check competitive pricing
- Gather agent feedback

**Suggestions not appearing:**
- Verify enrichment profile exists
- Check suggestion rules
- Validate trigger conditions
- Review confidence thresholds

**High false positive fraud rate:**
- Adjust risk thresholds
- Review validation rules
- Whitelist trusted patterns
- Monitor feedback loop

## Support

For issues or questions:
- Documentation: `/docs/PHASE_16.3.7.md`
- API: `/api/personalization/*`
- Logs: Check service logs
- Monitoring: Grafana dashboards

## Changelog

### Version 1.0.0 (2024-01)
- Initial implementation
- Support for 4 major data providers
- Real-time offer recommendation
- Coaching suggestion engine
- Risk validation framework
- Analytics dashboard
