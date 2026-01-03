# Sales Manager Training Program

## Team Leadership & Performance Optimization

**Training Duration:** 3.5 hours  
**Target Audience:** Sales Managers, Team Leads, Sales Directors  
**Prerequisites:** Admin training completion, 6+ months sales experience  
**Delivery Method:** Workshop + Coaching Sessions + Analytics Deep Dive  

---

## Training Overview

This comprehensive training program equips sales leaders with the tools, insights, and strategies needed to effectively manage teams, optimize performance, and drive revenue growth using CRM-Ultra's advanced management features.

### Learning Objectives

By the end of this training, you will be able to:

✅ Configure and optimize lead distribution strategies  
✅ Monitor team performance using advanced analytics  
✅ Coach agents using data-driven insights  
✅ Forecast revenue and pipeline health  
✅ Build and maintain high-performing sales cultures  
✅ Use CRM-Ultra for effective one-on-ones  
✅ Identify and replicate top performer behaviors  
✅ Implement continuous improvement processes  

---

## Module 1: Team Management Fundamentals (45 minutes)

### 1.1 Team Structure & Setup

**Team Configuration in CRM-Ultra:**

```yaml
Team Types Supported:

A. Geographic Teams:
   Structure: By territory/region
   Example: "Western Region Sales Team"
   Assignment: Lead routes by state/city/zip
   Benefits: Local expertise, reduced travel time
   
B. Product Specialists:
   Structure: By insurance line
   Example: "Commercial Insurance Team"
   Assignment: Complex commercial leads
   Benefits: Deep product knowledge
   
C. Experience-Based:
   Structure: By agent tenure/skill
   Example: "Senior Agent Team"
   Assignment: High-value complex leads
   Benefits: Best agents on best leads
   
D. Hybrid Models:
   Structure: Combination approach
   Example: "Senior Auto Specialists - California"
   Assignment: Multi-rule routing
   Benefits: Optimized for specific scenarios
```

**Team Setup Workflow:**

```
Admin Panel → Teams → Create Team

Step 1: Basic Information
├─ Team Name: "[Region/Product] Team"
├─ Description: "Manages [X] leads in [Y] territory"
├─ Team Lead: Assign manager
└─ Max Team Size: Set capacity limit

Step 2: Assignment Rules
├─ Round-robin distribution: Yes/No
├─ Capacity weighting: Enable
├─ Skill-based matching: Configure
├─ Territory restrictions: Define
└─ Escalation path: Set up

Step 3: Performance Targets
├─ Monthly quota per agent: $XXX
├─ Daily activity targets: XX
├─ Conversion rate goals: XX%
├─ Response time SLA: X minutes
└─ Quality score targets: XX

Step 4: Access & Permissions
├─ Shared lead visibility: Configure
├─ Manager approval requirements
├─ Team collaboration features
├─ Data sharing settings
└─ Reporting access levels
```

**Team Performance Dashboards:**

```yaml
Manager Team Dashboard View:

Team Health Summary:
├─ Total leads in pipeline: XXX
├─ New leads today: XX
├─ Average response time: X.X hours
├─ Conversion rate this week: XX%
└─ Total revenue MTD: $XXX,XXX

Individual Agent Cards:
├─ Agent name & photo
├─ Current performance vs. target
├─ Pending tasks count
├─ Hot leads requiring attention
├─ Warning indicators (if needed)
└─ Quick actions button

Alerts & Notifications:
├─ Leads stuck in queues
├─ Agents below performance thresholds
├─ SLA breaches (if any)
├─ High-value leads need assignment
└─ System or integration issues
```

### 1.2 User Management & Permissions

**User Lifecycle Management:**

```yaml
New Agent Onboarding Process:

Week 1: Account Setup & Orientation
├─ Day 1: Create user account
├─ Day 1: Assign to team
├─ Day 1: Set initial permissions
├─ Day 2: System training begins
├─ Day 3: Shadow top performer
├─ Day 5: First 5 leads assigned
├─ Day 7: Manager check-in

Week 2-4: Skill Development
├─ Gradual lead assignment increase
├─ Daily coaching sessions
├─ Progress reviews each Friday
├─ CRM activity monitoring
├─ Sales methodology training

Month 2: Full Integration
├─ Full lead assignment load
├─ Weekly 1:1 meetings
├─ Performance tracking
├─ Peer mentoring program
├─ 30/60/90 day reviews

Ongoing: Continuous Development
├─ Monthly performance reviews
├─ Quarterly goal setting
├─ Annual review process
├─ Promotion readiness assessment
```

**Permission Management:**

```yaml
Role-Based Access Control (RBAC):

Manager Role Permissions:
✓ View all team leads
✓ Edit team lead assignments
✓ Reassign leads between agents
✓ Access team reporting only
✓ Configure team settings
✓ Manage team workflows
✓ Override system assignments
✓ Access call recordings
✓ Create custom reports
✔ Access other teams (cross-functional only)
✔ Full admin settings (admin only)

Agent Role Permissions:
✓ View own leads
✓ Edit own leads
✓ Create notes/tasks/emails
✓ Access personal reports
✓ View team leaderboard
✔ View other agents' leads
✔ Access admin settings
✔ Reassign leads
✔ Edit workflows
```

**Offboarding Process:**

```yaml
When Agent Leaves the Team:

Step 1: Account Status Change
├─ Change status to "Inactive" (not deleted)
├─ Revoke API access keys
├─ Remove from assignment queues
├─ Disable login access

Step 2: Lead Reassignment
├─ Identify all open leads
├─ Review each lead's status
├─ Reassign based on:
  - Similar agent capacity/load
  - Territory/product specialization
  - Relationship continuity (if possible)
  - Lead priority and urgency
├─ Bulk reassign using CSV import

Step 3: Documentation
├─ Export agent's activity history
├─ Document reassignments made
├─ Any pending tasks needed for each lead
├─ Notes on special circumstances

Step 4: Communication
├─ Notify affected agents of new assignments
├─ Brief managers on transitions
├─ Client communication plan (if needed)
├─ Update team documentation
```

---

## Module 2: Advanced Lead Management (45 minutes)

### 2.1 Lead Distribution Strategies

**Distribution Algorithm Configuration:**

```yaml
Distribution Methods:

1. Round-Robin (Simple & Fair):
   Logic: Leads assign in rotating sequence
   When to use: Teams with similar skill levels
   Formula: Agent 1 → Agent 2 → Agent 3 → Agent 1
   Benefits: Perfectly even distribution
   Downsides: Doesn't account for capacity or skill

2. Load Balancing (Workload-Based):
   Logic: Assign to agent with fewest active leads
   When to use: Teams with varying lead handling speeds
   Formula: Assign to agent where: Current Load < Capacity
   Benefits: Prevents agent overwhelm
   Downsides: Complex calculations needed
   
3. Skill-Based Routing (Matchmaker):
   Logic: Match lead needs with agent expertise
   When to use: Specialized products/regions
   Formula: 
   IF insurance_type = COMMERCIAL → Assign to commercial_specialists
   IF state = CA AND high_value = TRUE → Assign to CA_high_net_worth_agents
   Language = Spanish → Assign to bilingual_agents
   Benefits: Higher conversion rates
   Downsides: May create load imbalances
   
4. Performance-Based (Reward Top Performers):
   Logic: More leads to higher converters
   When to use: Experienced teams with performance tiers
   Formula: Assign 60% to top tier, 30% to middle, 10% to new agents
   Benefits: Maximizes team revenue
   Downsides: Can demotivate lower performers
```

**Hybrid Distribution Example:**

```yaml
Rule Engine Configuration:

Rule 1: High-Value Routing
Priority: 1 (runs first)
Condition: Lead score >= 80 AND premium_estimate >= 2000
Action: Assign to "High-Value Team"
Assignment: Round-robin within that team

Rule 2: Geographic Routing  
Priority: 2
Condition: Lead state IN [CA, TX, FL, NY]
Action: Assign to "Major Market Team"
Assignment: Load-balanced by current pipeline value

Rule 3: Product Specialist Routing
Priority: 3
Condition: Insurance type = COMMERCIAL
Action: Assign to "Commercial Specialist Team"
Assignment: Skill-based (agent with relevant experience)

Rule 4: General Distribution
Priority: 4 (catch-all)
Condition: All remaining leads
Action: Assign to "General Sales Team"
Assignment: Load-balanced with round-robin as fallback
```

**Redistribution & Rebalancing:**

```yaml
When to Manually Rebalance:

Scenario 1: Agent Out of Office
Trigger: Agent sets status to "On PTO"
Action: System redistributes new leads
Existing Leads:
- Leave with agent if return < 3 days
- Reassign to backup if return > 3 days
- Have agent complete handoff notes

Scenario 2: Load Imbalance Detected
Trigger: Agent reaches capacity (e.g., 50 active leads)
Action: Stop new assignments temporarily
Alert: Manager receives notification
Options:
- Reassign excess leads to available agents
- Bring in part-time/overflow agents
- Reduce marketing spend temporarily

Scenario 3: Performance Intervention
Trigger: Agent conversion rate < 15% for 2+ weeks
Action: Reduce lead volume to agent
Process: 
- Review calls with agent (identify issues)
- Provide additional training/coaching
- Increase lead quality (fewer cold leads)
- Gradually increase volume as performance improves
```

### 2.2 Monitoring Lead Health

**Lead Health Indicators:**

```yaml
Lead Age Monitoring:

Healthy Lead Age by Stage:
NEW: < 2 hours
CONTACTED: < 24 hours  
QUALIFIED: < 3 days
QUOTED: < 7 days
NEGOTIATION: < 10 days
APPLICATION: < 14 days

Warning Thresholds:
⚠️ NEW > 4 hours (agent not responsive)
⚠️ CONTACTED > 3 days (no movement)
⚠️ QUALIFIED > 7 days (quote not delivered)
⚠️ QUOTED > 14 days (not closing)
⚠️ NEGOTIATION > 21 days (stuck)
⚠️ APPLICATION > 30 days (processing issues)

Manager Dashboard Alerts:
├─ Hot leads not contacted (age > 1 hour)
├─ Stuck leads by stage (age exceeds threshold)
├─ High-value leads requiring attention
└─ Agents with excessive stale leads
```

**Lead Health Actions:**

```yaml
Intervention Process:

Step 1: Identify Issues (Daily Review)
├─ Run "Stuck Leads" report
├─ Filter by age and stage
├─ Sort by lead score (priority)
├─ Review notes for context

Step 2: Analyze Root Cause
├─ Agent capacity issue?
├─ Lead quality issue?
├─ Process breakdown?
├─ External factors (holidays, etc.)?
├─ Training gap?

Step 3: Take Action
├─ Reassign leads if agent capacity issue
├─ Disqualify leads if poor quality
├─ Process improvement if systematic
├─ Provide coaching if skill gap
├─ Escalate if needed

Step 4: Prevent Recurrence
├─ Adjust distribution rules
├─ Update processes
├─ Provide additional training
├─ Set up automated alerts
```

### 2.3 Managing Lead Pipelines

**Pipeline Analysis for Managers:**

```yaml
Pipeline Metrics Dashboard:

Overall Pipeline Health:
├─ Total pipeline value: $XXX,XXX
├─ Average deal size: $X,XXX
├─ Total number of leads: XXX
├─ Average days to close: XX
├─ Pipeline coverage ratio: X.X:1

Stage Breakdown:
├─ NEW: XX leads ($X,XXX value) [X% of pipeline]
├─ CONTACTED: XX leads ($X,XXX value) [X% of pipeline]
├─ QUALIFIED: XX leads ($X,XXX value) [X% of pipeline]
├─ QUOTED: XX leads ($X,XXX value) [X% of pipeline]
├─ NEGOTIATION: XX leads ($X,XXX value) [X% of pipeline]
├─ APPLICATION: XX leads ($X,XXX value) [X% of pipeline]
├─ WON: XX leads ($X,XXX value) [closed this period]

Conversion Analysis:
├─ Stage-to-stage conversion rates
├─ Average time in each stage
├─ Bottleneck identification
├─ Trending (vs. previous period)
```

**Pipeline Forecasting:**

```yaml
Weighted Forecast Formula:

Committed (90% confidence):
├─ Application submitted LOIs
├─ Contract pending policy issuance
├─ Count 90% in forecast

Best Case (50% confidence):
├─ Actively negotiating
├─ Competitive quotes presented
├─ Count 60% in forecast

Pipeline (10-40% confidence):
├─ Quote delivered, no response
├─ Qualified, quote in progress
├─ Count 25% in forecast

Forecast = (Committed × 0.90) + 
         (Best Case × 0.60) + 
         (Pipeline × 0.25)
         
Example:
$50K (Committed) + $30K (Best Case) + $20K (Pipeline)
= $45K + $18K + $5K = $68K weighted forecast
```

---

## Module 3: Performance Analytics & Coaching (45 minutes)

### 3.1 Performance Metrics Deep Dive

**Leading vs. Lagging Metrics:**

```yaml
Leading Indicators (Predictive):
  (Show future performance potential)
  
├─ Activity Volume:
  - Calls per day/week
  - Emails sent
  - Leads contacted
  - Response time (speed to lead)
  - Talk time/engagement
  
├─ Quality Metrics:
  - Lead qualification rate
  - Demo/quote completion rate
  - Customer satisfaction
  - Note completeness
  - Pipeline hygiene
  
├─ Engagement Metrics:
  - Email open/response rates
  - Call connection rate
  - Meeting show rate
  - Follow-up persistence

Lagging Indicators (Results):
  (Show historical performance outcomes)
  
├─ Conversion Metrics:
  - Quote-to-close ratio
  - Overall pipeline conversion
  - Revenue generated
  - Average deal size
  - Win rate by lead source
  
├─ Efficiency Metrics:
  - Sales cycle length
  - Revenue per lead
  - Cost per acquisition
  - Retention rate
  - Cross-sell ratio
```

**Manager Performance Dashboard in CRM-Ultra:**

```yaml
Real-Time Team Dashboard:

Team Activity Monitor:
├─ Live activity feed
├─ Currently active agents: XX
├─ Today's calls made: XXX
├─ Today's emails sent: XXX
├─ Leads contacted today: XX
├─ Avg. response time today: X.X hours

Individual Performance Cards:
Agent: Sarah Johnson
├─ Status: 🟢 Online
├─ Leads contacted: 15/20 goal (75%)
├─ Avg. response time: 1.2 hours
├─ Today's revenue: $3,450
├─ Pipeline value: $68,000
├─ Hot leads: 3 (needs follow-up)
├─ Warnings: 2 stale leads
└─ Quick actions: View details | Reassign leads

Performance Comparison Table:
Agent | Leads | Contacted | Conv. Rate | Revenue | Rank
Sarah | 25 | 22 (88%) | 20% | $12,400 | 1
Mike  | 23 | 19 (83%) | 18% | $10,200 | 2
Lisa  | 24 | 20 (83%) | 16% | $9,800  | 3
```

**Understanding Variability:**

```yaml
Why Metrics Vary by Agent:

Acceptable Variance (10-15%):
├─ Lead quality differences
├─ Experience level variations
├─ Territory/geographic factors
├─ Product specialization differences

Needs Investigation (15-25% variance):
├─ Training gaps
├─ Process inconsistencies
├─ Resource allocation issues
├─ Tool/system proficiency levels

Critical Issues (>25% variance):
├─ Performance management needed
├─ Potential behavioral issues
├─ Systematic process failures
├─ Market/territory challenges
```

### 3.2 Data-Driven Coaching

**The Coaching Framework:**

```yaml
Coaching Model: G.R.O.W.T.H.

G - Gather Data:
├─ Review performance metrics
├─ Analyze call recordings
├─ Check activity levels
├─ Review customer feedback
└─ Identify patterns

R - Root Cause Analysis:
├─ Why is performance below target?
├─ Skill gap or will gap?
├─ Training needed or motivation needed?
├─ Internal or external factors?
└─ Patterns across team or individual?

O - Opportunity Identification:
├─ What specific improvements possible?
├─ Quick wins vs. long-term development?
├─ Leverage existing strengths?
├─ Best practice replication opportunities?
└─ Resource or support needs?

W - Work Plan Creation:
├─ Specific actions to take
├─ Timeline for improvements
├─ Support/resources provided
├─ Success metrics definition
└─ Check-in cadence established

T - Take Action:
├─ Implement work plan
├─ Provide ongoing support
├─ Monitor progress
├─ Adjust as needed
└─ Document activities

H - Hold Accountable:
├─ Regular check-ins
├─ Performance tracking
├─ Celebrate wins
├─ Course corrections
└─ Formal review at deadline
```

**Coaching Session Structure (30 minutes):**

```yaml
Preparation (Manager, 10 minutes before):
├─ Review agent's dashboard
├─ Analyze performance metrics
├─ Identify specific examples
├─ Prepare discussion points
├─ Set session agenda

Session Opening (2 minutes):
├─ "How are you feeling about your performance?"
├─ "What's going well?"
├─ "What challenges are you facing?"

Data Review (8 minutes):
├─ Share metrics and observations
├─ "I notice your [metric] is [above/below] target"
├─ "Let me show you what I'm seeing"
├─ Present specific examples from CRM

Collaborative Problem-Solving (15 minutes):
├─ "What do you think is causing this?"
├─ Explore root causes together
├─ Identify improvement opportunities
├─ Co-create action plan
├─ Set specific goals and timelines

Commitment & Follow-Up (5 minutes):
├─ "What support do you need from me?"
├─ Schedule next check-in
├─ Document action items
├─ Encourage and motivate
```

**CRM-Ultra Coaching Tools:**

```yaml
Call Recording & Review:

Access: Lead record → Activity → Call recordings

Features:
├─ Auto-record calls (if enabled)
├─ Manual recording trigger
├─ Playback speed control
├─ Annotation and timestamping
├─ Scorecard integration
├─ Share with agent

Coaching Notes Template:
```
Call Review: [Date] - [Agent Name]

Strengths:
- [Specific positive behaviors]
- [What worked well]

Opportunities:
- [Areas for improvement]
- [Specific examples]

Skills to Develop:
1. [Specific skill]
2. [Specific skill]

Action Items:
- Agent will: [Specific tasks]
- Manager will: [Support provided]

Follow-up: [Date]
```

Performance Monitoring:
├─ Track agent CRM activity
├─ Monitor note quality/completeness
├─ Review lead qualification scores
├─ Analyze response times
├─ Check pipeline hygiene

```

### 3.3 One-on-One Meeting Framework

**One-on-One Structure (60 minutes, bi-weekly):**

```yaml
Agenda Template in CRM-Ultra:

Section 1: Performance Review (15 min)
├─ Review dashboard together
├─ Discuss metrics vs. goals
├─ Celebrate wins and improvements
└─ Identify areas needing attention

Section 2: Pipeline Deep Dive (15 min)
├─ Review agent's active pipeline
├─ Discuss specific opportunities
├─ Identify stuck deals
├─ Problem-solve challenging situations
└─ Plan follow-up actions

Section 3: Coaching & Development (20 min)
├─ Review call recordings (if applicable)
├─ Discuss challenges and obstacles
├─ Provide skill-building guidance
├─ Role-play difficult scenarios
└─ Create development plan

Section 4: Goals & Planning (10 min)
├─ Review progress on action items
├─ Set goals for next period
├─ Identify support/resources needed
├─ Schedule follow-ups
└─ Encourage and motivate
```

**CRM-Ultra One-on-One Tool:**

```yaml
Built-in One-on-One Module:

Meeting Setup:
├─ Schedule recurring meetings
├─ Auto-generate agenda from data
├─ Share agenda with agent beforehand
├─ Agent can add discussion points
├─ Reminder notifications sent

During Meeting:
├─ View agent dashboard together
├─ Review specific leads/opportunities
├─ Take notes within CRM
├─ Assign action items
├─ Update goals and targets

Post-Meeting:
├─ Meeting notes auto-saved to agent record
├─ Action items created as tasks
├─ Follow-up reminders set
├─ Share notes with agent
├─ Track action item completion

Historical Tracking:
├─ View past one-on-one history
├─ Track progress over time
├─ Identify recurring themes
├─ Measure development progress
```

---

## Module 4: Revenue Forecasting & Planning (60 minutes)

### 4.1 Building Accurate Forecasts

**Forecasting Methodology:**

```yaml
Bottom-Up Forecasting Approach:

Step 1: Individual Agent Forecasts
    Each agent reviews their pipeline and provides:
    
    Agent: Sarah Johnson
    ├─ Committed (90%+ confidence): $25,000
    ├─ Best Case (50-75% confidence): $18,000
    ├─ Pipeline (10-40% confidence): $12,000
    ├─ Weighted Total: (25K × 0.90) + (18K × 0.60) + (12K × 0.25) = $37,300
    
    Agent: Mike Chen
    ├─ Committed: $20,000
    ├─ Best Case: $15,000
    ├─ Pipeline: $8,000
    ├─ Weighted Total: $29,000
    
    [Repeat for all agents]

Step 2: Manager Assessment
    Review each agent's forecast for:
    
    ├─ Historical forecast accuracy
    ├─ Pipeline quality and age
    ├─ Activity levels supporting forecast
    ├─ External factors (vacation, training, etc.)
    ├─ Market conditions
    
    Adjust agent forecasts based on:
    
    Sarah's Adjustment:
    - Historically 15% optimistic
    - Several aging opportunities
    - Adjusted forecast: $37,300 × 0.90 = $33,570
    
    Mike's Adjustment:
    - Historically conservative (underestimates)
    - Strong pipeline quality
    - Adjusted forecast: $29,000 × 1.05 = $30,450

Step 3: Team Rollup
    ├─ Sum adjusted agent forecasts
    ├─ Add new agent ramp-up time
    ├─ Account for seasonality
    ├─ Consider market trends
    
    Example:
    Team Total Adjusted: $298,000
    + Expected new business: $45,000
    - Seasonal adjustment (-10%): -$34,300
    + Marketing campaign impact: +$25,000
    = Final Team Forecast: $333,700

Step 4: Apply Confidence Factors
    Based on historical team performance:
    
    ├─ Consistent performers: 95% confidence
    ├─ New team members: 60% confidence
    ├─ Market volatility: Reduce confidence 10-15%
    
    Final Best Estimate: $317,000 - $350,000
```

**CRM-Ultra Forecasting Tools:**

```yaml
Forecast Dashboard Features:

Pipeline View:
├─ Committed deals: $XXX,XXX (90% weight)
├─ Best case: $XXX,XXX (60% weight)
├─ Pipeline: $XXX,XXX (25% weight)
├─ Weighted total: $XXX,XXX
├─ Goal/quota: $XXX,XXX
├─ Coverage ratio: X.X:1

Forecast Scenario Planning:
├─ Best case scenario (high confidence)
├─ Most likely scenario (medium confidence)
├─ Worst case scenario (low confidence)
├─ Month-over-month growth rates
├─ Year-over-year comparisons

Accuracy Tracking:
├─ Compare forecast vs. actuals
├─ Track accuracy by agent
├─ Learn from discrepancies
├─ Improve future forecasts
```

**Forecast Accuracy Metrics:**

```yaml
Tracking Forecast Performance:

Calculate Monthly:
├─ Forecast Accuracy = 1 - (|Actual - Forecast| / Forecast)
  
  Example: Forecast $300K, Actual $315K
  Accuracy = 1 - (|315K - 300K| / 300K)
  Accuracy = 1 - (15K / 300K)
  Accuracy = 1 - 0.05 = 0.95 = 95%

├─ Bias (consistent over/under):
  Bias = (Forecast - Actual) / Actual
  
  Positive = consistently over-forecasting
  Negative = consistently under-forecasting
  Ideal range: -5% to +5%

├─ Forecast Error Trend:
  Track if accuracy improving or declining
  Identify patterns in misses

Target Accuracy:
✓ Committed deals: 95%+ accuracy
✓ Best case: 80%+ accuracy  
✓ Overall forecast: 85%+ accuracy
```

### 4.2 Capacity Planning

**Team Capacity Analysis:**

```yaml
Capacity Calculation:

Individual Agent Capacity:
├─ Sustainable workload: 25-30 active leads
├─ Daily capacity: 15-20 outreach attempts
├─ Weekly capacity: 5-8 quotes
├─ Monthly capacity: 15-20 policies bound

Team Capacity (10 agents):
├─ Active leads: 250-300 leads
├─ Daily outreach: 150-200 attempts
├─ Weekly quotes: 50-80 quotes
├─ Monthly policies: 150-200 policies
├─ Monthly revenue: $XXX,XXX

Capacity Variance Factors:
├─ New agents (50-60% of experienced agent capacity)
├─ Part-time agents (50% of FTE capacity)
├─ Vacation/PTO (plan coverage ahead)
├─ Training periods (reduce lead flow by 25%)
├─ High-value leads (require more time per lead)
├─ Complex insurance lines (commercial)
```

**Lead Volume Planning:**

```yaml
Volume Planning Process:

Step 1: Calculate Available Capacity
    Current Team:
    ├─ Sarah: Available (30 lead capacity - 22 current = 8 open)
    ├─ Mike: Full capacity (30 - 28 = 2 open)
    ├─ Lisa: Under capacity (25 - 15 = 10 open)
    ├─ New agent (Tom): 60% capacity (15 max - 8 = 7 open)
    
    Total Open Capacity: 27 leads

Step 2: Determine Lead Generation Target
    Based on: Available capacity / Desired lead-to-agent ratio
    
    Formula:
    Open capacity: 27 leads
    Target lead-to-agent ratio: 1.2:1 (to account for velocity)
    
    Safe new lead target: 27 / 1.2 = 22-23 leads/day

Step 3: Align Marketing Spend
    ├─ Cost per lead: $25 (average)
    ├─ Daily budget needed: 23 leads × $25 = $575/day
    ├─ Monthly budget: $575 × 22 days = $12,650/month

Step 4: Monitor and Adjust
    ├─ Track actual capacity utilization
    ├─ Adjust lead gen daily based on agent availability
    ├─ Consider hiring if consistently exceeding capacity
```

**Scaling Decisions:**

```yaml
When to Hire New Agents:

Indicators Hiring Needed:
⚠️ Team consistently at 90%+ capacity for 2+ weeks
⚠️ Significant lead overflow going unworked
⚠️ Response times increasing above SLA
⚠️ Conversion rates declining (quality issues)
⚠️ Large marketing campaign planned
⚠️ Market opportunity too large for current team

Hiring Timeline:
├─ Month 1: Recruiting and interviews
├─ Month 2: Offer and onboarding
├─ Month 3: Training (limited capacity)
├─ Month 4: Ramp-up (60% capacity)
├─ Month 5: Full production (100% capacity)

Total time from decision to full capacity: ~5 months
Plan ahead!
```

---

## Module 5: Team Development & Culture (30 minutes)

### 5.1 Building a High-Performance Sales Culture

**Culture Framework:**

```yaml
High-Performance Culture Pillars:

1. Clear Expectations:
   ├─ Documented performance standards
   ├─ Transparent metrics and goals
   ├─ Regular communication of priorities
   ├─ Consistent feedback cadence
   
2. Recognition & Achievement:
   ├─ Public acknowledgment of wins
   ├─ Tiered recognition program
   ├─ Celebration rituals
   ├─ Career progression pathways
   
3. Continuous Learning:
   ├─ Ongoing training investment
   ├─ Peer learning opportunities
   ├─ Best practice sharing
   ├─ Conference/seminar attendance
   
4. Data-Driven Coaching:
   ├─ Objective performance measurement
   ├─ Regular one-on-ones
   ├─ Skills development focus
   ├─ Supportive feedback culture
   
5. Healthy Competition:
   ├─ Transparent leaderboards
   ├─ Contests and incentives
   ├─ Gamification elements
   ├─ Team collaboration balance
```

**Leaderboard & Gamification:**

```yaml
CRM-Ultra Leaderboard Configuration:

Public Leaderboards (Lobby Display):
├─ Top Performer: Monthly revenue
├─ Speed Demon: Fastest response time (weekly)
├─ Conversion King: Highest conversion rate (monthly)
├─ Pipeline Champion: Largest pipeline value
├─ Rising Star: Most improved (month over month)
├─ Activity Ace: Most outreach attempts (daily)

Team Competitions:
├─ Monthly team challenge
├─ Quarterly team vs. team
├─ Holiday sales contests
├─ New product launch competitions

Individual Challenges:
├─ Beat personal best
├─ Hit daily targets streak
├─ Perfect week (100% activities)
├─ Zero stale leads

Recognition Program:
├─ Daily: Announce wins in Slack/Teams
├─ Weekly: Top 3 in team meeting
├─ Monthly: Certificate + small prize
├─ Quarterly: Trophy + team lunch
├─ Annually: Trip + President's Club
```

### 5.2 Coaching Best Practices

**The Coaching Continuum:**

```yaml
Performance Tiers & Coaching Approach:

Tier 1: Top Performers (20% of team)
Performance: 120%+ of quota
Approach: Develop & Challenge
Coaching Focus:
├─ Leadership development
├─ Advanced skill building
├─ Mentoring others
├─ Career progression planning
Meeting Cadence: Monthly coaching
Recognition: Public & frequent

Tier 2: Core Performers (60% of team)
Performance: 80-120% of quota
Approach: Optimize & Improve
Coaching Focus:
├─ Skills refinement
├─ Best practice adoption
├─ Efficiency improvements
├─ Confidence building
Meeting Cadence: Bi-weekly 1:1s
Recognition: Regular acknowledgment

Tier 3: Developing (15% of team)
Performance: 60-80% of quota
Approach: Skill building & Support
Coaching Focus:
├─ Foundational skill development
├─ Structured guidance
├─ Additional training
├─ Close supervision
Meeting Cadence: Weekly 1:1s
Recognition: Celebrate small wins

Tier 4: Performance Management (5% of team)
Performance: <60% of quota
Approach: Formal improvement plan
Coaching Focus:
├─ Performance improvement plan (PIP)
├─ Daily check-ins
├─ Intensive training
├─ Clear consequences
Meeting Cadence: Weekly + daily check-ins
Recognition: Conditional on improvement
```

**Coaching Conversation Templates:**

```yaml
Top Performer Coaching:
"Jane, you're absolutely crushing it! 140% of quota 
and leading the team. I want to talk about your 
development - where do you want to take your career?"

Discuss:
├─ Leadership aspirations
├─ Skill gaps for next level
├─ Teaching/mentoring opportunities
├─ Stretch assignments
├─ Compensation growth

Action Plan:
├─ Assign 2 new agents to mentor
├─ Lead team training session next month
├─ Take on special project
├─ Promotion readiness by Q3

---

Core Performer Coaching:
"Mike, you're doing well at 95% of quota. Let's 
talk about getting you to top performer level. 
What do you think is holding you back?"

Discuss:
├─ What's working well
├─ Specific improvement areas
├─ Skill development needs
├─ Resource/support requirements

Action Plan:
├─ Focus on [specific skill]
├─ Shadow top performer 2x/week
├─ Weekly role-play practice
├─ Target: 110% next quarter
```

### 5.3 Team Calibration Sessions

**Monthly Calibration Process:**

```yaml
Calibration Meeting Purpose:
Ensure consistent lead quality assessment, 
qualification standards, and coaching approaches
across entire team.

Agenda (90 minutes):

30 min: Performance Metrics Review
├─ Team performance dashboard
├─ Individual agent performance
├─ Trends and patterns
└─ Identify outliers

30 min: Qualification Standards Calibration
├─ Review sample leads together
├─ Each agent scores independently
├─ Discuss scoring differences
├─ Align on standards
└─ Update qualification guidelines

30 min: Coaching Best Practices
├─ Share coaching successes
├─ Discuss challenges
├─ Align on approaches
├─ Update playbooks
└─ Plan skill development focus

Calibration Outcomes:
✓ Aligned qualification criteria
✓ Consistent coaching approaches
✓ Standardized performance expectations
✓ Shared best practices
✓ Team skill development plan
```

---

## Module 6: Advanced CRM-Ultra Features (45 minutes)

### 6.1 Manager-Specific Analytics

**Team Performance Analytics Dashboard:**

```yaml
Executive Summary View:

Revenue Metrics:
├─ Team MTD revenue: $XXX,XXX (X% of goal)
├─ Team YTD revenue: $X,XXX,XXX (X% of annual goal)
├─ vs. Last year: ↑ 15%
├─ vs. Forecast: $XX,XXX over/under
├─ Average deal size: $X,XXX

Efficiency Metrics:
├─ Leads generated: XXX
├─ Leads contacted: XXX (XX%)
├─ Average response time: X.X hours
├─ Average sales cycle: XX days
├─ Cost per acquisition: $XXX

Quality Metrics:
├─ Conversion rate: XX%
├─ Win rate by lead source: [chart]
├─ Lost reasons analysis
├─ Agent performance distribution
├─ Forecast accuracy: XX%
```

**Custom Report Builder:**

```yaml
Build Your Own Reports:

Data Sources Available:
├─ Lead demographic data
├─ Activity history (calls, emails, tasks)
├─ Sales performance data
├─ Agent activity and productivity
├─ Conversion funnel metrics
├─ Revenue and ROI calculations
├─ Customer satisfaction scores
├─ Time-series historical data

Report Types:
├─ Tabular reports (data tables)
├─ Visual charts (bar, line, pie)
├─ Funnel analysis
├─ Trend analysis over time
├─ Cohort analysis
├─ Geographic heat maps
├─ Agent comparison matrix

Report Scheduling:
├─ Real-time dashboards
├─ Daily email summaries
├─ Weekly performance reports
├─ Monthly trend analysis
├─ Quarterly business reviews
```

### 6.2 Workflow Management

**Team Workflow Configuration:**

```yaml
Manager Workflow Controls:

Standard Workflows:✓ Can view
✓ Can enable/disable
✓ Cannot edit

Team-Specific Workflows:
✓ Can create
✓ Can edit
✓ Can assign
✓ Can enable/disable

Example Team Workflows:

Workflow 1: "New Lead Welcome Series"
Trigger: New lead assigned to team
Action Sequence:
  ├─ Immediate: Send welcome email
  ├─ 2 hours: If no contact, alert agent
  ├─ 24 hours: Create follow-up task
  ├─ 3 days: Send educational content
  ├─ 7 days: Manager notification if still NEW

Workflow 2: "Stale Lead Alert"
Trigger: Lead age exceeds threshold
Actions:
  ├─ Alert agent and manager
  ├─ Create priority task
  ├─ Add "stale-lead" tag
  ├─ 3 days: Escalate to team lead
```

### 6.3 Team Communication Tools

**Built-in Communication:**

```yaml
Team Chat & Collaboration:

Team Channels:
├─ #general-team: Daily communication
├─ #wins: Deal celebrations
├─ #questions: Help and support
├─ #best-practices: Tips and tricks
├─ #manager-updates: Announcements

Direct Messaging:
├─ 1:1 agent conversations
├─ Private coaching discussions
├─ File sharing and collaboration

Integration with External Tools:
├─ Slack integration available
├─ Microsoft Teams integration
├─ Email notifications configurable
├─ SMS alerts for urgent items
```

---

## Module 7: Continuous Improvement (30 minutes)

### 7.1 Establishing Improvement Processes

**Continuous Improvement Framework:**

```yaml
Monthly Retrospective Process:

Attendees: Manager + all team members
Duration: 90 minutes
Cadence: Last Friday of each month

Agenda:

Part 1: Data Review (20 min)
├─ Team performance metrics
├─ Individual achievements
├─ Process efficiency numbers
├─ Customer feedback

Part 2: What Worked (15 min)
├─ Individual successes
├─ Team wins
├─ Process improvements
├─ Positive customer interactions

Part 3: Challenges & Opportunities (25 min)
├─ What didn't work well
├─ Frustrations and pain points
├─ Ideas for improvement
├─ Root cause analysis

Part 4: Action Planning (20 min)
├─ Top 3 improvements to implement
├─ Assign owners
├─ Set timelines
├─ Define success metrics

Part 5: Team Building (10 min)
├─ Recognition and appreciation
├─ Team activity (optional)
├─ Preview next month's focus
```

**Process Improvement Opportunities:**

```yaml
Common Areas for Improvement:

Lead Quality:
├─ Source performance declining
├─ Lead score accuracy issues
├─ Qualification rate low
├─ Too many unqualified leads

Agent Performance:
├─ Response time increasing
├─ Conversion rate declining
├─ Activity levels dropping
├─ Stale leads accumulating

Process Bottlenecks:
├─ Quote turnaround too slow
├─ Underwriting delays
├─ Technology/system issues
├─ Handoff inefficiencies

Customer Experience:
├─ Satisfaction scores declining
├─ Complaints increasing
├─ Response quality issues
├─ Process confusion
```

---

## Training Certification

To receive Sales Manager Certification:

✅ Complete all 7 modules (3.5 hours)  
✅ Pass assessment (85% or higher)  
✅ Demonstrate CRM configuration skills  
✅ Conduct mock coaching session  
✅ Create team forecast and plan  
✅ Develop improvement action plan  
✅ Complete 30-day post-training checkpoint  

**Benefits:**
- CRM-Ultra Certified Sales Manager designation  
- Advanced analytics access  
- Leadership community membership  
- Manager certification for career advancement  
- Annual recertification  

---

**Training Program Version:** 1.0  
**Last Updated:** January 2025  
**Training Duration:** 3.5 hours  
**Prerequisites:** Admin training, 6+ months experience  
**Training Team:** CRM-Ultra Leadership Development  
**Contact:** manager-training@crm-ultra.com  
**Next Review:** April 2025
