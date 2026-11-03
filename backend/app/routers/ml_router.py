from fastapi import APIRouter, HTTPException, status
from app.schemas.analytics import (
    MLDelayRiskPredictRequest,
    MLDelayRiskPredictResponse,
    MLPredictRequest,
    MLPredictResponse,
    MLMetricsResponse
)
from app.ml.predictor import predictor

router = APIRouter(prefix="/ml", tags=["Machine Learning Engine"])

@router.post("/predict-delay-risk", response_model=MLDelayRiskPredictResponse)
def predict_pickup_delay_risk(request_in: MLDelayRiskPredictRequest):
    """
    Execute delay risk prediction using trained Scikit-learn Random Forest model.
    Predicts probability of delay and classifies into:
    - HIGH DELAY RISK (>= 65%)
    - MEDIUM DELAY RISK (35% - 64%)
    - LOW DELAY RISK (< 35%)
    """
    result = predictor.predict_delay_risk(
        waste_category=request_in.waste_category,
        waste_quantity=request_in.waste_quantity,
        storage_duration_hours=request_in.storage_duration_hours,
        request_waiting_hours=request_in.request_waiting_hours,
        waste_risk_level=request_in.waste_risk_level,
        pickup_distance_km=request_in.pickup_distance_km or 5.0,
        previous_delay_hours=request_in.previous_delay_hours or 0.0,
        hospital_request_frequency=request_in.hospital_request_frequency or 3,
        collector_availability=request_in.collector_availability or 3,
        day_of_week=request_in.day_of_week,
        time_of_day=request_in.time_of_day
    )

    return MLDelayRiskPredictResponse(**result)

@router.post("/predict-priority", response_model=MLDelayRiskPredictResponse)
def predict_pickup_priority_legacy(request_in: MLPredictRequest):
    """
    Backward-compatible endpoint for predicting pickup delay risk.
    """
    return predict_pickup_delay_risk(request_in)

@router.get("/model-info")
def get_model_information():
    metrics = predictor.metrics or {}
    return {
        "model_name": "Random Forest Classifier",
        "task": "Medical Waste Pickup Delay Risk Prediction",
        "model_version": metrics.get("model_version", "rf-delay-v1.0"),
        "target": "is_delayed (0 = On-Time, 1 = Delayed)",
        "algorithm": "RandomForestClassifier (n_estimators=150, max_depth=12, balanced)",
        "risk_levels": ["LOW DELAY RISK", "MEDIUM DELAY RISK", "HIGH DELAY RISK"],
        "thresholds": {
            "high_risk_min": 0.65,
            "medium_risk_min": 0.35,
            "low_risk_max": 0.35
        },
        "features": {
            "categorical": ["waste_category"],
            "numerical": [
                "waste_quantity",
                "storage_duration_hours",
                "request_waiting_hours",
                "waste_risk_level",
                "pickup_distance_km",
                "previous_delay_hours",
                "hospital_request_frequency",
                "collector_availability",
                "day_of_week",
                "time_of_day"
            ]
        },
        "classes": metrics.get("classes", ["On-Time", "Delayed"]),
        "status": "Loaded and Active in Production Runtime"
    }

@router.get("/metrics", response_model=MLMetricsResponse)
def get_model_metrics():
    """
    Returns authentic evaluation metrics computed strictly from the 20% unseen test dataset.
    """
    if not predictor.metrics:
        predictor.load_model_and_metrics()
        
    if not predictor.metrics:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Model metrics file not found. Please ensure train_model.py has run."
        )

    return MLMetricsResponse(
        model_name=predictor.metrics.get("model_name", "Random Forest Classifier"),
        task=predictor.metrics.get("task", "Medical Waste Pickup Delay Risk Prediction"),
        model_version=predictor.metrics.get("model_version", "rf-delay-v1.0"),
        target=predictor.metrics.get("target", "is_delayed"),
        classes=predictor.metrics.get("classes", ["On-Time", "Delayed"]),
        risk_levels=predictor.metrics.get("risk_levels", ["LOW DELAY RISK", "MEDIUM DELAY RISK", "HIGH DELAY RISK"]),
        thresholds=predictor.metrics.get("thresholds", {"high_risk_min": 0.65, "medium_risk_min": 0.35, "low_risk_max": 0.35}),
        dataset_records_total=predictor.metrics.get("dataset_records_total", 1800),
        training_records=predictor.metrics.get("training_records", 1440),
        testing_records=predictor.metrics.get("testing_records", 360),
        metrics=predictor.metrics.get("metrics", {}),
        confusion_matrix=predictor.metrics.get("confusion_matrix", {}),
        classification_report=predictor.metrics.get("classification_report", {}),
        feature_importances=predictor.metrics.get("feature_importances", [])
    )
