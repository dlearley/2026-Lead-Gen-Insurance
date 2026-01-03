# Disaster Recovery & Business Continuity Testing

## 📋 Overview

This directory contains comprehensive disaster recovery (DR) and business continuity (BC) testing procedures for the Insurance Lead Gen AI Platform. The goal is to validate that the platform can recover from catastrophic failures with minimal data loss and service interruption.

## 🎯 Recovery Objectives

| Metric | Target | Description |
|--------|--------|-------------|
| RPO (Recovery Point Objective) | 15 minutes | Maximum data loss tolerance |
| RTO (Recovery Time Objective) | 1 hour | Maximum downtime tolerance |
| MTTR (Mean Time to Recovery) | 30 minutes | Expected recovery time |

## 📁 Directory Structure

```
disaster-recovery/
├── backups/                  # Backup storage and configurations
├── scripts/                  # Automated backup and recovery scripts
├── runbooks/                 # Step-by-step recovery procedures
├── tests/                   # Disaster recovery test scenarios
└── README.md                 # This file
```

## 🔧 Backup Strategy

### Database Backups

- **PostgreSQL**: Daily full backups + continuous WAL archiving
- **Neo4j**: Daily full backups + incremental backups
- **Redis**: RDB snapshots + AOF logging
- **Qdrant**: Daily snapshots + continuous backups
- **NATS**: Configuration backups

### File Storage Backups

- **Application logs**: Daily backups with 30-day retention
- **Configuration files**: Version-controlled + daily snapshots
- **Docker volumes**: Weekly volume snapshots

### Backup Retention

- **Daily backups**: 7 days
- **Weekly backups**: 4 weeks
- **Monthly backups**: 3 months
- **Yearly backups**: 2 years

## 🚀 Quick Start

### Run Full Backup

```bash
./disaster-recovery/scripts/full-backup.sh
```

### Test Recovery Procedures

```bash
./disaster-recovery/tests/run-dr-test.sh
```

### Validate RTO/RPO

```bash
./disaster-recovery/tests/validate-rto-rpo.sh
```

## 📊 Testing Schedule

| Test Type | Frequency | Description |
|-----------|-----------|-------------|
| Daily backup verification | Daily | Verify backup completion and integrity |
| Weekly restore testing | Weekly | Test restore from latest backup |
| Monthly full recovery simulation | Monthly | Full recovery in isolated environment |
| Quarterly disaster recovery drill | Quarterly | Team-based DR exercise |
| Annual comprehensive audit | Annual | Full DR/BC validation |

## 🔄 Recovery Procedures

### 1. Complete Infrastructure Failure

**Procedure**: `disaster-recovery/runbooks/infrastructure-failure.md`
- Restore from Docker volume backups
- Recreate containers from backup
- Validate service functionality

### 2. Database Corruption

**Procedure**: `disaster-recovery/runbooks/database-corruption.md`
- Point-in-time recovery using WAL archives
- Data consistency validation
- Application reconnection

### 3. Data Deletion/Accident

**Procedure**: `disaster-recovery/runbooks/data-deletion.md`
- Restore specific tables from backup
- Validate data integrity
- Minimize downtime impact

### 4. Application Deployment Issue

**Procedure**: `disaster-recovery/runbooks/deployment-issue.md`
- Rollback to previous version
- Validate application health
- Restore service quickly

## 🧪 DR Testing Framework

### Test Scenarios

1. **Single Database Failure**: PostgreSQL crash recovery
2. **Multi-Database Failure**: PostgreSQL + Neo4j simultaneous failure
3. **Cache Failure**: Redis recovery with session persistence
4. **Complete Infrastructure Failure**: Full stack recovery
5. **Data Corruption**: Point-in-time recovery testing
6. **Network Partition**: Cross-service communication failure

### Test Execution

```bash
# Run specific test scenario
./disaster-recovery/tests/test-postgres-recovery.sh

# Run all test scenarios
./disaster-recovery/tests/run-all-tests.sh

# Generate test report
./disaster-recovery/tests/generate-report.sh
```

## 📊 Metrics & Monitoring

### Backup Monitoring

- Backup job success/failure tracking
- Backup size monitoring
- Backup duration monitoring
- Backup storage capacity tracking
- Backup compliance verification

### Recovery Monitoring

- Recovery time measurement
- Data consistency validation
- Service availability post-recovery
- Performance impact assessment

## 🔐 Security Considerations

- All backups are encrypted at rest
- Backup encryption keys are stored securely
- Access controls are maintained during recovery
- Audit trails are preserved during recovery
- Security controls are validated post-recovery

## 📞 Emergency Contacts

| Role | Contact | Escalation |
|------|---------|-----------|
| Platform Lead | #platform-lead | CTO |
| SRE Lead | #sre-lead | VP Engineering |
| Database Admin | #db-team | SRE Lead |

## 📝 Post-Test Review

After any DR test, complete a review:

1. What was tested?
2. How long did recovery take?
3. Was data integrity maintained?
4. What could have been faster?
5. What improvements are needed?
6. Update documentation

## 📚 Documentation

- [Backup Procedures](backups/README.md)
- [Recovery Runbooks](runbooks/README.md)
- [Testing Procedures](tests/README.md)
- [RTO/RPO Validation](tests/validate-rto-rpo.md)
