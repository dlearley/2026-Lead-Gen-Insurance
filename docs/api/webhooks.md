# Webhooks

Webhooks let the platform push events to your system in real time.

For the full webhook event list, payloads, signature verification examples, and retry policy, see [API Overview](./overview.md#webhooks).

## When to Use Webhooks

- Keep a CRM in sync with lead updates
- Trigger automated follow-up when a lead is created/qualified
- Track delivery outcomes for communications

## Reliability Guidance

- Return **HTTP 200** quickly (within a few seconds)
- Process the payload asynchronously (queue/background job)
- Verify signatures for every request
- Implement idempotency (you may receive retries)

## Troubleshooting

- If your endpoint is failing repeatedly, the platform will back off and may disable delivery.
- Use the event `request_id`/delivery identifiers (if provided) when contacting support.
