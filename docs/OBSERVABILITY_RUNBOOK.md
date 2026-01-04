# Observability Runbook

## Monitoring Stack Overview
- **Prometheus**: Metrics collection and alerting.
- **Grafana**: Visualization and dashboards.
- **Jaeger**: Distributed tracing.
- **Loki**: Centralized logging.

## Accessing Dashboards
- URL: `http://grafana.example.com`
- Main Dashboard: `System Overview`

## Common Tasks

### 1. Investigating a Service Outage
1. Check `System Overview` dashboard for overall health.
2. Drill down into the specific service dashboard (e.g., `API Performance`).
3. Use Jaeger to find slow traces or errors in distributed calls.
4. Check Loki logs for error messages.

### 2. Adding a New Metric
1. Use `MetricsCollector` in `packages/core`.
2. Update `recording-rules.yml` if aggregation is needed.
3. Add the metric to a Grafana dashboard.

### 3. Tuning Alert Thresholds
1. Locate the alert in `monitoring/prometheus/alert-rules.yml`.
2. Adjust the `expr` or `for` duration.
3. Reload Prometheus configuration.

## Troubleshooting the Stack
- Prometheus not scraping: Check `targets.yml` and service discovery.
- Loki not receiving logs: Check Fluent Bit/Promtail logs.
- Jaeger UI empty: Check if services are sending traces to the collector.
