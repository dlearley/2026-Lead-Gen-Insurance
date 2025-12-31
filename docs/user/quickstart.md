# Getting Started Guide

Welcome to the Insurance Lead Generation AI Platform! This guide will help you get up and running quickly with our platform.

## Table of Contents

- [What is the Platform?](#what-is-the-platform)
- [Prerequisites](#prerequisites)
- [Account Setup](#account-setup)
- [Dashboard Overview](#dashboard-overview)
- [Creating Your First Campaign](#creating-your-first-campaign)
- [Managing Leads](#managing-leads)
- [Setting Up Integrations](#setting-up-integrations)
- [Next Steps](#next-steps)

## What is the Platform?

The Insurance Lead Generation AI Platform is an intelligent system that helps you:

- **Generate high-quality leads** from multiple sources
- **Qualify leads automatically** using AI-powered scoring
- **Route leads to the right agents** based on skills, availability, and location
- **Track all communication** with leads in one place
- **Automate follow-ups** with workflows and templates
- **Analyze performance** with real-time dashboards and reports

## Prerequisites

Before you begin, ensure you have:

- A modern web browser (Chrome, Firefox, Safari, or Edge)
- Your organization's invitation code or sign-up link
- Basic understanding of insurance sales workflows
- Administrator access if you're setting up the system for your team

## Account Setup

### Step 1: Create Your Account

1. Click the invitation link or visit the sign-up page
2. Enter your email address and create a password
3. Verify your email address by clicking the link sent to your inbox
4. Complete your profile:
   - First and last name
   - Phone number
   - Time zone
   - Role (Agent, Manager, Admin)

### Step 2: Complete Your Profile

Navigate to **Settings > Profile** and add:

- Profile photo (optional but recommended)
- Bio/expertise areas
- Working hours
- Assigned insurance types (Auto, Home, Life, Health, etc.)
- Contact preferences

### Step 3: Connect Your CRM

If your organization uses a CRM, connect it now:

1. Go to **Settings > Integrations**
2. Select your CRM provider (Salesforce, HubSpot, etc.)
3. Follow the authentication steps
4. Configure sync settings

## Dashboard Overview

After logging in, you'll see the main dashboard with:

### Key Metrics
- **Today's Leads**: Number of new leads received today
- **Active Leads**: Total leads in your pipeline
- **Conversion Rate**: Percentage of leads converted to policies
- **Response Time**: Average time to first contact

### Quick Actions
- **Create Campaign**: Start a new lead generation campaign
- **Add Lead**: Manually add a new lead
- **Send Email**: Compose and send emails to leads
- **Create Task**: Add a follow-up task

### Recent Activity
- Latest lead assignments
- Recent communications
- Task completions
- Workflow triggers

## Creating Your First Campaign

### Step 1: Navigate to Campaigns

Click **Campaigns** in the left navigation menu.

### Step 2: Create New Campaign

1. Click the **+ New Campaign** button
2. Fill in campaign details:
   - **Campaign Name**: Descriptive name (e.g., "Q1 2024 Auto Insurance Push")
   - **Campaign Type**: Select type (Email, Social Media, Referral, etc.)
   - **Insurance Type**: Select the insurance category
   - **Budget**: Set your budget limit
   - **Start Date**: When the campaign begins
   - **End Date**: When the campaign ends (optional)

### Step 3: Configure Lead Settings

1. **Lead Sources**: Select where leads will come from
   - Website forms
   - Social media ads
   - Email marketing
   - Referrals
   - Third-party providers

2. **Target Audience**: Define your ideal lead:
   - Geographic location
   - Age range
   - Insurance needs
   - Budget range

3. **Lead Scoring**: Set qualification criteria
   - Minimum score threshold
   - Required information
   - Disqualifying factors

### Step 4: Set Up Routing Rules

Configure how leads are assigned:

1. **Round Robin**: Distribute evenly among agents
2. **Skill-Based**: Match based on agent expertise
3. **Location-Based**: Assign by geographic region
4. **Capacity-Based**: Consider agent workload
5. **Priority Routing**: High-value leads to top performers

### Step 5: Launch Campaign

1. Review all settings
2. Click **Preview** to see a summary
3. Click **Launch Campaign** to go live

## Managing Leads

### View All Leads

1. Click **Leads** in the navigation
2. Use filters to find specific leads:
   - Status (New, In Progress, Qualified, Converted, Lost)
   - Source
   - Insurance type
   - Assigned agent
   - Date range
   - Lead score

### Lead Detail View

Click on any lead to see:

- **Contact Information**: Name, email, phone, address
- **Lead Score**: AI-calculated qualification score
- **Status**: Current stage in your pipeline
- **Source**: Where the lead came from
- **Activity Timeline**: All interactions and events
- **Notes**: Team notes about the lead
- **Emails**: Email communication history
- **Tasks**: Follow-up tasks and reminders
- **Analytics**: Engagement metrics and trends

### Updating Lead Status

1. Open the lead detail view
2. Click the **Status** dropdown
3. Select the new status:
   - **New**: Just received, not contacted yet
   - **Contacted**: First contact made
   - **Qualified**: Meets qualification criteria
   - **Proposal Sent**: Quote/proposal delivered
   - **Negotiation**: In discussion stage
   - **Converted**: Became a customer
   - **Lost**: Did not convert
4. Optionally add a note explaining the change

### Adding Notes

1. In the lead detail view, click the **Notes** tab
2. Click **+ Add Note**
3. Write your note (supports markdown)
4. Choose visibility:
   - **Private**: Only you can see
   - **Team**: Your team can see
   - **Public**: Anyone in organization can see
5. Click **Save**

### Sending Emails

1. In the lead detail view, click the **Email** button
2. Choose a template or compose from scratch
3. Fill in recipient details
4. Use variables to personalize:
   - `{{firstName}}`
   - `{{lastName}}`
   - `{{agentName}}`
   - `{{companyName}}`
5. Preview your email
6. Send immediately or schedule for later

### Creating Tasks

1. In the lead detail view, click the **Add Task** button
2. Fill in task details:
   - **Title**: Brief description
   - **Description**: Detailed information
   - **Assignee**: Who should complete the task
   - **Priority**: Low, Medium, High, or Urgent
   - **Due Date**: When the task is due
   - **Recurrence**: Repeat pattern (optional)
3. Click **Save**

## Setting Up Integrations

### Connect Your Email

1. Go to **Settings > Integrations > Email**
2. Select your email provider (Gmail, Outlook, etc.)
3. Click **Connect**
4. Grant permissions to access your email
5. Configure sync settings:
   - Sync frequency
   - Which folders to monitor
   - BCC addresses to track

### Connect SMS/Phone

1. Go to **Settings > Integrations > SMS**
2. Select your SMS provider (Twilio, etc.)
3. Enter API credentials
4. Configure:
   - From phone number
   - Rate limits
   - Consent management
5. Click **Test** to verify connection

### Connect CRM

If you haven't already connected your CRM:

1. Go to **Settings > Integrations > CRM**
2. Select your CRM system
3. Follow the OAuth authentication flow
4. Map fields between systems
5. Set up sync rules:
   - Bidirectional or one-way sync
   - Sync frequency
   - Conflict resolution

## Next Steps

### Learn Advanced Features

- [Marketing Automation](../admin/marketing-automation.md) - Set up automated workflows
- [Advanced Routing](../admin/advanced-routing.md) - Configure sophisticated lead routing
- [Analytics & Reporting](../admin/analytics.md) - Dive deep into performance metrics

### Configure Your Team

- [User Management](../admin/user-management.md) - Add and manage team members
- [Role-Based Access](../admin/rbac.md) - Configure permissions and roles
- [Team Settings](../admin/team-settings.md) - Set up team-specific configurations

### Optimize Your Workflow

- [Best Practices Guide](../support/best-practices.md) - Learn proven strategies
- [Workflow Templates](../features/workflow-templates.md) - Use pre-built automation templates
- [Video Tutorials](../support/video-tutorials.md) - Watch step-by-step guides

### Get Help

- [Troubleshooting Guide](troubleshooting.md) - Solve common issues
- [FAQ](faq.md) - Find answers to frequently asked questions
- [Contact Support](../support/help-center.md) - Reach our support team

## Need Help?

If you have questions or need assistance:

1. **Check our documentation** - Browse our knowledge base
2. **Search the FAQ** - Find quick answers
3. **Watch video tutorials** - Learn by watching
4. **Contact support** - Submit a support ticket

**Support Email**: support@insurance-leads-platform.com
**Support Hours**: Monday - Friday, 8am - 8pm EST
**Average Response Time**: < 2 hours

---

**Congratulations!** 🎉 You've completed the getting started guide. You're now ready to use the platform to generate, qualify, and convert more leads.

For more in-depth information, explore our full documentation library or schedule a personalized onboarding session with our customer success team.
