# On-Call Runbook

## 🎯 Overview

This runbook defines the on-call responsibilities, procedures, and escalation paths for maintaining 24/7 operations of the Insurance Lead Gen Platform. Our goal is to ensure rapid response to incidents while maintaining team wellness and operational excellence.

---

## 📋 Table of Contents

1. [On-Call Responsibilities](#on-call-responsibilities)
2. [On-Call Schedule](#on-call-schedule)
3. [Alert Response Guide](#alert-response-guide)
4. [Communication Procedures](#communication-procedures)
5. [Escalation Matrix](#escalation-matrix)
6. [Training Requirements](#training-requirements)
7. [Shift Handoff Procedures](#shift-handoff-procedures)
8. [Wellness and Fatigue Management](#wellness-and-fatigue-management)

---

## On-Call Responsibilities

### Primary Responsibilities

#### 1. Incident Detection and Response
- **Monitor Alerts**: Actively monitor PagerDuty alerts and Slack notifications
- **Respond Quickly**: Acknowledge alerts within designated response times
- **Assess Impact**: Determine severity and scope of incidents
- **Coordinate Response**: Lead incident response efforts or support incident commander
- **Document Actions**: Maintain accurate incident timeline and actions taken

#### 2. System Health Monitoring
- **Proactive Monitoring**: Regularly check system health dashboards
- **Trend Analysis**: Monitor metrics for performance degradation patterns
- **Preventive Actions**: Take action on concerning trends before they become incidents
- **Capacity Planning**: Report on resource utilization and capacity concerns

#### 3. Communication
- **Stakeholder Updates**: Provide regular updates during incidents
- **Status Page Management**: Update public status page during customer-facing issues
- **Team Coordination**: Coordinate with relevant team members and stakeholders
- **External Communication**: Support customer support and communications teams

#### 4. Documentation and Knowledge Sharing
- **Runbook Updates**: Keep runbooks current based on incident learnings
- **Knowledge Transfer**: Share learnings with team members
- **Process Improvement**: Identify and suggest operational improvements
- **Training Support**: Help train new team members on on-call procedures

### Daily Responsibilities

#### Morning Handoff Review (9:00 AM)
```bash
# Review overnight alerts and incidents
# Check system health status
# Review capacity and performance trends
# Check upcoming changes or maintenance
# Verify backup completion
# Test critical alerting mechanisms
```

#### Periodic Health Checks (Every 4 hours)
```bash
# Check key metrics dashboards
# Review error rates and response times
# Verify all critical services healthy
# Check resource utilization trends
# Monitor customer-facing performance
```

#### End-of-Shift Handoff (9:00 PM or shift end)
```bash
# Document any ongoing issues or concerns
# Update shift handoff document
# Notify next on-call of any pending items
# Clear any resolved alerts
# Prepare for smooth transition
```

### Core Competencies Required

#### Technical Skills
- **Kubernetes Operations**: Pod management, troubleshooting, scaling
- **Database Administration**: PostgreSQL troubleshooting, backup/restore
- **Monitoring and Alerting**: Grafana, Prometheus, alert interpretation
- **Network Troubleshooting**: DNS, load balancers, ingress controllers
- **Application Debugging**: Log analysis, performance troubleshooting

#### Operational Skills
- **Incident Management**: Structured incident response, communication
- **Decision Making**: Quick decision-making under pressure
- **Escalation**: Knowing when and how to escalate appropriately
- **Documentation**: Clear, accurate incident documentation
- **Customer Impact Assessment**: Understanding business impact of issues

---

## On-Call Schedule

### Current Schedule Structure

#### Primary On-Call Rotation
- **Duration**: 1 week primary, 1 week secondary
- **Coverage**: 24/7 continuous coverage
- **Rotation**: Weekly rotation on Mondays at 9:00 AM
- **Backup**: Secondary on-call available for consultation and support

#### Team Rotation
```
Week 1: Alice (Primary), Bob (Secondary)
Week 2: Bob (Primary), Charlie (Secondary)  
Week 3: Charlie (Primary), Alice (Secondary)
Week 4: Alice (Primary), Bob (Secondary)
... continues rotation
```

### Escalation Chain

#### Level 1: Primary On-Call
- **Response Time**: Immediate (within 5 minutes for SEV-1, 15 minutes for SEV-2)
- **Scope**: Initial incident response, assessment, and mitigation
- **Authority**: Can make immediate operational decisions

#### Level 2: Secondary On-Call
- **Response Time**: Within 15 minutes when called
- **Scope**: Backup support, technical expertise, escalation decisions
- **Authority**: Can override primary on-call decisions if needed

#### Level 3: Platform Lead
- **Response Time**: Within 30 minutes when called
- **Scope**: Technical leadership, resource allocation, vendor escalation
- **Authority**: Can allocate additional resources, make architectural decisions

#### Level 4: Engineering Manager
- **Response Time**: Within 1 hour when called
- **Scope**: Business impact assessment, communication with executives
- **Authority**: Can declare major incidents, approve external communications

#### Level 5: VP Engineering
- **Response Time**: Within 2 hours when called
- **Scope**: Executive communication, major business decisions
- **Authority**: Can declare company-wide incidents, approve major actions

### Schedule Management

#### Holiday and Vacation Coverage
```bash
# Long-term absence coverage (>1 week)
# - Arrange coverage with another team member
# - Update PagerDuty schedule
# - Brief coverage person on current issues
# - Ensure proper access and credentials

# Short-term absence coverage (1-7 days)
# - Secondary on-call automatically covers
# - Backup coverage arranged if needed
# - Update team calendar
```

#### Emergency Coverage
```bash
# If primary on-call unavailable
# 1. Secondary on-call takes primary role
# 2. Call platform lead for backup
# 3. Alert team in #incidents channel
# 4. Document the coverage change

# Command for emergency coverage:
# - Send immediate notification to team
# - Update PagerDuty to reflect actual coverage
# - Brief emergency backup on current state
```

---

## Alert Response Guide

### Alert Classification

#### SEV-1 (Critical) - Page Immediately
```bash
# Response Time: 5 minutes
# Escalation: Immediate if not acknowledged
# Examples:
# - Complete service outage
# - Data corruption or loss
# - Security breach
# - Payment processing failure
# - Database complete failure

# Immediate Actions:
# 1. Acknowledge alert in PagerDuty
# 2. Join incident channel
# 3. Begin assessment
# 4. Page secondary on-call if needed
# 5. Start incident timeline
```

#### SEV-2 (High) - Page within 15 minutes
```bash
# Response Time: 15 minutes
# Escalation: 30 minutes if no response
# Examples:
# - API service degradation
# - High error rate (>5%)
# - Database connection issues
# - External service failures
# - Performance degradation >50%

# Actions:
# 1. Acknowledge alert in PagerDuty
# 2. Assess impact and severity
# 3. Begin investigation
# 4. Update team if needed
# 5. Document findings
```

#### SEV-3 (Medium) - Investigate within 1 hour
```bash
# Response Time: 1 hour
# Escalation: 2 hours if no response
# Examples:
# - Feature unavailability
# - Performance degradation 10-50%
# - Background job failures
# - Cache issues
# - Minor database performance

# Actions:
# 1. Review alert details
# 2. Schedule investigation
# 3. Update team if business hours
# 4. Document investigation
# 5. Update alert if needed
```

#### SEV-4 (Low) - Review within 24 hours
```bash
# Response Time: 24 hours
# Examples:
# - Minor UI issues
# - Performance degradation <10%
# - Monitoring gaps
# - Documentation issues

# Actions:
# 1. Review alert
# 2. Schedule for next business day
# 3. Create ticket if needed
# 4. Update documentation
```

### Alert Response Procedure

#### 1. Initial Response (First 5 minutes)
```bash
# Acknowledge alert
# - Click "Acknowledge" in PagerDuty
# - Add note with initial assessment
# - Join incident channel (#incident-YYYYMMDD-HHMM)

# Quick assessment
# - Check system status dashboard
# - Review recent changes
# - Check if related alerts firing
# - Determine if immediate action needed

# Communication
# - Post initial status in incident channel
# - Notify stakeholders if SEV-1/2
# - Update status page if customer-facing
```

#### 2. Investigation Phase (5-30 minutes)
```bash
# Gather information
# - Review detailed alert information
# - Check relevant dashboards
# - Examine recent logs
# - Check recent deployments

# Use diagnostic tools
# - Run ./scripts/troubleshooting/diagnose.sh
# - Check specific service health
# - Review metrics and trends
# - Test critical functionality

# Document findings
# - Update incident timeline
# - Record all actions taken
# - Note any hypotheses or theories
# - Prepare status update
```

#### 3. Mitigation Phase (30+ minutes)
```bash
# Implement fixes
# - Follow runbook procedures
# - Apply known solutions
# - Test fixes before full deployment
# - Monitor for improvement

# Communicate progress
# - Regular updates in incident channel
# - Update status page if needed
# - Notify stakeholders
# - Prepare resolution communication
```

---

## Communication Procedures

### Internal Communication Channels

#### Primary Channels
- **#incidents**: Main incident coordination channel
- **#oncall**: On-call specific discussions
- **#engineering**: General engineering discussions
- **#incidents-alerts**: Automated alert notifications

#### Channel Guidelines
```
#incidents
- Only incident-related communications
- Structured updates every 10-15 minutes during active incidents
- Clear status updates: "Investigating", "Mitigating", "Monitoring", "Resolved"

#oncall
- On-call rotation discussions
- Schedule coordination
- Process improvement suggestions
- Knowledge sharing

#engineering
- Technical discussions
- Architecture decisions
- Code reviews
- Process improvements
```

### Status Update Templates

#### Initial Alert Acknowledgment
```
SEV-$SEVERITY Incident Acknowledged
===================================
Alert: $ALERT_NAME
Acknowledged: $(date)
On-call: $USER
Initial Assessment: $BRIEF_DESCRIPTION
Next Actions: $IMMEDIATE_NEXT_STEPS
ETA for Update: $ETA_TIME
```

#### Investigation Update
```
INVESTIGATION UPDATE - $(date)
==============================
Status: Investigating
Progress: $INVESTIGATION_PROGRESS
Findings: $KEY_FINDINGS
Next Steps: $NEXT_INVESTIGATION_STEPS
ETA: $NEW_ETA
```

#### Mitigation Update
```
MITIGATION UPDATE - $(date)
===========================
Status: Mitigating
Actions Taken: $ACTIONS_COMPLETED
Results: $MITIGATION_RESULTS
Monitoring: $MONITORING_PLAN
ETA: $NEW_ETA
```

#### Resolution
```
INCIDENT RESOLVED - $(date)
===========================
Status: Resolved
Duration: $TOTAL_DURATION
Root Cause: $ROOT_CAUSE_SUMMARY
Resolution: $RESOLUTION_ACTION
Prevention: $PREVENTION_MEASURES
Monitoring: $POST_INCIDENT_MONITORING
```

### External Communication

#### Customer-Facing Communication
```bash
# Status page updates
# - Use standard templates
# - Include impact assessment
# - Provide clear timelines
# - Regular updates during incidents

# Customer support notifications
# - Alert customer support team
# - Provide talking points
# - Escalate to communications team if needed
```

#### Stakeholder Communication
```bash
# Engineering leadership
# - Technical impact assessment
# - Resource requirements
# - Timeline estimates
# - Escalation decisions

# Business stakeholders
# - Customer impact
# - Revenue implications
# - Timeline and resolution plans
# - Communication strategy
```

---

## Escalation Matrix

### Technical Escalation

#### SEV-1 Escalation Path
```
0 minutes: Alert triggered
5 minutes: Primary on-call response required
15 minutes: Escalate to secondary on-call if no response
30 minutes: Escalate to platform lead
60 minutes: Escalate to engineering manager
120 minutes: Escalate to VP engineering
```

#### SEV-2 Escalation Path
```
0 minutes: Alert triggered
15 minutes: Primary on-call response required
60 minutes: Escalate to secondary on-call if no progress
120 minutes: Escalate to platform lead
240 minutes: Escalate to engineering manager
```

#### SEV-3 Escalation Path
```
0 minutes: Alert triggered
60 minutes: Primary on-call response required
240 minutes: Escalate to secondary on-call
480 minutes: Escalate to platform lead
```

### Business Escalation

#### Customer Impact Escalation
```bash
# Revenue Impact > $10,000/hour
# - Immediate escalation to VP engineering
# - Alert CEO and CTO
# - Activate crisis communication plan

# Customer Facing Issues > 100 users
# - Escalate to VP engineering within 30 minutes
# - Alert customer success team
# - Prepare customer communication

# Security or Compliance Issues
# - Immediate escalation to security team
# - Alert legal and compliance
# - Document for regulatory reporting
```

### Escalation Triggers

#### Automatic Escalation
```bash
# Time-based triggers
# - No acknowledgment within SLA
# - No progress within SLA
# - Incident duration exceeds SLA

# Severity-based triggers
# - SEV-1: Immediate escalation path
# - Multiple SEV-2: Escalate to manager
# - Business hours vs after-hours

# Impact-based triggers
# - Customer escalations received
# - Revenue impact threshold exceeded
# - Public social media mentions
```

#### Manual Escalation Decision Points
```bash
# Technical complexity
# - Issue requires specialized expertise
# - Multiple systems affected
# - Unknown root cause after 1 hour

# Resource requirements
# - Need additional personnel
# - Need external vendor support
# - Need management approval for actions

# Business risk
# - Potential data loss
# - Compliance implications
# - Competitive disadvantage
```

---

## Training Requirements

### On-Call Training Program

#### Week 1: System Overview
```
Day 1: Platform architecture walkthrough
- Service dependencies
- Data flow understanding
- Critical business processes
- Key technical contacts

Day 2: Monitoring and alerting
- Grafana dashboard tour
- Alert interpretation
- PagerDuty usage
- Status page management

Day 3: Common issues and solutions
- Review recent incidents
- Practice diagnostic procedures
- Learn runbook usage
- Hands-on troubleshooting
```

#### Week 2: Hands-On Practice
```
Day 1: Shadow experienced on-call
- Observe real incident response
- Practice communication procedures
- Learn escalation decisions
- Document observations

Day 2: Simulated incident response
- Run incident simulation exercises
- Practice decision-making
- Test knowledge retention
- Receive feedback

Day 3: System deep dive
- Database operations
- Kubernetes troubleshooting
- External service management
- Performance analysis
```

#### Week 3: Supervised On-Call
```
- Act as secondary on-call
- Respond to alerts under supervision
- Practice incident documentation
- Learn team-specific procedures

End of week assessment:
- Technical knowledge test
- Incident response simulation
- Communication skills evaluation
- Runbook knowledge verification
```

### Ongoing Training

#### Monthly Training Sessions
```
- New features and system changes
- Lessons learned from recent incidents
- Process improvements and updates
- External service updates
- Security awareness updates
```

#### Quarterly Assessments
```
- Technical skills evaluation
- Incident response simulation
- Communication effectiveness review
- Process improvement suggestions
- Career development planning
```

#### Annual Recertification
```
- Full system knowledge assessment
- Advanced troubleshooting scenarios
- Leadership and communication evaluation
- Process improvement contributions
- Training of new team members
```

### Training Resources

#### Documentation
- **Runbooks**: Comprehensive operational procedures
- **Architecture Diagrams**: System relationships and dependencies
- **API Documentation**: Service interfaces and contracts
- **Troubleshooting Guides**: Step-by-step problem resolution

#### Tools and Access
- **Monitoring Dashboards**: Grafana, Prometheus, Jaeger
- **Communication Tools**: Slack, PagerDuty, Status Page
- **Diagnostic Scripts**: Automated troubleshooting tools
- **Emergency Contacts**: Escalation and support contacts

---

## Shift Handoff Procedures

### Handoff Process

#### Pre-Handoff Preparation (30 minutes before shift end)
```bash
# Compile handoff document
# - Current system status
# - Active issues or concerns
# - Recent changes or deployments
# - Upcoming scheduled activities
# - Known issues or limitations
# - Resource utilization trends
# - External service status
```

#### Handoff Meeting (15 minutes)
```bash
# Review handoff document
# - Discuss any ongoing issues
# - Clarify any concerns
# - Review escalation procedures
# - Confirm access and credentials
# - Answer questions
# - Confirm handoff completion
```

#### Post-Handoff Verification (15 minutes after shift start)
```bash
# Verify system health
# - Check critical service status
# - Review recent alerts
# - Test monitoring systems
# - Confirm communication channels
# - Update handoff if needed
```

### Handoff Template

```markdown
# On-Call Handoff - $(date)

## System Status
- **Overall Health**: [Green/Yellow/Red]
- **Active Incidents**: [List with severity and status]
- **Recent Issues**: [Resolved issues from last shift]
- **Resource Utilization**: [CPU, memory, storage status]

## Active Issues
### Issue 1: [Brief Description]
- **Severity**: SEV-X
- **Status**: [Investigating/Mitigating/Monitoring]
- **Owner**: [Person responsible]
- **ETA**: [Estimated resolution time]
- **Details**: [Current status and next steps]

## Recent Changes
### [Date] - [Change Description]
- **Impact**: [Positive/Negative/Neutral]
- **Rollback Plan**: [If needed]
- **Monitoring**: [Specific metrics to watch]

## Upcoming Activities
- **Scheduled Maintenance**: [Date, time, impact]
- **Planned Deployments**: [Date, scope, risks]
- **External Dependencies**: [Service maintenance, etc.]

## Known Issues/Limitations
- **Infrastructure**: [Any known limitations]
- **Application**: [Known bugs or issues]
- **Monitoring**: [Alert gaps or issues]

## Contacts and Resources
- **Primary Contacts**: [Phone numbers, Slack IDs]
- **Escalation Chain**: [Current assignments]
- **External Contacts**: [Vendors, partners]
- **Important Links**: [Dashboards, documentation]

## Special Instructions
- **Business Hours Considerations**: [Peak times, etc.]
- **Customer Impact**: [Ongoing customer issues]
- **Security Considerations**: [Active security concerns]

## Questions/Concerns
- [Any questions about current state]
- [Concerns about upcoming activities]
- [Suggestions for improvements]
```

### Handoff Quality Checklist

#### Information Completeness
- [ ] All active issues documented
- [ ] System health status clear
- [ ] Recent changes explained
- [ ] Upcoming activities noted
- [ ] Contact information current
- [ ] Special instructions provided

#### Communication Quality
- [ ] Handoff document clear and concise
- [ ] Key points emphasized
- [ ] Open questions addressed
- [ ] Next steps clearly defined
- [ ] Escalation procedures confirmed
- [ ] Access and credentials verified

#### Follow-up Actions
- [ ] Questions documented and answered
- [ ] Action items assigned and tracked
- [ ] Process improvements identified
- [ ] Feedback collected and reviewed
- [ ] Handoff process continuously improved

---

## Wellness and Fatigue Management

### Fatigue Prevention Strategies

#### Shift Length Limits
```
Primary On-Call Shifts:
- Maximum 12 hours continuous work
- Minimum 8 hours between shifts
- Maximum 60 hours per week

Emergency Coverage:
- Maximum 16 hours continuous work
- Mandatory 12-hour break after emergency
- Maximum 80 hours per week (with approval)
```

#### Break Requirements
```
During Active Incidents:
- 15-minute break every 2 hours
- 30-minute break every 4 hours
- 1-hour break every 8 hours

During Normal Operations:
- Regular meal breaks
- Exercise and movement breaks
- Mental health breaks as needed
```

### Wellness Monitoring

#### Self-Assessment Checklist
```bash
# Physical Wellness
- Getting adequate sleep (7-9 hours)
- Regular meals and hydration
- Physical exercise and movement
- Eye breaks from screens

# Mental Wellness
- Stress level management
- Decision-making clarity
- Communication effectiveness
- Emotional regulation

# Professional Wellness
- Knowledge confidence
- Tool proficiency
- Process familiarity
- Team collaboration
```

#### Warning Signs of Fatigue
```
Performance Indicators:
- Slower response times
- Increased error rates
- Poor decision making
- Communication breakdowns

Physical Symptoms:
- Drowsiness or microsleeps
- Headaches or eye strain
- Digestive issues
- Weakened immune system

Mental Symptoms:
- Difficulty concentrating
- Memory problems
- Irritability or mood changes
- Anxiety or stress
```

### Fatigue Management Actions

#### Individual Actions
```bash
# When Feeling Fatigued:
1. Recognize and acknowledge fatigue
2. Take scheduled breaks
3. Request additional support
4. Use diagnostic tools and automation
5. Communicate limitations to team

# Recovery Strategies:
1. Adequate sleep and rest
2. Regular exercise and movement
3. Healthy nutrition and hydration
4. Stress management techniques
5. Professional support if needed
```

#### Team Actions
```bash
# Supporting Fatigued Team Members:
1. Recognize signs of fatigue
2. Offer additional support
3. Share workload when possible
4. Provide coverage when needed
5. Encourage proper rest and recovery

# Team Fatigue Management:
1. Monitor team workload distribution
2. Rotate demanding tasks
3. Encourage work-life balance
4. Provide mental health resources
5. Foster supportive team culture
```

### Emergency Procedures

#### Emergency Coverage Activation
```bash
# When Primary On-Call Cannot Continue:
1. Immediate notification to secondary on-call
2. Activate emergency coverage procedures
3. Brief emergency backup on current situation
4. Ensure proper handoff and communication
5. Document the coverage change

# Emergency Backup Responsibilities:
1. Assume full on-call responsibilities
2. Access all necessary systems and tools
3. Communicate with team and stakeholders
4. Follow established procedures
5. Document all actions taken
```

#### Mental Health Support
```bash
# Professional Support Resources:
- Employee Assistance Program (EAP)
- Mental health professionals
- Stress management counseling
- Work-life balance coaching
- Peer support programs

# Immediate Support:
- Crisis counseling hotlines
- Mental health emergency services
- Peer support network
- Manager support and understanding
- Flexible work arrangements
```

---

## Quick Reference

### Emergency Contacts
```
Primary On-Call: +1-555-ONCALL-1
Secondary On-Call: +1-555-ONCALL-2
Platform Lead: +1-555-PLATFORM-1
Engineering Manager: +1-555-ENG-MGR-1
VP Engineering: +1-555-VP-ENG-1
Security Team: +1-555-SECURITY-1
Database Admin: +1-555-DB-ADMIN-1
```

### Critical Tools and Access
```
PagerDuty: https://company.pagerduty.com
Slack: https://company.slack.com
Grafana: https://grafana.company.com
Prometheus: https://prometheus.company.com
Status Page: https://status.company.com
Kubernetes Dashboard: https://k8s.company.com
```

### Response Time SLAs
```
SEV-1: 5 minutes
SEV-2: 15 minutes  
SEV-3: 1 hour
SEV-4: 24 hours

Escalation Times:
SEV-1: 15 minutes (secondary)
SEV-1: 30 minutes (platform lead)
SEV-1: 60 minutes (eng manager)
SEV-2: 60 minutes (secondary)
```

### Essential Commands
```bash
# Quick system check
kubectl get pods -n production

# Quick health check
curl -f https://api.insurance-lead-gen.com/health

# Alert acknowledgment
# Use PagerDuty mobile app or web interface

# Emergency communication
# Post to #incidents channel
```

Remember: The goal is rapid, effective incident response while maintaining team wellness and operational excellence.
