# Customer Success Metrics & Definitions

## Overview

This document defines all key metrics used to measure customer success, health, and satisfaction. Each metric includes its definition, calculation method, target values, and data sources.

---

## Customer Health Score

### Definition
The Health Score is a composite metric (0-100) that indicates the overall health and likelihood of success for a customer account. It combines engagement, success, satisfaction, and financial factors.

### Calculation

```
Health Score = (Engagement Score × 0.30) +
               (Success Score × 0.30) +
               (Satisfaction Score × 0.20) +
               (Financial Score × 0.20)
```

### Components

#### Engagement Score (0-100, 30% weight)
**Definition**: Measures how actively customers are using the platform.

**Metrics Included**:
- Login frequency (40%)
- Feature adoption rate (30%)
- Time spent in platform (20%)
- Daily active users (10%)

**Calculation**:
```
Engagement Score = (Login Score × 0.40) +
                   (Feature Score × 0.30) +
                   (Time Score × 0.20) +
                   (DAU Score × 0.10)
```

**Data Points**:
- Login Score: (Actual logins / Target logins) × 100
- Feature Score: (Features used / Total features) × 100
- Time Score: (Time spent / Target time) × 100
- DAU Score: (DAU / Total users) × 100

**Target**: 80+
**Data Source**: Platform analytics, Customer Success Platform

---

#### Success Score (0-100, 30% weight)
**Definition**: Measures how well customers are achieving their business objectives and KPIs.

**Metrics Included**:
- KPI achievement rate (40%)
- Goal attainment (30%)
- Time to value (20%)
- Adoption velocity (10%)

**Calculation**:
```
Success Score = (KPI Score × 0.40) +
                (Goal Score × 0.30) +
                (TTV Score × 0.20) +
                (Adoption Score × 0.10)
```

**Data Points**:
- KPI Score: Average of (Actual / Target) for all KPIs × 100
- Goal Score: (Goals achieved / Total goals) × 100
- TTV Score: Inverse score based on time to value
- Adoption Score: (Users adopted / Total users) × 100

**Target**: 75+
**Data Source**: Success plans, Customer Success Platform, Business reviews

---

#### Satisfaction Score (0-100, 20% weight)
**Definition**: Measures customer satisfaction and loyalty.

**Metrics Included**:
- NPS (40%)
- CSAT (30%)
- Ticket satisfaction (20%)
- Complaint count (10% inverted)

**Calculation**:
```
Satisfaction Score = (NPS Score × 0.40) +
                     (CSAT Score × 0.30) +
                     (Ticket Score × 0.20) +
                     (Complaint Score × 0.10)
```

**Data Points**:
- NPS Score: Normalized to 0-100 (NPS + 50) or mapped
- CSAT Score: Average CSAT rating × 20 (for 5-point scale)
- Ticket Score: Average ticket satisfaction × 20
- Complaint Score: 100 - (Complaints × 5, min 0)

**Target**: 80+
**Data Source**: Surveys, Support system, Customer interactions

---

#### Financial Score (0-100, 20% weight)
**Definition**: Measures the financial health and value of the customer.

**Metrics Included**:
- Payment history (40%)
- Renewal intent (30%)
- Expansion revenue (20%)
- Contract compliance (10%)

**Calculation**:
```
Financial Score = (Payment Score × 0.40) +
                   (Renewal Score × 0.30) +
                   (Expansion Score × 0.20) +
                   (Compliance Score × 0.10)
```

**Data Points**:
- Payment Score: (On-time payments / Total payments) × 100
- Renewal Score: Executive survey or qualitative assessment
- Expansion Score: (Expansion revenue / Base revenue) × 100 (capped at 100)
- Compliance Score: (Terms met / Total terms) × 100

**Target**: 90+
**Data Source**: Billing system, Customer Success Platform, Executive feedback

---

### Health Score Interpretation

| Score Range | Health Level | Status | Action Required |
|-------------|--------------|--------|-----------------|
| 80-100 | Green (Excellent) | Healthy | Maintain current engagement, monitor for changes |
| 60-79 | Yellow (Good) | At Risk | Increase touchpoints, identify issues, develop action plan |
| 0-59 | Red (Poor) | Critical | Immediate escalation, recovery plan, executive engagement |

### Update Frequency
- **Real-time alerts**: For significant changes (>10 points)
- **Daily calculation**: For all accounts
- **Weekly review**: For trend analysis
- **Monthly reporting**: For executive dashboards

---

## Customer Satisfaction Metrics

### Net Promoter Score (NPS)

**Definition**: Measures customer loyalty and likelihood to recommend.

**Question**: "On a scale of 0-10, how likely are you to recommend [Company] to a colleague or friend?"

**Calculation**:
```
NPS = % Promoters (9-10) - % Detractors (0-6)
Passives = 7-8 (not included in calculation)
```

**Scoring**:
- Promoters (9-10): Loyal enthusiasts
- Passives (7-8): Satisfied but unenthusiastic
- Detractors (0-6): Unhappy customers

**Targets**:
- **Overall NPS**: > 50 (Excellent), > 30 (Good), > 0 (Average)
- **Enterprise NPS**: > 60
- **Mid-Market NPS**: > 50
- **Small Business NPS**: > 40

**Survey Frequency**:
- Quarterly for paid customers
- Monthly for new customers (first 90 days)
- After major interactions (support tickets, business reviews)

**Data Source**: Survey tool (Qualtrics, SurveyMonkey, etc.)

---

### Customer Satisfaction Score (CSAT)

**Definition**: Measures immediate customer satisfaction with specific interactions or features.

**Question**: "How satisfied were you with [specific interaction/feature]?"

**Scale**: 1-5 stars or Very Dissatisfied to Very Satisfied

**Calculation**:
```
CSAT = (Total Positive Ratings / Total Responses) × 100
Positive Ratings = 4 and 5 star ratings
```

**Targets**:
- **Overall CSAT**: > 90% (4.5/5 average)
- **Support CSAT**: > 90%
- **Onboarding CSAT**: > 95%
- **Feature CSAT**: > 85%

**Survey Triggers**:
- After support ticket resolution
- After onboarding completion
- After business reviews
- After feature releases
- After training sessions

**Data Source**: Support system, Survey tool, Customer Success Platform

---

### Customer Effort Score (CES)

**Definition**: Measures how much effort customers had to exert to get what they needed.

**Question**: "To what extent do you agree with the following: [Company] made it easy to handle my issue."

**Scale**: 1-7 (Strongly Disagree to Strongly Agree)

**Calculation**:
```
CES = Average of all responses
High CES (6-7): Low effort (good)
Low CES (1-2): High effort (bad)
```

**Target**: > 6.0 average

**Survey Triggers**:
- After support interactions
- After completing complex tasks
- After onboarding steps

**Data Source**: Survey tool

---

## Business Value Metrics

### Time to Value (TTV)

**Definition**: Time from contract signing to first measurable business outcome.

**Calculation**:
```
TTV = Date of first measurable value - Contract signing date
```

**Measurable Value Examples**:
- First lead processed
- First conversion achieved
- First policy issued
- First cost saving realized
- First efficiency improvement

**Targets**:
- **Target TTV**: < 30 days
- **90th Percentile TTV**: < 45 days
- **Median TTV**: < 25 days

**Segments**:
- Enterprise: < 45 days
- Mid-Market: < 30 days
- Small Business: < 20 days

**Data Source**: CRM, Business reviews, Success plans

---

### Return on Investment (ROI)

**Definition**: Financial return on customer's investment in the platform.

**Calculation**:
```
ROI (%) = ((Benefits - Costs) / Costs) × 100
```

**Benefits Include**:
- Revenue increase
- Cost reduction
- Time savings (converted to dollar value)
- Efficiency improvements

**Costs Include**:
- Platform fees
- Implementation costs
- Training costs
- Internal resource costs

**Targets**:
- **90-day ROI**: > 0% (break-even)
- **6-month ROI**: > 100%
- **12-month ROI**: > 300%

**Data Source**: Business reviews, Financial analysis

---

### Customer Lifetime Value (CLV)

**Definition**: Total revenue expected from a customer over their entire relationship.

**Calculation**:
```
CLV = (Annual Revenue × Customer Lifespan) - Acquisition Cost
```

**Alternative Calculation**:
```
CLV = (Annual Revenue × Retention Rate) / Churn Rate
```

**Targets**:
- **Average CLV**: > $50,000
- **Enterprise CLV**: > $250,000
- **Mid-Market CLV**: > $50,000
- **Small Business CLV**: > $15,000

**Data Source**: Billing system, Churn analysis

---

### Net Revenue Retention (NRR)

**Definition**: Revenue retained from existing customers including expansion revenue.

**Calculation**:
```
NRR = (Starting Revenue + Expansion - Downsell - Churn) /
      Starting Revenue × 100
```

**Targets**:
- **Overall NRR**: > 100%
- **Enterprise NRR**: > 110%
- **Mid-Market NRR**: > 100%
- **Small Business NRR**: > 95%

**Data Source**: Billing system, Revenue analytics

---

## Adoption Metrics

### Feature Adoption Rate

**Definition**: Percentage of customers using each feature.

**Calculation**:
```
Feature Adoption = (Customers using feature / Total customers) × 100
```

**Targets**:
- **Core Features**: > 90%
- **Advanced Features**: > 70%
- **New Features (after 90 days)**: > 50%

**Data Source**: Platform analytics

---

### User Activation Rate

**Definition**: Percentage of users who complete onboarding and become active.

**Calculation**:
```
Activation Rate = (Activated users / Total signups) × 100
```

**Activation Criteria** (example):
- Complete profile setup
- Perform core action (e.g., process lead)
- Log in at least 3 times in first week
- Use at least 3 different features

**Targets**:
- **Overall Activation**: > 80%
- **Enterprise Activation**: > 90%
- **Mid-Market Activation**: > 80%
- **Small Business Activation**: > 75%

**Data Source**: Platform analytics, Onboarding system

---

### Daily Active Users (DAU)

**Definition**: Number of unique users logging in per day.

**Calculation**:
```
DAU = Count of unique users logging in on given day
```

**Related Metrics**:
- **Monthly Active Users (MAU)**: Unique users per month
- **DAU/MAU Ratio**: Stickiness metric

**Targets**:
- **DAU/MAU Ratio**: > 40% (industry average)
- **Enterprise DAU**: 60%+ of licensed users
- **Mid-Market DAU**: 50%+ of licensed users
- **Small Business DAU**: 40%+ of licensed users

**Data Source**: Platform analytics

---

### Seat Utilization

**Definition**: Percentage of licensed seats actively used.

**Calculation**:
```
Seat Utilization = (Active users / Licensed seats) × 100
```

**Targets**:
- **Overall Utilization**: > 70%
- **Expansion Trigger**: > 80% utilization for 2+ months

**Data Source**: Platform analytics, Billing system

---

## Engagement Metrics

### Login Frequency

**Definition**: Average number of logins per user per week.

**Calculation**:
```
Avg Logins/Week = Total logins / (Active users × Number of weeks)
```

**Targets**:
- **Daily Users**: 5+ logins per week
- **Frequent Users**: 3-4 logins per week
- **Regular Users**: 1-2 logins per week

**Data Source**: Platform analytics

---

### Session Duration

**Definition**: Average time users spend in the platform per session.

**Calculation**:
```
Avg Session Duration = Total time in platform / Total sessions
```

**Targets**:
- **Engaged Users**: 20+ minutes per session
- **Moderate Users**: 10-20 minutes per session
- **Light Users**: < 10 minutes per session

**Data Source**: Platform analytics

---

### Feature Usage Depth

**Definition**: Number of features used per user per week.

**Calculation**:
```
Avg Features/Week = Total feature uses / (Active users × Number of weeks)
```

**Targets**:
- **Power Users**: 10+ features per week
- **Regular Users**: 5-9 features per week
- **Light Users**: < 5 features per week

**Data Source**: Platform analytics

---

## Retention Metrics

### Customer Retention Rate

**Definition**: Percentage of customers retained over a period.

**Calculation**:
```
Retention Rate = ((End Customers - New Customers) / Start Customers) × 100
```

**Time Periods**:
- Monthly retention
- Quarterly retention
- Annual retention

**Targets**:
- **Annual Retention**: > 95%
- **Enterprise Retention**: > 98%
- **Mid-Market Retention**: > 95%
- **Small Business Retention**: > 90%

**Data Source**: Billing system, Customer database

---

### Churn Rate

**Definition**: Percentage of customers who cancel or do not renew.

**Calculation**:
```
Churn Rate = (Churned Customers / Start Customers) × 100
```

**Types of Churn**:
- **Logo Churn**: Customer cancellation
- **Revenue Churn**: Lost revenue from downgrades or cancellations
- **Voluntary Churn**: Customer choice
- **Involuntary Churn**: Payment failures, violations, etc.

**Targets**:
- **Annual Churn**: < 5%
- **Enterprise Churn**: < 2%
- **Mid-Market Churn**: < 5%
- **Small Business Churn**: < 10%

**Data Source**: Billing system, Churn analysis

---

### Churn Reasons Analysis

**Definition**: Categorization and analysis of churn reasons.

**Categories**:
- Price/Budget (30%)
- Product/Feature (25%)
- Support/Service (20%)
- Business change (15%)
- Competition (10%)

**Tracking Method**:
- Exit surveys
- Cancellation interviews
- Analysis of churned accounts

**Data Source**: Exit surveys, Churn database

---

### Renewal Rate

**Definition**: Percentage of contracts renewed.

**Calculation**:
```
Renewal Rate = (Renewed Contracts / Total Contracts Expiring) × 100
```

**Targets**:
- **Overall Renewal**: > 95%
- **Early Renewal (30+ days)**: > 40%

**Data Source**: Contract management system

---

## Expansion Metrics

### Expansion Revenue

**Definition**: Revenue from existing customers through upgrades and cross-sells.

**Calculation**:
```
Expansion Revenue = Total revenue from upgrades and cross-sells
```

**Targets**:
- **Expansion Rate**: 30%+ of customers expand within first year
- **Expansion Revenue**: 20%+ of total revenue from expansion

**Data Source**: Billing system, Sales CRM

---

### Upsell Rate

**Definition**: Percentage of customers upgrading to higher tier or adding licenses.

**Calculation**:
```
Upsell Rate = (Customers upgrading / Total customers) × 100
```

**Targets**:
- **Annual Upsell Rate**: > 25%
- **Multi-seat Upsell**: > 40% of growing customers

**Data Source**: Billing system, Customer Success Platform

---

### Cross-Sell Rate

**Definition**: Percentage of customers adopting additional products/features.

**Calculation**:
```
Cross-Sell Rate = (Customers adding products / Total customers) × 100
```

**Targets**:
- **Annual Cross-Sell Rate**: > 20%
- **Feature Adoption**: 50%+ adopt at least one new feature annually

**Data Source**: Billing system, Product analytics

---

## Support Metrics

### First Response Time

**Definition**: Time from ticket creation to first response.

**Calculation**:
```
Avg First Response Time = Sum of first response times / Total tickets
```

**Targets by Priority**:
- **Critical (P1)**: < 2 hours
- **High (P2)**: < 4 hours
- **Medium (P3)**: < 24 hours
- **Low (P4)**: < 48 hours

**Data Source**: Support system (Zendesk, etc.)

---

### Resolution Time

**Definition**: Time from ticket creation to resolution.

**Calculation**:
```
Avg Resolution Time = Sum of resolution times / Total tickets
```

**Targets by Priority**:
- **Critical (P1)**: < 24 hours
- **High (P2)**: < 48 hours
- **Medium (P3)**: < 7 days
- **Low (P4)**: < 14 days

**Data Source**: Support system

---

### First Contact Resolution (FCR)

**Definition**: Percentage of tickets resolved on first contact.

**Calculation**:
```
FCR = (Tickets resolved on first contact / Total tickets) × 100
```

**Target**: > 70%

**Data Source**: Support system

---

### Ticket Volume per Customer

**Definition**: Average number of support tickets per customer.

**Calculation**:
```
Avg Tickets/Customer = Total tickets / Active customers
```

**Targets**:
- **Enterprise**: < 5 tickets/month
- **Mid-Market**: < 3 tickets/month
- **Small Business**: < 2 tickets/month

**Data Source**: Support system

---

## Advocacy Metrics

### Reference Rate

**Definition**: Percentage of customers willing to serve as references.

**Calculation**:
```
Reference Rate = (Reference customers / Total customers) × 100
```

**Target**: > 30%

**Data Source**: Customer Success Platform, Advocacy database

---

### Case Study Rate

**Definition**: Percentage of customers with published case studies.

**Calculation**:
```
Case Study Rate = (Case study customers / Total customers) × 100
```

**Target**: > 15%

**Data Source**: Marketing database, Advocacy database

---

### Referral Rate

**Definition**: Percentage of new customers coming from referrals.

**Calculation**:
```
Referral Rate = (Referral customers / New customers) × 100
```

**Target**: > 20%

**Data Source**: Sales CRM, Referral program

---

### Community Participation

**Definition**: Level of customer participation in community activities.

**Metrics**:
- **Community Members**: Number of customers in community
- **Active Contributors**: Customers contributing content (posts, comments)
- **Event Attendees**: Customers attending webinars, user groups

**Targets**:
- **Community Penetration**: > 40% of customers
- **Active Contributors**: > 20% of community members
- **Event Attendance**: > 30% of invited customers

**Data Source**: Community platform, Event system

---

## Operational Metrics

### Customer Success Manager (CSM) Load

**Definition**: Number of customers per CSM.

**Calculation**:
```
CSM Load = Total customers / Total CSMs
```

**Targets by Tier**:
- **Enterprise CSM Load**: 1:1 to 1:5
- **Mid-Market CSM Load**: 1:5 to 1:10
- **Small Business CSM Load**: 1:15 to 1:30

**Data Source**: HR system, Customer database

---

### Touchpoint Frequency

**Definition**: Average frequency of customer touchpoints.

**Calculation**:
```
Avg Touchpoints/Customer/Month = Total touchpoints / Active customers / Months
```

**Targets**:
- **Enterprise**: 8+ touchpoints/month
- **Mid-Market**: 4+ touchpoints/month
- **Small Business**: 2+ touchpoints/month

**Data Source**: Customer Success Platform, CRM

---

### Business Review Completion Rate

**Definition**: Percentage of scheduled business reviews completed.

**Calculation**:
```
Review Completion = (Completed reviews / Scheduled reviews) × 100
```

**Target**: > 95%

**Data Source**: Customer Success Platform

---

## Product Feedback Metrics

### Feature Request Volume

**Definition**: Number and frequency of feature requests.

**Metrics**:
- Total feature requests
- Requests by customer tier
- Requests by category
- Duplicate requests (indicates priority)

**Tracking**:
- New requests per week
- Request backlog size
- Requests completed/closed

**Data Source**: Product feedback system

---

### Feedback Response Rate

**Definition**: Percentage of customer feedback acknowledged.

**Calculation**:
```
Feedback Response Rate = (Acknowledged feedback / Total feedback) × 100
```

**Target**: > 90%

**Data Source**: Feedback system, Customer Success Platform

---

### Product Satisfaction Score

**Definition**: Customer satisfaction with product features and roadmap.

**Question**: "How satisfied are you with our product features and direction?"

**Scale**: 1-5

**Target**: > 4.0/5.0

**Data Source**: Product surveys

---

## Dashboard Requirements

### Executive Dashboard

**Metrics**:
- Overall NPS
- Total Customer Count
- Net Revenue Retention
- Churn Rate
- Expansion Revenue
- Average Health Score

**Update Frequency**: Real-time

---

### CSM Dashboard

**Metrics**:
- Assigned customers by health status
- Upcoming touchpoints
- At-risk accounts
- Expansion opportunities
- Customer success metrics for each account
- Recent activity feed

**Update Frequency**: Real-time

---

### Operations Dashboard

**Metrics**:
- CSM workload distribution
- Touchpoint frequency
- Business review schedule
- Onboarding pipeline
- Support ticket trends
- Team performance

**Update Frequency**: Daily

---

### Product Dashboard

**Metrics**:
- Feature adoption rates
- Feature request trends
- Product satisfaction score
- Usage analytics
- Customer feedback themes

**Update Frequency**: Weekly

---

## Metric Targets Summary

### Primary Success Metrics

| Metric | Target | Excellence Threshold |
|--------|--------|---------------------|
| NPS | > 50 | > 60 |
| CSAT | > 4.5/5.0 | > 4.8/5.0 |
| Health Score (Average) | > 80 | > 85 |
| Retention Rate | > 95% | > 98% |
| Net Revenue Retention | > 100% | > 110% |
| Churn Rate | < 5% | < 2% |
| Time to Value | < 30 days | < 20 days |
| Expansion Rate | > 30% | > 40% |

---

## Data Sources & Integration

### Primary Data Sources

1. **Platform Analytics**
   - Login data
   - Feature usage
   - Session duration
   - User activity

2. **Customer Success Platform** (Gainsight/Totango)
   - Health scores
   - Success plans
   - Touchpoint history
   - Customer data

3. **Support System**
   - Ticket data
   - Response times
   - Resolution times
   - Satisfaction surveys

4. **Billing System**
   - Revenue data
   - Payment history
   - Contract terms
   - Renewal dates

5. **Survey Tools**
   - NPS surveys
   - CSAT surveys
   - CES surveys
   - Product feedback

6. **CRM**
   - Customer data
   - Opportunity tracking
   - Activity history
   - Pipeline data

### Integration Requirements

- Real-time data synchronization where possible
- Daily batch updates for analytics
- API integrations for all systems
- Data quality validation
- Error handling and retry logic

---

## Glossary

- **NPS**: Net Promoter Score
- **CSAT**: Customer Satisfaction Score
- **CES**: Customer Effort Score
- **TTV**: Time to Value
- **ROI**: Return on Investment
- **CLV**: Customer Lifetime Value
- **NRR**: Net Revenue Retention
- **DAU**: Daily Active Users
- **MAU**: Monthly Active Users
- **FCR**: First Contact Resolution
- **CSM**: Customer Success Manager

---

**Document Owner**: Customer Success Operations Manager / Analytics Manager
**Last Updated**: [Date]
**Next Review**: [Date]
**Version**: 1.0
