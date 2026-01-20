# Zoho CRM Integration

This guide provides a reference implementation approach for integrating with Zoho CRM.

## Use Cases

- Create/update Zoho Leads when platform leads are created or qualified
- Sync pipeline stage/status changes back to the platform

## Recommended Approach

- Use platform webhooks to receive lead events
- Use Zoho APIs to upsert Leads/Contacts
- Persist a mapping between platform IDs and Zoho record IDs

## Field Mapping Notes

- Normalize phone numbers (E.164)
- Keep status mapping explicit (platform statuses ↔ Zoho stages)

## Troubleshooting

- 401/403: verify Zoho OAuth scopes
- Rate limits: implement backoff + retry
- Data mismatch: log payloads and mapping decisions for replay

See also:

- [Integrations Overview](./overview.md)
- [API Overview](../api/overview.md)
