# Infrastructure Failure Recovery Runbook

## 📋 Overview

This runbook provides step-by-step procedures for recovering from complete infrastructure failure scenarios.

## 🎯 Recovery Objectives

- **RTO**: 1 hour
- **RPO**: 15 minutes
- **Priority**: Critical

## 🚨 Failure Detection

### Symptoms
- All services are unavailable
- Docker containers fail to start
- Volume corruption detected
- Hardware failure on host system

### Initial Response
1. **Acknowledge incident** in incident management system
2. **Notify team** via established communication channels
3. **Declare disaster** if recovery will exceed 30 minutes

## 🔧 Recovery Procedure

### Step 1: Assess Damage
```bash
# Check Docker status
docker info
docker ps -a

# Check volume status
docker volume ls
docker volume inspect <volume_name>

# Check disk space
df -h

# Check system logs
tail -n 100 /var/log/syslog
journalctl -xe
```

### Step 2: Restore from Backup
```bash
# Navigate to disaster recovery directory
cd /home/engine/project/disaster-recovery

# Find latest backup
LATEST_BACKUP=$(find backups -name "backup-manifest-*.json" | sort | tail -n 1)
echo "Using backup: $LATEST_BACKUP"

# Review backup manifest
cat "$LATEST_BACKUP" | jq .
```

### Step 3: Execute Recovery Script
```bash
# Run full recovery
./scripts/full-recovery.sh

# Monitor recovery progress
tail -f recovery/recovery-*.log
```

### Step 4: Validate Recovery
```bash
# Check service status
docker-compose ps

# Test critical services
curl http://localhost:3000/health
curl http://localhost:3001/health

# Check database connectivity
docker exec insurance-lead-gen-postgres psql -U postgres -c "SELECT 1;"
docker exec insurance-lead-gen-neo4j cypher-shell "RETURN 1;"

# Check cache connectivity
docker exec insurance-lead-gen-redis redis-cli ping
```

### Step 5: Restore Monitoring
```bash
# Start monitoring services
docker-compose -f docker-compose.monitoring.yml up -d

# Verify monitoring
docker-compose -f docker-compose.monitoring.yml ps

# Check Prometheus targets
curl http://localhost:9090/targets
```

### Step 6: Post-Recovery Validation
```bash
# Run data integrity checks
./tests/validate-rto-rpo.sh

# Test application functionality
./scripts/test-application.sh

# Generate recovery report
./scripts/generate-recovery-report.sh
```

## 📊 Recovery Metrics

### Expected Timings
- **Backup identification**: 2 minutes
- **Volume restoration**: 15 minutes
- **Service startup**: 10 minutes
- **Data validation**: 5 minutes
- **Total**: ~32 minutes

### Success Criteria
- ✅ All services operational
- ✅ Data integrity verified
- ✅ Monitoring restored
- ✅ RTO target achieved (<1 hour)
- ✅ RPO target achieved (<15 minutes)

## 🔄 Failback Procedure

### When Primary Infrastructure is Restored
```bash
# 1. Stop services on recovery environment
cd /home/engine/project
docker-compose down

# 2. Create final backup from recovery environment
cd /home/engine/project/disaster-recovery
./scripts/full-backup.sh

# 3. Restore to primary environment
# (Follow same recovery procedure on primary)

# 4. Validate primary environment
./tests/validate-rto-rpo.sh

# 5. Switch traffic to primary
# Update DNS/load balancer configurations

# 6. Document failback
./scripts/generate-failback-report.sh
```

## 📝 Documentation Requirements

### Post-Recovery Report
- Incident timeline
- Recovery steps executed
- Time taken for each step
- Data loss assessment
- Lessons learned
- Improvement recommendations

### Incident Timeline Example
```
2024-01-15 10:00:00 - Infrastructure failure detected
2024-01-15 10:05:00 - Disaster declared
2024-01-15 10:10:00 - Recovery initiated
2024-01-15 10:45:00 - Services restored
2024-01-15 10:50:00 - Validation completed
2024-01-15 10:55:00 - Incident resolved
```

## 🔐 Security Considerations

- Verify all security controls are restored
- Rotate credentials if necessary
- Check audit logs for unauthorized access
- Validate encryption is working
- Test authentication/authorization

## 📞 Communication Plan

### Internal Communication
- **Immediate**: Team notification via Slack/PagerDuty
- **Ongoing**: 30-minute updates during recovery
- **Resolution**: Final report with timeline and impact

### Customer Communication
- **Initial**: Service disruption notification
- **Updates**: Progress updates every 30 minutes
- **Resolution**: Service restored notification
- **Post-incident**: Root cause analysis summary

## 📚 Related Documentation

- [Backup Procedures](../backups/README.md)
- [Full Recovery Script](../scripts/full-recovery.sh)
- [RTO/RPO Validation](../tests/validate-rto-rpo.sh)
- [Disaster Recovery Testing](../tests/README.md)

## 🔄 Testing Schedule

- **Monthly**: Table-top exercise
- **Quarterly**: Full recovery simulation
- **Annually**: Comprehensive DR drill

## 📝 Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2024-01-15 | Initial version |
| 1.1 | 2024-01-20 | Added failback procedure |
| 1.2 | 2024-01-25 | Updated security considerations |

## 🎯 Success Criteria

✅ Infrastructure restored within RTO target
✅ Data loss within RPO target  
✅ All services operational
✅ Data integrity verified
✅ Monitoring restored
✅ Security controls validated
✅ Documentation completed