import datetime
from sqlalchemy import Column, Integer, Float, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from app.database import Base

class CollectorLocation(Base):
    __tablename__ = "collector_locations"

    id = Column(Integer, primary_key=True, index=True)
    collector_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    pickup_id = Column(Integer, ForeignKey("pickup_requests.id"), nullable=True)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    # Relationships
    collector = relationship("User", back_populates="locations")
    pickup = relationship("PickupRequest", back_populates="locations")
