# Load Testing Runbook: 2026-Lead-Gen-Insurance Platform

## 1. Overview
This runbook provides step-by-step instructions for executing and analyzing load tests for the 2026-Lead-Gen-Insurance platform. Following these procedures ensures consistent results and minimizes risk to other environments.

## 2. Prerequisites
Before starting any load test, ensure you have the following:
- **Environment**: Access to the staging cluster (e.g., `kubectl config use-context staging`).
- **Tools**: `k6` installed locally or access to the k6 Cloud account.
- **Monitoring**: Open the "Load Test Dashboard" in Grafana.
- **Tracing**: Open the Jaeger UI for deep-dive analysis.
- **Permissions**: Ensure you have the necessary API keys and credentials for the staging environment.

## 3. Preparation Steps
1. **Notify the Team**: Announce the start of the test in the `#eng-ops` Slack channel.
2. **Check System Health**: Ensure the staging environment is healthy before starting.
3. **Verify Data**: Ensure the staging database has a realistic amount of seed data.
4. **Baseline Check**: Note the current CPU and memory utilization of all services.

## 4. Executing Test Scenarios

### 4.1 Baseline Test (Scenario 1)
Purpose: Verify normal operation and detect performance regressions.
```bash
# Set base URL
export BASE_URL="http://api.staging.local"

# Run the test
k6 run scripts/load-tests/k6/baseline-test.js
```

### 4.2 Peak Load Test (Scenario 2)
Purpose: Validate performance under the highest expected daily load.
```bash
k6 run scripts/load-tests/k6/peak-load-test.js
```

### 4.3 Spike Test (Scenario 3)
Purpose: Test auto-scaling responsiveness and system stability during rapid growth.
```bash
k6 run scripts/load-tests/k6/spike-test.js
```

### 4.4 Soak Test (Scenario 4)
Purpose: Identify memory leaks and long-term stability issues.
```bash
# Use nohup or run in a background screen/tmux session
nohup k6 run scripts/load-tests/k6/soak-test.js > soak-test.log 2>&1 &
```

### 4.5 Stress Test (Scenario 5)
Purpose: Identify the maximum capacity and graceful degradation behavior.
```bash
k6 run scripts/load-tests/k6/stress-test.js
```

## 5. Monitoring During Execution
Watch the following panels on the Grafana Load Test Dashboard:
- **Request Rate (RPS)**: Ensure it matches the expected ramp-up curve.
- **p99 Latency**: Watch for spikes > 1000ms.
- **Error Rate**: Any sustained error rate > 1% should trigger an investigation.
- **HPA Status**: Observe new pod replicas being created as load increases.
- **DB Connection Pool**: Watch for saturation (Prisma connection errors).

## 6. Post-Test Analysis
1. **Generate Report**:
   ```bash
   ./scripts/load-tests/report-generator.sh
   ```
2. **Review Metrics**: Compare results against the SLO targets in `docs/LOAD_TESTING_STRATEGY.md`.
3. **Analyze Bottlenecks**: Use Jaeger to find the longest spans for slow requests.
4. **Impact Analysis**:
   ```bash
   ./scripts/monitoring/load-impact-analysis.sh <test_id> <start_time> <end_time>
   ```

## 7. Troubleshooting Common Issues

### 7.1 "Timed out waiting for connection from pool"
- **Cause**: Database connection pool exhausted.
- **Action**: Check if any queries are abnormally slow or if the pool size is too small.

### 7.2 "OOMKilled" Pods
- **Cause**: Memory leak or insufficient memory limits.
- **Action**: Analyze memory usage trends in Grafana; check Node.js heap dump.

### 7.3 High p99 Latency only for POST /leads
- **Cause**: Downstream validation service or DB lock contention.
- **Action**: Check Orchestrator logs and Postgres lock table.

### 7.4 Auto-scaling is too slow
- **Cause**: HPA `stabilizationWindowSeconds` is too high or metric collection is delayed.
- **Action**: Review and adjust `hpa-tuned.yaml`.

## 8. Cleanup and Reporting
1. **Terminate Processes**: Ensure all background k6 processes are killed.
2. **Reset Scaling**: If any manual scaling was performed, reset it.
3. **Delete Test Data**: If synthetic data was used, clear it from the database.
4. **Publish Results**: Share the HTML report link in the `#eng-performance` channel.

## 9. Conclusion
Regular execution of these procedures is vital for the continued stability and performance of the 2026-Lead-Gen-Insurance platform. Every major release should be accompanied by a successful Peak Load Test.
