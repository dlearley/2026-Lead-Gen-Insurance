# Microsoft Dynamics 365 Integration

This guide covers a typical Microsoft Dynamics 365 (Dataverse) integration.

## Use Cases
- Sync newly created leads into Dynamics
- Keep lead status/owner in sync
- Write back activity notes and call outcomes

## Recommended Approach
1. Use the platform API for lead read/write
2. Subscribe to platform webhooks (lead created/updated)
3. Map platform lead fields to Dynamics Lead entity fields

## Setup Checklist
- [ ] Create a Dynamics app registration (Azure AD)
- [ ] Configure required API permissions/scopes
- [ ] Store credentials in a secret manager
- [ ] Implement webhook receiver + signature verification
- [ ] Implement idempotent upserts in Dynamics

## Troubleshooting
- Missing leads: verify webhook delivery logs and receiver responses
- Duplicates: ensure idempotency keys (e.g., platform lead ID)
- Auth failures: confirm token refresh and clock skew

See also:
- [Integrations Overview](./overview.md)
- [API Authentication](../api/authentication.md)
- [Webhooks](../api/webhooks.md)
