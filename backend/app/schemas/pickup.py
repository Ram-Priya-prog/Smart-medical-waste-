from typing import Optional
from datetime import datetime
from pydantic import BaseModel, Field
from app.schemas.auth import UserResponse
from app.schemas.waste import WasteRecordResponse

class PickupRequestCreate(BaseModel):
    waste_record_id: int
    storage_duration_hours: Optional[float] = Field(default=12.0, ge=0.5, le=168.0)
    pickup_address: Optional[str] = None # Defaults to hospital registered address if not provided
    preferred_time_window: Optional[str] = "09:00 - 13:00" # Preferred hospital collection slot
    time_window_start_min: Optional[int] = 60
    time_window_end_min: Optional[int] = 300
    notes: Optional[str] = None

class NearbyCollectorInfo(BaseModel):
    id: int
    name: str
    email: str
    phone: str
    address: str
    latitude: float
    longitude: float
    distance_km: float
    is_available: bool
    active_pickup_id: Optional[int] = None
    vehicle_number: Optional[str] = None
    vehicle_type: Optional[str] = None
    vehicle_capacity_kg: Optional[float] = 250.0

class PickupAssignRequest(BaseModel):
    collector_id: int

class PickupRequestResponse(BaseModel):
    id: int
    hospital_id: int
    collector_id: Optional[int] = None
    waste_record_id: int
    status: str
    
    # ML Delay Risk Prediction Fields
    delay_risk: str = "Medium"
    delay_probability: float = 0.5
    prediction_timestamp: Optional[datetime] = None
    model_version: Optional[str] = "rf-delay-v1.0"
    
    # Backward compatibility
    priority: Optional[str] = "Medium"
    priority_confidence: Optional[float] = 1.0
    
    pickup_address: str
    hospital_latitude: float
    hospital_longitude: float
    storage_duration_hours: float
    
    # Time window constraints
    preferred_time_window: Optional[str] = "09:00 - 13:00"
    time_window_start_min: Optional[int] = 60
    time_window_end_min: Optional[int] = 300
    route_id: Optional[int] = None
    stop_order: Optional[int] = None
    
    requested_at: datetime
    assigned_at: Optional[datetime] = None
    accepted_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    
    # Nested relations
    hospital: Optional[UserResponse] = None
    collector: Optional[UserResponse] = None
    waste_record: Optional[WasteRecordResponse] = None

    class Config:
        from_attributes = True
