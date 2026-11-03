import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.user import User
from app.models.pickup import PickupRequest
from app.models.location import CollectorLocation
from app.schemas.location import LocationUpdateRequest, CollectorLocationResponse
from app.auth.dependencies import require_roles, get_current_user
from app.websocket.connection_manager import ws_manager

router = APIRouter(prefix="/location", tags=["Geolocation Tracking"])

@router.post("/update", response_model=CollectorLocationResponse)
async def update_collector_location(
    loc_in: LocationUpdateRequest,
    current_user: User = Depends(require_roles(["collector"])),
    db: Session = Depends(get_db)
):
    """
    Collector updates current live GPS coordinates during an active pickup.
    Persists to DB and broadcasts through WebSocket.
    """
    # Verify collector has an active pickup if pickup_id is specified
    pickup_id = loc_in.pickup_id
    if pickup_id:
        pickup = db.query(PickupRequest).filter(
            PickupRequest.id == pickup_id,
            PickupRequest.collector_id == current_user.id,
            PickupRequest.status == "Accepted"
        ).first()
        if not pickup:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="GPS tracking is only active when a pickup has status 'Accepted'."
            )
    else:
        # Check if collector has any active pickup
        active = db.query(PickupRequest).filter(
            PickupRequest.collector_id == current_user.id,
            PickupRequest.status == "Accepted"
        ).first()
        if active:
            pickup_id = active.id

    # Update collector latest location in DB
    loc_record = CollectorLocation(
        collector_id=current_user.id,
        pickup_id=pickup_id,
        latitude=loc_in.latitude,
        longitude=loc_in.longitude
    )
    db.add(loc_record)

    # Also update user profile coordinate
    current_user.latitude = loc_in.latitude
    current_user.longitude = loc_in.longitude

    db.commit()
    db.refresh(loc_record)

    # Broadcast via WebSocket if there's an active pickup
    if pickup_id:
        payload = {
            "type": "LOCATION_UPDATE",
            "pickup_id": pickup_id,
            "collector_id": current_user.id,
            "collector_name": current_user.name,
            "latitude": loc_in.latitude,
            "longitude": loc_in.longitude,
            "timestamp": datetime.datetime.utcnow().isoformat()
        }
        await ws_manager.broadcast_location(pickup_id, payload)

    return CollectorLocationResponse.model_validate(loc_record)

@router.get("/{collector_id}", response_model=CollectorLocationResponse)
def get_collector_current_location(
    collector_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    latest = db.query(CollectorLocation).filter(
        CollectorLocation.collector_id == collector_id
    ).order_by(CollectorLocation.updated_at.desc()).first()

    if not latest:
        collector = db.query(User).filter(User.id == collector_id, User.role == "collector").first()
        if not collector:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Collector not found.")
        # Return registered coords
        return CollectorLocationResponse(
            id=0,
            collector_id=collector.id,
            pickup_id=None,
            latitude=collector.latitude,
            longitude=collector.longitude,
            updated_at=collector.created_at
        )

    return CollectorLocationResponse.model_validate(latest)
