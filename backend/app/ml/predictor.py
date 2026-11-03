"""
Smart Medical-Waste Collection System
Machine Learning Predictor Service: Pickup Delay Risk Prediction
File: backend/app/ml/predictor.py

Loads the trained Random Forest Classifier pipeline (pickup_delay_risk_model.joblib)
and predicts the probability of delay for medical-waste pickup requests.
Maps predicted delay probabilities to risk categories:
- Delay Probability >= 0.65 -> HIGH DELAY RISK ("High")
- 0.35 <= Delay Probability < 0.65 -> MEDIUM DELAY RISK ("Medium")
- Delay Probability < 0.35 -> LOW DELAY RISK ("Low")
"""

import os
import json
import joblib
import numpy as np
import pandas as pd
from typing import Dict, Any, Tuple
from app.config import settings

class MLPickupPredictor:
    def __init__(self):
        self.model = None
        self.metrics = None
        self.model_version = "rf-delay-v1.0"
        self.load_model_and_metrics()

    def load_model_and_metrics(self):
        # 1. Load trained delay risk model
        primary_path = settings.ML_MODEL_PATH
        fallback_path = getattr(settings, 'ML_LEGACY_MODEL_PATH', primary_path)
        
        target_path = primary_path if os.path.exists(primary_path) else fallback_path
        try:
            if os.path.exists(target_path):
                self.model = joblib.load(target_path)
                print(f"[ML Predictor] Successfully loaded delay risk model from {target_path}")
            else:
                print(f"[ML Predictor] Model file not found at {target_path}.")
        except Exception as e:
            print(f"[ML Predictor] Error loading model: {e}")

        # 2. Load metrics
        try:
            if os.path.exists(settings.ML_METRICS_PATH):
                with open(settings.ML_METRICS_PATH, "r") as f:
                    self.metrics = json.load(f)
                    self.model_version = self.metrics.get("model_version", "rf-delay-v1.0")
        except Exception as e:
            print(f"[ML Predictor] Error loading metrics: {e}")

    def predict(
        self,
        waste_category: str,
        waste_quantity: float,
        storage_duration_hours: float = 12.0,
        request_waiting_hours: float = 1.0,
        waste_risk_level: int = None,
        pickup_distance_km: float = 5.0,
        previous_delay_hours: float = 0.0,
        hospital_request_frequency: int = 3,
        collector_availability: int = 3,
        day_of_week: int = None,
        time_of_day: int = None
    ) -> Tuple[str, float, Dict[str, float]]:
        """
        Unified prediction method.
        Returns:
            Tuple[delay_risk ("High"|"Medium"|"Low"), delay_probability (float), probabilities (dict)]
        """
        result = self.predict_delay_risk(
            waste_category=waste_category,
            waste_quantity=waste_quantity,
            storage_duration_hours=storage_duration_hours,
            request_waiting_hours=request_waiting_hours,
            waste_risk_level=waste_risk_level,
            pickup_distance_km=pickup_distance_km,
            previous_delay_hours=previous_delay_hours,
            hospital_request_frequency=hospital_request_frequency,
            collector_availability=collector_availability,
            day_of_week=day_of_week,
            time_of_day=time_of_day
        )
        return result["risk_level"], result["delay_probability"], result["probabilities"]

    def predict_delay_risk(
        self,
        waste_category: str,
        waste_quantity: float,
        storage_duration_hours: float = 12.0,
        request_waiting_hours: float = 1.0,
        waste_risk_level: int = None,
        pickup_distance_km: float = 5.0,
        previous_delay_hours: float = 0.0,
        hospital_request_frequency: int = 3,
        collector_availability: int = 3,
        day_of_week: int = None,
        time_of_day: int = None
    ) -> Dict[str, Any]:
        """
        Executes full Delay Risk inference.
        Returns detailed dictionary with probability, binary classification, and risk tier.
        """
        if waste_risk_level is None:
            risk_map = {'Yellow': 4, 'White': 4, 'Red': 3, 'Blue': 2}
            waste_risk_level = risk_map.get(waste_category, 3)
            
        import datetime
        now = datetime.datetime.now()
        if day_of_week is None:
            day_of_week = now.weekday()
        if time_of_day is None:
            time_of_day = now.hour

        input_data = pd.DataFrame([{
            'waste_category': waste_category,
            'waste_quantity': float(waste_quantity),
            'storage_duration_hours': float(storage_duration_hours),
            'request_waiting_hours': float(request_waiting_hours),
            'waste_risk_level': int(waste_risk_level),
            'pickup_distance_km': float(pickup_distance_km),
            'previous_delay_hours': float(previous_delay_hours),
            'hospital_request_frequency': int(hospital_request_frequency),
            'collector_availability': int(collector_availability),
            'day_of_week': int(day_of_week),
            'time_of_day': int(time_of_day)
        }])

        delay_prob = None
        is_delayed = 0
        probas_dict = {"On-Time": 0.5, "Delayed": 0.5}

        if self.model is not None:
            try:
                classes = list(self.model.named_steps['classifier'].classes_)
                probas = self.model.predict_proba(input_data)[0]
                
                # Check whether classes are binary [0, 1]
                if 1 in classes:
                    idx_delayed = classes.index(1)
                    delay_prob = float(probas[idx_delayed])
                elif "Delayed" in classes:
                    idx_delayed = classes.index("Delayed")
                    delay_prob = float(probas[idx_delayed])
                elif len(probas) == 2:
                    delay_prob = float(probas[1])
                else:
                    # Multi-class legacy fallback
                    delay_prob = float(probas[0])
                
                delay_prob = float(np.clip(delay_prob, 0.01, 0.99))
                is_delayed = 1 if delay_prob >= 0.50 else 0
                probas_dict = {
                    "On-Time": round(1.0 - delay_prob, 4),
                    "Delayed": round(delay_prob, 4)
                }
            except Exception as e:
                print(f"[ML Predictor] Inference error: {e}")

        # Domain formula fallback if model inference failed or model not loaded
        if delay_prob is None:
            is_peak = 1.0 if time_of_day in [8, 9, 10, 11, 16, 17, 18, 19] else 0.0
            is_wknd = 1.0 if day_of_week >= 5 else 0.0
            score = (
                (request_waiting_hours * 0.12) +
                (storage_duration_hours * 0.038) +
                (pickup_distance_km * 0.075) +
                (waste_quantity * 0.012) +
                (previous_delay_hours * 0.14) -
                (collector_availability * 0.72) +
                (is_peak * 0.60) +
                (is_wknd * 0.50) +
                (waste_risk_level * 0.22) +
                (0.35 if waste_category in ['Yellow', 'White'] else 0.0) -
                2.6
            )
            delay_prob = 1.0 / (1.0 + np.exp(-score))
            delay_prob = float(np.clip(delay_prob, 0.02, 0.98))
            is_delayed = 1 if delay_prob >= 0.50 else 0
            probas_dict = {
                "On-Time": round(1.0 - delay_prob, 4),
                "Delayed": round(delay_prob, 4)
            }

        # Threshold calibration:
        # >= 0.65 -> HIGH DELAY RISK
        # 0.35 <= p < 0.65 -> MEDIUM DELAY RISK
        # < 0.35 -> LOW DELAY RISK
        if delay_prob >= 0.65:
            risk_level = "High"
            delay_risk_label = "HIGH DELAY RISK"
        elif delay_prob >= 0.35:
            risk_level = "Medium"
            delay_risk_label = "MEDIUM DELAY RISK"
        else:
            risk_level = "Low"
            delay_risk_label = "LOW DELAY RISK"

        return {
            "delay_risk": delay_risk_label,
            "risk_level": risk_level,
            "delay_probability": round(delay_prob, 4),
            "is_delayed": is_delayed,
            "probabilities": probas_dict,
            "model_version": self.model_version,
            # Backward compatibility
            "priority": risk_level,
            "confidence": round(delay_prob, 4)
        }

predictor = MLPickupPredictor()
