# Secure Development Guide

## Overview

This guide provides developers with security best practices, requirements, and procedures for building secure applications. All developers must follow these guidelines.

## Secure Development Lifecycle

### 1. Design Phase

#### Threat Modeling
- Conduct threat modeling for all new features
- Use STRIDE methodology (Spoofing, Tampering, Repudiation, Information Disclosure, Denial of Service, Elevation of Privilege)
- Document identified threats and mitigation strategies
- Review with security team before implementation

#### Security Requirements
- Define security requirements alongside functional requirements
- Identify data classification for all data handled
- Specify authentication and authorization requirements
- Define logging and monitoring needs

### 2. Development Phase

#### Secure Coding Standards

**Input Validation**
```typescript
// ✅ DO - Validate and sanitize all inputs
import { InputSanitizer } from '@lead-management/core/security';

const sanitizer = new InputSanitizer();
const cleanInput = sanitizer.sanitizeString(userInput);

// ❌ DON'T - Use unvalidated input directly
const query = `SELECT * FROM users WHERE name = '${userInput}'`;
```

**Parameterized Queries**
```typescript
// ✅ DO - Use parameterized queries
await db.query('SELECT * FROM users WHERE id = $1', [userId]);

// ❌ DON'T - String concatenation
await db.query(`SELECT * FROM users WHERE id = '${userId}'`);
```

**Output Encoding**
```typescript
// ✅ DO - Encode output
const encoded = he.encode(userInput);
response.send(`<div>${encoded}</div>`);

// ❌ DON'T - Send unencoded output
response.send(`<div>${userInput}</div>`);
```

#### Authentication & Authorization

```typescript
// ✅ DO - Verify JWT tokens
import { getJWTService } from '@lead-management/core/security';

const jwt = getJWTService();
const decoded = jwt.verifyAccessToken(token);
if (!decoded || decoded.role !== 'admin') {
  throw new UnauthorizedError();
}

// ✅ DO - Implement RBAC
const hasPermission = await rbac.checkPermission(userId, 'leads', 'read');
if (!hasPermission) {
  throw new ForbiddenError();
}
```

#### Error Handling

```typescript
// ✅ DO - Log errors securely
logger.error('Database error', { userId: currentUser.id, error: error.message });

// ❌ DON'T - Expose stack traces in production
res.status(500).json({ error: error.stack });
```

#### Sensitive Data Handling

```typescript
// ✅ DO - Encrypt sensitive data
import { EncryptionService } from '@lead-management/core/security';

const encryption = new EncryptionService();
const encrypted = encryption.encrypt(ssn);

// ✅ DO - Use secure logging
logger.info('User login', { userId: user.id });

// ❌ DON'T - Log sensitive data
logger.info('User login', { ssn: user.ssn, password: user.password });
```

### 3. Testing Phase

#### Security Testing Requirements

**Unit Tests**
- Test input validation
- Test authentication and authorization
- Test error handling
- Test for SQL injection
- Test for XSS

**Integration Tests**
- Test API security
- Test authentication flows
- Test authorization boundaries
- Test rate limiting

**Security Testing**
- Run SAST on every commit
- Run dependency scans daily
- Run container scans on image build
- Run DAST on staging environment

#### Example Security Test

```typescript
describe('Security Tests', () => {
  it('should prevent SQL injection', async () => {
    const maliciousInput = "'; DROP TABLE users; --";
    const result = await api.getUsers(maliciousInput);
    expect(result).not.toThrow();
    // Verify no data loss occurred
  });

  it('should prevent XSS', async () => {
    const maliciousInput = '<script>alert("XSS")</script>';
    const response = await api.saveContent(maliciousInput);
    expect(response.content).not.toContain('<script>');
  });
});
```

### 4. Deployment Phase

#### Pre-Deployment Checklist

- [ ] All security scans passed
- [ ] No critical or high vulnerabilities
- [ ] Dependencies are up to date
- [ ] Secrets are not in code
- [ ] Security headers are configured
- [ ] Audit logging is enabled
- [ ] MFA is required for admin access
- [ ] HTTPS is enforced
- [ ] Rate limiting is configured

#### Deployment Security

```bash
# ✅ DO - Use signed images
docker pull myregistry.io/app:sha256:abc123...

# ❌ DON'T - Use latest tag in production
docker pull myregistry.io/app:latest

# ✅ DO - Verify image signature
docker trust verify myregistry.io/app:sha256:abc123...
```

## Secure Coding Practices

### Authentication

#### Password Security
- Minimum 12 characters
- Require mix of letters, numbers, symbols
- Hash using bcrypt/scrypt/Argon2
- Never store plain text passwords
- Implement password complexity requirements

```typescript
import bcrypt from 'bcrypt';

// Password hashing
const saltRounds = 12;
const hashedPassword = await bcrypt.hash(plainPassword, saltRounds);

// Password verification
const isValid = await bcrypt.compare(plainPassword, hashedPassword);
```

#### Session Management
- Generate secure session tokens
- Implement session timeout (30 minutes inactivity)
- Invalidate sessions on logout
- Use httpOnly and secure cookies
- Implement concurrent session limits

```typescript
// Secure session cookie
session({
  secret: process.env.SESSION_SECRET,
  cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 30 * 60 * 1000, // 30 minutes
  },
});
```

### Authorization

#### Principle of Least Privilege
- Grant minimum necessary access
- Use role-based access control (RBAC)
- Implement resource-level permissions
- Regular permission audits

#### API Security
```typescript
// ✅ DO - Check permissions for each operation
router.get('/leads/:id', async (req, res) => {
  const lead = await db.getLead(req.params.id);

  // Check if user can access this specific lead
  if (!await rbac.canAccessLead(req.user.id, lead)) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  return res.json(lead);
});
```

### Data Protection

#### Encryption at Rest
```typescript
import { EncryptionService } from '@lead-management/core/security';

const encryption = new EncryptionService({
  key: process.env.ENCRYPTION_KEY,
});

// Encrypt sensitive fields
const user = {
  email,
  ssn: encryption.encrypt(ssn), // Encrypt SSN
  creditCard: encryption.encrypt(creditCard), // Encrypt card
};

// Decrypt when needed
const decryptedSSN = encryption.decrypt(user.ssn);
```

#### Encryption in Transit
```typescript
// Force HTTPS
app.use((req, res, next) => {
  if (req.protocol === 'http' && process.env.NODE_ENV === 'production') {
    return res.redirect(301, `https://${req.headers.host}${req.url}`);
  }
  next();
});
```

#### Sensitive Data Logging
```typescript
// ✅ DO - Mask sensitive data in logs
logger.info('Payment processed', {
  userId: payment.userId,
  amount: payment.amount,
  cardLast4: payment.cardNumber.slice(-4), // Only last 4 digits
});

// ❌ DON'T - Log full credit card
logger.info('Payment processed', {
  creditCard: payment.cardNumber,
});
```

### API Security

#### Rate Limiting
```typescript
import { createSecurityRateLimiter } from '@lead-management/core/security';

const rateLimiter = createSecurityRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 100,
});

app.use('/api/', rateLimiter);
```

#### Input Validation
```typescript
import { z } from 'zod';

const leadSchema = z.object({
  email: z.string().email(),
  phone: z.string().regex(/^\d{10}$/),
  firstName: z.string().min(1).max(50),
  lastName: z.string().min(1).max(50),
});

router.post('/leads', async (req, res) => {
  const validatedData = leadSchema.parse(req.body);
  // Process validated data
});
```

#### Security Headers
```typescript
import { createSecurityHeaders } from '@lead-management/core/security';

app.use(createSecurityHeaders({
  hsts: { maxAge: 31536000, includeSubDomains: true },
  frameguard: { action: 'deny' },
  noSniff: true,
  xssFilter: true,
}));
```

## Dependency Management

### Selecting Dependencies
- Prefer actively maintained libraries
- Check security advisories before adoption
- Review dependency popularity and stability
- Consider dependency size and attack surface

### Updating Dependencies
```bash
# Check for vulnerabilities
pnpm audit

# Update dependencies
pnpm update

# Check for outdated packages
pnpm outdated

# Generate lock file
pnpm install --frozen-lockfile
```

### Vulnerability Response
1. Monitor security advisories
2. Assess vulnerability impact
3. Test updates in staging
4. Deploy patches based on severity:
   - Critical: 7 days
   - High: 14 days
   - Medium: 30 days

## Code Review Checklist

### Security Review Points

- [ ] Input validation implemented
- [ ] Output encoding applied
- [ ] SQL injection prevented (parameterized queries)
- [ ] XSS prevention in place
- [ ] CSRF tokens implemented for state-changing operations
- [ ] Authentication required for protected resources
- [ ] Authorization checks implemented
- [ ] Sensitive data encrypted
- [ ] Error messages don't expose sensitive information
- [ ] Audit logging for sensitive operations
- [ ] Rate limiting where appropriate
- [ ] Security headers configured

### Example Review Comments

```typescript
// Reviewer Comment: This query is vulnerable to SQL injection
// Developer: Use parameterized query instead
// Before:
await db.query(`SELECT * FROM users WHERE id = '${id}'`);
// After:
await db.query('SELECT * FROM users WHERE id = $1', [id]);
```

## Secrets Management

### Best Practices

1. **Never commit secrets to code**
   - Use environment variables
   - Use secret management service
   - Add secrets to .gitignore

2. **Rotate secrets regularly**
   - Database passwords: 90 days
   - API keys: 30 days
   - Encryption keys: Annually

3. **Use different secrets per environment**
   - Development
   - Staging
   - Production

```typescript
// ✅ DO - Use environment variables
const dbPassword = process.env.DB_PASSWORD;

// ❌ DON'T - Hardcode secrets
const dbPassword = 'supersecret123';
```

## Security Testing

### Unit Testing

```typescript
describe('Authentication Security', () => {
  it('should reject weak passwords', () => {
    const weakPassword = 'password';
    expect(validatePassword(weakPassword)).toBe(false);
  });

  it('should accept strong passwords', () => {
    const strongPassword = 'Str0ngP@ssw0rd!';
    expect(validatePassword(strongPassword)).toBe(true);
  });
});
```

### Integration Testing

```typescript
describe('API Security', () => {
  it('should require authentication', async () => {
    const response = await request(app)
      .get('/api/leads')
      .expect(401);
  });

  it('should enforce rate limiting', async () => {
    for (let i = 0; i < 101; i++) {
      await request(app).get('/api/leads');
    }
    await request(app).get('/api/leads').expect(429);
  });
});
```

### Security Testing Tools

- **SAST**: CodeQL, Semgrep, SonarQube
- **Dependency Scanning**: npm audit, Snyk, Dependabot
- **Container Scanning**: Trivy, Grype
- **DAST**: OWASP ZAP, Burp Suite

## Security Monitoring

### Logging

```typescript
// Security event logging
import { auditLogger } from '@lead-management/core/security';

auditLogger.logAuthentication({
  userId: user.id,
  ipAddress: req.ip,
  userAgent: req.get('user-agent'),
  action: 'login',
  result: 'success',
  requestId: req.id,
});

auditLogger.logDataAccess({
  userId: user.id,
  resource: 'leads',
  resourceId: lead.id,
  action: 'read',
  result: 'success',
  requestId: req.id,
});
```

### Alerting

Set up alerts for:
- Failed authentication attempts (>5 in 5 minutes)
- SQL injection attempts
- XSS attempts
- Unauthorized access attempts
- Data exfiltration patterns
- Unusual API usage patterns

## Common Vulnerabilities

### SQL Injection

**Vulnerable Code:**
```typescript
const query = `SELECT * FROM users WHERE id = '${id}'`;
```

**Secure Code:**
```typescript
const query = 'SELECT * FROM users WHERE id = $1';
await db.query(query, [id]);
```

### Cross-Site Scripting (XSS)

**Vulnerable Code:**
```typescript
res.send(`<div>${userInput}</div>`);
```

**Secure Code:**
```typescript
const encoded = he.encode(userInput);
res.send(`<div>${encoded}</div>`);
```

### Cross-Site Request Forgery (CSRF)

**Vulnerable:**
- No CSRF token on POST requests

**Secure:**
```typescript
import csrf from 'csurf';

const csrfProtection = csrf({ cookie: true });
app.use(csrfProtection);

// Include token in forms
app.get('/form', (req, res) => {
  res.render('form', { csrfToken: req.csrfToken() });
});
```

### Broken Authentication

**Vulnerable:**
- Weak password requirements
- No rate limiting on login
- Session tokens in URLs

**Secure:**
```typescript
// Strong password requirements
const passwordSchema = z.string()
  .min(12)
  .regex(/[A-Z]/, 'Must contain uppercase letter')
  .regex(/[a-z]/, 'Must contain lowercase letter')
  .regex(/[0-9]/, 'Must contain number')
  .regex(/[^A-Za-z0-9]/, 'Must contain special character');

// Rate limiting
const loginRateLimiter = createSecurityRateLimiter({
  windowMs: 15 * 60 * 1000,
  maxRequests: 5,
});

app.post('/login', loginRateLimiter, async (req, res) => {
  // Login logic
});
```

## Resources

### External References
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [OWASP Cheat Sheet Series](https://cheatsheetseries.owasp.org/)
- [CWE Top 25](https://cwe.mitre.org/top25/)
- [SANS Top 25](https://www.sans.org/top25-software-errors/)

### Internal Resources
- [Security Policy](./SECURITY_POLICY.md)
- [Data Classification](./DATA_CLASSIFICATION.md)
- [Incident Response Plan](./INCIDENT_RESPONSE_PLAN.md)

---

**Document Owner**: Engineering & Security Teams
**Last Updated**: 2024-01-05
**Review Frequency**: Quarterly
**Version**: 1.0
