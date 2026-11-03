import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.user import User
from app.models.pickup import PickupRequest
from app.schemas.pickup import PickupRequestResponse
from app.auth.dependencies import require_roles

router = APIRouter(prefix="/collector", tags=["Collector Operations"])

@router.get("/pickups/assigned", response_model=List[PickupRequestResponse])
def get_my_assigned_pickups(
    current_user: User = Depends(require_roles(["collector"])),
    db: Session = Depends(get_db)
):
    """
    Collector views all pickup requests assigned to them by the Admin.
    Only pickups in 'Assigned' status are shown here for acceptance.
    """
    pickups = db.query(PickupRequest).filter(
        PickupRequest.collector_id == current_user.id,
        PickupRequest.status == "Assigned"
    ).order_by(PickupRequest.assigned_at.desc()).all()

    # Delay risk sorting: High > Medium > Low
    p_weight = {"High": 3, "Medium": 2, "Low": 1}
    pickups.sort(key=lambda x: (p_weight.get(x.delay_risk or x.priority, 0), x.assigned_at or datetime.datetime.min), reverse=True)

    return [PickupRequestResponse.model_validate(p) for p in pickups]

@router.put("/pickups/{pickup_id}/accept", response_model=PickupRequestResponse)
def accept_assigned_pickup(
    pickup_id: int,
    current_user: User = Depends(require_roles(["collector"])),
    db: Session = Depends(get_db)
):
    """
    Collector accepts an assigned pickup.
    - Status changes from 'Assigned' -> 'Accepted'.
    - Active pickup lifecycle begins; GPS tracking initiates.
    """
    pickup = db.query(PickupRequest).filter(PickupRequest.id == pickup_id).first()
    if not pickup:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Pickup request not found.")

    if pickup.collector_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only accept pickup requests specifically assigned to you."
        )

    if pickup.status != "Assigned":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot accept pickup with status '{pickup.status}'. Pickup must be in 'Assigned' state."
        )

    # Check if collector already has an active pickup
    active_existing = db.query(PickupRequest).filter(
        PickupRequest.collector_id == current_user.id,
        PickupRequest.status == "Accepted",
        PickupRequest.id != pickup_id
    ).first()
    if active_existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"You already have an active pickup in progress (#{active_existing.id}). Please complete it first."
        )

    pickup.status = "Accepted"
    pickup.accepted_at = datetime.datetime.utcnow()

    db.commit()
    db.refresh(pickup)
    return PickupRequestResponse.model_validate(pickup)

@router.put("/pickups/{pickup_id}/complete", response_model=PickupRequestResponse)
def complete_active_pickup(
    pickup_id: int,
    current_user: User = Depends(require_roles(["collector"])),
    db: Session = Depends(get_db)
):
    """
    Collector arrives at hospital, collects medical waste, and completes the pickup.
    - Status changes from 'Accepted' -> 'Collected'.
    - GPS tracking stops immediately.
    - Removed from all active pickup lists.
    - Appears only in Collection History.
    """
    pickup = db.query(PickupRequest).filter(PickupRequest.id == pickup_id).first()
    if not pickup:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Pickup request not found.")

    if pickup.collector_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only complete pickups assigned to and accepted by you."
        )

    if pickup.status != "Accepted":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot complete pickup with status '{pickup.status}'. Pickup must be in 'Accepted' active state."
        )

    pickup.status = "Collected"
    pickup.completed_at = datetime.datetime.utcnow()

    db.commit()
    db.refresh(pickup)
    return PickupRequestResponse.model_validate(pickup)

@router.get("/active-pickup", response_model=Optional[PickupRequestResponse])
def get_current_active_pickup(
    current_user: User = Depends(require_roles(["collector"])),
    db: Session = Depends(get_db)
):
    pickup = db.query(PickupRequest).filter(
        PickupRequest.collector_id == current_user.id,
        PickupRequest.status == "Accepted"
    ).first()
    if not pickup:
        return None
    return PickupRequestResponse.model_validate(pickup)
