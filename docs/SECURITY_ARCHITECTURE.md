# Security Architecture

## Overview

This document describes the security architecture of the Lead Management System, including threat model, security boundaries, trust relationships, and security controls implemented at each layer.

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         Internet                               │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    AWS WAF / CloudFront                        │
│                  - DDoS Protection                             │
│                  - WAF Rules                                   │
│                  - Geo-blocking (optional)                      │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                 Application Load Balancer                       │
│                  - TLS Termination                             │
│                  - SSL Offloading                              │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Kubernetes Cluster                          │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                 API Gateway / Ingress                  │   │
│  │           - TLS 1.3 Enforcement                      │   │
│  │           - mTLS (Service-to-Service)                │   │
│  └─────────────────────────────────────────────────────────┘   │
│                              │                              │
│  ┌──────────┬──────────┬──────────┬──────────┐          │
│  │   API    │ Backend  │   Data   │ Orchestr │          │
│  │ Service  │ Service  │ Service  │   ator   │          │
│  │          │          │          │          │          │
│  │ - JWT    │ - Python  │ - Node.js │ - Node.js │          │
│  │ AuthZ    │ - Flask   │ - Prisma  │ - BullMQ │          │
│  └──────────┴──────────┴──────────┴──────────┘          │
│                                                              │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                 Service Mesh (Istio)                  │   │
│  │           - mTLS Communication                     │   │
│  │           - Traffic Management                     │   │
│  │           - Observability                          │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Data Layer                                 │
│  ┌──────────┬──────────┬──────────┬──────────┐          │
│  │PostgreSQL │  Redis   │  Qdrant  │   Neo4j  │          │
│  │          │          │          │          │          │
│  │- TDE     │- TLS     │- TLS     │- TLS     │          │
│  │- pgaudit │- Auth    │- Auth    │- Auth    │          │
│  └──────────┴──────────┴──────────┴──────────┘          │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│              AWS Services (VPC Private Subnets)                │
│  ┌──────────┬──────────┬──────────┬──────────┐          │
│  │   RDS    │  Elasti  │   S3     │   KMS    │          │
│  │          │  Cache   │          │          │          │
│  │- Encr.   │- Encr.   │- Encr.   │- Keys    │          │
│  └──────────┴──────────┴──────────┴──────────┘          │
└─────────────────────────────────────────────────────────────────┘
```

## Security Layers

### Layer 1: Network Security

#### External Perimeter
- **AWS WAF**: Web Application Firewall rules
  - OWASP Top 10 protection
  - Rate limiting (1000 req/min per IP)
  - IP reputation filtering
  - SQL injection prevention
  - XSS prevention

- **DDoS Protection**
  - AWS Shield Standard (always on)
  - AWS Shield Advanced (optional)
  - Rate limiting at edge
  - Geo-blocking capabilities

#### Network Segmentation
- **VPC Design**
  - Public subnets: Load balancers only
  - Private subnets: Application servers
  - Isolated subnets: Databases
  - VPC Flow Logs enabled

- **Kubernetes Network Policies**
  - Default deny-all policy
  - Explicit allow rules for service communication
  - Namespace isolation
  - Egress policies for external calls

```
# Example Network Policy
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: deny-all
spec:
  podSelector: {}
  policyTypes:
  - Ingress
  - Egress
```

### Layer 2: Application Security

#### Authentication
- **JWT Authentication**
  - RS256 asymmetric signing
  - 15-minute access tokens
  - 7-day refresh tokens
  - Token revocation support
  - jti tracking for blacklisting

- **Multi-Factor Authentication (MFA)**
  - TOTP (Google Authenticator)
  - SMS-based OTP
  - WebAuthn/FIDO2 support
  - Backup codes
  - MFA enforcement for admin access

```
Authentication Flow:
┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐
│  Client  │───▶│  API GW  │───▶│  AuthZ   │───▶│  Secrets │
└──────────┘    └──────────┘    └──────────┘    └──────────┘
                       │
                       ▼
              ┌──────────────────┐
              │   JWT Service    │
              │  - Verify Token  │
              │  - Extract Claims│
              └──────────────────┘
                       │
                       ▼
              ┌──────────────────┐
              │   RBAC Engine   │
              │  - Check Perms   │
              │  - Enforce Policy│
              └──────────────────┘
```

#### Authorization
- **Role-Based Access Control (RBAC)**
  - Hierarchical roles (admin, operator, viewer, user)
  - Resource-level permissions
  - Attribute-based policies
  - Least privilege enforcement

- **API Security**
  - OAuth 2.0 / OpenID Connect
  - API key authentication for external services
  - Rate limiting per endpoint
  - API versioning

#### Input Validation & Output Encoding
- **Input Sanitization**
  - Schema validation (Zod)
  - XSS prevention
  - SQL injection prevention
  - Command injection prevention

- **Output Encoding**
  - HTML encoding
  - URL encoding
  - JavaScript encoding
  - CSS encoding

### Layer 3: Data Security

#### Encryption at Rest
- **Database Encryption**
  - PostgreSQL: Transparent Data Encryption (TDE)
  - Redis: Encryption at rest
  - AWS RDS: Storage encryption
  - AWS S3: Server-side encryption (AES-256)

- **Application-Level Encryption**
  - AES-256-GCM encryption for PII
  - Per-field encryption
  - Key derivation with PBKDF2
  - IV per record

```typescript
// Encryption Service Architecture
┌─────────────────────────────────────────┐
│      Encryption Service               │
│                                     │
│  ┌─────────────┐   ┌────────────┐  │
│  │ AES-256-GCM │───│ Key Manager│  │
│  └─────────────┘   └────────────┘  │
│         │                            │
│         ▼                            │
│  ┌─────────────────────────────┐     │
│  │ Field Encryption            │     │
│  │ - Encrypt PII fields       │     │
│  │ - Auto-decrypt on read     │     │
│  └─────────────────────────────┘     │
└─────────────────────────────────────────┘
```

#### Encryption in Transit
- **TLS Configuration**
  - TLS 1.3 enforced
  - Strong cipher suites only
  - Perfect Forward Secrecy
  - HSTS headers

- **Service Mesh Security**
  - mTLS for all service communication
  - Automatic certificate rotation
  - Mutual authentication
  - Istio Citadel for CA

#### Key Management
- **AWS KMS**
  - Customer-managed keys (CMKs)
  - Key rotation enabled (annual)
  - IAM policies for key access
  - CloudTrail logging

- **Key Hierarchy**
```
Root Key (KMS CMK)
    │
    ├─→ Data Encryption Key (DEK) 1
    │       │
    │       ├─→ Application Secrets
    │       └─→ Database Encryption
    │
    ├─→ Data Encryption Key (DEK) 2
    │       │
    │       └─→ Cache Encryption
    │
    └─→ Data Encryption Key (DEK) 3
            │
            └─→ TLS Certificates
```

### Layer 4: Infrastructure Security

#### Container Security
- **Image Security**
  - Minimal base images (Alpine, distroless)
  - Image scanning (Trivy, Grype)
  - SBOM generation (Syft)
  - Signed images (Docker Content Trust)

- **Runtime Security**
  - Pod Security Standards
  - Resource quotas
  - Seccomp profiles
  - AppArmor profiles

- **Kubernetes Security**
  - etcd encryption at rest
  - RBAC enabled
  - Network policies
  - Admission controllers

#### Cloud Security
- **AWS Security**
  - GuardDuty for threat detection
  - Security Hub for centralized monitoring
  - Config for compliance monitoring
  - CloudTrail for API logging
  - Macie for data discovery

### Layer 5: Monitoring & Logging

#### Logging
- **Application Logs**
  - Structured logging (JSON)
  - Log levels (debug, info, warn, error)
  - Sensitive data masking
  - Trace correlation (OpenTelemetry)

- **Security Logs**
  - Audit logging (all access/modifications)
  - Authentication events
  - Authorization failures
  - Security incidents
  - 90-day retention

- **Infrastructure Logs**
  - CloudTrail (API calls)
  - VPC Flow Logs (network traffic)
  - Kubernetes audit logs
  - WAF logs

#### Monitoring
- **Metrics**
  - HTTP request metrics
  - Security event metrics
  - Vulnerability metrics
  - Compliance metrics

- **Alerting**
  - Real-time security alerts
  - Threshold-based alerts
  - Anomaly detection
  - Escalation procedures

```
Monitoring Architecture:
┌─────────────────────────────────────────────────────────────┐
│                    Prometheus                             │
│                    ┌─────────┐                          │
│                    │  Alert   │                          │
│                    │ Manager  │                          │
│                    └────┬────┘                          │
│                         │                               │
└─────────────────────────┼───────────────────────────────┘
                          │
           ┌──────────────┼──────────────┐
           │              │              │
           ▼              ▼              ▼
    ┌──────────┐   ┌──────────┐   ┌──────────┐
    │ PagerDuty│   │   Slack  │   │   Email  │
    └──────────┘   └──────────┘   └──────────┘
```

## Threat Model

### Threat Actors

| Actor | Motivation | Capabilities | Impact Level |
|-------|-----------|--------------|--------------|
| External Hackers | Financial gain, notoriety | Medium-High | Medium-High |
| Insider Threats | Disgruntled, financial | High | High |
| Nation-State | Espionage, disruption | Very High | Critical |
| Script Kiddies | Curiosity, vandalism | Low | Low |
| Competitors | Competitive advantage | Medium | Medium |

### Attack Vectors

#### External Attacks
1. **Network Attacks**
   - DDoS attacks
   - Man-in-the-middle
   - DNS poisoning
   - BGP hijacking

2. **Application Attacks**
   - SQL injection
   - XSS attacks
   - CSRF attacks
   - Command injection
   - Broken authentication

3. **Supply Chain Attacks**
   - Dependency vulnerabilities
   - Malicious packages
   - Compromised build systems

#### Internal Threats
1. **Privilege Escalation**
   - Misconfigured permissions
   - Weak authentication
   - Lack of audit logging

2. **Data Exfiltration**
   - Unauthorized data access
   - Insufficient monitoring
   - Lax egress controls

### Security Controls Mapping

```
┌───────────────────────────────────────────────────────────────┐
│                    Threat                                 │
└───────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌───────────────────────────────────────────────────────────────┐
│                 Security Controls                           │
│  ┌──────────┬──────────┬──────────┬──────────┬─────────┐│
│  │Prevent   │  Detect  │ Respond  │  Recover │   Learn ││
│  └──────────┴──────────┴──────────┴──────────┴─────────┘│
└───────────────────────────────────────────────────────────────┘
```

#### Preventive Controls
- Network segmentation
- Firewalls and WAF
- Authentication and authorization
- Input validation
- Encryption
- Security training

#### Detective Controls
- Logging and monitoring
- Intrusion detection (IDS)
- Vulnerability scanning
- Security audits
- Anomaly detection

#### Responsive Controls
- Incident response procedures
- Automated containment
- Blocking mechanisms
- Threat intelligence
- Forensics capabilities

#### Corrective Controls
- Patch management
- System restoration
- Data recovery
- Security improvements
- Post-incident reviews

## Compliance Architecture

### HIPAA Compliance (if applicable)

```
HIPAA Requirements
│
├─ Physical Safeguards
│  └─ Managed by AWS
│
├─ Technical Safeguards
│  ├─ Access Control ✅
│  ├─ Audit Controls ✅
│  ├─ Integrity Controls ✅
│  └─ Transmission Security ✅
│
└─ Administrative Safeguards
   ├─ Risk Assessment ✅
   ├─ Security Policies ✅
   ├─ Training ✅
   └─ Incident Response ✅
```

### SOC 2 Type II Compliance

```
SOC 2 Trust Services Criteria
│
├─ Security ✅
│  ├─ CC6.1: Access Control
│  ├─ CC7.1: Audit Logging
│  ├─ CC8.1: Vulnerability Mgmt
│  └─ CC9.1: Confidentiality
│
├─ Availability ✅
│  ├─ A1.1: Infrastructure
│  ├─ A1.2: Disaster Recovery
│  └─ A1.3: Monitoring
│
├─ Processing Integrity ✅
│  └─ Data completeness/accuracy
│
├─ Confidentiality ✅
│  └─ Encryption and access controls
│
└─ Privacy ✅
   └─ GDPR controls implementation
```

## Security Metrics

### Key Performance Indicators

| Metric | Target | Current |
|--------|--------|---------|
| Mean Time to Detect (MTTD) | < 15 min | TBD |
| Mean Time to Respond (MTTR) | < 1 hour | TBD |
| Vulnerability Remediation Rate | > 95% | TBD |
| Security Training Completion | 100% | TBD |
| Compliance Score | > 90% | TBD |
| Critical Vulnerabilities | 0 | TBD |
| High Vulnerabilities | < 5 | TBD |

## References

- [Security Policy](./SECURITY_POLICY.md)
- [Secure Development Guide](./SECURE_DEVELOPMENT_GUIDE.md)
- [Data Classification](./DATA_CLASSIFICATION.md)
- [Incident Response Plan](./INCIDENT_RESPONSE_PLAN.md)

---

**Document Owner**: Security & Architecture Teams
**Last Updated**: 2024-01-05
**Review Frequency**: Quarterly
**Version**: 1.0
