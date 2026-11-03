import datetime
from typing import List, Dict, Any
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.database import get_db
from app.models.user import User
from app.models.waste import WasteRecord
from app.models.pickup import PickupRequest
from app.schemas.analytics import (
    AnalyticsOverview,
    CategoryDistributionItem,
    PriorityDistributionItem,
    StatusDistributionItem,
    WasteTrendItem
)
from app.auth.dependencies import get_current_user

router = APIRouter(prefix="/analytics", tags=["Analytics & BI"])

@router.get("/overview", response_model=AnalyticsOverview)
def get_analytics_overview(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Computes real database statistics.
    Hospital: Computes metrics based strictly on its own facilities.
    Admin: Computes system-wide totals.
    """
    if current_user.role == "hospital":
        total_hospitals = 1
        total_collectors = db.query(User).filter(User.role == "collector").count()
        
        waste_q = db.query(func.sum(WasteRecord.quantity)).filter(WasteRecord.hospital_id == current_user.id).scalar() or 0.0
        
        collected_q = db.query(func.sum(WasteRecord.quantity)).join(
            PickupRequest, PickupRequest.waste_record_id == WasteRecord.id
        ).filter(
            WasteRecord.hospital_id == current_user.id,
            PickupRequest.status == "Collected"
        ).scalar() or 0.0

        pending_p = db.query(PickupRequest).filter(PickupRequest.hospital_id == current_user.id, PickupRequest.status == "Pending").count()
        assigned_p = db.query(PickupRequest).filter(PickupRequest.hospital_id == current_user.id, PickupRequest.status == "Assigned").count()
        active_p = db.query(PickupRequest).filter(PickupRequest.hospital_id == current_user.id, PickupRequest.status == "Accepted").count()
        completed_p = db.query(PickupRequest).filter(PickupRequest.hospital_id == current_user.id, PickupRequest.status == "Collected").count()

    elif current_user.role == "collector":
        total_hospitals = db.query(User).filter(User.role == "hospital").count()
        total_collectors = 1
        
        waste_q = 0.0
        collected_q = db.query(func.sum(WasteRecord.quantity)).join(
            PickupRequest, PickupRequest.waste_record_id == WasteRecord.id
        ).filter(
            PickupRequest.collector_id == current_user.id,
            PickupRequest.status == "Collected"
        ).scalar() or 0.0

        pending_p = 0
        assigned_p = db.query(PickupRequest).filter(PickupRequest.collector_id == current_user.id, PickupRequest.status == "Assigned").count()
        active_p = db.query(PickupRequest).filter(PickupRequest.collector_id == current_user.id, PickupRequest.status == "Accepted").count()
        completed_p = db.query(PickupRequest).filter(PickupRequest.collector_id == current_user.id, PickupRequest.status == "Collected").count()

    else: # Admin
        total_hospitals = db.query(User).filter(User.role == "hospital").count()
        total_collectors = db.query(User).filter(User.role == "collector").count()
        
        waste_q = db.query(func.sum(WasteRecord.quantity)).scalar() or 0.0
        
        collected_q = db.query(func.sum(WasteRecord.quantity)).join(
            PickupRequest, PickupRequest.waste_record_id == WasteRecord.id
        ).filter(PickupRequest.status == "Collected").scalar() or 0.0

        pending_p = db.query(PickupRequest).filter(PickupRequest.status == "Pending").count()
        assigned_p = db.query(PickupRequest).filter(PickupRequest.status == "Assigned").count()
        active_p = db.query(PickupRequest).filter(PickupRequest.status == "Accepted").count()
        completed_p = db.query(PickupRequest).filter(PickupRequest.status == "Collected").count()

    return AnalyticsOverview(
        total_hospitals=total_hospitals,
        total_collectors=total_collectors,
        total_waste_recorded_kg=round(float(waste_q), 1),
        total_waste_collected_kg=round(float(collected_q), 1),
        pending_pickups=pending_p,
        assigned_pickups=assigned_p,
        active_pickups=active_p,
        completed_collections=completed_p
    )

@router.get("/category-distribution", response_model=List[CategoryDistributionItem])
def get_category_distribution(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Computes waste volume and counts by biomedical category: Yellow, Red, White, Blue.
    """
    query = db.query(
        WasteRecord.category,
        func.sum(WasteRecord.quantity).label("total_kg"),
        func.count(WasteRecord.id).label("cnt")
    )
    if current_user.role == "hospital":
        query = query.filter(WasteRecord.hospital_id == current_user.id)

    results = query.group_by(WasteRecord.category).all()
    
    color_map = {
        "Yellow": "#eab308",
        "Red": "#ef4444",
        "White": "#94a3b8",
        "Blue": "#3b82f6"
    }

    all_cats = ["Yellow", "Red", "White", "Blue"]
    data_dict = {cat: {"kg": 0.0, "count": 0} for cat in all_cats}
    total_vol = 0.0

    for cat, kg, cnt in results:
        data_dict[cat] = {"kg": float(kg or 0.0), "count": int(cnt or 0)}
        total_vol += float(kg or 0.0)

    out = []
    for cat in all_cats:
        kg_val = data_dict[cat]["kg"]
        pct = round((kg_val / total_vol * 100.0), 1) if total_vol > 0 else 0.0
        out.append(CategoryDistributionItem(
            category=cat,
            quantity_kg=round(kg_val, 1),
            record_count=data_dict[cat]["count"],
            percentage=pct,
            color=color_map.get(cat, "#06b6d4")
        ))
    return out

@router.get("/pickup-delay-risk", response_model=List[PriorityDistributionItem])
def get_delay_risk_distribution(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Returns breakdown of pickups across predicted delay risk levels:
    - HIGH DELAY RISK
    - MEDIUM DELAY RISK
    - LOW DELAY RISK
    """
    query = db.query(
        func.coalesce(PickupRequest.delay_risk, PickupRequest.priority).label("risk"),
        func.count(PickupRequest.id).label("cnt")
    )
    if current_user.role == "hospital":
        query = query.filter(PickupRequest.hospital_id == current_user.id)
    elif current_user.role == "collector":
        query = query.filter(PickupRequest.collector_id == current_user.id)

    results = query.group_by("risk").all()
    
    total_pickups = sum(r[1] for r in results) or 1
    r_map = {"High": 0, "Medium": 0, "Low": 0}
    for r_val, cnt in results:
        clean = (r_val or "Medium").replace(" RISK", "").replace(" DELAY", "").capitalize()
        if clean in r_map:
            r_map[clean] += cnt
        else:
            r_map["Medium"] += cnt

    return [
        PriorityDistributionItem(
            risk_level="High",
            delay_risk="HIGH DELAY RISK",
            priority="High",
            count=r_map["High"],
            percentage=round(r_map["High"] / total_pickups * 100.0, 1),
            color="#ef4444"
        ),
        PriorityDistributionItem(
            risk_level="Medium",
            delay_risk="MEDIUM DELAY RISK",
            priority="Medium",
            count=r_map["Medium"],
            percentage=round(r_map["Medium"] / total_pickups * 100.0, 1),
            color="#f59e0b"
        ),
        PriorityDistributionItem(
            risk_level="Low",
            delay_risk="LOW DELAY RISK",
            priority="Low",
            count=r_map["Low"],
            percentage=round(r_map["Low"] / total_pickups * 100.0, 1),
            color="#10b981"
        ),
    ]

@router.get("/pickup-priority", response_model=List[PriorityDistributionItem])
def get_priority_distribution_legacy(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Backward-compatible alias for delay risk distribution.
    """
    return get_delay_risk_distribution(current_user=current_user, db=db)

@router.get("/status-distribution", response_model=List[StatusDistributionItem])
def get_status_distribution(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    query = db.query(
        PickupRequest.status,
        func.count(PickupRequest.id).label("cnt")
    )
    if current_user.role == "hospital":
        query = query.filter(PickupRequest.hospital_id == current_user.id)
    elif current_user.role == "collector":
        query = query.filter(PickupRequest.collector_id == current_user.id)

    results = query.group_by(PickupRequest.status).all()
    stat_map = {r[0]: r[1] for r in results}

    statuses = ["Pending", "Assigned", "Accepted", "Collected"]
    return [
        StatusDistributionItem(status=st, count=stat_map.get(st, 0))
        for st in statuses
    ]

@router.get("/waste-trends", response_model=List[WasteTrendItem])
def get_waste_trends(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Returns periodic timeline aggregations for charts.
    """
    # Generate weekly/daily buckets from records
    query = db.query(WasteRecord)
    if current_user.role == "hospital":
        query = query.filter(WasteRecord.hospital_id == current_user.id)

    records = query.order_by(WasteRecord.created_at.asc()).all()
    
    # Bucket by date (YYYY-MM-DD)
    buckets: Dict[str, Dict[str, Any]] = {}
    for r in records:
        day_str = r.created_at.strftime("%b %d")
        if day_str not in buckets:
            buckets[day_str] = {"quantity_kg": 0.0, "pickups_count": 0}
        buckets[day_str]["quantity_kg"] += r.quantity
        if r.is_scheduled:
            buckets[day_str]["pickups_count"] += 1

    if not buckets:
        today = datetime.datetime.utcnow().strftime("%b %d")
        return [WasteTrendItem(period=today, quantity_kg=0.0, pickups_count=0)]

    return [
        WasteTrendItem(
            period=k,
            quantity_kg=round(v["quantity_kg"], 1),
            pickups_count=v["pickups_count"]
        )
        for k, v in buckets.items()
    ]
