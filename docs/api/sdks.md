# SDKs

Official SDKs simplify common API operations like creating leads, listing leads, and updating lead status.

For installation commands and code examples, see [API Overview](./overview.md#sdks).

## Recommended Usage Patterns
- Use environment variables / secret managers for API keys
- Centralize client initialization in one module
- Implement retries with exponential backoff for 429/503
- Prefer webhooks over polling when you need real-time updates
