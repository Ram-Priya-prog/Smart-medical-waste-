from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field

class MLDelayRiskPredictRequest(BaseModel):
    waste_category: str = Field(..., pattern="^(Yellow|Red|White|Blue)$")
    waste_quantity: float = Field(..., gt=0)
    storage_duration_hours: float = Field(default=12.0, ge=0)
    request_waiting_hours: float = Field(default=1.0, ge=0)
    waste_risk_level: Optional[int] = None
    pickup_distance_km: Optional[float] = 5.0
    previous_delay_hours: Optional[float] = 0.0
    hospital_request_frequency: Optional[int] = 3
    collector_availability: Optional[int] = 3
    day_of_week: Optional[int] = None
    time_of_day: Optional[int] = None

# Backward compatibility alias
MLPredictRequest = MLDelayRiskPredictRequest

class MLDelayRiskPredictResponse(BaseModel):
    delay_risk: str # "HIGH DELAY RISK", "MEDIUM DELAY RISK", "LOW DELAY RISK"
    risk_level: str # "High", "Medium", "Low"
    delay_probability: float
    is_delayed: int # 0 or 1
    probabilities: Dict[str, float]
    model_version: str = "rf-delay-v1.0"
    
    # Backward compatibility fields
    priority: str = "Medium"
    confidence: float = 0.5

# Backward compatibility alias
MLPredictResponse = MLDelayRiskPredictResponse

class AnalyticsOverview(BaseModel):
    total_hospitals: int
    total_collectors: int
    total_waste_recorded_kg: float
    total_waste_collected_kg: float
    pending_pickups: int
    assigned_pickups: int
    active_pickups: int
    completed_collections: int

class CategoryDistributionItem(BaseModel):
    category: str
    quantity_kg: float
    record_count: int
    percentage: float
    color: str

class DelayRiskDistributionItem(BaseModel):
    risk_level: str # "High", "Medium", "Low"
    delay_risk: str # "HIGH DELAY RISK", "MEDIUM DELAY RISK", "LOW DELAY RISK"
    count: int
    percentage: float
    color: str
    # Compatibility
    priority: Optional[str] = None

# Backward compatibility alias
PriorityDistributionItem = DelayRiskDistributionItem

class StatusDistributionItem(BaseModel):
    status: str
    count: int

class WasteTrendItem(BaseModel):
    period: str
    quantity_kg: float
    pickups_count: int

class MLMetricsResponse(BaseModel):
    model_name: str
    task: str
    model_version: Optional[str] = "rf-delay-v1.0"
    target: Optional[str] = "is_delayed"
    classes: List[str]
    risk_levels: Optional[List[str]] = None
    thresholds: Optional[Dict[str, float]] = None
    dataset_records_total: int
    training_records: int
    testing_records: int
    metrics: Dict[str, float]
    confusion_matrix: Dict[str, Any]
    classification_report: Dict[str, Any]
    feature_importances: List[Dict[str, Any]]
