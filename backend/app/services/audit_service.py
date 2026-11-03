import io
import csv
import datetime
import calendar
from typing import List, Dict, Any, Optional, Tuple
from sqlalchemy.orm import Session
from sqlalchemy import func, extract

from reportlab.lib import colors
from reportlab.lib.pagesizes import letter
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, KeepTogether, HRFlowable
)
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT

from app.models.user import User
from app.models.waste import WasteRecord
from app.models.pickup import PickupRequest
from app.models.audit import WasteCorrection

REGULATORY_DISCLAIMER = (
    "STATUTORY ADVISORY NOTICE: This automated monthly medical waste audit report is generated "
    "for institutional self-monitoring pursuant to the Bio-Medical Waste Management Rules, 2016 "
    "(Ministry of Environment, Forest and Climate Change, Government of India). It provides "
    "automated advisory segregation validation and operational verification. It does not replace "
    "statutory third-party environmental audits or guarantee official regulatory compliance from "
    "the State Pollution Control Board (TNPCB)."
)

# Color palettes for audit categories
AUDIT_COLORS = {
    "Sharps": "#f59e0b", # Amber/Orange (White container)
    "Anatomical": "#eab308", # Yellow
    "Cytotoxic": "#8b5cf6", # Purple
    "General": "#64748b", # Slate/Gray
    "Contaminated Plastics": "#ef4444", # Red
    "Glassware": "#3b82f6" # Blue
}

def validate_waste_sorting(
    category: str,
    waste_type: str,
    notes: Optional[str] = None
) -> Tuple[str, bool, Optional[str], Optional[str]]:
    """
    Validates medical waste segregation against India Bio-Medical Waste Management Rules, 2016.
    Returns:
      (audit_classification, has_warning, warning_reason, recommended_category)
    """
    text = f"{waste_type} {notes or ''}".lower()
    cat = (category or "").strip()

    # 1. Sharps Detection (Must be White container)
    sharps_keywords = ["needle", "scalpel", "blade", "lancet", "sharps", "puncture", "stitch cutter", "trocar"]
    if any(k in text for k in sharps_keywords):
        audit_class = "Sharps"
        if cat != "White":
            return (
                audit_class,
                True,
                (
                    f"Puncture hazard: '{waste_type}' contains sharps materials which must be segregated into "
                    f"puncture-proof, tamper-proof WHITE translucent containers (Rule 4(b), BMW 2016) to prevent "
                    f"accidental needle-stick injuries. Currently recorded under '{cat}'."
                ),
                "White"
            )
        return (audit_class, False, None, "White")

    # 2. Cytotoxic / Chemotherapy Waste (Yellow with Cytotoxic mark)
    cytotoxic_keywords = ["cytotoxic", "chemotherapy", "oncology", "antineoplastic", "methotrexate", "cisplatin", "doxorubicin"]
    if any(k in text for k in cytotoxic_keywords):
        audit_class = "Cytotoxic"
        if cat != "Yellow":
            return (
                audit_class,
                True,
                (
                    f"Hazardous medication: '{waste_type}' is cytotoxic/chemotherapeutic pharmaceutical waste, "
                    f"which must be deposited into YELLOW non-chlorinated containers bearing distinct Cytotoxic "
                    f"hazard labels for high-temperature hazardous incineration (>1200°C). Currently recorded under '{cat}'."
                ),
                "Yellow"
            )
        return (audit_class, False, None, "Yellow")

    # 3. Anatomical Waste (Yellow container)
    anatomical_keywords = ["anatomical", "tissue", "organ", "placenta", "body part", "amputat", "biopsy", "fetus", "pathology specimen"]
    if any(k in text for k in anatomical_keywords):
        audit_class = "Anatomical"
        if cat != "Yellow":
            return (
                audit_class,
                True,
                (
                    f"Biohazard violation: Human anatomical and pathological tissue ('{waste_type}') must strictly be "
                    f"placed in YELLOW non-chlorinated plastic bags for incineration or deep burial (Schedule I). "
                    f"Currently recorded under '{cat}'."
                ),
                "Yellow"
            )
        return (audit_class, False, None, "Yellow")

    # 4. General / Municipal / Non-infectious Waste
    general_keywords = ["office paper", "cardboard", "canteen", "kitchen", "food waste", "tea cup", "paper cup", "packaging carton", "newspaper"]
    if any(k in text for k in general_keywords):
        audit_class = "General"
        return (
            audit_class,
            True,
            (
                f"Segregation warning: '{waste_type}' appears to be non-infectious general/municipal waste. "
                f"Under BMW Rules, non-contaminated waste must NOT be mixed into biomedical streams to prevent "
                f"unnecessary biohazard waste volume and excessive incinerator emissions."
            ),
            "General"
        )

    # 5. Contaminated Recyclable Plastics (Red container)
    plastics_keywords = ["iv tubing", "iv set", "catheter", "urine bag", "dialysis", "disposable gloves", "plastic bottle", "vacutainer"]
    if any(k in text for k in plastics_keywords):
        audit_class = "Contaminated Plastics"
        if cat != "Red":
            return (
                audit_class,
                True,
                (
                    f"Material mismatch: Contaminated recyclable plastics ('{waste_type}') belong in RED autoclavable "
                    f"containers for autoclaving, shredding, and authorized recycling. Currently recorded under '{cat}'."
                ),
                "Red"
            )
        return (audit_class, False, None, "Red")

    # 6. Glassware & Metallic Implants (Blue container)
    glass_keywords = ["glass ampoule", "broken vial", "medicine vial", "glass bottle", "orthopedic implant", "metallic plate"]
    if any(k in text for k in glass_keywords):
        audit_class = "Glassware"
        if cat != "Blue":
            return (
                audit_class,
                True,
                (
                    f"Packaging mismatch: Glass ampoules and metallic implants ('{waste_type}') must be collected in "
                    f"BLUE puncture-resistant boxes with sodium hypochlorite disinfection. Currently recorded under '{cat}'."
                ),
                "Blue"
            )
        return (audit_class, False, None, "Blue")

    # Fallback classification based on selected category
    if cat == "White":
        return ("Sharps", False, None, "White")
    elif cat == "Yellow":
        return ("Anatomical", False, None, "Yellow")
    elif cat == "Red":
        return ("Contaminated Plastics", False, None, "Red")
    elif cat == "Blue":
        return ("Glassware", False, None, "Blue")
    else:
        return ("General", False, None, "General")


def get_monthly_audit_data(
    db: Session,
    hospital_id: Optional[int],
    year: int,
    month: int
) -> Dict[str, Any]:
    """
    Gathers authentic database records for hospital monthly medical-waste audit.
    """
    month_name = calendar.month_name[month]
    num_days = calendar.monthrange(year, month)[1]
    start_date = datetime.datetime(year, month, 1, 0, 0, 0)
    end_date = datetime.datetime(year, month, num_days, 23, 59, 59)

    hospital = None
    if hospital_id:
        hospital = db.query(User).filter(User.id == hospital_id).first()

    query = db.query(WasteRecord).filter(
        WasteRecord.created_at >= start_date,
        WasteRecord.created_at <= end_date
    )
    if hospital_id:
        query = query.filter(WasteRecord.hospital_id == hospital_id)

    records = query.order_by(WasteRecord.created_at.desc()).all()

    # Compute breakdown totals
    total_waste = 0.0
    sharps_kg = 0.0
    anatomical_kg = 0.0
    cytotoxic_kg = 0.0
    general_kg = 0.0
    plastics_kg = 0.0
    glassware_kg = 0.0

    warnings_list = []
    audit_records_list = []

    for r in records:
        q = float(r.quantity)
        total_waste += q

        # Run validation
        audit_class, has_warn, warn_reason, rec_cat = validate_waste_sorting(
            r.category, r.waste_type, r.notes
        )

        # Update record object cache if not set
        if not r.audit_classification:
            r.audit_classification = audit_class
            r.has_sorting_warning = has_warn
            r.warning_reason = warn_reason

        # Accumulate breakdown
        if audit_class == "Sharps" or r.category == "White":
            sharps_kg += q
        elif audit_class == "Cytotoxic":
            cytotoxic_kg += q
        elif audit_class == "Anatomical" or r.category == "Yellow":
            anatomical_kg += q
        elif audit_class == "Contaminated Plastics" or r.category == "Red":
            plastics_kg += q
        elif audit_class == "Glassware" or r.category == "Blue":
            glassware_kg += q
        elif audit_class == "General":
            general_kg += q
        else:
            general_kg += q

        pickup_st = None
        if r.pickup_request:
            pickup_st = r.pickup_request.status

        audit_records_list.append({
            "id": r.id,
            "hospital_id": r.hospital_id,
            "category": r.category,
            "audit_classification": audit_class,
            "waste_type": r.waste_type,
            "quantity": round(q, 2),
            "unit": r.unit,
            "notes": r.notes,
            "is_scheduled": r.is_scheduled,
            "has_sorting_warning": has_warn,
            "warning_reason": warn_reason,
            "is_corrected": bool(r.is_corrected),
            "original_category": r.original_category,
            "created_at": r.created_at,
            "pickup_status": pickup_st
        })

        if has_warn:
            warnings_list.append({
                "record_id": r.id,
                "waste_type": r.waste_type,
                "selected_category": r.category,
                "recommended_category": rec_cat,
                "audit_classification": audit_class,
                "warning_reason": warn_reason,
                "quantity": round(q, 2),
                "created_at": r.created_at
            })

    # Pickups count
    pickups_q = db.query(PickupRequest).filter(
        PickupRequest.requested_at >= start_date,
        PickupRequest.requested_at <= end_date
    )
    if hospital_id:
        pickups_q = pickups_q.filter(PickupRequest.hospital_id == hospital_id)
    total_pickups = pickups_q.count()

    # Fetch correction history
    corrections_q = db.query(WasteCorrection).filter(
        WasteCorrection.corrected_at >= start_date,
        WasteCorrection.corrected_at <= end_date
    )
    if hospital_id:
        corrections_q = corrections_q.filter(WasteCorrection.hospital_id == hospital_id)
    corrections = corrections_q.order_by(WasteCorrection.corrected_at.desc()).all()

    corrections_list = [{
        "id": c.id,
        "waste_record_id": c.waste_record_id,
        "hospital_id": c.hospital_id,
        "previous_category": c.previous_category,
        "new_category": c.new_category,
        "previous_audit_class": c.previous_audit_class,
        "new_audit_class": c.new_audit_class,
        "correction_reason": c.correction_reason,
        "corrected_at": c.corrected_at,
        "corrected_by_user_id": c.user_id
    } for c in corrections]

    # Category distribution for charts
    cat_items = [
        {"name": "Sharps", "quantity": round(sharps_kg, 1), "color": AUDIT_COLORS["Sharps"]},
        {"name": "Anatomical", "quantity": round(anatomical_kg, 1), "color": AUDIT_COLORS["Anatomical"]},
        {"name": "Cytotoxic", "quantity": round(cytotoxic_kg, 1), "color": AUDIT_COLORS["Cytotoxic"]},
        {"name": "Contaminated Plastics", "quantity": round(plastics_kg, 1), "color": AUDIT_COLORS["Contaminated Plastics"]},
        {"name": "Glassware", "quantity": round(glassware_kg, 1), "color": AUDIT_COLORS["Glassware"]},
        {"name": "General", "quantity": round(general_kg, 1), "color": AUDIT_COLORS["General"]}
    ]
    for item in cat_items:
        item["percentage"] = round((item["quantity"] / total_waste * 100.0), 1) if total_waste > 0 else 0.0

    # Monthly Trend (grouped into weekly quarters)
    trend = []
    weeks = [
        ("Week 1 (1-7)", 1, 7),
        ("Week 2 (8-14)", 8, 14),
        ("Week 3 (15-21)", 15, 21),
        ("Week 4 (22+)", 22, num_days)
    ]
    for w_name, s_day, e_day in weeks:
        w_records = [
            r for r in audit_records_list
            if s_day <= r["created_at"].day <= e_day
        ]
        trend.append({
            "period": w_name,
            "sharps": round(sum(r["quantity"] for r in w_records if r["audit_classification"] == "Sharps"), 1),
            "anatomical": round(sum(r["quantity"] for r in w_records if r["audit_classification"] == "Anatomical"), 1),
            "cytotoxic": round(sum(r["quantity"] for r in w_records if r["audit_classification"] == "Cytotoxic"), 1),
            "plastics": round(sum(r["quantity"] for r in w_records if r["audit_classification"] == "Contaminated Plastics"), 1),
            "glassware": round(sum(r["quantity"] for r in w_records if r["audit_classification"] == "Glassware"), 1),
            "general": round(sum(r["quantity"] for r in w_records if r["audit_classification"] == "General"), 1),
            "total": round(sum(r["quantity"] for r in w_records), 1)
        })

    return {
        "hospital_id": hospital.id if hospital else 0,
        "hospital_name": hospital.name if hospital else "All Registered Facilities (State Overview)",
        "hospital_address": hospital.address if hospital else "Salem, Tamil Nadu, India",
        "year": year,
        "month": month,
        "month_name": month_name,
        "total_waste_kg": round(total_waste, 2),
        "total_sharps_kg": round(sharps_kg, 2),
        "total_anatomical_kg": round(anatomical_kg, 2),
        "total_cytotoxic_kg": round(cytotoxic_kg, 2),
        "total_general_kg": round(general_kg, 2),
        "total_contaminated_plastics_kg": round(plastics_kg, 2),
        "total_glassware_kg": round(glassware_kg, 2),
        "total_records": len(audit_records_list),
        "total_pickups": total_pickups,
        "inconsistencies_count": len(warnings_list),
        "category_distribution": cat_items,
        "monthly_trend": trend,
        "records": audit_records_list,
        "warnings": warnings_list,
        "corrections": corrections_list,
        "regulatory_disclaimer": REGULATORY_DISCLAIMER
    }


def generate_csv_audit_report(audit_data: Dict[str, Any]) -> str:
    """
    Generates a structured CSV compliance report string from actual database audit data.
    """
    output = io.StringIO()
    writer = csv.writer(output)

    # Header section
    writer.writerow(["BIOMEDICAL WASTE MANAGEMENT COMPLIANCE AUDIT REPORT"])
    writer.writerow(["State Medical Waste Regulatory Monitoring Directorate - Salem Zonal Office"])
    writer.writerow([])
    writer.writerow(["Facility Name", audit_data["hospital_name"]])
    writer.writerow(["Facility Address", audit_data["hospital_address"]])
    writer.writerow(["Audit Period", f"{audit_data['month_name']} {audit_data['year']}"])
    writer.writerow(["Report Generated On", datetime.datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S UTC")])
    writer.writerow(["Total Waste Generated (kg)", audit_data["total_waste_kg"]])
    writer.writerow(["Total Logged Batches", audit_data["total_records"]])
    writer.writerow(["Total Pickups Dispatched", audit_data["total_pickups"]])
    writer.writerow(["Segregation Inconsistencies Detected", audit_data["inconsistencies_count"]])
    writer.writerow([])

    # Breakdown by Stream
    writer.writerow(["--- WASTE CATEGORY BREAKDOWN ---"])
    writer.writerow(["Category Stream", "Quantity (kg)", "Share (%)"])
    for item in audit_data["category_distribution"]:
        writer.writerow([item["name"], item["quantity"], f"{item['percentage']}%"])
    writer.writerow([])

    # Sorting Inconsistencies Table
    if audit_data["warnings"]:
        writer.writerow(["--- POSSIBLE SEGREGATION INCONSISTENCIES / AUDIT OBSERVATIONS ---"])
        writer.writerow(["Record ID", "Waste Type", "Logged Category", "Recommended Stream", "Quantity (kg)", "Regulatory Audit Finding"])
        for w in audit_data["warnings"]:
            writer.writerow([
                w["record_id"],
                w["waste_type"],
                w["selected_category"],
                w["recommended_category"],
                w["quantity"],
                w["warning_reason"]
            ])
        writer.writerow([])

    # Detailed Records Table
    writer.writerow(["--- ALL LOGGED WASTE BATCHES ---"])
    writer.writerow(["Batch ID", "Category", "Audit Classification", "Waste Type", "Quantity", "Unit", "Logged Date", "Pickup Status", "Sorting Warning"])
    for r in audit_data["records"]:
        writer.writerow([
            r["id"],
            r["category"],
            r["audit_classification"],
            r["waste_type"],
            r["quantity"],
            r["unit"],
            r["created_at"].strftime("%Y-%m-%d %H:%M") if hasattr(r["created_at"], "strftime") else str(r["created_at"]),
            r["pickup_status"] or "Recorded",
            "WARNING" if r["has_sorting_warning"] else "OK"
        ])

    writer.writerow([])
    writer.writerow(["DISCLAIMER", audit_data["regulatory_disclaimer"]])

    return output.getvalue()


def generate_pdf_audit_report(audit_data: Dict[str, Any]) -> bytes:
    """
    Generates a high-quality ReportLab PDF document for statutory compliance reporting.
    """
    buf = io.BytesIO()
    doc = SimpleDocTemplate(
        buf,
        pagesize=letter,
        leftMargin=36,
        rightMargin=36,
        topMargin=36,
        bottomMargin=36
    )

    styles = getSampleStyleSheet()

    # Custom styles
    title_style = ParagraphStyle(
        'DocTitle',
        parent=styles['Heading1'],
        fontSize=16,
        leading=20,
        textColor=colors.HexColor('#0f766e'), # Teal 700
        alignment=TA_LEFT,
        spaceAfter=4
    )
    subtitle_style = ParagraphStyle(
        'DocSubtitle',
        parent=styles['Normal'],
        fontSize=9,
        leading=12,
        textColor=colors.HexColor('#475569'),
        alignment=TA_LEFT
    )
    section_heading = ParagraphStyle(
        'SectionHeading',
        parent=styles['Heading2'],
        fontSize=11,
        leading=14,
        textColor=colors.HexColor('#0f172a'),
        spaceBefore=10,
        spaceAfter=6,
        keepWithNext=True
    )
    cell_style = ParagraphStyle(
        'CellText',
        parent=styles['Normal'],
        fontSize=8,
        leading=10,
        textColor=colors.HexColor('#1e293b')
    )
    cell_bold = ParagraphStyle(
        'CellBold',
        parent=styles['Normal'],
        fontSize=8,
        leading=10,
        fontName='Helvetica-Bold',
        textColor=colors.HexColor('#0f172a')
    )
    disclaimer_style = ParagraphStyle(
        'Disclaimer',
        parent=styles['Normal'],
        fontSize=7,
        leading=9,
        textColor=colors.HexColor('#64748b'),
        alignment=TA_CENTER
    )

    story = []

    # 1. Header Banner
    story.append(Paragraph("STATE BIOWASTE MANAGEMENT REGULATORY DIRECTORATE", title_style))
    story.append(Paragraph("Institutional Biomedical Waste Monthly Compliance & Audit Report • Salem Division", subtitle_style))
    story.append(Spacer(1, 8))
    story.append(HRFlowable(width="100%", thickness=1.5, color=colors.HexColor('#0d9488'), spaceAfter=10))

    # 2. Facility Metadata Table
    facility_data = [
        [
            Paragraph("<b>Facility Name:</b>", cell_style),
            Paragraph(audit_data["hospital_name"], cell_bold),
            Paragraph("<b>Audit Period:</b>", cell_style),
            Paragraph(f"{audit_data['month_name']} {audit_data['year']}", cell_bold)
        ],
        [
            Paragraph("<b>Location:</b>", cell_style),
            Paragraph(audit_data["hospital_address"], cell_style),
            Paragraph("<b>Report Date:</b>", cell_style),
            Paragraph(datetime.datetime.utcnow().strftime("%d %b %Y, %H:%M UTC"), cell_style)
        ]
    ]
    meta_table = Table(facility_data, colWidths=[80, 200, 80, 180])
    meta_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor('#f8fafc')),
        ('BOX', (0,0), (-1,-1), 1, colors.HexColor('#e2e8f0')),
        ('INNERGRID', (0,0), (-1,-1), 0.5, colors.HexColor('#e2e8f0')),
        ('TOPPADDING', (0,0), (-1,-1), 4),
        ('BOTTOMPADDING', (0,0), (-1,-1), 4),
    ]))
    story.append(meta_table)
    story.append(Spacer(1, 12))

    # 3. Monthly Waste Metric KPI Summary Cards
    kpi_data = [
        [
            Paragraph("TOTAL WASTE", cell_bold),
            Paragraph("SHARPS (WHITE)", cell_bold),
            Paragraph("ANATOMICAL (YELLOW)", cell_bold),
            Paragraph("CYTOTOXIC", cell_bold),
            Paragraph("GENERAL", cell_bold),
            Paragraph("INCONSISTENCIES", cell_bold)
        ],
        [
            Paragraph(f"<b>{audit_data['total_waste_kg']} kg</b>", ParagraphStyle('KPI', fontSize=12, leading=14, textColor=colors.HexColor('#0f766e'))),
            Paragraph(f"<b>{audit_data['total_sharps_kg']} kg</b>", ParagraphStyle('KPI', fontSize=12, leading=14, textColor=colors.HexColor('#d97706'))),
            Paragraph(f"<b>{audit_data['total_anatomical_kg']} kg</b>", ParagraphStyle('KPI', fontSize=12, leading=14, textColor=colors.HexColor('#ca8a04'))),
            Paragraph(f"<b>{audit_data['total_cytotoxic_kg']} kg</b>", ParagraphStyle('KPI', fontSize=12, leading=14, textColor=colors.HexColor('#7c3aed'))),
            Paragraph(f"<b>{audit_data['total_general_kg']} kg</b>", ParagraphStyle('KPI', fontSize=12, leading=14, textColor=colors.HexColor('#475569'))),
            Paragraph(f"<b>{audit_data['inconsistencies_count']}</b>", ParagraphStyle('KPI', fontSize=12, leading=14, textColor=colors.HexColor('#e11d48') if audit_data['inconsistencies_count'] > 0 else colors.HexColor('#16a34a')))
        ]
    ]
    kpi_table = Table(kpi_data, colWidths=[90, 90, 95, 85, 85, 95])
    kpi_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#f1f5f9')),
        ('BACKGROUND', (0,1), (-1,1), colors.HexColor('#ffffff')),
        ('BOX', (0,0), (-1,-1), 1, colors.HexColor('#cbd5e1')),
        ('INNERGRID', (0,0), (-1,-1), 0.5, colors.HexColor('#e2e8f0')),
        ('ALIGN', (0,0), (-1,-1), 'CENTER'),
        ('TOPPADDING', (0,0), (-1,-1), 5),
        ('BOTTOMPADDING', (0,0), (-1,-1), 5),
    ]))
    story.append(kpi_table)
    story.append(Spacer(1, 12))

    # 4. Stream Distribution Table
    story.append(Paragraph("1. Waste Category Distribution & Segregation Audit", section_heading))
    dist_rows = [
        [
            Paragraph("<b>Waste Stream Category</b>", cell_bold),
            Paragraph("<b>Applicable Biohazard Protocol</b>", cell_bold),
            Paragraph("<b>Quantity (kg)</b>", cell_bold),
            Paragraph("<b>Mass Share (%)</b>", cell_bold)
        ]
    ]
    stream_protocols = {
        "Sharps": "White Puncture-Proof Container • Encapsulation / Sterilization",
        "Anatomical": "Yellow Bag • High-Temperature Incineration / Burial",
        "Cytotoxic": "Yellow Bag with Cytotoxic Symbol • Hazardous Incineration (>1200°C)",
        "Contaminated Plastics": "Red Autoclavable Container • Autoclave / Shredding / Recycling",
        "Glassware": "Blue Box • Disinfection / Glass Recycling",
        "General": "Black / Green Bag • Municipal Disposal (Must not enter BMW stream)"
    }
    for item in audit_data["category_distribution"]:
        dist_rows.append([
            Paragraph(f"<b>{item['name']}</b>", cell_style),
            Paragraph(stream_protocols.get(item['name'], "Standard Segregation Protocol"), cell_style),
            Paragraph(f"{item['quantity']} kg", cell_style),
            Paragraph(f"{item['percentage']}%", cell_style)
        ])
    dist_table = Table(dist_rows, colWidths=[120, 260, 80, 80])
    dist_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#f0fdfa')),
        ('BOX', (0,0), (-1,-1), 1, colors.HexColor('#ccfbf1')),
        ('INNERGRID', (0,0), (-1,-1), 0.5, colors.HexColor('#e2e8f0')),
        ('TOPPADDING', (0,0), (-1,-1), 4),
        ('BOTTOMPADDING', (0,0), (-1,-1), 4),
    ]))
    story.append(dist_table)
    story.append(Spacer(1, 12))

    # 5. Sorting Inconsistencies Section
    if audit_data["warnings"]:
        story.append(Paragraph("2. Advisory Segregation Inconsistencies & Corrective Notes", section_heading))
        warn_rows = [
            [
                Paragraph("<b>ID</b>", cell_bold),
                Paragraph("<b>Waste Description</b>", cell_bold),
                Paragraph("<b>Logged As</b>", cell_bold),
                Paragraph("<b>Recommended</b>", cell_bold),
                Paragraph("<b>Qty</b>", cell_bold),
                Paragraph("<b>Regulatory Segregation Finding</b>", cell_bold)
            ]
        ]
        for w in audit_data["warnings"][:8]: # Cap at 8 in PDF to avoid excessive page overflow
            warn_rows.append([
                Paragraph(f"#{w['record_id']}", cell_style),
                Paragraph(w['waste_type'], cell_style),
                Paragraph(f"<font color='#dc2626'>{w['selected_category']}</font>", cell_style),
                Paragraph(f"<font color='#16a34a'><b>{w['recommended_category']}</b></font>", cell_style),
                Paragraph(f"{w['quantity']} kg", cell_style),
                Paragraph(w['warning_reason'], cell_style)
            ])
        warn_table = Table(warn_rows, colWidths=[30, 100, 60, 75, 45, 230])
        warn_table.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#fff1f2')),
            ('BOX', (0,0), (-1,-1), 1, colors.HexColor('#fecdd3')),
            ('INNERGRID', (0,0), (-1,-1), 0.5, colors.HexColor('#fee2e2')),
            ('TOPPADDING', (0,0), (-1,-1), 3),
            ('BOTTOMPADDING', (0,0), (-1,-1), 3),
        ]))
        story.append(warn_table)
        story.append(Spacer(1, 10))

    # 6. Statutory Disclaimer & Verification Block
    story.append(Spacer(1, 10))
    story.append(Paragraph(audit_data["regulatory_disclaimer"], disclaimer_style))
    story.append(Spacer(1, 12))

    # Sign-off box
    sign_data = [
        [
            Paragraph("<b>Facility Environmental Officer:</b><br/><br/>____________________________<br/>Authorized Medical Superintendent", cell_style),
            Paragraph("<b>Logistics Directorate Verifier:</b><br/><br/>____________________________<br/>TNPCB Certified Inspector", cell_style)
        ]
    ]
    sign_table = Table(sign_data, colWidths=[270, 270])
    sign_table.setStyle(TableStyle([
        ('BOX', (0,0), (-1,-1), 0.5, colors.HexColor('#cbd5e1')),
        ('TOPPADDING', (0,0), (-1,-1), 8),
        ('BOTTOMPADDING', (0,0), (-1,-1), 8),
        ('LEFTPADDING', (0,0), (-1,-1), 12),
    ]))
    story.append(KeepTogether([sign_table]))

    doc.build(story)
    return buf.getvalue()
