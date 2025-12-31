# Troubleshooting Guide

Solutions to common issues and problems you might encounter while using the Insurance Lead Generation AI Platform.

## Table of Contents

- [Account & Login Issues](#account--login-issues)
- [Lead Management Issues](#lead-management-issues)
- [Email & SMS Problems](#email--sms-problems)
- [Integration Issues](#integration-issues)
- [Routing & Assignment Issues](#routing--assignment-issues)
- [Campaign Problems](#campaign-problems)
- [Reporting & Analytics Issues](#reporting--analytics-issues)
- [Performance Issues](#performance-issues)
- [Mobile App Issues](#mobile-app-issues)

---

## Account & Login Issues

### Can't Log In

**Problem**: You're unable to log in to your account.

**Solutions**:

1. **Check your credentials**
   - Verify email address is correct
   - Reset your password if needed
   - Check for typos

2. **Clear browser cache and cookies**
   - Go to browser settings
   - Clear browsing data
   - Try logging in again

3. **Try a different browser**
   - Chrome, Firefox, Safari, or Edge
   - Check for browser extensions that might interfere

4. **Check internet connection**
   - Ensure stable internet connection
   - Try loading other websites
   - Restart your router if needed

5. **Contact your administrator**
   - Your account might be deactivated
   - You might be locked out due to failed attempts
   - Your subscription might have expired

### Account Locked Out

**Problem**: Account is locked after too many failed login attempts.

**Solution**:

1. **Wait 30 minutes** and try again
2. **Reset password** using "Forgot Password" link
3. **Contact administrator** to unlock your account

### Two-Factor Authentication (2FA) Issues

**Problem**: Can't complete 2FA verification.

**Solutions**:

1. **Check backup codes**
   - Use one of your backup codes to log in
   - Keep backup codes in a safe place

2. **Reset 2FA**
   - Contact your administrator
   - Provide verification of identity
   - Set up 2FA again

3. **Check time sync** (for TOTP)
   - Ensure your device's time is accurate
   - Enable automatic time sync

### Permissions Issues

**Problem**: You don't have access to certain features or data.

**Solutions**:

1. **Check your role**
   - Go to Settings > Profile
   - Review your assigned role
   - Some features may be restricted by role

2. **Contact administrator**
   - Request additional permissions if needed
   - Your administrator can adjust your access

3. **Verify team membership**
   - Ensure you're in the correct team
   - Some data may be team-restricted

---

## Lead Management Issues

### Leads Not Appearing

**Problem**: New leads aren't showing up in your dashboard.

**Solutions**:

1. **Check filters**
   - Clear all filters in the lead list view
   - Reset to default view
   - Check date range filters

2. **Verify lead status**
   - New leads might be assigned to other agents
   - Check with your administrator
   - Review routing rules

3. **Check lead source**
   - Confirm lead source is active
   - Verify webhook/integration is working
   - Check API endpoints are receiving data

4. **Wait for processing**
   - Allow a few minutes for lead processing
   - High volume may cause delays
   - Check system status page

### Can't Update Lead Information

**Problem**: Unable to edit lead details.

**Solutions**:

1. **Check permissions**
   - Verify you have edit permissions
   - Some fields may be read-only
   - Contact administrator if needed

2. **Lead might be locked**
   - Another user might be editing the lead
   - Wait and try again
   - System automatically releases locks after 10 minutes

3. **Browser issues**
   - Refresh the page
   - Try a different browser
   - Clear browser cache

### Lead Status Not Changing

**Problem**: Unable to change lead status.

**Solutions**:

1. **Check status transition rules**
   - Some status changes may be restricted
   - Follow the defined workflow
   - Contact administrator to adjust rules

2. **Required fields missing**
   - Fill in all required fields before changing status
   - Look for field validation messages
   - Complete required information

3. **Permission issues**
   - Verify you can change to that status
   - Some status changes may require manager approval
   - Check with your administrator

### Duplicate Leads

**Problem**: Seeing duplicate leads in the system.

**Solutions**:

1. **Use duplicate detection**
   - Go to Leads > Tools > Find Duplicates
   - Review suggested duplicates
   - Merge leads manually if needed

2. **Configure import settings**
   - Set up better deduplication rules
   - Match on email, phone, or other unique identifiers
   - Review integration settings

3. **Prevent duplicates at source**
   - Implement better validation at lead source
   - Use CAPTCHAs on forms
   - Check for existing leads before importing

### Lead Score Incorrect

**Problem**: Lead scores don't match expected values.

**Solutions**:

1. **Review scoring model**
   - Check scoring criteria and weights
   - Verify all factors are considered
   - Adjust model if needed (admin only)

2. **Check lead data**
   - Ensure all required fields are populated
   - Verify data quality and accuracy
   - Update missing information

3. **Score recalculating**
   - Scores may take time to recalculate after data updates
   - Wait a few minutes for processing
   - Check system status for delays

---

## Email & SMS Problems

### Emails Not Sending

**Problem**: Emails are queued but not being sent.

**Solutions**:

1. **Check email provider status**
   - Verify email service is operational
   - Check provider's status page
   - Test email connection in Settings

2. **Review email queue**
   - Check for stuck emails in queue
   - High volume may cause delays
   - Contact support if queue is large

3. **Verify sender address**
   - Ensure sender email is verified
   - Check SPF/DKIM/DMARC records
   - Use authorized sending domains

4. **Rate limiting**
   - Check if rate limits are exceeded
   - Reduce send volume or increase limits
   - Contact email provider for higher limits

### Emails Going to Spam

**Problem**: Recipients aren't receiving emails (going to spam folder).

**Solutions**:

1. **Improve email content**
   - Avoid spam trigger words
   - Use clear subject lines
   - Include plain text version

2. **Check sender reputation**
   - Verify domain reputation
   - Monitor blacklisting
   - Warm up new sending domains

3. **Verify authentication**
   - Set up SPF records
   - Configure DKIM signing
   - Implement DMARC

4. **Ask recipients to whitelist**
   - Request recipients add sender to contacts
   - Provide instructions in signature
   - Include "Not Spam" reminder

### Email Tracking Not Working

**Problem**: Not seeing email open/click tracking data.

**Solutions**:

1. **Check tracking enabled**
   - Verify tracking is enabled in Settings
   - Check per-email tracking settings
   - Ensure tracking pixel is inserted

2. **Email client blocking**
   - Some clients block tracking pixels
   - Images might be disabled
   - This is expected behavior

3. **Click tracking**
   - Use link tracking for better data
   - Ensure links are properly formatted
   - Test tracking with test emails

### SMS Not Sending

**Problem**: SMS messages are not being delivered.

**Solutions**:

1. **Check SMS provider**
   - Verify provider account is active
   - Check for sufficient credits/balance
   - Test provider connection

2. **Verify phone numbers**
   - Ensure numbers are in international format (+1XXXXXXXXXX)
   - Check for invalid numbers
   - Remove opt-out numbers

3. **Compliance issues**
   - Verify opt-in consent
   - Check for STOP requests
   - Review TCPA compliance

4. **Carrier blocking**
   - Some carriers block bulk SMS
   - Contact provider for resolution
   - Use short codes for better delivery

### SMS Delivery Delays

**Problem**: SMS messages taking too long to deliver.

**Solutions**:

1. **High volume**
   - Reduce send rate
   - Schedule sends during off-peak times
   - Contact provider for increased throughput

2. **Carrier issues**
   - Check carrier status
   - Some carriers have slower delivery times
   - Use multiple providers for redundancy

---

## Integration Issues

### CRM Sync Not Working

**Problem**: Data not syncing between platform and CRM.

**Solutions**:

1. **Check connection**
   - Verify integration is enabled
   - Test connection in Settings
   - Re-authenticate if needed

2. **Review sync settings**
   - Verify sync direction (one-way or two-way)
   - Check field mappings
   - Ensure sync frequency is configured

3. **Check error logs**
   - Review integration error logs
   - Look for failed sync attempts
   - Contact support with error details

4. **Field mapping issues**
   - Verify all fields are mapped correctly
   - Check for data type mismatches
   - Update mapping as needed

### Webhook Not Receiving Data

**Problem**: Webhooks not firing or receiving data.

**Solutions**:

1. **Verify webhook URL**
   - Check URL is correct and accessible
   - Ensure HTTPS is used
   - Test URL with webhook testing tools

2. **Check webhook events**
   - Verify correct events are subscribed
   - Review webhook configuration
   - Test with manual trigger

3. **Server issues**
   - Check server is responding
   - Verify endpoint is handling requests
   - Review server logs

4. **Rate limiting**
   - Check if rate limits are hit
   - Review webhook throttling rules
   - Contact support for higher limits

### API Authentication Errors

**Problem**: Getting authentication errors when using API.

**Solutions**:

1. **Check API key**
   - Verify API key is correct
   - Ensure key is active and not expired
   - Regenerate key if needed

2. **Review permissions**
   - Verify key has required scopes
   - Check user permissions
   - Request additional scopes if needed

3. **Token issues**
   - If using OAuth, verify token is valid
   - Refresh token if expired
   - Check token refresh logic

### Data Import Errors

**Problem**: Failing to import leads from CSV or other sources.

**Solutions**:

1. **Check file format**
   - Ensure CSV format is correct
   - Verify column headers match
   - Check for special characters

2. **Validate data**
   - Ensure required fields are present
   - Check for invalid email/phone formats
   - Verify data types are correct

3. **Review error messages**
   - Check import error log
   - Look for specific error details
   - Fix problematic rows and retry

4. **File size**
   - Check file size limits
   - Split large files into smaller batches
   - Use API for large imports

---

## Routing & Assignment Issues

### Leads Not Being Assigned

**Problem**: New leads aren't being assigned to agents.

**Solutions**:

1. **Check routing rules**
   - Verify routing rules are active
   - Review rule conditions
   - Test rule with sample data

2. **Agent availability**
   - Check if agents are available
   - Verify agent working hours
   - Review agent capacity limits

3. **No matching agent**
   - Ensure agents have required skills
   - Check service area mappings
   - Review routing criteria

4. **System errors**
   - Check error logs
   - Review system status
   - Contact support if issue persists

### Unfair Lead Distribution

**Problem**: Some agents getting too many/few leads.

**Solutions**:

1. **Review routing strategy**
   - Consider using round robin for fairness
   - Adjust capacity-based routing
   - Check if skill-based routing is causing imbalance

2. **Agent capacity**
   - Review maximum concurrent leads per agent
   - Adjust capacity settings
   - Consider agent workload

3. **Manual overrides**
   - Check for manual assignments bypassing routing
   - Review agent self-assignments
   - Enforce routing rules more strictly

### Wrong Agent Assigned

**Problem**: Leads assigned to incorrect agent.

**Solutions**:

1. **Review routing rules**
   - Check rule conditions and logic
   - Verify field mappings
   - Test with sample data

2. **Agent attributes**
   - Verify agent skills are correct
   - Check service area settings
   - Review agent profiles

3. **Rule priority**
   - Check rule precedence
   - Multiple rules might be conflicting
   - Adjust rule order

---

## Campaign Problems

### Campaign Not Generating Leads

**Problem**: Campaign is running but not producing leads.

**Solutions**:

1. **Check campaign settings**
   - Verify campaign is active
   - Check budget allocation
   - Review targeting settings

2. **Lead source issues**
   - Verify lead source is working
   - Check integration with advertising platforms
   - Test lead capture forms

3. **Campaign targeting**
   - Review target audience settings
   - Broaden targeting criteria
   - Check geographic restrictions

4. **Campaign budget**
   - Verify sufficient budget
   - Check daily spend limits
   - Increase budget if needed

### Campaign Performance Poor

**Problem**: Campaign generating leads but with low quality or conversion.

**Solutions**:

1. **Review targeting**
   - Refine target audience
   - Adjust demographic filters
   - Test different segments

2. **Campaign creative**
   - Review ad copy and images
   - Test different variations (A/B test)
   - Improve landing page

3. **Lead capture process**
   - Simplify lead capture form
   - Reduce required fields
   - Optimize form placement

4. **Competition**
   - Research competitor campaigns
   - Differentiate your offer
   - Adjust bid strategy

### Campaign Dashboard Not Updating

**Problem**: Campaign metrics not showing current data.

**Solutions**:

1. **Refresh the page**
   - Click refresh or reload
   - Clear browser cache
   - Try different browser

2. **Data lag**
   - Allow time for data processing
   - Real-time data may have short delays
   - Check last updated timestamp

3. **Integration issues**
   - Verify connection to ad platforms
   - Check API credentials
   - Review error logs

---

## Reporting & Analytics Issues

### Reports Not Loading

**Problem**: Reports are stuck loading or showing errors.

**Solutions**:

1. **Check date range**
   - Large date ranges may take longer
   - Reduce time period
   - Try smaller ranges

2. **Browser issues**
   - Refresh the page
   - Clear browser cache
   - Try different browser

3. **Data volume**
   - High data volume may cause delays
   - Apply filters to reduce data
   - Use summary reports instead of detail

### Incorrect Data in Reports

**Problem**: Report data doesn't match expectations or other sources.

**Solutions**:

1. **Verify filters**
   - Check all applied filters
   - Clear filters and re-apply
   - Confirm correct data source

2. **Time zone issues**
   - Verify time zone settings
   - Check report time zone
   - Adjust for time differences

3. **Data sync delays**
   - Data may not be real-time
   - Check last sync time
   - Allow for processing delays

4. **Report configuration**
   - Review report settings
   - Verify calculations and formulas
   - Check for custom filters

### Can't Export Reports

**Problem**: Unable to export report to CSV, Excel, or PDF.

**Solutions**:

1. **Browser permissions**
   - Allow downloads in browser
   - Check popup blocker
   - Disable download managers

2. **File size**
   - Large exports may fail
   - Reduce date range
   - Apply filters to limit data

3. **Report format**
   - Try different export format
   - Some reports may not support all formats
   - Contact support if issue persists

---

## Performance Issues

### Platform Is Slow

**Problem**: Platform is loading slowly or feels sluggish.

**Solutions**:

1. **Browser performance**
   - Close unnecessary tabs
   - Clear browser cache
   - Disable heavy extensions
   - Update browser to latest version

2. **Internet connection**
   - Check internet speed
   - Restart router
   - Try wired connection instead of Wi-Fi

3. **System status**
   - Check platform status page
   - Look for known issues
   - Wait for maintenance to complete

4. **Reduce data loading**
   - Apply filters to limit data
   - Use pagination instead of loading all
   - Avoid large date ranges

### Pages Not Loading

**Problem**: Pages showing errors or not loading at all.

**Solutions**:

1. **Refresh the page**
   - Click refresh or reload
   - Try force refresh (Ctrl+F5 / Cmd+Shift+R)

2. **Check internet**
   - Verify internet connection
   - Try loading other websites
   - Restart router if needed

3. **Browser issues**
   - Try different browser
   - Clear browser cache
   - Disable extensions

4. **Platform status**
   - Check status page
   - Look for reported outages
   - Contact support if widespread issue

---

## Mobile App Issues

### App Not Syncing

**Problem**: Mobile app not syncing with desktop data.

**Solutions**:

1. **Check internet connection**
   - Verify mobile data or Wi-Fi is on
   - Try switching between Wi-Fi and mobile data
   - Check airplane mode is off

2. **Force sync**
   - Pull down to refresh in app
   - Go to settings and trigger sync
   - Close and reopen app

3. **Update app**
   - Check for app updates
   - Install latest version
   - Restart after update

### App Crashes

**Problem**: Mobile app crashes or freezes.

**Solutions**:

1. **Restart app**
   - Close app completely
   - Reopen app
   - Force quit if needed

2. **Update app**
   - Install latest version
   - Restart phone after update

3. **Clear app cache**
   - Go to phone settings
   - Clear app cache and data
   - Log in again

4. **Reinstall app**
   - Uninstall app
   - Reinstall from app store
   - Log in again

---

## Still Need Help?

If you couldn't resolve your issue with the solutions above:

1. **Check our FAQ** - [Frequently Asked Questions](faq.md)
2. **Search our knowledge base** - [Help Center](../support/help-center.md)
3. **Contact support** - Submit a support ticket
4. **Live chat** - Available during business hours

**Support Contact**:
- **Email**: support@insurance-leads-platform.com
- **Phone**: 1-800-INSURE-1 (Mon-Fri, 8am-8pm EST)
- **Live Chat**: Available in-app
- **Average Response Time**: < 2 hours

When contacting support, please include:
- Your account email
- Description of the problem
- Steps you've already tried
- Screenshots or error messages (if applicable)
