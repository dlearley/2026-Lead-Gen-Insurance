# Task 10.8: Advanced Monitoring & Cost Optimization - Quick Start

## Overview

This quick start guide will help you get started with the Advanced Monitoring & Cost Optimization system in under 5 minutes.

## Prerequisites

- Services running (data-service on port 3001, API on port 3000)
- Authentication token for API access

## Quick Examples

### 1. Record a Cost Metric

```bash
curl -X POST http://localhost:3000/api/v1/monitoring-cost/costs \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "service": "api-service",
    "resource": "ec2-compute",
    "cost": 125.50,
    "period": "daily",
    "tags": ["production"]
  }'
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "1234567890-abc123",
    "service": "api-service",
    "resource": "ec2-compute",
    "cost": 125.50,
    "currency": "USD",
    "period": "daily",
    "timestamp": "2024-01-15T10:30:00Z"
  }
}
```

### 2. Get Cost Report

```bash
curl "http://localhost:3000/api/v1/monitoring-cost/costs/report?startDate=2024-01-01&endDate=2024-01-31" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Response:**
```json
{
  "success": true,
  "data": {
    "period": {
      "start": "2024-01-01T00:00:00Z",
      "end": "2024-01-31T23:59:59Z"
    },
    "summary": {
      "totalCost": 15789.45,
      "currency": "USD",
      "costByCategory": [
        {
          "category": "compute",
          "totalCost": 7500.00,
          "percentage": 47.5,
          "trend": "stable"
        }
      ],
      "topCostDrivers": [],
      "trends": []
    },
    "budgetStatus": [],
    "optimizationOpportunities": [],
    "recommendations": []
  }
}
```

### 3. Create a Budget

```bash
curl -X POST http://localhost:3000/api/v1/monitoring-cost/budgets \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "name": "API Service Monthly Budget",
    "service": "api-service",
    "limit": 5000,
    "period": "monthly",
    "startDate": "2024-01-01T00:00:00Z",
    "endDate": "2024-01-31T23:59:59Z",
    "alerts": [
      {
        "threshold": 80,
        "enabled": true,
        "recipients": ["devops@example.com"],
        "channels": ["email", "slack"]
      }
    ]
  }'
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "budget-123",
    "name": "API Service Monthly Budget",
    "service": "api-service",
    "limit": 5000,
    "spent": 0,
    "remaining": 5000,
    "currency": "USD",
    "period": "monthly",
    "enabled": true
  }
}
```

### 4. Get Optimization Opportunities

```bash
curl http://localhost:3000/api/v1/monitoring-cost/optimization/opportunities \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "opt-123",
      "title": "Optimize API service costs",
      "description": "High cost resource identified: $2,500.00/month",
      "category": "compute",
      "potentialSavings": 750.00,
      "currency": "USD",
      "effort": "medium",
      "impact": "high",
      "priority": 1,
      "implementation": [
        "Review resource utilization patterns",
        "Implement auto-scaling policies",
        "Consider reserved instances"
      ],
      "roi": 300,
      "status": "identified"
    }
  ],
  "count": 1,
  "totalPotentialSavings": 750.00
}
```

### 5. Get System Health

```bash
curl http://localhost:3000/api/v1/monitoring-cost/monitoring/health \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "service": "api",
      "status": "healthy",
      "uptime": 99.98,
      "responseTime": 142,
      "errorRate": 0.2,
      "throughput": 125,
      "checks": [
        {
          "name": "database",
          "status": "pass",
          "message": "Database connection healthy",
          "duration": 12
        }
      ],
      "lastCheck": "2024-01-15T10:30:00Z"
    }
  ],
  "count": 1
}
```

### 6. Get Resource Utilization

```bash
curl http://localhost:3000/api/v1/monitoring-cost/monitoring/utilization \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "service": "api",
      "resourceType": "cpu",
      "current": 0.5,
      "allocated": 1.0,
      "utilization": 50,
      "recommendation": "optimal",
      "timestamp": "2024-01-15T10:30:00Z"
    },
    {
      "service": "api",
      "resourceType": "memory",
      "current": 512,
      "allocated": 1024,
      "utilization": 50,
      "recommendation": "optimal",
      "timestamp": "2024-01-15T10:30:00Z"
    }
  ],
  "count": 2
}
```

### 7. Create an Alert

```bash
curl -X POST http://localhost:3000/api/v1/monitoring-cost/alerts \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "severity": "critical",
    "title": "High API Error Rate",
    "description": "Error rate exceeded 5%",
    "service": "api-service",
    "metric": "error_rate",
    "threshold": 5.0,
    "currentValue": 7.2,
    "status": "firing"
  }'
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "alert-456",
    "severity": "critical",
    "title": "High API Error Rate",
    "description": "Error rate exceeded 5%",
    "service": "api-service",
    "status": "firing",
    "createdAt": "2024-01-15T10:30:00Z"
  }
}
```

### 8. Get Cost Forecast

```bash
curl "http://localhost:3000/api/v1/monitoring-cost/costs/forecast/api-service?days=30" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Response:**
```json
{
  "success": true,
  "data": {
    "service": "api-service",
    "period": {
      "start": "2024-01-15T00:00:00Z",
      "end": "2024-02-14T23:59:59Z"
    },
    "forecast": [],
    "trend": "stable",
    "factors": [
      "Historical cost trends",
      "Current resource utilization",
      "Planned infrastructure changes"
    ],
    "recommendations": [
      "Monitor cost trends closely",
      "Review optimization opportunities"
    ]
  }
}
```

## Common Workflows

### Workflow 1: Set Up Cost Tracking

1. **Record costs daily** for all services
2. **Create budgets** with alerts at 70%, 90%, and 100%
3. **Review cost reports** weekly
4. **Check optimization opportunities** monthly

### Workflow 2: Monitor Infrastructure

1. **Check system health** daily
2. **Review resource utilization** weekly
3. **Track SLOs** for critical services
4. **Investigate alerts** immediately

### Workflow 3: Optimize Costs

1. **Get optimization opportunities** monthly
2. **Prioritize by ROI and effort**
3. **Implement high-priority optimizations**
4. **Track savings** with cost reports

## API Endpoint Categories

### Cost Tracking
- `POST /costs` - Record cost metric
- `GET /costs/report` - Get cost report
- `GET /costs/allocation` - Get cost allocation
- `GET /costs/forecast/:service` - Get cost forecast
- `GET /costs/anomalies` - Get cost anomalies

### Budget Management
- `POST /budgets` - Create budget
- `GET /budgets` - List budgets
- `PATCH /budgets/:id` - Update budget
- `DELETE /budgets/:id` - Delete budget

### Optimization
- `GET /optimization/opportunities` - List opportunities
- `GET /optimization/infrastructure` - Infrastructure recommendations
- `GET /optimization/observability-costs` - Observability costs

### Monitoring
- `GET /monitoring/health` - System health
- `POST /monitoring/metrics` - Performance metrics
- `GET /monitoring/utilization` - Resource utilization
- `GET /monitoring/slo/:service` - SLO tracking

### Alerts
- `GET /alerts` - List alerts
- `POST /alerts` - Create alert
- `POST /alerts/:id/acknowledge` - Acknowledge alert
- `POST /alerts/:id/resolve` - Resolve alert

### Auto-scaling
- `GET /autoscaling/events` - Auto-scaling events

## Configuration

### Environment Variables

```env
# API endpoints
API_URL=http://localhost:3000
DATA_SERVICE_URL=http://localhost:3001

# Cost thresholds
COST_HIGH_THRESHOLD=1000
COST_GROWTH_THRESHOLD=0.2
OBSERVABILITY_COST_RATIO=0.05

# Utilization thresholds
HIGH_UTILIZATION_THRESHOLD=0.8
LOW_UTILIZATION_THRESHOLD=0.3
```

## Troubleshooting

### Issue: 401 Unauthorized

**Solution**: Ensure you're including a valid authentication token in the `Authorization` header.

### Issue: 500 Internal Server Error

**Solution**: Check the service logs:
```bash
# Data service logs
cd apps/data-service && npm run dev

# API service logs
cd apps/api && npm run dev
```

### Issue: Empty response data

**Solution**: The service uses in-memory storage. Make sure you've recorded some cost metrics first.

## Next Steps

1. **Read Full Documentation**: See `docs/TASK_10.8_MONITORING_COST_OPTIMIZATION.md`
2. **Explore API**: Try all 20+ endpoints
3. **Set Up Automation**: Schedule cost recording and report generation
4. **Configure Alerts**: Set up budget and performance alerts
5. **Integrate Cloud APIs**: Connect to AWS/GCP/Azure for automatic cost data

## Support

For issues or questions:
- Review documentation in `/docs`
- Check service logs
- Verify authentication tokens
- Ensure services are running on correct ports

## Summary

You now have a fully functional Advanced Monitoring & Cost Optimization system with:
- ✅ Cost tracking and reporting
- ✅ Budget management with alerts
- ✅ Optimization recommendations
- ✅ System health monitoring
- ✅ Performance metrics
- ✅ Alert management
- ✅ Cost forecasting

Happy monitoring and optimizing! 🎉
