import datetime
from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from app.database import Base

class PickupRequest(Base):
    __tablename__ = "pickup_requests"

    id = Column(Integer, primary_key=True, index=True)
    hospital_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    collector_id = Column(Integer, ForeignKey("users.id"), nullable=True) # Set only by Admin
    waste_record_id = Column(Integer, ForeignKey("waste_records.id"), nullable=False)
    
    # Statuses: 'Pending', 'Assigned', 'Accepted', 'Collected', 'Cancelled'
    status = Column(String(30), default="Pending", nullable=False, index=True)
    
    # ML predicted delay risk: 'High', 'Medium', 'Low' (HIGH / MEDIUM / LOW DELAY RISK)
    delay_risk = Column(String(30), default="Medium", nullable=False, index=True)
    delay_probability = Column(Float, default=0.5)
    prediction_timestamp = Column(DateTime, default=datetime.datetime.utcnow)
    model_version = Column(String(50), default="rf-delay-v1.0")
    
    # Backward compatibility fields
    priority = Column(String(20), default="Medium", nullable=False, index=True)
    priority_confidence = Column(Float, default=1.0)
    
    pickup_address = Column(String(255), nullable=False)
    hospital_latitude = Column(Float, nullable=False)
    hospital_longitude = Column(Float, nullable=False)
    
    storage_duration_hours = Column(Float, default=12.0)
    
    # Pickup Time Window Constraints (for Multi-Stop Route Optimization)
    preferred_time_window = Column(String(50), nullable=True, default="09:00 - 13:00")
    time_window_start_min = Column(Integer, nullable=True, default=60) # minutes relative to depot dispatch
    time_window_end_min = Column(Integer, nullable=True, default=300)
    
    # Multi-stop route assignment reference
    route_id = Column(Integer, ForeignKey("optimized_routes.id"), nullable=True)
    stop_order = Column(Integer, nullable=True)
    
    requested_at = Column(DateTime, default=datetime.datetime.utcnow)
    assigned_at = Column(DateTime, nullable=True)
    accepted_at = Column(DateTime, nullable=True)
    completed_at = Column(DateTime, nullable=True)

    # Relationships
    hospital = relationship("User", back_populates="hospital_pickups", foreign_keys=[hospital_id])
    collector = relationship("User", back_populates="collector_pickups", foreign_keys=[collector_id])
    waste_record = relationship("WasteRecord", back_populates="pickup_request")
    locations = relationship("CollectorLocation", back_populates="pickup", cascade="all, delete-orphan")
    route = relationship("OptimizedRoute", back_populates="pickups", foreign_keys=[route_id])
    route_stop = relationship("RouteStop", back_populates="pickup", uselist=False)
