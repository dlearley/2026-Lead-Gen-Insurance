#!/bin/bash
# Master script to train all lead scoring models

set -e

echo "========================================="
echo "Lead Scoring Model v2.0 - Full Training Pipeline"
echo "========================================="

# Check if Python is installed
if ! command -v python3 &> /dev/null; then
    echo "Error: Python 3 is not installed"
    exit 1
fi

# Get script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR"

# Step 1: Extract training data
echo ""
echo "Step 1/5: Extracting training data from database..."
python3 extract_training_data.py
if [ $? -ne 0 ]; then
    echo "Error: Data extraction failed"
    exit 1
fi

# Step 2: Train baseline model
echo ""
echo "Step 2/5: Training baseline (logistic regression) model..."
python3 train_baseline_model.py
if [ $? -ne 0 ]; then
    echo "Error: Baseline model training failed"
    exit 1
fi

# Step 3: Train advanced models (XGBoost, LightGBM, CatBoost)
echo ""
echo "Step 3/5: Training advanced models (XGBoost, LightGBM, CatBoost)..."
python3 train_advanced_models.py
if [ $? -ne 0 ]; then
    echo "Error: Advanced model training failed"
    exit 1
fi

# Step 4: Create ensemble model
echo ""
echo "Step 4/5: Creating ensemble model..."
python3 train_ensemble_model.py
if [ $? -ne 0 ]; then
    echo "Error: Ensemble model creation failed"
    exit 1
fi

# Step 5: Train vertical-specific models
echo ""
echo "Step 5/5: Training vertical-specific models..."
python3 train_vertical_models.py
if [ $? -ne 0 ]; then
    echo "Error: Vertical model training failed"
    exit 1
fi

echo ""
echo "========================================="
echo "✅ All models trained successfully!"
echo "========================================="
echo ""
echo "Next steps:"
echo "1. Review model metrics in ml-models/models/"
echo "2. Deploy models using the deployment script"
echo "3. Set up A/B testing framework"
echo ""
