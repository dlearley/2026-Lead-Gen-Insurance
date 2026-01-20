# Pipedrive Integration

This guide provides an integration blueprint for synchronizing leads into Pipedrive.

## Use Cases

- Create deals/people in Pipedrive when new leads arrive
- Update deal stage when lead is qualified/assigned

## Recommended Approach

- Receive platform events via webhooks
- Upsert Pipedrive records using the lead's platform ID as the external key
- Use a small reconciliation job daily to catch missed updates

## Troubleshooting

- Duplicate records: enforce upsert logic on external key
- Webhook gaps: review receiver logs and retry policy

See also:

- [Integrations Overview](./overview.md)
- [Webhooks](../api/webhooks.md)
