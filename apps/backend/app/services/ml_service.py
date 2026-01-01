"""
Machine Learning Service for Insurance Lead Generation Platform

This service provides:
- Model training pipeline for lead scoring, churn prediction, and conversion prediction
- Model serving endpoints
- Feature engineering integration
- A/B testing framework support
"""

import os
import joblib
import pandas as pd
import numpy as np
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple, Any
from dataclasses import dataclass
from sklearn.model_selection import train_test_split, cross_val_score, GridSearchCV
from sklearn.ensemble import RandomForestClassifier, GradientBoostingClassifier
from sklearn.preprocessing import LabelEncoder, StandardScaler
from sklearn.metrics import classification_report, roc_auc_score, precision_recall_curve
import xgboost as xgb
import logging
import redis
import httpx
import json
from concurrent.futures import ThreadPoolExecutor

# Configure logging
logger = logging.getLogger(__name__)
logging.basicConfig(level=logging.INFO)

@dataclass
class ModelConfig:
    """Configuration for ML models"""
    model_type: str  # 'churn', 'conversion', 'lead_score'
    target_column: str
    feature_columns: List[str]
    use_xgboost: bool = False
    hyperparameter_tuning: bool = True
    test_size: float = 0.2
    random_state: int = 42

@dataclass
class ModelMetadata:
    """Metadata for trained models"""
    model_id: str
    model_type: str
    version: str
    created_at: datetime
    metrics: Dict[str, float]
    feature_importance: Dict[str, float]
    training_samples: int
    test_samples: int
    is_production: bool = False

class MLService:
    """Main ML service class"""
    
    def __init__(self, db_url: str = None, redis_url: str = None, feature_store_url: str = None):
        self.db_url = db_url or os.getenv('DATABASE_URL')
        self.redis_url = redis_url or os.getenv('REDIS_URL', 'redis://localhost:6379')
        self.feature_store_url = feature_store_url or os.getenv('FEATURE_STORE_URL', 'http://localhost:3001')
        
        # Initialize connections
        self.redis_client = redis.from_url(self.redis_url, decode_responses=True)
        self.models_dir = os.path.join(os.path.dirname(__file__), '../../ml_models')
        os.makedirs(self.models_dir, exist_ok=True)
        
        # Active models registry
        self.active_models: Dict[str, Any] = {}
        self.model_metadata: Dict[str, ModelMetadata] = {}
        
        logger.info("ML Service initialized")
    
    def get_features_from_store(self, entity_ids: List[str], feature_names: List[str], entity_type: str = 'lead') -> pd.DataFrame:
        """Fetch features from Feature Store service"""
        try:
            response = httpx.post(
                f"{self.feature_store_url}/api/v1/features/batch",  # Changed to correct endpoint path
                json={
                    "entity_ids": entity_ids,
                    "feature_names": feature_names,
                    "entity_type": entity_type
                },
                timeout=30.0
            )
            response.raise_for_status()
            data = response.json()
            
            # Convert to DataFrame
            df_data = []
            for entity_id, features in data.items():
                row = {"entity_id": entity_id, **features}
                df_data.append(row)
            
            return pd.DataFrame(df_data)
            
        except Exception as e:
            logger.error(f"Failed to fetch features from store: {e}")
            raise
    
    def prepare_training_data(self, config: ModelConfig, limit: int = 10000) -> Tuple[pd.DataFrame, pd.Series]:
        """Prepare training dataset from historical data"""
        logger.info(f"Preparing training data for {config.model_type}")
        
        # Fetch historical data based on model type
        if config.model_type == 'churn':
            return self._prepare_churn_data(config, limit)
        elif config.model_type == 'conversion':
            return self._prepare_conversion_data(config, limit)
        elif config.model_type == 'lead_score':
            return self._prepare_lead_score_data(config, limit)
        else:
            raise ValueError(f"Unknown model type: {config.model_type}")
    
    def _prepare_churn_data(self, config: ModelConfig, limit: int) -> Tuple[pd.DataFrame, pd.Series]:
        """Prepare churn prediction dataset"""
        logger.info("Preparing churn prediction data")
        
        # Get churned and active leads
        query = """
        SELECT 
            l.id,
            l.quality_score,
            l.insurance_type,
            l.status,
            l.source,
            l.created_at,
            ce.engagement_score,
            ce.email_open_rate,
            ce.click_through_rate,
            ce.activity_count_30d,
            ce.activity_count_90d,
            ce.days_since_last_activity,
            COALESCE(p.converted, false) as converted,
            COALESCE(p.churned, false) as churned
        FROM leads l
        LEFT JOIN customer_engagements ce ON l.id = ce.lead_id
        LEFT JOIN (
            SELECT lead_id, 
                   status = 'converted' as converted,
                   status IN ('rejected', 'expired') as churned
            FROM policies
        ) p ON l.id = p.lead_id
        WHERE l.status IN ('converted', 'rejected', 'qualified', 'routed')
        LIMIT :limit
        """
        
        # In a real implementation, you'd execute this query
        # For now, creating synthetic data
        np.random.seed(42)
        n_samples = min(limit, 1000)
        
        data = {
            'quality_score': np.random.uniform(0, 100, n_samples),
            'engagement_score': np.random.uniform(0, 100, n_samples),
            'email_open_rate': np.random.uniform(0, 100, n_samples),
            'click_through_rate': np.random.uniform(0, 100, n_samples),
            'activity_count_30d': np.random.poisson(5, n_samples),
            'activity_count_90d': np.random.poisson(15, n_samples),
            'days_since_last_activity': np.random.exponential(30, n_samples),
            'insurance_type': np.random.choice(['auto', 'home', 'life', 'health', 'commercial'], n_samples),
            'source': np.random.choice(['website', 'referral', 'agent', 'call', 'email'], n_samples),
            'created_at': [datetime.now() - timedelta(days=np.random.exponential(365)) for _ in range(n_samples)]
        }
        
        df = pd.DataFrame(data)
        
        # Create target variable (churn)
        # Higher engagement = lower churn probability
        churn_prob = 1 / (1 + np.exp(-(
            -3 + 
            0.02 * (100 - df['engagement_score']) +
            0.05 * df['days_since_last_activity'] / 30 +
            0.01 * (100 - df['email_open_rate']) +
            0.1 * (5 - df['activity_count_30d'])
        )))
        df['churned'] = (np.random.random(n_samples) < churn_prob).astype(int)
        
        # Encode categorical variables
        self._encode_categorical(df, ['insurance_type', 'source'])
        
        # Select features
        X = df[config.feature_columns]
        y = df['churned']
        
        logger.info(f"Churn dataset prepared: {X.shape[0]} samples, {X.shape[1]} features")
        return X, y
    
    def _prepare_conversion_data(self, config: ModelConfig, limit: int) -> Tuple[pd.DataFrame, pd.Series]:
        """Prepare conversion prediction dataset"""
        logger.info("Preparing conversion prediction data")
        
        np.random.seed(42)
        n_samples = min(limit, 2000)
        
        data = {
            'quality_score': np.random.uniform(0, 100, n_samples),
            'engagement_score': np.random.uniform(0, 100, n_samples),
            'email_open_rate': np.random.uniform(0, 100, n_samples),
            'click_through_rate': np.random.uniform(0, 100, n_samples),
            'activity_count_30d': np.random.poisson(8, n_samples),
            'activity_count_90d': np.random.poisson(20, n_samples),
            'days_since_first_contact': np.random.exponential(14, n_samples),
            'agent_response_time_hours': np.random.exponential(24, n_samples),
            'quote_requests': np.random.poisson(3, n_samples),
            'insurance_type': np.random.choice(['auto', 'home', 'life', 'health', 'commercial'], n_samples),
            'source': np.random.choice(['website', 'referral', 'agent', 'call', 'email'], n_samples),
            'is_repeat_customer': np.random.choice([0, 1], n_samples, p=[0.8, 0.2]),
            'coverage_amount_requested': np.random.exponential(100000, n_samples),
        }
        
        df = pd.DataFrame(data)
        
        # Create target variable (conversion)
        conversion_prob = 1 / (1 + np.exp(-(
            -4 + 
            0.05 * df['quality_score'] +
            0.03 * df['engagement_score'] +
            0.02 * df['email_open_rate'] +
            0.1 * df['activity_count_30d'] +
            0.5 * df['is_repeat_customer'] -
            0.02 * df['agent_response_time_hours'] +
            0.2 * np.minimum(df['quote_requests'], 3)
        )))
        df['converted'] = (np.random.random(n_samples) < conversion_prob).astype(int)
        
        # Encode categorical variables
        self._encode_categorical(df, ['insurance_type', 'source'])
        
        # Select features
        X = df[config.feature_columns]
        y = df['converted']
        
        logger.info(f"Conversion dataset prepared: {X.shape[0]} samples, {X.shape[1]} features")
        return X, y
    
    def _prepare_lead_score_data(self, config: ModelConfig, limit: int) -> Tuple[pd.DataFrame, pd.Series]:
        """Prepare lead scoring dataset"""
        logger.info("Preparing lead scoring data")
        
        np.random.seed(42)
        n_samples = min(limit, 5000)
        
        data = {
            'contact_completeness': np.random.uniform(0, 100, n_samples),
            'email_valid': np.random.choice([0, 1], n_samples, p=[0.1, 0.9]),
            'phone_valid': np.random.choice([0, 1], n_samples, p=[0.15, 0.85]),
            'has_address': np.random.choice([0, 1], n_samples, p=[0.3, 0.7]),
            'source': np.random.choice(['website', 'referral', 'agent', 'call', 'email'], n_samples),
            'insurance_type': np.random.choice(['auto', 'home', 'life', 'health', 'commercial'], n_samples),
            'time_of_day': np.random.choice(['morning', 'afternoon', 'evening', 'night'], n_samples),
            'day_of_week': np.random.choice(['weekday', 'weekend'], n_samples),
            'referral_source_quality': np.random.uniform(0, 100, n_samples),
            'form_completion_time_seconds': np.random.exponential(120, n_samples),
            'previous_visits': np.random.poisson(2, n_samples),
        }
        
        df = pd.DataFrame(data)
        
        # Create target variable (quality score 0-100)
        base_score = (
            30 * df['contact_completeness'] / 100 +
            20 * df['email_valid'] +
            15 * df['phone_valid'] +
            10 * df['has_address'] +
            15 * df['referral_source_quality'] / 100 +
            10 * (1 - df['form_completion_time_seconds'] / 300)
        )
        
        # Add noise
        base_score += np.random.normal(0, 10, n_samples)
        base_score = np.clip(base_score, 0, 100)
        
        df['quality_score'] = base_score
        
        # Encode categorical variables
        self._encode_categorical(df, ['source', 'insurance_type', 'time_of_day', 'day_of_week'])
        
        # Select features
        X = df[config.feature_columns]
        y = df['quality_score']
        
        logger.info(f"Lead scoring dataset prepared: {X.shape[0]} samples, {X.shape[1]} features")
        return X, y
    
    def _encode_categorical(self, df: pd.DataFrame, columns: List[str]):
        """Encode categorical variables using LabelEncoder"""
        for col in columns:
            if col in df.columns and df[col].dtype == 'object':
                le = LabelEncoder()
                df[col] = le.fit_transform(df[col].astype(str))
                # Store encoders for later use
                encoder_key = f"encoder_{col}"
                joblib.dump(le, os.path.join(self.models_dir, f"{encoder_key}.pkl"))
    
    def train_model(self, config: ModelConfig) -> ModelMetadata:
        """Train a machine learning model"""
        logger.info(f"Training {config.model_type} model")
        
        # Prepare data
        X, y = self.prepare_training_data(config)
        
        # Split data
        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=config.test_size, random_state=config.random_state
        )
        
        # Select model
        if config.use_xgboost:
            model = xgb.XGBClassifier(
                n_estimators=100,
                max_depth=6,
                learning_rate=0.1,
                random_state=config.random_state
            ) if config.model_type in ['churn', 'conversion'] else xgb.XGBRegressor(
                n_estimators=100,
                max_depth=6,
                learning_rate=0.1,
                random_state=config.random_state
            )
        else:
            model = RandomForestClassifier(
                n_estimators=100,
                max_depth=10,
                random_state=config.random_state
            ) if config.model_type in ['churn', 'conversion'] else GradientBoostingRegressor(
                n_estimators=100,
                max_depth=5,
                random_state=config.random_state
            )
        
        # Hyperparameter tuning if enabled
        if config.hyperparameter_tuning:
            param_grid = {
                'n_estimators': [50, 100, 200],
                'max_depth': [4, 6, 8, 10],
                'learning_rate': [0.05, 0.1, 0.2]
            }
            
            grid_search = GridSearchCV(
                model, param_grid, cv=3, scoring='roc_auc' if config.model_type in ['churn', 'conversion'] else 'r2',
                n_jobs=-1, verbose=1
            )
            grid_search.fit(X_train, y_train)
            model = grid_search.best_estimator_
            logger.info(f"Best hyperparameters: {grid_search.best_params_}")
        
        # Train model
        model.fit(X_train, y_train)
        
        # Evaluate
        train_score = model.score(X_train, y_train)
        test_score = model.score(X_test, y_test)
        
        # Calculate additional metrics
        y_pred = model.predict(X_test)
        y_pred_proba = model.predict_proba(X_test) if hasattr(model, 'predict_proba') else None
        
        metrics = {
            'train_accuracy': train_score,
            'test_accuracy': test_score,
            'cv_score_mean': np.mean(cross_val_score(model, X_train, y_train, cv=5))
        }
        
        if y_pred_proba is not None:
            metrics['roc_auc'] = roc_auc_score(y_test, y_pred_proba[:, 1])
        
        # Feature importance
        feature_importance = {}
        if hasattr(model, 'feature_importances_'):
            for i, feature in enumerate(config.feature_columns):
                feature_importance[feature] = float(model.feature_importances_[i])
        
        # Save model
        model_id = f"{config.model_type}_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
        model_path = os.path.join(self.models_dir, f"{model_id}.pkl")
        joblib.dump(model, model_path)
        
        # Create metadata
        metadata = ModelMetadata(
            model_id=model_id,
            model_type=config.model_type,
            version="1.0.0",
            created_at=datetime.now(),
            metrics=metrics,
            feature_importance=feature_importance,
            training_samples=len(X_train),
            test_samples=len(X_test)
        )
        
        # Save metadata
        metadata_path = os.path.join(self.models_dir, f"{model_id}_metadata.json")
        with open(metadata_path, 'w') as f:
            import json
            json.dump(metadata.__dict__, f, default=str)
        
        # Store in Redis
        self.redis.set(f"model:{config.model_type}:latest", model_id)
        self.model_metadata[config.model_type] = metadata
        
        logger.info(f"Model trained successfully: {model_id}")
        logger.info(f"Metrics: {metrics}")
        
        return metadata
    
    def predict(self, model_type: str, features: pd.DataFrame) -> np.ndarray:
        """Make predictions using a trained model"""
        model_id = self.redis.get(f"model:{model_type}:latest")
        if not model_id:
            raise ValueError(f"No trained model found for {model_type}")
        
        model_path = os.path.join(self.models_dir, f"{model_id}.pkl")
        if not os.path.exists(model_path):
            raise ValueError(f"Model file not found: {model_path}")
        
        model = joblib.load(model_path)
        predictions = model.predict(features)
        
        return predictions
    
    def predict_proba(self, model_type: str, features: pd.DataFrame) -> np.ndarray:
        """Make probability predictions using a trained model"""
        model_id = self.redis.get(f"model:{model_type}:latest")
        if not model_id:
            raise ValueError(f"No trained model found for {model_type}")
        
        model_path = os.path.join(self.models_dir, f"{model_id}.pkl")
        if not os.path.exists(model_path):
            raise ValueError(f"Model file not found: {model_path}")
        
        model = joblib.load(model_path)
        if not hasattr(model, 'predict_proba'):
            raise ValueError(f"Model {model_type} does not support probability predictions")
        
        predictions = model.predict_proba(features)
        
        return predictions
    
    def get_feature_names(self, model_type: str) -> List[str]:
        """Get feature names for a model type"""
        # Define feature sets for each model type
        feature_sets = {
            'churn': [
                'quality_score', 'engagement_score', 'email_open_rate', 'click_through_rate',
                'activity_count_30d', 'activity_count_90d', 'days_since_last_activity',
                'insurance_type', 'source'
            ],
            'conversion': [
                'quality_score', 'engagement_score', 'email_open_rate', 'click_through_rate',
                'activity_count_30d', 'activity_count_90d', 'days_since_first_contact',
                'agent_response_time_hours', 'quote_requests', 'insurance_type', 'source',
                'is_repeat_customer', 'coverage_amount_requested'
            ],
            'lead_score': [
                'contact_completeness', 'email_valid', 'phone_valid', 'has_address', 'source',
                'insurance_type', 'time_of_day', 'day_of_week', 'referral_source_quality',
                'form_completion_time_seconds', 'previous_visits'
            ]
        }
        
        return feature_sets.get(model_type, [])
    
    def predict_single(self, model_type: str, entity_id: str) -> Dict[str, Any]:
        """Make prediction for a single entity"""
        feature_names = self.get_feature_names(model_type)
        
        # Get features from feature store
        features_df = self.get_features_from_store([entity_id], feature_names)
        
        if features_df.empty:
            raise ValueError(f"No features found for entity {entity_id}")
        
        # Make prediction
        prediction = self.predict(model_type, features_df.drop('entity_id', axis=1))
        probability = self.predict_proba(model_type, features_df.drop('entity_id', axis=1))
        
        return {
            'entity_id': entity_id,
            'prediction': float(prediction[0]),
            'probability': float(probability[0][1]) if probability.ndim > 1 else float(probability[0]),
            'model_type': model_type,
            'timestamp': datetime.now().isoformat()
        }
    
    def batch_predict(self, model_type: str, entity_ids: List[str]) -> List[Dict[str, Any]]:
        """Make predictions for multiple entities"""
        feature_names = self.get_feature_names(model_type)
        
        # Get features from feature store in batches
        predictions = []
        batch_size = 100
        
        for i in range(0, len(entity_ids), batch_size):
            batch_ids = entity_ids[i:i + batch_size]
            features_df = self.get_features_from_store(batch_ids, feature_names)
            
            if not features_df.empty:
                X = features_df.drop('entity_id', axis=1)
                preds = self.predict(model_type, X)
                probas = self.predict_proba(model_type, X)
                
                for idx, entity_id in enumerate(features_df['entity_id']):
                    predictions.append({
                        'entity_id': entity_id,
                        'prediction': float(preds[idx]),
                        'probability': float(probas[idx][1]) if probas.ndim > 1 else float(probas[idx]),
                        'model_type': model_type,
                        'timestamp': datetime.now().isoformat()
                    })
        
        return predictions
    
    def generate_feature_report(self) -> Dict[str, Any]:
        """Generate report on feature availability and quality"""
        report = {
            'timestamp': datetime.now().isoformat(),
            'feature_coverage': {},
            'missing_features': []
        }
        
        # Check feature coverage for each model type
        for model_type in ['churn', 'conversion', 'lead_score']:
            feature_names = self.get_feature_names(model_type)
            
            try:
                # Sample data
                sample_leads = pd.read_sql("SELECT id FROM leads LIMIT 100", self.db_url)
                features_df = self.get_features_from_store(sample_leads['id'].tolist(), feature_names)
                
                # Calculate coverage
                coverage = {}
                for feature in feature_names:
                    if feature in features_df.columns:
                        coverage[feature] = features_df[feature].notna().sum() / len(features_df)
                
                report['feature_coverage'][model_type] = coverage
                
            except Exception as e:
                logger.error(f"Failed to generate report for {model_type}: {e}")
                report['missing_features'].append({
                    'model_type': model_type,
                    'error': str(e)
                })
        
        return report

# Global ML service instance
ml_service = MLService()

# API endpoints for FastAPI integration
def train_model_endpoint(model_type: str, hyperparameter_tuning: bool = False) -> Dict[str, Any]:
    """API endpoint to train a model"""
    logger.info(f"Training model via API: {model_type}, tuning: {hyperparameter_tuning}")
    
    config = ModelConfig(
        model_type=model_type,
        target_column=f"{model_type}_target",
        feature_names=ml_service.get_feature_names(model_type),
        hyperparameter_tuning=hyperparameter_tuning,
        use_xgboost=True
    )
    
    try:
        metadata = ml_service.train_model(config)
        
        return {
            'success': True,
            'model_id': metadata.model_id,
            'metrics': metadata.metrics,
            'training_samples': metadata.training_samples,
            'message': f"Model {model_type} trained successfully"
        }
    except Exception as e:
        logger.error(f"Model training failed: {e}")
        return {
            'success': False,
            'error': str(e),
            'message': f"Failed to train model {model_type}"
        }

def predict_endpoint(model_type: str, entity_id: str) -> Dict[str, Any]:
    """API endpoint to make prediction for a single entity"""
    try:
        result = ml_service.predict_single(model_type, entity_id)
        return {
            'success': True,
            'data': result
        }
    except Exception as e:
        logger.error(f"Prediction failed: {e}")
        return {
            'success': False,
            'error': str(e)
        }

def batch_predict_endpoint(model_type: str, entity_ids: List[str]) -> Dict[str, Any]:
    """API endpoint to make predictions for multiple entities"""
    try:
        results = ml_service.batch_predict(model_type, entity_ids)
        return {
            'success': True,
            'data': results,
            'count': len(results)
        }
    except Exception as e:
        logger.error(f"Batch prediction failed: {e}")
        return {
            'success': False,
            'error': str(e)
        }

def feature_report_endpoint() -> Dict[str, Any]:
    """API endpoint to generate feature report"""
    try:
        report = ml_service.generate_feature_report()
        return {
            'success': True,
            'data': report
        }
    except Exception as e:
        logger.error(f"Feature report generation failed: {e}")
        return {
            'success': False,
            'error': str(e)
        }

# Model configurations for different use cases
MODEL_CONFIGS = {
    'churn': ModelConfig(
        model_type='churn',
        target_column='churned',
        feature_columns=[
            'quality_score', 'engagement_score', 'email_open_rate', 'click_through_rate',
            'activity_count_30d', 'activity_count_90d', 'days_since_last_activity',
            'insurance_type', 'source'
        ],
        use_xgboost=True,
        hyperparameter_tuning=True
    ),
    'conversion': ModelConfig(
        model_type='conversion',
        target_column='converted',
        feature_columns=[
            'quality_score', 'engagement_score', 'email_open_rate', 'click_through_rate',
            'activity_count_30d', 'activity_count_90d', 'days_since_first_contact',
            'agent_response_time_hours', 'quote_requests', 'insurance_type', 'source',
            'is_repeat_customer', 'coverage_amount_requested'
        ],
        use_xgboost=True,
        hyperparameter_tuning=True
    ),
    'lead_score': ModelConfig(
        model_type='lead_score',
        target_column='quality_score',
        feature_columns=[
            'contact_completeness', 'email_valid', 'phone_valid', 'has_address', 'source',
            'insurance_type', 'time_of_day', 'day_of_week', 'referral_source_quality',
            'form_completion_time_seconds', 'previous_visits'
        ],
        use_xgboost=True,
        hyperparameter_tuning=True
    )
}