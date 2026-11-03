import sys
import os
import datetime
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.database import Base, engine, SessionLocal
from app.services.seed import seed_database

client = TestClient(app)

@pytest.fixture(scope="module", autouse=True)
def setup_db():
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    seed_database(db)
    db.close()
    yield

def test_root_endpoint():
    response = client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "Healthy & Operational"

def test_admin_login():
    response = client.post("/api/auth/login", json={
        "email": "admin@smartmedwaste.org",
        "password": "Admin@123456"
    })
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["user"]["role"] == "admin"

def test_hospital_register_and_workflow():
    # 1. Register new hospital
    hosp_payload = {
        "name": "Metro General Care",
        "email": "metro.general@hospital.org",
        "phone": "+91 99887 76655",
        "password": "Password@123",
        "confirm_password": "Password@123",
        "role": "hospital",
        "address": "88, Sankari Main Road, Seeragapadi, Salem, Tamil Nadu 636308",
        "latitude": 11.6210,
        "longitude": 78.0750
    }
    reg_res = client.post("/api/auth/register", json=hosp_payload)
    assert reg_res.status_code == 201
    h_token = reg_res.json()["access_token"]
    h_headers = {"Authorization": f"Bearer {h_token}"}

    # 2. Record waste
    waste_payload = {
        "category": "Red",
        "waste_type": "Contaminated Surgical Gloves and Catheters",
        "quantity": 24.5,
        "unit": "kg",
        "notes": "Emergency ICU ward batch"
    }
    waste_res = client.post("/api/waste", json=waste_payload, headers=h_headers)
    assert waste_res.status_code == 201
    waste_id = waste_res.json()["id"]

    # 3. Create pickup request -> Triggers ML Priority Prediction
    pickup_payload = {
        "waste_record_id": waste_id,
        "storage_duration_hours": 18.0,
        "pickup_address": "North Central Avenue, Building 9"
    }
    p_res = client.post("/api/pickups", json=pickup_payload, headers=h_headers)
    assert p_res.status_code == 201
    p_data = p_res.json()
    assert p_data["status"] == "Pending"
    assert p_data["delay_risk"] in ["High", "Medium", "Low"]
    assert "delay_probability" in p_data
    assert p_data["priority"] in ["High", "Medium", "Low"]
    assert p_data["collector_id"] is None # Hospital does not assign collector
    pickup_id = p_data["id"]

    # 4. Admin logs in and finds nearby available collectors
    admin_login = client.post("/api/auth/login", json={
        "email": "admin@smartmedwaste.org",
        "password": "Admin@123456"
    })
    admin_token = admin_login.json()["access_token"]
    admin_headers = {"Authorization": f"Bearer {admin_token}"}

    nearby_res = client.get(f"/api/admin/collectors/nearby/{pickup_id}", headers=admin_headers)
    assert nearby_res.status_code == 200
    collectors = nearby_res.json()
    assert len(collectors) > 0
    assert "distance_km" in collectors[0]
    assigned_collector_id = collectors[0]["id"]

    # 5. Admin assigns the nearby collector
    assign_res = client.put(f"/api/admin/pickups/{pickup_id}/assign", json={
        "collector_id": assigned_collector_id
    }, headers=admin_headers)
    assert assign_res.status_code == 200
    assert assign_res.json()["status"] == "Assigned"
    assert assign_res.json()["collector_id"] == assigned_collector_id

    # 6. Assigned Collector logs in and accepts pickup
    collector_user = [c for c in collectors if c["id"] == assigned_collector_id][0]
    col_login = client.post("/api/auth/login", json={
        "email": collector_user["email"],
        "password": "Password@123"
    })
    col_token = col_login.json()["access_token"]
    col_headers = {"Authorization": f"Bearer {col_token}"}

    # Verify collector sees assigned pickup
    my_assigned = client.get("/api/collector/pickups/assigned", headers=col_headers)
    assert my_assigned.status_code == 200
    assigned_ids = [p["id"] for p in my_assigned.json()]
    assert pickup_id in assigned_ids

    # Collector accepts pickup
    accept_res = client.put(f"/api/collector/pickups/{pickup_id}/accept", headers=col_headers)
    assert accept_res.status_code == 200
    assert accept_res.json()["status"] == "Accepted"

    # 7. Collector updates GPS location during active pickup
    loc_res = client.post("/api/location/update", json={
        "pickup_id": pickup_id,
        "latitude": 11.6495,
        "longitude": 78.1380
    }, headers=col_headers)
    assert loc_res.status_code == 200

    # 8. Collector completes pickup at hospital
    comp_res = client.put(f"/api/collector/pickups/{pickup_id}/complete", headers=col_headers)
    assert comp_res.status_code == 200
    assert comp_res.json()["status"] == "Collected"

    # 9. Verify pickup is removed from active list and visible in history
    active_res = client.get("/api/pickups/active", headers=h_headers)
    assert all(p["id"] != pickup_id for p in active_res.json())

    hist_res = client.get("/api/history", headers=h_headers)
    assert hist_res.status_code == 200
    hist_ids = [p["id"] for p in hist_res.json()]
    assert pickup_id in hist_ids

def test_ml_prediction_and_metrics_endpoints():
    # 1. New Predict Delay Risk endpoint
    pred_res = client.post("/api/ml/predict-delay-risk", json={
        "waste_category": "Yellow",
        "waste_quantity": 45.0,
        "storage_duration_hours": 36.0,
        "request_waiting_hours": 8.0,
        "waste_risk_level": 4,
        "pickup_distance_km": 6.0
    })
    assert pred_res.status_code == 200
    p_data = pred_res.json()
    assert p_data["delay_risk"] in ["HIGH DELAY RISK", "MEDIUM DELAY RISK", "LOW DELAY RISK"]
    assert p_data["risk_level"] in ["High", "Medium", "Low"]
    assert "delay_probability" in p_data
    assert 0.0 <= p_data["delay_probability"] <= 1.0
    assert p_data["is_delayed"] in [0, 1]
    assert "probabilities" in p_data

    # 2. Legacy predict priority compatibility endpoint
    legacy_pred = client.post("/api/ml/predict-priority", json={
        "waste_category": "Red",
        "waste_quantity": 20.0
    })
    assert legacy_pred.status_code == 200
    l_data = legacy_pred.json()
    assert "delay_risk" in l_data
    assert "priority" in l_data

    # 3. Model Info endpoint
    info_res = client.get("/api/ml/model-info")
    assert info_res.status_code == 200
    info_data = info_res.json()
    assert "Random Forest" in info_data["model_name"]
    assert "risk_levels" in info_data

    # 4. Metrics endpoint
    metrics_res = client.get("/api/ml/metrics")
    assert metrics_res.status_code == 200
    m_data = metrics_res.json()
    assert m_data["model_name"] == "Random Forest Classifier"
    assert m_data["dataset_records_total"] >= 1600
    assert "accuracy" in m_data["metrics"]
    assert "roc_auc" in m_data["metrics"]

def test_analytics_endpoints():
    admin_login = client.post("/api/auth/login", json={
        "email": "admin@smartmedwaste.org",
        "password": "Admin@123456"
    })
    admin_token = admin_login.json()["access_token"]
    admin_headers = {"Authorization": f"Bearer {admin_token}"}

    overview_res = client.get("/api/analytics/overview", headers=admin_headers)
    assert overview_res.status_code == 200
    assert overview_res.json()["total_hospitals"] >= 1

    cats_res = client.get("/api/analytics/category-distribution", headers=admin_headers)
    assert cats_res.status_code == 200
    assert len(cats_res.json()) == 4

    # Delay Risk distribution endpoint
    risk_res = client.get("/api/analytics/pickup-delay-risk", headers=admin_headers)
    assert risk_res.status_code == 200
    risks = risk_res.json()
    assert len(risks) == 3
    risk_names = [r["risk_level"] for r in risks]
    assert "High" in risk_names and "Medium" in risk_names and "Low" in risk_names

def test_ortools_route_optimization_and_confirmation():
    # Admin login
    admin_login = client.post("/api/auth/login", json={
        "email": "admin@smartmedwaste.org",
        "password": "Admin@123456"
    })
    admin_token = admin_login.json()["access_token"]
    admin_headers = {"Authorization": f"Bearer {admin_token}"}

    # Retrieve pending pickups
    pickups_res = client.get("/api/pickups?status=Pending", headers=admin_headers)
    assert pickups_res.status_code == 200
    pending_pickups = pickups_res.json()
    assert len(pending_pickups) >= 2, "Need at least 2 pending pickups for multi-stop route test"
    pickup_ids = [p["id"] for p in pending_pickups[:2]]

    # Retrieve collectors
    users_res = client.get("/api/admin/users", headers=admin_headers)
    assert users_res.status_code == 200
    collectors = users_res.json()["collectors"]
    assert len(collectors) >= 1
    collector_id = collectors[0]["id"]

    # 1. Test Google OR-Tools Multi-Stop Optimization
    opt_payload = {
        "collector_id": collector_id,
        "pickup_ids": pickup_ids,
        "consider_capacity": True,
        "consider_time_windows": True,
        "return_to_depot": True
    }
    opt_res = client.post("/api/routes/optimize", json=opt_payload, headers=admin_headers)
    assert opt_res.status_code == 200
    opt_data = opt_res.json()
    assert opt_data["feasibility_status"] in ["Feasible", "Warning"]
    assert len(opt_data["stops"]) == len(pickup_ids)
    assert opt_data["total_distance_km"] > 0.0
    assert opt_data["total_duration_minutes"] > 0.0
    assert len(opt_data["route_geometry"]) > 0

    # 2. Test Admin Route Confirmation & Dispatch
    conf_payload = {
        "collector_id": collector_id,
        "pickup_ids": pickup_ids
    }
    conf_res = client.post("/api/routes/confirm", json=conf_payload, headers=admin_headers)
    assert conf_res.status_code == 200
    conf_data = conf_res.json()
    assert conf_data["status"] == "Confirmed"
    assert len(conf_data["stops"]) == len(pickup_ids)
    route_id = conf_data["id"]

    # 3. Collector Views Active Multi-Stop Route
    collector_login = client.post("/api/auth/login", json={
        "email": collectors[0]["email"],
        "password": "Password@123"
    })
    assert collector_login.status_code == 200
    col_token = collector_login.json()["access_token"]
    col_headers = {"Authorization": f"Bearer {col_token}"}

    active_route_res = client.get("/api/routes/active", headers=col_headers)
    assert active_route_res.status_code == 200
    active_route = active_route_res.json()
    assert active_route is not None
    assert active_route["id"] == route_id
    assert len(active_route["stops"]) == len(pickup_ids)

    # 4. Collector updates stop status
    stop_id = active_route["stops"][0]["id"]
    stop_res = client.put(f"/api/routes/{route_id}/stops/{stop_id}/status", json={"status": "Collected"}, headers=col_headers)
    assert stop_res.status_code == 200

def test_monthly_audit_dashboard_and_reports():
    # 1. Hospital login
    hosp_login = client.post("/api/auth/login", json={
        "email": "apollo@medcare.org",
        "password": "Password@123"
    })
    assert hosp_login.status_code == 200
    h_token = hosp_login.json()["access_token"]
    h_headers = {"Authorization": f"Bearer {h_token}"}

    # 2. Monthly Waste Audit Data
    now = datetime.datetime.utcnow()
    audit_res = client.get(f"/api/audit/monthly?year={now.year}&month={now.month}", headers=h_headers)
    assert audit_res.status_code == 200
    audit_data = audit_res.json()
    assert audit_data["hospital_id"] > 0
    assert "total_waste_kg" in audit_data
    assert "category_distribution" in audit_data
    assert "regulatory_disclaimer" in audit_data

    # 3. Download CSV Report
    csv_res = client.get(f"/api/audit/report/csv?year={now.year}&month={now.month}", headers=h_headers)
    assert csv_res.status_code == 200
    assert "text/csv" in csv_res.headers["content-type"]
    assert "BIOMEDICAL WASTE MANAGEMENT" in csv_res.text

    # 4. Download PDF Report
    pdf_res = client.get(f"/api/audit/report/pdf?year={now.year}&month={now.month}", headers=h_headers)
    assert pdf_res.status_code == 200
    assert "application/pdf" in pdf_res.headers["content-type"]
    assert len(pdf_res.content) > 1000

    # 5. Waste Sorting Inconsistency Correction
    # If any waste record exists, test correction
    if audit_data["records"]:
        record_id = audit_data["records"][0]["id"]
        corr_res = client.post(f"/api/audit/correct-waste/{record_id}", json={
            "new_category": "White",
            "correction_reason": "Verified puncture-proof containment for scalpel batch."
        }, headers=h_headers)
        assert corr_res.status_code == 200
        corr_data = corr_res.json()
        assert corr_data["category"] == "White"
        assert corr_data["is_corrected"] is True

    # 6. Admin System-wide Audit Overview
    admin_login = client.post("/api/auth/login", json={
        "email": "admin@smartmedwaste.org",
        "password": "Admin@123456"
    })
    admin_token = admin_login.json()["access_token"]
    admin_headers = {"Authorization": f"Bearer {admin_token}"}

    admin_audit_res = client.get(f"/api/audit/admin-overview?year={now.year}&month={now.month}", headers=admin_headers)
    assert admin_audit_res.status_code == 200
    admin_data = admin_audit_res.json()
    assert admin_data["total_hospitals"] >= 1
    assert "hospitals_summary" in admin_data

