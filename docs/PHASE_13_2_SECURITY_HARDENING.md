# Phase 13.2: Security Hardening & OAuth/SSO Implementation

## Overview

Phase 13.2 implements comprehensive security hardening and OAuth/SSO capabilities for the Insurance Lead Gen AI Platform. This phase introduces enterprise-grade authentication, session management, device fingerprinting, and security policies.

## Features Implemented

### 1. OAuth/SSO Provider Integration

#### Supported Providers
- **Google OAuth 2.0** - Consumer SSO via Google accounts
- **Microsoft Azure AD** - Enterprise SSO via Microsoft/Office 365
- **Generic OIDC** - Support for any OpenID Connect compliant provider

#### OAuth Features
- Authorization Code flow with PKCE
- Token refresh and revocation
- ID Token validation
- Single Sign-On (SSO) session management
- Domain restriction controls
- Auto-provisioning of users

### 2. Session Management

- **Secure Session Tokens** - Signed and encrypted session identifiers
- **Sliding Expiration** - Sessions remain active with usage
- **Absolute Timeout** - Maximum session duration enforcement
- **Concurrent Session Control** - Limit active sessions per user
- **Session Fingerprinting** - Tie sessions to device characteristics
- **Session Revocation** - Immediate invalidation capability

### 3. Device Fingerprinting

- **Browser Fingerprinting** - Canvas, WebGL, and header analysis
- **Device Recognition** - Track trusted devices
- **Risk Assessment** - Detect suspicious device changes
- **Trusted Devices** - Allowlist known devices
- **IP History** - Track IP addresses per device

### 4. Security Policies

#### Password Policy
- Minimum 12 characters (configurable)
- Uppercase, lowercase, numbers, special characters
- Common password prevention
- Keyboard pattern detection
- Username similarity prevention
- Email pattern prevention
- Configurable expiration

#### Account Lockout
- Failed attempt tracking by IP and user
- Configurable lockout threshold
- Automatic unlock after duration
- Suspicious activity detection
- Security event logging

#### IP Policy
- IP whitelist/blacklist support
- Rate limiting per IP
- Geographic anomaly detection

### 5. MFA Support

- **TOTP** - Time-based one-time passwords (Google Authenticator, Authy)
- **SMS OTP** - One-time passwords via SMS
- **Backup Codes** - Recovery codes for account access
- **WebAuthn** - FIDO2/Web Authentication support

## API Endpoints

### Authentication
```
POST /api/v1/auth/login              - Email/password login
POST /api/v1/auth/register            - User registration
POST /api/v1/auth/refresh             - Refresh access token
POST /api/v1/auth/logout              - Logout and revoke tokens
POST /api/v1/auth/password/validate   - Validate password strength
POST /api/v1/auth/password/reset/initiate  - Initiate password reset
```

### SSO Endpoints
```
POST /api/v1/auth/sso/initiate       - Start SSO flow
GET  /api/v1/auth/sso/callback       - SSO provider callback
```

### MFA Endpoints
```
POST /api/v1/auth/mfa/setup           - Setup MFA
POST /api/v1/auth/mfa/verify          - Verify MFA code
```

### Security Management
```
GET  /api/v1/auth/security/check      - Check security status
GET  /api/v1/auth/devices            - List trusted devices
DELETE /api/v1/auth/devices/:fp      - Remove trusted device
POST /api/v1/auth/devices/:fp/trust  - Trust a device
```

## Environment Variables

### SSO Configuration
```bash
# Enable SSO
SSO_ENABLED=true
SSO_DEFAULT_PROVIDER=google
SSO_ENFORCE_MFA=false
SSO_ALLOWED_DOMAINS=company.com,partner.org
SSO_AUTO_PROVISION_USERS=true
SSO_SESSION_TIMEOUT=86400000
SSO_SINGLE_LOGOUT_ENABLED=true

# Google OAuth
GOOGLE_CLIENT_ID=your-client-id
GOOGLE_CLIENT_SECRET=your-client-secret
GOOGLE_REDIRECT_URI=https://api.example.com/api/v1/auth/sso/callback

# Microsoft Azure AD
MICROSOFT_CLIENT_ID=your-client-id
MICROSOFT_CLIENT_SECRET=your-client-secret
MICROSOFT_REDIRECT_URI=https://api.example.com/api/v1/auth/sso/callback
MICROSOFT_TENANT_ID=your-tenant-id

# Generic OIDC
OIDC_CLIENT_ID=your-client-id
OIDC_CLIENT_SECRET=your-client-secret
OIDC_REDIRECT_URI=https://api.example.com/api/v1/auth/sso/callback
OIDC_AUTH_URL=https://your-idp.com/authorize
OIDC_TOKEN_URL=https://your-idp.com/token
OIDC_USERINFO_URL=https://your-idp.com/userinfo
OIDC_ISSUER=https://your-idp.com
OIDC_JWKS_URI=https://your-idp.com/.well-known/jwks.json
OIDC_SCOPES=openid email profile
```

### Session Configuration
```bash
SESSION_COOKIE_NAME=session_id
SESSION_COOKIE_SECRET=your-session-secret
SESSION_MAX_AGE=3600000           # 1 hour
SESSION_ABSOLUTE_TIMEOUT=2592000000  # 30 days
SESSION_INACTIVITY_TIMEOUT=1800000   # 30 minutes
SESSION_SLIDING_EXPIRATION=true
SESSION_CONCURRENT_SESSIONS=5
```

### Password Policy
```bash
PASSWORD_MIN_LENGTH=12
PASSWORD_MAX_LENGTH=128
PASSWORD_REQUIRE_UPPERCASE=true
PASSWORD_REQUIRE_LOWERCASE=true
PASSWORD_REQUIRE_NUMBERS=true
PASSWORD_REQUIRE_SPECIAL=true
PASSWORD_PREVENT_COMMON=true
PASSWORD_PREVENT_REUSED=5           # Check last 5 passwords
PASSWORD_PREVENT_SIMILAR=true
PASSWORD_PREVENT_KEYBOARD=true
PASSWORD_PREVENT_EMAIL=true
PASSWORD_EXPIRATION_DAYS=90
BCRYPT_ROUNDS=12
```

### Account Lockout
```bash
LOCKOUT_MAX_ATTEMPTS=5
LOCKOUT_DURATION=900000           # 15 minutes
FAILED_ATTEMPT_WINDOW=300000      # 5 minutes
NOTIFY_ON_LOCKOUT=true
NOTIFY_ON_SUSPICIOUS=true
```

### Device Fingerprinting
```bash
DEVICE_FINGERPRINTING_ENABLED=true
DEVICE_TRUST_DURATION=2592000000  # 30 days
MAX_DEVICES_PER_USER=5
DEVICE_RISK_THRESHOLD=70
BLOCK_SUSPICIOUS_DEVICES=false
STORE_IP_HISTORY=true
```

## Security Headers

The implementation includes comprehensive security headers via Helmet:

```typescript
{
  hsts: { maxAge: 31536000, includeSubDomains: true, preload: true },
  xssProtection: { enabled: true, mode: 'block' },
  contentTypeOptions: { enabled: true },
  frameOptions: { policy: 'SAMEORIGIN' },
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  permissionsPolicy: {
    camera: [], microphone: [], geolocation: [], payment: []
  }
}
```

## Files Created

### Core Security Services
1. `packages/core/src/security/oauth-sso.ts` - OAuth/SSO provider integration
2. `packages/core/src/security/session-management.ts` - Session management
3. `packages/core/src/security/device-fingerprinting.ts` - Device recognition
4. `packages/core/src/security/security-policy.ts` - Password/lockout policies

### API Routes
5. `apps/api/src/routes/auth.ts` - Authentication endpoints

### Types & Configuration
6. `packages/types/src/security.ts` - Security type definitions
7. `packages/config/src/env.ts` - Environment variable schema

### Documentation
8. `docs/PHASE_13_2_SECURITY_HARDENING.md` - This documentation

## Usage Examples

### Initiating SSO Login
```typescript
// Frontend initiates SSO
const response = await fetch('/api/v1/auth/sso/initiate', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ provider: 'google' })
});

const { authorizationUrl, state } = await response.json();
// Redirect user to authorizationUrl
```

### Complete SSO Callback Flow
```typescript
// After user authenticates with provider, callback is received
// Backend validates code, exchanges for tokens, and returns to frontend
const callbackParams = new URLSearchParams(window.location.search);
const accessToken = callbackParams.get('access_token');
const refreshToken = callbackParams.get('refresh_token');

// Store tokens securely and redirect to dashboard
```

### Password Strength Validation
```typescript
const response = await fetch('/api/v1/auth/password/validate', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ 
    password: 'MyPassword123!',
    username: 'john.doe',
    email: 'john@example.com'
  })
});

const result = await response.json();
// result: { score: 85, strength: 'good', errors: [], suggestions: [] }
```

### Device Management
```typescript
// List trusted devices
const response = await fetch('/api/v1/auth/devices', {
  headers: { 'Authorization': `Bearer ${accessToken}` }
});
const { devices } = await response.json();

// Trust a device after MFA verification
await fetch('/api/v1/auth/devices/fingerprint123/trust', {
  method: 'POST',
  headers: { 'Authorization': `Bearer ${accessToken}` }
});
```

## Security Best Practices

1. **Use HTTPS in Production** - All authentication requires TLS
2. **Enable HSTS** - Enforce HTTPS with `HSTS_PRELOAD=true`
3. **Rotate Secrets Regularly** - Use secret rotation for JWT secrets
4. **Monitor Security Events** - Integrate with SIEM for alerts
5. **Implement Rate Limiting** - Protect against brute force attacks
6. **Enable MFA** - Use `SSO_ENFORCE_MFA=true` for high security
7. **Regular Password Rotation** - Set `PASSWORD_EXPIRATION_DAYS`
8. **Review Session Activity** - Monitor concurrent sessions

## Compliance Considerations

### GDPR
- User consent management
- Data export capabilities
- Right to be forgotten
- Session data retention

### SOC 2
- Access logging and monitoring
- Session management controls
- Password policy enforcement
- Audit trail preservation

### HIPAA (if applicable)
- Enhanced session timeouts
- Automatic session termination
- Device verification
- Multi-factor authentication

## Testing Recommendations

1. **Penetration Testing** - Test authentication flows
2. **Credential Stuffing** - Verify lockout mechanisms
3. **Session Hijacking** - Test session fixation protection
4. **MFA Bypass** - Verify MFA enforcement
5. **SSO Integration** - Test provider callbacks
6. **Password Policy** - Validate all requirements

## Integration with Existing Services

### NATS Events
Security events are published to NATS for real-time monitoring:
```
security.event
audit.log
auth.login
auth.logout
```

### Redis
- Session storage (in production)
- Rate limiting counters
- Token blacklists
- Device fingerprints cache

### Audit Logging
All authentication events are logged for compliance:
- Login attempts (success/failure)
- Password changes
- MFA enrollment
- Session creation/revocation
- Device trust changes
