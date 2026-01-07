#!/bin/bash

# Performance Benchmarking Script
set -e

BASE_URL=${BASE_URL:-"http://api.local"}
OUTPUT_DIR="./scripts/load-tests/results"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

mkdir -p "$OUTPUT_DIR"

echo "Starting Performance Benchmark..."

# Function to run k6 and capture results
run_k6_test() {
  local test_name=$1
  local script_path=$2
  
  echo "Running $test_name..."
  k6 run --out json="$OUTPUT_DIR/${test_name}_$TIMESTAMP.json" "$script_path"
  
  # Extract key metrics (requires jq)
  if command -v jq &> /dev/null; then
    echo "Summary for $test_name:"
    # This is a simplified extraction, k6 summary is better but harder to parse from raw json here
    # Usually we use k6's built in summary or a custom collector
  fi
}

# Run Baseline
run_k6_test "baseline" "./scripts/load-tests/k6/baseline-test.js"

# Generate simple report
echo "Benchmark completed. Results stored in $OUTPUT_DIR"

# Compare with previous baseline if exists
PREVIOUS_BASELINE=$(ls -t "$OUTPUT_DIR/baseline_"*.json 2>/dev/null | sed -n '2p')
if [ -n "$PREVIOUS_BASELINE" ]; then
  echo "Comparing with previous baseline: $PREVIOUS_BASELINE"
  # Add comparison logic here
fi
