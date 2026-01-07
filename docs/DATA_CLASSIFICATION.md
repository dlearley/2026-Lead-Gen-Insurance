# Data Classification Policy

## Overview

This policy establishes guidelines for classifying data based on its sensitivity and the appropriate handling requirements for each classification level. All team members must understand and adhere to these guidelines.

## Classification Levels

### Level 1: Public

**Definition**: Information that can be freely disclosed to anyone without any restrictions.

**Examples**:
- Marketing materials and website content
- Product documentation
- Published press releases
- Job postings
- Public pricing information

**Handling Requirements**:
- No special protection required
- Can be shared internally and externally
- No access restrictions

**Storage**: Publicly accessible, no encryption required

### Level 2: Internal

**Definition**: Information intended for internal use only. Disclosure could cause minimal harm to the organization.

**Examples**:
- Internal policies and procedures
- Non-sensitive project documentation
- Internal newsletters
- Organizational charts
- Non-sensitive meeting notes

**Handling Requirements**:
- Access limited to employees and authorized contractors
- Can be shared on internal platforms
- Should not be posted publicly

**Storage**: Internal systems, optional encryption

### Level 3: Confidential

**Definition**: Information that could cause moderate harm to the organization if disclosed. Must be protected from unauthorized access.

**Examples**:
- Customer lists and contact information (non-sensitive)
- Business plans and strategies
- Financial reports (non-public)
- Internal audit results
- Supplier contracts and pricing
- Application source code
- Architecture diagrams

**Handling Requirements**:
- Access restricted to authorized personnel with business need
- Encryption at rest required
- Encryption in transit required
- Access logging and audit trail
- Two-factor authentication for remote access

**Storage**: Encrypted storage, access controls, audit logs

### Level 4: Restricted

**Definition**: Highly sensitive information that could cause severe harm to the organization or customers if disclosed. Requires the highest level of protection.

**Examples**:
- Personally Identifiable Information (PII):
  - Social Security Numbers
  - Driver's license numbers
  - Credit card numbers
  - Bank account information
  - Medical/health information (PHI)
- Employee salary information
- Encryption keys and secrets
- Authentication credentials
- Security incident reports
- Legal privileged communications

**Handling Requirements**:
- Strict access controls with explicit authorization
- Strong encryption at rest (AES-256 or equivalent)
- Strong encryption in transit (TLS 1.3)
- Comprehensive audit logging for all access
- MFA required for all access
- Data loss prevention (DLP) controls
- Regular access reviews
- Anonymization/pseudonymization where possible

**Storage**: Strong encryption, strict access controls, DLP monitoring

## Data Classification Decision Matrix

Use this matrix to determine the appropriate classification level:

| Factor | Public | Internal | Confidential | Restricted |
|--------|--------|-----------|--------------|-------------|
| Publicly available | ✅ | ❌ | ❌ | ❌ |
| Internal use only | ❌ | ✅ | ✅ | ✅ |
| Customer-facing but not public | ❌ | ❌ | ✅ | ❌ |
| Contains PII | ❌ | ❌ | ❌ | ✅ |
| Contains financial data | ❌ | ❌ | ✅ | ✅ |
| Business sensitive | ❌ | ❌ | ✅ | ✅ |
| Legal/regulatory requirements | ❌ | ❌ | ✅ | ✅ |
| Encryption keys/secrets | ❌ | ❌ | ❌ | ✅ |

## Access Control Requirements by Classification

### Public
- No access restrictions
- Can be hosted on public websites
- No authentication required

### Internal
- Employee/contractor authentication required
- VPN or network access required for remote access
- Domain-joined devices recommended

### Confidential
- Role-based access control (RBAC)
- Authorization required for each access
- Audit trail for all access attempts
- MFA recommended for remote access
- Business justification required

### Restricted
- Strict RBAC with least privilege
- Explicit authorization for each user
- Comprehensive audit logging
- MFA mandatory for all access
- Time-based access where possible
- Regular access reviews (quarterly)
- Anomaly detection and alerting

## Data Handling Procedures

### Data Creation

When creating or receiving new data:
1. Determine the appropriate classification level
2. Apply the classification label
3. Store in appropriate location for that classification
4. Apply required security controls
5. Document the classification in metadata

### Data Storage

**Confidential Data Storage Requirements**:
- Store in approved encrypted storage systems
- Use strong encryption (AES-256)
- Implement access controls
- Enable audit logging
- Regular backups

**Restricted Data Storage Requirements**:
- Store in highly secure, encrypted systems
- Use AWS KMS or equivalent for key management
- Implement network-level access controls
- Enable comprehensive audit logging
- Immutable backups with secure retention
- Regular encryption key rotation

### Data Transmission

**Confidential Data Transmission**:
- Use TLS 1.3 or equivalent
- Verify SSL/TLS certificates
- Encrypt files before email transmission
- Use secure file transfer protocols (SFTP, HTTPS)
- Avoid public Wi-Fi networks

**Restricted Data Transmission**:
- Mandatory use of TLS 1.3
- Certificate pinning where possible
- End-to-end encryption
- Approved secure file transfer only
- No transmission over unsecured channels
- Verify recipient authorization before transmission

### Data Access Requests

Process for requesting access to Confidential or Restricted data:

1. **Submit Request**
   - Complete data access request form
   - Provide business justification
   - Specify data needed and duration
   - Obtain manager approval

2. **Review Process**
   - Security team reviews request
   - Verify business need
   - Check for conflicts of interest
   - Approve or deny within 5 business days

3. **Access Provisioning**
   - Grant minimum necessary access
   - Set expiration date if temporary
   - Enable audit logging
   - Train user on handling procedures

4. **Access Review**
   - Quarterly review for ongoing access
   - Revoke access when no longer needed
   - Audit access logs regularly

### Data Disposal

**Confidential Data Disposal**:
- Secure deletion using approved tools
- Clear backup systems
- Verify deletion complete
- Document disposal action

**Restricted Data Disposal**:
- Cryptographic erasure or physical destruction
- Multiple-pass overwriting
- Certificate of destruction
- Audit trail of disposal
- Legal hold consideration before disposal

## Data Retention Requirements

| Data Type | Classification | Retention Period |
|-----------|----------------|------------------|
| Customer PII | Restricted | As required by law, typically 3-7 years |
| Financial records | Confidential/Restricted | 7 years |
| Employee records | Confidential | 7 years after termination |
| Application logs | Internal | 90 days (extended if incident) |
| Security logs | Confidential | 1 year |
| Audit logs | Confidential | 90 days |
| Source code | Confidential | As long as application in use |
| Contracts | Confidential | 7 years after expiration |
| Public documents | Public | Permanent |

## Encryption Requirements

### Confidential Data
- **At Rest**: AES-256 encryption
- **In Transit**: TLS 1.3 minimum
- **Key Management**: AWS KMS or equivalent
- **Key Rotation**: Annually or upon compromise

### Restricted Data
- **At Rest**: AES-256-GCM with separate keys
- **In Transit**: TLS 1.3 with strong cipher suites
- **Key Management**: HSM or equivalent
- **Key Rotation**: Every 90 days or upon compromise

## Data Sharing and Transfer

### Internal Sharing
- Use approved internal collaboration tools
- Verify recipient authorization
- Apply appropriate sharing permissions
- Avoid email for large or sensitive files

### External Sharing
- Obtain written authorization before sharing
- Use secure file transfer methods
- Encrypt data before transmission
- Require recipient to agree to data handling terms
- Audit shared data regularly

### International Transfers
- Verify compliance with data protection laws
- Use EU Standard Contractual Clauses for GDPR
- Implement appropriate safeguards
- Document transfer justification

## Breach Response by Classification

### Confidential Data Breach
- Contain incident within 4 hours
- Notify internal stakeholders within 24 hours
- Assess impact and affected individuals
- Notify if required by regulation (often 72 hours for GDPR)

### Restricted Data Breach
- Contain incident immediately (within 1 hour)
- Notify security leadership within 1 hour
- Engage legal counsel
- Prepare for regulatory notifications
- Notify affected individuals as required (varies by jurisdiction)

## Training and Awareness

### Required Training
All employees handling data must complete:
- Data classification training (onboarding and annually)
- Secure handling procedures (annually)
- Incident reporting procedures (annually)

### Specialized Training
- **Security Team**: Advanced data protection training
- **Developers**: Secure coding and data handling
- **Compliance Officers**: Regulatory requirements

## Compliance Considerations

### GDPR (EU)
- Personal data is at least Confidential
- Special category data is Restricted
- Data subject rights must be supported
- 72-hour breach notification requirement

### HIPAA (US Healthcare)
- Protected Health Information (PHI) is Restricted
- Minimum necessary standard
- Business Associate Agreements required
- 60-day breach notification requirement

### CCPA (California)
- Personal information is at least Confidential
- Sensitive personal information is Restricted
- Consumer rights must be supported
- 30-day breach notification requirement

## Auditing and Monitoring

### Audit Requirements

**Confidential Data**:
- Log all access attempts
- Review access logs monthly
- Monitor for unusual patterns
- Report suspicious activity

**Restricted Data**:
- Real-time access monitoring
- Comprehensive audit trail
- Weekly access log review
- Immediate alert on anomalies
- Quarterly access certification

### Key Metrics

- Data classification accuracy
- Access request processing time
- Unauthorized access attempts
- Data loss incidents
- Compliance audit findings

## Roles and Responsibilities

### Data Owners
- Determine initial classification
- Approve access requests
- Review classification regularly
- Ensure proper handling

### Data Stewards
- Maintain data inventory
- Implement classification controls
- Monitor data access
- Conduct regular reviews

### Security Team
- Establish classification standards
- Provide tools and guidance
- Conduct security audits
- Respond to incidents

### All Employees
- Understand classification levels
- Follow handling procedures
- Report security concerns
- Complete required training

## Data Classification Exceptions

### Exception Process

If standard classification doesn't fit:
1. Submit exception request to security team
2. Provide justification for different classification
3. Receive written approval
4. Document exception rationale
5. Review exception annually

### Re-classification

Data may be reclassified when:
- Regulatory requirements change
- Business context changes
- Security risk assessment changes
- Time-based declassification occurs

## References

- [Security Policy](./SECURITY_POLICY.md)
- [Incident Response Plan](./INCIDENT_RESPONSE_PLAN.md)
- [GDPR Compliance](./GDPR_COMPLIANCE.md)
- [HIPAA Compliance](./HIPAA_COMPLIANCE.md)

---

**Document Owner**: Data Governance Team
**Last Updated**: 2024-01-05
**Review Frequency**: Annually
**Version**: 1.0
