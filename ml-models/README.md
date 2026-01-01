# ML Lead Scoring Models - Training & Deployment

This directory contains the machine learning models, training scripts, and data for the Lead Scoring Model v2.0.

## Directory Structure

```
ml-models/
├── README.md                 # This file
├── requirements.txt          # Python dependencies
├── data/                     # Training data
│   ├── training_data.parquet # Processed training data
│   └── training_data.csv     # Human-readable format
├── scripts/                  # Training scripts
│   ├── extract_training_data.py      # Data extraction from DB
│   ├── train_baseline_model.py       # Baseline logistic regression
│   ├── train_advanced_models.py      # XGBoost, LightGBM, CatBoost
│   ├── train_ensemble_model.py       # Ensemble model creation
│   ├── train_vertical_models.py      # Vertical-specific models
│   └── train_all_models.sh           # Master training script
├── models/                   # Trained models
│   ├── baseline/             # Baseline logistic regression
│   │   ├── baseline_model.pkl
│   │   ├── scaler.pkl
│   │   ├── label_encoders.pkl
│   │   └── baseline_metrics.json
│   ├── xgboost/              # XGBoost model
│   │   ├── xgboost.pkl
│   │   ├── params.json
│   │   └── metrics.json
│   ├── lightgbm/             # LightGBM model
│   │   ├── lightgbm.pkl
│   │   ├── params.json
│   │   └── metrics.json
│   ├── catboost/             # CatBoost model
│   │   ├── catboost.pkl
│   │   ├── params.json
│   │   └── metrics.json
│   ├── ensemble/             # Ensemble model
│   │   ├── ensemble_model.pkl
│   │   ├── ensemble_weights.json
│   │   └── ensemble_metrics.json
│   └── verticals/            # Vertical-specific models
│       ├── PC/               # Property & Casualty
│       ├── HEALTH/           # Health Insurance
│       └── COMMERCIAL/       # Commercial Insurance
└── notebooks/                # Jupyter notebooks for EDA
```

## Prerequisites

### Python Environment
```bash
# Create virtual environment
python3 -m venv venv
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt
```

### Database Access
Set the `DATABASE_URL` environment variable:
```bash
export DATABASE_URL="postgresql://user:password@host:5432/database"
```

## Training Pipeline

### Quick Start - Full Training
```bash
cd ml-models/scripts
chmod +x train_all_models.sh
./train_all_models.sh
```

This will:
1. Extract training data from database
2. Train baseline logistic regression model
3. Train advanced models (XGBoost, LightGBM, CatBoost)
4. Create ensemble model
5. Train vertical-specific models

### Step-by-Step Training

#### 1. Extract Training Data
```bash
cd ml-models/scripts
python3 extract_training_data.py
```

**Output:**
- `data/training_data.parquet` - Training dataset
- Prints data statistics and distributions

**Data Extracted:**
- Lead information (contact, source, metadata)
- Agent information (performance, ratings)
- Assignment information (timing, status)
- Conversion labels and time-to-conversion
- 100+ engineered features

#### 2. Train Baseline Model
```bash
python3 train_baseline_model.py
```

**Model:** Logistic Regression with L2 regularization

**Features:**
- SMOTE for class imbalance handling
- StandardScaler for feature normalization
- 5-fold stratified cross-validation
- ROC and PR curve generation
- Feature importance analysis

**Output:**
- `models/baseline/baseline_model.pkl`
- `models/baseline/scaler.pkl`
- `models/baseline/label_encoders.pkl`
- `models/baseline/baseline_metrics.json`
- Performance plots in `models/baseline/plots/`

#### 3. Train Advanced Models
```bash
python3 train_advanced_models.py
```

**Models Trained:**
1. XGBoost
2. LightGBM
3. CatBoost

**Features:**
- Optuna hyperparameter tuning (50 trials per model)
- Bayesian optimization for efficient search
- Early stopping to prevent overfitting
- Performance comparison with baseline

**Output:**
- Model files for each algorithm
- Hyperparameter configurations
- Performance metrics
- Model comparison report

**Expected Runtime:** 30-60 minutes (depending on hardware)

#### 4. Create Ensemble Model
```bash
python3 train_ensemble_model.py
```

**Strategy:**
- Weighted averaging of best models
- Grid search for optimal weights
- Validation set optimization

**Output:**
- `models/ensemble/ensemble_model.pkl`
- `models/ensemble/ensemble_weights.json`
- `models/ensemble/ensemble_metrics.json`

#### 5. Train Vertical-Specific Models
```bash
python3 train_vertical_models.py
```

**Verticals:**
1. Property & Casualty (P&C) - Auto + Home
2. Health Insurance
3. Commercial Insurance

**Features:**
- Vertical-specific feature importance
- Custom conversion thresholds per vertical
- Optimized for vertical-specific patterns

**Output:**
- Models for each vertical
- Vertical-specific thresholds
- Feature importance by vertical

## Model Evaluation

### Performance Metrics

All models are evaluated on:
- **Accuracy** - Overall correctness
- **Precision** - Quality of positive predictions
- **Recall** - Coverage of positive cases
- **F1 Score** - Harmonic mean of precision and recall
- **ROC-AUC** - Area under ROC curve
- **PR-AUC** - Area under Precision-Recall curve

### Target Performance
- Accuracy: >85%
- Precision: >80%
- Recall: >75%
- ROC-AUC: >0.85
- F1 Score: >0.77
- **20%+ improvement over baseline**

### Model Comparison

After training, review the model comparison report:
```bash
cat models/model_comparison.csv
```

Example output:
```
Model,Accuracy,Precision,Recall,F1 Score,ROC-AUC
Baseline,0.68,0.62,0.58,0.60,0.72
XGBoost,0.87,0.83,0.78,0.80,0.88
LightGBM,0.86,0.82,0.77,0.79,0.87
CatBoost,0.86,0.81,0.76,0.78,0.87
Ensemble,0.88,0.84,0.80,0.82,0.89
```

## Model Deployment

### Export to ONNX (for production)
```python
# For XGBoost
import onnxmltools
from skl2onnx.common.data_types import FloatTensorType

initial_type = [('float_input', FloatTensorType([None, n_features]))]
onnx_model = onnxmltools.convert_xgboost(model, initial_types=initial_type)
onnxmltools.utils.save_model(onnx_model, 'model.onnx')
```

### Integration with API
Models are loaded by the TypeScript Lead Scoring ML Service:
```typescript
import { getMLScoringService } from '@insurance-lead-gen/ai-services';

const scoringService = getMLScoringService();
await scoringService.initialize();

const score = await scoringService.scoreLead(leadId, features, vertical);
```

## Retraining

### When to Retrain
- Monthly: Incorporate latest conversion data
- On data drift: When feature/prediction distributions change significantly
- On performance degradation: When accuracy drops below threshold
- After major system changes

### Retraining Process
1. Extract fresh training data
2. Train new models
3. Evaluate on holdout test set
4. Compare with production model
5. A/B test if improvement >5%
6. Gradual rollout if successful

### Automated Retraining (Scheduled)
```bash
# Add to cron for monthly retraining
0 0 1 * * cd /app/ml-models/scripts && ./train_all_models.sh
```

## Troubleshooting

### Low Model Performance
**Symptom:** Accuracy < 80%

**Solutions:**
1. Check class imbalance - increase SMOTE oversampling
2. Add more features from lead metadata
3. Increase hyperparameter tuning trials
4. Collect more training data
5. Review feature engineering logic

### Training Errors
**Symptom:** Script crashes during training

**Solutions:**
1. Check database connection and credentials
2. Verify sufficient memory (8GB+ recommended)
3. Check Python dependencies versions
4. Review error stack trace
5. Reduce batch size or dataset size for testing

### Data Quality Issues
**Symptom:** Missing values or inconsistent data

**Solutions:**
1. Review data extraction query
2. Add missing value imputation
3. Validate data types and formats
4. Check database schema changes
5. Add data quality checks

## Best Practices

### Data Management
- Always version training data
- Document feature engineering logic
- Maintain data lineage
- Track data statistics over time

### Model Development
- Start simple (baseline) and iterate
- Use cross-validation for robust evaluation
- Track all experiments (MLflow recommended)
- Version control models and configs
- Document all hyperparameters

### Production Deployment
- A/B test before full rollout
- Monitor performance continuously
- Implement graceful fallbacks
- Log all predictions
- Set up alerting

## Performance Optimization

### Training Speed
- Use GPU-enabled XGBoost/LightGBM
- Reduce hyperparameter search space
- Use early stopping
- Parallel feature engineering
- Sample data for initial experiments

### Inference Speed
- Export to ONNX format
- Use model quantization
- Batch predictions when possible
- Cache frequently used features
- Implement model caching

## Additional Resources

- [Full Documentation](../docs/PHASE_16.3.2_ML_LEAD_SCORING.md)
- [XGBoost Docs](https://xgboost.readthedocs.io/)
- [LightGBM Docs](https://lightgbm.readthedocs.io/)
- [CatBoost Docs](https://catboost.ai/docs/)
- [Optuna Docs](https://optuna.readthedocs.io/)

## Support

For issues or questions:
1. Check documentation
2. Review error logs
3. Check GitHub issues
4. Contact ML team
