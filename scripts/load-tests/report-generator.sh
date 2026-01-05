#!/bin/bash

# Load Test Report Generator
set -e

RESULTS_DIR="./scripts/load-tests/results"
REPORT_DIR="./scripts/load-tests/reports"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

mkdir -p "$REPORT_DIR"

echo "Generating Load Test Report..."

for json_file in "$RESULTS_DIR"/*.json; do
  if [ -f "$json_file" ]; then
    filename=$(basename "$json_file")
    test_name="${filename%%_*}"
    
    echo "Processing $test_name results..."
    
    # In a real environment, we'd use a tool like 'k6-reporter' or a custom JS script
    # to convert the raw JSON into a nice HTML report with charts.
    
    cat <<EOF > "$REPORT_DIR/report_${test_name}_$TIMESTAMP.html"
<html>
<head><title>Load Test Report: $test_name</title></head>
<body>
  <h1>Load Test Report: $test_name</h1>
  <p>Generated at: $TIMESTAMP</p>
  <p>Raw Data: $filename</p>
  <div id="summary">
    <h2>Summary Metrics</h2>
    <ul>
      <li>Test Scenario: $test_name</li>
      <li>Status: COMPLETED</li>
      <!-- Metrics would be injected here -->
    </ul>
  </div>
</body>
</html>
EOF
  fi
done

echo "Reports generated in $REPORT_DIR"
