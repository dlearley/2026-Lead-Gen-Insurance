# Salesforce Integration Guide

Complete guide to integrating the Insurance Lead Generation AI Platform with Salesforce.

## Table of Contents

- [Overview](#overview)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Configuration](#configuration)
- [Field Mapping](#field-mapping)
- [Sync Settings](#sync-settings)
- [Using the Integration](#using-the-integration)
- [Troubleshooting](#troubleshooting)
- [Best Practices](#best-practices)

---

## Overview

The Salesforce integration enables two-way synchronization between the Insurance Lead Generation platform and your Salesforce CRM, ensuring data consistency across systems.

### Key Features

- **Bi-directional sync**: Changes sync both directions
- **Real-time updates**: Near real-time data synchronization
- **Custom field mapping**: Map fields flexibly between systems
- **Conflict resolution**: Define how to handle sync conflicts
- **Bulk operations**: Efficiently sync large volumes of data
- **Error handling**: Comprehensive error reporting and retry logic

### What Syncs

**Leads → Salesforce**:
- Lead contact information
- Lead score and qualification status
- Source and campaign data
- Custom fields

**Salesforce → Platform**:
- Contact updates
- Account updates
- Opportunity stage changes
- Activity history

---

## Prerequisites

Before setting up the integration, ensure you have:

### System Requirements

- **Salesforce Edition**: Professional, Enterprise, or Unlimited
- **API Access**: API enabled in Salesforce
- **Permissions**: System Administrator or equivalent
- **Platform Account**: Admin access to Insurance Lead Generation platform

### Salesforce Preparation

1. **Enable API Access**:
   - Go to Setup > User Management > Users
   - Select your user
   - Click "Edit"
   - Check "API Enabled"
   - Save

2. **Check Connected App Permissions**:
   - Verify users can connect apps
   - Check OAuth settings
   - Ensure IP relaxation if needed

3. **Prepare Custom Fields** (optional):
   - Create custom fields in Salesforce to receive platform data
   - Note API names for field mapping

### Platform Preparation

1. **Admin Access**:
   - Log in with admin privileges
   - Navigate to Settings > Integrations

2. **Team Configuration**:
   - Ensure teams are set up for assignment mapping

---

## Installation

### Step 1: Connect to Salesforce

1. Navigate to **Settings > Integrations > CRM**
2. Click **"Add Integration"**
3. Select **Salesforce** from the dropdown
4. Click **"Connect"**

### Step 2: Authorize the Integration

You'll be redirected to Salesforce:

1. **Log in** to your Salesforce account if prompted
2. **Review permissions** requested:
   - Access to Leads, Contacts, Accounts, Opportunities
   - Create, read, update, and delete access
   - Access to custom objects and fields
3. **Click "Allow"** to grant permissions

### Step 3: Verification

After authorization:

1. You'll be redirected back to the platform
2. Connection status should show **"Connected"**
3. Salesforce organization information will display
4. Proceed to configuration

---

## Configuration

### General Settings

**Location**: Settings > Integrations > Salesforce > General

**Settings**:

1. **Sync Direction**:
   - **Bi-directional**: Changes sync both ways (recommended)
   - **Platform to Salesforce Only**: Platform is source of truth
   - **Salesforce to Platform Only**: Salesforce is source of truth

2. **Sync Frequency**:
   - **Real-time**: Sync within 1-5 minutes of change
   - **Hourly**: Sync every hour
   - **Daily**: Once daily
   - **Manual**: Only when manually triggered

3. **Conflict Resolution**:
   - **Platform Wins**: Platform data overwrites Salesforce
   - **Salesforce Wins**: Salesforce data overwrites platform
   - **Most Recent**: Most recent edit wins
   - **Manual Review**: Flag for manual resolution

4. **Bulk Sync Window**:
   - Time window for bulk operations (e.g., 2:00 AM - 4:00 AM)
   - Minimizes impact on daytime performance

### Object Mapping

**Location**: Settings > Integrations > Salesforce > Object Mapping

Configure which Salesforce objects to sync with platform entities:

| Platform Entity | Salesforce Object | Sync Direction |
|-----------------|-------------------|----------------|
| Leads | Leads | Bi-directional |
| Converted Leads | Contacts | Bi-directional |
| Converted Leads | Opportunities | Bi-directional |
| Notes | Tasks | Bi-directional |
| Emails | EmailMessage | Bi-directional |

**Configuration Options**:
- Enable/disable each mapping
- Set sync direction per mapping
- Configure record creation rules

---

## Field Mapping

### Default Field Mapping

The integration includes default mappings for standard fields:

**Lead Mappings**:

| Platform Field | Salesforce Field | Notes |
|---------------|-----------------|-------|
| firstName | FirstName | Standard field |
| lastName | LastName | Standard field |
| email | Email | Standard field |
| phone | Phone | Standard field |
| mobilePhone | MobilePhone | Standard field |
| street | Street | Standard field |
| city | City | Standard field |
| state | State | Standard field |
| zipCode | PostalCode | Standard field |
| country | Country | Standard field |
| score | Lead_Score__c | Custom field required |
| status | Status | Map status values |
| source | LeadSource | Map source values |
| insuranceType | Insurance_Type__c | Custom field required |

### Creating Custom Mappings

**Location**: Settings > Integrations > Salesforce > Field Mapping

**Steps**:

1. Click **"Add Mapping"**
2. Select **Platform Field** or create custom formula
3. Select **Salesforce Field** (standard or custom)
4. Configure **Field Type**:
   - **Direct**: One-to-one mapping
   - **Transform**: Apply transformation function
   - **Formula**: Calculate value from multiple fields
5. Set **Sync Direction**:
   - Both ways
   - Platform to Salesforce only
   - Salesforce to Platform only
6. Configure **Default Value** (optional)
7. Save mapping

### Field Transformations

Apply transformations during sync:

**Available Transformations**:

1. **Date Format**: Convert between date formats
2. **Text Case**: Convert to uppercase/lowercase/title case
3. **Value Mapping**: Map values between systems
   - Example: Platform status "QUALIFIED" → Salesforce status "Qualified"
4. **Concatenation**: Combine multiple fields
5. **Split**: Split one field into multiple
6. **Lookup**: Look up values from related objects
7. **Default**: Use default value if source is empty

### Status Mapping

Map status values between systems:

**Example Mapping**:

| Platform Status | Salesforce Status |
|-----------------|------------------|
| NEW | New |
| CONTACTED | Contacted |
| QUALIFIED | Qualified |
| PROPOSAL_SENT | Proposal Sent |
| NEGOTIATION | Negotiating |
| CONVERTED | Closed Won |
| LOST | Closed Lost |

**Configuration**:
1. Go to Field Mapping
2. Find status field
3. Click "Configure Mapping"
4. Add value mappings
5. Save

---

## Sync Settings

### Automatic Sync

Configure automatic synchronization:

**Triggers**:
- Lead created/updated in platform
- Lead/Contact updated in Salesforce
- Status change
- Custom field change

**Frequency**:
Based on sync frequency setting:
- Real-time: 1-5 minute delay
- Hourly: At top of each hour
- Daily: At configured time (default: 2:00 AM)

### Manual Sync

Manually trigger sync operations:

**Location**: Settings > Integrations > Salesforce > Manual Sync

**Options**:

1. **Sync Now**: Sync all pending changes
2. **Full Sync**: Resync all records (use with caution)
3. **Sync by Date Range**: Sync records within date range
4. **Sync Specific Leads**: Select specific leads to sync

**Best Practice**: Use manual sync for:
- Initial setup
- Bulk data migration
- Correcting sync errors
- Testing configuration

### Bulk Operations

For large-scale operations:

**Bulk Export from Platform**:
1. Go to Leads
2. Apply filters
3. Export to CSV
4. Import into Salesforce using Data Loader

**Bulk Import to Platform**:
1. Export from Salesforce
2. Format CSV according to platform schema
3. Import into platform
4. Platform will sync with Salesforce automatically

---

## Using the Integration

### Creating Leads

**From Platform**:
1. Create lead as usual in platform
2. Lead automatically syncs to Salesforce
3. Salesforce lead ID appears in platform lead detail
4. Sync status shows in activity timeline

**From Salesforce**:
1. Create lead in Salesforce
2. Lead automatically syncs to platform (if bi-directional)
3. Platform lead ID appears in Salesforce record
4. Assignment based on platform routing rules

### Updating Leads

**From Platform**:
1. Update lead in platform
2. Changes sync to Salesforce within sync window
3. Conflict resolution applies if both systems updated

**From Salesforce**:
1. Update lead in Salesforce
2. Changes sync to platform within sync window
3. Platform rules (scoring, routing) may apply

### Converting Leads

**From Platform**:
1. Change status to "CONVERTED"
2. Lead syncs to Salesforce and converts to Contact/Opportunity
3. Configure conversion mapping:
   - Map lead fields to contact fields
   - Map lead fields to opportunity fields
   - Set default opportunity values

**From Salesforce**:
1. Convert lead to Contact/Opportunity in Salesforce
2. Platform updates lead status to "CONVERTED"
3. Link opportunity information

### Handling Errors

**Sync Errors**:
- Errors appear in sync log
- Lead detail shows sync status
- Administrators receive error notifications

**Common Error Types**:
- Field validation errors
- Permission errors
- Record locking
- API rate limits
- Network errors

**Resolution**:
1. Review error details in sync log
2. Fix underlying issue (field, permission, etc.)
3. Retry sync manually or wait for automatic retry

---

## Troubleshooting

### Connection Issues

**Problem**: "Connection failed" error

**Solutions**:
1. Verify Salesforce API is enabled
2. Check OAuth token hasn't expired
3. Reauthorize the integration
4. Verify Salesforce is accessible (no network issues)
5. Check Salesforce IP restrictions

### Sync Not Working

**Problem**: Changes not syncing between systems

**Solutions**:
1. Check sync status in Settings > Integrations
2. Verify sync frequency settings
3. Review sync logs for errors
4. Check if sync is paused
5. Manual trigger sync

### Field Mapping Errors

**Problem**: Field not syncing or incorrect values

**Solutions**:
1. Verify field mapping configuration
2. Check field API names in Salesforce
3. Ensure field types are compatible
4. Review transformation settings
5. Check field-level security

### Conflict Resolution Issues

**Problem**: Wrong data overwriting during conflicts

**Solutions**:
1. Review conflict resolution settings
2. Adjust conflict resolution strategy
3. Review sync timestamps
4. Consider manual review for critical conflicts

### Performance Issues

**Problem**: Slow sync performance

**Solutions**:
1. Reduce sync frequency
2. Schedule bulk sync during off-hours
3. Reduce number of mapped fields
4. Optimize field transformations
5. Contact support for performance optimization

### Rate Limit Exceeded

**Problem**: Salesforce API rate limit exceeded

**Solutions**:
1. Implement bulk sync windows
2. Reduce sync frequency
3. Use bulk API operations
4. Contact Salesforce to increase limits

---

## Best Practices

### Setup Best Practices

1. **Test with Sandbox**: Set up integration in Salesforce Sandbox first
2. **Start Small**: Begin with limited field mapping and expand
3. **Document Mappings**: Keep a record of all field mappings
4. **User Training**: Train users on how integration works
5. **Backup Data**: Backup both systems before initial sync

### Ongoing Management

1. **Monitor Sync Logs**: Review regularly for errors
2. **Update Mappings**: Adjust as systems evolve
3. **Review Performance**: Monitor sync performance and optimize
4. **User Feedback**: Gather feedback from users on sync issues
5. **Regular Audits**: Periodically audit data consistency

### Conflict Management

1. **Clear Rules**: Establish clear conflict resolution rules
2. **Source of Truth**: Define which system is primary for which data
3. **Manual Review**: Set manual review for critical conflicts
4. **Communication**: Inform users of conflict resolution strategy

### Security Best Practices

1. **Principle of Least Privilege**: Use minimal required permissions
2. **Regular Access Review**: Review and revoke unnecessary access
3. **Secure OAuth Tokens**: Protect OAuth tokens
4. **IP Whitelist**: Restrict API access by IP (if applicable)
5. **Audit Logging**: Enable comprehensive audit logging

### Data Quality

1. **Validation Rules**: Implement validation rules in both systems
2. **Data Cleaning**: Clean data before initial sync
3. **Duplicate Management**: Configure duplicate detection
4. **Standardization**: Standardize data formats and values

---

## Support

For Salesforce integration assistance:

- **Documentation**: Browse full documentation library
- **Webinars**: Weekly Salesforce integration training
- **Consulting**: Hire our Salesforce integration experts
- **Contact Support**: Submit a support ticket

**Salesforce Integration Support**:
- **Email**: salesforce-support@insurance-leads-platform.com
- **Slack Channel**: #salesforce-integration (Enterprise plan)
- **Response Time**: < 2 hours

When contacting support, please include:
- Organization name
- Salesforce org ID
- Error messages or sync logs
- Screenshots of issue
