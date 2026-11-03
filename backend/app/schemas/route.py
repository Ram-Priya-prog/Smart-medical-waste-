from typing import List, Optional
from datetime import datetime
from pydantic import BaseModel, Field

class RouteOptimizeRequest(BaseModel):
    collector_id: int
    pickup_ids: List[int]
    consider_capacity: bool = True
    consider_time_windows: bool = True
    return_to_depot: bool = True

class RouteStopResponse(BaseModel):
    id: Optional[int] = None
    stop_order: int
    pickup_id: int
    hospital_id: int
    hospital_name: str
    hospital_address: str
    hospital_phone: str
    latitude: float
    longitude: float
    waste_category: str
    waste_type: str
    waste_quantity_kg: float
    distance_from_prev_km: float
    cumulative_distance_km: float
    estimated_arrival_minutes: float
    time_window_start: Optional[str] = None
    time_window_end: Optional[str] = None
    status: str = "Pending"
    delay_risk: Optional[str] = "Medium"

    class Config:
        from_attributes = True

class OptimizedRouteResponse(BaseModel):
    id: Optional[int] = None
    route_code: str
    collector_id: int
    collector_name: str
    collector_phone: str
    collector_address: str
    collector_start_lat: float
    collector_start_lng: float
    vehicle_number: Optional[str] = None
    vehicle_type: Optional[str] = None
    vehicle_capacity_kg: float
    total_waste_kg: float
    capacity_utilization_pct: float
    total_distance_km: float
    total_duration_minutes: float
    stops: List[RouteStopResponse]
    route_geometry: List[List[float]] = [] # [[lat, lng], ...]
    feasibility_status: str = "Feasible" # "Feasible", "Warning", "Infeasible"
    feasibility_notes: Optional[str] = None
    status: str = "Suggested" # "Suggested", "Confirmed", "In-Progress", "Completed"
    created_at: Optional[datetime] = None
    confirmed_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class RouteConfirmRequest(BaseModel):
    collector_id: int
    pickup_ids: List[int]
    route_code: Optional[str] = None
