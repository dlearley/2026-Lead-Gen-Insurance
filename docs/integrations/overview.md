# Integrations Overview

The platform supports integrations to synchronize leads and activities with CRMs, deliver communications (email/SMS/phone), and connect marketing + analytics tooling.

## Integration Patterns

### API-based sync
Use the REST API for:
- Lead creation / updates
- Status and ownership updates
- Campaign configuration

See: [API Overview](../api/overview.md)

### Webhook-based event delivery
Use webhooks to receive events such as lead creation, status changes, and activity logs.

See: [Webhooks](../api/webhooks.md)

### Import/export
For bulk operations, use:
- API pagination + batching
- Scheduled jobs

## Security
- Use least-privilege API keys per integration
- Rotate credentials periodically
- Validate webhook signatures

## CRM Integrations
- [Salesforce](./salesforce.md)
- [HubSpot](./hubspot.md)
- [Microsoft Dynamics 365](./dynamics.md)
- [Zoho CRM](./zoho.md)
- [Pipedrive](./pipedrive.md)

## Communication Integrations
- [Email](./email.md)
- [SMS](./sms.md)
- [Phone](./phone.md)

## Marketing Integrations
- [Facebook Ads](./facebook-ads.md)
- [Google Ads](./google-ads.md)
- [LinkedIn](./linkedin.md)
- [Mailchimp](./mailchimp.md)

## Analytics Integrations
- [Google Analytics](./google-analytics.md)
- [Mixpanel](./mixpanel.md)
- [Hotjar](./hotjar.md)
