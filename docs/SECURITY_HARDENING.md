# Security Hardening Guide

## 📋 Overview

This guide documents the security hardening measures implemented for the Insurance Lead Gen AI Platform to meet enterprise security requirements.

## 🔒 Implemented Security Controls

### 1. Network Security

#### Kubernetes Network Policies
```bash
# Apply network policies
kubectl apply -f deploy/k8s/security/network-policy.yaml

# Verify policies
kubectl get networkpolicies -A
```

**Default Deny All Traffic**
- All ingress traffic denied by default
- All egress traffic denied by default
- Only explicitly allowed traffic permitted

**Policy Highlights**
```yaml
# Example: API service can only communicate with specific services
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: api-egress
spec:
  podSelector:
    matchLabels:
      app: api
  policyTypes:
    - Egress
  egress:
    - to:
        - podSelector:
            matchLabels:
              app: data-service
    - to:
        - podSelector:
            matchLabels:
              app: orchestrator
```

#### Ingress Controller Security
```yaml
# annotations in Helm values
ingress:
  annotations:
    nginx.ingress.kubernetes.io/ssl-redirect: "true"
    nginx.ingress.kubernetes.io/proxy-body-size: "50m"
    nginx.ingress.kubernetes.io/limit-rps: "100"
    nginx.ingress.kubernetes.io/limit-connections: "50"
```

### 2. Secrets Management

#### AWS Secrets Manager Integration
```bash
# Secrets stored securely with KMS encryption
aws secretsmanager list-secrets \
  --filters "Key=name,Values=insurance-lead-gen"

# Automatic rotation enabled
aws secretsmanager rotate-secret \
  --secret-id insurance-lead-gen/production/database
```

**Secrets Structure**
```json
{
  "database": {
    "username": "admin",
    "password": "***",
    "host": "postgres.xxxx.rds.amazonaws.com"
  },
  "ai": {
    "openai_api_key": "***",
    "anthropic_api_key": "***"
  },
  "api": {
    "jwt_secret": "***",
    "encryption_key": "***"
  }
}
```

#### Kubernetes Secrets
```yaml
# External Secrets Operator pattern
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: api-secrets
spec:
  refreshInterval: 1h
  secretStoreRef:
    name: aws-secrets-manager
    kind: ClusterSecretStore
  target:
    name: api-secrets
  data:
    - secretKey: database-url
      remoteRef:
        key: insurance-lead-gen/production/database
        property: connection-string
```

### 3. Encryption

#### Data at Rest
- **EBS Volumes**: AES-256 encryption enabled
- **RDS**: Encryption enabled with KMS
- **S3 Buckets**: Server-side encryption with AWS KMS
- **Redis**: Encryption at rest enabled (production)

#### Data in Transit
- **TLS 1.3**: Minimum version enforced
- **Certificate Management**: Let's Encrypt + AWS ACM
- **mTLS**: Between microservices (optional)

```yaml
# TLS configuration in ingress
tls:
  - secretName: api-tls
    hosts:
      - api.insurance-lead-gen.com
```

### 4. Authentication & Authorization

#### RBAC Configuration
```bash
# View current roles
kubectl get roles -n production
kubectl get rolebindings -n production

# Create custom role
kubectl apply -f deploy/k8s/security/rbac.yaml
```

**Role Definitions**
```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: platform-readonly
rules:
  - apiGroups: [""]
    resources: ["pods", "services", "configmaps"]
    verbs: ["get", "list", "watch"]
  - apiGroups: ["apps"]
    resources: ["deployments", "replicasets"]
    verbs: ["get", "list", "watch"]
```

#### GitHub Actions OIDC
```yaml
# GitHub OIDC role for CI/CD
trust relationship:
  - Action: sts:AssumeRoleWithWebIdentity
    Condition:
      StringEquals:
        token.actions.githubusercontent.com:aud: sts.amazonaws.com
        token.actions.githubusercontent.com:sub: "repo:org:repo"
```

### 5. Pod Security

#### Pod Security Standards
```yaml
# Enforce restricted security context
apiVersion: v1
kind: Namespace
metadata:
  labels:
    pod-security.kubernetes.io/enforce: restricted
    pod-security.kubernetes.io/audit: restricted
    pod-security.kubernetes.io/warn: restricted
  name: production
```

#### Security Context
```yaml
# Deployment security context
spec:
  template:
    spec:
      securityContext:
        runAsNonRoot: true
        runAsUser: 1000
        runAsGroup: 1000
        fsGroup: 1000
        seccompProfile:
          type: RuntimeDefault
      containers:
        - securityContext:
            allowPrivilegeEscalation: false
            readOnlyRootFilesystem: true
            capabilities:
              drop:
                - ALL
```

### 6. Vulnerability Scanning

#### Container Image Scanning
```yaml
# Trivy in CI/CD pipeline
- name: Scan image for vulnerabilities
  uses: aquasecurity/trivy-action@master
  with:
    image-ref: '${{ steps.build-image.outputs.image }}'
    format: 'table'
    exit-code: '1'
    severity: 'CRITICAL,HIGH'
```

#### Runtime Security
```bash
# Falco runtime security (optional)
helm install falco \
  --repo https://falcosecurity.github.io/charts \
  --namespace falco \
  --create-namespace \
  --set tty=true
```

### 7. Audit Logging

#### Kubernetes Audit Logs
```yaml
# audit-policy.yaml
apiVersion: audit.k8s.io/v1
kind: Policy
rules:
  # Level None for health checks
  - level: None
    users: ["system:kube-proxy"]
    verbs: ["watch"]
    resources:
      - group: ""
        resources: ["endpoints"]
  
  # Level Metadata for secrets
  - level: Metadata
    resources:
      - group: ""
        resources: ["secrets", "configmaps"]
    
  # Level RequestResponse for all
  - level: RequestResponse
    verbs: ["create", "update", "patch", "delete"]
```

#### CloudTrail Integration
```bash
# Enable CloudTrail
aws cloudtrail create-trail \
  --name insurance-lead-gen-trail \
  --s3-bucket-name insurance-lead-gen-audit-logs \
  --is-multi-region-trail

# Enable logging
aws cloudtrail start-logging \
  --name insurance-lead-gen-trail
```

## 🛡️ Hardening Checklist

### Infrastructure
- [x] VPC with private subnets
- [x] Security groups with least privilege
- [x] Network ACLs configured
- [x] NAT gateways for outbound traffic
- [x] No public IP on worker nodes

### Kubernetes
- [x] Network policies applied
- [x] Pod security standards enforced
- [x] RBAC configured with least privilege
- [x] Service account tokens mounted only when needed
- [x] Image pull secrets configured

### Secrets
- [x] AWS Secrets Manager integration
- [x] KMS encryption for secrets
- [x] Automatic secret rotation enabled
- [x] No secrets in environment variables
- [x] External Secrets Operator configured

### Data Protection
- [x] Encryption at rest (EBS, RDS, S3)
- [x] TLS termination at ingress
- [x] Certificate rotation process
- [x] Database connection encryption

### Monitoring & Logging
- [x] Audit logging enabled
- [x] CloudTrail configured
- [x] Container image scanning
- [x] Runtime security monitoring
- [x] SIEM integration (optional)

### Access Control
- [x] OIDC for GitHub Actions
- [x] Multi-factor authentication
- [x] Role-based access control
- [x] Regular access reviews

## 📜 Compliance Mapping

| Control | Framework | Implementation |
|---------|-----------|----------------|
| AC-1 | NIST | RBAC + OIDC |
| AU-2 | NIST | CloudTrail + Audit Logs |
| CM-2 | NIST | Terraform + Helm |
| IA-2 | NIST | OIDC + MFA |
| SC-8 | NIST | TLS + Encryption at rest |
| SI-2 | NIST | Vulnerability scanning |

## 🚀 Deployment with Security

```bash
# 1. Apply network policies first
kubectl apply -f deploy/k8s/security/network-policy.yaml

# 2. Create namespaces with security labels
kubectl apply -f deploy/k8s/security/namespaces.yaml

# 3. Apply RBAC
kubectl apply -f deploy/k8s/security/rbac.yaml

# 4. Deploy secrets (via External Secrets Operator)
kubectl apply -f deploy/k8s/security/external-secrets.yaml

# 5. Deploy services with security context
helm install api deploy/helm/api \
  -f deploy/helm/api/values.production.yaml \
  -n production
```

## 🔄 Regular Security Tasks

### Weekly
- [ ] Review failed authentication attempts
- [ ] Check for expired certificates
- [ ] Review audit logs for anomalies

### Monthly
- [ ] Rotate service account tokens
- [ ] Review and update RBAC policies
- [ ] Run vulnerability scan
- [ ] Review secrets access patterns

### Quarterly
- [ ] Penetration testing
- [ ] Access review and cleanup
- [ ] Security policy update
- [ ] Incident response drill

## 📞 Security Incident Contacts

| Role | Contact | Response |
|------|---------|----------|
| Security Team | security@insurance-lead-gen.com | 15 min |
| Platform Team | platform@insurance-lead-gen.com | 30 min |
| On-Call | PagerDuty | Immediate |

## 📚 References

- [NIST Cybersecurity Framework](https://www.nist.gov/cyberframework)
- [CIS Kubernetes Benchmark](https://www.cisecurity.org/benchmark/kubernetes)
- [OWASP Kubernetes Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Kubernetes_Cheat_Sheet.html)
- [AWS Security Best Practices](https://docs.aws.amazon.com/security/)
