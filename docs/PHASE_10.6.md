# Phase 10.6: Broker Network - Network Effects and Scale

## Overview

Phase 10.6 implements a comprehensive broker network system with network effects analysis, referral tracking, and scaling capabilities. This enables insurance brokers to build valuable professional networks, track referrals, and leverage network effects for business growth.

## Features Implemented

### 1. Broker Network Profile Management
- **Network Tiers**: Bronze, Silver, Gold, Platinum, Diamond
- **Network Score**: Calculated based on connections, referrals, and value generated
- **Referral Multiplier**: Boosts based on network size and performance
- **Network Value**: Tracks direct and indirect value from network connections

### 2. Broker Connections
- **Relationship Types**:
  - Direct Referral
  - Cross Referral
  - Mentorship
  - Partnership
  - Team Member
  - Team Leader
  - Network Member
- **Connection Strength**: 0-1 scale indicating relationship quality
- **Active/Inactive Status**: Track and manage connection states
- **Referral Tracking**: Count referrals between connections
- **Revenue Tracking**: Track revenue generated through each connection

### 3. Broker Referrals
- **Referral Workflow**: Pending → Accepted → Converted/Declined/Expired
- **Commission Tracking**: Set commission rates and track amounts
- **Commission Splits**: Support for multi-broker commission distribution
- **Referral Expiration**: Time-bound referral opportunities
- **Referral Reasons and Notes**: Document referral context

### 4. Network Effects Calculator
- **Referral Multiplier**: Calculate based on network tier and size
- **Network Score**: Comprehensive scoring algorithm
- **Network Reach**: Calculate reachable brokers at multiple levels (1-3 degrees)
- **Growth Metrics**: Track network growth over time (week, month, quarter)
- **Network Value Calculation**: Direct, second-level, and third-level value

### 5. Network Analytics
- **Network Leaderboard**: Top-performing brokers by network score
- **Network Effectiveness Analysis**: Detailed metrics and recommendations
- **Growth Predictions**: AI-powered predictions for network growth
- **Network Effect Tracking**: Record and analyze network effects

### 6. Commission Management
- **Commission Splits**: Distribute commissions across multiple brokers
- **Status Tracking**: Pending → Processed → Paid
- **Processing and Payment Dates**: Track commission lifecycle

## Database Schema

### New Models

#### BrokerNetwork
```prisma
model BrokerNetwork {
  id                  String      @id @default(uuid())
  brokerId            String      @unique
  networkTier         NetworkTier @default(BRONZE)
  totalConnections    Int         @default(0)
  activeConnections   Int         @default(0)
  networkValue        Float       @default(0.0)
  networkScore        Float       @default(0.0)
  referralMultiplier  Float       @default(1.0)
  createdAt           DateTime    @default(now())
  updatedAt           DateTime    @updatedAt
  broker              Agent       @relation(fields: [brokerId], references: [id], onDelete: Cascade)
}
```

#### BrokerConnection
```prisma
model BrokerConnection {
  id                  String                @id @default(uuid())
  brokerId            String
  connectedBrokerId   String
  relationshipType    BrokerRelationshipType
  strength            Float                 @default(0.5)
  isActive            Boolean               @default(true)
  referralCount       Int                   @default(0)
  revenueGenerated    Float                 @default(0.0)
  lastReferralAt      DateTime?
  createdAt           DateTime              @default(now())
  updatedAt           DateTime              @updatedAt
  broker              Agent                 @relation("BrokerConnections", fields: [brokerId], references: [id], onDelete: Cascade)
  connectedBroker     Agent                 @relation("ConnectedTo", fields: [connectedBrokerId], references: [id], onDelete: Cascade)
  @@unique([brokerId, connectedBrokerId])
}
```

#### BrokerReferral
```prisma
model BrokerReferral {
  id                  String              @id @default(uuid())
  leadId              String
  referringBrokerId   String
  receivingBrokerId   String
  status              ReferralStatus      @default(PENDING)
  commissionRate      Float
  commissionAmount    Float?
  referralReason      String?
  notes               String?             @db.Text
  expiresAt           DateTime?
  convertedAt         DateTime?
  createdAt           DateTime            @default(now())
  updatedAt           DateTime            @updatedAt
  referringBroker     Agent               @relation("ReferralsSent", fields: [referringBrokerId], references: [id], onDelete: Cascade)
  receivingBroker     Agent               @relation("ReferralsReceived", fields: [receivingBrokerId], references: [id], onDelete: Cascade)
}
```

#### BrokerTeam
```prisma
model BrokerTeam {
  id                  String      @id @default(uuid())
  teamLeaderId        String
  teamName            String
  totalLeads          Int         @default(0)
  totalConversions    Int         @default(0)
  totalRevenue        Float       @default(0.0)
  createdAt           DateTime    @default(now())
  updatedAt           DateTime    @updatedAt
  teamLeader          Agent       @relation(fields: [teamLeaderId], references: [id], onDelete: Cascade)
  members             BrokerTeamMember[]
}
```

#### CommissionSplit
```prisma
model CommissionSplit {
  id              String            @id @default(uuid())
  referralId      String
  brokerId        String
  splitPercentage Float
  amount          Float
  status          CommissionStatus  @default(PENDING)
  processedAt     DateTime?
  paidAt          DateTime?
  createdAt       DateTime          @default(now())
  updatedAt       DateTime          @updatedAt
  broker          Agent             @relation(fields: [brokerId], references: [id], onDelete: Cascade)
}
```

#### NetworkEffect
```prisma
model NetworkEffect {
  id                String              @id @default(uuid())
  sourceBrokerId    String
  affectedBrokerId  String
  effectType        NetworkEffectType
  value             Float
  description       String              @db.Text
  timestamp         DateTime            @default(now())
  metadata          Json?
  sourceBroker      Agent               @relation("NetworkEffectsSource", fields: [sourceBrokerId], references: [id], onDelete: Cascade)
  affectedBroker    Agent               @relation("NetworkEffectsAffected", fields: [affectedBrokerId], references: [id], onDelete: Cascade)
}
```

## API Endpoints

### Profile Management

#### Get Broker Profile
```
GET /api/broker-network/profile/:brokerId
```

Returns the broker's network profile including tier, score, and metrics.

#### Create/Get Profile
Profile is auto-created on first access if it doesn't exist.

### Connections

#### Get Connections
```
GET /api/broker-network/connections/:brokerId?isActive=true&relationshipType=direct_referral
```

Query parameters:
- `isActive`: Filter by connection status (true/false)
- `relationshipType`: Filter by relationship type

#### Create Connection
```
POST /api/broker-network/connections
Content-Type: application/json

{
  "brokerId": "broker-123",
  "connectedBrokerId": "broker-456",
  "relationshipType": "direct_referral",
  "message": "Would like to connect"
}
```

#### Update Connection
```
PATCH /api/broker-network/connections/:id
Content-Type: application/json

{
  "strength": 0.8,
  "isActive": true
}
```

### Referrals

#### Get Referrals
```
GET /api/broker-network/referrals/:brokerId?type=all
```

Returns both sent and received referrals.

#### Create Referral
```
POST /api/broker-network/referrals
Content-Type: application/json

{
  "referringBrokerId": "broker-123",
  "leadId": "lead-789",
  "receivingBrokerId": "broker-456",
  "commissionRate": 0.15,
  "referralReason": "Outside my service area",
  "notes": "Client is in the northeast region",
  "expiresAt": "2024-02-01T00:00:00Z"
}
```

#### Update Referral Status
```
PATCH /api/broker-network/referrals/:id/status
Content-Type: application/json

{
  "status": "converted",
  "commissionAmount": 1500.00
}
```

Valid statuses: `accepted`, `converted`, `declined`, `expired`

### Metrics and Analytics

#### Get Network Metrics
```
GET /api/broker-network/metrics/:brokerId?startDate=2024-01-01&endDate=2024-01-31
```

Returns comprehensive network metrics for the specified period.

#### Calculate Network Value
```
GET /api/broker-network/value/:brokerId
```

Returns network value breakdown including direct, second-level, and third-level contributions.

#### Get Referral Multiplier
```
GET /api/broker-network/multiplier/:brokerId
```

Returns the broker's current referral multiplier (1.0x - 2.0x).

#### Get Network Score
```
GET /api/broker-network/score/:brokerId
```

Returns the broker's calculated network score.

#### Calculate Network Reach
```
GET /api/broker-network/reach/:brokerId?maxDepth=3
```

Returns total reachable brokers and breakdown by network depth.

#### Get Growth Metrics
```
GET /api/broker-network/growth/:brokerId?period=month
```

Period options: `week`, `month`, `quarter`

### Analytics and Insights

#### Get Network Leaderboard
```
GET /api/broker-network/leaderboard?limit=20
```

Returns top-performing brokers ranked by network score.

#### Analyze Network Effectiveness
```
GET /api/broker-network/effectiveness/:brokerId
```

Returns detailed effectiveness analysis including:
- Overall score (0-100)
- Connection quality
- Referral efficiency
- Network leverage
- Growth rate
- Recommendations for improvement

#### Predict Network Growth
```
GET /api/broker-network/prediction/:brokerId?months=6
```

Returns AI-powered growth predictions for 1-24 months with confidence scores.

### Admin Endpoints

#### Recalculate All Scores
```
POST /api/broker-network/recalculate-scores
```

Admin endpoint to recalculate network scores for all brokers.

## Scoring Algorithm

### Network Score Calculation

The network score is calculated using a weighted formula:

```
Network Score = (Connection Score × 0.30) + (Value Score × 0.40) + (Referral Score × 0.30)
```

Where:
- **Connection Score**: `Active Connections × 10`
- **Value Score**: `Network Value / 1000`
- **Referral Score**: `Active Connections × Referral Multiplier × 5`

### Network Tier Determination

- **Diamond**: Score ≥ 500
- **Platinum**: Score ≥ 300
- **Gold**: Score ≥ 150
- **Silver**: Score ≥ 75
- **Bronze**: Score < 75

### Referral Multiplier

```
Base Multiplier: 1.0
Connection Bonus: min(Active Connections × 0.02, 0.30)
Tier Bonus: Based on tier (0.0 - 0.20)
Total Multiplier: min(Base + Connection Bonus + Tier Bonus, 2.0)
```

Tier Bonuses:
- Bronze: 0.0
- Silver: 0.05
- Gold: 0.10
- Platinum: 0.15
- Diamond: 0.20

### Network Value Calculation

```
Direct Value: Σ(Connection Revenue)
Second Level: Σ(Second Level Connections Revenue × 0.30)
Third Level: Σ(Third Level Connections Revenue × 0.10)
Total Value: Direct + Indirect
Network Multiplier: 1 + (Active Connections × 0.10) + (Indirect Value / Direct Value × 0.05)
```

## Network Effects Types

### Referral Boost
Generated when a referral is converted, creating value for both the referring and receiving broker.

### Knowledge Sharing
When brokers exchange insights, best practices, or expertise.

### Resource Sharing
When brokers share tools, templates, or other resources.

### Market Expansion
When network connections lead to new market opportunities.

## Use Cases

### 1. Building a Broker Network
1. Broker creates profile (auto-created on first access)
2. Broker adds connections to other brokers
3. Set relationship types and connection strengths
4. Track referrals and revenue through connections
5. Network score grows as connections become active

### 2. Referral Process
1. Broker receives lead outside their expertise/service area
2. Creates referral to appropriate broker
3. Sets commission rate and expiration
4. Receiving broker accepts/declines
5. If converted, commission is tracked and split
6. Network effect is recorded

### 3. Network Growth Tracking
1. Monitor network metrics over time
2. Analyze effectiveness and get recommendations
3. View predictions for future growth
4. Compare with leaderboard to gauge performance

### 4. Commission Management
1. Set commission rates on referrals
2. Track conversion and commission amounts
3. Create commission splits for multiple brokers
4. Process and track payment status

## Benefits

### For Individual Brokers
- **Increased Revenue**: Referral multiplier boosts earnings
- **Professional Network**: Build valuable business relationships
- **Market Expansion**: Reach new markets through network
- **Performance Tracking**: Detailed analytics and insights
- **Competitive Advantage**: Higher network tiers provide benefits

### For the Platform
- **Network Effects**: Platform value grows with network size
- **Retention**: Brokers with larger networks stay longer
- **Growth**: Network effects drive organic growth
- **Data Richness**: Network data provides valuable insights
- **Competitive Moat**: Strong network creates barriers to entry

## Technical Implementation

### Files Created

1. **Type Definitions**
   - `packages/types/src/broker-network.ts` - All broker network types

2. **Database Schema**
   - `prisma/schema.prisma` - Extended with 6 new models

3. **Repository Layer**
   - `apps/data-service/src/services/broker-network-repository.ts` - Data access layer

4. **Business Logic**
   - `apps/data-service/src/services/network-effects-calculator.ts` - Network effects calculations

5. **API Routes**
   - `apps/data-service/src/routes/broker-network.routes.ts` - Data service routes
   - `apps/api/src/routes/broker-network.ts` - API proxy routes

6. **Documentation**
   - `docs/PHASE_10.6.md` - This document

### Files Modified

1. **Type Exports**
   - `packages/types/src/index.ts` - Added broker-network exports

2. **Data Service**
   - `apps/data-service/src/index.ts` - Registered broker network routes

3. **API Service**
   - `apps/api/src/app.ts` - Registered broker network routes

## Future Enhancements

### Phase 10.7 Planned Features
- Automated referral matching based on network
- Network-based lead routing optimization
- Broker collaboration tools
- Network-wide analytics dashboards
- Social proof and reputation systems

### Advanced Features
- Graph-based network visualization
- AI-powered connection recommendations
- Network-wide commission pools
- Broker marketplace features
- Network gamification and rewards

## Testing

### Unit Tests
```bash
# Test repository
npm test -- broker-network-repository.test.ts

# Test calculator
npm test -- network-effects-calculator.test.ts
```

### Integration Tests
```bash
# Test API endpoints
npm test -- broker-network.routes.test.ts
```

## Performance Considerations

### Caching
- Network profiles should be cached in Redis
- Leaderboard calculations should be cached and updated periodically
- Network scores can be calculated in background jobs

### Database Optimization
- Indexes on frequently queried fields (brokerId, status, createdAt)
- Consider materialized views for complex analytics queries
- Partition by date for high-volume tables (referrals, network effects)

### Background Jobs
- Network score recalculation (scheduled)
- Network value calculation (async)
- Leaderboard generation (cached)

## Security Considerations

- Brokers can only view their own profiles and connections
- Commission amounts are sensitive data - proper access controls
- Rate limiting on network effect calculations
- Validate relationship types and commission rates
- Audit trail for all commission transactions

## Monitoring

### Key Metrics to Track
- Number of active connections
- Referral conversion rate
- Network score distribution
- Commission payout amounts
- Network growth rate
- Leaderboard turnover rate

### Alerts
- Unusual referral patterns
- Commission calculation errors
- Network score anomalies
- Failed connection attempts

## Conclusion

Phase 10.6 successfully implements a comprehensive broker network system with network effects, referral tracking, and scaling capabilities. The system provides brokers with tools to build valuable professional networks while creating powerful network effects that benefit the entire platform.

The multi-tier network scoring system incentivizes brokers to grow and nurture their connections, while the referral multiplier provides tangible benefits for network activity. Network analytics and predictions help brokers understand and optimize their network strategies.

This implementation lays the foundation for continued platform growth through network effects, creating a competitive advantage and barriers to entry for competitors.
