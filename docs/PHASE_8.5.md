# Phase 8.5: Insurance-Specific Lead Scoring & Qualification

This document describes the implementation of insurance-specific lead scoring and qualification system for the Insurance Lead Generation AI Platform.

## Overview

The lead scoring and qualification system provides intelligent, insurance-type-specific lead evaluation to help agents prioritize high-value opportunities and improve conversion rates. The system analyzes multiple dimensions of leads and applies configurable rules to determine qualification levels.

## Features

### 1. Multi-Dimensional Lead Scoring

The scoring system evaluates leads across six key dimensions:

- **Contact Completeness (15-20%)**: Evaluates the quality and completeness of lead contact information
- **Engagement Level (20-25%)**: Measures lead engagement based on source and behavior signals
- **Budget Alignment (15-25%)**: Assesses affordability and budget fit for insurance products
- **Timeline Urgency (15-20%)**: Determines the lead's urgency based on timing signals
- **Insurance Knowledge (10-15%)**: Evaluates lead's understanding of insurance products
- **Competitive Position (10-15%)**: Assesses competitive landscape and positioning

### 2. Insurance-Type Specific Scoring

#### Auto Insurance Scoring
Factors:
- Vehicle age and condition
- Driving history (accidents, violations)
- Current coverage status
- Years with current provider
- Annual mileage
- Vehicle use type (commute, business, pleasure)

#### Home Insurance Scoring
Factors:
- Property ownership status
- Property type and age
- Security system availability
- Swimming pool liability
- Claims history
- Property value

#### Life Insurance Scoring
Factors:
- Age (optimal range 25-45)
- Coverage amount requested
- Health class rating
- Tobacco use
- BMI (if provided)
- Pre-existing conditions
- Family health history
- Occupation and hobbies risks

#### Health Insurance Scoring
Factors:
- Age
- Dependents count
- Current coverage status
- Desired coverage type
- Pre-existing conditions
- Tobacco use
- Budget range

#### Commercial Insurance Scoring
Factors:
- Years in business
- Annual revenue
- Number of employees
- Industry risk level
- Loss history
- Current coverage status
- Multiple policy opportunities

### 3. Qualification Levels

Leads are classified into four qualification levels:

| Level | Score Range | Description |
|-------|-------------|-------------|
| **Hot** | 75-100 | High-priority leads requiring immediate contact |
| **Warm** | 50-74 | Good prospects for priority follow-up |
| **Cold** | 25-49 | Lower priority leads for nurturing |
| **Unqualified** | 0-24 | Leads not meeting qualification criteria |

### 4. Rule-Based Qualification Engine

The system includes a configurable rule engine with default rules for:

- **Auto Insurance**: License verification, high-risk driver detection, new vehicle purchase signals
- **Home Insurance**: Homeowner status, claims history
- **Life Insurance**: Age range, coverage amount, health classification
- **Health Insurance**: Coverage status, family coverage needs
- **Commercial Insurance**: Business tenure, coverage gaps, multi-policy opportunities
- **General Rules**: Contact completeness, referral source, urgency signals

### 5. Qualification Outputs

The qualification service provides:

- **Qualification Level**: Hot/Warm/Cold/Unqualified
- **Recommendation**: immediate_contact, priority_followup, nurture, disqualify
- **Key Qualifiers**: Factors supporting qualification
- **Risk Factors**: Concerns or barriers
- **Estimated Value**: Potential premium value
- **Conversion Probability**: Likelihood of conversion
- **Suggested Products**: Cross-sell opportunities
- **Next Best Steps**: Actionable next steps

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Scoring Service                           │
├─────────────────────────────────────────────────────────────────┤
│  LeadScoringService                                             │
│  ├── scoreLead()                                                │
│  ├── updateConfig()                                             │
│  └── getConfig()                                                │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Qualification Service                       │
├─────────────────────────────────────────────────────────────────┤
│  LeadQualificationService                                       │
│  ├── qualifyLead()                                              │
│  ├── addRuleSet()                                               │
│  ├── updateRuleSet()                                            │
│  └── getRuleSets()                                              │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                        API Routes                                │
├─────────────────────────────────────────────────────────────────┤
│  POST /api/v1/scoring/score-lead                                │
│  POST /api/v1/scoring/qualify-lead                              │
│  POST /api/v1/scoring/score-and-qualify                         │
│  GET  /api/v1/scoring/config                                    │
│  PUT  /api/v1/scoring/config                                    │
│  GET  /api/v1/scoring/rules                                     │
│  POST /api/v1/scoring/rules                                     │
│  GET  /api/v1/scoring/insurance-types                           │
│  POST /api/v1/scoring/batch-score                               │
│  POST /api/v1/scoring/batch-qualify                             │
└─────────────────────────────────────────────────────────────────┘
```

## API Endpoints

### Score a Lead
```
POST /api/v1/scoring/score-lead
Content-Type: application/json

{
  "leadId": "lead_123",
  "leadData": {
    "id": "lead_123",
    "source": "website",
    "email": "john@example.com",
    "phone": "+1234567890",
    "firstName": "John",
    "lastName": "Doe",
    "insuranceType": "auto"
  },
  "vehicleInfo": {
    "year": 2022,
    "make": "Toyota",
    "model": "Camry",
    "ownership": "owned",
    "currentCoverage": true,
    "accidentsLast5Years": 0,
    "violationsLast3Years": 0,
    "annualMileage": 12000,
    "primaryUse": "commute"
  }
}
```

### Qualify a Lead
```
POST /api/v1/scoring/qualify-lead
Content-Type: application/json

{
  "leadId": "lead_123",
  "leadData": {
    "id": "lead_123",
    "source": "website",
    "email": "john@example.com",
    "firstName": "John",
    "lastName": "Doe"
  }
}
```

### Response Format
```json
{
  "success": true,
  "result": {
    "leadId": "lead_123",
    "isQualified": true,
    "qualificationLevel": "hot",
    "recommendation": "immediate_contact",
    "keyQualifiers": ["Clean driving record", "Complete contact info"],
    "riskFactors": [],
    "estimatedValue": 1500,
    "conversionProbability": 0.85,
    "suggestedInsuranceProducts": ["auto", "home"],
    "nextBestSteps": [
      "Contact lead within 1 hour",
      "Prepare personalized quote"
    ],
    "qualificationDetails": {
      "eligibilityScore": 95,
      "affordabilityScore": 80,
      "needScore": 90,
      "authorityScore": 85,
      "timingScore": 95,
      "buyingSignals": [
        {
          "signal": "Clean Driving Record",
          "strength": "strong",
          "description": "No accidents or violations"
        }
      ],
      "objections": []
    },
    "createdAt": "2024-01-15T10:30:00.000Z"
  }
}
```

## Scoring Configuration

### Default Weights by Insurance Type

```typescript
const DEFAULT_WEIGHTS = {
  auto: {
    contactCompleteness: 0.15,
    engagementLevel: 0.25,
    budgetAlignment: 0.20,
    timelineUrgency: 0.20,
    insuranceKnowledge: 0.10,
    competitivePosition: 0.10,
  },
  home: {
    contactCompleteness: 0.15,
    engagementLevel: 0.20,
    budgetAlignment: 0.25,
    timelineUrgency: 0.20,
    insuranceKnowledge: 0.10,
    competitivePosition: 0.10,
  },
  life: {
    contactCompleteness: 0.20,
    engagementLevel: 0.20,
    budgetAlignment: 0.15,
    timelineUrgency: 0.15,
    insuranceKnowledge: 0.15,
    competitivePosition: 0.15,
  },
  health: {
    contactCompleteness: 0.15,
    engagementLevel: 0.25,
    budgetAlignment: 0.20,
    timelineUrgency: 0.20,
    insuranceKnowledge: 0.10,
    competitivePosition: 0.10,
  },
  commercial: {
    contactCompleteness: 0.15,
    engagementLevel: 0.20,
    budgetAlignment: 0.20,
    timelineUrgency: 0.15,
    insuranceKnowledge: 0.15,
    competitivePosition: 0.15,
  },
};
```

### Default Thresholds

```typescript
const DEFAULT_THRESHOLDS = {
  hot: 75,
  warm: 50,
  cold: 25,
};
```

### Default Bonuses

```typescript
const DEFAULT_BONUSES = {
  multiplePolicies: 15,
  referral: 10,
  repeatCustomer: 12,
  completeProfile: 8,
};
```

## Custom Rules

### Adding Custom Rules

```typescript
const customRule: QualificationRule = {
  id: 'custom-high-value',
  name: 'High Value Lead',
  description: 'Flag leads with high potential value',
  category: 'Value',
  condition: {
    field: 'estimatedValue',
    operator: 'gte',
    value: 2000,
  },
  action: {
    type: 'adjust_score',
    params: { adjustment: 20 },
  },
  priority: 5,
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
};

qualificationService.addRuleSet({
  id: 'custom-rules',
  name: 'Custom Rules',
  description: 'Organization-specific qualification rules',
  insuranceType: 'all',
  rules: [customRule],
  isActive: true,
  priority: 10,
});
```

## Integration Points

### With Lead Ingestion

Leads can be automatically scored upon ingestion:

```typescript
// In lead ingestion worker
import { LeadScoringService } from '@insurance-lead-gen/orchestrator';

const scoringService = new LeadScoringService();

async function processLead(leadData: LeadBasicInfo) {
  // Score the lead
  const scoreResult = await scoringService.scoreLead(leadData);
  
  // Update lead with score
  await leadRepository.updateLead(leadData.id, {
    qualityScore: scoreResult.normalizedScore,
    status: scoreResult.qualificationLevel === 'unqualified' 
      ? 'rejected' 
      : 'qualified',
  });
}
```

### With Routing Service

The scoring results can be used to prioritize agent routing:

```typescript
// In routing service
const qualifiedLeads = await leadRepository.getLeadsByScoreRange(75, 100);
const leadsToRoute = await prioritizeLeadsForRouting(qualifiedLeads);
```

### With Analytics

Scoring results can be tracked for analytics:

```typescript
// Track scoring events
await analyticsClient.post('/api/v1/analytics/track/event', {
  eventType: 'lead_scored',
  data: {
    leadId: result.leadId,
    score: result.normalizedScore,
    qualificationLevel: result.qualificationLevel,
    insuranceType: result.primaryInsuranceType,
  },
});
```

## Files Created/Modified

### New Files

1. **packages/types/src/scoring.ts**
   - Lead scoring and qualification type definitions
   - Insurance-type specific data structures
   - Scoring configuration interfaces
   - API request/response types

2. **apps/orchestrator/src/scoring/lead-scoring.service.ts**
   - LeadScoringService class
   - Insurance-type specific scoring logic
   - Dimension-based scoring algorithm
   - Scoring configuration management

3. **apps/orchestrator/src/scoring/qualification.service.ts**
   - LeadQualificationService class
   - Rule-based qualification engine
   - Default rule sets for all insurance types
   - Qualification detail calculations

4. **apps/orchestrator/src/scoring/index.ts**
   - Exports for scoring services

5. **apps/api/src/routes/scoring.ts**
   - API endpoints for scoring operations
   - Batch processing endpoints

### Modified Files

1. **packages/types/src/index.ts**
   - Added scoring module exports

2. **apps/api/src/app.ts**
   - Added scoring routes import and middleware

## Configuration

### Environment Variables

No additional environment variables required for scoring service.

### Custom Configuration

```typescript
import { LeadScoringService } from '@insurance-lead-gen/orchestrator';

const scoringService = new LeadScoringService({
  weights: {
    auto: {
      contactCompleteness: 0.20,
      engagementLevel: 0.30,
      budgetAlignment: 0.15,
      timelineUrgency: 0.15,
      insuranceKnowledge: 0.10,
      competitivePosition: 0.10,
    },
    // ... other types
  },
  thresholds: {
    hot: 80,
    warm: 60,
    cold: 40,
  },
});
```

## Testing

### Unit Tests

```typescript
describe('LeadScoringService', () => {
  describe('scoreLead', () => {
    it('should score auto insurance lead correctly', async () => {
      const service = new LeadScoringService();
      const result = await service.scoreLead(
        {
          id: 'lead_123',
          source: 'website',
          email: 'test@example.com',
          firstName: 'John',
          lastName: 'Doe',
          insuranceType: 'auto',
        },
        {
          year: 2022,
          make: 'Toyota',
          model: 'Camry',
          ownership: 'owned',
          currentCoverage: true,
          accidentsLast5Years: 0,
          violationsLast3Years: 0,
          annualMileage: 12000,
          primaryUse: 'commute',
        }
      );
      
      expect(result.normalizedScore).toBeGreaterThanOrEqual(70);
      expect(result.qualificationLevel).toBe('hot');
    });
  });
});
```

## Performance Considerations

- **Batch Processing**: Use batch endpoints for processing multiple leads
- **Caching**: Consider caching scoring configurations
- **Async Processing**: For high-volume scenarios, use message queues

## Future Enhancements

1. **ML-Based Scoring**: Integrate ML models for predictive scoring
2. **A/B Testing**: Support for scoring variant testing
3. **Custom Dimensions**: Allow organizations to add custom scoring dimensions
4. **Lead Enrichment Integration**: Auto-enrich leads before scoring
5. **Real-time Updates**: WebSocket support for real-time scoring updates
