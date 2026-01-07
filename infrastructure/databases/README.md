# Database Infrastructure

Production-grade database infrastructure for Insurance Lead Generation AI Platform, supporting PostgreSQL, Redis, Neo4j, and Qdrant.

## Overview

This infrastructure provides:

- **High Availability**: Multi-AZ deployment with automatic failover
- **Data Protection**: Automated backups, encryption, and point-in-time recovery
- **Scalability**: Horizontal scaling, read replicas, and connection pooling
- **Security**: RBAC, encryption at rest and in transit, audit logging
- **Observability**: Comprehensive monitoring, alerting, and metrics

## Architecture

```
┌───────────────────────────────────────────────────────────────┐
│                    Application Layer                        │
│              (EKS / Docker Compose)                        │
└─────────────────────────┬─────────────────────────────────────┘
                          │
        ┌─────────────────┼─────────────────┐
        │                 │                 │
        ▼                 ▼                 ▼
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│ PostgreSQL   │  │   Redis      │  │   Neo4j     │
│  (Primary)   │  │  (Cluster)   │  │  (Cluster)   │
└──────┬───────┘  └──────┬───────┘  └──────┬───────┘
       │                 │                 │
       ├─► Replica       ├─► Replica       ├─► Replica
       ├─► DR Replica   └─► Sentinel      └─► LB
       │
└───────┬─────────────────────────────────────┐
        │                                     │
        ▼                                     ▼
┌──────────────┐                      ┌──────────────┐
│   Backups    │                      │  Monitoring  │
│     (S3)     │                      │ (Prometheus) │
└──────────────┘                      └──────────────┘
```

## Components

### PostgreSQL
- **Engine**: PostgreSQL 16.1
- **Instance**: db.r6i.xlarge (32GB RAM, 4 vCPU)
- **Storage**: 500GB io1 (20,000 IOPS)
- **HA**: Multi-AZ with automatic failover
- **Replicas**: Local (same region), DR (cross-region)
- **Backup**: Daily snapshots + continuous WAL archiving
- **Connection Pooling**: PgBouncer (session pooling)
- **Retrieval**: < 30 seconds (full restore), < 5 minutes (PITR)

### Redis
- **Engine**: Redis 7.1
- **Topology**: 6-node cluster (3 shards + replicas)
- **Instance**: cache.r6g.xlarge (16GB RAM, 4 vCPU)
- **HA**: Multi-AZ with automatic failover
- **Failover**: Sentinel for automatic promotion
- **Persistence**: RDB + AOF
- **Backup**: Daily snapshots with Lambda automation
- **Encryption**: TLS in transit, AES-256 at rest

### Neo4j
- **Engine**: Neo4j 5.15 Enterprise
- **Topology**: 5-node cluster (3 core + 2 read replicas)
- **Instance**: r6i.2xlarge (64GB RAM, 8 vCPU)
- **HA**: Causal clustering with quorum
- **Failover**: Automatic leader election
- **Backup**: Online backup (no downtime)
- **Encryption**: TLS for all connections
- **Memory**: 16GB heap, 24GB page cache per node

### Qdrant
- **Engine**: Qdrant 1.7.3
- **Topology**: 3-node StatefulSet
- **Storage**: 200GB gp3 per node
- **HA**: Replication factor 2
- **Persistence**: WAL + snapshots
- **Backup**: Automated snapshots (6-hour intervals)
- **Vector Index**: HNSW with cosine similarity
- **Memory**: 16GB per node

## Quick Start

### Local Development (Docker Compose)

```bash
# Start all databases
docker-compose up -d postgres redis neo4j qdrant

# View logs
docker-compose logs -f

# Stop all databases
docker-compose down
```

### Production Deployment (Terraform)

```bash
# Configure variables
cd deploy/terraform/aws/environments
cp production.tfvars.example production.tfvars
vim production.tfvars

# Initialize Terraform
cd ..
terraform init

# Review plan
terraform plan -var-file=environments/production.tfvars

# Deploy
terraform apply -var-file=environments/production.tfvars
```

### Production Deployment (Kubernetes Operators)

```bash
# Install PostgreSQL operator
kubectl apply -f k8s/operators/postgres-operator.yaml

# Install Redis operator
kubectl apply -f k8s/operators/redis-operator.yaml

# Deploy Qdrant
kubectl apply -f k8s/base/qdrant/

# Verify
kubectl get pods -A
```

## Database Scripts

All scripts are located in `scripts/db/`:

- **backup.sh**: Automated backups for all databases
- **restore.sh**: Restore with PITR support
- **migrate.sh**: Schema migrations (Prisma, Alembic)
- **initialize.sh**: User/role initialization

See [scripts/db/README.md](../../scripts/db/README.md) for detailed usage.

## Documentation

Comprehensive documentation is available in `docs/`:

- [DATABASE_SETUP.md](../../docs/DATABASE_SETUP.md): Setup and configuration
- [DATABASE_BACKUP_RECOVERY.md](../../docs/DATABASE_BACKUP_RECOVERY.md): Backup and recovery procedures
- [DATABASE_MONITORING.md](../../docs/DATABASE_MONITORING.md): Monitoring and alerting
- [DATABASE_MAINTENANCE.md](../../docs/DATABASE_MAINTENANCE.md): Maintenance tasks
- [DATABASE_MIGRATION.md](../../docs/DATABASE_MIGRATION.md): Migration strategies
- [DATABASE_SECURITY.md](../../docs/DATABASE_SECURITY.md): Security and compliance

## Monitoring

### Prometheus Alert Rules

- **PostgreSQL**: `monitoring/prometheus/postgres-rules.yaml`
- **Redis**: `monitoring/prometheus/redis-rules.yaml`
- **All Services**: `monitoring/prometheus/alerts.yml`

### Key Metrics

| Database | Metrics | Alert Thresholds |
|----------|---------|------------------|
| PostgreSQL | Replication lag, connections, cache hit ratio | >100MB lag, >400 connections, <99% cache |
| Redis | Memory usage, evictions, hit rate | >90% memory, >0 evictions, <95% hit rate |
| Neo4j | Cluster health, transaction rate, memory | Not leader, >500ms transactions, >80% memory |
| Qdrant | Query latency, replication status | >500ms latency, replication failure |

### Grafana Dashboards

Create dashboards in Grafana using:
- PostgreSQL: Database → PostgreSQL metrics
- Redis: Database → Redis metrics
- Neo4j: Custom → Neo4j metrics
- Qdrant: Custom → Qdrant metrics

## Backup & Recovery

### Automated Backups

```bash
# Run automated backup
./scripts/db/backup.sh

# Schedule with cron (daily at 2 AM UTC)
crontab -e
0 2 * * * /path/to/scripts/db/backup.sh >> /path/to/logs/backup.log 2>&1
```

### Restore Procedures

```bash
# Restore from backup (interactive)
./scripts/db/restore.sh

# Restore specific database
./scripts/db/restore.sh postgres

# Point-in-time recovery
./scripts/db/restore.sh postgres-pitr
```

### Backup Locations

- **PostgreSQL**: S3 `insurance-lead-gen-postgres-backups/`
- **Redis**: S3 `insurance-lead-gen-redis-backups/`
- **Neo4j**: S3 `insurance-lead-gen-neo4j-backups/`
- **Qdrant**: S3 `insurance-lead-gen-qdrant-backups/`

## Security

### Authentication

- **PostgreSQL**: RBAC with app_role, readonly_role, migration_role
- **Redis**: ACLs with app_user, readonly_user
- **Neo4j**: Roles (reader, editor, admin)
- **Qdrant**: API keys (default, readonly, admin)

### Encryption

- **At Rest**: AES-256 (all databases)
- **In Transit**: TLS 1.3 (all connections)
- **Backups**: Encrypted with AWS KMS

### Access Control

- **Network**: Private subnets only, security groups
- **Application**: Least privilege principle
- **Admin**: Bastion hosts or VPN access

## Performance Tuning

### PostgreSQL (db.r6i.xlarge - 32GB RAM)
```sql
shared_buffers: 8GB (25%)
effective_cache_size: 24GB (75%)
work_mem: 64MB
maintenance_work_mem: 2GB
max_connections: 500
```

### Redis (cache.r6g.xlarge - 16GB RAM)
```conf
maxmemory-policy: allkeys-lru
save: "900 1 300 10 60 10000"
appendonly: yes
appendfsync: everysec
```

### Neo4j (r6i.2xlarge - 64GB RAM)
```conf
dbms.memory.heap.initial_size: 16G
dbms.memory.heap.max_size: 16G
dbms.memory.pagecache.size: 24G
```

### Qdrant (16GB per node)
```yaml
cache_vector_ram_threshold_gb: 16
optimizers_ram_threshold_gb: 8
```

## Capacity Planning

### Current Sizing

| Database | Storage | RAM | IOPS | Connections |
|----------|---------|-----|------|-------------|
| PostgreSQL | 500GB | 32GB | 20K | 500 |
| Redis | 32GB* | 16GB | N/A | 1K |
| Neo4j | 500GB | 64GB | 10K | N/A |
| Qdrant | 200GB | 16GB | 3K | N/A |

*Redis memory is not persistent storage

### Scaling Triggers

- **Storage**: Scale at 70% utilization
- **IOPS**: Scale at 80% utilization
- **Connections**: Add replica at 80% utilization
- **CPU**: Scale up at 75% sustained utilization

## Maintenance

### Daily Tasks
- Backup verification
- Health checks
- Resource monitoring

### Weekly Tasks
- Slow query analysis
- Memory optimization
- Index analysis

### Monthly Tasks
- Index maintenance
- Statistics update
- Performance review

### Quarterly Tasks
- Full backup test
- DR drill
- Security audit
- Capacity planning review

## Troubleshooting

### Common Issues

**Connection Refused:**
```bash
# Check database status
docker-compose ps postgres
kubectl get pods -n postgresql-operator

# Check logs
docker-compose logs postgres
kubectl logs -n postgresql-operator -f postgres-cluster-0
```

**High CPU/Memory:**
```bash
# Check resource usage
kubectl top pod -n postgresql-operator

# Identify long-running queries
psql -c "SELECT pid, state, query FROM pg_stat_activity WHERE state != 'idle';"
```

**Replication Lag:**
```bash
# Check replication status
psql -c "SELECT now(), pg_last_xact_replay_timestamp();"
redis-cli INFO replication
```

### Support Resources

- [PostgreSQL Documentation](https://www.postgresql.org/docs/16/)
- [Redis Documentation](https://redis.io/documentation/)
- [Neo4j Documentation](https://neo4j.com/docs/)
- [Qdrant Documentation](https://qdrant.tech/documentation/)
- [AWS RDS](https://docs.aws.amazon.com/rds/)
- [AWS ElastiCache](https://docs.aws.amazon.com/elasticache/)

## Testing

### Pre-Production Checklist

- [ ] All Terraform configurations tested in staging
- [ ] Backup and restore procedures tested end-to-end
- [ ] Failover procedures tested
- [ ] Monitoring and alerting verified
- [ ] Security audits completed
- [ ] Performance benchmarks measured
- [ ] Capacity planning reviewed
- [ ] Runbooks created
- [ ] Team trained on procedures
- [ ] Rollback procedures tested

## Cost Optimization

### Current Monthly Costs (US-East-1)

| Database | Component | Monthly Cost |
|----------|-----------|--------------|
| PostgreSQL | db.r6i.xlarge × 2 | $800 |
| Redis | cache.r6g.xlarge × 6 | $600 |
| Neo4j | r6i.2xlarge × 5 | $1,200 |
| Qdrant | r6i.xlarge × 3 | $600 |
| Storage | 1.5TB EBS | $180 |
| Backups | S3 + Glacier | $100 |
| Monitoring | Prometheus + Grafana | $50 |
| **Total** | | **$3,530/month** |

### Optimization Opportunities

1. Use Reserved Instances (30-50% savings)
2. Use Graviton instances (20-40% cost savings)
3. Optimize storage (use GP3 instead of io1)
4. Implement read/write splitting
5. Use connection pooling more efficiently

## Contributing

When making changes to database infrastructure:

1. Test changes in staging environment
2. Document all changes
3. Update Terraform state
4. Verify backup/restore procedures
5. Update monitoring and alerting
6. Review security implications

## License

Proprietary - Insurance Lead Generation Platform

## Support

For database infrastructure issues:
- Check logs: `tail -f logs/*.log`
- Review documentation: See docs/ directory
- Create issue: GitHub issues
- Contact: database-team@company.com

## Version History

- **v1.0** (2024-01-15): Initial Phase 7.4 implementation
  - PostgreSQL, Redis, Neo4j, Qdrant production setup
  - High availability, backup, monitoring, security
  - Comprehensive documentation
  - Automation scripts
