# Lead Management User Guide

## Introduction

This guide helps users of all roles effectively manage leads throughout the insurance sales lifecycle using CRM-Ultra's comprehensive lead management system.

**Target Audience:** Sales agents, sales managers, team leads, and administrative staff
**Document Version:** 1.0
**Last Updated:** January 2025

---

## Table of Contents

1. [Getting Started](#getting-started)
2. [Dashboard Navigation](#dashboard-navigation)
3. [Lead Overview](#lead-overview)
4. [Lead Management Workflows](#lead-management-workflows)
5. [Qualification & Scoring](#qualification--scoring)
6. [Assignment & Distribution](#assignment--distribution)
7. [Activity Tracking](#activity-tracking)
8. [Reporting & Analytics](#reporting--analytics)
9. [Best Practices](#best-practices)
10. [Troubleshooting](#troubleshooting)

---

## Getting Started

### Accessing the System

1. **Login:** Navigate to your CRM-Ultra URL (provided by your administrator)
2. **Credentials:** Use your company email and password
3. **First Time Login:** Follow the password reset flow sent to your email
4. **Multi-Factor Authentication:** Set up MFA if required by your organization

### User Roles and Permissions

| Role | Main Responsibilities | Key Features Available |
|------|----------------------|------------------------|
| **Sales Agent** | Work assigned leads, update statuses, add notes | Lead viewing, note creation, email communication, task management |
| **Sales Manager** | Oversee team performance, assign leads, run reports | All agent features + lead assignment, team analytics, reporting |
| **Administrator** | System configuration, user management, workflow setup | All features + system settings, user management, automation rules |

### Quick Navigation Tips

- **Global Search:** Use the search bar to find leads by name, email, or phone
- **Keyboard Shortcuts:** Press `?` to see available shortcuts
- **Favorites:** Star important leads for quick access
- **Filters:** Save frequently used filter combinations
- **Notifications:** Red dot indicates unread notifications or assigned leads

---

## Dashboard Navigation

### Main Dashboard Components

#### 1. Navigation Menu
**Location:** Left sidebar

| Icon | Section | Purpose | Who Uses It |
|------|---------|---------|-------------|
| 📊 | Dashboard | Overview of your pipeline and performance | All users |
| 👥 | Leads | View and manage all leads | All users |
| ✅ | Tasks | Your assigned tasks and todo items | All users |
| 📧 | Emails | Email communications and templates | All users |
| 📈 | Reports | Analytics and performance metrics | Managers, Admins |
| ⚙️ | Settings | System configuration | Admins only |

#### 2. Dashboard Widgets

**My Performance Widget**
- Leads assigned to me
- Conversion rate
- Revenue generated
- Average response time

**Team Activity Feed**
- Recent lead assignments
- Status changes
- New notes added
- Emails sent

**Priority Leads**
- Hot leads requiring immediate attention
- Leads with upcoming follow-ups
- Overdue tasks

#### 3. Quick Actions Panel

Located at the top right:
- **+ New Lead:** Manually create a lead
- **+ Add Note:** Quick note entry
- **📧 Compose Email:** Send email to lead
- **✅ Create Task:** Add a new task

---

## Lead Overview

### Lead Record Structure

Each lead contains the following information sections:

#### 1. Contact Information
- **Name:** First and last name
- **Email:** Primary email address
- **Phone:** Primary phone number
- **Alternate Phone:** Additional contact number
- **Address:** Street, city, state, zip code

#### 2. Lead Details
- **Source:** Where the lead originated (e.g., Facebook Ads, Website, Referral)
- **Insurance Type:** AUTO, HOME, LIFE, HEALTH, COMMERCIAL, BUNDLE
- **Status:** Current stage in the sales process (see status definitions below)
- **Priority:** HIGH, MEDIUM, LOW
- **Assigned To:** Sales agent responsible for the lead
- **Created Date:** When the lead entered the system

#### 3. Custom Fields
Your administrator may have configured additional fields specific to your business needs.

### Lead Status Definitions

| Status | Description | Typical Next Step | SLA Target |
|--------|-------------|-------------------|------------|
| **NEW** | Recently entered system, not yet contacted | Initial outreach | 2 hours |
| **CONTACTED** | Initial contact made, lead responsive | Qualification | 24 hours |
| **QUALIFIED** | Lead meets criteria, interested in products | Quote preparation | 48 hours |
| **QUOTED** | Quote provided to lead | Follow-up | 72 hours |
| **NEGOTIATION** | Discussing terms and pricing | Close sale | 5 days |
| **WON** | Policy sold and finalized | Handoff to service | N/A |
| **LOST** | Lead not converted | Archive/retarget | N/A |
| **NURTURE** | Future opportunity, keep in touch | Periodic check-ins | Monthly |

---

## Lead Management Workflows

### Workflow 1: New Lead Processing

**When:** A new lead enters the system
**Average Time:** 2-4 minutes

#### Step 1: Review Lead Details
1. Click on the lead from your assigned leads list
2. Review contact information for accuracy
3. Check the lead source and insurance type
4. Look for any initial notes or special instructions

#### Step 2: Research the Lead
1. Verify contact information if possible
2. Check for existing customer records
3. Research the lead's location for regional factors
4. Prepare for initial outreach

#### Step 3: Initial Contact
1. Choose contact method (phone is recommended for new leads)
2. Use the communication features to log all interactions
3. Update lead status to CONTACTED after successful outreach
4. Add detailed notes about the conversation

#### Step 4: Qualification
1. Use the qualification form to assess lead quality
2. Update status to QUALIFIED if appropriate
3. Set priority level based on urgency and potential
4. Create follow-up tasks as needed

### Workflow 2: Daily Lead Management

**When:** Start of each workday
**Average Time:** 15-30 minutes

#### Step 1: Review Dashboard
1. Check for newly assigned leads
2. Review overdue tasks
3. Check priority leads requiring attention
4. Review team activity for context

#### Step 2: Prioritize Your Day
1. Sort leads by priority and due date
2. Identify hot leads requiring immediate follow-up
3. Check for scheduled calls or meetings
4. Plan your outreach sequence

#### Step 3: Process Leads
1. Work through your prioritized list
2. Update statuses as you make progress
3. Add notes for every interaction
4. Create tasks for follow-up actions

#### Step 4: End-of-Day Routine
1. Update all lead statuses
2. Complete or reschedule tasks
3. Review tomorrow's scheduled activities
4. Add notes about next steps

### Workflow 3: Lead Qualification

**When:** After initial contact or during lead review
**Average Time:** 5-10 minutes

#### Qualification Criteria

CRM-Ultra automatically scores leads based on:

| Criteria | High Score | Medium Score | Low Score |
|----------|-----------|--------------|-----------|
| **Contact Info** | Complete info + verified | Complete info | Missing key info |
| **Insurance Need** | Immediate need | Within 30 days | Future need |
| **Budget** | Clear budget + affordable | Budget range | No budget discussed |
| **Decision Maker** | Yes, they are | Shared decision | Need to consult others |
| **Timeline** | Ready to buy | Within 2 weeks | Undefined timeline |

#### Manual Qualification Process

1. **Access Qualification Form:**
   - Open the lead record
   - Click "Qualify Lead" button
   - Or scroll to Qualification section

2. **Answer Qualification Questions:**
   ```
   □ Is this person the decision maker?
   □ What type of insurance do they need?
   □ What is their estimated budget?
   □ When do they need coverage to start?
   □ Have they quoted with competitors?
   □ What is their current insurance status?
   ```

3. **Update Scoring:**
   - System calculates lead score automatically
   - Override score if you have additional context
   - Add qualitative notes about lead quality

4. **Set Next Actions:**
   - Update lead status based on qualification
   - Create follow-up tasks
   - Set priority level
   - Schedule next contact date

---

## Qualification & Scoring

### Understanding Lead Scores

Lead scores range from 0-100 and are color-coded:
- 🟢 **80-100 (Hot):** High priority, immediate action needed
- 🟡 **60-79 (Warm):** Good potential, standard follow-up
- 🟠 **40-59 (Cool):** Lower priority, nurture over time
- 🔴 **0-39 (Cold):** Minimal potential, periodic check-ins

### Factors Affecting Lead Score

**Automatic Factors:**
- Lead source quality (some sources score higher)
- Contact information completeness
- Response time to initial outreach
- Engagement with emails or website
- Demographic match to ideal customer profile

**Manual Factors:**
- Your qualification assessment
- Notes indicating urgency or readiness
- Status progression speed
- Task completion rates

### Improving Lead Quality

**Tips for Better Qualification:**

1. **Ask Open-Ended Questions:**
   - "What prompted you to look for insurance now?"
   - "What coverage concerns do you have?"
   - "What would an ideal insurance solution look like?"

2. **Listen for Buying Signals:**
   - Specific questions about coverage
   - Timeline discussions
   - Budget conversations
   - Comparison shopping mentions

3. **Document Everything:**
   - Every interaction affects lead quality
   - Detailed notes help with scoring
   - Other team members benefit from your insights

---

## Assignment & Distribution

### How Leads Are Assigned

**Automatic Assignment Rules:**
- Round-robin distribution among available agents
- Load balancing based on current workload
- Skill-based routing (by insurance type or territory)
- Source-based assignment (certain agents handle specific sources)

**Manual Assignment:**
- Managers can override automatic assignment
- Agents can claim unassigned leads
- Leads can be transferred between agents
- Team-based assignment for collaboration

### Managing Your Lead Queue

#### Viewing Your Assigned Leads

1. **All My Leads:**
   ```
   Dashboard → Leads → My Leads
   ```
   Shows all leads currently assigned to you

2. **New Leads:**
   ```
   Dashboard → Leads → New Assignments
   ```
   Shows only leads needing initial contact

3. **Priority Leads:**
   ```
   Dashboard → Priority Leads
   ```
   Shows high-scoring or urgent leads

#### Organizing Your Leads

**Using Tags:**
- Add custom tags to categorize leads
- Examples: "hot-prospect", "price-sensitive", "needs-follow-up"
- Filter leads by tags for focused work sessions

**Using Custom Fields:**
- Your admin may have created custom fields
- Use these to segment your leads
- Examples: "Preferred Contact Method", "Referral Source Detail"

**Sorting and Filtering:**
- Sort by: Score, Created Date, Last Activity, Status
- Filter by: Status, Priority, Insurance Type, Date Range
- Save frequently used filter combinations

### Transferring Leads

**When to Transfer:**
- Lead needs different insurance expertise
- Language requirements
- Geographic considerations
- Request from lead for different agent

**How to Transfer:**
1. Open the lead record
2. Click "Transfer Lead"
3. Select new assignee
4. Add transfer reason
5. Include notes for new agent
6. Confirm transfer

---

## Activity Tracking

### Automatic Activity Logging

The system automatically logs:
- Lead creation and source
- Status changes
- Assignee changes
- Emails sent and opened
- Tasks created and completed
- Notes added
- Quotes generated

### Manual Activity Entry

**When to Add Manual Activities:**
- Phone calls made or received
- In-person meetings
- Text messages
- Third-party communications
- Important conversations or decisions

**How to Add Activities:**
1. Open the lead record
2. Click "Add Activity"
3. Select activity type:
   - Phone Call
   - Meeting
   - SMS/Text
   - Other
4. Enter details and notes
5. Set follow-up reminders if needed
6. Save activity

### Viewing Activity History

**Accessing Activity Timeline:**
```
Lead Record → Activity Tab
```

**Activity Timeline Shows:**
- Chronological list of all activities
- Who performed each action
- What changed or happened
- When it occurred
- Related notes and details

**Filtering Activities:**
- By date range
- By activity type
- By user
- By specific keywords

### Exporting Activity Data

**Export Options:**
- CSV format for spreadsheet analysis
- PDF format for sharing and printing
- Date range selection
- Filtered exports (specific activities only)

**Use Cases for Exporting:**
- Client presentations
- Performance reviews
- Compliance documentation
- Process analysis
- Training examples

---

## Reporting & Analytics

### Available Reports

#### 1. Lead Pipeline Report
**Shows:** Leads by status, conversion rates, pipeline velocity
**Use For:** Forecasting, identifying bottlenecks
**Frequency:** Weekly review recommended

#### 2. Conversion Analysis
**Shows:** Lead-to-customer conversion by source, agent, time period
**Use For:** Optimizing marketing spend, agent coaching
**Frequency:** Monthly analysis

#### 3. Agent Performance
**Shows:** Individual and team performance metrics
**Use For:** Performance reviews, identifying training needs
**Frequency:** Weekly for managers

#### 4. Activity Report
**Shows:** Number of activities by type, agent, date range
**Use For:** Productivity analysis, workload balancing
**Frequency:** Weekly for managers, daily for self-monitoring

#### 5. Lead Source Analysis
**Shows:** Which sources generate the best leads
**Use For:** Marketing optimization, budget allocation
**Frequency:** Monthly strategic review

### Running Reports

**Step-by-Step:**
1. Navigate to Reports section
2. Select report type
3. Set parameters:
   - Date range
   - Specific agents (if applicable)
   - Lead sources (if applicable)
   - Other filters
4. Click "Generate Report"
5. View on screen or export

### Understanding Key Metrics

**Conversion Rate:**
- % of leads that become customers
- Benchmark: 15-25% industry average
- Calculation: (Won Leads ÷ Total Leads) × 100

**Average Response Time:**
- Time from lead creation to first contact
- Benchmark: Under 5 minutes for hot leads
- Impact: Faster response = higher conversion

**Pipeline Velocity:**
- Average time leads spend in each status
- Benchmark: 7-14 days from new to won
- Use: Identify where leads get stuck

**Lead Quality Score:**
- Automated assessment of lead potential
- Range: 0-100 (higher is better)
- Use: Prioritize high-scoring leads first

---

## Best Practices

### For Sales Agents

#### Lead Engagement
- **Respond within 5 minutes** when possible - response time directly impacts conversion
- **Personalize your approach** based on lead source and information
- **Use multiple contact methods** - phone, email, SMS as appropriate
- **Set clear expectations** about next steps and timelines

#### Note-Taking
- **Add notes immediately** after every interaction
- **Be specific** - include dates, times, key discussion points
- **Use templates** for common scenarios to save time
- **Tag important information** for easy searching

#### Task Management
- **Create tasks for every follow-up** - don't rely on memory
- **Set realistic due dates** - allow buffer time
- **Prioritize daily** - focus on hot leads first
- **Complete tasks promptly** - update status as you work

### For Sales Managers

#### Team Management
- **Review team pipelines daily** - identify stuck leads
- **Provide timely feedback** on activities and notes
- **Balance workload** - redistribute leads when needed
- **Celebrate wins** - recognize successful conversions

#### Coaching
- **Use activity data** to identify coaching opportunities
- **Share best practices** from top performers
- **Monitor key metrics** - response time, conversion rates
- **Conduct regular one-on-ones** to discuss lead strategies

#### Process Improvement
- **Analyze conversion patterns** - what's working?
- **Review lead sources** regularly - optimize spending
- **Solicit team feedback** - agents know the process best
- **Test new approaches** - A/B test scripts and strategies

### For Administrators

#### System Maintenance
- **Regularly review automation rules** for effectiveness
- **Update user permissions** as roles change
- **Monitor data quality** - incomplete records affect performance
- **Keep documentation current** - help team stay informed

#### User Management
- **Create onboarding program** for new users
- **Provide role-specific training** materials
- **Establish support processes** for user questions
- **Regularly review access** - remove unused accounts

---

## Troubleshooting

### Common Issues

#### "I can't see my leads"
**Possible Causes:**
- Leads assigned to another agent
- Filter settings hiding leads
- Status filters too restrictive
- Browser cache issue

**Solutions:**
1. Clear filters and search again
2. Check "All Leads" instead of "My Leads"
3. Clear browser cache and reload
4. Contact manager to verify assignment

#### "The system is running slowly"
**Possible Causes:**
- Too many leads loaded at once
- Browser memory issues
- Network connectivity
- System maintenance window

**Solutions:**
1. Use filters to show fewer leads
2. Close unnecessary browser tabs
3. Check internet connection
4. Contact IT support if persists

#### "I can't update lead status"
**Possible Causes:**
- Insufficient permissions
- Lead locked by another user
- Status transition rules
- System error

**Solutions:**
1. Verify you have edit permissions
2. Refresh the page
3. Contact administrator about status rules
4. Log out and log back in

#### "Email won't send"
**Possible Causes:**
- Invalid email address
- Email template issues
- Integration problems
- Daily sending limits

**Solutions:**
1. Verify email address format
2. Try sending without template
3. Check email integration status
4. Contact administrator about limits

### Getting Help

**Self-Service Resources:**
- Knowledge base articles
- Video tutorials
- FAQ section
- User community forum

**Support Contacts:**
- **Level 1 Support:** help@crm-ultra.com - General questions and troubleshooting
- **Level 2 Support:** tech@crm-ultra.com - Technical issues and integrations
- **Emergency Support:** Call 1-800-CRM-ULTRA for system outages

**When Contacting Support:**
1. Provide lead ID if issue is lead-specific
2. Include screenshots of error messages
3. Describe steps to reproduce the issue
4. Share your user ID and role

---

## FAQs

### Q: How many leads should I work at one time?
**A:** Focus on quality over quantity. Most agents effectively manage 20-30 active leads simultaneously. Use priority scoring to work the hottest leads first.

### Q: How often should I follow up with leads?
**A:** Industry best practices suggest:
- Initial contact within 5 minutes
- Second contact within 24 hours if no response
- Weekly touchpoints for warm leads
- Monthly check-ins for nurture leads

### Q: What makes a lead "hot"?
**A:** Hot leads typically have:
- High quality score (80+)
- Immediate insurance need
- Available budget
- Decision-making authority
- Responsiveness to contact attempts

### Q: Can I reassign a lead I can't help?
**A:** Yes, use the transfer feature to assign to another agent. Always add notes explaining why you're transferring and what you've learned about the lead.

### Q: How do I handle leads that go cold?
**A:** Change status to NURTURE and set periodic follow-up reminders. Continue monthly check-ins and add to email marketing campaigns when appropriate.

### Q: What should I include in my notes?
**A:** Include date/time, contact method, key discussion points, customer needs/concerns, next steps, and personal details that build rapport.

### Q: How do I track my performance?
**A:** Use the Dashboard → My Performance section to see conversion rates, response times, revenue generated, and comparison to team averages.

---

## Next Steps and Resources

### Additional Documentation
- [API Documentation](./api-docs) - Technical integration guide
- [Administrator Guide](./user-guides/administrator.md) - System configuration
- [Integration Guide](./user-guides/integration-guide.md) - Third-party connections
- [Video Tutorials](https://training.crm-ultra.com) - Visual learning resources

### Training Resources
- **Beginner Training:** [Quick Start Guide](./quickstart-guides/new-user-onboarding.md)
- **Advanced Training:** [Power User Techniques](./training-modules/advanced-sales-techniques.md)
- **Certification Program:** [CRM-Ultra Certified Professional](https://certification.crm-ultra.com)

### Support Channels
- **Help Desk:** support.crm-ultra.com
- **Email:** help@crm-ultra.com
- **Phone:** 1-800-CRM-ULTRA
- **Live Chat:** Available in-app
- **Community:** community.crm-ultra.com

---

## Document Information

**Document Owner:** CRM-Ultra Training Team  
**Version:** 1.0  
**Last Updated:** January 2025  
**Review Schedule:** Quarterly  

**For Documentation Updates:**  
- Submit feedback via in-app feedback tool
- Email docs@crm-ultra.com
- Create documentation request ticket

**Change Log:**
- v1.0 - Initial release - January 2025

---

*This document is part of the CRM-Ultra Knowledge Management System. For the latest version, always refer to the online documentation portal.*