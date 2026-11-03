import sqlite3
import os
import sys

# Ensure backend directory is in sys.path
sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

from app.database import Base, engine
from app.models import User, WasteRecord, PickupRequest, CollectorLocation, OptimizedRoute, RouteStop, WasteCorrection
from app.services.audit_service import validate_waste_sorting

# Verified Salem, Tamil Nadu, India Geocoded Locations
SALEM_HOSPITAL_LOCATIONS = {
    "apollo@medcare.org": {
        "address": "12/4, Meyyanur Main Road, Near New Bus Stand, Meyyanur, Salem, Tamil Nadu 636004",
        "latitude": 11.6715,
        "longitude": 78.1332
    },
    "citylife@clinic.org": {
        "address": "45, Omalur Main Road, Mamangam, Salem, Tamil Nadu 636302",
        "latitude": 11.6965,
        "longitude": 78.1215
    },
    "stjude@hospitals.org": {
        "address": "18, Ramakrishna Road, Hasthampatti, Salem, Tamil Nadu 636007",
        "latitude": 11.6752,
        "longitude": 78.1580
    },
    "metro.general@hospital.org": {
        "address": "88, Sankari Main Road, Seeragapadi, Salem, Tamil Nadu 636308",
        "latitude": 11.6210,
        "longitude": 78.0750
    },
    "contact@govhcare.org": {
        "address": "Fort Main Road, Opp. Collectorate, Salem, Tamil Nadu 636001",
        "latitude": 11.6538,
        "longitude": 78.1560
    },
    "contact@citycare.org": {
        "address": "14, Cherry Road, Hasthampatti, Salem, Tamil Nadu 636007",
        "latitude": 11.6690,
        "longitude": 78.1620
    }
}

SALEM_COLLECTOR_LOCATIONS = {
    "rajesh.collector@bioclean.in": {
        "address": "Central Bio-Logistics Depot, Leigh Bazaar, Shevapet, Salem, Tamil Nadu 636002",
        "latitude": 11.6495,
        "longitude": 78.1380,
        "vehicle_number": "TN-27-AX-4821",
        "vehicle_type": "Tata Ace Bio-Carrier",
        "vehicle_capacity_kg": 250.0
    },
    "vikram.collector@ecosafe.in": {
        "address": "Unit 5, SIDCO Industrial Estate, Five Roads, Salem, Tamil Nadu 636004",
        "latitude": 11.6685,
        "longitude": 78.1290,
        "vehicle_number": "TN-30-BW-7190",
        "vehicle_type": "Mahindra Bolero Maxi-Truck",
        "vehicle_capacity_kg": 350.0
    },
    "amit.collector@enviromed.in": {
        "address": "Transport Terminal Bay 4, Junction Road, Suramangalam, Salem, Tamil Nadu 636005",
        "latitude": 11.6850,
        "longitude": 78.1150,
        "vehicle_number": "TN-27-CZ-1122",
        "vehicle_type": "Ashok Leyland Dost Bio-Van",
        "vehicle_capacity_kg": 300.0
    },
    "ramkumar@logistics.in": {
        "address": "Ammapet Logistics Park, Main Road, Salem, Tamil Nadu 636003",
        "latitude": 11.6540,
        "longitude": 78.1810,
        "vehicle_number": "TN-30-DP-9933",
        "vehicle_type": "Eicher Pro Biohazard Carrier",
        "vehicle_capacity_kg": 500.0
    },
    "pir@logistics.org": {
        "address": "Steel Plant Road Depot, Tharamangalam Bypass, Salem, Tamil Nadu 636013",
        "latitude": 11.6720,
        "longitude": 78.0950,
        "vehicle_number": "TN-27-ER-7711",
        "vehicle_type": "Force Traveller Bio-Hauler",
        "vehicle_capacity_kg": 400.0
    }
}

ADMIN_LOCATION = {
    "address": "TNPCB Zonal Regulatory Office, Siva Tower, Ramakrishna Road, Salem, Tamil Nadu 636007",
    "latitude": 11.6730,
    "longitude": 78.1520
}

def migrate_db(db_path: str):
    if not os.path.exists(db_path):
        print(f"Skipping {db_path} (does not exist)")
        return

    print(f"\n==========================================")
    print(f"Migrating SQLite Database: {db_path}")
    print(f"==========================================")

    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    # 1. Add missing columns to users
    cursor.execute("PRAGMA table_info(users)")
    existing_user_cols = [row[1] for row in cursor.fetchall()]
    new_user_cols = [
        ("vehicle_number", "VARCHAR(50)"),
        ("vehicle_type", "VARCHAR(80)"),
        ("vehicle_capacity_kg", "FLOAT DEFAULT 250.0")
    ]
    for col_name, col_type in new_user_cols:
        if col_name not in existing_user_cols:
            cursor.execute(f"ALTER TABLE users ADD COLUMN {col_name} {col_type}")
            print(f"Added column users.{col_name}")

    # 2. Add missing columns to pickup_requests
    cursor.execute("PRAGMA table_info(pickup_requests)")
    existing_pickup_cols = [row[1] for row in cursor.fetchall()]
    new_pickup_cols = [
        ("preferred_time_window", "VARCHAR(50) DEFAULT '09:00 - 13:00'"),
        ("time_window_start_min", "INTEGER DEFAULT 60"),
        ("time_window_end_min", "INTEGER DEFAULT 300"),
        ("route_id", "INTEGER REFERENCES optimized_routes(id)"),
        ("stop_order", "INTEGER")
    ]
    for col_name, col_type in new_pickup_cols:
        if col_name not in existing_pickup_cols:
            cursor.execute(f"ALTER TABLE pickup_requests ADD COLUMN {col_name} {col_type}")
            print(f"Added column pickup_requests.{col_name}")

    # 3. Add missing columns to waste_records
    cursor.execute("PRAGMA table_info(waste_records)")
    existing_waste_cols = [row[1] for row in cursor.fetchall()]
    new_waste_cols = [
        ("audit_classification", "VARCHAR(50)"),
        ("has_sorting_warning", "BOOLEAN DEFAULT 0"),
        ("warning_reason", "VARCHAR(300)"),
        ("is_corrected", "BOOLEAN DEFAULT 0"),
        ("original_category", "VARCHAR(20)")
    ]
    for col_name, col_type in new_waste_cols:
        if col_name not in existing_waste_cols:
            cursor.execute(f"ALTER TABLE waste_records ADD COLUMN {col_name} {col_type}")
            print(f"Added column waste_records.{col_name}")

    # 4. Create new tables if not exist
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS optimized_routes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            route_code VARCHAR(50) UNIQUE NOT NULL,
            collector_id INTEGER NOT NULL REFERENCES users(id),
            admin_id INTEGER NOT NULL REFERENCES users(id),
            status VARCHAR(30) DEFAULT 'Suggested' NOT NULL,
            total_distance_km FLOAT DEFAULT 0.0,
            total_duration_minutes FLOAT DEFAULT 0.0,
            total_waste_kg FLOAT DEFAULT 0.0,
            vehicle_capacity_kg FLOAT DEFAULT 250.0,
            feasibility_status VARCHAR(30) DEFAULT 'Feasible',
            feasibility_notes TEXT,
            route_geometry TEXT,
            created_at DATETIME,
            confirmed_at DATETIME,
            completed_at DATETIME
        )
    """)
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS route_stops (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            route_id INTEGER NOT NULL REFERENCES optimized_routes(id),
            pickup_id INTEGER NOT NULL REFERENCES pickup_requests(id),
            hospital_id INTEGER NOT NULL REFERENCES users(id),
            stop_order INTEGER NOT NULL,
            distance_from_prev_km FLOAT DEFAULT 0.0,
            estimated_arrival_minutes FLOAT DEFAULT 0.0,
            time_window_start VARCHAR(30),
            time_window_end VARCHAR(30),
            waste_quantity_kg FLOAT DEFAULT 0.0,
            status VARCHAR(30) DEFAULT 'Pending',
            collected_at DATETIME
        )
    """)
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS waste_corrections (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            waste_record_id INTEGER NOT NULL REFERENCES waste_records(id),
            hospital_id INTEGER NOT NULL REFERENCES users(id),
            user_id INTEGER NOT NULL REFERENCES users(id),
            previous_category VARCHAR(20) NOT NULL,
            new_category VARCHAR(20) NOT NULL,
            previous_audit_class VARCHAR(50),
            new_audit_class VARCHAR(50),
            correction_reason VARCHAR(500) NOT NULL,
            corrected_at DATETIME
        )
    """)
    conn.commit()

    # 5. Update Admin Location
    cursor.execute("UPDATE users SET address = ?, latitude = ?, longitude = ? WHERE role = 'admin'",
                   (ADMIN_LOCATION["address"], ADMIN_LOCATION["latitude"], ADMIN_LOCATION["longitude"]))

    # 6. Update Hospitals to Salem
    cursor.execute("SELECT id, email, name FROM users WHERE role = 'hospital'")
    hospitals = cursor.fetchall()
    fallback_hosp_coords = [
        ("12/4, Meyyanur Main Road, Near New Bus Stand, Meyyanur, Salem, Tamil Nadu 636004", 11.6715, 78.1332),
        ("45, Omalur Main Road, Mamangam, Salem, Tamil Nadu 636302", 11.6965, 78.1215),
        ("18, Ramakrishna Road, Hasthampatti, Salem, Tamil Nadu 636007", 11.6752, 78.1580),
        ("88, Sankari Main Road, Seeragapadi, Salem, Tamil Nadu 636308", 11.6210, 78.0750),
        ("Fort Main Road, Opp. Collectorate, Salem, Tamil Nadu 636001", 11.6538, 78.1560),
        ("14, Cherry Road, Hasthampatti, Salem, Tamil Nadu 636007", 11.6690, 78.1620)
    ]
    for idx, (h_id, email, name) in enumerate(hospitals):
        loc = SALEM_HOSPITAL_LOCATIONS.get(email.lower())
        if not loc:
            fb = fallback_hosp_coords[idx % len(fallback_hosp_coords)]
            loc = {"address": fb[0], "latitude": fb[1], "longitude": fb[2]}
        cursor.execute(
            "UPDATE users SET address = ?, latitude = ?, longitude = ? WHERE id = ?",
            (loc["address"], loc["latitude"], loc["longitude"], h_id)
        )
        print(f"Updated Hospital #{h_id} ({name}) -> {loc['address']} ({loc['latitude']}, {loc['longitude']})")

    # 7. Update Collectors to Salem
    cursor.execute("SELECT id, email, name FROM users WHERE role = 'collector'")
    collectors = cursor.fetchall()
    fallback_coll_coords = [
        ("Central Bio-Logistics Depot, Leigh Bazaar, Shevapet, Salem, Tamil Nadu 636002", 11.6495, 78.1380, "TN-27-AX-4821", "Tata Ace Bio-Carrier", 250.0),
        ("Unit 5, SIDCO Industrial Estate, Five Roads, Salem, Tamil Nadu 636004", 11.6685, 78.1290, "TN-30-BW-7190", "Mahindra Bolero Maxi-Truck", 350.0),
        ("Transport Terminal Bay 4, Junction Road, Suramangalam, Salem, Tamil Nadu 636005", 11.6850, 78.1150, "TN-27-CZ-1122", "Ashok Leyland Dost Bio-Van", 300.0),
        ("Ammapet Logistics Park, Main Road, Salem, Tamil Nadu 636003", 11.6540, 78.1810, "TN-30-DP-9933", "Eicher Pro Biohazard Carrier", 500.0),
        ("Steel Plant Road Depot, Tharamangalam Bypass, Salem, Tamil Nadu 636013", 11.6720, 78.0950, "TN-27-ER-7711", "Force Traveller Bio-Hauler", 400.0)
    ]
    for idx, (c_id, email, name) in enumerate(collectors):
        loc = SALEM_COLLECTOR_LOCATIONS.get(email.lower())
        if not loc:
            fb = fallback_coll_coords[idx % len(fallback_coll_coords)]
            loc = {
                "address": fb[0], "latitude": fb[1], "longitude": fb[2],
                "vehicle_number": fb[3], "vehicle_type": fb[4], "vehicle_capacity_kg": fb[5]
            }
        cursor.execute(
            """UPDATE users SET address = ?, latitude = ?, longitude = ?,
               vehicle_number = ?, vehicle_type = ?, vehicle_capacity_kg = ?
               WHERE id = ?""",
            (loc["address"], loc["latitude"], loc["longitude"],
             loc.get("vehicle_number", f"TN-27-BX-{1000+c_id}"),
             loc.get("vehicle_type", "Tata Ace Bio-Carrier"),
             float(loc.get("vehicle_capacity_kg", 250.0)),
             c_id)
        )
        print(f"Updated Collector #{c_id} ({name}) -> {loc['address']} ({loc['latitude']}, {loc['longitude']})")

    # 8. Update Related Pickup Locations
    # Ensure pickup_address, hospital_latitude, hospital_longitude match updated hospital
    cursor.execute("""
        UPDATE pickup_requests
        SET pickup_address = (SELECT address FROM users WHERE users.id = pickup_requests.hospital_id),
            hospital_latitude = (SELECT latitude FROM users WHERE users.id = pickup_requests.hospital_id),
            hospital_longitude = (SELECT longitude FROM users WHERE users.id = pickup_requests.hospital_id),
            preferred_time_window = COALESCE(preferred_time_window, '09:00 - 13:00'),
            time_window_start_min = COALESCE(time_window_start_min, 60),
            time_window_end_min = COALESCE(time_window_end_min, 300)
    """)
    print("Updated all pickup_requests coordinates and addresses to match Salem hospitals.")

    # 9. Update Collector Locations if any exist
    cursor.execute("SELECT id, collector_id FROM collector_locations")
    loc_rows = cursor.fetchall()
    for l_id, coll_id in loc_rows:
        cursor.execute("SELECT latitude, longitude FROM users WHERE id = ?", (coll_id,))
        u = cursor.fetchone()
        if u:
            cursor.execute("UPDATE collector_locations SET latitude = ?, longitude = ? WHERE id = ?", (u[0], u[1], l_id))

    # 10. Audit validation for all waste records
    cursor.execute("SELECT id, category, waste_type, notes FROM waste_records")
    wastes = cursor.fetchall()
    for w_id, cat, w_type, notes in wastes:
        audit_class, has_warn, warn_reason, _ = validate_waste_sorting(cat, w_type, notes)
        cursor.execute(
            """UPDATE waste_records
               SET audit_classification = ?, has_sorting_warning = ?, warning_reason = ?
               WHERE id = ?""",
            (audit_class, 1 if has_warn else 0, warn_reason, w_id)
        )
    print(f"Classified and validated {len(wastes)} waste records.")

    conn.commit()
    conn.close()
    print(f"Successfully migrated {db_path} to Salem, Tamil Nadu.")

if __name__ == "__main__":
    backend_dir = os.path.abspath(os.path.dirname(__file__))
    project_dir = os.path.abspath(os.path.join(backend_dir, ".."))

    db_paths = [
        os.path.join(project_dir, "medical_waste.db"),
        os.path.join(backend_dir, "medical_waste.db")
    ]

    for p in db_paths:
        migrate_db(p)
