# Facebook Ads Integration

Connect Facebook Lead Ads forms to automatically ingest leads into the platform.

## Typical Flow

1. User fills out a Facebook Lead Ad form
2. Facebook sends a lead event to your webhook receiver
3. Your receiver calls the platform API to create a lead

## Setup Checklist

- [ ] Create a Facebook App and configure webhooks
- [ ] Subscribe to leadgen events for the relevant page
- [ ] Store access tokens securely
- [ ] Validate webhook signatures

## Troubleshooting

- Missing leads: confirm webhook subscription, permissions, and page connection
- Duplicates: use the Facebook lead ID + platform lead ID mapping

See also:

- [API Authentication](../api/authentication.md)
- [Lead Ingestion Runbook](../operations/runbooks/lead-ingestion.md)
