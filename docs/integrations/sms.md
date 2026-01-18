# SMS Integration

SMS integrations enable sending and tracking text messages for lead follow-up.

## Common Providers
- Twilio
- MessageBird

## Recommended Setup
1. Provision phone numbers (or short codes where required)
2. Configure compliance settings (opt-in/opt-out, quiet hours)
3. Implement provider callbacks/webhooks for delivery receipts
4. Ensure message templates are compliant for your jurisdiction

## Troubleshooting
- Undelivered messages: check provider status, message queue/backlog, and opt-out lists
- Carrier filtering: adjust content and avoid prohibited keywords

See also:
- [Integrations Overview](./overview.md)
- [Support Best Practices](../support/best-practices.md)
