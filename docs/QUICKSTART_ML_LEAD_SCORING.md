# ML Lead Scoring v2.0 - Quick Start Guide

This guide will help you get the ML Lead Scoring system up and running quickly.

## Prerequisites

- Node.js 18+ and pnpm installed
- Python 3.9+ installed
- PostgreSQL database with lead data
- At least 8GB RAM for model training
- Environment variables configured

## Step 1: Install Dependencies

### TypeScript/Node.js Dependencies
```bash
# Install all workspace dependencies
pnpm install

# Build packages
pnpm --filter @insurance-lead-gen/ai-services build
```

### Python Dependencies
```bash
# Create virtual environment
cd ml-models
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt
```

## Step 2: Configure Environment

Create or update `.env` file in project root:
```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/insurance_leads"

# ML Models Path (optional, defaults to ml-models/models)
ML_MODELS_PATH="/path/to/ml-models/models"

# API Configuration
PORT=3000
NODE_ENV=development
```

## Step 3: Train Models (First Time Setup)

### Option A: Full Training Pipeline (Recommended)
```bash
cd ml-models/scripts
./train_all_models.sh
```

This will:
1. Extract training data from database
2. Train baseline logistic regression model
3. Train advanced models (XGBoost, LightGBM, CatBoost)
4. Create ensemble model
5. Train vertical-specific models

**Expected Time:** 30-60 minutes

### Option B: Step-by-Step Training
```bash
cd ml-models/scripts

# 1. Extract data
python3 extract_training_data.py

# 2. Train baseline
python3 train_baseline_model.py

# 3. Train advanced models
python3 train_advanced_models.py

# 4. Create ensemble
python3 train_ensemble_model.py

# 5. Train vertical models (optional)
python3 train_vertical_models.py
```

### Skip Training (For Testing)
If you just want to test the API without training models, the system will work with the rule-based scoring service as a fallback.

## Step 4: Start the API Server

```bash
# From project root
cd apps/api
pnpm dev

# Or use the main dev script
pnpm dev
```

The API will be available at `http://localhost:3000`

## Step 5: Test the ML Scoring API

### Health Check
```bash
curl http://localhost:3000/health
```

### Score a Single Lead
```bash
curl -X POST http://localhost:3000/api/v1/lead-scoring-ml/score/YOUR_LEAD_ID \
  -H "Content-Type: application/json" \
  -d '{"useVerticalModel": true}'
```

### Get Model Info
```bash
curl http://localhost:3000/api/v1/lead-scoring-ml/model-info
```

### Get Score Distribution
```bash
curl http://localhost:3000/api/v1/lead-scoring-ml/score-distribution
```

## Step 6: Run Batch Scoring

### Score Recent Leads
```bash
cd apps/api
pnpm exec ts-node src/scripts/batch-score-leads.ts
```

### Score All Leads (Refresh)
```bash
pnpm exec ts-node src/scripts/batch-score-leads.ts --refresh-all
```

### Score Specific Vertical
```bash
pnpm exec ts-node src/scripts/batch-score-leads.ts --vertical=pc
```

## Step 7: Set Up A/B Testing

### Get Active Tests
```bash
curl http://localhost:3000/api/v1/ab-testing/tests
```

### Assign Lead to Variant
```bash
curl -X POST http://localhost:3000/api/v1/ab-testing/assign/YOUR_LEAD_ID \
  -H "Content-Type: application/json" \
  -d '{"testName": "ml_lead_scoring_v2"}'
```

### Check Test Results (After Test Period)
```bash
curl http://localhost:3000/api/v1/ab-testing/tests/ml_lead_scoring_v2/results
```

## Step 8: Schedule Batch Scoring (Production)

### Using Cron
```bash
# Edit crontab
crontab -e

# Add daily batch scoring at 2 AM
0 2 * * * cd /app/apps/api && /usr/bin/ts-node src/scripts/batch-score-leads.ts >> /var/log/batch-scoring.log 2>&1
```

### Using PM2
```bash
# Install PM2 globally
npm install -g pm2

# Create PM2 ecosystem file
# ecosystem.config.js
module.exports = {
  apps: [{
    name: 'api',
    script: 'dist/index.js',
    cwd: './apps/api',
    instances: 2,
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    }
  }]
};

# Start with PM2
pm2 start ecosystem.config.js
```

## Common Issues & Solutions

### Issue: Models Not Found
**Error:** `Model not available: ensemble`

**Solution:**
1. Check if models were trained successfully
2. Verify `ML_MODELS_PATH` environment variable
3. Check file permissions
4. Re-run model training

### Issue: Database Connection Failed
**Error:** `Failed to connect to database`

**Solution:**
1. Verify `DATABASE_URL` is correct
2. Check database is running
3. Verify network connectivity
4. Check database credentials

### Issue: Low Model Performance
**Symptom:** Accuracy < 80%

**Solution:**
1. Check if sufficient training data (1000+ leads with conversions)
2. Verify data quality (no missing labels)
3. Review feature engineering logic
4. Increase hyperparameter tuning trials
5. Collect more data

### Issue: High API Latency
**Symptom:** Response time > 200ms

**Solution:**
1. Check model file size
2. Enable model caching
3. Use batch scoring for bulk operations
4. Consider model quantization
5. Optimize feature extraction

### Issue: Python Dependencies Conflict
**Error:** Package version conflicts

**Solution:**
```bash
# Create fresh virtual environment
rm -rf venv
python3 -m venv venv
source venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt
```

## Monitoring

### Check Model Performance
```bash
# View baseline metrics
cat ml-models/models/baseline/baseline_metrics.json

# View ensemble metrics
cat ml-models/models/ensemble/ensemble_metrics.json

# Compare models
cat ml-models/models/model_comparison.csv
```

### Monitor API Logs
```bash
# In development
tail -f apps/api/logs/api.log

# Check scoring events
grep "Lead scored successfully" apps/api/logs/api.log
```

### Database Queries
```sql
-- Score distribution
SELECT 
  CASE 
    WHEN "qualityScore" >= 80 THEN 'high'
    WHEN "qualityScore" >= 60 THEN 'medium'
    WHEN "qualityScore" >= 40 THEN 'low'
    ELSE 'very_low'
  END as quality_level,
  COUNT(*) as count,
  AVG("qualityScore") as avg_score
FROM "Lead"
WHERE "qualityScore" IS NOT NULL
GROUP BY quality_level
ORDER BY quality_level;

-- Recent scores
SELECT 
  id, 
  "firstName", 
  "lastName", 
  "qualityScore", 
  metadata->'ml_score' as ml_score
FROM "Lead"
WHERE metadata->'ml_score' IS NOT NULL
ORDER BY "createdAt" DESC
LIMIT 10;
```

## Next Steps

1. **Review Documentation:**
   - [Full Documentation](PHASE_16.3.2_ML_LEAD_SCORING.md)
   - [ML Models README](../ml-models/README.md)

2. **Run A/B Test:**
   - Let test run for 2-4 weeks
   - Monitor metrics daily
   - Review results before full rollout

3. **Optimize Performance:**
   - Profile API endpoints
   - Optimize feature extraction
   - Consider ONNX export

4. **Set Up Monitoring:**
   - Configure Prometheus metrics
   - Set up Grafana dashboards
   - Create alerts for anomalies

5. **Plan Retraining:**
   - Schedule monthly retraining
   - Set up data drift detection
   - Automate model deployment

## Support

For issues or questions:
1. Check [Full Documentation](PHASE_16.3.2_ML_LEAD_SCORING.md)
2. Review [Troubleshooting](PHASE_16.3.2_ML_LEAD_SCORING.md#troubleshooting)
3. Check logs and error messages
4. Contact ML/Engineering team

## Resources

- **Documentation:** `docs/PHASE_16.3.2_ML_LEAD_SCORING.md`
- **ML Models:** `ml-models/README.md`
- **API Routes:** `apps/api/src/routes/lead-scoring-ml.ts`
- **Training Scripts:** `ml-models/scripts/`
- **Batch Pipeline:** `apps/api/src/scripts/batch-score-leads.ts`

---

**Happy Scoring! 🎯**
