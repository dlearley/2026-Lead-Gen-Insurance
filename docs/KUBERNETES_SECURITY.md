# Kubernetes Security Guide

This guide covers security best practices and configurations for Kubernetes deployments.

## Table of Contents

1. [Security Overview](#security-overview)
2. [RBAC Configuration](#rbac-configuration)
3. [Pod Security](#pod-security)
4. [Network Security](#network-security)
5. [Secrets Management](#secrets-management)
6. [Image Security](#image-security)
7. [Ingress Security](#ingress-security)
8. [Audit Logging](#audit-logging)
9. [Compliance](#compliance)
10. [Security Best Practices](#security-best-practices)

## Security Overview

### Security Layers

```
┌─────────────────────────────────────────────────────────┐
│                  Security Layers                        │
├─────────────────────────────────────────────────────────┤
│ 1. Cloud Provider Security (VPC, IAM)               │
│ 2. Cluster Security (Control Plane, Nodes)            │
│ 3. Network Security (Network Policies, Firewalls)       │
│ 4. Application Security (RBAC, Secrets, Images)        │
│ 5. Data Security (Encryption at Rest/Transit)         │
│ 6. Compliance & Auditing (Logging, Monitoring)          │
└─────────────────────────────────────────────────────────┘
```

### Security Posture

- **Defense in Depth** - Multiple security layers
- **Least Privilege** - Minimal necessary access
- **Zero Trust** - Verify all access requests
- **Encryption Everywhere** - Encrypt data at rest and in transit
- **Audit Everything** - Log all security events

## RBAC Configuration

### Service Accounts

Each service has dedicated service account:

```yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: api
  namespace: insurance-lead-gen-prod
  annotations:
    eks.amazonaws.com/role-arn: arn:aws:iam::ACCOUNT_ID:role/api
```

### Roles

Define minimal permissions:

```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: api-role
  namespace: insurance-lead-gen-prod
rules:
- apiGroups: [""]
  resources: ["configmaps", "secrets"]
  verbs: ["get", "list", "watch"]
- apiGroups: [""]
  resources: ["pods"]
  verbs: ["get", "list"]
```

### Role Bindings

Bind roles to service accounts:

```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: api-rolebinding
  namespace: insurance-lead-gen-prod
subjects:
- kind: ServiceAccount
  name: api
  namespace: insurance-lead-gen-prod
roleRef:
  kind: Role
  name: api-role
  apiGroup: rbac.authorization.k8s.io
```

### Cluster Roles

For cluster-wide permissions:

```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: monitoring-read
rules:
- apiGroups: ["metrics.k8s.io"]
  resources: ["pods", "nodes"]
  verbs: ["get", "list"]
```

### RBAC Best Practices

1. **Use Service Accounts** - Don't use default service account
2. **Least Privilege** - Grant only necessary permissions
3. **Namespace Scoping** - Keep roles namespace-scoped
4. **Regular Audits** - Review RBAC regularly
5. **Document Permissions** - Document why each permission is needed

## Pod Security

### Security Context

Run pods as non-root:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api
spec:
  template:
    spec:
      securityContext:
        runAsNonRoot: true
        runAsUser: 1000
        fsGroup: 1000
        seccompProfile:
          type: RuntimeDefault
      containers:
      - name: api
        securityContext:
          allowPrivilegeEscalation: false
          readOnlyRootFilesystem: true
          capabilities:
            drop:
            - ALL
```

### Capabilities

Drop all unnecessary capabilities:

```yaml
containers:
- name: api
  securityContext:
    capabilities:
      drop:
      - ALL
      # Only add necessary capabilities
      # add:
      # - NET_BIND_SERVICE
```

### Seccomp Profiles

Use seccomp profiles:

```yaml
securityContext:
  seccompProfile:
    type: RuntimeDefault
```

### Pod Security Standards

Apply Pod Security Standards (Pod Security Admission):

```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: insurance-lead-gen-prod
  labels:
    pod-security.kubernetes.io/enforce: restricted
    pod-security.kubernetes.io/audit: restricted
    pod-security.kubernetes.io/warn: restricted
```

### Security Baseline

**Baseline** security:
- Run as non-root
- Drop all capabilities
- Read-only root filesystem
- Seccomp profile enabled

**Restricted** security (production):
- All baseline requirements
- No privilege escalation
- No privileged containers
- Specific user ID
- Volume types restricted

## Network Security

### Network Policies

Default deny-all:

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: default-deny-ingress
  namespace: insurance-lead-gen-prod
spec:
  podSelector: {}
  policyTypes:
  - Ingress
---
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: default-deny-egress
  namespace: insurance-lead-gen-prod
spec:
  podSelector: {}
  policyTypes:
  - Egress
```

### Allow DNS

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-dns
  namespace: insurance-lead-gen-prod
spec:
  podSelector: {}
  policyTypes:
  - Egress
  egress:
  - to:
    - namespaceSelector:
        matchLabels:
          name: kube-system
    ports:
    - protocol: UDP
      port: 53
    - protocol: TCP
      port: 53
```

### Allow Service Communication

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: api-to-data-service
  namespace: insurance-lead-gen-prod
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
    ports:
    - protocol: TCP
      port: 3001
```

### Network Policy Best Practices

1. **Default Deny** - Start with deny-all policy
2. **Explicit Allow** - Only allow necessary traffic
3. **Namespace Isolation** - Isolate environments
4. **Label-Based** - Use labels for policy selection
5. **Regular Review** - Review policies regularly

## Secrets Management

### Kubernetes Secrets

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: api-secrets
  namespace: insurance-lead-gen-prod
type: Opaque
data:
  DATABASE_PASSWORD: <base64-encoded-password>
  API_KEY: <base64-encoded-key>
```

### Use Secrets in Pods

```yaml
containers:
- name: api
  envFrom:
  - secretRef:
      name: api-secrets
```

### AWS Secrets Manager (EKS)

```yaml
serviceAccountName: api
annotations:
  eks.amazonaws.com/role-arn: arn:aws:iam::ACCOUNT_ID:role/api
```

IAM role can access Secrets Manager.

### External Secrets Operator

Install External Secrets Operator for automatic sync:

```yaml
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: api-secrets
  namespace: insurance-lead-gen-prod
spec:
  refreshInterval: 1h
  secretStoreRef:
    name: aws-secrets-manager
    kind: SecretStore
  target:
    name: api-secrets
    creationPolicy: Owner
  data:
  - secretKey: database-password
    remoteRef:
      key: insurance-lead-gen/database-password
```

### Sealed Secrets

Encrypt secrets for Git:

```bash
kubeseal -f secret.yaml -w sealed-secret.yaml
```

### Secrets Best Practices

1. **Encrypt Secrets** - Use encryption at rest
2. **Don't Commit Secrets** - Never commit secrets to Git
3. **Use External Secret Store** - AWS Secrets Manager, Vault
4. **Rotate Regularly** - Rotate secrets periodically
5. **Limit Access** - Limit who can access secrets

## Image Security

### Image Scanning

Scan images for vulnerabilities:

```bash
# Trivy
trivy image insurance-lead-gen/api:prod

# Clair
clairctl scan insurance-lead-gen/api:prod

# Aqua
aqua scanner scan insurance-lead-gen/api:prod
```

### Admission Controllers

Use admission controllers to enforce security:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: kyverno
spec:
  # ... kyverno configuration
```

### Image Pull Policy

```yaml
spec:
  template:
    spec:
      containers:
      - name: api
        image: insurance-lead-gen/api:prod
        imagePullPolicy: Always
```

### Image Digests

Use image digests for reproducibility:

```yaml
spec:
  template:
    spec:
      containers:
      - name: api
        image: insurance-lead-gen/api@sha256:abc123...
```

### Image Security Best Practices

1. **Scan Images** - Scan all images before deployment
2. **Use Minimal Base** - Use minimal base images (alpine)
3. **Update Regularly** - Keep images updated
4. **Sign Images** - Sign images with Cosign
5. **Use Digests** - Use immutable image digests

## Ingress Security

### TLS Termination

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: api-ingress
  annotations:
    kubernetes.io/ingress.class: nginx
    cert-manager.io/cluster-issuer: letsencrypt-prod
spec:
  tls:
  - hosts:
    - api.insurance-platform.com
    secretName: api-prod-tls
```

### Security Headers

```yaml
annotations:
  nginx.ingress.kubernetes.io/configuration-snippet: |
    add_header X-Frame-Options "DENY" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header Content-Security-Policy "default-src 'self'" always;
```

### Rate Limiting

```yaml
annotations:
  nginx.ingress.kubernetes.io/limit-connections: "500"
  nginx.ingress.kubernetes.io/limit-rps: "250"
```

### IP Whitelisting

```yaml
annotations:
  nginx.ingress.kubernetes.io/whitelist-source-range: "10.0.0.0/8,172.16.0.0/12"
```

### WAF Integration

Integrate Web Application Firewall:

```yaml
annotations:
  nginx.ingress.kubernetes.io/enable-modsecurity: "true"
  nginx.ingress.kubernetes.io/modsecurity-transaction-id: "$request_id"
```

## Audit Logging

### Enable Audit Logging

```yaml
# kube-apiserver.yaml
--audit-log-path=/var/log/kubernetes/audit/audit.log
--audit-log-maxsize=100
--audit-log-maxbackup=10
--audit-log-maxage=30
--audit-policy-file=/etc/kubernetes/audit-policy.yaml
```

### Audit Policy

```yaml
apiVersion: audit.k8s.io/v1
kind: Policy
rules:
- level: Metadata
  verbs: ["get", "list", "watch"]
- level: Request
  verbs: ["create", "update", "delete"]
- level: RequestResponse
  namespaces: ["kube-system"]
  resources: ["secrets"]
```

### Centralized Logging

Send audit logs to centralized logging:

```yaml
# Fluent Bit configuration
[INPUT]
    Name tail
    Path /var/log/kubernetes/audit/audit.log
    Parser json
    Tag audit.*

[OUTPUT]
    Name elasticsearch
    Match audit.*
    Host elasticsearch.logging
    Port 9200
    Index kubernetes-audit
```

### Audit Best Practices

1. **Log Everything** - Log all API calls
2. **Retain Logs** - Keep logs for required period
3. **Centralize** - Send logs to centralized logging
4. **Monitor** - Monitor logs for security events
5. **Alert** - Set up alerts for suspicious activity

## Compliance

### CIS Benchmarks

Apply CIS Kubernetes Benchmark controls:

```bash
# kube-bench
kube-bench --version 1.29
```

### PCI DSS Compliance

- Encrypt data at rest and in transit
- Restrict access to cardholder data
- Regular security audits
- Network segmentation
- Access control

### SOC 2 Compliance

- Implement least privilege
- Monitor and log access
- Regular security assessments
- Change management
- Incident response

### GDPR Compliance

- Data protection by design
- Data minimization
- Right to be forgotten
- Data portability
- Consent management

## Security Best Practices

### 1. Use Pod Security Standards

```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: insurance-lead-gen-prod
  labels:
    pod-security.kubernetes.io/enforce: restricted
```

### 2. Implement Network Policies

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: default-deny-ingress
spec:
  podSelector: {}
  policyTypes:
  - Ingress
```

### 3. Use RBAC

```yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: api
---
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: api-role
rules:
- apiGroups: [""]
  resources: ["configmaps", "secrets"]
  verbs: ["get", "list", "watch"]
```

### 4. Encrypt Secrets

Use external secret store or encrypted secrets.

### 5. Scan Images

```bash
trivy image insurance-lead-gen/api:prod
```

### 6. Use Security Contexts

```yaml
securityContext:
  runAsNonRoot: true
  runAsUser: 1000
  readOnlyRootFilesystem: true
  capabilities:
    drop:
    - ALL
```

### 7. Enable Audit Logging

```yaml
--audit-log-path=/var/log/kubernetes/audit/audit.log
--audit-policy-file=/etc/kubernetes/audit-policy.yaml
```

### 8. Regular Updates

Keep Kubernetes, nodes, and images updated.

### 9. Security Scanning

Regular security assessments and penetration testing.

### 10. Incident Response

Have incident response plan in place.

## Security Checklist

### Cluster Security

- [ ] Kubernetes version is up-to-date
- [ ] Node OS is up-to-date
- [ ] Network policies implemented
- [ ] RBAC configured
- [ ] Pod security standards enforced
- [ ] Audit logging enabled
- [ ] Encryption at rest enabled
- [ ] Encryption in transit enabled

### Application Security

- [ ] Service accounts configured
- [ ] Secrets managed properly
- [ ] Images scanned for vulnerabilities
- [ ] Security contexts configured
- [ ] Resource limits set
- [ ] Health checks configured
- [ ] No privileged containers
- [ ] No hostPath mounts

### Network Security

- [ ] Default deny-all policy
- [ ] Explicit allow rules
- [ ] DNS allowed
- [ ] TLS enabled
- [ ] Rate limiting configured
- [ ] IP whitelisting where needed
- [ ] Ingress controller secured
- [ ] WAF enabled

### Compliance

- [ ] CIS benchmarks applied
- [ ] PCI DSS controls in place
- [ ] SOC 2 controls in place
- [ ] GDPR compliance
- [ ] Regular security audits
- [ ] Incident response plan
- [ ] Security training
- [ ] Documentation maintained

## Security Tools

### Image Scanning

- **Trivy** - Vulnerability scanner
- **Clair** - Container analysis
- **Aqua** - Container security platform

### Policy Enforcement

- **Kyverno** - Kubernetes native policy
- **OPA/Gatekeeper** - Policy as code
- **Polaris** - Configuration validation

### Secret Management

- **AWS Secrets Manager** - Secret management
- **Vault** - Secret and encryption
- **Sealed Secrets** - Kubernetes-native secrets

### Security Auditing

- **Kube-bench** - CIS benchmark
- **Kube-hunter** - Security hunting
- **Falco** - Runtime security

## Getting Help

- [Kubernetes Security Documentation](https://kubernetes.io/docs/concepts/security/)
- [CIS Kubernetes Benchmark](https://www.cisecurity.org/benchmark/kubernetes)
- [OWASP Kubernetes Security](https://cheatsheetseries.owasp.org/cheatsheets/Kubernetes_Security_Cheat_Sheet.html)

## Next Steps

- [Kubernetes Setup Guide](./KUBERNETES_SETUP.md)
- [Kubernetes Deployment Guide](./KUBERNETES_DEPLOYMENT.md)
- [Kubernetes Troubleshooting Guide](./KUBERNETES_TROUBLESHOOTING.md)
