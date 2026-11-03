import datetime
from typing import List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.user import User
from app.models.pickup import PickupRequest
from app.models.location import CollectorLocation
from app.schemas.auth import UserResponse
from app.schemas.pickup import NearbyCollectorInfo, PickupAssignRequest, PickupRequestResponse
from app.auth.dependencies import require_roles
from app.services.distance import calculate_haversine_distance

router = APIRouter(prefix="/admin", tags=["Admin Operations"])

@router.get("/collectors/nearby/{pickup_id}", response_model=List[NearbyCollectorInfo])
def get_nearby_collectors(
    pickup_id: int,
    current_user: User = Depends(require_roles(["admin"])),
    db: Session = Depends(get_db)
):
    """
    Admin checks nearby available collectors for a pending pickup request.
    Calculates Haversine distance in km between hospital and all registered collectors.
    Sorts collectors by proximity.
    """
    pickup = db.query(PickupRequest).filter(PickupRequest.id == pickup_id).first()
    if not pickup:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Pickup request not found.")

    collectors = db.query(User).filter(User.role == "collector").all()
    results = []

    for collector in collectors:
        # Check if collector has any active/accepted pickup currently
        active_pickup = db.query(PickupRequest).filter(
            PickupRequest.collector_id == collector.id,
            PickupRequest.status == "Accepted"
        ).first()

        # Check for latest known GPS location, fallback to registered address coords
        latest_loc = db.query(CollectorLocation).filter(
            CollectorLocation.collector_id == collector.id
        ).order_by(CollectorLocation.updated_at.desc()).first()

        c_lat = latest_loc.latitude if latest_loc else collector.latitude
        c_lon = latest_loc.longitude if latest_loc else collector.longitude

        # Calculate distance to hospital
        dist = calculate_haversine_distance(
            pickup.hospital_latitude, pickup.hospital_longitude,
            c_lat, c_lon
        )

        results.append(NearbyCollectorInfo(
            id=collector.id,
            name=collector.name,
            email=collector.email,
            phone=collector.phone,
            address=collector.address,
            latitude=c_lat,
            longitude=c_lon,
            distance_km=dist,
            is_available=(active_pickup is None),
            active_pickup_id=active_pickup.id if active_pickup else None,
            vehicle_number=collector.vehicle_number or f"TN-27-BF-{1000 + collector.id}",
            vehicle_type=collector.vehicle_type or "Tata Ace Bio-Carrier",
            vehicle_capacity_kg=float(collector.vehicle_capacity_kg or 250.0)
        ))

    # Sort available collectors closest first
    results.sort(key=lambda x: (not x.is_available, x.distance_km))
    return results

@router.put("/pickups/{pickup_id}/assign", response_model=PickupRequestResponse)
def assign_collector_to_pickup(
    pickup_id: int,
    assignment: PickupAssignRequest,
    current_user: User = Depends(require_roles(["admin"])),
    db: Session = Depends(get_db)
):
    """
    Admin assigns a nearby collector to the pickup request.
    Only Admin has permission to execute this assignment.
    """
    pickup = db.query(PickupRequest).filter(PickupRequest.id == pickup_id).first()
    if not pickup:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Pickup request not found.")

    if pickup.status not in ["Pending", "Assigned"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot assign collector to a pickup with status '{pickup.status}'."
        )

    collector = db.query(User).filter(User.id == assignment.collector_id, User.role == "collector").first()
    if not collector:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Collector with ID #{assignment.collector_id} not found."
        )

    pickup.collector_id = collector.id
    pickup.status = "Assigned"
    pickup.assigned_at = datetime.datetime.utcnow()

    db.commit()
    db.refresh(pickup)
    return PickupRequestResponse.model_validate(pickup)

@router.get("/users", response_model=Dict[str, List[UserResponse]])
def list_system_users(
    current_user: User = Depends(require_roles(["admin"])),
    db: Session = Depends(get_db)
):
    hospitals = db.query(User).filter(User.role == "hospital").order_by(User.created_at.desc()).all()
    collectors = db.query(User).filter(User.role == "collector").order_by(User.created_at.desc()).all()

    return {
        "hospitals": [UserResponse.model_validate(h) for h in hospitals],
        "collectors": [UserResponse.model_validate(c) for c in collectors]
    }

@router.get("/active-tracking")
def get_active_tracking_overview(
    current_user: User = Depends(require_roles(["admin"])),
    db: Session = Depends(get_db)
):
    """
    Admin monitors all active in-progress pickups and their current coordinates.
    """
    active_pickups = db.query(PickupRequest).filter(PickupRequest.status == "Accepted").all()
    tracking_data = []

    for p in active_pickups:
        collector = p.collector
        hospital = p.hospital
        
        # Get latest location
        latest_loc = db.query(CollectorLocation).filter(
            CollectorLocation.collector_id == p.collector_id
        ).order_by(CollectorLocation.updated_at.desc()).first()

        cur_lat = latest_loc.latitude if latest_loc else (collector.latitude if collector else 0.0)
        cur_lon = latest_loc.longitude if latest_loc else (collector.longitude if collector else 0.0)

        tracking_data.append({
            "pickup_id": p.id,
            "delay_risk": p.delay_risk or p.priority,
            "delay_probability": p.delay_probability or 0.5,
            "priority": p.priority or p.delay_risk,
            "status": p.status,
            "waste_category": p.waste_record.category if p.waste_record else "Unknown",
            "quantity": p.waste_record.quantity if p.waste_record else 0.0,
            "hospital": {
                "id": hospital.id,
                "name": hospital.name,
                "address": p.pickup_address,
                "latitude": p.hospital_latitude,
                "longitude": p.hospital_longitude,
                "phone": hospital.phone
            },
            "collector": {
                "id": collector.id if collector else None,
                "name": collector.name if collector else "Unassigned",
                "phone": collector.phone if collector else "",
                "current_latitude": cur_lat,
                "current_longitude": cur_lon,
                "last_updated": latest_loc.updated_at.isoformat() if latest_loc else None
            },
            "accepted_at": p.accepted_at.isoformat() if p.accepted_at else None
        })

    return tracking_data
