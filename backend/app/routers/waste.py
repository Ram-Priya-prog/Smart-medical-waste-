from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.user import User
from app.models.waste import WasteRecord
from app.schemas.waste import WasteRecordCreate, WasteRecordResponse
from app.auth.dependencies import get_current_user, require_roles
from app.services.audit_service import validate_waste_sorting

router = APIRouter(prefix="/waste", tags=["Medical Waste Records"])

@router.post("", response_model=WasteRecordResponse, status_code=status.HTTP_201_CREATED)
def record_waste(
    waste_in: WasteRecordCreate,
    current_user: User = Depends(require_roles(["hospital", "admin"])),
    db: Session = Depends(get_db)
):
    """
    Hospital records newly generated biomedical waste batch.
    """
    # Verify valid category
    valid_categories = {"Yellow", "Red", "White", "Blue"}
    if waste_in.category not in valid_categories:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid waste category '{waste_in.category}'. Allowed: {', '.join(valid_categories)}"
        )

    # Run Bio-Medical Waste Management Rules segregation validation
    audit_class, has_warn, warn_reason, _ = validate_waste_sorting(
        waste_in.category, waste_in.waste_type, waste_in.notes
    )

    record = WasteRecord(
        hospital_id=current_user.id,
        category=waste_in.category,
        audit_classification=audit_class,
        waste_type=waste_in.waste_type.strip(),
        quantity=float(waste_in.quantity),
        unit=waste_in.unit.strip(),
        notes=waste_in.notes.strip() if waste_in.notes else None,
        is_scheduled=False,
        has_sorting_warning=has_warn,
        warning_reason=warn_reason
    )
    db.add(record)
    db.commit()
    db.refresh(record)
    return WasteRecordResponse.model_validate(record)

@router.get("", response_model=List[WasteRecordResponse])
def list_waste_records(
    category: Optional[str] = None,
    scheduled: Optional[bool] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    List waste records.
    Hospitals can only access their own records.
    Admin can access all records.
    """
    query = db.query(WasteRecord)

    if current_user.role == "hospital":
        query = query.filter(WasteRecord.hospital_id == current_user.id)
    elif current_user.role == "collector":
        # Collector cannot view arbitrary hospital waste records directly
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Collectors only access assigned pickup requests."
        )

    if category:
        query = query.filter(WasteRecord.category == category)
    if scheduled is not None:
        query = query.filter(WasteRecord.is_scheduled == scheduled)

    records = query.order_by(WasteRecord.created_at.desc()).all()
    return [WasteRecordResponse.model_validate(r) for r in records]

@router.get("/{record_id}", response_model=WasteRecordResponse)
def get_waste_record(
    record_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    record = db.query(WasteRecord).filter(WasteRecord.id == record_id).first()
    if not record:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Waste record not found")

    if current_user.role == "hospital" and record.hospital_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied to other hospital records")

    return WasteRecordResponse.model_validate(record)
