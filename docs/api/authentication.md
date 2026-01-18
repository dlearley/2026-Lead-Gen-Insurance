# API Authentication

This page describes how to authenticate requests to the Insurance Lead Generation AI Platform API.

For the complete API reference (including examples, headers, and error formats), see [API Overview](./overview.md).

## Supported Authentication Methods

### 1) API Key (recommended for server-to-server integrations)
- Send the key via the `X-API-Key` header.

```bash
curl -H "X-API-Key: $API_KEY" \
  "https://api.insurance-leads-platform.com/v1/leads"
```

**Best practices**
- Store keys in a secret manager (never in git)
- Use separate keys per environment (staging vs production)
- Rotate keys on a schedule or after suspected exposure

### 2) OAuth 2.0 (recommended for user-context apps)
OAuth is used when you need to act on behalf of a user and enforce scopes.

Supported flows:
- Authorization Code Flow
- Client Credentials Flow (service accounts)

Example bearer token usage:
```bash
curl -H "Authorization: Bearer $ACCESS_TOKEN" \
  "https://api.insurance-leads-platform.com/v1/leads"
```

## Scopes
Scopes limit what an OAuth token can do (e.g., `leads:read`, `leads:write`).

See the scopes table in [API Overview](./overview.md#scopes).

## Troubleshooting
- **401 Unauthorized**: missing/invalid API key or token
- **403 Forbidden**: token is valid but scope/role is insufficient
- **429 Too Many Requests**: you hit a rate limit; implement backoff and respect `Retry-After`
