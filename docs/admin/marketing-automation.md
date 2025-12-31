# Marketing Automation Guide

Complete guide to setting up and managing marketing automation workflows.

## Table of Contents

- [Overview](#overview)
- [Workflow Triggers](#workflow-triggers)
- [Workflow Actions](#workflow-actions)
- [Creating Workflows](#creating-workflows)
- [Lead Segmentation](#lead-segmentation)
- [Email Templates](#email-templates)
- [Workflow Analytics](#workflow-analytics)
- [Best Practices](#best-practices)

---

## Overview

Marketing automation allows you to automate repetitive marketing and sales tasks, saving time and ensuring no lead falls through the cracks.

### Key Benefits

- **Consistency**: Every lead receives consistent follow-up
- **Efficiency**: Save time with automated processes
- **Personalization**: Deliver personalized messages at scale
- **Timeliness**: Respond instantly to lead actions
- **Scalability**: Handle more leads without adding staff

### Use Cases

1. **Lead Nurturing**: Automatically nurture leads not ready to buy
2. **New Lead Welcome**: Immediate acknowledgment and information
3. **Re-engagement**: Bring back inactive leads
4. **Conversion Follow-up**: Post-conversion onboarding
5. **Event Promotion**: Automated webinar/event reminders
6. **Cross-sell/Up-sell**: Identify opportunities for additional products

---

## Workflow Triggers

Triggers start a workflow when specific events occur.

### Lead-Based Triggers

**Trigger**: Lead Created
- Fires when a new lead enters the system
- Use for: Welcome sequences, initial qualification

**Trigger**: Lead Status Changed
- Fires when lead status changes
- Configure: Which status change to trigger on
- Use for: Stage-specific automation

**Trigger**: Lead Score Threshold Crossed
- Fires when score crosses defined threshold
- Configure: Threshold value and direction (increased/decreased)
- Use for: Priority handling, urgent notifications

**Trigger**: Lead Field Updated
- Fires when specific field changes
- Configure: Which field(s) to monitor
- Use for: Behavior-based automation

### Communication Triggers

**Trigger**: Email Opened
- Fires when email is opened
- Use for: Engaged lead follow-up

**Trigger**: Email Clicked
- Fires when link in email is clicked
- Configure: Which link(s) to monitor
- Use for: Interest-based segmentation

**Trigger**: Email Replied
- Fires when recipient replies to email
- Use for: Transfer to sales, priority handling

**Trigger**: SMS Sent/Received
- Fires when SMS is sent or received
- Use for: Conversation continuation, opt-out handling

### Task Triggers

**Trigger**: Task Completed
- Fires when task is marked complete
- Use for: Next step in sequence

**Trigger**: Task Overdue
- Fires when task passes due date
- Use for: Escalation, reminders

### Date/Time Triggers

**Trigger**: Scheduled Time
- Fires at specified date/time
- Use for: One-off campaigns, reminders

**Trigger**: Recurring Schedule
- Fires on recurring schedule (daily, weekly, monthly)
- Use for: Check-ins, recurring communications

**Trigger**: Relative Time
- Fires X time after trigger event
- Configure: Time delay (e.g., 2 hours after lead created)
- Use for: Sequences, follow-ups

### System Triggers

**Trigger**: Custom Event
- Fires on custom webhook event
- Use for: External system integration

**Trigger**: Form Submission
- Fires when specific form is submitted
- Use for: Immediate follow-up

---

## Workflow Actions

Actions are what happens when a workflow triggers.

### Communication Actions

**Action**: Send Email
- Send an email to lead or team member
- Configure:
  - Template or custom email
  - Recipient (lead, assignee, custom email)
  - From address
  - Reply-to address
  - Attachments

**Action**: Send SMS
- Send SMS message
- Configure:
  - Message text (160 character limit)
  - Recipient
  - From number

**Action**: Add Note
- Add note to lead record
- Configure:
  - Note content
  - Visibility (private, team, public)

### Lead Actions

**Action**: Change Status
- Update lead status
- Configure: New status value

**Action**: Update Score
- Adjust lead score
- Configure: Point value (+/-)
- Add reason for audit trail

**Action**: Assign Lead
- Assign lead to agent or team
- Configure: Agent/team selection
- Option: Round Robin within team

**Action**: Add to Segment
- Add lead to segment
- Configure: Segment selection

**Action**: Remove from Segment
- Remove lead from segment
- Configure: Segment selection

### Task Actions

**Action**: Create Task
- Create a new task
- Configure:
  - Title
  - Description
  - Assignee
  - Due date (relative or absolute)
  - Priority
  - Recurrence (optional)

**Action**: Complete Task
- Mark existing task as complete
- Configure: Which task(s) to complete

**Action**: Reassign Task
- Change task assignee
- Configure: New assignee

### Notification Actions

**Action**: Send Notification
- Send in-app notification to user
- Configure:
  - Recipient(s)
  - Notification title
  - Message content
  - Priority

**Action**: Send Webhook
- Send webhook to external system
- Configure:
  - Endpoint URL
  - Method (GET, POST, PUT, DELETE)
  - Headers
  - Body (with variables)

### Workflow Control Actions

**Action**: Wait/Delay
- Pause workflow for specified time
- Configure: Duration (minutes, hours, days)

**Action**: Condition/If-Then
- Branch workflow based on conditions
- Configure:
  - Condition logic (AND/OR)
  - Multiple branches
  - Default branch

**Action**: Loop
- Repeat actions for multiple items
- Configure:
  - Loop condition
  - Exit criteria

**Action**: Stop Workflow
- Terminate workflow execution

**Action**: Exit Branch
- Continue from next branch or action

---

## Creating Workflows

### Workflow Builder Interface

Access the workflow builder:

**Location**: Marketing Automation > Workflows > + New Workflow

### Step-by-Step Creation

#### Step 1: Basic Information

1. **Workflow Name**: Descriptive name (e.g., "New Lead Welcome Sequence")
2. **Description**: What this workflow does
3. **Tags**: Categorize workflows (welcome, nurturing, re-engagement)

#### Step 2: Set Trigger

1. Select trigger type from dropdown
2. Configure trigger settings:
   - Which lead status? (for status change trigger)
   - What score threshold? (for score trigger)
   - How long to wait? (for time triggers)
3. Add multiple triggers if needed (any trigger will start workflow)

#### Step 3: Build Workflow

Drag and drop actions to build your workflow:

**Example: Simple Welcome Sequence**

```
[Trigger: Lead Created]
    ↓
[Action: Wait 15 minutes]
    ↓
[Action: Send Email - Welcome Template]
    ↓
[Action: Wait 24 hours]
    ↓
[Action: Create Task - Follow-up Call]
```

**Example: Conditional Workflow**

```
[Trigger: Email Opened - Qualification Email]
    ↓
[Condition: Lead Score > 70]
    ├── [True Path]: [Send Email - Demo Invitation]
    └── [False Path]: [Send Email - Additional Information]
```

#### Step 4: Configure Each Action

For each action in your workflow:

1. Click the action to open configuration
2. Fill in required fields
3. Use variables for personalization:
   - `{{lead.firstName}}`
   - `{{lead.lastName}}`
   - `{{lead.email}}`
   - `{{lead.score}}`
   - `{{lead.insuranceType}}`
   - `{{agent.firstName}}`
   - `{{agent.email}}`

#### Step 5: Test Workflow

Before activating, test your workflow:

1. Click "Test Workflow"
2. Create test lead or select existing lead
3. Walk through workflow execution
4. Review results
5. Adjust as needed

#### Step 6: Activate Workflow

1. Review entire workflow
2. Click "Activate"
3. Monitor initial executions
4. Make adjustments based on results

### Workflow Examples

#### Example 1: New Lead Welcome Sequence

**Purpose**: Immediate acknowledgment and information for new leads

**Trigger**: Lead Created

**Sequence**:
1. Wait 15 minutes (not too immediate)
2. Send "Welcome" email with basic information
3. Wait 24 hours
4. Send "Getting Started" email with next steps
5. Wait 48 hours
6. Create task: "Make introductory call"

#### Example 2: Lead Nurturing Workflow

**Purpose**: Nurture leads not ready to convert

**Trigger**: Lead status changed to "Not Ready" OR Score < 50

**Sequence**:
1. Wait 2 days
2. Send educational content email
3. Wait 4 days
4. Send case study email
5. Wait 7 days
6. Send "Check-in" email with question
7. Condition: Email opened?
   - Yes: Create task for follow-up
   - No: Continue nurturing sequence

#### Example 3: Re-engagement Workflow

**Purpose**: Bring back inactive leads

**Trigger**: No activity for 30 days

**Sequence**:
1. Send "We miss you" email with special offer
2. Wait 7 days
3. Condition: Any activity?
   - Yes: Exit workflow
   - No: Send "Last chance" email
4. Wait 7 days
5. Condition: Any activity?
   - Yes: Exit workflow
   - No: Change status to "Inactive"

#### Example 4: High-Value Lead Workflow

**Purpose**: Prioritize and fast-track high-value leads

**Trigger**: Score crosses 90

**Sequence**:
1. Send notification to sales team
2. Assign to top performer
3. Send "VIP Treatment" email
4. Create task: "Immediate follow-up - priority"
5. Wait 2 hours
6. Condition: Contact made?
   - Yes: Send acknowledgment to agent
   - No: Escalate to manager

---

## Lead Segmentation

Segmentation allows you to group leads for targeted automation.

### Creating Segments

**Location**: Marketing Automation > Segments > + New Segment

**Segment Types**:

#### Static Segments

Manually curated lists that don't change automatically.

**Use cases**:
- Event attendees
- Referral leads
- VIP customers
- Test group for A/B testing

#### Dynamic Segments

Auto-updating lists based on criteria.

**Use cases**:
- High-priority leads (score > 80)
- New leads (created < 7 days ago)
- Auto insurance leads only
- Leads in specific geographic area

### Segment Criteria

Build segment rules using:

**Demographic Criteria**:
- Age, income, location
- Insurance type
- Lead source

**Behavioral Criteria**:
- Email opens/clicks
- Website visits
- Form submissions

**Score Criteria**:
- Score ranges
- Score change trends

**Engagement Criteria**:
- Last activity date
- Communication history
- Task completion

**Custom Field Criteria**:
- Any custom field
- Field values or ranges

### Segment Logic

Combine criteria with AND/OR logic:

**Example**: High-intent auto insurance leads in California

```
Insurance Type = AUTO
AND Score > 70
AND State = CA
AND Last Activity < 7 days ago
```

### Using Segments in Automation

**Targeting**:
- Send campaigns to specific segments
- Apply different workflows to different segments
- Exclude segments from campaigns

**Monitoring**:
- Track segment growth
- Monitor segment conversion rates
- Identify opportunities for new segments

---

## Email Templates

Create reusable email templates for automation.

### Creating Templates

**Location**: Marketing Automation > Email Templates > + New Template

**Template Fields**:

1. **Template Name**: Descriptive name
2. **Subject Line**: Email subject with variables
3. **Preview Text**: Preview text in inbox
4. **Plain Text Body**: Text-only version
5. **HTML Body**: Rich HTML version
6. **Variables**: Used variables list

### Template Variables

Available variables for personalization:

**Lead Variables**:
- `{{lead.firstName}}`
- `{{lead.lastName}}`
- `{{lead.email}}`
- `{{lead.phone}}`
- `{{lead.company}}`
- `{{lead.score}}`
- `{{lead.insuranceType}}`

**Agent Variables**:
- `{{agent.firstName}}`
- `{{agent.lastName}}`
- `{{agent.email}}`
- `{{agent.phone}}`

**Company Variables**:
- `{{company.name}}`
- `{{company.website}}`
- `{{company.address}}`

**Dynamic Variables**:
- `{{today.date}}` - Today's date
- `{{tomorrow.date}}` - Tomorrow's date
- `{{unsubscribeLink}}` - Unsubscribe link (required)

### Template Best Practices

1. **Subject Lines**
   - Keep under 50 characters for mobile
   - Personalize with name
   - Create urgency or curiosity
   - Avoid spam trigger words

2. **Content**
   - Keep it concise and scannable
   - Use clear call-to-action
   - Include single, focused message
   - Use formatting (bolding, bullet points)

3. **Design**
   - Mobile-responsive
   - On-brand colors and fonts
   - Clear visual hierarchy
   - Single column layout works best

4. **Compliance**
   - Include physical address
   - Include unsubscribe link
   - Honor opt-out requests
   - Follow CAN-SPAM, GDPR requirements

---

## Workflow Analytics

Track the performance of your automated workflows.

### Key Metrics

**Location**: Marketing Automation > Analytics

**Execution Metrics**:
- Total executions
- Executions over time
- Active workflows count

**Engagement Metrics**:
- Email open rate
- Email click rate
- SMS delivery rate

**Conversion Metrics**:
- Lead status changes
- Score improvements
- Conversion rate

**Performance Metrics**:
- Workflow completion rate
- Drop-off points
- Average time through workflow

### Workflow-Specific Reports

For each workflow, view:

1. **Summary**: Total executions, completion rate
2. **Timeline**: Executions over time
3. **Step Analysis**: Drop-off at each step
4. **A/B Testing**: Compare variants

### Funnel Analysis

Identify where leads drop off in workflows:

```
Start: 1000 leads
  ↓
Step 1 (Email Sent): 1000 (100%)
  ↓
Step 2 (Email Opened): 650 (65%)
  ↓
Step 3 (Email Clicked): 325 (32.5%)
  ↓
Step 4 (Task Created): 250 (25%)
  ↓
Complete: 200 (20%)
```

**Optimization opportunities**:
- Low open rate → Improve subject line
- Low click rate → Improve content/CTA
- High drop-off → Simplify step or adjust timing

### A/B Testing

Test different workflow variations:

**Test Variables**:
- Email subject lines
- Email content
- Send times
- Action order
- Wait times

**Setup**:
1. Create workflow variants
2. Define traffic split (50/50, 80/20)
3. Run test for statistically significant period
4. Analyze results
5. Implement winning variant

---

## Best Practices

### Design Principles

1. **Start Simple**: Begin with basic workflows, add complexity over time
2. **Think About the Journey**: Consider the lead's perspective and timing
3. **Avoid Over-Automation**: Balance automation with personal touch
4. **Test Thoroughly**: Always test before activating
5. **Monitor Regularly**: Review performance and adjust

### Timing Best Practices

1. **Don't Overwhelm**: Space out communications
2. **Respect Time Zones**: Send at appropriate local times
3. **Business Hours**: Send during business hours for best results
4. **Urgency vs. Patience**: Balance timely follow-up with giving leads time

### Content Best Practices

1. **Personalize Everything**: Use variables for personalization
2. **Value First**: Provide value before asking for something
3. **Clear CTAs**: Make next steps obvious
4. **Keep It Relevant**: Ensure content matches lead's stage and interests

### Maintenance Best Practices

1. **Regular Review**: Review workflows monthly
2. **Update Content**: Keep templates and messaging fresh
3. **Clean Up**: Deactivate underperforming workflows
4. **Iterate**: Continuously improve based on data

### Compliance Best Practices

1. **GDPR Compliance**:
   - Get explicit consent
   - Include unsubscribe links
   - Honor opt-out requests immediately
   - Allow data access and deletion

2. **CAN-SPAM Compliance**:
   - Include physical address
   - Clear subject lines
   - Working opt-out mechanism
   - Honor opt-outs within 10 days

3. **TCPA Compliance (SMS)**:
   - Get written consent for SMS
   - Include opt-out instructions
   - Honor STOP keywords
   - Respect quiet hours

---

## Support

For marketing automation assistance:

- **Documentation**: Browse full documentation library
- **Templates**: Request custom template creation
- **Consulting**: Hire our automation experts
- **Contact Support**: Submit a support ticket

**Marketing Automation Support**:
- **Email**: marketing-support@insurance-leads-platform.com
- **Webinars**: Weekly live training sessions
- **Response Time**: < 2 hours
