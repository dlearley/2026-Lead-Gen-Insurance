#!/usr/bin/env python3
"""
Lead Scoring Model v2.0 - Vertical-Specific Models
Trains separate models for P&C, Health, and Commercial insurance verticals.
"""

import os
import sys
import json
import numpy as np
import pandas as pd
import joblib
import xgboost as xgb
from sklearn.model_selection import train_test_split
from sklearn.metrics import (
    accuracy_score, precision_score, recall_score, f1_score,
    roc_auc_score, average_precision_score
)

# Set random seed for reproducibility
RANDOM_SEED = 42
np.random.seed(RANDOM_SEED)


def load_training_data(data_path):
    """Load training data"""
    print(f"Loading training data from {data_path}...")
    df = pd.read_parquet(data_path)
    return df


def prepare_features(df):
    """Prepare features"""
    from train_baseline_model import prepare_features as prep_fn
    return prep_fn(df)


def filter_by_vertical(df, vertical):
    """Filter data by insurance vertical"""
    print(f"\nFiltering data for {vertical} vertical...")
    
    vertical_mapping = {
        'pc': ['AUTO', 'HOME'],  # Property & Casualty
        'health': ['HEALTH'],
        'commercial': ['COMMERCIAL']
    }
    
    insurance_types = vertical_mapping.get(vertical, [])
    df_vertical = df[df['insuranceType'].isin(insurance_types)].copy()
    
    print(f"Found {len(df_vertical)} records for {vertical} vertical")
    print(f"Conversion rate: {df_vertical['converted'].mean()*100:.2f}%")
    
    return df_vertical


def train_vertical_model(X_train, y_train, X_val, y_val, vertical_name):
    """Train model for specific vertical"""
    print(f"\n=== Training {vertical_name} Model ===")
    
    # Use XGBoost as the base model (best performer from advanced models)
    params = {
        'objective': 'binary:logistic',
        'eval_metric': 'auc',
        'tree_method': 'hist',
        'random_state': RANDOM_SEED,
        'max_depth': 6,
        'learning_rate': 0.1,
        'n_estimators': 300,
        'min_child_weight': 3,
        'subsample': 0.8,
        'colsample_bytree': 0.8,
        'reg_alpha': 0.1,
        'reg_lambda': 1.0,
        'scale_pos_weight': sum(y_train == 0) / sum(y_train == 1)
    }
    
    model = xgb.XGBClassifier(**params)
    model.fit(X_train, y_train, eval_set=[(X_val, y_val)], verbose=True)
    
    print(f"✅ {vertical_name} model trained successfully")
    return model, params


def evaluate_model(model, X, y, model_name=''):
    """Evaluate model performance"""
    print(f"\n=== Evaluating {model_name} ===")
    
    # Make predictions
    y_pred = model.predict(X)
    y_pred_proba = model.predict_proba(X)[:, 1]
    
    # Calculate metrics
    accuracy = accuracy_score(y, y_pred)
    precision = precision_score(y, y_pred, zero_division=0)
    recall = recall_score(y, y_pred, zero_division=0)
    f1 = f1_score(y, y_pred, zero_division=0)
    roc_auc = roc_auc_score(y, y_pred_proba)
    pr_auc = average_precision_score(y, y_pred_proba)
    
    print(f"Accuracy:  {accuracy:.4f}")
    print(f"Precision: {precision:.4f}")
    print(f"Recall:    {recall:.4f}")
    print(f"F1 Score:  {f1:.4f}")
    print(f"ROC-AUC:   {roc_auc:.4f}")
    print(f"PR-AUC:    {pr_auc:.4f}")
    
    return {
        'accuracy': accuracy,
        'precision': precision,
        'recall': recall,
        'f1': f1,
        'roc_auc': roc_auc,
        'pr_auc': pr_auc
    }


def analyze_feature_importance(model, feature_names, vertical_name, output_dir):
    """Analyze and save feature importance for vertical"""
    print(f"\nAnalyzing feature importance for {vertical_name}...")
    
    importance = model.feature_importances_
    feature_importance = pd.DataFrame({
        'feature': feature_names,
        'importance': importance
    }).sort_values('importance', ascending=False)
    
    print(f"\nTop 10 features for {vertical_name}:")
    print(feature_importance.head(10))
    
    # Save feature importance
    output_path = os.path.join(output_dir, f'{vertical_name.lower()}_feature_importance.csv')
    feature_importance.to_csv(output_path, index=False)
    print(f"Saved feature importance to {output_path}")
    
    return feature_importance


def determine_vertical_thresholds(model, X_val, y_val):
    """Determine optimal score thresholds for vertical"""
    print("\nDetermining optimal thresholds...")
    
    y_pred_proba = model.predict_proba(X_val)[:, 1]
    
    # Calculate precision and recall at different thresholds
    from sklearn.metrics import precision_recall_curve
    precisions, recalls, thresholds = precision_recall_curve(y_val, y_pred_proba)
    
    # Find thresholds for different quality levels
    # High quality: 80%+ precision
    high_quality_idx = np.where(precisions >= 0.80)[0]
    high_quality_threshold = thresholds[high_quality_idx[0]] if len(high_quality_idx) > 0 else 0.8
    
    # Medium quality: 60-79% precision
    medium_quality_idx = np.where((precisions >= 0.60) & (precisions < 0.80))[0]
    medium_quality_threshold = thresholds[medium_quality_idx[0]] if len(medium_quality_idx) > 0 else 0.6
    
    # Low quality: 40-59% precision
    low_quality_threshold = 0.4
    
    thresholds_config = {
        'high_quality': float(high_quality_threshold),
        'medium_quality': float(medium_quality_threshold),
        'low_quality': float(low_quality_threshold),
        'very_low_quality': 0.0
    }
    
    print(f"Optimal thresholds: {thresholds_config}")
    return thresholds_config


def save_vertical_model(model, params, metrics, feature_importance, thresholds, vertical_name, output_dir):
    """Save vertical-specific model"""
    print(f"\nSaving {vertical_name} model...")
    
    vertical_dir = os.path.join(output_dir, vertical_name.lower())
    os.makedirs(vertical_dir, exist_ok=True)
    
    # Save model
    model_path = os.path.join(vertical_dir, f'{vertical_name.lower()}_model.pkl')
    joblib.dump(model, model_path)
    print(f"Saved model to {model_path}")
    
    # Save parameters
    params_path = os.path.join(vertical_dir, 'params.json')
    with open(params_path, 'w') as f:
        json.dump(params, f, indent=2)
    
    # Save metrics
    metrics_path = os.path.join(vertical_dir, 'metrics.json')
    with open(metrics_path, 'w') as f:
        metrics_serializable = {
            split: {k: float(v) if isinstance(v, (np.floating, np.integer)) else v 
                   for k, v in split_metrics.items()}
            for split, split_metrics in metrics.items()
        }
        json.dump(metrics_serializable, f, indent=2)
    
    # Save thresholds
    thresholds_path = os.path.join(vertical_dir, 'thresholds.json')
    with open(thresholds_path, 'w') as f:
        json.dump(thresholds, f, indent=2)


def main():
    """Main execution function"""
    try:
        # Load data
        data_path = os.path.join(
            os.path.dirname(__file__), '..', 'data', 'training_data.parquet'
        )
        df = load_training_data(data_path)
        
        # Prepare base features
        X_full, y_full, label_encoders = prepare_features(df)
        
        # Define verticals to train
        verticals = {
            'pc': 'Property & Casualty (P&C)',
            'health': 'Health Insurance',
            'commercial': 'Commercial Insurance'
        }
        
        models_dir = os.path.join(os.path.dirname(__file__), '..', 'models', 'verticals')
        os.makedirs(models_dir, exist_ok=True)
        
        all_results = {}
        
        # Train model for each vertical
        for vertical_key, vertical_name in verticals.items():
            print(f"\n{'='*60}")
            print(f"Processing {vertical_name}")
            print('='*60)
            
            try:
                # Filter data for vertical
                df_vertical = filter_by_vertical(df, vertical_key)
                
                if len(df_vertical) < 100:
                    print(f"⚠️  Insufficient data for {vertical_name} ({len(df_vertical)} records). Skipping...")
                    continue
                
                # Prepare features for vertical
                X_vertical, y_vertical, _ = prepare_features(df_vertical)
                
                # Split data (70/15/15)
                X_temp, X_test, y_temp, y_test = train_test_split(
                    X_vertical, y_vertical, test_size=0.15, 
                    random_state=RANDOM_SEED, stratify=y_vertical
                )
                X_train, X_val, y_train, y_val = train_test_split(
                    X_temp, y_temp, test_size=0.176,  # ~15% of original
                    random_state=RANDOM_SEED, stratify=y_temp
                )
                
                # Train model
                model, params = train_vertical_model(
                    X_train, y_train, X_val, y_val, vertical_name
                )
                
                # Evaluate
                metrics = {
                    'train': evaluate_model(model, X_train, y_train, f'{vertical_name} - Train'),
                    'val': evaluate_model(model, X_val, y_val, f'{vertical_name} - Val'),
                    'test': evaluate_model(model, X_test, y_test, f'{vertical_name} - Test')
                }
                
                # Feature importance
                feature_importance = analyze_feature_importance(
                    model, X_vertical.columns.tolist(), vertical_name, models_dir
                )
                
                # Determine thresholds
                thresholds = determine_vertical_thresholds(model, X_val, y_val)
                
                # Save model
                save_vertical_model(
                    model, params, metrics, feature_importance, 
                    thresholds, vertical_key.upper(), models_dir
                )
                
                all_results[vertical_name] = metrics['test']
                
                print(f"\n✅ {vertical_name} model completed successfully")
                
            except Exception as e:
                print(f"❌ Error training {vertical_name} model: {e}")
                import traceback
                traceback.print_exc()
                continue
        
        # Summary
        print("\n" + "="*60)
        print("VERTICAL MODELS SUMMARY")
        print("="*60)
        
        if all_results:
            results_df = pd.DataFrame(all_results).T
            print(results_df)
            
            # Save summary
            summary_path = os.path.join(models_dir, 'vertical_models_summary.csv')
            results_df.to_csv(summary_path)
            print(f"\nSaved summary to {summary_path}")
        else:
            print("No models were successfully trained")
        
        print("\n✅ Vertical-specific model training completed!")
        
    except Exception as e:
        print(f"\n❌ Error during vertical model training: {e}", file=sys.stderr)
        import traceback
        traceback.print_exc()
        sys.exit(1)


if __name__ == '__main__':
    main()
