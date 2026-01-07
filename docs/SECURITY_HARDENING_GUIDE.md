# Security Hardening Guide

This document outlines the security measures implemented in the Insurance Lead Generation platform to make it production-grade.

## 1. Authentication & Authorization

### JWT-based Authentication
- All `/api/*` routes (except `/api/auth/login` and `/api/csrf-token`) require a valid JWT token.
- Tokens are signed using RS256 (asymmetric) or HS256 depending on configuration.
- Access tokens have a short TTL (15 minutes).
- Refresh tokens (7 days TTL) are used to obtain new access tokens.

### Role-Based Access Control (RBAC)
- **Roles**: `admin`, `broker`, `agent`, `system`.
- **Hierarchy**: `admin` > `system` > `broker` > `agent`.
- **Protection**: Use `requireRole(role)` or `requirePermission(permission)` middleware.

Example:
```typescript
router.post('/', authMiddleware, requirePermission('write:leads'), (req, res) => { ... });
```

## 2. Input Validation & Sanitization

### Validation
- All API inputs are validated using **Zod** schemas.
- Strict typing ensures only expected fields are processed.

### Sanitization
- All string inputs are sanitized to remove HTML tags and prevent XSS.
- Basic protection against SQL and NoSQL injection is applied at the middleware level.

## 3. Secrets Management

- Secrets are no longer hardcoded.
- Integration with **HashiCorp Vault** or **AWS Secrets Manager** is supported via the `SecretsManager` class in `@insurance-lead-gen/core`.
- Secrets are cached for 5 minutes to reduce API calls to the secrets provider.

## 4. Transport Security

- **HTTPS Enforcement**: All HTTP requests are redirected to HTTPS in production.
- **HSTS**: Strict-Transport-Security headers are set for 1 year.
- **TLS**: Only TLS 1.2+ and strong ciphers are allowed (configured at the load balancer/ingress level).

## 5. Security Headers

The following headers are set on all responses:
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `X-XSS-Protection: 1; mode=block`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Content-Security-Policy`: Strict CSP to prevent XSS.

## 6. CSRF & CORS

### CSRF Protection
- State-changing requests (POST, PUT, PATCH, DELETE) require an `X-CSRF-Token` header.
- Tokens are obtained from the `/api/csrf-token` endpoint.

### CORS
- Whitelisted origins only.
- Strict control over allowed methods and headers.

## 7. Rate Limiting

- **Global**: 1000 req/min per IP.
- **Per-User**: 500 req/min per authenticated user.
- **Sensitive Endpoints**:
  - Lead creation: 50 per hour per user.
  - Email sending: 10 per hour per user.

## 8. Consistent Responses

All API responses follow a standard format:
```json
{
  "success": true,
  "data": { ... },
  "timestamp": "2024-01-03T20:00:00.000Z",
  "requestId": "uuid-v4"
}
```

Errors are also standardized:
```json
{
  "success": false,
  "error": "Error message",
  "details": { ... },
  "timestamp": "2024-01-03T20:00:00.000Z",
  "requestId": "uuid-v4"
}
```
