# LinkedIn Integration

LinkedIn Lead Gen Forms can be connected to automatically ingest leads.

## Typical Flow

1. LinkedIn Lead Gen Form submission
2. LinkedIn sends (or you pull) lead data
3. Create/update lead in the platform via API

## Setup Checklist

- [ ] Create an integration app in LinkedIn
- [ ] Configure lead form permissions
- [ ] Implement secure token storage + refresh

## Troubleshooting

- Missing submissions: confirm permissions and form association
- Duplicates: use LinkedIn lead ID mapping

See also:

- [Integrations Overview](./overview.md)
- [API Overview](../api/overview.md)
