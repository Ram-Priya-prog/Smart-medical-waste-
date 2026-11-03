import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_
from app.database import get_db
from app.models.user import User
from app.models.waste import WasteRecord
from app.models.pickup import PickupRequest
from app.schemas.pickup import PickupRequestResponse
from app.auth.dependencies import get_current_user

router = APIRouter(prefix="/history", tags=["Collection History"])

@router.get("", response_model=List[PickupRequestResponse])
def get_collection_history(
    search: Optional[str] = None,
    category: Optional[str] = None,
    delay_risk: Optional[str] = None,
    priority: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Collection History endpoint.
    - Shows ONLY completed pickups (status == 'Collected').
    - Hospital: Sees only its own collections.
    - Collector: Sees only collections performed by them.
    - Admin: Sees all system-wide collections.
    """
    query = db.query(PickupRequest).join(WasteRecord, PickupRequest.waste_record_id == WasteRecord.id).filter(
        PickupRequest.status == "Collected"
    )

    if current_user.role == "hospital":
        query = query.filter(PickupRequest.hospital_id == current_user.id)
    elif current_user.role == "collector":
        query = query.filter(PickupRequest.collector_id == current_user.id)
    # Admin sees all

    if category:
        query = query.filter(WasteRecord.category == category)

    risk_filter = delay_risk or priority
    if risk_filter:
        clean_risk = risk_filter.replace(" RISK", "").replace(" DELAY", "").capitalize()
        query = query.filter(
            (PickupRequest.delay_risk == clean_risk) |
            (PickupRequest.delay_risk == risk_filter) |
            (PickupRequest.priority == clean_risk)
        )

    if search:
        s_term = f"%{search.strip()}%"
        query = query.filter(
            or_(
                WasteRecord.waste_type.ilike(s_term),
                PickupRequest.pickup_address.ilike(s_term)
            )
        )

    records = query.order_by(PickupRequest.completed_at.desc()).all()
    return [PickupRequestResponse.model_validate(r) for r in records]
