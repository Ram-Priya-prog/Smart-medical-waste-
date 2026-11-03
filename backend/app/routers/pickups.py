import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.user import User
from app.models.waste import WasteRecord
from app.models.pickup import PickupRequest
from app.schemas.pickup import PickupRequestCreate, PickupRequestResponse
from app.auth.dependencies import get_current_user, require_roles
from app.ml.predictor import predictor

router = APIRouter(prefix="/pickups", tags=["Pickup Requests"])

@router.post("", response_model=PickupRequestResponse, status_code=status.HTTP_201_CREATED)
def create_pickup_request(
    request_in: PickupRequestCreate,
    current_user: User = Depends(require_roles(["hospital"])),
    db: Session = Depends(get_db)
):
    """
    Hospital creates a pickup request for a recorded waste batch.
    - Validates waste record belongs to this hospital.
    - Checks that a pickup is not already scheduled for this waste.
    - ML Random Forest model predicts priority: HIGH / MEDIUM / LOW.
    - Status is initialized to 'Pending'.
    - Collector is intentionally NOT assigned (Admin controls assignment).
    """
    waste = db.query(WasteRecord).filter(WasteRecord.id == request_in.waste_record_id).first()
    if not waste:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Waste record not found.")

    if waste.hospital_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only schedule pickups for waste recorded by your facility."
        )

    if waste.is_scheduled:
        existing_pickup = db.query(PickupRequest).filter(
            PickupRequest.waste_record_id == waste.id,
            PickupRequest.status != "Cancelled"
        ).first()
        if existing_pickup:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"A pickup request (#{existing_pickup.id}) has already been created for this waste batch."
            )

    # Calculate actual storage duration since waste was recorded
    now = datetime.datetime.utcnow()
    hours_stored = (now - waste.created_at).total_seconds() / 3600.0
    if hours_stored < 0.5:
        hours_stored = request_in.storage_duration_hours or 6.0
    else:
        hours_stored = round(hours_stored, 1)

    # Risk level mapping
    risk_mapping = {'Yellow': 4, 'White': 4, 'Red': 3, 'Blue': 2}
    risk_lvl = risk_mapping.get(waste.category, 3)

    # Count hospital weekly frequency from DB
    past_week = now - datetime.timedelta(days=7)
    recent_count = db.query(PickupRequest).filter(
        PickupRequest.hospital_id == current_user.id,
        PickupRequest.requested_at >= past_week
    ).count() + 1

    # Count currently available collectors
    available_collectors = db.query(User).filter(User.role == "collector").count() or 3

    # Run ML Random Forest Delay Risk Prediction
    ml_pred = predictor.predict_delay_risk(
        waste_category=waste.category,
        waste_quantity=waste.quantity,
        storage_duration_hours=hours_stored,
        request_waiting_hours=0.5,
        waste_risk_level=risk_lvl,
        pickup_distance_km=5.0,
        previous_delay_hours=0.0,
        hospital_request_frequency=min(recent_count, 10),
        collector_availability=min(available_collectors, 5),
        day_of_week=now.weekday(),
        time_of_day=now.hour
    )

    pickup_addr = request_in.pickup_address.strip() if request_in.pickup_address else current_user.address

    new_pickup = PickupRequest(
        hospital_id=current_user.id,
        collector_id=None, # Explicitly unassigned until Admin action
        waste_record_id=waste.id,
        status="Pending",
        delay_risk=ml_pred["risk_level"], # "High", "Medium", "Low"
        delay_probability=ml_pred["delay_probability"],
        prediction_timestamp=now,
        model_version=ml_pred.get("model_version", "rf-delay-v1.0"),
        priority=ml_pred["risk_level"], # Backward compatibility
        priority_confidence=ml_pred["delay_probability"],
        pickup_address=pickup_addr,
        hospital_latitude=current_user.latitude,
        hospital_longitude=current_user.longitude,
        storage_duration_hours=hours_stored,
        preferred_time_window=request_in.preferred_time_window or "09:00 - 13:00",
        time_window_start_min=request_in.time_window_start_min or 60,
        time_window_end_min=request_in.time_window_end_min or 300,
        requested_at=now
    )
    
    waste.is_scheduled = True
    db.add(new_pickup)
    db.commit()
    db.refresh(new_pickup)

    return PickupRequestResponse.model_validate(new_pickup)

@router.get("", response_model=List[PickupRequestResponse])
def list_pickups(
    status_filter: Optional[str] = Query(None, alias="status"),
    delay_risk_filter: Optional[str] = Query(None, alias="delay_risk"),
    priority_filter: Optional[str] = Query(None, alias="priority"),
    exclude_collected: bool = True,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    List pickup requests based on caller's role:
    - Hospital: Sees only its own pickup requests.
    - Collector: Sees only pickup requests assigned to them.
    - Admin: Sees all system pickup requests.
    - Completed ('Collected') pickups are excluded by default from active lists.
    """
    query = db.query(PickupRequest)

    if current_user.role == "hospital":
        query = query.filter(PickupRequest.hospital_id == current_user.id)
    elif current_user.role == "collector":
        query = query.filter(PickupRequest.collector_id == current_user.id)
    # Admin sees all

    if exclude_collected:
        query = query.filter(PickupRequest.status != "Collected")

    if status_filter:
        query = query.filter(PickupRequest.status == status_filter)

    risk_filter = delay_risk_filter or priority_filter
    if risk_filter:
        # Standardize filter
        clean_risk = risk_filter.replace(" RISK", "").replace(" DELAY", "").capitalize()
        query = query.filter(
            (PickupRequest.delay_risk == clean_risk) | 
            (PickupRequest.delay_risk == risk_filter) |
            (PickupRequest.priority == clean_risk)
        )

    pickups = query.order_by(
        PickupRequest.requested_at.desc()
    ).all()

    # Prioritize High Delay Risk requests so Admin can proactively mitigate bottlenecks
    r_weight = {"High": 3, "Medium": 2, "Low": 1}
    pickups.sort(key=lambda x: (r_weight.get(x.delay_risk or x.priority, 0), x.requested_at), reverse=True)

    return [PickupRequestResponse.model_validate(p) for p in pickups]

@router.get("/pending", response_model=List[PickupRequestResponse])
def get_pending_pickups(
    current_user: User = Depends(require_roles(["admin", "hospital"])),
    db: Session = Depends(get_db)
):
    query = db.query(PickupRequest).filter(PickupRequest.status == "Pending")
    if current_user.role == "hospital":
        query = query.filter(PickupRequest.hospital_id == current_user.id)
    pickups = query.order_by(PickupRequest.requested_at.desc()).all()
    return [PickupRequestResponse.model_validate(p) for p in pickups]

@router.get("/assigned", response_model=List[PickupRequestResponse])
def get_assigned_pickups(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    query = db.query(PickupRequest).filter(PickupRequest.status == "Assigned")
    if current_user.role == "hospital":
        query = query.filter(PickupRequest.hospital_id == current_user.id)
    elif current_user.role == "collector":
        query = query.filter(PickupRequest.collector_id == current_user.id)
    pickups = query.order_by(PickupRequest.requested_at.desc()).all()
    return [PickupRequestResponse.model_validate(p) for p in pickups]

@router.get("/active", response_model=List[PickupRequestResponse])
def get_active_pickups(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Active pickups currently Accepted & in transit with live GPS.
    """
    query = db.query(PickupRequest).filter(PickupRequest.status == "Accepted")
    if current_user.role == "hospital":
        query = query.filter(PickupRequest.hospital_id == current_user.id)
    elif current_user.role == "collector":
        query = query.filter(PickupRequest.collector_id == current_user.id)
    pickups = query.order_by(PickupRequest.accepted_at.desc()).all()
    return [PickupRequestResponse.model_validate(p) for p in pickups]

@router.get("/{pickup_id}", response_model=PickupRequestResponse)
def get_pickup_details(
    pickup_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    pickup = db.query(PickupRequest).filter(PickupRequest.id == pickup_id).first()
    if not pickup:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Pickup request not found.")

    # Role permission check
    if current_user.role == "hospital" and pickup.hospital_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied.")
    if current_user.role == "collector" and pickup.collector_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied.")

    return PickupRequestResponse.model_validate(pickup)
