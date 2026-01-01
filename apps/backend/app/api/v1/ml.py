"""
Machine Learning API Endpoints

Provides REST API endpoints for:
- Model training and management
- Real-time predictions
- Batch predictions
- Feature reporting
"""

from fastapi import APIRouter, HTTPException, BackgroundTasks
from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional
from datetime import datetime
import sys
import os

# Add parent directories to path
sys.path.append(os.path.join(os.path.dirname(__file__), '../../..'))

from app.services.ml_service import (
    ml_service, train_model_endpoint, predict_endpoint, 
    batch_predict_endpoint, feature_report_endpoint, MODEL_CONFIGS
)

router = APIRouter(prefix="/ml", tags=["Machine Learning"])

# Pydantic models for request/response
class TrainModelRequest(BaseModel):
    model_type: str = Field(..., description="Model type: churn, conversion, or lead_score")
    hyperparameter_tuning: bool = Field(False, description="Enable hyperparameter tuning")

class TrainModelResponse(BaseModel):
    success: bool
    model_id: Optional[str] = None
    metrics: Optional[Dict[str, float]] = None
    training_samples: Optional[int] = None
    message: str

class PredictionRequest(BaseModel):
    model_type: str = Field(..., description="Model type: churn, conversion, or lead_score")
    entity_id: str = Field(..., description="ID of the entity to predict")

class BatchPredictionRequest(BaseModel):
    model_type: str = Field(..., description="Model type: churn, conversion, or lead_score")
    entity_ids: List[str] = Field(..., description="List of entity IDs to predict")

class PredictionResponse(BaseModel):
    success: bool
    data: Optional[Dict[str, Any]] = None
    error: Optional[str] = None

class BatchPredictionResponse(BaseModel):
    success: bool
    data: Optional[List[Dict[str, Any]]] = None
    count: Optional[int] = None
    error: Optional[str] = None

class FeatureReportResponse(BaseModel):
    success: bool
    data: Optional[Dict[str, Any]] = None
    error: Optional[str] = None

class ModelMetadataResponse(BaseModel):
    model_id: str
    model_type: str
    version: str
    created_at: datetime
    metrics: Dict[str, float]
    feature_importance: Dict[str, float]
    training_samples: int
    test_samples: int
    is_production: bool

@router.post("/train", response_model=TrainModelResponse)
async def train_model(request: TrainModelRequest):
    """
    Train a machine learning model
    
    Trains a model for the specified type with optional hyperparameter tuning.
    This is a background job that may take several minutes.
    """
    try:
        # Validate model type
        if request.model_type not in MODEL_CONFIGS:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid model type. Must be one of: {list(MODEL_CONFIGS.keys())}"
            )
        
        # Train model (synchronous for this endpoint)
        result = train_model_endpoint(request.model_type, request.hyperparameter_tuning)
        
        if not result['success']:
            raise HTTPException(status_code=500, detail=result.get('error', 'Training failed'))
        
        return TrainModelResponse(**result)
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Training failed: {str(e)}")

@router.post("/predict", response_model=PredictionResponse)
async def predict(request: PredictionRequest):
    """
    Make a prediction for a single entity
    
    Uses the latest trained model for the specified type to make a prediction.
    """
    try:
        # Validate model type
        if request.model_type not in MODEL_CONFIGS:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid model type. Must be one of: {list(MODEL_CONFIGS.keys())}"
            )
        
        # Make prediction
        result = predict_endpoint(request.model_type, request.entity_id)
        
        if not result['success']:
            raise HTTPException(status_code=500, detail=result.get('error', 'Prediction failed'))
        
        return PredictionResponse(
            success=True,
            data=result['data'],
            error=None
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Prediction failed: {str(e)}")

@router.post("/predict/batch", response_model=BatchPredictionResponse)
async def batch_predict(request: BatchPredictionRequest):
    """
    Make predictions for multiple entities
    
    Efficiently processes multiple entities in batches for bulk predictions.
    """
    try:
        # Validate model type
        if request.model_type not in MODEL_CONFIGS:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid model type. Must be one of: {list(MODEL_CONFIGS.keys())}"
            )
        
        # Validate entity IDs
        if not request.entity_ids:
            raise HTTPException(status_code=400, detail="entity_ids cannot be empty")
        
        if len(request.entity_ids) > 1000:
            raise HTTPException(status_code=400, detail="Maximum batch size is 1000 entities")
        
        # Make predictions
        result = batch_predict_endpoint(request.model_type, request.entity_ids)
        
        if not result['success']:
            raise HTTPException(status_code=500, detail=result.get('error', 'Batch prediction failed'))
        
        return BatchPredictionResponse(
            success=True,
            data=result['data'],
            count=result['count'],
            error=None
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Batch prediction failed: {str(e)}")

@router.get("/models/latest/{model_type}", response_model=ModelMetadataResponse)
async def get_latest_model(model_type: str):
    """
    Get metadata for the latest trained model of a specific type
    """
    try:
        # Validate model type
        if model_type not in MODEL_CONFIGS:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid model type. Must be one of: {list(MODEL_CONFIGS.keys())}"
            )
        
        # Get latest model ID from Redis
        import redis
        redis_client = redis.from_url(ml_service.redis_url, decode_responses=True)
        model_id = redis_client.get(f"model:{model_type}:latest")
        
        if not model_id:
            raise HTTPException(status_code=404, detail=f"No trained model found for {model_type}")
        
        # Load metadata
        metadata_path = os.path.join(ml_service.models_dir, f"{model_id}_metadata.json")
        if not os.path.exists(metadata_path):
            raise HTTPException(status_code=404, detail=f"Model metadata not found for {model_id}")
        
        import json
        with open(metadata_path, 'r') as f:
            metadata_dict = json.load(f)
        
        return ModelMetadataResponse(**metadata_dict)
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to load model metadata: {str(e)}")

@router.get("/features/report", response_model=FeatureReportResponse)
async def feature_report():
    """
    Generate a report on feature availability and quality
    
    This helps diagnose feature coverage issues and monitor data quality
    for ML model performance.
    """
    try:
        result = feature_report_endpoint()
        
        if not result['success']:
            raise HTTPException(status_code=500, detail=result.get('error', 'Report generation failed'))
        
        return FeatureReportResponse(
            success=True,
            data=result['data'],
            error=None
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Feature report generation failed: {str(e)}")

@router.get("/health")
async def health_check():
    """
    Health check endpoint for ML service
    """
    try:
        # Check Redis connection
        ml_service.redis_client.ping()
        
        # Check model directory
        if not os.path.exists(ml_service.models_dir):
            raise Exception("Models directory not found")
        
        # Check features directory
        features_dir = os.path.join(os.path.dirname(__file__), '../ml_features')
        if not os.path.exists(features_dir):
            os.makedirs(features_dir, exist_ok=True)
        
        return {
            "status": "healthy",
            "timestamp": datetime.now().isoformat(),
            "ml_models_count": len([f for f in os.listdir(ml_service.models_dir) if f.endswith('.pkl')]),
            "redis_connected": True,
            "feature_store_accessible": True
        }
        
    except Exception as e:
        logger.error(f"Health check failed: {e}")
        raise HTTPException(status_code=503, detail=f"ML service unhealthy: {str(e)}")

@router.post("/models/{model_type}/set-production")
async def set_production_model(model_type: str, model_id: str):
    """
    Set a specific model as the production model
    
    This allows for A/B testing and gradual rollout of new models.
    """
    try:
        # Validate model type
        if model_type not in MODEL_CONFIGS:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid model type. Must be one of: {list(MODEL_CONFIGS.keys())}"
            )
        
        # Check if model exists
        model_path = os.path.join(ml_service.models_dir, f"{model_id}.pkl")
        if not os.path.exists(model_path):
            raise HTTPException(status_code=404, detail=f"Model {model_id} not found")
        
        # Update Redis to point to this model
        redis_client = redis.from_url(ml_service.redis_url, decode_responses=True)
        redis_client.set(f"model:{model_type}:latest", model_id)
        
        # Update metadata
        metadata_path = os.path.join(ml_service.models_dir, f"{model_id}_metadata.json")
        if os.path.exists(metadata_path):
            import json
            with open(metadata_path, 'r') as f:
                metadata = json.load(f)
            metadata['is_production'] = True
            
            with open(metadata_path, 'w') as f:
                json.dump(metadata, f, default=str)
        
        return {
            "success": True,
            "message": f"Model {model_id} set as production model for {model_type}",
            "model_type": model_type,
            "model_id": model_id
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to set production model: {str(e)}")

# Error handlers
@router.exception_handler(Exception)
async def general_exception_handler(request, exc):
    logger.error(f"Unhandled exception in ML API: {exc}")
    return {
        "success": False,
        "error": str(exc),
        "timestamp": datetime.now().isoformat()
    }