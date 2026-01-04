#!/bin/bash

SERVICES=("api:3000" "data-service:3001" "orchestrator:3002" "backend:8000")

for service in "${SERVICES[@]}"; do
  url="http://$service/health"
  status=$(curl -s -o /dev/null -w "%{http_code}" "$url")
  if [ "$status" -eq 200 ]; then
    echo "[OK] $service is healthy"
  else
    echo "[ERROR] $service is down (Status: $status)"
  fi
done

# Database checks
# Check if postgres is accepting connections
if pg_isready -h postgres -p 5432 > /dev/null 2>&1; then
  echo "[OK] PostgreSQL is healthy"
else
  echo "[ERROR] PostgreSQL is down"
fi
