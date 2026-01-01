#!/usr/bin/env python3
"""
Lead Scoring Model v2.0 - Advanced Model Training
Trains XGBoost, LightGBM, and CatBoost models with hyperparameter tuning.
"""

import os
import sys
import json
import numpy as np
import pandas as pd
import joblib
import matplotlib.pyplot as plt
import seaborn as sns
import optuna
from optuna.samplers import TPESampler
import xgboost as xgb
import lightgbm as lgb
import catboost as cb
from sklearn.model_selection import train_test_split, cross_val_score, StratifiedKFold
from sklearn.preprocessing import StandardScaler, LabelEncoder
from sklearn.metrics import (
    accuracy_score, precision_score, recall_score, f1_score,
    roc_auc_score, precision_recall_curve, roc_curve,
    classification_report, confusion_matrix, average_precision_score
)
from imblearn.over_sampling import SMOTE

# Set random seed for reproducibility
RANDOM_SEED = 42
np.random.seed(RANDOM_SEED)

# Suppress optuna logging
optuna.logging.set_verbosity(optuna.logging.WARNING)


def load_training_data(data_path):
    """Load training data from parquet file"""
    print(f"Loading training data from {data_path}...")
    
    if not os.path.exists(data_path):
        raise FileNotFoundError(f"Training data not found at {data_path}")
    
    df = pd.read_parquet(data_path)
    print(f"Loaded {len(df)} records")
    
    return df


def prepare_features(df):
    """Prepare features for modeling"""
    print("Preparing features...")
    
    # Select features for advanced models
    feature_columns = [
        # Contact completeness
        'has_email', 'has_phone', 'has_full_name', 'has_address', 'has_zipcode',
        'contact_completeness',
        
        # Engagement features
        'form_completed', 'requested_quote', 'pages_visited', 'time_on_site',
        'return_visitor', 'mobile_device', 'source_engagement_level',
        
        # Temporal features
        'hour_of_day', 'day_of_week', 'is_weekend', 'is_business_hours',
        'month', 'quarter',
        
        # Email features
        'is_generic_email',
        
        # Agent features
        'agent_avg_response_time', 'agent_conversion_rate', 'agent_rating',
        
        # Timing features
        'time_to_assignment', 'time_to_acceptance'
    ]
    
    # Categorical features to encode
    categorical_features = ['source', 'insuranceType', 'state_encoded', 
                           'browser', 'utm_source', 'utm_medium', 'utm_campaign']
    
    # Create feature matrix
    X = df[feature_columns].copy()
    
    # Encode categorical features
    label_encoders = {}
    for col in categorical_features:
        if col in df.columns:
            le = LabelEncoder()
            df[col] = df[col].fillna('UNKNOWN').astype(str)
            encoded = le.fit_transform(df[col])
            X[f'{col}_encoded'] = encoded
            label_encoders[col] = le
    
    # Fill any remaining NaN values
    X = X.fillna(0)
    
    # Target variable
    y = df['converted'].values
    
    print(f"Features shape: {X.shape}")
    print(f"Target distribution: {np.bincount(y)}")
    
    return X, y, label_encoders


def split_data(X, y, test_size=0.15, val_size=0.15):
    """Split data into train/validation/test sets (70/15/15)"""
    print("Splitting data into train/val/test sets...")
    
    # First split: separate test set
    X_temp, X_test, y_temp, y_test = train_test_split(
        X, y, test_size=test_size, random_state=RANDOM_SEED, stratify=y
    )
    
    # Second split: separate validation set from training
    val_size_adjusted = val_size / (1 - test_size)
    X_train, X_val, y_train, y_val = train_test_split(
        X_temp, y_temp, test_size=val_size_adjusted, 
        random_state=RANDOM_SEED, stratify=y_temp
    )
    
    print(f"Train set: {len(X_train)} ({len(X_train)/len(X)*100:.1f}%)")
    print(f"Validation set: {len(X_val)} ({len(X_val)/len(X)*100:.1f}%)")
    print(f"Test set: {len(X_test)} ({len(X_test)/len(X)*100:.1f}%)")
    
    return X_train, X_val, X_test, y_train, y_val, y_test


def train_xgboost(X_train, y_train, X_val, y_val, tune_hyperparams=True):
    """Train XGBoost model with optional hyperparameter tuning"""
    print("\n=== Training XGBoost Model ===")
    
    if tune_hyperparams:
        print("Tuning hyperparameters with Optuna...")
        
        def objective(trial):
            params = {
                'objective': 'binary:logistic',
                'eval_metric': 'auc',
                'tree_method': 'hist',
                'random_state': RANDOM_SEED,
                'max_depth': trial.suggest_int('max_depth', 3, 10),
                'learning_rate': trial.suggest_float('learning_rate', 0.01, 0.3, log=True),
                'n_estimators': trial.suggest_int('n_estimators', 100, 500),
                'min_child_weight': trial.suggest_int('min_child_weight', 1, 10),
                'subsample': trial.suggest_float('subsample', 0.6, 1.0),
                'colsample_bytree': trial.suggest_float('colsample_bytree', 0.6, 1.0),
                'reg_alpha': trial.suggest_float('reg_alpha', 1e-8, 10.0, log=True),
                'reg_lambda': trial.suggest_float('reg_lambda', 1e-8, 10.0, log=True),
                'scale_pos_weight': sum(y_train == 0) / sum(y_train == 1)
            }
            
            model = xgb.XGBClassifier(**params)
            model.fit(X_train, y_train, eval_set=[(X_val, y_val)], verbose=False)
            
            y_pred_proba = model.predict_proba(X_val)[:, 1]
            return roc_auc_score(y_val, y_pred_proba)
        
        study = optuna.create_study(direction='maximize', sampler=TPESampler(seed=RANDOM_SEED))
        study.optimize(objective, n_trials=50, show_progress_bar=True)
        
        print(f"Best ROC-AUC: {study.best_value:.4f}")
        print("Best parameters:", study.best_params)
        
        best_params = study.best_params.copy()
        best_params.update({
            'objective': 'binary:logistic',
            'eval_metric': 'auc',
            'tree_method': 'hist',
            'random_state': RANDOM_SEED,
            'scale_pos_weight': sum(y_train == 0) / sum(y_train == 1)
        })
    else:
        # Use default parameters
        best_params = {
            'objective': 'binary:logistic',
            'eval_metric': 'auc',
            'tree_method': 'hist',
            'random_state': RANDOM_SEED,
            'max_depth': 6,
            'learning_rate': 0.1,
            'n_estimators': 200,
            'scale_pos_weight': sum(y_train == 0) / sum(y_train == 1)
        }
    
    # Train final model with best parameters
    model = xgb.XGBClassifier(**best_params)
    model.fit(X_train, y_train, eval_set=[(X_val, y_val)], verbose=True)
    
    print("✅ XGBoost model trained successfully")
    return model, best_params


def train_lightgbm(X_train, y_train, X_val, y_val, tune_hyperparams=True):
    """Train LightGBM model with optional hyperparameter tuning"""
    print("\n=== Training LightGBM Model ===")
    
    if tune_hyperparams:
        print("Tuning hyperparameters with Optuna...")
        
        def objective(trial):
            params = {
                'objective': 'binary',
                'metric': 'auc',
                'verbosity': -1,
                'random_state': RANDOM_SEED,
                'num_leaves': trial.suggest_int('num_leaves', 20, 150),
                'learning_rate': trial.suggest_float('learning_rate', 0.01, 0.3, log=True),
                'n_estimators': trial.suggest_int('n_estimators', 100, 500),
                'min_child_samples': trial.suggest_int('min_child_samples', 5, 100),
                'subsample': trial.suggest_float('subsample', 0.6, 1.0),
                'colsample_bytree': trial.suggest_float('colsample_bytree', 0.6, 1.0),
                'reg_alpha': trial.suggest_float('reg_alpha', 1e-8, 10.0, log=True),
                'reg_lambda': trial.suggest_float('reg_lambda', 1e-8, 10.0, log=True),
                'scale_pos_weight': sum(y_train == 0) / sum(y_train == 1)
            }
            
            model = lgb.LGBMClassifier(**params)
            model.fit(X_train, y_train, eval_set=[(X_val, y_val)], 
                     callbacks=[lgb.early_stopping(50), lgb.log_evaluation(0)])
            
            y_pred_proba = model.predict_proba(X_val)[:, 1]
            return roc_auc_score(y_val, y_pred_proba)
        
        study = optuna.create_study(direction='maximize', sampler=TPESampler(seed=RANDOM_SEED))
        study.optimize(objective, n_trials=50, show_progress_bar=True)
        
        print(f"Best ROC-AUC: {study.best_value:.4f}")
        print("Best parameters:", study.best_params)
        
        best_params = study.best_params.copy()
        best_params.update({
            'objective': 'binary',
            'metric': 'auc',
            'verbosity': -1,
            'random_state': RANDOM_SEED,
            'scale_pos_weight': sum(y_train == 0) / sum(y_train == 1)
        })
    else:
        # Use default parameters
        best_params = {
            'objective': 'binary',
            'metric': 'auc',
            'verbosity': -1,
            'random_state': RANDOM_SEED,
            'num_leaves': 31,
            'learning_rate': 0.1,
            'n_estimators': 200,
            'scale_pos_weight': sum(y_train == 0) / sum(y_train == 1)
        }
    
    # Train final model with best parameters
    model = lgb.LGBMClassifier(**best_params)
    model.fit(X_train, y_train, eval_set=[(X_val, y_val)],
             callbacks=[lgb.early_stopping(50)])
    
    print("✅ LightGBM model trained successfully")
    return model, best_params


def train_catboost(X_train, y_train, X_val, y_val, tune_hyperparams=True):
    """Train CatBoost model with optional hyperparameter tuning"""
    print("\n=== Training CatBoost Model ===")
    
    if tune_hyperparams:
        print("Tuning hyperparameters with Optuna...")
        
        def objective(trial):
            params = {
                'loss_function': 'Logloss',
                'eval_metric': 'AUC',
                'verbose': False,
                'random_state': RANDOM_SEED,
                'depth': trial.suggest_int('depth', 4, 10),
                'learning_rate': trial.suggest_float('learning_rate', 0.01, 0.3, log=True),
                'iterations': trial.suggest_int('iterations', 100, 500),
                'l2_leaf_reg': trial.suggest_float('l2_leaf_reg', 1e-8, 10.0, log=True),
                'border_count': trial.suggest_int('border_count', 32, 255),
                'scale_pos_weight': sum(y_train == 0) / sum(y_train == 1)
            }
            
            model = cb.CatBoostClassifier(**params)
            model.fit(X_train, y_train, eval_set=[(X_val, y_val)], verbose=False)
            
            y_pred_proba = model.predict_proba(X_val)[:, 1]
            return roc_auc_score(y_val, y_pred_proba)
        
        study = optuna.create_study(direction='maximize', sampler=TPESampler(seed=RANDOM_SEED))
        study.optimize(objective, n_trials=30, show_progress_bar=True)
        
        print(f"Best ROC-AUC: {study.best_value:.4f}")
        print("Best parameters:", study.best_params)
        
        best_params = study.best_params.copy()
        best_params.update({
            'loss_function': 'Logloss',
            'eval_metric': 'AUC',
            'verbose': False,
            'random_state': RANDOM_SEED,
            'scale_pos_weight': sum(y_train == 0) / sum(y_train == 1)
        })
    else:
        # Use default parameters
        best_params = {
            'loss_function': 'Logloss',
            'eval_metric': 'AUC',
            'verbose': False,
            'random_state': RANDOM_SEED,
            'depth': 6,
            'learning_rate': 0.1,
            'iterations': 200,
            'scale_pos_weight': sum(y_train == 0) / sum(y_train == 1)
        }
    
    # Train final model with best parameters
    model = cb.CatBoostClassifier(**best_params)
    model.fit(X_train, y_train, eval_set=[(X_val, y_val)])
    
    print("✅ CatBoost model trained successfully")
    return model, best_params


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
        'pr_auc': pr_auc,
        'y_pred': y_pred,
        'y_pred_proba': y_pred_proba
    }


def compare_models(models_metrics, baseline_metrics=None):
    """Compare model performance"""
    print("\n=== Model Comparison ===")
    
    comparison_df = pd.DataFrame({
        model_name: {
            'Accuracy': metrics['test']['accuracy'],
            'Precision': metrics['test']['precision'],
            'Recall': metrics['test']['recall'],
            'F1 Score': metrics['test']['f1'],
            'ROC-AUC': metrics['test']['roc_auc'],
            'PR-AUC': metrics['test']['pr_auc']
        }
        for model_name, metrics in models_metrics.items()
    })
    
    if baseline_metrics:
        comparison_df['Baseline'] = {
            'Accuracy': baseline_metrics['test']['accuracy'],
            'Precision': baseline_metrics['test']['precision'],
            'Recall': baseline_metrics['test']['recall'],
            'F1 Score': baseline_metrics['test']['f1'],
            'ROC-AUC': baseline_metrics['test']['roc_auc'],
            'PR-AUC': baseline_metrics['test']['pr_auc']
        }
    
    print(comparison_df.T)
    
    return comparison_df


def save_model(model, model_name, params, metrics, output_dir):
    """Save trained model and artifacts"""
    print(f"\nSaving {model_name} model...")
    
    model_dir = os.path.join(output_dir, model_name.lower().replace(' ', '_'))
    os.makedirs(model_dir, exist_ok=True)
    
    # Save model
    model_path = os.path.join(model_dir, f'{model_name.lower().replace(" ", "_")}.pkl')
    joblib.dump(model, model_path)
    print(f"Saved model to {model_path}")
    
    # Save parameters
    params_path = os.path.join(model_dir, 'params.json')
    with open(params_path, 'w') as f:
        json.dump(params, f, indent=2)
    
    # Save metrics
    metrics_path = os.path.join(model_dir, 'metrics.json')
    with open(metrics_path, 'w') as f:
        metrics_serializable = {
            split: {k: float(v) if isinstance(v, (np.floating, np.integer)) else v 
                   for k, v in split_metrics.items() if k not in ['y_pred', 'y_pred_proba']}
            for split, split_metrics in metrics.items()
        }
        json.dump(metrics_serializable, f, indent=2)


def main():
    """Main execution function"""
    try:
        # Load training data
        data_path = os.path.join(
            os.path.dirname(__file__), 
            '..', 
            'data', 
            'training_data.parquet'
        )
        df = load_training_data(data_path)
        
        # Prepare features
        X, y, label_encoders = prepare_features(df)
        
        # Split data
        X_train, X_val, X_test, y_train, y_val, y_test = split_data(X, y)
        
        # Load baseline metrics for comparison
        baseline_metrics_path = os.path.join(
            os.path.dirname(__file__), '..', 'models', 'baseline', 'baseline_metrics.json'
        )
        baseline_metrics = None
        if os.path.exists(baseline_metrics_path):
            with open(baseline_metrics_path, 'r') as f:
                baseline_metrics = json.load(f)
        
        # Train models
        models = {}
        all_metrics = {}
        
        # XGBoost
        xgb_model, xgb_params = train_xgboost(X_train, y_train, X_val, y_val, tune_hyperparams=True)
        models['XGBoost'] = xgb_model
        all_metrics['XGBoost'] = {
            'train': evaluate_model(xgb_model, X_train, y_train, 'XGBoost - Train'),
            'val': evaluate_model(xgb_model, X_val, y_val, 'XGBoost - Val'),
            'test': evaluate_model(xgb_model, X_test, y_test, 'XGBoost - Test')
        }
        
        # LightGBM
        lgb_model, lgb_params = train_lightgbm(X_train, y_train, X_val, y_val, tune_hyperparams=True)
        models['LightGBM'] = lgb_model
        all_metrics['LightGBM'] = {
            'train': evaluate_model(lgb_model, X_train, y_train, 'LightGBM - Train'),
            'val': evaluate_model(lgb_model, X_val, y_val, 'LightGBM - Val'),
            'test': evaluate_model(lgb_model, X_test, y_test, 'LightGBM - Test')
        }
        
        # CatBoost
        cb_model, cb_params = train_catboost(X_train, y_train, X_val, y_val, tune_hyperparams=True)
        models['CatBoost'] = cb_model
        all_metrics['CatBoost'] = {
            'train': evaluate_model(cb_model, X_train, y_train, 'CatBoost - Train'),
            'val': evaluate_model(cb_model, X_val, y_val, 'CatBoost - Val'),
            'test': evaluate_model(cb_model, X_test, y_test, 'CatBoost - Test')
        }
        
        # Compare models
        comparison_df = compare_models(all_metrics, baseline_metrics)
        
        # Save models
        models_dir = os.path.join(os.path.dirname(__file__), '..', 'models')
        save_model(xgb_model, 'XGBoost', xgb_params, all_metrics['XGBoost'], models_dir)
        save_model(lgb_model, 'LightGBM', lgb_params, all_metrics['LightGBM'], models_dir)
        save_model(cb_model, 'CatBoost', cb_params, all_metrics['CatBoost'], models_dir)
        
        # Save comparison
        comparison_path = os.path.join(models_dir, 'model_comparison.csv')
        comparison_df.T.to_csv(comparison_path)
        print(f"\nSaved model comparison to {comparison_path}")
        
        # Determine best model
        best_model_name = comparison_df.T['ROC-AUC'].idxmax()
        best_model = models[best_model_name]
        best_roc_auc = comparison_df.T.loc[best_model_name, 'ROC-AUC']
        
        print(f"\n🏆 Best Model: {best_model_name} (ROC-AUC: {best_roc_auc:.4f})")
        
        # Calculate improvement over baseline
        if baseline_metrics:
            baseline_roc_auc = baseline_metrics['test']['roc_auc']
            improvement = ((best_roc_auc - baseline_roc_auc) / baseline_roc_auc) * 100
            print(f"📈 Improvement over baseline: {improvement:.2f}%")
            
            if improvement >= 20:
                print("✅ SUCCESS: 20%+ improvement target achieved!")
            else:
                print(f"⚠️  WARNING: Only {improvement:.2f}% improvement (target: 20%+)")
        
        print("\n✅ Advanced model training completed successfully!")
        
    except Exception as e:
        print(f"\n❌ Error during advanced model training: {e}", file=sys.stderr)
        import traceback
        traceback.print_exc()
        sys.exit(1)


if __name__ == '__main__':
    main()
