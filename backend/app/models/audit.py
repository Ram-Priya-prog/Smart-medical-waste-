import datetime
from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from app.database import Base

class WasteCorrection(Base):
    __tablename__ = "waste_corrections"

    id = Column(Integer, primary_key=True, index=True)
    waste_record_id = Column(Integer, ForeignKey("waste_records.id"), nullable=False)
    hospital_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    
    previous_category = Column(String(20), nullable=False)
    new_category = Column(String(20), nullable=False)
    previous_audit_class = Column(String(50), nullable=True)
    new_audit_class = Column(String(50), nullable=True)
    
    correction_reason = Column(String(500), nullable=False)
    corrected_at = Column(DateTime, default=datetime.datetime.utcnow)

    # Relationships
    waste_record = relationship("WasteRecord", back_populates="corrections")
    hospital = relationship("User", foreign_keys=[hospital_id])
    user = relationship("User", foreign_keys=[user_id])
