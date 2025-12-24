# Database Schema Documentation

## Overview

This document describes the database schema for the Lead Generation Insurance Platform. The schema is designed to support lead management, organization tracking, campaign management, and insurance product offerings.

## Entity Relationship Diagram

```
┌─────────────────┐
│  organizations  │
└────────┬────────┘
         │
         ├──< users
         ├──< leads
         └──< campaigns
              │
              └──< leads

┌──────────────┐
│ lead_sources │
└──────┬───────┘
       └──< leads

┌────────────────────┐
│insurance_products  │
└─────────┬──────────┘
          └──< leads
```

## Tables

### organizations

Stores information about companies/organizations using the platform.

| Column      | Type         | Constraints                    | Description                          |
|-------------|--------------|--------------------------------|--------------------------------------|
| id          | INTEGER      | PRIMARY KEY, AUTO INCREMENT    | Unique identifier                    |
| name        | VARCHAR(255) | NOT NULL, INDEX                | Organization name                    |
| slug        | VARCHAR(255) | UNIQUE, NOT NULL, INDEX        | URL-friendly identifier              |
| description | TEXT         | NULL                           | Organization description             |
| website     | VARCHAR(255) | NULL                           | Organization website URL             |
| phone       | VARCHAR(50)  | NULL                           | Contact phone number                 |
| email       | VARCHAR(255) | NULL                           | Contact email address                |
| is_active   | BOOLEAN      | NOT NULL, DEFAULT TRUE         | Active status                        |
| created_at  | TIMESTAMP    | NOT NULL, DEFAULT NOW()        | Record creation timestamp            |
| updated_at  | TIMESTAMP    | NOT NULL, DEFAULT NOW()        | Record last update timestamp         |

**Indexes:**
- `ix_organizations_name`: Index on name
- `ix_organizations_slug`: Unique index on slug

**Relationships:**
- One-to-many with `users`
- One-to-many with `leads`
- One-to-many with `campaigns`

---

### users

Stores user account information.

| Column            | Type         | Constraints                    | Description                          |
|-------------------|--------------|--------------------------------|--------------------------------------|
| id                | INTEGER      | PRIMARY KEY, AUTO INCREMENT    | Unique identifier                    |
| email             | VARCHAR(255) | UNIQUE, NOT NULL, INDEX        | User email (login)                   |
| hashed_password   | VARCHAR(255) | NOT NULL                       | Bcrypt hashed password               |
| first_name        | VARCHAR(100) | NOT NULL                       | User first name                      |
| last_name         | VARCHAR(100) | NOT NULL                       | User last name                       |
| is_active         | BOOLEAN      | NOT NULL, DEFAULT TRUE         | Account active status                |
| is_superuser      | BOOLEAN      | NOT NULL, DEFAULT FALSE        | Admin privileges flag                |
| phone             | VARCHAR(50)  | NULL                           | User phone number                    |
| organization_id   | INTEGER      | FK -> organizations.id, INDEX  | Associated organization              |
| created_at        | TIMESTAMP    | NOT NULL, DEFAULT NOW()        | Record creation timestamp            |
| updated_at        | TIMESTAMP    | NOT NULL, DEFAULT NOW()        | Record last update timestamp         |

**Indexes:**
- `ix_users_email`: Unique index on email
- `ix_users_organization_id`: Index on organization_id

**Foreign Keys:**
- `organization_id` -> `organizations.id` (CASCADE DELETE)

---

### lead_sources

Categorizes the origin of leads (web, social media, referral, etc.).

| Column      | Type         | Constraints                    | Description                          |
|-------------|--------------|--------------------------------|--------------------------------------|
| id          | INTEGER      | PRIMARY KEY, AUTO INCREMENT    | Unique identifier                    |
| name        | VARCHAR(255) | NOT NULL, INDEX                | Source name                          |
| slug        | VARCHAR(255) | UNIQUE, NOT NULL, INDEX        | URL-friendly identifier              |
| description | TEXT         | NULL                           | Source description                   |
| source_type | VARCHAR(100) | NOT NULL, INDEX                | Type (web, social_media, ppc, etc.)  |
| is_active   | BOOLEAN      | NOT NULL, DEFAULT TRUE         | Active status                        |
| created_at  | TIMESTAMP    | NOT NULL, DEFAULT NOW()        | Record creation timestamp            |
| updated_at  | TIMESTAMP    | NOT NULL, DEFAULT NOW()        | Record last update timestamp         |

**Indexes:**
- `ix_lead_sources_name`: Index on name
- `ix_lead_sources_slug`: Unique index on slug
- `ix_lead_sources_source_type`: Index on source_type

**Relationships:**
- One-to-many with `leads`

---

### campaigns

Marketing campaigns for lead generation.

| Column          | Type          | Constraints                    | Description                          |
|-----------------|---------------|--------------------------------|--------------------------------------|
| id              | INTEGER       | PRIMARY KEY, AUTO INCREMENT    | Unique identifier                    |
| name            | VARCHAR(255)  | NOT NULL, INDEX                | Campaign name                        |
| slug            | VARCHAR(255)  | UNIQUE, NOT NULL, INDEX        | URL-friendly identifier              |
| description     | TEXT          | NULL                           | Campaign description                 |
| campaign_type   | VARCHAR(100)  | NOT NULL, INDEX                | Type (seasonal, promotional, etc.)   |
| status          | VARCHAR(50)   | NOT NULL, DEFAULT 'draft'      | Status (draft, active, paused, etc.) |
| budget          | NUMERIC(10,2) | NULL                           | Campaign budget                      |
| start_date      | TIMESTAMP     | NULL                           | Campaign start date                  |
| end_date        | TIMESTAMP     | NULL                           | Campaign end date                    |
| is_active       | BOOLEAN       | NOT NULL, DEFAULT TRUE         | Active status                        |
| organization_id | INTEGER       | FK -> organizations.id, INDEX  | Associated organization              |
| created_at      | TIMESTAMP     | NOT NULL, DEFAULT NOW()        | Record creation timestamp            |
| updated_at      | TIMESTAMP     | NOT NULL, DEFAULT NOW()        | Record last update timestamp         |

**Indexes:**
- `ix_campaigns_name`: Index on name
- `ix_campaigns_slug`: Unique index on slug
- `ix_campaigns_campaign_type`: Index on campaign_type
- `ix_campaigns_status`: Index on status
- `ix_campaigns_organization_id`: Index on organization_id

**Foreign Keys:**
- `organization_id` -> `organizations.id` (CASCADE DELETE)

**Relationships:**
- Many-to-one with `organizations`
- One-to-many with `leads`

---

### insurance_products

Available insurance products and policies.

| Column             | Type          | Constraints                    | Description                          |
|--------------------|---------------|--------------------------------|--------------------------------------|
| id                 | INTEGER       | PRIMARY KEY, AUTO INCREMENT    | Unique identifier                    |
| name               | VARCHAR(255)  | NOT NULL, INDEX                | Product name                         |
| slug               | VARCHAR(255)  | UNIQUE, NOT NULL, INDEX        | URL-friendly identifier              |
| description        | TEXT          | NULL                           | Product description                  |
| product_type       | VARCHAR(100)  | NOT NULL, INDEX                | Type (auto, home, life, health)      |
| coverage_amount    | NUMERIC(12,2) | NULL                           | Coverage amount                      |
| premium_range_min  | NUMERIC(10,2) | NULL                           | Minimum premium                      |
| premium_range_max  | NUMERIC(10,2) | NULL                           | Maximum premium                      |
| is_active          | BOOLEAN       | NOT NULL, DEFAULT TRUE         | Active status                        |
| created_at         | TIMESTAMP     | NOT NULL, DEFAULT NOW()        | Record creation timestamp            |
| updated_at         | TIMESTAMP     | NOT NULL, DEFAULT NOW()        | Record last update timestamp         |

**Indexes:**
- `ix_insurance_products_name`: Index on name
- `ix_insurance_products_slug`: Unique index on slug
- `ix_insurance_products_product_type`: Index on product_type

**Relationships:**
- One-to-many with `leads`

---

### leads

Primary table for storing lead information.

| Column               | Type          | Constraints                       | Description                          |
|----------------------|---------------|-----------------------------------|--------------------------------------|
| id                   | INTEGER       | PRIMARY KEY, AUTO INCREMENT       | Unique identifier                    |
| first_name           | VARCHAR(100)  | NOT NULL                          | Lead first name                      |
| last_name            | VARCHAR(100)  | NOT NULL                          | Lead last name                       |
| email                | VARCHAR(255)  | NOT NULL, INDEX                   | Lead email address                   |
| phone                | VARCHAR(50)   | NULL                              | Lead phone number                    |
| date_of_birth        | DATE          | NULL                              | Lead date of birth                   |
| address              | VARCHAR(255)  | NULL                              | Street address                       |
| city                 | VARCHAR(100)  | NULL                              | City                                 |
| state                | VARCHAR(50)   | NULL                              | State/Province                       |
| zip_code             | VARCHAR(20)   | NULL                              | ZIP/Postal code                      |
| country              | VARCHAR(100)  | NOT NULL, DEFAULT 'USA'           | Country                              |
| status               | VARCHAR(50)   | NOT NULL, DEFAULT 'new', INDEX    | Lead status                          |
| priority             | VARCHAR(50)   | NOT NULL, DEFAULT 'medium', INDEX | Priority level                       |
| score                | INTEGER       | NULL, INDEX                       | Lead score (0-100)                   |
| notes                | TEXT          | NULL                              | Additional notes                     |
| estimated_value      | NUMERIC(10,2) | NULL                              | Estimated lead value                 |
| last_contact_date    | TIMESTAMP     | NULL                              | Last contact timestamp               |
| next_follow_up_date  | TIMESTAMP     | NULL                              | Next follow-up date                  |
| organization_id      | INTEGER       | FK -> organizations.id, INDEX     | Associated organization              |
| lead_source_id       | INTEGER       | FK -> lead_sources.id, INDEX      | Lead source                          |
| campaign_id          | INTEGER       | FK -> campaigns.id, INDEX         | Associated campaign                  |
| insurance_product_id | INTEGER       | FK -> insurance_products.id, INDEX| Interested product                   |
| created_at           | TIMESTAMP     | NOT NULL, DEFAULT NOW()           | Record creation timestamp            |
| updated_at           | TIMESTAMP     | NOT NULL, DEFAULT NOW()           | Record last update timestamp         |

**Indexes:**
- `ix_leads_email`: Index on email
- `ix_leads_status`: Index on status
- `ix_leads_priority`: Index on priority
- `ix_leads_score`: Index on score
- `ix_leads_organization_id`: Index on organization_id
- `ix_leads_lead_source_id`: Index on lead_source_id
- `ix_leads_campaign_id`: Index on campaign_id
- `ix_leads_insurance_product_id`: Index on insurance_product_id

**Foreign Keys:**
- `organization_id` -> `organizations.id` (CASCADE DELETE)
- `lead_source_id` -> `lead_sources.id` (SET NULL)
- `campaign_id` -> `campaigns.id` (SET NULL)
- `insurance_product_id` -> `insurance_products.id` (SET NULL)

**Relationships:**
- Many-to-one with `organizations`
- Many-to-one with `lead_sources`
- Many-to-one with `campaigns`
- Many-to-one with `insurance_products`

---

## Data Types

### Status Values (leads.status)

- `new`: Initial lead status
- `contacted`: Lead has been contacted
- `qualified`: Lead meets qualification criteria
- `nurturing`: Lead being nurtured through pipeline
- `converted`: Lead converted to customer
- `lost`: Lead lost to competitor or not interested
- `archived`: Archived lead

### Priority Levels (leads.priority)

- `low`: Standard follow-up
- `medium`: Normal priority
- `high`: Urgent attention required

### Campaign Status (campaigns.status)

- `draft`: Campaign being planned
- `scheduled`: Campaign scheduled
- `active`: Campaign currently running
- `paused`: Campaign temporarily paused
- `completed`: Campaign finished
- `cancelled`: Campaign cancelled

### Source Types (lead_sources.source_type)

- `web`: Website forms
- `social_media`: Social media platforms
- `ppc`: Pay-per-click advertising
- `referral`: Customer referrals
- `email`: Email campaigns
- `event`: Events and conferences
- `partner`: Partner referrals
- `organic`: Organic search

### Product Types (insurance_products.product_type)

- `auto`: Auto/Vehicle insurance
- `home`: Home/Property insurance
- `life`: Life insurance
- `health`: Health insurance
- `business`: Business insurance
- `travel`: Travel insurance
- `pet`: Pet insurance

---

## Migration History

Migrations are managed using Alembic and stored in `alembic/versions/`.

To view migration history:
```bash
alembic history
```

To check current version:
```bash
alembic current
```

---

## Performance Considerations

### Indexes

The schema includes strategic indexes on:
- Foreign keys for efficient joins
- Frequently filtered columns (status, priority, email)
- Unique constraints (slug, email)

### Connection Pooling

- Pool size: 10 connections
- Max overflow: 20 connections
- Pre-ping enabled for connection health checks

### Timestamp Tracking

All tables include `created_at` and `updated_at` timestamps with automatic updates via database triggers.

---

## Backup and Maintenance

### Recommended Backup Strategy

1. Daily full backups
2. Transaction log backups every hour
3. Point-in-time recovery capability
4. 30-day retention policy

### Maintenance Tasks

- Weekly `VACUUM ANALYZE` for table statistics
- Monthly index maintenance
- Quarterly data archival for old leads

---

## Future Enhancements

Planned schema additions:

1. **Activities Table**: Track all interactions with leads
2. **Documents Table**: Store lead-related documents
3. **Notes Table**: Detailed note-taking system
4. **Tags Table**: Flexible tagging system for leads
5. **Webhooks Table**: Event notification system
6. **Audit Log**: Track all data changes
