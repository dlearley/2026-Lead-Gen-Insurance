# Google Ads Integration

Google Ads integrations are commonly used for:

- Tracking campaign attribution
- Offline conversion uploads
- Importing lead form extensions (when applicable)

## Recommended Approach

- Track `gclid` (and related identifiers) at lead creation time
- Store attribution metadata on the lead
- Upload offline conversions once leads reach qualified/converted states

## Troubleshooting

- Attribution missing: ensure landing pages persist `gclid` into lead payloads
- Conversion upload errors: verify Google Ads account access and schema

See also:

- [Integrations Overview](./overview.md)
- [Best Practices](../support/best-practices.md)
