# Post-Incident Review Template

## 🎯 Overview

This template provides a structured approach to conducting thorough post-incident reviews (post-mortems) to drive continuous improvement and prevent recurrence of similar incidents.

---

## 📋 Table of Contents

1. [Incident Overview](#incident-overview)
2. [Timeline of Events](#timeline-of-events)
3. [Root Cause Analysis](#root-cause-analysis)
4. [Contributing Factors](#contributing-factors)
5. [Impact Assessment](#impact-assessment)
6. [Action Items](#action-items)
7. [Lessons Learned](#lessons-learned)
8. [Blameless Culture](#blameless-culture)

---

## Incident Overview

### Basic Information
```markdown
**Incident ID**: [Unique identifier]
**Incident Title**: [Brief descriptive title]
**Date**: [YYYY-MM-DD]
**Start Time**: [HH:MM UTC]
**Resolution Time**: [HH:MM UTC]
**Total Duration**: [X hours Y minutes]
**Severity**: [SEV-1/SEV-2/SEV-3/SEV-4]

**Incident Commander**: [Name]
**Technical Lead**: [Name]
**Communications Lead**: [Name]

**Affected Services**:
- [ ] API Service
- [ ] Frontend Application
- [ ] Backend Services
- [ ] Database
- [ ] Cache (Redis)
- [ ] External Integrations

**Customer Impact**:
- [ ] No customer impact
- [ ] Minor inconvenience
- [ ] Significant service disruption
- [ ] Data loss or corruption
- [ ] Revenue impact
- [ ] Reputation damage
```

### Incident Summary
```markdown
**What Happened?**
[Clear, concise description of what occurred]

**Why Did It Happen?**
[High-level explanation of the root cause]

**How Was It Resolved?**
[Summary of actions taken to resolve the incident]

**What Was the Impact?**
[Quantified business and technical impact]
```

---

## Timeline of Events

### Detailed Timeline
```markdown
| Time (UTC) | Event | Source | Impact | Action Taken |
|------------|-------|--------|--------|--------------|
| 14:23 | Alert triggered: High error rate | Monitoring | Detected issue | Initial investigation started |
| 14:25 | Incident declared SEV-2 | On-call engineer | Formal response | IC assigned, team notified |
| 14:30 | Root cause identified | Technical team | Clear direction | Mitigation plan developed |
| 14:45 | Mitigation implemented | Engineering team | Partial recovery | System partially restored |
| 15:10 | Full resolution achieved | Operations team | Complete recovery | All systems operational |
| 15:20 | Incident closed | Incident commander | Resolution confirmed | Monitoring continues |
```

### Key Decision Points
```markdown
**Decision Point 1**: [Time] - [Decision made and rationale]
**Decision Point 2**: [Time] - [Decision made and rationale]
**Decision Point 3**: [Time] - [Decision made and rationale]
```

### Communication Timeline
```markdown
| Time | Communication | Recipients | Content |
|------|---------------|------------|---------|
| 14:26 | Initial notification | Response team | Incident declared, roles assigned |
| 14:35 | Status update | Engineering team | Progress update, next steps |
| 14:50 | Customer notification | Support team | Service degradation notice |
| 15:15 | Resolution notification | All stakeholders | Service restored |
```

---

## Root Cause Analysis

### Primary Root Cause
```markdown
**Root Cause**: [Primary technical or process failure that led to the incident]

**Technical Details**:
- [Detailed technical explanation]
- [System components involved]
- [Configuration issues]
- [Code defects]
- [Infrastructure problems]

**Contributing Factors**:
- Factor 1: [Description]
- Factor 2: [Description]
- Factor 3: [Description]
```

### Five Whys Analysis
```markdown
**Why 1**: Why did the service become unavailable?
→ [Initial answer]

**Why 2**: Why did that happen?
→ [Deeper answer]

**Why 3**: Why did that occur?
→ [Further investigation]

**Why 4**: Why was that the case?
→ [Root cause]

**Why 5**: Why was the root cause present?
→ [Systemic issue identified]
```

### Fishbone Diagram Analysis
```markdown
**Categories of Causes**:

**People**:
- Inadequate training
- Miscommunication
- Fatigue/human error
- Insufficient experience

**Process**:
- Missing procedures
- Inadequate documentation
- Poor change management
- Insufficient testing

**Technology**:
- Software bugs
- Configuration errors
- Infrastructure failures
- Integration issues

**Environment**:
- Network problems
- Hardware failures
- External dependencies
- Security incidents
```

---

## Contributing Factors

### Immediate Contributing Factors
```markdown
**Technical Factors**:
- [ ] Software bug in recent deployment
- [ ] Configuration change
- [ ] Infrastructure failure
- [ ] Database performance issue
- [ ] Network connectivity problem
- [ ] Third-party service failure
- [ ] Security incident

**Process Factors**:
- [ ] Inadequate testing
- [ ] Missing monitoring
- [ ] Insufficient documentation
- [ ] Poor change management
- [ ] Inadequate communication
- [ ] Missing procedures
- [ ] Inadequate training
```

### Systemic Contributing Factors
```markdown
**Organizational Factors**:
- Insufficient staffing
- Inadequate on-call coverage
- Knowledge silos
- Poor documentation culture
- Inadequate investment in tooling
- Lack of incident response training

**Technical Debt**:
- Legacy system dependencies
- Monolithic architecture
- Insufficient automation
- Poor observability
- Inadequate testing infrastructure
- Technical skill gaps
```

### Latent Conditions
```markdown
**Warning Signs Ignored**:
- [Previous similar incidents]
- [Monitoring alerts that were dismissed]
- [Performance degradation patterns]
- [Known limitations not addressed]

**False Assumptions**:
- [Assumption 1 that proved incorrect]
- [Assumption 2 that proved incorrect]
- [Assumption 3 that proved incorrect]
```

---

## Impact Assessment

### Customer Impact
```markdown
**Service Availability**:
- Uptime during incident: [X hours Y minutes]
- Affected user percentage: [X%]
- Geographic impact: [Regions/countries affected]

**Customer Communications**:
- Customers notified: [Number]
- Support tickets created: [Number]
- Customer escalations: [Number]
- Public status page updates: [Number]

**Business Impact**:
- Revenue impact: $[Amount]
- SLA violations: [Number]
- Customer churn risk: [Assessment]
- Reputation impact: [Assessment]
```

### Technical Impact
```markdown
**System Performance**:
- Response time degradation: [X% increase]
- Error rate increase: [X%]
- Resource utilization impact: [Details]

**Data Impact**:
- Data loss: [Yes/No - amount if applicable]
- Data corruption: [Yes/No - scope if applicable]
- Recovery time: [Time to full data recovery]

**Infrastructure Impact**:
- Resources consumed: [CPU/Memory/Storage]
- Network impact: [Bandwidth/latency effects]
- Third-party service calls: [Increased/failed calls]
```

### Team Impact
```markdown
**Response Team**:
- Engineers involved: [Number]
- Person-hours spent: [Total hours]
- After-hours work: [Hours outside business hours]
- Follow-up work required: [Estimated hours]

**Knowledge Impact**:
- Team learning opportunities: [Details]
- Process improvements needed: [List]
- Tool/automation gaps: [List]
```

---

## Action Items

### Immediate Actions (Implement within 1 week)
```markdown
**Priority**: P0 - Critical

| Action Item | Owner | Due Date | Status | Notes |
|-------------|-------|----------|--------|-------|
| [ ] Fix specific bug causing incident | [Name] | [Date] | [ ] | [Technical details] |
| [ ] Update monitoring rules | [Name] | [Date] | [ ] | [Specific alerts] |
| [ ] Communicate resolution to customers | [Name] | [Date] | [ ] | [Communication plan] |
| [ ] Document lessons learned | [Name] | [Date] | [ ] | [Knowledge transfer] |
```

### Short-term Improvements (Implement within 1 month)
```markdown
**Priority**: P1 - High

| Action Item | Owner | Due Date | Status | Notes |
|-------------|-------|----------|--------|-------|
| [ ] Implement automated testing for edge case | [Name] | [Date] | [ ] | [Testing strategy] |
| [ ] Update runbook with new procedures | [Name] | [Date] | [ ] | [Documentation updates] |
| [ ] Enhance monitoring coverage | [Name] | [Date] | [ ] | [Monitoring gaps] |
| [ ] Conduct team training | [Name] | [Date] | [ ] | [Training plan] |
```

### Long-term Improvements (Implement within 3 months)
```markdown
**Priority**: P2 - Medium

| Action Item | Owner | Due Date | Status | Notes |
|-------------|-------|----------|--------|-------|
| [ ] Refactor problematic component | [Name] | [Date] | [ ] | [Architecture changes] |
| [ ] Implement chaos engineering tests | [Name] | [Date] | [ ] | [Testing framework] |
| [ ] Update disaster recovery procedures | [Name] | [Date] | [ ] | [DR improvements] |
| [ ] Improve documentation standards | [Name] | [Date] | [ ] | [Documentation process] |
```

### Strategic Improvements (Implement within 6 months)
```markdown
**Priority**: P3 - Low

| Action Item | Owner | Due Date | Status | Notes |
|-------------|-------|----------|--------|-------|
| [ ] Architecture review and refactoring | [Name] | [Date] | [ ] | [System design] |
| [ ] Invest in observability platform | [Name] | [Date] | [ ] | [Tool selection] |
| [ ] Develop incident response training program | [Name] | [Date] | [ ] | [Training curriculum] |
| [ ] Implement SRE practices | [Name] | [Date] | [ ] | [SRE methodology] |
```

### Action Item Tracking
```markdown
**Implementation Status**:
- [ ] All immediate actions completed
- [ ] Short-term improvements in progress
- [ ] Long-term improvements scheduled
- [ ] Strategic improvements planned

**Follow-up Reviews**:
- 1 week follow-up: [Date]
- 1 month review: [Date]
- 3 month review: [Date]
```

---

## Lessons Learned

### What Went Well
```markdown
**Response Effectiveness**:
- [Positive aspect 1 - e.g., rapid detection]
- [Positive aspect 2 - e.g., effective communication]
- [Positive aspect 3 - e.g., quick mitigation]

**Team Performance**:
- [Strong teamwork example]
- [Effective leadership]
- [Good technical problem-solving]

**Process Effectiveness**:
- [Incident response procedures worked well]
- [Communication channels effective]
- [Decision-making process efficient]

**Tool Effectiveness**:
- [Monitoring tools provided good visibility]
- [Diagnostic tools helped identify root cause]
- [Automation reduced manual effort]
```

### What Could Be Improved
```markdown
**Detection and Response**:
- [Improvement area 1]
- [Improvement area 2]
- [Improvement area 3]

**Communication**:
- [Communication gap 1]
- [Communication gap 2]
- [Communication gap 3]

**Technical**:
- [Technical limitation 1]
- [Technical limitation 2]
- [Technical limitation 3]

**Process**:
- [Process gap 1]
- [Process gap 2]
- [Process gap 3]
```

### Knowledge to Share
```markdown
**Technical Knowledge**:
- [Technical insight 1]
- [Technical insight 2]
- [Technical insight 3]

**Process Knowledge**:
- [Process improvement 1]
- [Process improvement 2]
- [Process improvement 3]

**Team Knowledge**:
- [Skill development area 1]
- [Skill development area 2]
- [Team coordination improvement]
```

### Patterns Identified
```markdown
**Incident Patterns**:
- [Pattern 1 - recurring theme]
- [Pattern 2 - similar previous incidents]
- [Pattern 3 - systemic issue]

**Improvement Opportunities**:
- [Opportunity 1 - automation]
- [Opportunity 2 - monitoring]
- [Opportunity 3 - process]
```

---

## Blameless Culture

### Individual Performance
```markdown
**Focus on Systems, Not Individuals**:

**What the Individual Did Right**:
- [Positive action 1]
- [Positive action 2]
- [Positive action 3]

**What the System Could Have Supported Better**:
- [System limitation 1]
- [System limitation 2]
- [System limitation 3]

**Learning Opportunity**:
- [What was learned]
- [How it will help in the future]
- [How to share this knowledge]
```

### Organizational Learning
```markdown
**Cultural Insights**:
- [Cultural strength demonstrated]
- [Cultural area for improvement]
- [Team value reinforced]

**Process Insights**:
- [Process strength]
- [Process weakness]
- [Process improvement opportunity]

**Technical Insights**:
- [Technical strength]
- [Technical debt identified]
- [Technical improvement opportunity]
```

### Psychological Safety
```markdown
**Safe to Speak Up**:
- [Evidence of open communication]
- [Team members felt safe to raise concerns]
- [Leadership created safe environment]

**Learning Orientation**:
- [Team focused on learning, not blame]
- [Mistakes seen as learning opportunities]
- [Continuous improvement mindset]
```

---

## Action Plan Summary

### Key Takeaways
```markdown
1. **Most Important Learning**: [Primary insight]
2. **Biggest Risk Mitigation**: [Most critical improvement]
3. **Quickest Win**: [Fastest improvement to implement]
4. **Long-term Investment**: [Strategic improvement needed]
```

### Implementation Roadmap
```markdown
**Week 1**:
- [ ] [Critical immediate action]
- [ ] [Communication to stakeholders]
- [ ] [Team debrief session]

**Month 1**:
- [ ] [Short-term improvement 1]
- [ ] [Short-term improvement 2]
- [ ] [Process updates]

**Quarter 1**:
- [ ] [Long-term improvement 1]
- [ ] [Long-term improvement 2]
- [ ] [Strategic initiative]

**Ongoing**:
- [ ] [Continuous improvement process]
- [ ] [Regular review schedule]
- [ ] [Knowledge sharing]
```

### Success Metrics
```markdown
**Technical Metrics**:
- Time to detection: [Target improvement]
- Time to resolution: [Target improvement]
- Incident recurrence: [Zero target]
- System reliability: [Uptime target]

**Process Metrics**:
- Action item completion rate: [Target %]
- Time to implement improvements: [Target timeline]
- Team satisfaction with response: [Target score]

**Business Metrics**:
- Customer satisfaction: [Target score]
- Revenue impact: [Minimize target]
- SLA compliance: [Target %]
```

---

## Review and Follow-up

### Post-Mortem Review Meeting
```markdown
**Meeting Scheduled**: [Date and Time]
**Attendees**: [List of attendees]
**Duration**: [Expected duration]

**Agenda**:
1. Review incident timeline (15 min)
2. Discuss root cause analysis (30 min)
3. Review action items (30 min)
4. Discuss lessons learned (30 min)
5. Assign ownership and deadlines (15 min)

**Preparation Required**:
- [ ] All attendees review this document
- [ ] Technical leads prepare detailed analysis
- [ ] Action item owners prepare proposals
- [ ] Metrics and data compiled
```

### Follow-up Schedule
```markdown
**1 Week Follow-up**:
- [ ] Review immediate action item progress
- [ ] Address any blockers
- [ ] Communicate progress to stakeholders

**1 Month Review**:
- [ ] Assess progress on short-term improvements
- [ ] Adjust timelines if needed
- [ ] Celebrate completed improvements

**3 Month Review**:
- [ ] Evaluate long-term improvement implementation
- [ ] Measure impact of changes
- [ ] Plan next cycle of improvements

**Annual Review**:
- [ ] Analyze incident trends
- [ ] Assess overall process improvement
- [ ] Update incident response procedures
```

### Communication Plan
```markdown
**Internal Communication**:
- [ ] Engineering team briefing
- [ ] Leadership summary
- [ ] All-hands presentation (if significant)
- [ ] Documentation updates

**External Communication**:
- [ ] Customer communication (if appropriate)
- [ ] Partner notification (if applicable)
- [ ] Regulatory reporting (if required)
- [ ] Public communication (if necessary)
```

---

## Appendix

### Supporting Data
```markdown
**Monitoring Data**:
- [Link to Grafana dashboards]
- [Link to Prometheus queries]
- [Link to log analysis]

**Communication Records**:
- [Link to Slack conversation]
- [Link to email threads]
- [Link to status page updates]

**Technical Analysis**:
- [Link to detailed technical analysis]
- [Link to code review]
- [Link to configuration analysis]
```

### References
```markdown
**Related Documents**:
- Incident Response Runbook
- Deployment Procedures
- Monitoring Documentation
- Architecture Documentation

**External References**:
- Vendor documentation
- Industry best practices
- Academic research
- Conference presentations
```

---

**Document Version**: 1.0  
**Last Updated**: [Date]  
**Next Review**: [Date]  
**Document Owner**: [Name]  
**Approval**: [Names and signatures]
