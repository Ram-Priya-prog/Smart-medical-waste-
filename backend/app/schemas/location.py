from typing import Optional
from datetime import datetime
from pydantic import BaseModel, Field

class LocationUpdateRequest(BaseModel):
    pickup_id: Optional[int] = None
    latitude: float = Field(..., ge=-90.0, le=90.0)
    longitude: float = Field(..., ge=-180.0, le=180.0)

class CollectorLocationResponse(BaseModel):
    id: int
    collector_id: int
    pickup_id: Optional[int] = None
    latitude: float
    longitude: float
    updated_at: datetime

    class Config:
        from_attributes = True
