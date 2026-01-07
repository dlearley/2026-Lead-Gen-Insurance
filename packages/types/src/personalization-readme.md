# Lead Enrichment & Real-time Personalization Engine

**Phase 16.3.7 Implementation**

## Quick Start

```bash
# Generate database migration
cd prisma
npx prisma migrate dev --name add_personalization_models

# Build services
npm run build

# Start services
npm run dev
```

## Overview

This system transforms analytical insights from previous phases (16.3.1-16.3.6) into actionable real-time personalization that insurance agents can leverage during lead engagement to maximize conversion rates.

## Key Features

### 1. Third-Party Data Integration
- **Provider Agnostic:** Pluggable architecture for ZoomInfo, Apollo, Clearbit, Dun & Bradstreet
- **Rate Limiting:** Automatic quota management with token bucket algorithm
- **Intelligent Caching:** Multi-level caching with configurable TTLs
- **Cost Optimization:** Provider selection based on data quality requirements
- **Health Monitoring:** Real-time provider status tracking

### 2. Real-Time Lead Enrichment
- **Pre-Call Enrichment:** Enrich leads 30-60 seconds before/during call start
- **Dynamic Updates:** Update signals during conversation based on NLP analysis
- **Composite Profiles:** Merge internal signals with external data
- **Conflict Resolution:** Automatic conflict detection and resolution rules
- **Confidence Scoring:** Weight data by recency and reliability

### 3. Personalized Offer Engine
- **Multi-Tier Recommendations:** Primary, secondary, and tertiary offers
- **Explainable AI:** Transparent reasoning for each recommendation
- **A/B Testing:** Built-in framework for offer variants
- **Premium Personalization:** Dynamic pricing based on risk profile
- **Competitive Advantages:** Highlight unique selling points

### 4. Dynamic Coaching Suggestions
- **Sentiment-Aware:** Adjust approach based on lead mood
- **Objection Handling:** Predict and respond to common objections
- **Pain Point Detection:** Address specific concerns with scripted responses
- **Competitive Positioning:** Talking points for competitor comparisons
- **Confidence Scoring:** High/medium/low confidence indicators
- **Feedback Loop:** Agent feedback improves suggestion quality

### 5. Risk & Compliance Validation
- **Fraud Detection:** Synthetic identity and behavioral anomaly detection
- **Contact Verification:** Phone, email, and address validation
- **Compliance Checks:** Age eligibility, geographic restrictions, coverage appropriateness
- **Auto-Escalation:** High-risk leads automatically flagged for review
- **Risk Scoring:** Comprehensive risk assessment with severity levels

### 6. Analytics & Measurement
- **Conversion Uplift:** Compare with/without personalization
- **Offer Analytics:** Acceptance rates by tier, response times
- **Agent Utilization:** Track engagement with suggestions
- **Sentiment Metrics:** Measure sentiment improvement
- **Cost Analysis:** ROI calculation and cost-per-conversion
- **Top Performers:** Identify winning combinations

## Architecture

### Data Flow

```
Lead Created
    ↓
Enrichment Triggered
    ↓
Query Multiple Providers (parallel)
    ↓
Merge & Resolve Conflicts
    ↓
Calculate Confidence Score
    ↓
Generate Personalized Offers
    ↓
Generate Coaching Suggestions
    ↓
Risk Validation
    ↓
Present to Agent (Call UI)
    ↓
Track Outcomes & Feedback
    ↓
Update Analytics & ML Models
```

### Service Communication

```
┌──────────────┐
│   API Gateway │
└──────┬───────┘
       │
       ├─→ LeadEnrichmentService
       │      ├─→ DataProviderAdapter (ZoomInfo, Apollo, etc.)
       │      └─→ Cache (Redis)
       │
       ├─→ OfferRecommendationEngine
       │      └─→ LeadScoring (existing)
       │
       ├─→ CoachingSuggestionService
       │      ├─→ NLP Service (real-time)
       │      └─→ Intent Detection
       │
       ├─→ RiskValidationService
       │      └─→ Fraud Detection Rules
       │
       └─→ PersonalizationAnalyticsService
              └─→ Metrics Aggregation
```

## API Endpoints

### Enrichment

| Method | Endpoint | Description |
|---------|-----------|-------------|
| POST | `/api/leads/:id/enrich` | Trigger enrichment for a lead |
| GET | `/api/leads/:id/enriched-profile` | Fetch enriched profile |

### Offers

| Method | Endpoint | Description |
|---------|-----------|-------------|
| GET | `/api/leads/:id/personalized-offers` | Get offer recommendations |
| POST | `/api/offers/:id/present` | Mark offer as presented |
| POST | `/api/offers/:id/accept` | Accept an offer |
| POST | `/api/offers/:id/reject` | Reject an offer |

### Coaching

| Method | Endpoint | Description |
|---------|-----------|-------------|
| GET | `/api/leads/:id/coaching-suggestions` | Get suggestions for lead |
| GET | `/api/calls/:id/coaching-suggestions` | Get suggestions for active call |
| POST | `/api/suggestions/:id/feedback` | Submit agent feedback |

### Risk Validation

| Method | Endpoint | Description |
|---------|-----------|-------------|
| POST | `/api/leads/:id/validate` | Validate lead for fraud/compliance |
| GET | `/api/leads/:id/risk-validation` | Get validation result |

### Analytics

| Method | Endpoint | Description |
|---------|-----------|-------------|
| GET | `/api/personalization/analytics` | Get analytics metrics |
| GET | `/api/personalization/dashboard` | Dashboard summary |
| GET | `/api/personalization/trend` | Daily metrics trend |

## Data Models

### Enrichment Profile

```typescript
interface LeadEnrichmentProfile {
  demographics: {
    age, income, occupation, maritalStatus,
    homeownerStatus, educationLevel, etc.
  };
  firmographics: {
    companyName, companySize, industry,
    revenue, employeeCount, etc.
  };
  behavioral: {
    websiteVisits, emailOpens, intentSignals,
    lastEngagement, etc.
  };
  risk: {
    fraudRiskScore, creditScoreProxy,
    financialStabilityScore, etc.
  };
  propertyData, vehicleData;
  confidenceScore: number; // 0-100
  dataSources: string[];
  expiresAt: Date;
}
```

### Personalized Offer

```typescript
interface PersonalizedOffer {
  tier: 'primary' | 'secondary' | 'tertiary';
  offerType: 'auto' | 'home' | 'life' | 'health' | 'commercial';
  fitScore: number; // 0-100
  confidence: number; // 0-100
  estimatedConversionProbability: number; // 0-100
  reasoning: Array<{
    category, reason, impact, weight
  }>;
  competitiveAdvantages: string[];
  premium: { amount, currency, frequency };
  status: 'suggested' | 'presented' | 'accepted' | 'rejected';
}
```

### Coaching Suggestion

```typescript
interface CoachingSuggestion {
  type: 'sentiment_adjustment' | 'objection_handling' | ...;
  title: string;
  content: string;
  suggestedScript: string;
  talkingPoints: string[];
  confidence: 'high' | 'medium' | 'low';
  priority: 'urgent' | 'high' | 'medium' | 'low';
  triggeredBy: Array<{ type, value, confidence }>;
  context: {
    currentSentiment, detectedIntents,
    painPoints, objections
  };
}
```

## Configuration

### Environment Variables

```env
# Data Provider API Keys
ZOOMINFO_API_KEY=xxx
APOLLO_API_KEY=xxx
CLEARBIT_API_KEY=xxx
DUN_BRADSTREET_API_KEY=xxx

# Caching
ENRICHMENT_CACHE_TTL=1440 # minutes
OFFER_CACHE_TTL=60 # minutes

# Rate Limiting
DEFAULT_RATE_LIMIT_PER_MINUTE=60
DEFAULT_RATE_LIMIT_PER_DAY=1000

# Thresholds
FRAUD_RISK_THRESHOLD=50
HIGH_RISK_THRESHOLD=70
CRITICAL_RISK_THRESHOLD=80

# Offers
MAX_OFFERS_PER_LEAD=5
OFFER_VALIDITY_HOURS=168
MIN_FIT_SCORE_FOR_PRIMARY=75

# Coaching
MAX_SUGGESTIONS_PER_CALL=10
MIN_CONFIDENCE_FOR_HIGH_PRIORITY=0.8
```

### Provider Configuration

```json
{
  "providers": {
    "zoominfo": {
      "enabled": true,
      "priority": 1,
      "cacheTtlMinutes": 1440,
      "rateLimitPerMinute": 60,
      "endpoints": {
        "person": "https://api.zoominfo.com/person",
        "company": "https://api.zoominfo.com/company"
      }
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

## Integration Examples

### Example 1: Enrich a Lead

```typescript
import { LeadEnrichmentService } from '@insurance-lead-gen/data-service';

const enrichmentService = new LeadEnrichmentService();

// Enrich a lead
const result = await enrichmentService.enrichLead('lead-123', {
  forceRefresh: false,
  includeProviders: ['zoominfo', 'apollo'],
  priority: 'high'
});

console.log({
  success: result.success,
  confidence: result.confidenceScore,
  providersUsed: result.providersUsed,
  duration: result.enrichmentDuration
});
```

### Example 2: Get Personalized Offers

```typescript
import { OfferRecommendationEngine } from '@insurance-lead-gen/data-service';

const offerEngine = new OfferRecommendationEngine();

// Get enriched profile first
const profile = await enrichmentService.getEnrichedProfile('lead-123');

// Generate offers
const offers = await offerEngine.generateOffers(
  'lead-123',
  profile,
  {
    maxOffers: 3,
    includeTiers: ['primary', 'secondary'],
    abTestGroup: 'A'
  }
);

console.log(`Generated ${offers.length} offers`);
offers.forEach(offer => {
  console.log(`${offer.tier} - ${offer.offerType}`);
  console.log(`Fit Score: ${offer.fitScore}%`);
  console.log(`Reasoning: ${offer.reasoning.map(r => r.reason).join(', ')}`);
});
```

### Example 3: Get Coaching Suggestions

```typescript
import { CoachingSuggestionService } from '@insurance-lead-gen/data-service';

const suggestionService = new CoachingSuggestionService();

const suggestions = await suggestionService.generateSuggestions(
  'lead-123',
  profile,
  {
    maxSuggestions: 5,
    minConfidence: 'medium'
  },
  {
    currentSentiment: 'neutral',
    detectedIntents: ['price_inquiry', 'comparison_shopping']
  }
);

suggestions.forEach(s => {
  console.log(`[${s.priority}] ${s.title}`);
  console.log(s.suggestedScript);
});
```

### Example 4: Real-Time Integration with Voice Orchestrator

```typescript
// Before call
const enriched = await enrichmentService.getEnrichedProfile(leadId);
const offers = await offerEngine.generateOffers(leadId, enriched);
const suggestions = await suggestionService.generateSuggestions(leadId, enriched);

// Send to call UI
callUI.send({
  type: 'personalization_init',
  data: {
    profile: enriched,
    offers: offers.slice(0, 3), // Top 3
    suggestions: suggestions.filter(s => s.priority === 'urgent')
  }
});

// During call - handle real-time sentiment updates
nlpService.on('sentiment_update', async (data) => {
  const updatedSuggestions = await suggestionService.generateSuggestions(
    leadId,
    enriched,
    undefined,
    {
      currentSentiment: data.sentiment,
      detectedIntents: data.intents
    }
  );

  callUI.send({
    type: 'suggestions_update',
    data: updatedSuggestions
  });
});
```

## Performance Targets

| Metric | Target | Actual |
|---------|---------|--------|
| Enrichment latency (p99) | <2s | TBD |
| Offer generation time | <500ms | TBD |
| Suggestion generation | <200ms | TBD |
| Risk validation | <1s | TBD |
| Cache hit rate | >80% | TBD |
| Provider success rate | >95% | TBD |
| System availability | >99.5% | TBD |

## Success Metrics

- ✅ Lead conversion rate improvement: +5-15%
- ✅ Offer acceptance rate: >30% for primary recommendations
- ✅ Agent utilization: >60% engagement with suggestions
- ✅ Data enrichment latency: <2 seconds (p99)
- ✅ System availability: >99.5% uptime

## Testing

### Unit Tests

```bash
# Test all personalization services
npm test -- services/*personalization*.test.ts

# Test specific service
npm test -- services/lead-enrichment-service.test.ts
```

### Integration Tests

```bash
# Test full enrichment flow
npm test -- integration/personalization-flow.test.ts

# Test offer generation with scoring
npm test -- integration/offer-generation.test.ts
```

### Load Tests

```bash
# Test enrichment under load (100 req/s)
npm run load-test:enrichment

# Test offer generation throughput
npm run load-test:offers
```

## Monitoring

### Key Metrics to Monitor

1. **Enrichment Health:**
   - Success rate by provider
   - Average enrichment time
   - Cache hit/miss ratio
   - Rate limit hits

2. **Offer Performance:**
   - Offer acceptance rate by tier
   - Time to acceptance
   - Fit score distribution
   - A/B test results

3. **Suggestion Quality:**
   - Agent utilization rate
   - Suggestion effectiveness rating
   - Feedback loop participation
   - Type distribution

4. **Risk Detection:**
   - Fraud detection rate
   - False positive rate
   - Escalation rate
   - Validation accuracy

### Alerts

Configure alerts for:
- Enrichment failure rate >5%
- Provider service degradation
- Low suggestion utilization <40%
- Fraud risk spike
- Cost budget exceeded

## Troubleshooting

### Enrichment Fails

**Symptoms:** `enrichLead()` returns errors

**Solutions:**
1. Check provider API credentials
2. Verify rate limits not exceeded
3. Check provider service status
4. Increase timeout in configuration
5. Check network connectivity

### Low Offer Acceptance

**Symptoms:** Primary offers rarely accepted

**Solutions:**
1. Review fit score calculation weights
2. Update offer templates
3. Check competitive pricing
4. Gather agent feedback
5. Analyze rejection reasons

### Suggestions Not Appearing

**Symptoms:** No suggestions in call UI

**Solutions:**
1. Verify enrichment profile exists
2. Check suggestion rules configuration
3. Validate trigger conditions
4. Review confidence thresholds
5. Check call context data

### High False Positive Fraud Rate

**Symptoms:** Valid leads flagged as high risk

**Solutions:**
1. Adjust risk thresholds
2. Review validation rules
3. Whitelist trusted patterns
4. Monitor feedback loop
5. Update detection algorithms

## Best Practices

### 1. Selective Enrichment
- Only enrich leads above quality score threshold
- Use lead scoring to prioritize
- Set minimum score requirements

### 2. Smart Caching
- Warm cache for high-priority segments
- Re-use enrichment profiles within TTL
- Invalidate only truly stale data

### 3. Provider Selection
- Use cheaper providers first
- Fallback to premium when needed
- Mix providers based on requirements

### 4. Agent Feedback
- Encourage feedback collection
- Act on feedback to improve
- Share successful strategies

### 5. Privacy First
- Minimize PII in cache
- Support data deletion requests
- Maintain audit trails

## Dependencies

### Internal
- `@insurance-lead-gen/types` - Type definitions
- `@insurance-lead-gen/core` - Logging, utilities
- `@insurance-lead-gen/config` - Configuration
- Lead scoring (Phase 16.3.2)
- Intent detection (Phase 16.3.4)
- NLP analysis (Phase 16.3.6)

### External
- `@prisma/client` - Database ORM
- `express` - API framework
- Redis - Caching layer
- NATS - Event bus (for real-time updates)

### Third-Party APIs
- ZoomInfo API
- Apollo API
- Clearbit API
- Dun & Bradstreet API

## Future Enhancements

1. **Machine Learning Integration:**
   - Learn from conversion data
   - Improve offer ranking models
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
   - Lead lifetime value prediction
   - Churn risk prediction
   - Optimal follow-up timing

## Support

- Documentation: `/docs/PHASE_16.3.7.md`
- API Reference: See individual service files
- Issues: Check service logs
- Monitoring: Grafana dashboards

## License

Part of the Insurance Lead Generation AI Platform.
