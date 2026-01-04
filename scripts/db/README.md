# Database Scripts

This directory contains scripts for database management including backups, restores, migrations, and maintenance.

## Available Scripts

### backup.sh
Automated backup script for all databases (PostgreSQL, Redis, Neo4j, Qdrant).

**Usage:**
```bash
# Run all backups
./backup.sh

# Run backups with custom config
DB_CONFIG=/path/to/config.sh ./backup.sh
```

**Features:**
- Supports PostgreSQL, Redis, Neo4j, Qdrant
- Compresses backups with gzip
- Uploads to S3 (if AWS CLI configured)
- Sends Slack notifications (if configured)
- Logs all operations
- Automatic cleanup of old backups

**Configuration:**
Copy `backup-config.sh.example` to `backup-config.sh` and configure:
```bash
cp backup-config.sh.example backup-config.sh
vim backup-config.sh
```

### restore.sh
Database restore script with support for full restore and point-in-time recovery.

**Usage:**
```bash
# Interactive menu
./restore.sh

# Restore specific database
./restore.sh postgres
./restore.sh redis
./restore.sh neo4j
./restore.sh qdrant
```

**Features:**
- Full database restore
- Point-in-time recovery (PostgreSQL)
- Data integrity verification
- Downloads from S3 if needed
- Interactive prompts for safety

### migrate.sh
Database migration script for Prisma and Alembic migrations.

**Usage:**
```bash
# Run migrations for staging
./migrate.sh staging

# Run migrations for production
./migrate.sh production

# Skip backup
./migrate.sh production --skip-backup

# Skip health check
./migrate.sh production --skip-health-check

# Rollback to backup
./migrate.sh production --rollback

# Validate schema only
./migrate.sh staging --validate

# Health check only
./migrate.sh production --health-check
```

**Features:**
- Runs Prisma and Alembic migrations
- Automatic database backup before migration
- Data integrity verification
- Rollback support
- Schema validation
- Health checks

### initialize.sh
Database initialization script for creating users, roles, and setting up permissions.

**Usage:**
```bash
# Initialize for staging
./initialize.sh staging

# Initialize for production
./initialize.sh production
```

**Features:**
- Creates PostgreSQL roles (app_role, readonly_role, migration_role)
- Creates PostgreSQL users with least privileges
- Sets up Redis ACLs
- Creates Neo4j users
- Configures connection limits
- Sets up read permissions

## Configuration

### backup-config.sh.example
Template configuration file for database credentials.

Copy and configure:
```bash
cp backup-config.sh.example backup-config.sh
vim backup-config.sh
```

Required variables:
- `S3_BUCKET`: S3 bucket for backups
- `AWS_REGION`: AWS region
- `SLACK_WEBHOOK_URL`: (optional) Slack webhook for notifications

Database-specific variables:
- `PGHOST`, `PGPORT`, `PGDATABASE`, `PGUSER`, `PGPASSWORD`
- `REDIS_HOST`, `REDIS_PORT`, `REDIS_PASSWORD`
- `NEO4J_HOST`, `NEO4J_BOLT_PORT`, `NEO4J_USERNAME`, `NEO4J_PASSWORD`
- `QDRANT_HOST`, `QDRANT_PORT`, `QDRANT_API_KEY`

## Environment Variables

### PostgreSQL
```bash
export PGHOST=postgres-primary.insurance-lead-gen.internal
export PGPORT=5432
export PGDATABASE=insurance_lead_gen
export PGUSER=postgres
export PGPASSWORD=your_password
```

### Redis
```bash
export REDIS_HOST=redis-cluster.insurance-lead-gen.internal
export REDIS_PORT=6379
export REDIS_PASSWORD=your_password
```

### Neo4j
```bash
export NEO4J_HOST=neo4j.insurance-lead-gen.internal
export NEO4J_BOLT_PORT=7687
export NEO4J_USERNAME=neo4j
export NEO4J_PASSWORD=your_password
```

### Qdrant
```bash
export QDRANT_HOST=qdrant.qdrant.svc.cluster.local
export QDRANT_PORT=6333
export QDRANT_API_KEY=your_api_key
```

## Usage Examples

### Daily Backup Routine
```bash
# Set up cron job
crontab -e

# Add daily backup at 2 AM UTC
0 2 * * * /path/to/scripts/db/backup.sh >> /path/to/logs/backup.log 2>&1
```

### Migration Before Deployment
```bash
# Backup current state
./backup.sh

# Run migrations
./migrate.sh production

# Validate data integrity
psql -h $PGHOST -U $PGUSER -d $PGDATABASE -c "SELECT COUNT(*) FROM leads;"
```

### Restore from Backup
```bash
# List available backups
aws s3 ls s3://insurance-lead-gen-postgres-backups/

# Restore specific backup
./restore.sh postgres postgres-backup-20240115.dump.gz

# Verify restore
psql -h $PGHOST -U $PGUSER -d $PGDATABASE -c "SELECT COUNT(*) FROM leads;"
```

### Point-in-Time Recovery
```bash
# Restore to specific timestamp
./restore.sh postgres-pitr

# Enter target timestamp when prompted: 2024-01-15 14:30:00

# Verify data at that point in time
psql -h $PGHOST -U $PGUSER -d $PGDATABASE -c "SELECT * FROM leads WHERE createdAt < '2024-01-15 14:30:00' LIMIT 10;"
```

## Troubleshooting

### Permission Denied
```bash
# Make scripts executable
chmod +x scripts/db/*.sh
```

### Missing Dependencies
```bash
# Install PostgreSQL client
sudo apt-get install postgresql-client

# Install Redis CLI
sudo apt-get install redis-tools

# Install AWS CLI
pip install awscli

# Install jq for JSON parsing
sudo apt-get install jq
```

### Connection Issues
```bash
# Test PostgreSQL connection
psql -h $PGHOST -p $PGPORT -U $PGUSER -d $PGDATABASE

# Test Redis connection
redis-cli -h $REDIS_HOST -p $REDIS_PORT PING

# Test Neo4j connection
cypher-shell -a bolt://$NEO4J_HOST:$NEO4J_BOLT_PORT

# Test Qdrant connection
curl http://$QDRANT_HOST:$QDRANT_PORT/health
```

### Backup/Restore Issues

**Backup fails:**
```bash
# Check disk space
df -h

# Check S3 credentials
aws s3 ls

# Check logs
tail -f logs/backup-*.log
```

**Restore fails:**
```bash
# Verify backup file exists
ls -lh backups/

# Verify backup integrity
pg_restore --list backups/backup.dump

# Check logs
tail -f logs/restore-*.log
```

## Logging

All scripts log to `logs/` directory with timestamped filenames:

- `backup-YYYYMMDD-HHMMSS.log`
- `restore-YYYYMMDD-HHMMSS.log`
- `migrate-YYYYMMDD-HHMMSS.log`
- `initialize-YYYYMMDD-HHMMSS.log`

View latest logs:
```bash
tail -f logs/backup-$(ls -t logs/ | head -1)
```

## Security Best Practices

1. **Never commit credentials to git**
   - Use environment variables
   - Use AWS Secrets Manager
   - Use `.env` files (gitignored)

2. **Encrypt backups**
   - All scripts upload with encryption
   - S3 server-side encryption enabled
   - Consider client-side encryption for sensitive data

3. **Limit script permissions**
   ```bash
   # Owner only can read/write scripts
   chmod 700 scripts/db/*.sh

   # Owner only can read config
   chmod 600 scripts/db/backup-config.sh
   ```

4. **Use IAM roles instead of access keys**
   - Configure EC2 instance profile
   - Configure Kubernetes service account
   - Use AWS Security Token Service (STS)

5. **Audit script usage**
   - All operations logged
   - S3 access logged
   - Consider adding audit trail to centralized logging

## Related Documentation

- [Database Setup Guide](../../docs/DATABASE_SETUP.md)
- [Backup and Recovery Guide](../../docs/DATABASE_BACKUP_RECOVERY.md)
- [Migration Guide](../../docs/DATABASE_MIGRATION.md)
- [Monitoring Guide](../../docs/DATABASE_MONITORING.md)
- [Maintenance Guide](../../docs/DATABASE_MAINTENANCE.md)
- [Security Guide](../../docs/DATABASE_SECURITY.md)

## Support

For issues or questions:

1. Check logs in `logs/` directory
2. Review related documentation
3. Check database status
4. Verify environment variables
5. Contact database team or create issue
