import datetime
from sqlalchemy import Column, Integer, String, Float, DateTime
from sqlalchemy.orm import relationship
from app.database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(120), nullable=False)
    email = Column(String(150), unique=True, index=True, nullable=False)
    phone = Column(String(30), nullable=False)
    password_hash = Column(String(255), nullable=False) # NEVER plain text
    role = Column(String(20), nullable=False) # 'hospital', 'collector', 'admin'
    address = Column(String(255), nullable=False)
    latitude = Column(Float, nullable=False, default=0.0)
    longitude = Column(Float, nullable=False, default=0.0)
    
    # Vehicle and fleet capacity configuration (Collector fleet)
    vehicle_number = Column(String(50), nullable=True)
    vehicle_type = Column(String(80), nullable=True) # e.g. 'Tata Ace Bio-Carrier', 'Mahindra Bolero Maxi-Truck'
    vehicle_capacity_kg = Column(Float, nullable=True, default=250.0)
    
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    # Relationships
    waste_records = relationship("WasteRecord", back_populates="hospital", cascade="all, delete-orphan", foreign_keys="WasteRecord.hospital_id")
    hospital_pickups = relationship("PickupRequest", back_populates="hospital", foreign_keys="PickupRequest.hospital_id")
    collector_pickups = relationship("PickupRequest", back_populates="collector", foreign_keys="PickupRequest.collector_id")
    locations = relationship("CollectorLocation", back_populates="collector", cascade="all, delete-orphan")
