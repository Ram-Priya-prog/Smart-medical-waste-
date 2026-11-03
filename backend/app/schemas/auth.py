from typing import Optional
from datetime import datetime
from pydantic import BaseModel, EmailStr, Field

class UserRegisterRequest(BaseModel):
    name: str = Field(..., min_length=2, max_length=120)
    email: EmailStr
    phone: str = Field(..., min_length=7, max_length=20)
    password: str = Field(..., min_length=6, max_length=100)
    confirm_password: str = Field(..., min_length=6, max_length=100)
    role: str = Field(..., pattern="^(hospital|collector)$") # Admin is registered via secure seed
    address: str = Field(..., min_length=3, max_length=255)
    latitude: float = Field(..., ge=-90.0, le=90.0)
    longitude: float = Field(..., ge=-180.0, le=180.0)
    vehicle_number: Optional[str] = None
    vehicle_type: Optional[str] = None
    vehicle_capacity_kg: Optional[float] = 250.0

class UserLoginRequest(BaseModel):
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    id: int
    name: str
    email: str
    phone: str
    role: str
    address: str
    latitude: float
    longitude: float
    vehicle_number: Optional[str] = None
    vehicle_type: Optional[str] = None
    vehicle_capacity_kg: Optional[float] = 250.0
    created_at: datetime

    class Config:
        from_attributes = True

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse
