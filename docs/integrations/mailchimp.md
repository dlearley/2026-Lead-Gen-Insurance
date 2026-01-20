# Mailchimp Integration

Mailchimp is typically used for email campaigns and audience management.

## Use Cases

- Add qualified leads to an audience segment
- Trigger nurture campaigns based on lead status
- Sync unsubscribe/consent events back to the platform

## Recommended Approach

- Use Mailchimp API to upsert contacts
- Maintain an explicit opt-in/consent field mapping
- Handle unsubscribe events as high priority

See also:

- [Email Integration](./email.md)
- [GDPR Compliance](../compliance/gdpr.md)
