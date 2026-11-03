from typing import List, Optional, Dict, Any
from datetime import datetime
from pydantic import BaseModel, Field

class WasteAuditRecordResponse(BaseModel):
    id: int
    hospital_id: int
    category: str
    audit_classification: Optional[str] = None
    waste_type: str
    quantity: float
    unit: str
    notes: Optional[str] = None
    is_scheduled: bool
    has_sorting_warning: bool = False
    warning_reason: Optional[str] = None
    is_corrected: bool = False
    original_category: Optional[str] = None
    created_at: datetime
    pickup_status: Optional[str] = None

    class Config:
        from_attributes = True

class SortingWarningResponse(BaseModel):
    record_id: int
    waste_type: str
    selected_category: str
    recommended_category: str
    audit_classification: str
    warning_reason: str
    quantity: float
    created_at: datetime

class CorrectionHistoryResponse(BaseModel):
    id: int
    waste_record_id: int
    hospital_id: int
    previous_category: str
    new_category: str
    previous_audit_class: Optional[str] = None
    new_audit_class: Optional[str] = None
    correction_reason: str
    corrected_at: datetime
    corrected_by_user_id: Optional[int] = None

    class Config:
        from_attributes = True

class CategoryDistributionItem(BaseModel):
    name: str # 'Sharps', 'Anatomical', 'Cytotoxic', 'General', 'Contaminated Plastics', 'Glassware'
    quantity: float
    percentage: float
    color: str

class MonthlyAuditSummary(BaseModel):
    hospital_id: int
    hospital_name: str
    hospital_address: str
    year: int
    month: int
    month_name: str
    total_waste_kg: float
    total_sharps_kg: float
    total_anatomical_kg: float
    total_cytotoxic_kg: float
    total_general_kg: float
    total_contaminated_plastics_kg: float
    total_glassware_kg: float
    total_records: int
    total_pickups: int
    inconsistencies_count: int
    category_distribution: List[CategoryDistributionItem]
    monthly_trend: List[Dict[str, Any]]
    records: List[WasteAuditRecordResponse]
    warnings: List[SortingWarningResponse]
    corrections: List[CorrectionHistoryResponse]
    regulatory_disclaimer: str

class WasteCorrectionRequest(BaseModel):
    new_category: str
    new_audit_class: Optional[str] = None
    correction_reason: str

class HospitalAuditStat(BaseModel):
    hospital_id: int
    hospital_name: str
    hospital_address: str
    total_waste_kg: float
    total_sharps_kg: float
    total_anatomical_kg: float
    total_cytotoxic_kg: float
    total_general_kg: float
    records_count: int
    warnings_count: int

class AdminSystemAuditOverview(BaseModel):
    year: int
    month: int
    total_hospitals: int
    total_system_waste_kg: float
    total_sharps_kg: float
    total_anatomical_kg: float
    total_cytotoxic_kg: float
    total_general_kg: float
    total_inconsistencies: int
    hospitals_summary: List[HospitalAuditStat]
    category_distribution: List[CategoryDistributionItem]
    regulatory_disclaimer: str
