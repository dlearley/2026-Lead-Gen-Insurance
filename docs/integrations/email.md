# Email Integration

Email integrations enable sending and tracking emails from the platform and syncing email events into CRMs.

## Common Providers
- SMTP (basic)
- SendGrid / Mailgun / AWS SES (transactional)

## Recommended Setup
1. Configure provider credentials in the platform admin settings
2. Validate sender domains (SPF/DKIM/DMARC)
3. Enable event webhooks from the provider (delivery/bounce/spam)
4. Monitor bounce/spam rate and suppress invalid addresses

## Troubleshooting
- Emails not delivered: verify DNS (SPF/DKIM), provider logs, and suppression lists
- High bounce rate: validate email capture and hygiene

See also:
- [API Overview](../api/overview.md)
- [Best Practices](../support/best-practices.md)
