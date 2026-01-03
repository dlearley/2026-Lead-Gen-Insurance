# Administrator Training Program

## System Setup & User Management

**Training Duration:** 3 hours  
**Target Audience:** System administrators, IT managers, platform owners  
**Prerequisites:** Basic CRM understanding, user management experience  
**Delivery Method:** Self-paced + Live Q&A sessions  

---

## Training Overview

This comprehensive training program equips administrators with the knowledge and skills needed to effectively configure, manage, and maintain the CRM-Ultra platform for their organization.

### Learning Objectives

By the end of this training, you will be able to:

✅ Configure system settings and preferences  
✅ Manage users, roles, and permissions  
✅ Set up automation rules and workflows  
✅ Configure lead assignment and distribution  
✅ Manage integrations and API access  
✅ Monitor system performance and usage  
✅ Troubleshoot common administrative issues  
✅ Generate system and compliance reports  

---

## Module 1: System Configuration (45 minutes)

### 1.1 Initial System Setup

**Accessing Admin Panel:**
```
Dashboard → Settings → Admin Panel
```

**Initial Configuration Steps:**

1. **Organization Settings**
   - Company name and branding
   - Default timezone and locale
   - Business hours configuration
   - Contact information

2. **System Preferences**
   - Auto-logout timeout (default: 30 minutes)
   - Date format (MM/DD/YYYY or DD/MM/YYYY)
   - Currency settings
   - Default language

3. **Security Settings**
   - Password requirements
   - Session timeout policies
   - Failed login attempts before lockout
   - IP restrictions (optional)

**Configuration Best Practices:**
- Use consistent timezone across organization
- Set appropriate session timeouts for security
- Configure strong password requirements
- Document all security settings

### 1.2 Lead Management Configuration

**Lead Sources Setup:**
```
Admin Panel → Configuration → Lead Sources
```

**Managing Lead Sources:**
- Add custom lead sources
- Set default assignment rules per source
- Configure source-specific fields
- Enable/disable sources
- Track source performance

**Default Lead Sources:**
- Website Form
- Facebook Ads
- Google Ads
- Referral Program
- Email Campaign
- Phone Inquiry
- Walk-in
- Trade Show
- Partner Integration

**Custom Fields Configuration:**
```
Admin Panel → Configuration → Custom Fields
```

**Field Types Available:**
- Text input
- Dropdown/select
- Multi-select
- Checkbox
- Date picker
- Number
- Text area (long text)

**Example Custom Fields:**
```
Field Name: "Campaign ID"
Field Type: Text
Applies To: Leads
Required: No
Default Value: None

Field Name: "Preferred Contact Method"
Field Type: Dropdown
Options: Phone, Email, SMS, Any
Applies To: Leads
Required: Yes
Default Value: Any
```

### 1.3 Status and Pipeline Configuration

**Lead Status Management:**
```
Admin Panel → Configuration → Lead Statuses
```

**Default Status Pipeline:**
1. NEW → 2. CONTACTED → 3. QUALIFIED → 4. QUOTED → 5. NEGOTIATION → 6. WON/LOST

**Customizing Statuses:**
- Add custom statuses
- Reorder status pipeline
- Set status-specific automation
- Configure status permissions
- Add status descriptions

**Status Configuration Options:**
- Status name and description
- Status color for visual identification
- Whether status counts as "open" or "closed"
- SLA targets for status duration
- Required fields when changing to this status

**Example: Adding Custom Status**
```
Status Name: "Medical Review"
Description: "Requires medical underwriting review"
Color: Orange
Type: Open status
SLA: 3 business days
Automation: Notify medical review team
```

---

## Module 2: User Management (45 minutes)

### 2.1 User Roles and Permissions

**Understanding the RBAC Model:**

CRM-Ultra uses Role-Based Access Control (RBAC) with five predefined roles:

| Role | Description | Use Case |
|------|-------------|----------|
| **Admin** | Full system access | System administrators, platform owners |
| **Manager** | Team management + all agent functions | Sales managers, team leads |
| **Agent** | Lead management and communication | Sales agents, producers |
| **Viewer** | Read-only access | Executive reporting, auditors |
| **API Only** | API access only | System integrations, automation |

**Permission Matrix:**

| Feature | Admin | Manager | Agent | Viewer |
|---------|-------|---------|-------|--------|
| View all leads | ✅ | ✅ | Own only | ✅ |
| Edit leads | ✅ | ✅ | Own only | ❌ |
| Delete leads | ✅ | ❌ | ❌ | ❌ |
| User management | ✅ | Partial | ❌ | ❌ |
| Settings access | ✅ | Limited | ❌ | ❌ |
| Reports | ✅ | ✅ | Own only | ✅ |
| API access | ✅ | ✅ | ❌ | ❌ |

### 2.2 Creating and Managing Users

**Adding New Users:**
```
Admin Panel → Users → Add User
```

**User Creation Form:**
```
Basic Information:
□ First Name (required)
□ Last Name (required)
□ Email (required, must be unique)
□ Phone
□ Employee ID (optional)

Role Assignment:
□ Role (required)
□ Team/Department
□ Manager/Supervisor

Access Settings:
□ Send welcome email
□ Require password reset on first login
□ Multi-factor authentication requirement
□ IP restrictions (optional)

Permissions:
□ Inherit from role
□ Custom permissions (for advanced users)
```

**Bulk User Import:**
```
Admin Panel → Users → Bulk Import
```

**CSV Template Format:**
```csv
email,firstName,lastName,role,phone,team
john@company.com,John,Doe,AGENT,555-0101,Sales Team A
jane@company.com,Jane,Smith,MANAGER,555-0102,Sales Team A
```

**User Onboarding Workflow:**
1. Create user account
2. Assign appropriate role
3. Configure team/territory assignment
4. Set up notification preferences
5. Send welcome email
6. Schedule training session
7. Monitor first week activity
8. Collect feedback and adjust settings

### 2.3 Team and Territory Management

**Creating Teams:**
```
Admin Panel → Teams → Create Team
```

**Team Structure Options:**

**A. Geographic Territories:**
```
Team: "East Coast Sales"
Territory: CT, DE, ME, MD, MA, NH, NJ, NY, PA, RI, VT
Team Lead: Jane Smith
Members: John, Mary, Bob
```

**B. Product Specialization:**
```
Team: "Commercial Insurance"
Specialization: COMMERCIAL, BUNDLE
Team Lead: David Johnson
Members: Sarah, Mike, Lisa
```

**C. Lead Source Teams:**
```
Team: "Digital Marketing"
Sources: Facebook Ads, Google Ads, Website
Team Lead: Emily Chen
Members: Tom, Rachel, Alex
```

**Territory Assignment Rules:**
```javascript
// Example: State-based assignment
{
  "ruleName": "State Territory Assignment",
  "conditions": [
    {
      "field": "state",
      "operator": "in",
      "value": ["CA", "OR", "WA"]
    }
  ],
  "action": {
    "assignToTeam": "West Coast Sales",
    "assignToUser": "roundRobin"
  }
}
```

### 2.4 User Lifecycle Management

**User States:**
- **Active:** Full system access
- **Inactive:** No access, preserves data
- **Suspended:** Temporary access removal
- **Terminated:** Permanent deactivation

**Offboarding Process:**
1. Change user status to "Inactive"
2. Reassign their leads to active agents
3. Document transfer in notes
4. Remove from teams and workflows
5. Deactivate API keys
6. Archive user data per policy
7. Remove after retention period (if required)

**Transferring Leads During Offboarding:**
- **Option 1:** Reassign all leads to manager
- **Option 2:** Distribute among team members based on capacity
- **Option 3:** Use round-robin assignment
- **Option 4:** Manual assignment with context notes

---

## Module 3: Automation & Workflow (45 minutes)

### 3.1 Lead Assignment Rules

**Accessing Assignment Engine:**
```
Admin Panel → Automation → Lead Assignment
```

**Assignment Rule Components:**

**Conditions (When to apply rule):**
- Lead source equals/is in
- Insurance type equals/is in
- Geographic location (city, state, zip)
- Lead score range
- Custom field values
- Time of day
- Day of week

**Actions (What to do):**
- Assign to specific user
- Assign to team (round-robin)
- Assign based on workload
- Send notifications
- Apply tags
- Set custom fields
- Trigger webhooks

**Example Assignment Rules:**

**Rule 1: High-Value Auto Leads**
```
Conditions:
- Insurance Type = AUTO
- Lead Score >= 80
- State = CA, TX, FL

Actions:
- Assign to: Senior Agent Team
- Notification: Slack #high-value-leads
- Tag: "priority"
- Set Priority field: HIGH
```

**Rule 2: Commercial Insurance Routing**
```
Conditions:
- Insurance Type = COMMERCIAL
- Custom Field "Business Type" filled

Actions:
- Assign to: Commercial Team
- Notification: Email team lead
- Create Task: Qualification needed within 24h
```

**Rule 3: After-Hours Assignment**
```
Conditions:
- Time = 5:00 PM - 8:00 AM (local)
- Day = Weekends

Actions:
- Assign to: Next business day queue
- Send auto-response email
- Tag: "after-hours"
```

**Assignment Rule Priority:**
Rules are evaluated in order from top to bottom. First matching rule is applied.

**Best Practices:**
- Put most specific rules at the top
- Have a default "catch-all" rule at bottom
- Test rules with sample leads
- Monitor assignment accuracy
- Review quarterly for optimization

### 3.2 Automated Workflows

**Workflow Types:**

**A. Status Change Workflows**
```
Trigger: Lead status changes to QUALIFIED
Actions:
1. Create task: "Prepare quote within 24h"
2. Send email to lead: "Thank you, preparing your quote"
3. Notify account manager
4. Increment "qualified" counter
```

**B. Time-Based Workflows**
```
Trigger: Lead created 2 hours ago, status still NEW
Actions:
1. Send notification to assignee
2. Escalate to team lead
3. Log "No contact attempt" activity
```

**C. Activity-Based Workflows**
```
Trigger: Email opened by lead
Actions:
1. Update lead score (+5 points)
2. Create task: "Follow up within 4h"
3. Log activity: "Email engagement detected"
```

**Creating a New Workflow:**
```
Admin Panel → Automation → Workflows → Create Workflow
```

**Workflow Builder Interface:**
```
Step 1: Trigger
├─ When: [Status changes to] [QUALIFIED]
└─ Filters: [Insurance Type] [equals] [AUTO]

Step 2: Delay (optional)
├─ Wait: [0] [hours]
└─ Conditions: [Skip if] [Status] [changes]

Step 3: Actions
├─ [Create Task]
│  └─ Configure task details
├─ [Send Email]
│  └─ Select template and recipients
├─ [Update Lead]
│  └─ Set fields and values
└─ [Call Webhook]
   └─ Configure webhook endpoint
```

**Workflow Testing:**
Always test workflows before enabling:
1. Use test lead data
2. Enable "Test Mode" (logs actions without executing)
3. Review test results
4. Make adjustments
5. Enable for production

### 3.3 Email Automation

**Email Templates:**
```
Admin Panel → Communication → Email Templates
```

**Template Variables:**
```
{{firstName}} - Contact's first name
{{lastName}} - Contact's last name
{{insuranceType}} - Type of insurance
{{agentName}} - Assigned agent name
{{companyName}} - Your company name
{{quoteLink}} - Link to quote (if applicable)
{{phone}} - Agent phone number
```

**Example Templates:**

**Template 1: New Lead Welcome**
```
Subject: Thanks for your interest, {{firstName}}!

Hi {{firstName}},

Thank you for your interest in {{insuranceType}} insurance. 

I'll be your dedicated agent and will prepare a personalized quote for you within 24 hours.

In the meantime, feel free to call or text me at {{phone}} if you have any questions.

Best regards,
{{agentName}}
{{companyName}}
```

**Template 2: Quote Follow-up**
```
Subject: Checking in on your quote - {{firstName}}

Hi {{firstName}},

I wanted to follow up on the quote I sent for your {{insuranceType}} insurance.

Do you have any questions or would you like to discuss coverage options?

I'm here to help!

{{agentName}}
{{phone}}
```

**Automated Email Campaigns:**
```
Admin Panel → Communication → Campaigns
```

**Campaign Types:**
- **Drip Campaign:** Series of timed emails
- **Trigger-Based:** Send based on actions
- **Nurture Campaign:** Long-term engagement
- **Re-engagement:** Win back cold leads

**Example Drip Campaign:**
```
Day 0 (Immediately): Welcome email
Day 1: Educational content about insurance
Day 3: Customer testimonials
Day 7: Quote reminder with urgency
Day 14: Final follow-up + alternative options
```

---

## Module 4: Integrations & API Management (30 minutes)

### 4.1 Third-Party Integrations

**Available Integrations:**

**Email & Communication:**
- Gmail / Google Workspace
- Outlook / Microsoft 365
- Twilio (SMS)
- Slack
- Microsoft Teams

**Marketing & Lead Gen:**
- Facebook Lead Ads
- Google Ads
- Zapier
- Typeform
- Calendly

**Productivity:**
- Google Calendar
- Outlook Calendar
- Zoom
- DocuSign

**Data & Analytics:**
- Google Analytics
- Data Studio
- Tableau
- Power BI

**Accessing Integrations:**
```
Admin Panel → Integrations → Available Integrations
```

**Integration Setup Process:**
1. Select integration from marketplace
2. Click "Install" or "Connect"
3. Authenticate with third-party service
4. Configure sync settings
5. Map data fields
6. Test connection
7. Enable integration

### 4.2 Webhook Management

**Creating Webhooks:**
```
Admin Panel → Integrations → Webhooks → Create Webhook
```

**Webhook Configuration:**
```
Webhook Name: "Update CRM System"
URL: https://your-system.com/webhooks/crm-ultra
Events: [✓] lead.created [✓] lead.updated [ ] lead.deleted
Secret: Auto-generated or custom
Retry Policy: 3 attempts, exponential backoff
Timeout: 30 seconds
```

**Webhook Events Available:**
- `lead.created` - New lead entered system
- `lead.updated` - Lead information changed
- `lead.status_changed` - Lead status updated
- `lead.assigned` - Lead assigned to user
- `lead.deleted` - Lead removed from system
- `note.created` - Note added to lead
- `task.created` - Task created
- `task.completed` - Task marked complete
- `email.sent` - Email sent to lead
- `email.opened` - Lead opened email
- `user.created` - New user added
- `user.deactivated` - User account deactivated

**Webhook Security:**
Always verify webhook signatures:

```javascript
const crypto = require('crypto');

function verifyWebhookSignature(payload, signature, secret) {
  const hash = crypto
    .createHmac('sha256', secret)
    .update(JSON.stringify(payload))
    .digest('hex');
  
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(hash)
  );
}
```

### 4.3 API Key Management

**Creating API Keys:**
```
Admin Panel → API → API Keys → Create Key
```

**API Key Types:**

**Server Key:**
- Used for backend integrations
- Full access based on role
- Never expires (unless revoked)
- Should be kept highly secure

**Client Key:**
- Used for frontend integrations
- Limited access scope
- Can set expiration date
- Rate limited

**Scoped Key:**
- Restricted to specific endpoints
- Read-only or write-only
- Temporary access
- Specific use case

**API Key Best Practices:**
```
✓ Use environment variables for storage
✓ Rotate keys every 90 days
✓ Use separate keys for different integrations
✓ Monitor API usage regularly
✓ Revoke unused keys immediately
✓ Never commit keys to version control
✓ Use minimum required permissions
```

**Monitoring API Usage:**
```
Admin Panel → API → Usage Analytics
```

**Metrics Tracked:**
- Requests per endpoint
- Rate limit hits
- Error rates
- Response times
- Top API keys by usage
- Geographic distribution

---

## Module 5: Monitoring & Reporting (15 minutes)

### 5.1 System Analytics

**Dashboard Metrics:**
```
Admin Panel → Analytics → System Overview
```

**Key Metrics:**
- Total leads in system
- Daily/weekly/monthly lead volume
- User activity and login rates
- Task completion rates
- Email sent/opened rates
- Conversion rates by source
- System performance metrics

### 5.2 User Activity Monitoring

**User Activity Reports:**
```
Admin Panel → Analytics → User Activity
```

**Tracked Activities:**
- Login times and frequency
- Leads created and updated
- Notes added
- Emails sent
- Tasks completed
- Time spent in system
- Most used features

**Usage Scenarios:**
- Identify training needs
- Monitor productivity
- Detect unusual activity
- Compliance auditing
- Performance reviews

### 5.3 Compliance & Audit Reports

**Available Audit Reports:**
- Login history by user
- Lead access logs
- Data export history
- Permission changes
- System configuration changes
- API access logs

**Report Scheduling:**
- Automated daily/weekly/monthly reports
- Email delivery to stakeholders
- PDF and CSV formats
- Custom date ranges

---

## Module 6: Best Practices & Troubleshooting (15 minutes)

### 6.1 Administrator Best Practices

**Daily Tasks:**
- [ ] Review system alerts and notifications
- [ ] Monitor user activity for anomalies
- [ ] Check API usage and rate limits
- [ ] Review error logs
- [ ] Verify backup completion

**Weekly Tasks:**
- [ ] Review system performance metrics
- [ ] Check storage usage
- [ ] Validate automation rule effectiveness
- [ ] Update documentation
- [ ] Review security logs

**Monthly Tasks:**
- [ ] User access review (audit)
- [ ] API key rotation check
- [ ] Integration health check
- [ ] Workflow optimization review
- [ ] Compliance report generation
- [ ] Backup restoration test

### 6.2 Common Issues & Solutions

**"Users can't log in"**
- Verify user status is "Active"
- Check password expiration
- Verify IP restrictions
- Reset MFA if enabled
- Check for system-wide issues

**"Leads aren't assigning automatically"**
- Verify assignment rules are enabled
- Check rule order and conditions
- Test with sample lead
- Review rule execution logs
- Verify user availability

**"API calls are failing"**
- Verify API key is active
- Check rate limit status
- Review authentication headers
- Verify endpoint URL
- Check request body format

**"Workflows aren't triggering"**
- Verify workflow is enabled
- Check trigger conditions
- Review workflow execution logs
- Test in "Test Mode"
- Check for conflicting workflows

**"Integration stopped working"**
- Verify integration is enabled
- Check authentication status
- Review recent changes
- Check third-party service status
- Verify webhook endpoints

### 6.3 Security Best Practices

**Access Control:**
- Regular user access reviews
- Principle of least privilege
- Separate admin accounts for daily use
- Multi-factor authentication required
- Session timeout policies

**Data Protection:**
- Regular data backups
- Encrypted data transmission
- Secure API key storage
- Data retention policies
- Compliance with regulations (GDPR, CCPA)

**Monitoring:**
- Login anomaly detection
- Unusual data access patterns
- Failed authentication attempts
- API usage monitoring
- Regular security audits

---

## Training Assessment

### Knowledge Check

**Question 1:** How do you create a new user with custom permissions?

**Question 2:** What should you do first when setting up lead assignment rules?

**Question 3:** How often should you review API key usage?

**Question 4:** What's the difference between API keys and webhooks?

**Question 5:** How do you troubleshoot failed API calls?

### Practical Exercises

**Exercise 1:** Create three user accounts with different roles

**Exercise 2:** Set up territory-based lead assignment rules

**Exercise 3:** Create a welcome email automation workflow

**Exercise 4:** Configure a webhook to receive lead updates

**Exercise 5:** Generate a user activity report

---

## Additional Resources

### Documentation
- [User Management Guide](../user-guides/user-management.md)
- [Automation Configuration](./automation-setup.md)
- [API Documentation](../api-docs/README.md)
- [Security Guidelines](../support/kb-articles/security.md)

### Video Tutorials
- [System Configuration Walkthrough](https://training.crm-ultra.com/admin-setup)
- [User Management Best Practices](https://training.crm-ultra.com/user-management)
- [Automation Builder Demo](https://training.crm-ultra.com/automation)
- [Integration Setup Guide](https://training.crm-ultra.com/integrations)

### Support Contacts
- **Technical Support:** admin-support@crm-ultra.com
- **Emergency Hotline:** 1-800-CRM-ULTRA (admin priority)
- **Slack Community:** #administrators (verified admins only)
- **Knowledge Base:** support.crm-ultra.com/admin

---

## Certification

Upon completion of this training program and passing the assessment (80% or higher), you will receive:

**CRM-Ultra Certified Administrator Certificate**
- Digital badge for LinkedIn
- Certificate of completion
- Priority support access
- Invite to admin community
- Recertification required annually

**Next Steps:**
1. Complete all modules (3 hours)
2. Pass knowledge assessment
3. Complete practical exercises
4. Schedule 1:1 check-in with trainer
5. Receive certification
6. Join admin community

---

**Training Program Version:** 1.0  
**Last Updated:** January 2025  
**Training Team:** CRM-Ultra Success Team  
**Contact:** training@crm-ultra.com