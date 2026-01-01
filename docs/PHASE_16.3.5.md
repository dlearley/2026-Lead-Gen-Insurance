# Phase 16.3.5: Competitive Intelligence Platform

## Overview

The Competitive Intelligence Platform provides comprehensive monitoring and analysis of competitors to help sales, product, and executive teams make data-driven strategic decisions. The platform monitors 50+ competitors across multiple data sources, provides real-time alerts, and generates actionable insights.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Data Collection Layer                    │
├─────────────────────────────────────────────────────────────┤
│  Web Scraper  │  News API  │  Social Media  │  Review Sites│
└───────────────┴────────────┴────────────────┴──────────────┘
                              │
                              ↓
┌─────────────────────────────────────────────────────────────┐
│               Competitor Monitoring Pipeline                 │
│  - Scheduled scans (website, news, pricing)               │
│  - Change detection and analysis                           │
│  - Automatic activity and alert generation                 │
└─────────────────────────────────────────────────────────────┘
                              │
                              ↓
┌─────────────────────────────────────────────────────────────┐
│           Competitive Intelligence Service                  │
│  - Data management (competitors, activities, pricing)      │
│  - Win/loss analysis and insights generation              │
│  - Threat/opportunity scoring                             │
│  - SWOT and market positioning analysis                    │
└─────────────────────────────────────────────────────────────┘
                              │
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                    API Layer                                │
│  RESTful endpoints for all competitive intelligence data   │
└─────────────────────────────────────────────────────────────┘
                              │
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                   Frontend Dashboards                       │
│  Executive  │  Sales  │  Product  │  Marketing              │
└─────────────────────────────────────────────────────────────┘
```

## Database Schema

### Core Models

#### Competitor
- Basic information (name, website, industry)
- Classification (tier, category, monitoring level)
- Scoring (threat score, opportunity score)
- Monitoring timestamps (last scans)
- Relations: activities, pricing, win/losses, alerts, insights, battle cards

#### CompetitorActivity
- Activity tracking (type, title, description, source)
- Severity and impact classification
- Detection timestamp
- Relations: competitor

#### WinLoss
- Deal tracking (outcome, amount, duration)
- Reasons and factors (price, features, relationship, timing)
- Competitor and company analysis
- Relations: competitor

#### PricingData
- Pricing information (monthly, annual, tiers)
- Features and limitations
- Discount and trial information
- Relations: competitor

#### MarketShare
- Market and vertical data
- Customer counts and revenue estimates
- Growth and churn metrics
- Relations: competitor

#### CompetitiveAlert
- Alert classification (type, severity, status)
- Recommendations and target audiences
- Acknowledgment tracking
- Relations: competitor

#### CompetitiveInsight
- Insight generation (type, priority, impact)
- Data sources and confidence scores
- Recommendations and target teams
- Relations: competitor

#### BattleCard
- Sales battle card content
- Strengths, weaknesses, talking points
- Objection handling
- Relations: competitor

### Key Enums

- **CompetitorTier**: PRIMARY, SECONDARY, EMERGING, ADJACENT
- **ActivityType**: FEATURE_LAUNCH, PRICING_CHANGE, FUNDING_ANNOUNCEMENT, etc.
- **WinLossReason**: PRICE, FEATURES, RELATIONSHIP, TIMING, etc.
- **AlertSeverity**: CRITICAL, HIGH, MEDIUM, LOW
- **AlertStatus**: ACTIVE, ACKNOWLEDGED, IN_PROGRESS, RESOLVED, DISMISSED

## API Endpoints

### Competitors
- `POST /api/competitive-intelligence/competitors` - Create competitor
- `GET /api/competitive-intelligence/competitors/:id` - Get competitor details
- `GET /api/competitive-intelligence/competitors` - List competitors
- `PUT /api/competitive-intelligence/competitors/:id` - Update competitor
- `DELETE /api/competitive-intelligence/competitors/:id` - Delete competitor
- `POST /api/competitive-intelligence/competitors/:id/threat-score` - Calculate threat score
- `POST /api/competitive-intelligence/competitors/:id/opportunity-score` - Calculate opportunity score

### Activities
- `POST /api/competitive-intelligence/activities` - Create activity
- `GET /api/competitive-intelligence/activities` - List activities

### Win/Loss
- `POST /api/competitive-intelligence/win-loss` - Create win/loss record
- `GET /api/competitive-intelligence/win-loss/analysis` - Get win/loss analysis

### Pricing
- `POST /api/competitive-intelligence/pricing` - Create pricing data
- `GET /api/competitive-intelligence/pricing/:competitorId` - Get pricing history
- `POST /api/competitive-intelligence/pricing/compare` - Compare pricing

### Market Share
- `POST /api/competitive-intelligence/market-share` - Create market share data
- `GET /api/competitive-intelligence/market-share/trends` - Get market share trends

### Alerts
- `POST /api/competitive-intelligence/alerts` - Create alert
- `GET /api/competitive-intelligence/alerts` - List alerts
- `PUT /api/competitive-intelligence/alerts/:id` - Update alert
- `POST /api/competitive-intelligence/alerts/:id/acknowledge` - Acknowledge alert

### Insights
- `POST /api/competitive-intelligence/insights` - Create insight
- `GET /api/competitive-intelligence/insights` - List insights

### Battle Cards
- `POST /api/competitive-intelligence/battle-cards` - Create battle card
- `GET /api/competitive-intelligence/battle-cards/:competitorId` - Get battle card
- `PUT /api/competitive-intelligence/battle-cards/:id` - Update battle card

### Analysis
- `POST /api/competitive-intelligence/analysis/swot/:competitorId` - Generate SWOT
- `GET /api/competitive-intelligence/analysis/positioning/:competitorId` - Get positioning

### Dashboards
- `GET /api/competitive-intelligence/dashboard/executive` - Executive dashboard
- `GET /api/competitive-intelligence/dashboard/sales` - Sales dashboard

## Data Collection

### Web Scraping

The web scraper monitors competitor websites for:
- **Pricing Changes**: Automatic detection of price changes with percentage calculations
- **Feature Updates**: New feature launches and announcements
- **Content Changes**: Website content modifications and additions

**Selectors** (configurable):
- Pricing: `.pricing`, `.plans`, `.pricing-table`, `.price-card`
- Features: `.features`, `.feature-list`, `.capabilities`
- Announcements: `.news`, `.announcements`, `.blog`, `.press-releases`

### News Monitoring

Monitors multiple news sources for competitor mentions:
- **RSS Feeds**: TechCrunch, VentureBeat, Wired, Business Insider, Reuters
- **News API**: Configurable with API key
- **Web Scraping**: Custom source parsing

**Article Classification**:
- Funding announcements
- Feature launches
- Hiring expansion
- Partnerships
- Acquisitions
- Market entry
- Executive changes

### Pricing Intelligence

Tracks competitor pricing over time:
- Monthly/annual pricing
- Different tiers and plans
- Features and limitations
- Discount and trial availability
- Historical pricing trends

**Change Detection**:
- Alerts for >10% price changes
- Critical alerts for >20% price changes
- Competitive comparison analysis

## Scoring Algorithms

### Threat Score (0-100)

```
Threat Score = (Recent Activity × 0.30) +
              (Market Movement × 0.30) +
              (Win/Loss Trend × 0.20) +
              (Funding/Resources × 0.20)
```

**Components**:
- **Recent Activity (30%)**: Frequency and significance of recent competitor activities
- **Market Movement (30%)**: Market share changes, expansion, and growth
- **Win/Loss Trend (20%)**: Our win rate against this competitor
- **Funding/Resources (20%)**: Funding amount, hiring, resource accumulation

**Thresholds**:
- 80-100: Critical (immediate attention required)
- 60-79: High (significant threat)
- 40-59: Medium (moderate concern)
- 0-39: Low (minimal threat)

### Opportunity Score (0-100)

```
Opportunity Score = (Competitor Weakness × 0.40) +
                   (Market Gap × 0.30) +
                   (Customer Sentiment × 0.30)
```

**Components**:
- **Competitor Weakness (40%)**: Identified weaknesses and customer complaints
- **Market Gap (30%)**: Unmet market needs the competitor isn't addressing
- **Customer Sentiment (30%)**: Negative reviews and feedback

**Thresholds**:
- 70-100: High opportunity (prioritize pursuit)
- 40-69: Medium opportunity (consider)
- 0-39: Low opportunity (monitor)

## Monitoring Pipeline

### Scheduled Jobs

1. **Website Monitoring** (Daily):
   - Scrape competitor websites
   - Detect content changes
   - Extract pricing and features
   - Generate activities and alerts

2. **News Monitoring** (Every 12 hours):
   - Fetch latest news from sources
   - Filter for competitor mentions
   - Classify and score articles
   - Generate activities and alerts

3. **Pricing Checks** (Daily):
   - Monitor pricing page changes
   - Compare with historical data
   - Detect significant changes
   - Generate pricing alerts

4. **Win/Loss Analysis** (Weekly):
   - Analyze recent deals
   - Identify patterns and trends
   - Generate insights
   - Update threat/opportunity scores

### Alert Prioritization

**Critical Alerts**:
- New major feature launch
- Price drop >20%
- Major funding round
- Hostile win pattern detected
- Aggressive expansion into our markets

**High Alerts**:
- New feature announcement
- Price drop 10-20%
- New vertical entry
- Significant hiring expansion
- Customer win announcements

**Medium Alerts**:
- Pricing adjustments
- Feature updates
- New partnerships
- Content changes

**Low Alerts**:
- News mentions
- Social media activity
- Minor website updates

## Win/Loss Analysis

### Data Capture

Essential fields for every deal:
- **Outcome**: WON, LOST, TIED, NO_DECISION
- **Competitor**: Which competitor was faced (if lost)
- **Primary Reason**: Main factor (PRICE, FEATURES, RELATIONSHIP, etc.)
- **Secondary Reason**: Contributing factor
- **Deal Amount**: Revenue impact
- **Deal Duration**: Sales cycle length
- **Vertical/Industry**: Market segment
- **Buying Criteria**: What the customer valued
- **Competitor Strengths/Weaknesses**: Competitive analysis
- **Our Strengths/Weaknesses**: Self-assessment
- **Customer Feedback**: Direct quotes
- **Lessons Learned**: Actionable takeaways

### Analysis Outputs

1. **Win Rate by Competitor**: Who we win against most
2. **Win Rate by Vertical**: Performance by market segment
3. **Win/Loss Reasons**: Common patterns
4. **Average Deal Size & Duration**: Benchmarking
5. **Competitor Strengths**: What they do well
6. **Feature Gaps**: Missing capabilities

## Battle Cards

### Battle Card Structure

Each battle card includes:
- **Overview**: Company description and positioning
- **Strengths**: What they do well
- **Weaknesses**: Areas we can exploit
- **Typical Objections**: Common customer concerns
- **Objection Responses**: How to handle each objection
- **Win Strategies**: Tactics to beat them
- **Talking Points**: Key messages
- **Proof Points**: Data and evidence
- **Deal Size Range**: Typical deal size
- **Sales Cycle**: Expected duration
- **Key Decision Makers**: Who makes the decisions
- **Pricing Position**: Price relative to us
- **Target Customers**: Who they sell to
- **Vertical Focus**: Where they're strongest
- **Recent Moves**: Latest developments
- **Action Items**: What to do in deals

### Usage

- **Before Calls**: Review competitor's battle card
- **During Calls**: Use talking points and objection responses
- **After Calls**: Update with new information
- **Weekly Review**: Refresh with latest intelligence

## Dashboards

### Executive Dashboard

**Metrics**:
- Total and active competitors
- Market share summary
- Competitive win rate trends
- Overall threat level
- Recent key developments
- Top threats requiring attention
- Strategic opportunities

**Use Cases**:
- Strategic planning
- Resource allocation
- Market positioning review
- Competitive landscape overview

### Sales Dashboard

**Metrics**:
- Current competitive deals
- Win rate vs. specific competitors
- Competitor strengths and weaknesses
- Recent win/loss reasons
- Competitive strategies by vertical
- Deal acceleration tactics

**Use Cases**:
- Deal preparation
- Competitive positioning
- Objection handling
- Pricing discussions

### Product Dashboard

**Metrics**:
- Feature comparison matrix
- Feature gaps vs. competitors
- Roadmap priorities based on competition
- Competitive advantages
- Customer feedback on alternatives

**Use Cases**:
- Roadmap prioritization
- Feature development planning
- Competitive differentiation
- Product positioning

### Marketing Dashboard

**Metrics**:
- Competitive positioning analysis
- Messaging effectiveness
- Market opportunity sizing
- Vertical market trends
- Competitive coverage gaps

**Use Cases**:
- Campaign planning
- Messaging development
- Market segmentation
- Competitive positioning

## Integration Points

### CRM Integration

1. **Competitor Field on Opportunities**: Track which competitor is faced
2. **Win/Loss Reason Field**: Capture outcome and reason
3. **Competitive Intelligence Section**: Show relevant intel in deal context
4. **Alert Notifications**: Alert when monitoring detects relevant changes
5. **Battle Card Access**: Quick access to competitor battle cards

**Salesforce Integration**:
- Custom fields on Opportunity object
- Related lists for activities and alerts
- Custom component for battle cards
- Chatter posts for alerts

### Sales Enablement

1. **Battle Cards**: Easy access in sales tools
2. **Competitive Call Scripts**: Talk tracks by scenario
3. **Objection Handling Guides**: Quick reference
4. **Competitive Proof Points**: Evidence and case studies
5. **Deal Acceleration Tactics**: How to win faster

### Reporting Automation

1. **Weekly Competitive Brief**: Email summary of key developments
2. **Monthly Competitive Report**: Comprehensive analysis
3. **Quarterly Competitive Review**: Strategic deep-dive
4. **Win/Loss Reports**: Pattern analysis and recommendations
5. **Threat Assessment Reports**: Risk evaluation

## Configuration

### Monitoring Configuration

```typescript
{
  websiteScanIntervalHours: 24,
  newsCheckIntervalHours: 12,
  pricingCheckIntervalHours: 24,
  batchCompetitorIds?: string[]
}
```

### News Sources

```typescript
{
  competitorKeywords: string[],
  sources: NewsSource[],
  excludeKeywords?: string[],
  maxArticlesPerSource?: number,
  lookbackDays?: number
}
```

### Web Scraping Selectors

```typescript
{
  url: string,
  selectors: {
    pricing?: string,
    features?: string,
    plans?: string,
    content?: string,
    announcements?: string
  }
}
```

## Best Practices

### Data Quality

1. **Regular Review**: Periodically review and validate data
2. **Source Verification**: Cross-reference information from multiple sources
3. **Confidence Tracking**: Note data confidence levels
4. **Update Timestamps**: Track when data was last verified

### Alert Management

1. **Review Daily**: Address critical and high alerts promptly
2. **Acknowledge Alerts**: Mark as reviewed to avoid noise
3. **Document Actions**: Record what actions were taken
4. **Tune Thresholds**: Adjust alert sensitivity based on feedback

### Win/Loss Analysis

1. **Capture All Deals**: Aim for 80%+ capture rate
2. **Be Honest**: Accurate reporting is critical for analysis
3. **Document Reasons**: Be specific about why deals were won/lost
4. **Share Learnings**: Distribute insights to relevant teams

### Competitive Positioning

1. **Know Your Strengths**: Understand where you win
2. **Know Their Weaknesses**: Exploit competitor vulnerabilities
3. **Differentiate Clearly**: Have a unique value proposition
4. **Adapt Quickly**: Respond to competitive moves

## Success Metrics

- **Competitor Coverage**: 50+ competitors monitored
- **Data Accuracy**: 90%+ accuracy in pricing, features, market position
- **Alert Quality**: 80%+ relevant alerts (low false positive rate)
- **Alert Timeliness**: 95%+ of significant changes detected within 24 hours
- **Win/Loss Capture**: 80%+ of deals have win/loss reason documented
- **Competitive Win Rate**: 35%+ when armed with competitive intelligence
- **Deal Cycle Acceleration**: 20%+ faster deals when competitive threats identified
- **Sales Adoption**: 85%+ of sales team using competitive intelligence
- **Revenue Impact**: 10%+ improvement in deal velocity from competitive insights
- **Product Impact**: 5+ roadmap items influenced by competitive intelligence
- **Market Share**: 5%+ in focused verticals despite competition
- **Churn Prevention**: 30%+ reduction in competitive churn

## Getting Started

### 1. Initialize Competitors

```bash
# Run the seed script to add initial competitors
npm run seed-competitors
```

### 2. Configure Monitoring

Update monitoring configuration in `.env`:
```env
MONITORING_ENABLED=true
WEBSITE_SCAN_INTERVAL_HOURS=24
NEWS_CHECK_INTERVAL_HOURS=12
PRICING_CHECK_INTERVAL_HOURS=24
NEWS_API_KEY=your_api_key_here
```

### 3. Set Up Web Scraping

Add competitor websites and configure selectors:
```typescript
const competitors = [
  {
    name: 'Competitor A',
    website: 'https://competitor-a.com',
    tier: 'PRIMARY',
    category: 'DIRECT'
  }
];
```

### 4. Configure News Sources

Add RSS feeds and API sources:
```typescript
const newsSources = [
  {
    name: 'TechCrunch',
    type: 'rss',
    url: 'https://techcrunch.com/feed/',
    enabled: true
  }
];
```

### 5. Run Monitoring Pipeline

```bash
# Run full monitoring (website + news + pricing)
npm run monitor-competitors

# Run specific monitoring
npm run monitor-websites
npm run monitor-news
npm run monitor-pricing
```

### 6. Review Alerts and Insights

Access the dashboard to review:
- New alerts and acknowledge as needed
- Generated insights and recommendations
- Updated threat and opportunity scores
- Win/loss analysis results

### 7. Create Battle Cards

For each primary competitor:
1. Gather intel from monitoring
2. Identify strengths and weaknesses
3. Develop win strategies
4. Create objection responses
5. Share with sales team

## Troubleshooting

### Web Scraping Issues

**Problem**: Website scraping returns errors
**Solutions**:
- Check if website is accessible
- Verify selectors match website structure
- Check rate limiting and add delays
- Review user agent headers

### News Monitoring Issues

**Problem**: No news articles found
**Solutions**:
- Verify competitor keywords are correct
- Check news sources are accessible
- Adjust lookback period
- Review filter criteria

### Alert Fatigue

**Problem**: Too many alerts
**Solutions**:
- Adjust alert severity thresholds
- Filter out lower-priority sources
- Fine-tune activity classification
- Update monitoring frequency

### Data Accuracy Issues

**Problem**: Incorrect data detected
**Solutions**:
- Review and update scraping selectors
- Add manual verification for critical data
- Cross-reference multiple sources
- Report false positives to improve algorithms

## Future Enhancements

1. **AI-Powered Analysis**: Use ML to predict competitor moves
2. **Sentiment Analysis**: Enhanced customer sentiment tracking
3. **Predictive Modeling**: Forecast market trends and changes
4. **Automated Battle Cards**: AI-generated battle card content
5. **Integration Expansion**: More CRM and sales tool integrations
6. **Mobile App**: On-the-go competitive intelligence access
7. **Competitor Network Mapping**: Visualize competitive relationships
8. **Real-time Collaboration**: Team-based competitive intelligence sharing
