#!/usr/bin/env python
from __future__ import annotations

import csv
import json
import random
import uuid
from datetime import date, datetime, timedelta
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
OUT_DIR = ROOT / "data" / "pdf_seed_demo"


# Roads and corridors explicitly mentioned in the uploaded JICA/MPWT PDF extract.
REAL_ROADS = [
    "Monivong Boulevard",
    "Norodom Boulevard",
    "Preah Sihanouk Boulevard",
    "Mao Tse Toung Boulevard",
    "Russian Boulevard",
    "Charles de Gaulle Boulevard",
    "Sisowath Quay Boulevard",
    "Sothearos Boulevard",
    "Monireth Boulevard",
    "Chaom Chao Road",
    "Hanoi Road",
    "Kob Srov Road",
    "Turnpum Dike Road",
    "Cheung Aek Bypass",
    "Russei Kaev Bypass",
    "Road 271 (C1)",
    "C1 Ring Road",
    "C2 Ring Road",
    "C3 Ring Road",
    "National Road 1 (NR1)",
    "National Road 2 (NR2)",
    "National Road 3 (NR3)",
    "National Road 4 (NR4)",
    "National Road 5 (NR5)",
    "National Road 6 (NR6)",
    "National Road 7 (NR7)",
    "National Road 20 (NR20)",
    "National Road 21 (NR21)",
    "National Road 51 (NR51)",
    "National Road 61 (NR61)",
    "Street 51",
    "Street 114",
    "Street 155",
    "Street 163",
    "Street 178",
    "Street 199",
    "Street 214",
    "Street 217",
    "Street 221",
    "Street 240",
    "Street 245",
    "Street 271",
    "Street 278",
    "Street 310",
    "Street 315",
    "Street 360",
    "Street 598",
    "Street 608",
    "Monivong Bridge Approach",
    "Chroy Changvar Bridge Approach",
]

# 50 realistic intersection / junction location labels based on names present in PDF text.
REAL_INTERSECTIONS = [
    "Monivong / Russian",
    "Russian / Monivong",
    "Monivong / Charles de Gaulle",
    "Sihanouk / Monivong",
    "Monireth / Charles de Gaulle",
    "Monivong / Sihanouk",
    "Norodom / Mao Tse Toung",
    "Mao Tse Toung / Monivong",
    "Russian / Toul Kok",
    "Street 221 / Russian Boulevard",
    "Monivong / Street 214",
    "Norodom / Street 240",
    "Sihanouk / Street 163",
    "Street 51 / Street 240",
    "Street 271 / Monivong",
    "Street 178 / Norodom",
    "Street 240 / Russian Boulevard",
    "Monireth / Mao Tse Toung",
    "Monivong / Kbal Thanol Flyover",
    "Pet Lok Sang Junction",
    "Chaom Chao Road / NR4",
    "Chaom Chao Road / Hanoi Road",
    "Kob Srov Road / NR6",
    "Kob Srov Road / NR4",
    "Cheung Aek Bypass / NR2",
    "Russei Kaev Bypass / NR5",
    "C2 / NR1",
    "C3 / NR6",
    "C3 / NR4",
    "NR1 / Phnom Penh East Gate",
    "NR2 / Kbal Thanol South",
    "NR3 / Southwest Radial",
    "NR4 / West Industrial Gate",
    "NR5 / Northwest Radial",
    "NR6 / North Radial",
    "NR20 / Eastern Connector",
    "NR21 / Southern Connector",
    "Hanoi Road / C3",
    "Monivong Bridge / C1",
    "Japanese Bridge / NR6 Side",
    "Chroy Changvar Bridge / River Bank Road",
    "Sisowath Quay / Riverside Access",
    "Sothearos / Riverside Connector",
    "Turnpum Dike Road / C1",
    "Street 360 / City Block",
    "Street 608 / City Block",
    "Street 178 / Tourism Corridor",
    "Street 240 / Tourism Corridor",
    "Russian Boulevard / C1 Edge",
    "Monivong / C1 Edge",
]

KHANS = [
    "Daun Penh",
    "Chamkar Mon",
    "Prampir Makara",
    "Dangkao",
    "Mean Chey",
    "Russey Keo",
    "Sen Sok",
    "Por Sen Chey",
    "Chbar Ampov",
    "Chroy Changvar",
]


def mk_uuid() -> str:
    return str(uuid.uuid4())


def make_roads() -> list[dict]:
    roads = []
    for i, name in enumerate(REAL_ROADS, start=1):
        if "NR" in name:
            road_type = "highway"
            speed = 70
        elif "Street" in name:
            road_type = "urban"
            speed = 40
        else:
            road_type = "urban"
            speed = 50
        roads.append(
            {
                "id": mk_uuid(),
                "name": name,
                "road_code": f"PP-RD-{i:03d}",
                "road_type": road_type,
                "length_km": round(random.uniform(0.8, 8.5), 2),
                "speed_limit": speed,
                "lanes": random.choice([2, 2, 4]),
                "direction": random.choice(["two-way", "one-way"]),
                "description": "From JICA/MPWT PPUTMP PDF location reference",
                "city": "Phnom Penh",
                "region": "Phnom Penh",
                "province": "Phnom Penh",
                "district": random.choice(KHANS),
                "commune": "",
                "village": "",
                "country": "Cambodia",
                "status": "active",
                "is_deleted": False,
                "created_at": "2026-07-27T00:00:00Z",
                "updated_at": "2026-07-27T00:00:00Z",
            }
        )
    return roads


def make_intersections(roads: list[dict]) -> list[dict]:
    road_lookup = {r["name"]: r["id"] for r in roads}
    out = []
    for i, name in enumerate(REAL_INTERSECTIONS, start=1):
        # Map each intersection to an anchor road using first matched road name.
        anchor = next((rn for rn in road_lookup if rn.split(" (")[0] in name), REAL_ROADS[(i - 1) % len(REAL_ROADS)])
        out.append(
            {
                "id": f"INT-{i:03d}",
                "name": name,
                "anchor_road_id": road_lookup[anchor],
                "khan": random.choice(KHANS),
                "city": "Phnom Penh",
                "source": "JICA/MPWT PPUTMP PDF",
            }
        )
    return out


def make_signals(intersections: list[dict], roads: list[dict]) -> list[dict]:
    out = []
    for i in range(30):
        inter = intersections[i]
        out.append(
            {
                "id": mk_uuid(),
                "road_id": inter["anchor_road_id"],
                "signal_code": f"SIG-PP-{i+1:03d}",
                "cycle_duration": random.choice([90, 100, 110, 120, 130]),
                "timing_sequence": {"green": 40, "amber": 5, "red": 55},
                "status": "active",
                "created_at": "2026-07-27T00:00:00Z",
            }
        )
    return out


def make_cameras(intersections: list[dict], roads: list[dict]) -> list[dict]:
    out = []
    for i in range(30):
        inter = intersections[i]
        out.append(
            {
                "id": mk_uuid(),
                "road_id": inter["anchor_road_id"],
                "name": f"{inter['name']} Camera",
                "code": f"CAM{i+1:03d}",
                "model": "Hikvision iDS-TCD402",
                "camera_type": random.choice(["fixed", "ptz", "speed"]),
                "status": "active",
                "frame_source_url": f"rtsp://demo.local/cam{i+1:03d}",
                "province": "Phnom Penh",
                "district": inter["khan"],
                "street": inter["name"],
                "created_at": "2026-07-27T00:00:00Z",
                "updated_at": "2026-07-27T00:00:00Z",
            }
        )
    return out


def make_users_and_drivers() -> tuple[list[dict], list[dict]]:
    users = []
    drivers = []
    # 50 driver-linked users (required by Django FK)
    for i in range(50):
        uid = mk_uuid()
        users.append(
            {
                "id": uid,
                "email": f"driver{i+1:03d}@camtraffic.demo",
                "password": "pbkdf2_sha256$260000$demo$not-a-real-hash",
                "full_name": f"Driver Demo {i+1:03d}",
                "role": "driver",
                "phone": f"012{100000+i}",
                "address": f"{random.choice(REAL_INTERSECTIONS)}, Phnom Penh",
                "license_no": f"PP-{7000+i}",
                "auth_provider": "email",
                "email_verified": True,
                "is_active": True,
                "is_staff": False,
                "is_superuser": False,
                "date_joined": "2026-07-27T00:00:00Z",
                "created_at": "2026-07-27T00:00:00Z",
                "updated_at": "2026-07-27T00:00:00Z",
            }
        )
        drivers.append(
            {
                "id": mk_uuid(),
                "user_id": uid,
                "license_no": f"PP-{7000+i}",
                "national_id": f"010{90000000+i}",
                "license_expiry": "2029-12-31",
                "date_of_birth": f"{1980 + (i % 20)}-01-15",
                "kyc_status": random.choice(["approved", "approved", "pending"]),
                "status": "active",
                "demerit_points": random.randint(0, 6),
                "created_at": "2026-07-27T00:00:00Z",
                "updated_at": "2026-07-27T00:00:00Z",
            }
        )
    # +20 portal users requested (admin/police mix)
    for i in range(20):
        uid = mk_uuid()
        role = "police" if i < 15 else "admin"
        users.append(
            {
                "id": uid,
                "email": f"{role}{i+1:03d}@camtraffic.demo",
                "password": "pbkdf2_sha256$260000$demo$not-a-real-hash",
                "full_name": f"{role.title()} Demo {i+1:03d}",
                "role": role,
                "phone": f"010{200000+i}",
                "address": "Phnom Penh",
                "license_no": "",
                "auth_provider": "email",
                "email_verified": True,
                "is_active": True,
                "is_staff": role == "admin",
                "is_superuser": False,
                "date_joined": "2026-07-27T00:00:00Z",
                "created_at": "2026-07-27T00:00:00Z",
                "updated_at": "2026-07-27T00:00:00Z",
            }
        )
    return users, drivers


def make_vehicles(drivers: list[dict], users: list[dict]) -> list[dict]:
    out = []
    vehicle_types = ["car", "motorcycle", "truck", "bus", "tuk-tuk"]
    for i in range(70):
        d = drivers[i % len(drivers)]
        out.append(
            {
                "id": mk_uuid(),
                "driver_id": d["id"],
                "owner_id": d["user_id"],
                "plate_number": f"PP-{3000+i}",
                "vehicle_type": random.choice(vehicle_types),
                "make": random.choice(["Toyota", "Honda", "Hyundai", "Suzuki", "Yamaha"]),
                "model": random.choice(["Prius", "Camry", "Wave", "Tucson", "Vios"]),
                "color": random.choice(["White", "Black", "Silver", "Blue", "Red"]),
                "year": random.choice([2018, 2019, 2020, 2021, 2022, 2023, 2024]),
                "status": "active",
                "created_at": "2026-07-27T00:00:00Z",
            }
        )
    return out


def make_detections(users: list[dict], vehicles: list[dict], signs: list[dict]) -> list[dict]:
    out = []
    now = datetime(2026, 7, 27, 12, 0, 0)
    for i in range(100):
        user = users[i % len(users)]
        veh = vehicles[i % len(vehicles)]
        sign = signs[i % len(signs)]
        created = now - timedelta(minutes=i * 17)
        out.append(
            {
                "id": mk_uuid(),
                "user_id": user["id"],
                "uploaded_image": f"ai/uploads/demo_{i+1:03d}.jpg",
                "detected_sign": sign["sign_name_en"],
                "confidence": round(random.uniform(78, 98), 2),
                "description": f"Detected {sign['sign_name_en']} in Phnom Penh corridor",
                "guidance": "Follow Cambodian traffic sign rules.",
                "processing_time": round(random.uniform(0.8, 2.3), 2),
                "review_status": random.choice(["pending", "approved", "approved"]),
                "model_version": "best.pt",
                "detected_vehicles": "[]",
                "vehicle_count": random.randint(1, 4),
                "detected_plate": veh["plate_number"],
                "plate_confidence": round(random.uniform(70, 95), 2),
                "plate_type": "private",
                "plate_ocr_details": "[]",
                "matched_vehicle_id": veh["id"],
                "created_at": created.isoformat() + "Z",
            }
        )
    return out


def make_violations(drivers: list[dict], vehicles: list[dict], detections: list[dict], cameras: list[dict], roads: list[dict]) -> list[dict]:
    out = []
    v_types = ["NO_ENTRY", "ILLEGAL_LEFT_TURN", "ILLEGAL_RIGHT_TURN", "ILLEGAL_U_TURN", "NO_PARKING", "NO_STOPPING"]
    actions = ["left_turn", "right_turn", "u_turn", "parking", "stopping", "entry"]
    for i in range(80):
        d = drivers[i % len(drivers)]
        v = vehicles[i % len(vehicles)]
        det = detections[i % len(detections)]
        cam = cameras[i % len(cameras)]
        rd = roads[i % len(roads)]
        out.append(
            {
                "id": mk_uuid(),
                "driver_id": d["id"],
                "vehicle_id": v["id"],
                "officer_id": None,
                "camera_id": cam["id"],
                "road_id": rd["id"],
                "ai_detection_log_id": det["id"],
                "violation_type": random.choice(v_types),
                "observed_action": random.choice(actions),
                "detected_sign_code": "",
                "detected_class_key": "",
                "violation_date": det["created_at"],
                "location": f"{cam['street']}, Phnom Penh",
                "description": "Synthetic private enforcement record based on real location context.",
                "officer_note": "",
                "dismissal_reason": "",
                "ai_confidence_score": round(random.uniform(78, 97), 2),
                "plate_detected": v["plate_number"],
                "status": random.choice(["confirmed", "pending_review", "draft"]),
                "bbox_coords": "{}",
                "created_at": det["created_at"],
                "updated_at": det["created_at"],
            }
        )
    return out


def make_fines(violations: list[dict], users: list[dict]) -> list[dict]:
    out = []
    for i in range(50):
        vio = violations[i]
        driver_user_id = next((u["id"] for u in users if u["id"] == vio["driver_id"]), None)
        # users table stores user ids, while violation stores driver ids.
        # map driver id -> user id via index pattern
        driver_user_id = users[i % 50]["id"]
        status = random.choice(["pending", "paid", "awaiting_verification", "overdue"])
        out.append(
            {
                "id": mk_uuid(),
                "violation_id": vio["id"],
                "driver_id": driver_user_id,
                "police_id": users[50 + (i % 15)]["id"],
                "amount": random.choice([20000, 30000, 40000, 50000]),
                "reason": "Traffic violation fine (synthetic private record).",
                "status": status,
                "location": vio["location"],
                "vehicle_plate": vio["plate_detected"],
                "due_date": "2026-08-30",
                "payment_method": "khqr" if status == "paid" else "",
                "payment_reference": f"PAY-PP-{i+1:04d}" if status == "paid" else "",
                "paid_at": "2026-07-27T12:00:00Z" if status == "paid" else None,
                "created_at": "2026-07-27T00:00:00Z",
                "updated_at": "2026-07-27T00:00:00Z",
            }
        )
    return out


def make_appeals(violations: list[dict], fines: list[dict], drivers: list[dict], users: list[dict]) -> list[dict]:
    out = []
    for i in range(20):
        vio = violations[i]
        fine = fines[i % len(fines)]
        out.append(
            {
                "id": mk_uuid(),
                "violation_id": vio["id"],
                "fine_id": fine["id"],
                "driver_id": drivers[i]["id"],
                "reason": "Synthetic appeal text for demo. Driver disputes context and asks review.",
                "status": random.choice(["pending", "upheld", "dismissed"]),
                "submitted_at": "2026-07-27T00:00:00Z",
                "review_date": "2026-07-28T00:00:00Z",
                "reviewed_by_id": users[50 + (i % 15)]["id"],
                "officer_comments": "",
                "updated_at": "2026-07-28T00:00:00Z",
            }
        )
    return out


def make_payments(fines: list[dict]) -> list[dict]:
    """
    Synthetic payment records for demo/export only.
    Note: current Django schema stores payment fields directly on `fines`
    (there is no standalone `payments` model/table).
    """
    out = []
    channels = ["khqr", "bank_transfer", "cash_counter", "mobile_banking"]
    for i, fine in enumerate(fines, start=1):
        paid = fine.get("status") == "paid"
        out.append(
            {
                "id": mk_uuid(),
                "fine_id": fine["id"],
                "payment_reference": fine.get("payment_reference") or f"PAY-PP-{i:04d}",
                "payment_method": fine.get("payment_method") or random.choice(channels),
                "amount": fine["amount"],
                "payment_status": "completed" if paid else random.choice(["pending", "verification"]),
                "paid_at": fine.get("paid_at") if paid else None,
                "created_at": "2026-07-27T00:00:00Z",
                "updated_at": "2026-07-27T00:00:00Z",
            }
        )
    return out


def load_signs() -> list[dict]:
    payload = json.loads((ROOT / "ai" / "sign_catalog.json").read_text(encoding="utf-8"))
    signs = payload.get("signs", payload) if isinstance(payload, dict) else payload
    out = []
    for s in signs[:31]:
        out.append(
            {
                "sign_code": s.get("sign_code", ""),
                "sign_name": s.get("sign_name") or s.get("sign_name_km", ""),
                "sign_name_km": s.get("sign_name_km", ""),
                "sign_name_en": s.get("sign_name_en", ""),
                "description": s.get("description_km", ""),
                "description_en": s.get("description_en", ""),
                "guidance": s.get("guidance_km", ""),
                "guidance_en": s.get("guidance_en", ""),
                "category": "prohibitory",
                "penalty": "",
                "rules": "[]",
            }
        )
    return out


def write_csv(path: Path, rows: list[dict]) -> None:
    if not rows:
        return
    with path.open("w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=list(rows[0].keys()))
        w.writeheader()
        w.writerows(rows)


def sql_val(v):
    if v is None:
        return "NULL"
    if isinstance(v, bool):
        return "TRUE" if v else "FALSE"
    if isinstance(v, (int, float)):
        return str(v)
    s = str(v).replace("'", "''")
    return f"'{s}'"


def write_insert_sql(path: Path, table: str, rows: list[dict]) -> None:
    if not rows:
        return
    cols = list(rows[0].keys())
    lines = [f"-- {table}: {len(rows)} rows", f"INSERT INTO {table} ({', '.join(cols)}) VALUES"]
    values = []
    for r in rows:
        values.append("(" + ", ".join(sql_val(r[c]) for c in cols) + ")")
    lines.append(",\n".join(values) + ";")
    path.write_text("\n".join(lines), encoding="utf-8")


def main() -> None:
    random.seed(20260727)
    OUT_DIR.mkdir(parents=True, exist_ok=True)

    roads = make_roads()
    intersections = make_intersections(roads)
    signals = make_signals(intersections, roads)
    cameras = make_cameras(intersections, roads)
    users, drivers = make_users_and_drivers()
    vehicles = make_vehicles(drivers, users)
    signs = load_signs()
    detections = make_detections(users, vehicles, signs)
    violations = make_violations(drivers, vehicles, detections, cameras, roads)
    fines = make_fines(violations, users)
    payments = make_payments(fines)
    appeals = make_appeals(violations, fines, drivers, users)

    datasets = {
        "roads": roads,
        "intersections": intersections,
        "traffic_signs_31": signs,
        "traffic_signals": signals,
        "cameras": cameras,
        "users": users,
        "drivers": drivers,
        "vehicles": vehicles,
        "ai_detection_logs": detections,
        "traffic_violations": violations,
        "fines": fines,
        "payments": payments,
        "violation_appeals": appeals,
        # Helpful subset matching user-facing request (20 users).
        "users_portal_20": [u for u in users if u["role"] in ("admin", "police")][:20],
    }

    (OUT_DIR / "seed_bundle.json").write_text(json.dumps(datasets, ensure_ascii=False, indent=2), encoding="utf-8")

    for name, rows in datasets.items():
        write_csv(OUT_DIR / f"{name}.csv", rows)

    write_insert_sql(OUT_DIR / "roads.sql", "roads", roads)
    write_insert_sql(OUT_DIR / "traffic_signals.sql", "traffic_signals", signals)
    write_insert_sql(OUT_DIR / "cameras.sql", "cameras", cameras)
    write_insert_sql(OUT_DIR / "traffic_signs.sql", "traffic_signs", signs)
    write_insert_sql(OUT_DIR / "users.sql", "users", users)
    write_insert_sql(OUT_DIR / "drivers.sql", "drivers", drivers)
    write_insert_sql(OUT_DIR / "vehicles.sql", "vehicles", vehicles)
    write_insert_sql(OUT_DIR / "ai_detection_logs.sql", "ai_detection_logs", detections)
    write_insert_sql(OUT_DIR / "traffic_violations.sql", "traffic_violations", violations)
    write_insert_sql(OUT_DIR / "fines.sql", "fines", fines)
    write_insert_sql(OUT_DIR / "violation_appeals.sql", "violation_appeals", appeals)
    # `payments` is export-only (no Django payments table in current schema).
    write_insert_sql(OUT_DIR / "payments.sql", "demo_payments", payments)

    (OUT_DIR / "README.txt").write_text(
        "\n".join(
            [
                "PDF-based demo seed generated.",
                "Source PDF: JICA + MPWT Phnom Penh Urban Transport Plan (12245858_01.pdf).",
                "Real location entities are taken from road/corridor/intersection names found in the extracted PDF text.",
                "Private entities (drivers/vehicles/violations/payments/appeals/users) are synthetic but FK-consistent.",
                "Important schema note: Django requires Driver -> User (1:1), so users include 50 driver users + 20 portal users (70 total).",
                "payments.* files are export/demo artifacts; payment fields in live schema are stored in fines table.",
            ]
        ),
        encoding="utf-8",
    )

    print("Generated demo seed files in:", OUT_DIR)
    print("roads:", len(roads))
    print("intersections:", len(intersections))
    print("traffic signs:", len(signs))
    print("traffic signals:", len(signals))
    print("cameras:", len(cameras))
    print("drivers:", len(drivers))
    print("vehicles:", len(vehicles))
    print("detections:", len(detections))
    print("violations:", len(violations))
    print("fines(payments):", len(fines))
    print("payments export:", len(payments))
    print("appeals:", len(appeals))
    print("users total:", len(users))


if __name__ == "__main__":
    main()
