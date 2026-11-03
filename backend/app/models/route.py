import datetime
from sqlalchemy import Column, Integer, String, Float, DateTime, Text, ForeignKey
from sqlalchemy.orm import relationship
from app.database import Base

class OptimizedRoute(Base):
    __tablename__ = "optimized_routes"

    id = Column(Integer, primary_key=True, index=True)
    route_code = Column(String(50), unique=True, index=True, nullable=False)
    collector_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    admin_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    
    # Status: 'Suggested', 'Confirmed', 'In-Progress', 'Completed', 'Cancelled'
    status = Column(String(30), default="Suggested", index=True, nullable=False)
    
    total_distance_km = Column(Float, default=0.0)
    total_duration_minutes = Column(Float, default=0.0)
    total_waste_kg = Column(Float, default=0.0)
    vehicle_capacity_kg = Column(Float, default=250.0)
    
    # Feasibility: 'Feasible', 'Warning', 'Infeasible'
    feasibility_status = Column(String(30), default="Feasible")
    feasibility_notes = Column(Text, nullable=True)
    
    # JSON-encoded array of [lat, lng] waypoints for map rendering
    route_geometry = Column(Text, nullable=True)
    
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    confirmed_at = Column(DateTime, nullable=True)
    completed_at = Column(DateTime, nullable=True)

    # Relationships
    collector = relationship("User", foreign_keys=[collector_id])
    admin = relationship("User", foreign_keys=[admin_id])
    stops = relationship("RouteStop", back_populates="route", cascade="all, delete-orphan", order_by="RouteStop.stop_order")
    pickups = relationship("PickupRequest", back_populates="route")


class RouteStop(Base):
    __tablename__ = "route_stops"

    id = Column(Integer, primary_key=True, index=True)
    route_id = Column(Integer, ForeignKey("optimized_routes.id"), nullable=False)
    pickup_id = Column(Integer, ForeignKey("pickup_requests.id"), nullable=False)
    hospital_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    stop_order = Column(Integer, nullable=False) # 1, 2, 3...
    
    distance_from_prev_km = Column(Float, default=0.0)
    estimated_arrival_minutes = Column(Float, default=0.0)
    time_window_start = Column(String(30), nullable=True)
    time_window_end = Column(String(30), nullable=True)
    waste_quantity_kg = Column(Float, default=0.0)
    
    # Status: 'Pending', 'Arrived', 'Collected', 'Skipped'
    status = Column(String(30), default="Pending")
    collected_at = Column(DateTime, nullable=True)

    # Relationships
    route = relationship("OptimizedRoute", back_populates="stops")
    pickup = relationship("PickupRequest", back_populates="route_stop")
    hospital = relationship("User", foreign_keys=[hospital_id])
