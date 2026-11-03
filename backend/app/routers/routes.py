import datetime
import json
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User
from app.models.pickup import PickupRequest
from app.models.route import OptimizedRoute, RouteStop
from app.schemas.route import (
    RouteOptimizeRequest,
    OptimizedRouteResponse,
    RouteStopResponse,
    RouteConfirmRequest
)
from app.auth.dependencies import get_current_user, require_roles
from app.services.route_optimizer import ORToolsRouteOptimizer

router = APIRouter(prefix="/routes", tags=["Route Optimization (Google OR-Tools)"])

@router.post("/optimize", response_model=OptimizedRouteResponse)
def calculate_optimized_route(
    req: RouteOptimizeRequest,
    current_user: User = Depends(require_roles(["admin"])),
    db: Session = Depends(get_db)
):
    """
    Admin triggers Google OR-Tools Multi-Stop Route Optimization.
    Calculates distance, vehicle capacity constraints, and hospital pickup time windows.
    Returns suggested ordered stops and map geometry.
    """
    collector = db.query(User).filter(User.id == req.collector_id, User.role == "collector").first()
    if not collector:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Collector #{req.collector_id} not found."
        )

    if not req.pickup_ids:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Please select at least one pending pickup request."
        )

    pickups = db.query(PickupRequest).filter(
        PickupRequest.id.in_(req.pickup_ids)
    ).all()

    if len(pickups) != len(req.pickup_ids):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="One or more selected pickup requests could not be found."
        )

    # Validate that pickups are in assignable state
    for p in pickups:
        if p.status not in ["Pending", "Assigned"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Pickup #{p.id} has status '{p.status}' and cannot be included in a new route."
            )

    collector_info = {
        "id": collector.id,
        "name": collector.name,
        "email": collector.email,
        "phone": collector.phone,
        "address": collector.address,
        "latitude": collector.latitude,
        "longitude": collector.longitude,
        "vehicle_number": collector.vehicle_number or f"TN-27-BF-{1000 + collector.id}",
        "vehicle_type": collector.vehicle_type or "Tata Ace Bio-Carrier",
        "vehicle_capacity_kg": float(collector.vehicle_capacity_kg or 250.0)
    }

    pickups_info = []
    for p in pickups:
        hosp = p.hospital
        waste = p.waste_record
        pickups_info.append({
            "pickup_id": p.id,
            "hospital_id": p.hospital_id,
            "hospital_name": hosp.name if hosp else "Hospital Facility",
            "hospital_address": p.pickup_address or (hosp.address if hosp else "Salem, Tamil Nadu"),
            "hospital_phone": hosp.phone if hosp else "",
            "latitude": p.hospital_latitude,
            "longitude": p.hospital_longitude,
            "waste_category": waste.category if waste else "Yellow",
            "waste_type": waste.waste_type if waste else "Biomedical Waste",
            "waste_quantity_kg": waste.quantity if waste else 10.0,
            "delay_risk": p.delay_risk or "Medium",
            "time_window_start": p.preferred_time_window.split("-")[0].strip() if p.preferred_time_window and "-" in p.preferred_time_window else "09:00",
            "time_window_end": p.preferred_time_window.split("-")[1].strip() if p.preferred_time_window and "-" in p.preferred_time_window else "13:00",
            "time_window_start_min": p.time_window_start_min or 0,
            "time_window_end_min": p.time_window_end_min or 360
        })

    # Run Google OR-Tools optimization
    opt_result = ORToolsRouteOptimizer.optimize_route(
        collector_info=collector_info,
        pickups_info=pickups_info,
        consider_capacity=req.consider_capacity,
        consider_time_windows=req.consider_time_windows,
        return_to_depot=req.return_to_depot
    )

    route_code = f"RT-{datetime.datetime.utcnow().strftime('%Y%m%d')}-{collector.id}-{len(pickups)}"

    return OptimizedRouteResponse(
        route_code=route_code,
        collector_id=collector.id,
        collector_name=collector.name,
        collector_phone=collector.phone,
        collector_address=collector.address,
        collector_start_lat=collector.latitude,
        collector_start_lng=collector.longitude,
        vehicle_number=collector_info["vehicle_number"],
        vehicle_type=collector_info["vehicle_type"],
        vehicle_capacity_kg=collector_info["vehicle_capacity_kg"],
        total_waste_kg=opt_result["total_waste_kg"],
        capacity_utilization_pct=opt_result["capacity_utilization_pct"],
        total_distance_km=opt_result["total_distance_km"],
        total_duration_minutes=opt_result["total_duration_minutes"],
        stops=[RouteStopResponse(**s) for s in opt_result["stops"]],
        route_geometry=opt_result["route_geometry"],
        feasibility_status=opt_result["feasibility_status"],
        feasibility_notes=opt_result["feasibility_notes"],
        status="Suggested",
        created_at=datetime.datetime.utcnow()
    )


@router.post("/confirm", response_model=OptimizedRouteResponse)
def confirm_and_dispatch_route(
    req: RouteConfirmRequest,
    current_user: User = Depends(require_roles(["admin"])),
    db: Session = Depends(get_db)
):
    """
    Admin confirms the suggested multi-stop route.
    - Saves immutable route record in SQLite.
    - Saves ordered RouteStop entries.
    - Assigns all contained pickups to the selected collector.
    - Status transitions: Pickups -> 'Assigned', Route -> 'Confirmed'.
    """
    collector = db.query(User).filter(User.id == req.collector_id, User.role == "collector").first()
    if not collector:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Collector not found.")

    pickups = db.query(PickupRequest).filter(PickupRequest.id.in_(req.pickup_ids)).all()
    if not pickups:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No valid pickups found.")

    # Run optimizer to get authentic final sequence
    collector_info = {
        "id": collector.id,
        "name": collector.name,
        "email": collector.email,
        "phone": collector.phone,
        "address": collector.address,
        "latitude": collector.latitude,
        "longitude": collector.longitude,
        "vehicle_number": collector.vehicle_number or f"TN-27-BF-{1000 + collector.id}",
        "vehicle_type": collector.vehicle_type or "Tata Ace Bio-Carrier",
        "vehicle_capacity_kg": float(collector.vehicle_capacity_kg or 250.0)
    }

    pickups_info = []
    for p in pickups:
        hosp = p.hospital
        waste = p.waste_record
        pickups_info.append({
            "pickup_id": p.id,
            "hospital_id": p.hospital_id,
            "hospital_name": hosp.name if hosp else "Hospital Facility",
            "hospital_address": p.pickup_address or (hosp.address if hosp else "Salem, Tamil Nadu"),
            "hospital_phone": hosp.phone if hosp else "",
            "latitude": p.hospital_latitude,
            "longitude": p.hospital_longitude,
            "waste_category": waste.category if waste else "Yellow",
            "waste_type": waste.waste_type if waste else "Biomedical Waste",
            "waste_quantity_kg": waste.quantity if waste else 10.0,
            "delay_risk": p.delay_risk or "Medium",
            "time_window_start": p.preferred_time_window.split("-")[0].strip() if p.preferred_time_window and "-" in p.preferred_time_window else "09:00",
            "time_window_end": p.preferred_time_window.split("-")[1].strip() if p.preferred_time_window and "-" in p.preferred_time_window else "13:00",
            "time_window_start_min": p.time_window_start_min or 0,
            "time_window_end_min": p.time_window_end_min or 360
        })

    opt_result = ORToolsRouteOptimizer.optimize_route(
        collector_info=collector_info,
        pickups_info=pickups_info,
        consider_capacity=True,
        consider_time_windows=True,
        return_to_depot=True
    )

    now = datetime.datetime.utcnow()
    route_code = req.route_code or f"RT-{now.strftime('%Y%m%d%H%M%S')}-{collector.id}"

    # Create OptimizedRoute in database
    route_obj = OptimizedRoute(
        route_code=route_code,
        collector_id=collector.id,
        admin_id=current_user.id,
        status="Confirmed",
        total_distance_km=opt_result["total_distance_km"],
        total_duration_minutes=opt_result["total_duration_minutes"],
        total_waste_kg=opt_result["total_waste_kg"],
        vehicle_capacity_kg=collector_info["vehicle_capacity_kg"],
        feasibility_status=opt_result["feasibility_status"],
        feasibility_notes=opt_result["feasibility_notes"],
        route_geometry=json.dumps(opt_result["route_geometry"]),
        created_at=now,
        confirmed_at=now
    )
    db.add(route_obj)
    db.commit()
    db.refresh(route_obj)

    # Create RouteStop entries and link pickup_requests
    stop_responses = []
    for s in opt_result["stops"]:
        r_stop = RouteStop(
            route_id=route_obj.id,
            pickup_id=s["pickup_id"],
            hospital_id=s["hospital_id"],
            stop_order=s["stop_order"],
            distance_from_prev_km=s["distance_from_prev_km"],
            estimated_arrival_minutes=s["estimated_arrival_minutes"],
            time_window_start=s.get("time_window_start"),
            time_window_end=s.get("time_window_end"),
            waste_quantity_kg=s["waste_quantity_kg"],
            status="Pending"
        )
        db.add(r_stop)

        # Update matching pickup request
        target_p = db.query(PickupRequest).filter(PickupRequest.id == s["pickup_id"]).first()
        if target_p:
            target_p.collector_id = collector.id
            target_p.status = "Assigned"
            target_p.assigned_at = now
            target_p.route_id = route_obj.id
            target_p.stop_order = s["stop_order"]

        s["id"] = r_stop.id
        stop_responses.append(RouteStopResponse(**s))

    db.commit()

    return OptimizedRouteResponse(
        id=route_obj.id,
        route_code=route_obj.route_code,
        collector_id=collector.id,
        collector_name=collector.name,
        collector_phone=collector.phone,
        collector_address=collector.address,
        collector_start_lat=collector.latitude,
        collector_start_lng=collector.longitude,
        vehicle_number=collector_info["vehicle_number"],
        vehicle_type=collector_info["vehicle_type"],
        vehicle_capacity_kg=collector_info["vehicle_capacity_kg"],
        total_waste_kg=opt_result["total_waste_kg"],
        capacity_utilization_pct=opt_result["capacity_utilization_pct"],
        total_distance_km=opt_result["total_distance_km"],
        total_duration_minutes=opt_result["total_duration_minutes"],
        stops=stop_responses,
        route_geometry=opt_result["route_geometry"],
        feasibility_status=opt_result["feasibility_status"],
        feasibility_notes=opt_result["feasibility_notes"],
        status="Confirmed",
        created_at=route_obj.created_at,
        confirmed_at=route_obj.confirmed_at
    )


@router.get("/active", response_model=Optional[OptimizedRouteResponse])
def get_collector_active_route(
    current_user: User = Depends(require_roles(["collector"])),
    db: Session = Depends(get_db)
):
    """
    Collector views their active confirmed multi-stop route with ordered sequence.
    """
    route = db.query(OptimizedRoute).filter(
        OptimizedRoute.collector_id == current_user.id,
        OptimizedRoute.status.in_(["Confirmed", "In-Progress"])
    ).order_by(OptimizedRoute.confirmed_at.desc()).first()

    if not route:
        return None

    # Load stops with hospital details
    stops_resp = []
    cumulative_dist = 0.0
    for s in route.stops:
        hosp = s.hospital
        pickup = s.pickup
        waste = pickup.waste_record if pickup else None
        cumulative_dist += s.distance_from_prev_km

        stops_resp.append(RouteStopResponse(
            id=s.id,
            stop_order=s.stop_order,
            pickup_id=s.pickup_id,
            hospital_id=s.hospital_id,
            hospital_name=hosp.name if hosp else "Hospital",
            hospital_address=pickup.pickup_address if pickup else (hosp.address if hosp else "Salem"),
            hospital_phone=hosp.phone if hosp else "",
            latitude=pickup.hospital_latitude if pickup else hosp.latitude,
            longitude=pickup.hospital_longitude if pickup else hosp.longitude,
            waste_category=waste.category if waste else "Yellow",
            waste_type=waste.waste_type if waste else "Medical Waste",
            waste_quantity_kg=s.waste_quantity_kg,
            distance_from_prev_km=s.distance_from_prev_km,
            cumulative_distance_km=round(cumulative_dist, 2),
            estimated_arrival_minutes=s.estimated_arrival_minutes,
            time_window_start=s.time_window_start,
            time_window_end=s.time_window_end,
            status=s.status,
            delay_risk=pickup.delay_risk if pickup else "Medium"
        ))

    geometry = []
    if route.route_geometry:
        try:
            geometry = json.loads(route.route_geometry)
        except Exception:
            geometry = []

    cap_pct = round((route.total_waste_kg / route.vehicle_capacity_kg * 100.0), 1) if route.vehicle_capacity_kg > 0 else 0.0

    return OptimizedRouteResponse(
        id=route.id,
        route_code=route.route_code,
        collector_id=current_user.id,
        collector_name=current_user.name,
        collector_phone=current_user.phone,
        collector_address=current_user.address,
        collector_start_lat=current_user.latitude,
        collector_start_lng=current_user.longitude,
        vehicle_number=current_user.vehicle_number or f"TN-27-BF-{1000 + current_user.id}",
        vehicle_type=current_user.vehicle_type or "Tata Ace Bio-Carrier",
        vehicle_capacity_kg=route.vehicle_capacity_kg,
        total_waste_kg=route.total_waste_kg,
        capacity_utilization_pct=cap_pct,
        total_distance_km=route.total_distance_km,
        total_duration_minutes=route.total_duration_minutes,
        stops=stops_resp,
        route_geometry=geometry,
        feasibility_status=route.feasibility_status,
        feasibility_notes=route.feasibility_notes,
        status=route.status,
        created_at=route.created_at,
        confirmed_at=route.confirmed_at
    )


@router.get("", response_model=List[OptimizedRouteResponse])
def list_routes(
    current_user: User = Depends(require_roles(["admin"])),
    db: Session = Depends(get_db)
):
    """
    Admin lists all planned and dispatched routes.
    """
    routes = db.query(OptimizedRoute).order_by(OptimizedRoute.created_at.desc()).all()
    results = []

    for r in routes:
        collector = r.collector
        stops_resp = []
        cum_dist = 0.0
        for s in r.stops:
            hosp = s.hospital
            pickup = s.pickup
            waste = pickup.waste_record if pickup else None
            cum_dist += s.distance_from_prev_km
            stops_resp.append(RouteStopResponse(
                id=s.id,
                stop_order=s.stop_order,
                pickup_id=s.pickup_id,
                hospital_id=s.hospital_id,
                hospital_name=hosp.name if hosp else "Hospital",
                hospital_address=pickup.pickup_address if pickup else (hosp.address if hosp else "Salem"),
                hospital_phone=hosp.phone if hosp else "",
                latitude=pickup.hospital_latitude if pickup else (hosp.latitude if hosp else 0.0),
                longitude=pickup.hospital_longitude if pickup else (hosp.longitude if hosp else 0.0),
                waste_category=waste.category if waste else "Yellow",
                waste_type=waste.waste_type if waste else "Medical Waste",
                waste_quantity_kg=s.waste_quantity_kg,
                distance_from_prev_km=s.distance_from_prev_km,
                cumulative_distance_km=round(cum_dist, 2),
                estimated_arrival_minutes=s.estimated_arrival_minutes,
                time_window_start=s.time_window_start,
                time_window_end=s.time_window_end,
                status=s.status,
                delay_risk=pickup.delay_risk if pickup else "Medium"
            ))

        geometry = []
        if r.route_geometry:
            try:
                geometry = json.loads(r.route_geometry)
            except Exception:
                geometry = []

        cap_pct = round((r.total_waste_kg / r.vehicle_capacity_kg * 100.0), 1) if r.vehicle_capacity_kg > 0 else 0.0

        results.append(OptimizedRouteResponse(
            id=r.id,
            route_code=r.route_code,
            collector_id=r.collector_id,
            collector_name=collector.name if collector else "Collector",
            collector_phone=collector.phone if collector else "",
            collector_address=collector.address if collector else "Salem",
            collector_start_lat=collector.latitude if collector else 0.0,
            collector_start_lng=collector.longitude if collector else 0.0,
            vehicle_number=collector.vehicle_number if collector else "TN-27-AX-0000",
            vehicle_type=collector.vehicle_type if collector else "Bio-Carrier",
            vehicle_capacity_kg=r.vehicle_capacity_kg,
            total_waste_kg=r.total_waste_kg,
            capacity_utilization_pct=cap_pct,
            total_distance_km=r.total_distance_km,
            total_duration_minutes=r.total_duration_minutes,
            stops=stops_resp,
            route_geometry=geometry,
            feasibility_status=r.feasibility_status,
            feasibility_notes=r.feasibility_notes,
            status=r.status,
            created_at=r.created_at,
            confirmed_at=r.confirmed_at
        ))

    return results


@router.put("/{route_id}/stops/{stop_id}/status")
def update_route_stop_status(
    route_id: int,
    stop_id: int,
    status_update: dict,
    current_user: User = Depends(require_roles(["collector", "admin"])),
    db: Session = Depends(get_db)
):
    """
    Collector updates status of a stop along their assigned route (e.g. 'Arrived', 'Collected').
    """
    stop = db.query(RouteStop).filter(RouteStop.id == stop_id, RouteStop.route_id == route_id).first()
    if not stop:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Route stop not found.")

    new_st = status_update.get("status", "Collected")
    stop.status = new_st
    if new_st == "Collected":
        stop.collected_at = datetime.datetime.utcnow()
        # Also mark associated pickup request as Collected
        pickup = stop.pickup
        if pickup and pickup.status != "Collected":
            pickup.status = "Collected"
            pickup.completed_at = datetime.datetime.utcnow()

    # Check if all stops on route are collected
    all_stops = db.query(RouteStop).filter(RouteStop.route_id == route_id).all()
    if all(s.status == "Collected" for s in all_stops):
        route = db.query(OptimizedRoute).filter(OptimizedRoute.id == route_id).first()
        if route:
            route.status = "Completed"
            route.completed_at = datetime.datetime.utcnow()

    db.commit()
    return {"message": f"Stop status updated to '{new_st}'", "stop_id": stop.id, "status": new_st}
