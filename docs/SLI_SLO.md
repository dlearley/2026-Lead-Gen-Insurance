# Service Level Indicators (SLI) and Service Level Objectives (SLO)

## Overview
This document defines the SLIs and SLOs for the 2026-Lead-Gen-Insurance platform.

## SLI Definitions

### 1. Availability SLI
- **Definition**: The percentage of successful HTTP requests (non-5xx).
- **Measurement**: `sum(rate(http_requests_total{status!~"5.."}[5m])) / sum(rate(http_requests_total[5m]))`
- **Goal**: Measure the uptime and reliability of the services.

### 2. Latency SLI
- **Definition**: The percentage of requests completed within 500ms.
- **Measurement**: `sum(rate(http_request_duration_seconds_bucket{le="0.5"}[5m])) / sum(rate(http_request_duration_seconds_count[5m]))`
- **Goal**: Ensure the system meets performance requirements for a responsive user experience.

### 3. Error Rate SLI
- **Definition**: The percentage of requests that result in a 5xx error.
- **Measurement**: `sum(rate(http_requests_total{status=~"5.."}[5m])) / sum(rate(http_requests_total[5m]))`

### 4. Data Freshness SLI
- **Definition**: Time elapsed since the last successful data update.
- **Measurement**: `time() - data_last_updated_timestamp_seconds`

## SLO Targets

| Service | Availability SLO | Latency SLO (p99 < 500ms) | Error Rate SLO |
|---------|------------------|---------------------------|----------------|
| API Service | 99.9% | 95% | < 0.1% |
| Data Service | 99.95% | 90% | < 0.05% |
| Frontend | 99.5% | N/A | < 0.5% |
| Database | 99.99% | 99% (p99 < 100ms) | < 0.01% |

## Error Budgets
Error budgets are calculated on a monthly basis (30 days).

| SLO % | Monthly Downtime Allowed |
|-------|--------------------------|
| 99.9% | 43m 12s |
| 99.95%| 21m 36s |
| 99.99%| 4m 19s |

## Breach Notifications
- **80% Budget Consumed**: Warning notification to Slack.
- **100% Budget Consumed**: Critical alert to PagerDuty; shift focus from features to reliability.
