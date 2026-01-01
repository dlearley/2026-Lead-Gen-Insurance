#!/usr/bin/env python3
"""
Lead Scoring Model v2.0 - Ensemble Model
Creates an ensemble of the best performing models with weighted averaging.
"""

import os
import sys
import json
import numpy as np
import pandas as pd
import joblib
from sklearn.model_selection import train_test_split
from sklearn.metrics import (
    accuracy_score, precision_score, recall_score, f1_score,
    roc_auc_score, average_precision_score
)

# Set random seed for reproducibility
RANDOM_SEED = 42
np.random.seed(RANDOM_SEED)


def load_models(models_dir):
    """Load trained models"""
    print("Loading trained models...")
    
    models = {}
    model_names = ['xgboost', 'lightgbm', 'catboost']
    
    for model_name in model_names:
        model_path = os.path.join(models_dir, model_name, f'{model_name}.pkl')
        if os.path.exists(model_path):
            models[model_name] = joblib.load(model_path)
            print(f"Loaded {model_name}")
        else:
            print(f"Warning: {model_name} not found at {model_path}")
    
    return models


def load_training_data(data_path):
    """Load training data"""
    print(f"Loading training data from {data_path}...")
    df = pd.read_parquet(data_path)
    return df


def prepare_features(df):
    """Prepare features (same as training scripts)"""
    from train_baseline_model import prepare_features as prep_fn
    return prep_fn(df)


def split_data(X, y):
    """Split data (same as training scripts)"""
    from train_baseline_model import split_data as split_fn
    return split_fn(X, y)


class EnsembleModel:
    """Ensemble model that combines predictions from multiple models"""
    
    def __init__(self, models, weights=None):
        self.models = models
        self.model_names = list(models.keys())
        
        if weights is None:
            # Equal weights
            self.weights = {name: 1.0 / len(models) for name in self.model_names}
        else:
            # Normalize weights
            total = sum(weights.values())
            self.weights = {name: w / total for name, w in weights.items()}
        
        print(f"Ensemble weights: {self.weights}")
    
    def predict_proba(self, X):
        """Predict probabilities using weighted average"""
        predictions = []
        
        for name in self.model_names:
            model = self.models[name]
            pred_proba = model.predict_proba(X)[:, 1]
            weighted_pred = pred_proba * self.weights[name]
            predictions.append(weighted_pred)
        
        # Weighted average
        ensemble_pred = np.sum(predictions, axis=0)
        
        # Return as 2D array for compatibility
        return np.vstack([1 - ensemble_pred, ensemble_pred]).T
    
    def predict(self, X, threshold=0.5):
        """Predict class labels"""
        proba = self.predict_proba(X)[:, 1]
        return (proba >= threshold).astype(int)


def optimize_weights(models, X_val, y_val):
    """Optimize ensemble weights using validation set"""
    print("\nOptimizing ensemble weights...")
    
    # Try different weight combinations
    best_weights = None
    best_score = 0
    
    # Get predictions from each model
    model_predictions = {}
    for name, model in models.items():
        model_predictions[name] = model.predict_proba(X_val)[:, 1]
    
    # Grid search over weights
    weight_options = [0.2, 0.25, 0.3, 0.35, 0.4]
    
    for w1 in weight_options:
        for w2 in weight_options:
            w3 = 1.0 - w1 - w2
            if w3 < 0 or w3 > 1:
                continue
            
            weights = {
                list(models.keys())[0]: w1,
                list(models.keys())[1]: w2,
                list(models.keys())[2]: w3
            }
            
            # Calculate ensemble prediction
            ensemble_pred = sum(
                model_predictions[name] * weights[name]
                for name in models.keys()
            )
            
            # Evaluate
            score = roc_auc_score(y_val, ensemble_pred)
            
            if score > best_score:
                best_score = score
                best_weights = weights.copy()
    
    print(f"Best validation ROC-AUC: {best_score:.4f}")
    print(f"Best weights: {best_weights}")
    
    return best_weights


def evaluate_ensemble(ensemble, X, y, dataset_name=''):
    """Evaluate ensemble model"""
    print(f"\n=== Evaluating Ensemble on {dataset_name} ===")
    
    # Make predictions
    y_pred_proba = ensemble.predict_proba(X)[:, 1]
    y_pred = ensemble.predict(X)
    
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


def save_ensemble(ensemble, metrics, output_dir):
    """Save ensemble model"""
    print(f"\nSaving ensemble model to {output_dir}...")
    
    os.makedirs(output_dir, exist_ok=True)
    
    # Save ensemble
    model_path = os.path.join(output_dir, 'ensemble_model.pkl')
    joblib.dump(ensemble, model_path)
    print(f"Saved ensemble to {model_path}")
    
    # Save weights
    weights_path = os.path.join(output_dir, 'ensemble_weights.json')
    with open(weights_path, 'w') as f:
        json.dump(ensemble.weights, f, indent=2)
    
    # Save metrics
    metrics_path = os.path.join(output_dir, 'ensemble_metrics.json')
    with open(metrics_path, 'w') as f:
        metrics_serializable = {
            split: {k: float(v) if isinstance(v, (np.floating, np.integer)) else v 
                   for k, v in split_metrics.items()}
            for split, split_metrics in metrics.items()
        }
        json.dump(metrics_serializable, f, indent=2)


def main():
    """Main execution function"""
    try:
        # Load models
        models_dir = os.path.join(os.path.dirname(__file__), '..', 'models')
        models = load_models(models_dir)
        
        if len(models) < 2:
            print("Error: Need at least 2 models for ensemble")
            sys.exit(1)
        
        # Load data
        data_path = os.path.join(
            os.path.dirname(__file__), '..', 'data', 'training_data.parquet'
        )
        df = load_training_data(data_path)
        
        # Prepare features
        X, y, _ = prepare_features(df)
        
        # Split data
        X_train, X_val, X_test, y_train, y_val, y_test = split_data(X, y)
        
        # Optimize weights
        best_weights = optimize_weights(models, X_val, y_val)
        
        # Create ensemble
        ensemble = EnsembleModel(models, best_weights)
        
        # Evaluate
        metrics = {
            'train': evaluate_ensemble(ensemble, X_train, y_train, 'Train'),
            'val': evaluate_ensemble(ensemble, X_val, y_val, 'Validation'),
            'test': evaluate_ensemble(ensemble, X_test, y_test, 'Test')
        }
        
        # Load baseline for comparison
        baseline_metrics_path = os.path.join(models_dir, 'baseline', 'baseline_metrics.json')
        if os.path.exists(baseline_metrics_path):
            with open(baseline_metrics_path, 'r') as f:
                baseline_metrics = json.load(f)
            
            baseline_roc_auc = baseline_metrics['test']['roc_auc']
            ensemble_roc_auc = metrics['test']['roc_auc']
            improvement = ((ensemble_roc_auc - baseline_roc_auc) / baseline_roc_auc) * 100
            
            print(f"\n📊 Baseline ROC-AUC: {baseline_roc_auc:.4f}")
            print(f"📊 Ensemble ROC-AUC: {ensemble_roc_auc:.4f}")
            print(f"📈 Improvement: {improvement:.2f}%")
            
            if improvement >= 20:
                print("✅ SUCCESS: 20%+ improvement target achieved!")
            else:
                print(f"⚠️  WARNING: Only {improvement:.2f}% improvement (target: 20%+)")
        
        # Save ensemble
        ensemble_dir = os.path.join(models_dir, 'ensemble')
        save_ensemble(ensemble, metrics, ensemble_dir)
        
        print("\n✅ Ensemble model created successfully!")
        
    except Exception as e:
        print(f"\n❌ Error creating ensemble: {e}", file=sys.stderr)
        import traceback
        traceback.print_exc()
        sys.exit(1)


if __name__ == '__main__':
    main()
