# HubSpot Integration Guide

Complete guide to integrating the Insurance Lead Generation AI Platform with HubSpot.

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

The HubSpot integration enables seamless data synchronization between the Insurance Lead Generation platform and HubSpot CRM, ensuring your lead data is consistent across both systems.

### Key Features

- **Bi-directional sync**: Changes sync automatically in both directions
- **Contact and lead synchronization**: Keep contacts and leads in sync
- **Activity tracking**: Sync emails, notes, and tasks
- **Lifecycle stage mapping**: Map platform statuses to HubSpot lifecycle stages
- **Custom property support**: Sync custom properties and fields
- **Real-time updates**: Near real-time synchronization

### What Syncs

**Platform → HubSpot**:
- Lead contact information
- Lead score
- Source data
- Notes and activities
- Lifecycle stages

**HubSpot → Platform**:
- Contact updates
- Company information
- Lifecycle stage changes
- Deal information
- Activity history

---

## Prerequisites

Before setting up the integration, ensure you have:

### System Requirements

- **HubSpot Edition**: Professional or Enterprise
- **API Access**: API access enabled in HubSpot
- **Permissions**: Account Owner or admin-level permissions
- **Platform Account**: Admin access to Insurance Lead Generation platform

### HubSpot Preparation

1. **Verify HubSpot Edition**:
   - Go to Settings > Account > Billing
   - Confirm Professional or Enterprise plan

2. **Check API Access**:
   - Go to Settings > Integrations > API Key
   - Generate or verify API key
   - Ensure HAPI key is available for advanced features

3. **Create Custom Properties** (optional):
   - Go to Settings > Properties
   - Create custom properties to receive platform data
   - Note internal property names for mapping

### Platform Preparation

1. **Admin Access**:
   - Log in with admin privileges
   - Navigate to Settings > Integrations

2. **Team Configuration**:
   - Ensure teams are set up for assignment mapping

---

## Installation

### Step 1: Connect to HubSpot

1. Navigate to **Settings > Integrations > CRM**
2. Click **"Add Integration"**
3. Select **HubSpot** from the dropdown
4. Click **"Connect"**

### Step 2: Authorize Integration

You'll be redirected to HubSpot:

1. **Log in** to your HubSpot account if prompted
2. **Select account** if you have multiple HubSpot accounts
3. **Review permissions** requested:
   - Access to contacts
   - Access to companies
   - Access to deals
   - Access to activities
   - Create, read, update, and delete permissions
4. **Click "Connect App"** to authorize

### Step 3: Configuration Setup

After authorization:

1. You'll be redirected back to the platform
2. Connection status should show **"Connected"**
3. HubSpot account information will display
4. Proceed to configuration

---

## Configuration

### General Settings

**Location**: Settings > Integrations > HubSpot > General

**Settings**:

1. **Sync Direction**:
   - **Bi-directional**: Changes sync both ways (recommended)
   - **Platform to HubSpot Only**: Platform is source of truth
   - **HubSpot to Platform Only**: HubSpot is source of truth

2. **Sync Frequency**:
   - **Real-time**: Sync within 1-5 minutes of change
   - **Hourly**: Sync every hour
   - **Daily**: Once daily
   - **Manual**: Only when manually triggered

3. **Conflict Resolution**:
   - **Platform Wins**: Platform data overwrites HubSpot
   - **HubSpot Wins**: HubSpot data overwrites platform
   - **Most Recent**: Most recent edit wins
   - **Manual Review**: Flag for manual resolution

4. **Initial Sync**:
   - **Platform to HubSpot**: Import existing platform leads to HubSpot
   - **HubSpot to Platform**: Import existing HubSpot contacts to platform
   - **Skip**: Don't perform initial sync

### Object Mapping

**Location**: Settings > Integrations > HubSpot > Object Mapping

Configure which HubSpot objects to sync with platform entities:

| Platform Entity | HubSpot Object | Sync Direction |
|-----------------|----------------|----------------|
| Leads | Contacts | Bi-directional |
| Converted Leads | Companies | Bi-directional |
| Converted Leads | Deals | Bi-directional |
| Notes | Engagements (Notes) | Bi-directional |
| Tasks | Engagements (Tasks) | Bi-directional |
| Emails | Engagements (Emails) | Bi-directional |

---

## Field Mapping

### Default Field Mapping

The integration includes default mappings for standard fields:

**Contact Mappings**:

| Platform Field | HubSpot Property | Notes |
|---------------|------------------|-------|
| firstName | firstname | Standard property |
| lastName | lastname | Standard property |
| email | email | Standard property |
| phone | phone | Standard property |
| mobilePhone | mobilephone | Standard property |
| street | address | Standard property |
| city | city | Standard property |
| state | state | Standard property |
| zipCode | zip | Standard property |
| country | country | Standard property |
| score | lead_score | Custom property |
| status | lifecyclestage | Map to lifecycle stage |
| source | lead_source | Custom property |
| insuranceType | insurance_type | Custom property |
| createdAt | createdate | Read-only |
| updatedAt | lastmodifieddate | Read-only |

### Lifecycle Stage Mapping

Map platform statuses to HubSpot lifecycle stages:

**Location**: Settings > Integrations > HubSpot > Lifecycle Mapping

**Default Mapping**:

| Platform Status | HubSpot Lifecycle Stage |
|-----------------|-------------------------|
| NEW | Subscriber |
| CONTACTED | Lead |
| QUALIFIED | Marketing Qualified Lead (MQL) |
| PROPOSAL_SENT | Sales Qualified Lead (SQL) |
| NEGOTIATION | Opportunity |
| CONVERTED | Customer |
| LOST | Evangelist |

**Customize Mapping**:
1. Click "Configure Mapping"
2. Select platform status
3. Choose corresponding HubSpot lifecycle stage
4. Save mapping

### Custom Property Mapping

Create custom property mappings:

**Location**: Settings > Integrations > HubSpot > Field Mapping

**Steps**:

1. Click **"Add Mapping"**
2. Select **Platform Field** or create custom formula
3. Select **HubSpot Property** (standard or custom)
4. Configure **Sync Direction**
5. Apply **Transformation** (optional):
   - Date format conversion
   - Text case transformation
   - Value mapping
   - Concatenation
6. Save mapping

### Company Field Mapping

Map converted lead data to company properties:

| Platform Field | HubSpot Company Property |
|---------------|-------------------------|
| company | name |
| street | address |
| city | city |
| state | state |
| zipCode | zip |
| country | country |
| industry | industry |
| size | numberofemployees |

---

## Sync Settings

### Automatic Sync

Configure automatic synchronization:

**Triggers**:
- Lead created/updated in platform
- Contact updated in HubSpot
- Lifecycle stage change
- Activity created
- Custom property change

**Frequency**:
Based on sync frequency setting:
- Real-time: 1-5 minute delay
- Hourly: At top of each hour
- Daily: At configured time

### Manual Sync

Manually trigger sync operations:

**Location**: Settings > Integrations > HubSpot > Manual Sync

**Options**:

1. **Sync Now**: Sync all pending changes
2. **Full Sync**: Resync all records (use with caution)
3. **Sync by Date Range**: Sync records within date range
4. **Sync Specific Leads**: Select specific leads to sync

### Bulk Operations

For large-scale data migration:

**Platform → HubSpot**:
1. Export from platform
2. Format for HubSpot import
3. Use HubSpot import tools

**HubSpot → Platform**:
1. Export from HubSpot
2. Format CSV according to platform schema
3. Import into platform
4. Sync will maintain connection

---

## Using the Integration

### Creating Leads

**From Platform**:
1. Create lead as usual in platform
2. Lead automatically syncs to HubSpot as Contact
3. HubSpot Contact ID appears in platform lead detail
4. Lifecycle stage set based on mapping

**From HubSpot**:
1. Create contact in HubSpot
2. Contact automatically syncs to platform (if bi-directional)
3. Platform assigns based on routing rules
4. Platform calculates lead score

### Updating Leads

**From Platform**:
1. Update lead in platform
2. Changes sync to HubSpot
3. HubSpot contact properties update
4. Lifecycle stage may update if status changed

**From HubSpot**:
1. Update contact in HubSpot
2. Changes sync to platform
3. Platform applies scoring and routing rules

### Converting Leads

**From Platform**:
1. Change status to "CONVERTED"
2. Platform syncs to HubSpot
3. HubSpot lifecycle stage changes to "Customer"
4. Company and Deal created in HubSpot

**From HubSpot**:
1. Change lifecycle stage to "Customer"
2. Platform updates status to "CONVERTED"
3. Opportunity information synced

### Activity Sync

**Emails**:
- Emails sent from platform sync to HubSpot
- HubSpot email engagements sync to platform
- Tracking data preserved

**Notes**:
- Platform notes sync as HubSpot note engagements
- HubSpot notes sync to platform

**Tasks**:
- Platform tasks sync as HubSpot task engagements
- HubSpot tasks sync to platform

---

## Troubleshooting

### Connection Issues

**Problem**: "Connection failed" error

**Solutions**:
1. Verify HubSpot API access
2. Check OAuth token hasn't expired
3. Reauthorize the integration
4. Verify HubSpot account is accessible
5. Check if HubSpot is experiencing outages

### Sync Not Working

**Problem**: Changes not syncing between systems

**Solutions**:
1. Check sync status in Settings > Integrations
2. Verify sync frequency settings
3. Review sync logs for errors
4. Check if sync is paused
5. Manually trigger sync

### Lifecycle Stage Issues

**Problem**: Incorrect lifecycle stage in HubSpot

**Solutions**:
1. Review lifecycle stage mapping
2. Verify platform status values
3. Check for conflicting updates
4. Manually correct and monitor

### Property Mapping Errors

**Problem**: Property not syncing or wrong values

**Solutions**:
1. Verify property names in HubSpot
2. Check property type compatibility
3. Review transformation settings
4. Check property-level permissions

### Performance Issues

**Problem**: Slow sync performance

**Solutions**:
1. Reduce sync frequency
2. Reduce number of mapped properties
3. Schedule bulk sync during off-hours
4. Contact support for optimization

### Rate Limit Exceeded

**Problem**: HubSpot API rate limit exceeded

**Solutions**:
1. Implement bulk sync windows
2. Reduce sync frequency
3. Use HubSpot's batch API operations
4. Contact HubSpot to increase limits

---

## Best Practices

### Setup Best Practices

1. **Test with Test Portal**: Use HubSpot test portal for initial setup
2. **Start Small**: Begin with limited property mapping
3. **Document Mappings**: Keep a record of all mappings
4. **User Training**: Train users on integration behavior
5. **Backup Data**: Backup both systems before initial sync

### Lifecycle Stage Management

1. **Clear Mapping**: Establish clear stage mapping rules
2. **Consistent Usage**: Use consistent status values
3. **Automate with Care**: Consider manual review for critical stage changes
4. **Monitor Changes**: Regularly review lifecycle stage changes

### Data Quality

1. **Validation Rules**: Implement validation in both systems
2. **Data Cleaning**: Clean data before sync
3. **Duplicate Management**: Configure duplicate detection
4. **Standardization**: Standardize data formats

### Ongoing Management

1. **Monitor Logs**: Review sync logs regularly
2. **Update Mappings**: Adjust as systems evolve
3. **Performance Review**: Monitor and optimize sync performance
4. **User Feedback**: Gather feedback from users

### Security

1. **API Key Security**: Protect HubSpot API keys
2. **Access Review**: Regularly review access permissions
3. **Audit Logging**: Enable comprehensive logging
4. **Compliance**: Ensure compliance with data regulations

---

## Support

For HubSpot integration assistance:

- **Documentation**: Browse full documentation library
- **Webinars**: Weekly HubSpot integration training
- **Consulting**: Hire our HubSpot integration experts
- **Contact Support**: Submit a support ticket

**HubSpot Integration Support**:
- **Email**: hubspot-support@insurance-leads-platform.com
- **Community**: HubSpot Community #integrations
- **Response Time**: < 2 hours

When contacting support, please include:
- Organization name
- HubSpot Portal ID
- Error messages or sync logs
- Screenshots of issue
