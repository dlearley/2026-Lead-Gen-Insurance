# Observability Best Practices

## Metrics
- **Naming**: Use `snake_case`. Include units (e.g., `_seconds`, `_total`).
- **Cardinality**: Avoid using high-cardinality labels like `user_id` or `email`.
- **Labels**: Always include `service` and `env`.

## Logging
- **Format**: Always use JSON format for structured logs.
- **Context**: Include `trace_id` and `request_id` in every log.
- **Level**: Use `debug` for development, `info` for major events, `warn` for non-critical issues, and `error` for exceptions.

## Tracing
- **Instrumentation**: Trace every external call (DB, HTTP, Queue).
- **Decorators**: Use `@Trace()` for important business logic methods.
- **Attributes**: Add business-relevant attributes to spans (e.g., `lead_id`).

## Dashboards
- **Design**: Put high-level metrics at the top, details at the bottom.
- **Consistency**: Use consistent colors for the same services across different dashboards.
- **Documentation**: Add links to runbooks in dashboard panels.
