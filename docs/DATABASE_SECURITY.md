# Database Security Guide

## Overview

This guide covers database security configuration, authentication, encryption, access control, and compliance considerations for all databases in the Insurance Lead Generation AI Platform.

## Table of Contents

- [Security Architecture](#security-architecture)
- [Authentication & Authorization](#authentication--authorization)
- [Network Security](#network-security)
- [Encryption](#encryption)
- [Access Control](#access-control)
- [Audit Logging](#audit-logging)
- [Compliance](#compliance)
- [Security Best Practices](#security-best-practices)
- [Security Audits](#security-audits)

## Security Architecture

### Defense in Depth

```
┌─────────────────────────────────────────────────────────────┐
│                    Security Layers                          │
│                                                               │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ 1. Network Security (VPC, Security Groups)        │    │
│  │    - Private subnets only                          │    │
│  │    - Security group rules                         │    │
│  │    - Network ACLs                                 │    │
│  └─────────────────────────────────────────────────────┘    │
│                           ▼                                 │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ 2. Encryption (At Rest & In Transit)             │    │
│  │    - TLS 1.3 for connections                     │    │
│  │    - AES-256 for data at rest                     │    │
│  │    - Encrypted backups                            │    │
│  └─────────────────────────────────────────────────────┘    │
│                           ▼                                 │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ 3. Authentication (RBAC, MFA)                     │    │
│  │    - Role-based access control                    │    │
│  │    - Least privilege principle                     │    │
│  │    - Strong password policies                      │    │
│  └─────────────────────────────────────────────────────┘    │
│                           ▼                                 │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ 4. Application Security (Input Validation)          │    │
│  │    - Parameterized queries                         │    │
│  │    - Input sanitization                           │    │
│  │    - Output encoding                              │    │
│  └─────────────────────────────────────────────────────┘    │
│                           ▼                                 │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ 5. Data Protection (Classification, Retention)      │    │
│  │    - Data classification                          │    │
│  │    - Retention policies                           │    │
│  │    - Data masking                                 │    │
│  └─────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
```

## Authentication & Authorization

### PostgreSQL

**Roles and Permissions:**

| Role | Privileges | Max Connections | Purpose |
|------|-----------|-----------------|---------|
| `app_role` | SELECT, INSERT, UPDATE, DELETE | 100 | Application operations |
| `readonly_role` | SELECT only | 50 | Reporting/analytics |
| `migration_role` | All privileges (superuser) | 5 | Migrations only |
| `admin_role` | Superuser | 10 | Administrative tasks |

**Role Creation:**

```sql
-- Application role (least privilege)
CREATE ROLE app_role WITH NOLOGIN;
GRANT USAGE ON SCHEMA public TO app_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO app_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO app_role;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO app_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO app_role;

-- Read-only role
CREATE ROLE readonly_role WITH NOLOGIN;
GRANT USAGE ON SCHEMA public TO readonly_role;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO readonly_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO readonly_role;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO readonly_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO readonly_role;

-- Migration role
CREATE ROLE migration_role WITH NOLOGIN CREATEROLE;
GRANT ALL PRIVILEGES ON SCHEMA public TO migration_role;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO migration_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL PRIVILEGES ON TABLES TO migration_role;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO migration_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL PRIVILEGES ON SEQUENCES TO migration_role;
```

**User Creation:**

```sql
-- Application user
CREATE USER app_user WITH ENCRYPTED PASSWORD 'strong_password_here';
GRANT app_role TO app_user;
ALTER USER app_user CONNECTION LIMIT 100;

-- Read-only user
CREATE USER readonly_user WITH ENCRYPTED PASSWORD 'strong_password_here';
GRANT readonly_role TO readonly_user;
ALTER USER readonly_user CONNECTION LIMIT 50;

-- Migration user
CREATE USER migration_user WITH ENCRYPTED PASSWORD 'strong_password_here';
GRANT migration_role TO migration_user;
ALTER USER migration_user CONNECTION LIMIT 5;
```

**Row-Level Security:**

```sql
-- Enable RLS on sensitive tables
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;

-- Create policy for application access
CREATE POLICY leads_app_policy ON leads
  FOR ALL
  TO app_role
  USING (organization_id = current_setting('app.organization_id')::uuid);

-- Create policy for read-only access
CREATE POLICY leads_readonly_policy ON leads
  FOR SELECT
  TO readonly_role
  USING (true);
```

### Redis

**Access Control Lists (ACL):**

```bash
# Create application user
redis-cli ACL SETUSER app_user \
  on >strong_password_here ~* +@all

# Create read-only user
redis-cli ACL SETUSER readonly_user \
  on >strong_password_here ~* +@read

# Create admin user
redis-cli ACL SETUSER admin_user \
  on >strong_password_here ~* +@all

# Set default user (no access)
redis-cli ACL SETUSER default off

# Save ACLs
redis-cli ACL SAVE
```

**ACL Rules:**

| User | Permissions | Purpose |
|------|-------------|---------|
| `app_user` | Full access | Application operations |
| `readonly_user` | Read only | Reporting/analytics |
| `admin_user` | Full access + admin | Administrative tasks |
| `default` | No access | Prevent anonymous access |

### Neo4j

**Roles and Privileges:**

| Role | Privileges | Purpose |
|------|-----------|---------|
| `reader` | MATCH, CALL (read-only) | Reporting/analytics |
| `editor` | reader + CREATE, DELETE, UPDATE | Application operations |
| `publisher` | editor + schema management | Data modeling |
| `admin` | All privileges | Administrative tasks |

**User Creation:**

```cypher
-- Application user
CREATE USER app_user SET PASSWORD 'strong_password_here' CHANGE NOT REQUIRED;
GRANT ROLE reader TO app_user;
GRANT ROLE editor TO app_user;

-- Read-only user
CREATE USER readonly_user SET PASSWORD 'strong_password_here' CHANGE NOT REQUIRED;
GRANT ROLE reader TO readonly_user;

-- Admin user
CREATE USER admin_user SET PASSWORD 'strong_password_here' CHANGE NOT REQUIRED;
GRANT ROLE admin TO admin_user;
```

**Property-Level Access:**

```cypher
-- Create database with restricted access
CREATE DATABASE insurance_lead_gen;

-- Set up graph access for application
GRANT ACCESS ON DATABASE insurance_lead_gen TO app_user;
GRANT READ { label: 'Lead', property: '*' } ON GRAPH insurance_lead_gen TO app_user;
GRANT WRITE { label: 'Lead', property: '*' } ON GRAPH insurance_lead_gen TO app_user;
```

### Qdrant

**API Key Authentication:**

```bash
# Create API key
curl -X PUT "http://qdrant:6333/keys/default" \
  -H "Content-Type: application/json" \
  -d '{
    "key": "strong_api_key_here",
    "options": {
      "action": "full_access"
    }
  }'

# Create read-only API key
curl -X PUT "http://qdrant:6333/keys/readonly" \
  -H "Content-Type: application/json" \
  -d '{
    "key": "strong_readonly_api_key_here",
    "options": {
      "action": "read_only"
    }
  }'
```

**API Key Permissions:**

| Key | Permissions | Purpose |
|-----|-------------|---------|
| `default` | Full access | Application operations |
| `readonly` | Read only | Reporting/analytics |
| `admin` | Full access + admin | Administrative tasks |

## Network Security

### Security Groups

**PostgreSQL Security Group:**

```yaml
# Inbound rules
- Port: 5432
  Protocol: TCP
  Source: EKS node security group
  Description: Application access

- Port: 5432
  Protocol: TCP
  Source: PostgreSQL security group (self)
  Description: Replication traffic

- Port: 5432
  Protocol: TCP
  Source: Bastion security group
  Description: Admin access

# Outbound rules
- Port: All
  Protocol: All
  Destination: 0.0.0.0/0
  Description: Allow all outbound
```

**Redis Security Group:**

```yaml
# Inbound rules
- Port: 6379
  Protocol: TCP
  Source: EKS node security group
  Description: Application access

- Port: 6379
  Protocol: TCP
  Source: Redis security group (self)
  Description: Replication traffic

# Outbound rules
- Port: All
  Protocol: All
  Destination: 0.0.0.0/0
  Description: Allow all outbound
```

**Neo4j Security Group:**

```yaml
# Inbound rules
- Port: 7687 (Bolt)
  Protocol: TCP
  Source: EKS node security group
  Description: Bolt protocol access

- Port: 7474 (HTTP)
  Protocol: TCP
  Source: EKS node security group
  Description: HTTP API access

- Port: 7473 (HTTPS)
  Protocol: TCP
  Source: EKS node security group
  Description: HTTPS API access

- Port: 5000-5000 (Discovery)
  Protocol: TCP
  Source: Neo4j security group (self)
  Description: Cluster discovery

# Outbound rules
- Port: All
  Protocol: All
  Destination: 0.0.0.0/0
  Description: Allow all outbound
```

### VPC Configuration

**Private Subnets Only:**

```bash
# All databases deployed in private subnets
# No public IP addresses
# Access via bastion hosts or VPN
```

**VPC Peering:**

```bash
# Cross-region VPC peering for DR
# Encrypted traffic
# Firewall rules restrict to database ports
```

## Encryption

### At-Rest Encryption

**PostgreSQL:**

```bash
# AWS KMS-managed encryption
-- Enabled via RDS parameter group

# Verify encryption
aws rds describe-db-instances \
  --db-instance-identifier insurance-lead-gen-postgres-primary \
  --query 'DBInstances[0].StorageEncrypted'
```

**Redis:**

```bash
# AWS KMS-managed encryption
-- Enabled via ElastiCache parameter group

# Verify encryption
aws elasticache describe-replication-groups \
  --replication-group-id insurance-lead-gen-redis \
  --query 'ReplicationGroups[0].AtRestEncryptionEnabled'
```

**Neo4j:**

```conf
# Neo4j configuration
dbms.ssl.policy.bolt.enabled=true
dbms.ssl.policy.https.enabled=true
dbms.ssl.policy.bolt.base_directory=certificates/bolt
dbms.ssl.policy.https.base_directory=certificates/https
```

**Qdrant:**

```yaml
# Kubernetes secret encryption
# Encrypted at rest via Kubernetes etcd encryption
```

### In-Transit Encryption

**PostgreSQL:**

```bash
# Require SSL connections
ALTER SYSTEM SET ssl = on;
ALTER SYSTEM SET ssl_cert_file = 'server.crt';
ALTER SYSTEM SET ssl_key_file = 'server.key';
ALTER SYSTEM SET ssl_ca_file = 'ca.crt';

# Force SSL for specific users
ALTER USER app_user WITH CONNECTION LIMIT 100;
REVOKE CONNECT ON DATABASE insurance_lead_gen FROM PUBLIC;
GRANT CONNECT ON DATABASE insurance_lead_gen TO app_user;
```

**Connection String with SSL:**
```
postgresql://user:password@host:5432/database?sslmode=require
```

**Redis:**

```bash
# Enable TLS
redis-cli --tls --cacert /path/to/ca.crt -h host -p 6379

# Connection string with TLS
rediss://password@host:6379
```

**Neo4j:**

```conf
# Bolt TLS
dbms.ssl.policy.bolt.enabled=true
dbms.ssl.policy.bolt.client_auth=NONE

# HTTPS TLS
dbms.ssl.policy.https.enabled=true
dbms.ssl.policy.https.client_auth=NONE
```

**Connection String with TLS:**
```
bolt+s://user:password@host:7687
```

### Backup Encryption

**S3 Server-Side Encryption:**

```bash
# Upload with server-side encryption
aws s3 cp backup.dump \
  s3://bucket/backups/backup.dump \
  --server-side-encryption AES256

# Or use KMS-managed encryption
aws s3 cp backup.dump \
  s3://bucket/backups/backup.dump \
  --server-side-encryption aws:kms \
  --ssekms-key-id <kms-key-id>
```

**Client-Side Encryption:**

```bash
# Encrypt backup before upload
gpg --symmetric --cipher-algo AES256 backup.dump

# Upload encrypted file
aws s3 cp backup.dump.gpg s3://bucket/backups/
```

## Access Control

### IP Whitelisting

**PostgreSQL:**

```sql
-- Allow specific IP ranges (via pg_hba.conf)
host    all    all    10.0.0.0/8    md5
host    all    all    172.16.0.0/12   md5
```

**Redis:**

```bash
# Bind to specific IP
bind 10.0.0.1

# Or use protected mode
protected-mode yes
```

### Connection Timeouts

**PostgreSQL:**

```sql
-- Set statement timeout
ALTER SYSTEM SET statement_timeout = 300000;  -- 5 minutes

-- Set idle session timeout
ALTER SYSTEM SET idle_in_transaction_session_timeout = 600000;  -- 10 minutes
```

**Redis:**

```conf
# Set timeout
timeout 300  -- 5 minutes

# Set TCP keepalive
tcp-keepalive 300
```

### Rate Limiting

**PostgreSQL:**

```sql
-- Limit connections per user
ALTER USER app_user CONNECTION LIMIT 100;
ALTER USER readonly_user CONNECTION LIMIT 50;
```

**Redis:**

```bash
# Set max clients
maxclients 10000

# Monitor client connections
redis-cli CLIENT LIST
```

## Audit Logging

### PostgreSQL Audit Logging (pgAudit)

**Enable pgAudit:**

```sql
-- Load pgAudit extension
CREATE EXTENSION IF NOT EXISTS pgaudit;

-- Configure audit logging
ALTER SYSTEM SET pgaudit.log = 'all';
ALTER SYSTEM SET pgaudit.log_level = 'log';
ALTER SYSTEM SET pgaudit.log_client = on;
ALTER SYSTEM SET pgaudit.log_parameter = on;
```

**Audit Specific Tables:**

```sql
-- Audit access to sensitive tables
ALTER TABLE leads SET (log_autovacuum_min_duration = 0);
ALTER TABLE agents SET (log_autovacuum_min_duration = 0);
```

**View Audit Logs:**

```sql
-- View recent audit entries
SELECT * FROM pgaudit_log
ORDER BY event_time DESC
LIMIT 100;
```

### Redis Access Logging

**Enable logging:**

```conf
# Enable command logging
loglevel notice

# Enable slow log
slowlog-log-slower-than 10000
slowlog-max-len 128

# Log commands
loglevel verbose
```

### Neo4j Audit Logging

**Enable query logging:**

```conf
dbms.logs.query.enabled=true
dbms.logs.query.threshold=0s
dbms.logs.query.parameter_logging_enabled=true
```

### Qdrant Access Logging

**Enable request logging:**

```yaml
# Kubernetes configuration
log_level: INFO
```

## Compliance

### HIPAA Compliance

**Data Classification:**

- **PHI (Protected Health Information)**: Date of birth, medical conditions, insurance policy details
- **PII (Personally Identifiable Information)**: Name, email, phone, address, SSN
- **Regular**: Non-sensitive data

**HIPAA Requirements:**

| Requirement | Implementation |
|-------------|----------------|
| Access Control | RBAC, MFA, IP whitelisting |
| Audit Controls | Comprehensive audit logging (pgAudit) |
| Integrity | Data encryption, checksums |
| Transmission Security | TLS 1.3, encrypted connections |
| Encryption | AES-256 at rest and in transit |
| Minimum Necessary | Row-level security, data masking |

**Data Retention:**

```sql
-- Implement data retention policy
CREATE OR REPLACE FUNCTION delete_old_data()
RETURNS void AS $$
BEGIN
  -- Delete leads older than 7 years
  DELETE FROM leads
  WHERE createdAt < NOW() - INTERVAL '7 years';

  -- Archive to audit table
  INSERT INTO leads_archive
  SELECT * FROM leads
  WHERE createdAt < NOW() - INTERVAL '7 years';
END;
$$ LANGUAGE plpgsql;

-- Schedule with pg_cron
SELECT cron.schedule('delete_old_data', '0 2 * * *', 'SELECT delete_old_data()');
```

### PCI DSS Compliance

**Applicability:**

- PCI DSS applies if storing, processing, or transmitting credit card data
- For this platform, likely not applicable (insurance data, not payment data)

**If Applicable:**

| Requirement | Implementation |
|-------------|----------------|
| Encryption | Strong cryptography (AES-256) |
| Access Control | Unique IDs, MFA, least privilege |
| Audit Logging | Comprehensive audit trail |
| Network Security | Firewall rules, network segmentation |
| Vulnerability Management | Regular security scans, patching |

## Security Best Practices

### Password Management

**Strong Password Policy:**

```bash
# Minimum 16 characters
# Include uppercase, lowercase, numbers, symbols
# Rotate every 90 days
# No reuse of last 12 passwords
```

**Password Storage:**

```bash
# Use AWS Secrets Manager
aws secretsmanager create-secret \
  --name insurance-lead-gen/production/database \
  --secret-string file://db-credentials.json

# Or use HashiCorp Vault
vault kv put secret/insurance-lead-gen/database \
  username=app_user \
  password=strong_password_here
```

### Principle of Least Privilege

**Database Roles:**

- `app_role`: Only CRUD operations
- `readonly_role`: Only SELECT operations
- `migration_role`: Superuser (migrations only)
- `admin_role`: Superuser (admin only)

**Application Access:**

- Application uses `app_role` credentials
- No direct database access from users
- No administrative access from application code

### Regular Security Updates

**Database Patches:**

```bash
# PostgreSQL
# Enable automatic minor version upgrades
aws rds modify-db-instance \
  --db-instance-identifier insurance-lead-gen-postgres-primary \
  --auto-minor-version-upgrade \
  --apply-immediately

# Redis
# Enable automatic minor version upgrades
aws elasticache modify-replication-group \
  --replication-group-id insurance-lead-gen-redis \
  --auto-minor-version-upgrade \
  --apply-immediately
```

**Application Dependencies:**

```bash
# Update regularly
npm audit fix
pip install --upgrade <package>
```

## Security Audits

### Regular Audits

**Quarterly Security Audit:**

1. Review access logs
2. Validate user permissions
3. Test incident response procedures
4. Review encryption configuration
5. Update security policies

**Annual Penetration Testing:**

1. External penetration test
2. Internal penetration test
3. Social engineering test
4. Code review
5. Architecture review

### Security Scanning

**Database Vulnerability Scanning:**

```bash
# Use AWS Inspector
aws inspector start-assessment-run \
  --target-arn arn:aws:inspector:us-east-1:123456789012:target/0-nvgVHax4

# Use third-party tools
# Example: Nessus, Qualys, Rapid7
```

**Application Security Scanning:**

```bash
# OWASP ZAP
zap-baseline.py -t https://api.example.com

# Dependency scanning
npm audit
pip-audit
```

## Incident Response

### Security Incident Procedure

1. **Detection:**
   - Monitor alerts (CloudWatch, Prometheus)
   - Review audit logs
   - User reports

2. **Containment:**
   - Isolate affected systems
   - Revoke compromised credentials
   - Block suspicious IPs

3. **Investigation:**
   - Analyze logs
   - Identify root cause
   - Determine scope

4. **Remediation:**
   - Patch vulnerabilities
   - Restore from backup (if needed)
   - Update security policies

5. **Recovery:**
   - Restore normal operations
   - Verify functionality
   - Monitor for recurrence

6. **Post-Incident Review:**
   - Document incident
   - Identify lessons learned
   - Update procedures

## Next Steps

- [Set Up Monitoring](DATABASE_MONITORING.md)
- [Configure Backups](DATABASE_BACKUP_RECOVERY.md)
- [Schedule Maintenance Tasks](DATABASE_MAINTENANCE.md)
- [Complete Database Migration](DATABASE_MIGRATION.md)
