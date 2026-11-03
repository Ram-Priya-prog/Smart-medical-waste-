import datetime
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, status, Query, Response
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User
from app.models.waste import WasteRecord
from app.models.audit import WasteCorrection
from app.schemas.audit import (
    MonthlyAuditSummary,
    WasteCorrectionRequest,
    AdminSystemAuditOverview,
    CorrectionHistoryResponse,
    HospitalAuditStat,
    WasteAuditRecordResponse
)
from app.auth.dependencies import get_current_user, require_roles
from app.services.audit_service import (
    get_monthly_audit_data,
    validate_waste_sorting,
    generate_pdf_audit_report,
    generate_csv_audit_report,
    REGULATORY_DISCLAIMER
)

router = APIRouter(prefix="/audit", tags=["Monthly Medical Waste Audit & Compliance"])

@router.get("/monthly", response_model=MonthlyAuditSummary)
def get_hospital_monthly_audit(
    hospital_id: Optional[int] = None,
    year: Optional[int] = Query(None),
    month: Optional[int] = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Returns monthly waste audit records, stream breakdown, and segregation warnings.
    - Hospital users can ONLY access their own records.
    - Admin users can query any hospital or view system-wide data.
    """
    now = datetime.datetime.utcnow()
    y = year or now.year
    m = month or now.month

    if m < 1 or m > 12:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Month must be between 1 and 12.")

    target_hosp_id = None
    if current_user.role == "hospital":
        target_hosp_id = current_user.id
    elif current_user.role == "admin":
        target_hosp_id = hospital_id # Can be None for overall
    else:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Collectors do not have access to hospital waste audit dashboards."
        )

    data = get_monthly_audit_data(db, target_hosp_id, y, m)
    return MonthlyAuditSummary(**data)


@router.get("/admin-overview", response_model=AdminSystemAuditOverview)
def get_admin_system_audit_overview(
    year: Optional[int] = Query(None),
    month: Optional[int] = Query(None),
    current_user: User = Depends(require_roles(["admin"])),
    db: Session = Depends(get_db)
):
    """
    Admin command overview of monthly waste generation, sorting consistency,
    and PCB compliance across all certified Salem hospitals.
    """
    now = datetime.datetime.utcnow()
    y = year or now.year
    m = month or now.month

    hospitals = db.query(User).filter(User.role == "hospital").order_by(User.name.asc()).all()
    overall_data = get_monthly_audit_data(db, None, y, m)

    hosp_summaries = []
    for h in hospitals:
        h_data = get_monthly_audit_data(db, h.id, y, m)
        hosp_summaries.append(HospitalAuditStat(
            hospital_id=h.id,
            hospital_name=h.name,
            hospital_address=h.address,
            total_waste_kg=h_data["total_waste_kg"],
            total_sharps_kg=h_data["total_sharps_kg"],
            total_anatomical_kg=h_data["total_anatomical_kg"],
            total_cytotoxic_kg=h_data["total_cytotoxic_kg"],
            total_general_kg=h_data["total_general_kg"],
            records_count=h_data["total_records"],
            warnings_count=h_data["inconsistencies_count"]
        ))

    return AdminSystemAuditOverview(
        year=y,
        month=m,
        total_hospitals=len(hospitals),
        total_system_waste_kg=overall_data["total_waste_kg"],
        total_sharps_kg=overall_data["total_sharps_kg"],
        total_anatomical_kg=overall_data["total_anatomical_kg"],
        total_cytotoxic_kg=overall_data["total_cytotoxic_kg"],
        total_general_kg=overall_data["total_general_kg"],
        total_inconsistencies=overall_data["inconsistencies_count"],
        hospitals_summary=hosp_summaries,
        category_distribution=overall_data["category_distribution"],
        regulatory_disclaimer=REGULATORY_DISCLAIMER
    )


@router.post("/correct-waste/{waste_id}", response_model=WasteAuditRecordResponse)
def correct_waste_segregation(
    waste_id: int,
    req: WasteCorrectionRequest,
    current_user: User = Depends(require_roles(["hospital", "admin"])),
    db: Session = Depends(get_db)
):
    """
    Authorized hospital staff corrects a segregation warning on a waste record.
    - Preserves previous category and logs full audit trail in waste_corrections.
    - Re-evaluates sorting validation.
    """
    waste = db.query(WasteRecord).filter(WasteRecord.id == waste_id).first()
    if not waste:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Waste record not found.")

    if current_user.role == "hospital" and waste.hospital_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Cannot edit another hospital's records.")

    old_category = waste.category
    old_audit_class = waste.audit_classification or old_category
    new_cat = req.new_category.strip()

    valid_categories = {"Yellow", "Red", "White", "Blue"}
    if new_cat not in valid_categories:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid biomedical category '{new_cat}'. Must be one of: {', '.join(valid_categories)}"
        )

    # Re-evaluate validation with new category
    new_audit_class, has_warn, warn_reason, _ = validate_waste_sorting(new_cat, waste.waste_type, waste.notes)

    # Log immutable correction record
    correction_log = WasteCorrection(
        waste_record_id=waste.id,
        hospital_id=waste.hospital_id,
        user_id=current_user.id,
        previous_category=old_category,
        new_category=new_cat,
        previous_audit_class=old_audit_class,
        new_audit_class=new_audit_class,
        correction_reason=req.correction_reason.strip(),
        corrected_at=datetime.datetime.utcnow()
    )
    db.add(correction_log)

    # Update waste record
    if not waste.original_category:
        waste.original_category = old_category
    waste.category = new_cat
    waste.audit_classification = new_audit_class
    waste.has_sorting_warning = has_warn
    waste.warning_reason = warn_reason
    waste.is_corrected = True

    db.commit()
    db.refresh(waste)

    return WasteAuditRecordResponse.model_validate(waste)


@router.get("/report/pdf")
def download_monthly_pdf_report(
    hospital_id: Optional[int] = None,
    year: Optional[int] = Query(None),
    month: Optional[int] = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Generates and downloads statutory PDF Monthly Audit Report.
    """
    now = datetime.datetime.utcnow()
    y = year or now.year
    m = month or now.month

    target_hosp_id = None
    if current_user.role == "hospital":
        target_hosp_id = current_user.id
    elif current_user.role == "admin":
        target_hosp_id = hospital_id
    else:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied.")

    audit_data = get_monthly_audit_data(db, target_hosp_id, y, m)
    pdf_bytes = generate_pdf_audit_report(audit_data)

    safe_name = "".join(c for c in audit_data["hospital_name"] if c.isalnum() or c in (' ', '_', '-')).strip().replace(" ", "_")
    filename = f"BMW_Audit_{safe_name}_{y}_{m:02d}.pdf"

    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"'
        }
    )


@router.get("/report/csv")
def download_monthly_csv_report(
    hospital_id: Optional[int] = None,
    year: Optional[int] = Query(None),
    month: Optional[int] = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Generates and downloads tabular CSV Monthly Audit Report.
    """
    now = datetime.datetime.utcnow()
    y = year or now.year
    m = month or now.month

    target_hosp_id = None
    if current_user.role == "hospital":
        target_hosp_id = current_user.id
    elif current_user.role == "admin":
        target_hosp_id = hospital_id
    else:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied.")

    audit_data = get_monthly_audit_data(db, target_hosp_id, y, m)
    csv_text = generate_csv_audit_report(audit_data)

    safe_name = "".join(c for c in audit_data["hospital_name"] if c.isalnum() or c in (' ', '_', '-')).strip().replace(" ", "_")
    filename = f"BMW_Audit_{safe_name}_{y}_{m:02d}.csv"

    return Response(
        content=csv_text,
        media_type="text/csv",
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"'
        }
    )


@router.get("/corrections", response_model=List[CorrectionHistoryResponse])
def get_waste_corrections_log(
    hospital_id: Optional[int] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Lists waste segregation correction history log for auditing.
    """
    query = db.query(WasteCorrection)
    if current_user.role == "hospital":
        query = query.filter(WasteCorrection.hospital_id == current_user.id)
    elif current_user.role == "admin" and hospital_id:
        query = query.filter(WasteCorrection.hospital_id == hospital_id)

    corrections = query.order_by(WasteCorrection.corrected_at.desc()).all()
    return [CorrectionHistoryResponse.model_validate(c) for c in corrections]
