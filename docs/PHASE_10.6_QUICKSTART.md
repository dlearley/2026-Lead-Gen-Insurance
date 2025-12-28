# Phase 10.6 Broker Network - Quick Start Guide

## Database Migration

First, you need to run the Prisma migration to create the new database tables:

```bash
# Generate migration
cd /home/engine/project
npx prisma migrate dev --name broker_network_phase_10_6

# Or for production
npx prisma migrate deploy
```

## Starting the Services

### 1. Start Infrastructure
```bash
docker-compose up -d
```

### 2. Start Data Service
```bash
cd apps/data-service
npm run dev
```

### 3. Start API Service
```bash
cd apps/api
npm run dev
```

## API Usage Examples

### Get Broker Network Profile
```bash
curl http://localhost:3000/api/broker-network/profile/{brokerId}
```

Response:
```json
{
  "id": "uuid",
  "brokerId": "broker-123",
  "networkTier": "bronze",
  "totalConnections": 5,
  "activeConnections": 4,
  "networkValue": 2500.0,
  "networkScore": 75,
  "referralMultiplier": 1.05,
  "createdAt": "2024-01-01T00:00:00Z",
  "updatedAt": "2024-01-15T00:00:00Z"
}
```

### Create a Broker Connection
```bash
curl -X POST http://localhost:3000/api/broker-network/connections \
  -H "Content-Type: application/json" \
  -d '{
    "brokerId": "broker-123",
    "connectedBrokerId": "broker-456",
    "relationshipType": "direct_referral",
    "message": "Would like to connect"
  }'
```

### Create a Referral
```bash
curl -X POST http://localhost:3000/api/broker-network/referrals \
  -H "Content-Type: application/json" \
  -d '{
    "referringBrokerId": "broker-123",
    "leadId": "lead-789",
    "receivingBrokerId": "broker-456",
    "commissionRate": 0.15,
    "referralReason": "Outside my service area",
    "notes": "Client is in northeast region"
  }'
```

### Update Referral Status (Convert)
```bash
curl -X PATCH http://localhost:3000/api/broker-network/referrals/{referralId}/status \
  -H "Content-Type: application/json" \
  -d '{
    "status": "converted",
    "commissionAmount": 1500.00
  }'
```

### Get Network Metrics
```bash
curl "http://localhost:3000/api/broker-network/metrics/{brokerId}?startDate=2024-01-01&endDate=2024-01-31"
```

### Calculate Network Value
```bash
curl http://localhost:3000/api/broker-network/value/{brokerId}
```

Response:
```json
{
  "directValue": 5000.0,
  "indirectValue": 2500.0,
  "totalValue": 7500.0,
  "networkMultiplier": 1.35,
  "connectionBreakdown": {
    "direct": 5000.0,
    "secondLevel": 2000.0,
    "thirdLevel": 500.0
  }
}
```

### Get Network Leaderboard
```bash
curl "http://localhost:3000/api/broker-network/leaderboard?limit=10"
```

### Analyze Network Effectiveness
```bash
curl http://localhost:3000/api/broker-network/effectiveness/{brokerId}
```

Response:
```json
{
  "score": 78,
  "metrics": {
    "connectionQuality": 0.65,
    "referralEfficiency": 0.42,
    "networkLeverage": 3.5,
    "growthRate": 0.15
  },
  "recommendations": [
    "Strengthen weak connections by engaging more frequently",
    "Increase referral activity with your network connections"
  ]
}
```

### Predict Network Growth
```bash
curl "http://localhost:3000/api/broker-network/prediction/{brokerId}?months=6"
```

Response:
```json
{
  "projectedScore": 120,
  "projectedConnections": 15,
  "projectedRevenue": 12500.0,
  "confidence": 0.85
}
```

## Common Workflows

### 1. Building Your Network

1. **Get or Create Profile**
   ```bash
   GET /api/broker-network/profile/{brokerId}
   ```
   Profile is auto-created on first access

2. **Add Connections**
   ```bash
   POST /api/broker-network/connections
   ```
   Add brokers you work with frequently

3. **Monitor Growth**
   ```bash
   GET /api/broker-network/score/{brokerId}
   GET /api/broker-network/growth/{brokerId}?period=month
   ```

### 2. Referring Leads

1. **Create Referral**
   ```bash
   POST /api/broker-network/referrals
   ```
   Specify lead, receiving broker, commission rate

2. **Track Status**
   ```bash
   GET /api/broker-network/referrals/{brokerId}
   ```

3. **Convert and Track Commission**
   ```bash
   PATCH /api/broker-network/referrals/{id}/status
   ```
   Set status to "converted" with commission amount

### 3. Managing Network Performance

1. **Check Network Score**
   ```bash
   GET /api/broker-network/score/{brokerId}
   ```

2. **Analyze Effectiveness**
   ```bash
   GET /api/broker-network/effectiveness/{brokerId}
   ```
   Get recommendations for improvement

3. **View Leaderboard**
   ```bash
   GET /api/broker-network/leaderboard
   ```
   Compare with other brokers

## Network Tier Progression

### Bronze to Silver (Score 75+)
- Add 5-10 active connections
- Complete 5-10 successful referrals
- Generate network value of $5,000+

### Silver to Gold (Score 150+)
- Maintain 10+ active connections
- Complete 20+ successful referrals
- Generate network value of $15,000+
- Leverage second-level connections

### Gold to Platinum (Score 300+)
- Build 20+ active connections
- Complete 50+ successful referrals
- Generate network value of $30,000+
- Strong third-level network

### Platinum to Diamond (Score 500+)
- Maintain 30+ active connections
- Complete 100+ successful referrals
- Generate network value of $50,000+
- Act as network hub/mentor

## Tips for Maximizing Network Value

1. **Diversify Connections**: Connect with brokers in different regions and specializations
2. **Maintain Active Relationships**: Regularly refer and receive referrals
3. **Leverage Second-Level**: Connect to brokers with large networks
4. **Document Referrals**: Always add referral reasons and notes
5. **Follow Up**: Track referral status and follow up promptly
6. **Share Knowledge**: Help other brokers build their networks
7. **Set Fair Commissions**: Reasonable rates encourage repeat referrals
8. **Analyze Regularly**: Use effectiveness analysis to identify improvements

## Monitoring

### Health Checks
```bash
# Data Service
curl http://localhost:3001/health

# API Service
curl http://localhost:3000/health
```

### Logs
```bash
# Data Service logs
docker-compose logs -f data-service

# API Service logs
docker-compose logs -f api
```

## Troubleshooting

### Migration Fails
```bash
# Reset database (WARNING: deletes all data)
npx prisma migrate reset

# Then re-run migration
npx prisma migrate dev --name broker_network_phase_10_6
```

### API Returns 404
- Check that services are running
- Verify route path is correct
- Check data service is accessible from API service

### Network Score Not Updating
```bash
# Manually trigger score recalculation (admin endpoint)
curl -X POST http://localhost:3000/api/broker-network/recalculate-scores
```

## Next Steps

1. Review full documentation: `docs/PHASE_10.6.md`
2. Check API endpoints: All endpoints listed above
3. Implement frontend components for broker network management
4. Set up monitoring for network metrics
5. Configure background jobs for score recalculation

## Support

For issues or questions:
- Check documentation in `docs/PHASE_10.6.md`
- Review API response messages
- Check service logs for errors
- Verify database schema is correct with Prisma Studio: `npx prisma studio`
