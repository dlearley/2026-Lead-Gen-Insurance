#!/usr/bin/env python3
"""
Lead Scoring Model v2.0 - Baseline Model Training
Trains a logistic regression baseline model for lead scoring.
"""

import os
import sys
import json
import numpy as np
import pandas as pd
import joblib
import matplotlib.pyplot as plt
import seaborn as sns
from sklearn.model_selection import train_test_split, cross_val_score, StratifiedKFold
from sklearn.linear_model import LogisticRegression
from sklearn.preprocessing import StandardScaler, LabelEncoder
from sklearn.metrics import (
    accuracy_score, precision_score, recall_score, f1_score,
    roc_auc_score, precision_recall_curve, roc_curve,
    classification_report, confusion_matrix, average_precision_score
)
from sklearn.calibration import calibration_curve
from imblearn.over_sampling import SMOTE

# Set random seed for reproducibility
RANDOM_SEED = 42
np.random.seed(RANDOM_SEED)


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
    
    # Select features for baseline model
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
    print(f"Class imbalance ratio: {(1-y.mean())/y.mean():.2f}:1")
    
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


def train_baseline_model(X_train, y_train):
    """Train baseline logistic regression model"""
    print("\nTraining baseline logistic regression model...")
    
    # Standardize features
    scaler = StandardScaler()
    X_train_scaled = scaler.fit_transform(X_train)
    
    # Handle class imbalance with SMOTE
    print("Applying SMOTE to handle class imbalance...")
    smote = SMOTE(random_state=RANDOM_SEED)
    X_train_resampled, y_train_resampled = smote.fit_resample(X_train_scaled, y_train)
    
    print(f"Resampled training set: {len(X_train_resampled)}")
    print(f"Resampled class distribution: {np.bincount(y_train_resampled)}")
    
    # Train logistic regression with L2 regularization
    model = LogisticRegression(
        C=1.0,  # Regularization strength
        penalty='l2',
        solver='lbfgs',
        max_iter=1000,
        random_state=RANDOM_SEED,
        class_weight='balanced'
    )
    
    model.fit(X_train_resampled, y_train_resampled)
    
    print("✅ Baseline model trained successfully")
    
    return model, scaler


def evaluate_model(model, scaler, X, y, dataset_name=''):
    """Evaluate model performance"""
    print(f"\n=== Evaluating on {dataset_name} set ===")
    
    # Scale features
    X_scaled = scaler.transform(X)
    
    # Make predictions
    y_pred = model.predict(X_scaled)
    y_pred_proba = model.predict_proba(X_scaled)[:, 1]
    
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
    
    print("\nClassification Report:")
    print(classification_report(y, y_pred, target_names=['Not Converted', 'Converted']))
    
    print("\nConfusion Matrix:")
    cm = confusion_matrix(y, y_pred)
    print(cm)
    
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


def cross_validate_model(model, scaler, X, y, cv_folds=5):
    """Perform cross-validation"""
    print(f"\nPerforming {cv_folds}-fold cross-validation...")
    
    X_scaled = scaler.transform(X)
    
    skf = StratifiedKFold(n_splits=cv_folds, shuffle=True, random_state=RANDOM_SEED)
    
    cv_scores = {
        'accuracy': cross_val_score(model, X_scaled, y, cv=skf, scoring='accuracy'),
        'precision': cross_val_score(model, X_scaled, y, cv=skf, scoring='precision'),
        'recall': cross_val_score(model, X_scaled, y, cv=skf, scoring='recall'),
        'f1': cross_val_score(model, X_scaled, y, cv=skf, scoring='f1'),
        'roc_auc': cross_val_score(model, X_scaled, y, cv=skf, scoring='roc_auc')
    }
    
    print("Cross-validation results:")
    for metric, scores in cv_scores.items():
        print(f"  {metric}: {scores.mean():.4f} (+/- {scores.std() * 2:.4f})")
    
    return cv_scores


def plot_roc_curve(y_true, y_pred_proba, save_path):
    """Plot ROC curve"""
    fpr, tpr, thresholds = roc_curve(y_true, y_pred_proba)
    roc_auc = roc_auc_score(y_true, y_pred_proba)
    
    plt.figure(figsize=(8, 6))
    plt.plot(fpr, tpr, color='darkorange', lw=2, 
             label=f'ROC curve (AUC = {roc_auc:.3f})')
    plt.plot([0, 1], [0, 1], color='navy', lw=2, linestyle='--', label='Random')
    plt.xlim([0.0, 1.0])
    plt.ylim([0.0, 1.05])
    plt.xlabel('False Positive Rate')
    plt.ylabel('True Positive Rate')
    plt.title('Receiver Operating Characteristic (ROC) Curve')
    plt.legend(loc="lower right")
    plt.grid(alpha=0.3)
    plt.tight_layout()
    plt.savefig(save_path, dpi=300, bbox_inches='tight')
    print(f"Saved ROC curve to {save_path}")
    plt.close()


def plot_precision_recall_curve(y_true, y_pred_proba, save_path):
    """Plot Precision-Recall curve"""
    precision, recall, thresholds = precision_recall_curve(y_true, y_pred_proba)
    pr_auc = average_precision_score(y_true, y_pred_proba)
    
    plt.figure(figsize=(8, 6))
    plt.plot(recall, precision, color='darkorange', lw=2,
             label=f'PR curve (AUC = {pr_auc:.3f})')
    plt.xlim([0.0, 1.0])
    plt.ylim([0.0, 1.05])
    plt.xlabel('Recall')
    plt.ylabel('Precision')
    plt.title('Precision-Recall Curve')
    plt.legend(loc="lower left")
    plt.grid(alpha=0.3)
    plt.tight_layout()
    plt.savefig(save_path, dpi=300, bbox_inches='tight')
    print(f"Saved PR curve to {save_path}")
    plt.close()


def plot_calibration_curve(y_true, y_pred_proba, save_path):
    """Plot calibration curve"""
    fraction_of_positives, mean_predicted_value = calibration_curve(
        y_true, y_pred_proba, n_bins=10
    )
    
    plt.figure(figsize=(8, 6))
    plt.plot(mean_predicted_value, fraction_of_positives, "s-",
             label='Logistic Regression', lw=2)
    plt.plot([0, 1], [0, 1], "k:", label="Perfectly calibrated")
    plt.xlabel('Mean Predicted Probability')
    plt.ylabel('Fraction of Positives')
    plt.title('Calibration Curve')
    plt.legend(loc="lower right")
    plt.grid(alpha=0.3)
    plt.tight_layout()
    plt.savefig(save_path, dpi=300, bbox_inches='tight')
    print(f"Saved calibration curve to {save_path}")
    plt.close()


def get_feature_importance(model, feature_names):
    """Get feature importance from model coefficients"""
    importance = np.abs(model.coef_[0])
    feature_importance = pd.DataFrame({
        'feature': feature_names,
        'importance': importance
    }).sort_values('importance', ascending=False)
    
    return feature_importance


def save_model(model, scaler, label_encoders, metrics, output_dir):
    """Save trained model and artifacts"""
    print(f"\nSaving model to {output_dir}...")
    
    os.makedirs(output_dir, exist_ok=True)
    
    # Save model
    model_path = os.path.join(output_dir, 'baseline_model.pkl')
    joblib.dump(model, model_path)
    print(f"Saved model to {model_path}")
    
    # Save scaler
    scaler_path = os.path.join(output_dir, 'scaler.pkl')
    joblib.dump(scaler, scaler_path)
    print(f"Saved scaler to {scaler_path}")
    
    # Save label encoders
    encoders_path = os.path.join(output_dir, 'label_encoders.pkl')
    joblib.dump(label_encoders, encoders_path)
    print(f"Saved label encoders to {encoders_path}")
    
    # Save metrics
    metrics_path = os.path.join(output_dir, 'baseline_metrics.json')
    with open(metrics_path, 'w') as f:
        # Convert numpy types to Python types for JSON serialization
        metrics_serializable = {
            k: float(v) if isinstance(v, (np.floating, np.integer)) else v 
            for k, v in metrics.items() 
            if k not in ['y_pred', 'y_pred_proba']
        }
        json.dump(metrics_serializable, f, indent=2)
    print(f"Saved metrics to {metrics_path}")


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
        
        # Train baseline model
        model, scaler = train_baseline_model(X_train, y_train)
        
        # Evaluate on training set
        train_metrics = evaluate_model(model, scaler, X_train, y_train, 'Training')
        
        # Evaluate on validation set
        val_metrics = evaluate_model(model, scaler, X_val, y_val, 'Validation')
        
        # Evaluate on test set
        test_metrics = evaluate_model(model, scaler, X_test, y_test, 'Test')
        
        # Cross-validation
        cv_scores = cross_validate_model(model, scaler, X_train, y_train)
        
        # Plot evaluation curves
        plots_dir = os.path.join(os.path.dirname(__file__), '..', 'models', 'baseline', 'plots')
        os.makedirs(plots_dir, exist_ok=True)
        
        plot_roc_curve(y_test, test_metrics['y_pred_proba'], 
                      os.path.join(plots_dir, 'roc_curve.png'))
        plot_precision_recall_curve(y_test, test_metrics['y_pred_proba'],
                                   os.path.join(plots_dir, 'pr_curve.png'))
        plot_calibration_curve(y_test, test_metrics['y_pred_proba'],
                             os.path.join(plots_dir, 'calibration_curve.png'))
        
        # Feature importance
        feature_importance = get_feature_importance(model, X.columns.tolist())
        print("\n=== Top 10 Most Important Features ===")
        print(feature_importance.head(10))
        
        # Save feature importance
        feature_importance.to_csv(
            os.path.join(plots_dir, 'feature_importance.csv'), 
            index=False
        )
        
        # Save model and artifacts
        model_dir = os.path.join(os.path.dirname(__file__), '..', 'models', 'baseline')
        combined_metrics = {
            'train': {k: v for k, v in train_metrics.items() if k not in ['y_pred', 'y_pred_proba']},
            'val': {k: v for k, v in val_metrics.items() if k not in ['y_pred', 'y_pred_proba']},
            'test': {k: v for k, v in test_metrics.items() if k not in ['y_pred', 'y_pred_proba']},
        }
        save_model(model, scaler, label_encoders, combined_metrics, model_dir)
        
        print("\n✅ Baseline model training completed successfully!")
        print(f"\n=== Final Test Set Performance ===")
        print(f"Accuracy:  {test_metrics['accuracy']:.4f}")
        print(f"Precision: {test_metrics['precision']:.4f}")
        print(f"Recall:    {test_metrics['recall']:.4f}")
        print(f"F1 Score:  {test_metrics['f1']:.4f}")
        print(f"ROC-AUC:   {test_metrics['roc_auc']:.4f}")
        
    except Exception as e:
        print(f"\n❌ Error during baseline model training: {e}", file=sys.stderr)
        import traceback
        traceback.print_exc()
        sys.exit(1)


if __name__ == '__main__':
    main()
