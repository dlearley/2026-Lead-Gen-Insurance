# Frequently Asked Questions (FAQ)

Find quick answers to common questions about the Insurance Lead Generation AI Platform.

## Table of Contents

- [Getting Started](#getting-started)
- [Account & Billing](#account--billing)
- [Lead Management](#lead-management)
- [Lead Scoring](#lead-scoring)
- [Routing & Assignment](#routing--assignment)
- [Email & Communication](#email--communication)
- [Campaigns & Marketing](#campaigns--marketing)
- [Integrations](#integrations)
- [Analytics & Reports](#analytics--reports)
- [Mobile App](#mobile-app)
- [Security & Privacy](#security--privacy)

---

## Getting Started

### How do I get started with the platform?

We recommend starting with our [Getting Started Guide](quickstart.md) which walks you through:

1. Creating your account
2. Setting up your profile
3. Connecting your CRM
4. Creating your first campaign
5. Managing your first leads

You can also schedule a free onboarding session with our customer success team.

### What are the system requirements?

To use the platform, you need:

- **Browser**: Chrome, Firefox, Safari, or Edge (latest version)
- **Internet**: Stable broadband connection
- **Device**: Desktop, laptop, tablet, or smartphone
- **Account**: Valid user account with your organization

No software installation is required - it's 100% cloud-based.

### Is there a mobile app?

Yes! Our mobile apps are available for:

- **iOS**: Download from the App Store (iOS 14+)
- **Android**: Download from Google Play (Android 8+)

The mobile app provides full functionality with optimized mobile experience.

### Can I try the platform before committing?

Yes! We offer a 14-day free trial with:

- Full access to all features
- Up to 5 user accounts
- 100 leads/month
- Email and SMS support
- Onboarding materials

No credit card required.

### What training resources are available?

We provide extensive training resources:

- **Video Tutorials**: 10+ step-by-step video guides
- **Documentation**: Comprehensive online documentation
- **Webinars**: Weekly live training sessions
- **Onboarding**: Personalized onboarding sessions
- **Best Practices**: Proven strategies and templates

See our [Support Resources](../support/help-center.md) for more.

---

## Account & Billing

### How do I create an account?

To create an account:

1. Receive an invitation from your organization administrator
2. Click the invitation link
3. Enter your email and create a password
4. Verify your email address
5. Complete your profile

If you don't have an invitation, contact your organization's administrator.

### How do I reset my password?

To reset your password:

1. Click "Forgot Password" on the login page
2. Enter your email address
3. Check your email for reset link
4. Click the link and create new password
5. Log in with new password

Reset links expire after 24 hours.

### What happens if I forget my email?

If you forgot the email associated with your account:

1. Try emails you commonly use
2. Check with your organization administrator
3. Contact customer support with verification details

### How do I change my account email?

To change your account email:

1. Go to Settings > Profile
2. Click "Change Email"
3. Enter new email address
4. Verify with your password
5. Confirm via email sent to new address

Your old email will remain on record for 30 days.

### Can I have multiple accounts?

Generally, no. Each user should have a single account. However:

- You can switch between organizations if you belong to multiple
- Administrators can create test accounts for development
- Contact support for special circumstances

### How is billing handled?

Billing is handled at the organization level:

- Organization administrators manage billing
- Invoices are sent to the billing email on file
- Payment methods include credit card, ACH, and wire transfer
- Annual billing receives 15% discount

For billing questions, contact billing@insurance-leads-platform.com

### What's included in my plan?

Plan features vary. Check your organization's plan for details. Common features include:

- Lead management and scoring
- Email and SMS tools
- Basic analytics and reporting
- CRM integrations
- Standard support

See our pricing page for plan comparisons.

### How do I upgrade my plan?

To upgrade your plan:

1. Contact your organization administrator
2. They can request an upgrade
3. Our sales team will provide a quote
4. Once approved, upgrade is processed

Upgrades take effect immediately.

---

## Lead Management

### How do I add a new lead?

There are several ways to add leads:

**Manual Entry**:
1. Go to Leads > + Add Lead
2. Enter lead information
3. Select source
4. Click Save

**Import**:
1. Go to Leads > Import
2. Upload CSV file
3. Map columns to fields
4. Review and import

**API**:
- Use our REST API to programmatically add leads
- See [API Documentation](../api/overview.md)

**Integration**:
- Set up webhooks or integrations to automatically import leads
- See [Integration Guide](../integrations/salesforce.md)

### How do I find a specific lead?

To find a lead:

1. **Search**: Use the search bar at top of Leads page
2. **Filters**: Apply filters (status, source, score, date range, etc.)
3. **Advanced Search**: Use multiple filters combined
4. **Saved Views**: Save and reuse common filter combinations

You can search by:
- Name
- Email
- Phone number
- Address
- Lead ID
- Custom fields

### Can I merge duplicate leads?

Yes! To merge duplicates:

1. Go to Leads > Tools > Find Duplicates
2. Review suggested duplicates
3. Select leads to merge
4. Choose which lead to keep as primary
5. Review merged data
6. Confirm merge

The system also has automatic duplicate detection enabled by default.

### How do I delete a lead?

To delete a lead:

1. Open the lead detail view
2. Click the "..." menu
3. Select "Delete Lead"
4. Confirm deletion

**Note**: Deletion is permanent. Consider changing status to "Lost" or "Archived" instead to retain records.

### Can I export leads?

Yes! Export leads in multiple formats:

1. Apply filters to select desired leads
2. Click "Export" button
3. Choose format (CSV, Excel, PDF)
4. Click "Export"

You can also schedule automatic exports to email.

### How do I customize lead fields?

Administrators can add custom fields:

1. Go to Settings > Fields > Leads
2. Click "Add Custom Field"
3. Configure field:
   - Field name
   - Field type (text, number, dropdown, date, etc.)
   - Required or optional
   - Default value
4. Click Save

Custom fields appear throughout the platform.

---

## Lead Scoring

### How is lead score calculated?

Lead scores are calculated using AI that analyzes:

1. **Demographic Fit**: Match to ideal customer profile
2. **Engagement Level**: Email opens, clicks, website visits
3. **Purchase Intent**: Questions asked, timeline, budget
4. **Historical Data**: Similarity to converted leads

Scores range from 0-100, with higher scores indicating better quality.

See [Lead Scoring Documentation](../admin/scoring-config.md) for details.

### Can I customize the scoring model?

Yes! Administrators can customize scoring:

1. Go to Settings > Lead Scoring
2. Adjust factor weights
3. Add custom scoring rules
4. Set score thresholds for actions
5. Save and test changes

We recommend A/B testing different configurations.

### What do the score ranges mean?

- **90-100**: Hot Lead - Contact immediately
- **70-89**: Warm Lead - High priority, contact within 24 hours
- **50-69**: Medium Priority - Nurture with automation
- **30-49**: Low Priority - Monitor and re-evaluate
- **0-29**: Not Qualified - Disqualify or archive

Scores automatically update as lead data changes.

### How often are scores updated?

Scores update in near real-time:

- **Immediate updates**: When lead data changes
- **Batch updates**: Engagement data (email opens, clicks)
- **Daily recalculation**: Comprehensive review of all factors

Most updates happen within 1-5 minutes.

### Can I manually adjust a lead's score?

Yes! To manually adjust:

1. Open lead detail view
2. Click the score
3. Enter adjustment value
4. Add reason for change (required)
5. Save

Manual adjustments are logged for audit purposes.

---

## Routing & Assignment

### How are leads assigned to agents?

Leads are assigned based on your routing configuration:

1. **Round Robin**: Distributes evenly among agents
2. **Skill-Based**: Matches agent expertise to lead needs
3. **Location-Based**: Assigns by geographic region
4. **Capacity-Based**: Considers agent workload
5. **Priority Routing**: High-value leads to top performers

Contact your administrator to understand your current routing strategy.

### Can I change how I receive leads?

Your administrator controls routing rules. However, you can:

- Set your availability status
- Update your working hours
- Adjust your capacity limits
- Request specific types of leads

Go to Settings > Profile > Availability to manage these settings.

### What if I'm getting too many leads?

If you're overwhelmed:

1. **Set availability to unavailable**
2. **Adjust capacity limits** in Settings > Profile
3. **Contact your administrator** to review routing
4. **Prioritize** by lead score

Your administrator can also adjust routing rules to distribute leads more evenly.

### Can I reassign a lead to another agent?

Yes! To reassign a lead:

1. Open lead detail view
2. Click "Assign" dropdown
3. Select new agent or team
4. Add note explaining reassignment
5. Save

The new agent receives a notification.

### What happens when I'm on vacation?

Before taking time off:

1. **Set your availability** to "Unavailable"
2. **Adjust your working hours** to reflect time off
3. **Reassign active leads** to colleagues
4. **Set up auto-responder** in email

Your administrator can also configure automatic reassignment during your absence.

---

## Email & Communication

### How do I send emails to leads?

To send an email:

1. Open lead detail view
2. Click "Send Email" button
3. Choose template or compose from scratch
4. Fill in recipient details
5. Use variables for personalization
6. Preview and send

You can also schedule emails for future delivery.

### Can I create email templates?

Yes! To create templates:

1. Go to Communication > Email Templates
2. Click "New Template"
3. Fill in template details:
   - Name
   - Subject line
   - Email body (with variables like `{{firstName}}`)
   - HTML version (optional)
4. Save template

Templates can be organized into folders.

### Does the platform track email opens and clicks?

Yes! Email tracking includes:

- **Open tracking**: When recipient opens email
- **Click tracking**: Which links they click
- **Reply tracking**: When they reply
- **Delivery tracking**: Successful delivery
- **Bounce tracking**: Failed delivery

Data appears in lead activity timeline and reports.

### How do I set up email automation?

Create automated email sequences using workflows:

1. Go to Automation > Workflows
2. Create new workflow
3. Set trigger (e.g., new lead, lead status change)
4. Add "Send Email" action
5. Choose template and timing
6. Save and activate workflow

See [Marketing Automation Guide](../admin/marketing-automation.md) for details.

### Can I use my own email domain?

Yes! To use custom domain:

1. Go to Settings > Email
2. Add your sending domain
3. Verify DNS records:
   - SPF record
   - DKIM key
   - DMARC policy
4. Test sending

Contact support if you need help with DNS setup.

### How do SMS messages work?

To send SMS:

1. Open lead detail view
2. Click "Send SMS"
3. Compose message (character limit applies)
4. Preview and send

SMS features include:
- Two-way messaging
- Delivery tracking
- Auto-replies
- Opt-out management (STOP)

**Important**: Ensure you have proper consent before sending SMS.

---

## Campaigns & Marketing

### How do I create a campaign?

To create a campaign:

1. Go to Campaigns > + New Campaign
2. Fill in campaign details:
   - Name
   - Type (Email, Social Media, Paid Ads, etc.)
   - Insurance category
   - Budget
   - Start/end dates
3. Configure targeting
4. Set up lead sources
5. Launch campaign

See [Campaign Management Guide](../admin/campaigns.md) for details.

### What campaign types are supported?

We support multiple campaign types:

- **Email Campaigns**: Bulk email sends and drip sequences
- **Social Media**: Facebook, LinkedIn, Instagram lead ads
- **Paid Advertising**: Google Ads, Facebook Ads, LinkedIn Ads
- **Referral Programs**: Customer and partner referrals
- **Event-Based**: Webinars, trade shows, local events

### How do I track campaign performance?

Campaign analytics include:

- **Lead Volume**: Total leads generated
- **Lead Quality**: Average lead score
- **Conversion Rate**: Leads converted to customers
- **Cost Per Lead (CPL)**: Spend divided by leads
- **ROI**: Revenue generated vs. spend

View in Campaigns > [Campaign Name] > Analytics.

### Can I run A/B tests on campaigns?

Yes! A/B testing supports:

- Subject lines
- Email content
- Landing pages
- Ad copy
- Images
- Targeting

Create test variants and the system automatically tracks performance.

### How do I optimize campaign performance?

Optimization tips:

1. **Start small**: Test with limited budget
2. **Monitor daily**: Check performance metrics
3. **A/B test**: Test different variables
4. **Refine targeting**: Improve audience targeting
5. **Iterate**: Make data-driven improvements

See [Best Practices Guide](../support/best-practices.md) for proven strategies.

---

## Integrations

### What integrations are available?

We integrate with many popular platforms:

**CRM**:
- Salesforce
- HubSpot
- Microsoft Dynamics
- Zoho CRM
- Pipedrive

**Email**:
- Gmail
- Outlook/Office 365
- Custom SMTP

**SMS**:
- Twilio
- MessageBird
- Plivo

**Marketing**:
- Facebook Lead Ads
- Google Ads
- LinkedIn Lead Gen
- Mailchimp

See [Integrations Guide](../integrations/overview.md) for full list.

### How do I connect an integration?

To connect an integration:

1. Go to Settings > Integrations
2. Select the integration
3. Click "Connect"
4. Follow authentication steps
5. Configure sync settings
6. Test connection

Most integrations use OAuth for secure authentication.

### Can I build custom integrations?

Yes! Use our REST API:

- Comprehensive API documentation
- Webhooks for real-time updates
- Rate-limited and secure
- Full CRUD operations

See [API Documentation](../api/overview.md) for details.

### How often do integrations sync?

Sync frequency varies by integration:

- **Real-time**: Webhooks (immediate)
- **Near real-time**: 5-15 minutes
- **Batch**: Hourly or daily

Configure sync frequency in Settings > Integrations > [Integration Name].

---

## Analytics & Reports

### What reports are available?

Pre-built reports include:

**Lead Reports**:
- Lead generation trends
- Lead source analysis
- Lead quality metrics

**Agent Reports**:
- Performance by agent
- Activity levels
- Conversion rates

**Campaign Reports**:
- Campaign ROI
- Cost analysis
- Channel comparison

**Communication Reports**:
- Email performance
- SMS analytics
- Call statistics

You can also create custom reports.

### Can I create custom reports?

Yes! To create custom reports:

1. Go to Analytics > Reports
2. Click "New Report"
3. Choose report type
4. Add metrics and dimensions
5. Apply filters
6. Configure layout
7. Save report

Reports can be saved, shared, and scheduled.

### How do I export reports?

To export a report:

1. Open the report
2. Click "Export"
3. Choose format (CSV, Excel, PDF)
4. Click "Export"

You can also schedule automatic email exports.

### What's the difference between real-time and scheduled reports?

- **Real-time**: Updates with latest data, may have delays of 1-15 minutes
- **Scheduled**: Generated at specific times, better for large reports

Use real-time for current status, scheduled for periodic reviews.

---

## Mobile App

### Is there a mobile app?

Yes! Apps available for:

- **iOS**: App Store (iOS 14+)
- **Android**: Google Play (Android 8+)

Full platform functionality optimized for mobile.

### What features are available on mobile?

The mobile app includes:

- Lead management
- Email and SMS
- Task management
- Notifications
- Real-time updates
- Offline mode (with sync)

Some advanced features are only available on desktop.

### Does the mobile app work offline?

Yes! Offline mode includes:

- View previously loaded leads
- Compose emails (queued for sending)
- Create tasks
- Add notes

Data syncs automatically when connection is restored.

### How do I sync the mobile app?

The app syncs automatically:

- **Real-time sync**: When connected to internet
- **Manual sync**: Pull down to refresh
- **Background sync**: Periodic updates

Check Settings > Sync for configuration options.

---

## Security & Privacy

### Is my data secure?

Yes! Security measures include:

- **Encryption**: Data encrypted at rest and in transit
- **Access controls**: Role-based permissions
- **Audit logs**: All actions logged
- **Compliance**: HIPAA, GDPR, SOC 2 certified

See [Security Documentation](../compliance/security.md) for details.

### Who can see my leads?

Visibility depends on your organization's configuration:

- **Private**: Only you
- **Team**: Your team members
- **Organization**: Everyone in organization
- **Public**: Including partners/customers

Contact your administrator for your visibility settings.

### Is the platform HIPAA compliant?

Yes! We are HIPAA compliant:

- Business Associate Agreement (BAA) available
- Protected Health Information (PHI) safeguards
- Access controls and audit trails
- Regular security audits

Request a BAA through your account manager.

### What about GDPR compliance?

Yes! We comply with GDPR:

- Data processing agreements
- Data subject access requests
- Right to be forgotten
- Data portability
- Consent management

See [GDPR Guide](../compliance/gdpr.md) for details.

### How do I request a data export?

To export your data:

1. Go to Settings > Privacy
2. Click "Request Data Export"
3. Confirm your email
4. Receive download link within 30 days

You can also use the API for real-time exports.

### How do I delete my data?

To delete your data:

1. Go to Settings > Privacy
2. Click "Request Data Deletion"
3. Confirm request
4. Receive confirmation

**Note**: Deletion is permanent and irreversible. Consider archiving instead.

---

## Still Have Questions?

If you didn't find your answer here:

- **Documentation**: Browse our full documentation library
- **Video Tutorials**: Watch step-by-step guides
- **Troubleshooting**: [Troubleshooting Guide](troubleshooting.md)
- **Contact Support**: Submit a support ticket

**Support Contact**:
- **Email**: support@insurance-leads-platform.com
- **Phone**: 1-800-INSURE-1 (Mon-Fri, 8am-8pm EST)
- **Live Chat**: Available in-app
- **Response Time**: < 2 hours
