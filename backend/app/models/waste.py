import datetime
from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Boolean
from sqlalchemy.orm import relationship
from app.database import Base

class WasteRecord(Base):
    __tablename__ = "waste_records"

    id = Column(Integer, primary_key=True, index=True)
    hospital_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    category = Column(String(20), nullable=False) # 'Yellow', 'Red', 'White', 'Blue'
    waste_type = Column(String(120), nullable=False)
    quantity = Column(Float, nullable=False)
    unit = Column(String(10), default="kg", nullable=False)
    notes = Column(String(500), nullable=True)
    is_scheduled = Column(Boolean, default=False)
    
    # Waste Audit & Segregation Validation Fields
    audit_classification = Column(String(50), nullable=True) # 'Sharps', 'Anatomical', 'Cytotoxic', 'General', etc.
    has_sorting_warning = Column(Boolean, default=False)
    warning_reason = Column(String(300), nullable=True)
    is_corrected = Column(Boolean, default=False)
    original_category = Column(String(20), nullable=True)
    
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    # Relationships
    hospital = relationship("User", back_populates="waste_records", foreign_keys=[hospital_id])
    pickup_request = relationship("PickupRequest", back_populates="waste_record", uselist=False)
    corrections = relationship("WasteCorrection", back_populates="waste_record", cascade="all, delete-orphan")
