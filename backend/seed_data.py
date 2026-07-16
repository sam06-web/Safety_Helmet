"""
Seed data script — populates the database with demo workers, helmets,
user accounts, and sample historical incidents.

Idempotent: safe to run multiple times.
"""
import random
from datetime import datetime, timedelta

from app.database import SessionLocal, create_tables
from app.models import (
    User, UserRole, Worker, ShiftType, WorkerStatus,
    Helmet, HelmetStatus, Incident, IncidentType, Severity, SensorReading,
)
from app.auth import get_password_hash


# ── Demo Workers ─────────────────────────────────────────────────────────────

WORKERS = [
    {"employee_id": "EMP-001", "name": "Ravi Kumar",        "department": "Assembly Line",    "shift": "day",     "phone": "+91-9876543001", "email": "ravi.kumar@factory.in"},
    {"employee_id": "EMP-002", "name": "Arjun Sharma",      "department": "Welding Shop",     "shift": "day",     "phone": "+91-9876543002", "email": "arjun.sharma@factory.in"},
    {"employee_id": "EMP-003", "name": "Suresh Patel",      "department": "Boiler Room",      "shift": "night",   "phone": "+91-9876543003", "email": "suresh.patel@factory.in"},
    {"employee_id": "EMP-004", "name": "Karthik Reddy",     "department": "Chemical Storage", "shift": "day",     "phone": "+91-9876543004", "email": "karthik.reddy@factory.in"},
    {"employee_id": "EMP-005", "name": "Naveen Singh",      "department": "Warehouse",        "shift": "general", "phone": "+91-9876543005", "email": "naveen.singh@factory.in"},
    {"employee_id": "EMP-006", "name": "Rahul Verma",       "department": "Maintenance",      "shift": "day",     "phone": "+91-9876543006", "email": "rahul.verma@factory.in"},
    {"employee_id": "EMP-007", "name": "Priya Nair",        "department": "Assembly Line",    "shift": "day",     "phone": "+91-9876543007", "email": "priya.nair@factory.in"},
    {"employee_id": "EMP-008", "name": "Deepa Iyer",        "department": "Chemical Storage", "shift": "night",   "phone": "+91-9876543008", "email": "deepa.iyer@factory.in"},
    {"employee_id": "EMP-009", "name": "Vijay Krishnan",    "department": "Welding Shop",     "shift": "night",   "phone": "+91-9876543009", "email": "vijay.krishnan@factory.in"},
    {"employee_id": "EMP-010", "name": "Anil Gupta",        "department": "Boiler Room",      "shift": "day",     "phone": "+91-9876543010", "email": "anil.gupta@factory.in"},
    {"employee_id": "EMP-011", "name": "Manoj Tiwari",      "department": "Assembly Line",    "shift": "general", "phone": "+91-9876543011", "email": "manoj.tiwari@factory.in"},
    {"employee_id": "EMP-012", "name": "Sanjay Mishra",     "department": "Warehouse",        "shift": "day",     "phone": "+91-9876543012", "email": "sanjay.mishra@factory.in"},
    {"employee_id": "EMP-013", "name": "Pooja Desai",       "department": "Maintenance",      "shift": "night",   "phone": "+91-9876543013", "email": "pooja.desai@factory.in"},
    {"employee_id": "EMP-014", "name": "Ramesh Yadav",      "department": "Welding Shop",     "shift": "general", "phone": "+91-9876543014", "email": "ramesh.yadav@factory.in"},
    {"employee_id": "EMP-015", "name": "Ganesh Joshi",      "department": "Chemical Storage", "shift": "day",     "phone": "+91-9876543015", "email": "ganesh.joshi@factory.in"},
    {"employee_id": "EMP-016", "name": "Lakshmi Rao",       "department": "Boiler Room",      "shift": "night",   "phone": "+91-9876543016", "email": "lakshmi.rao@factory.in"},
    {"employee_id": "EMP-017", "name": "Harish Menon",      "department": "Assembly Line",    "shift": "day",     "phone": "+91-9876543017", "email": "harish.menon@factory.in"},
    {"employee_id": "EMP-018", "name": "Sunita Chauhan",    "department": "Warehouse",        "shift": "general", "phone": "+91-9876543018", "email": "sunita.chauhan@factory.in"},
    {"employee_id": "EMP-019", "name": "Rajesh Pillai",     "department": "Maintenance",      "shift": "day",     "phone": "+91-9876543019", "email": "rajesh.pillai@factory.in"},
    {"employee_id": "EMP-020", "name": "Amit Saxena",       "department": "Welding Shop",     "shift": "night",   "phone": "+91-9876543020", "email": "amit.saxena@factory.in"},
]

FIRMWARE_VERSIONS = ["1.0.0", "1.1.0", "1.2.0", "1.2.1", "2.0.0"]

LOCATIONS = [
    "Zone A - Assembly Line",
    "Zone B - Welding Shop",
    "Zone C - Boiler Room",
    "Zone D - Chemical Storage",
    "Zone E - Warehouse",
    "Zone F - Maintenance Bay",
]

INCIDENT_TEMPLATES = [
    (IncidentType.high_gas,          Severity.high,     "Gas level exceeded warning threshold"),
    (IncidentType.high_gas,          Severity.critical, "Gas level exceeded critical threshold"),
    (IncidentType.helmet_removed,    Severity.high,     "Worker removed safety helmet"),
    (IncidentType.emergency_button,  Severity.critical, "Emergency button pressed"),
    (IncidentType.high_temperature,  Severity.medium,   "Temperature exceeded warning threshold"),
    (IncidentType.high_temperature,  Severity.critical, "Temperature exceeded critical threshold"),
    (IncidentType.low_battery,       Severity.low,      "Helmet battery running low"),
    (IncidentType.buckle_open,       Severity.medium,   "Helmet buckle is not secured"),
    (IncidentType.signal_lost,       Severity.medium,   "Signal strength dropped below threshold"),
]


def seed():
    """Populate the database with demo data."""
    create_tables()
    db = SessionLocal()

    try:
        # ── Admin user ───────────────────────────────────────────────────
        if not db.query(User).filter(User.username == "admin").first():
            admin = User(
                username="admin",
                email="admin@safetyhelmet.in",
                hashed_password=get_password_hash("admin123"),
                role=UserRole.admin,
                is_active=True,
            )
            db.add(admin)
            print("✓ Admin user created (admin / admin123)")
        else:
            print("· Admin user already exists")

        # ── Supervisor user ──────────────────────────────────────────────
        if not db.query(User).filter(User.username == "supervisor").first():
            sup = User(
                username="supervisor",
                email="supervisor@safetyhelmet.in",
                hashed_password=get_password_hash("super123"),
                role=UserRole.supervisor,
                is_active=True,
            )
            db.add(sup)
            print("✓ Supervisor user created (supervisor / super123)")
        else:
            print("· Supervisor user already exists")

        # ── Safety Officer ───────────────────────────────────────────────
        if not db.query(User).filter(User.username == "safety_officer").first():
            so = User(
                username="safety_officer",
                email="safety@safetyhelmet.in",
                hashed_password=get_password_hash("safety123"),
                role=UserRole.safety_officer,
                is_active=True,
            )
            db.add(so)
            print("✓ Safety officer user created (safety_officer / safety123)")
        else:
            print("· Safety officer user already exists")

        db.commit()

        # ── Helmets ──────────────────────────────────────────────────────
        helmets_created = 0
        for i in range(1, 21):
            hid = f"HLM-{i:03d}"
            if not db.query(Helmet).filter(Helmet.helmet_id == hid).first():
                h = Helmet(
                    helmet_id=hid,
                    battery_pct=random.randint(40, 100),
                    firmware_version=random.choice(FIRMWARE_VERSIONS),
                    status=HelmetStatus.inactive,
                    last_service_date=datetime.utcnow() - timedelta(days=random.randint(5, 90)),
                )
                db.add(h)
                helmets_created += 1
        db.commit()
        print(f"✓ Helmets: {helmets_created} created (20 total)")

        # ── Workers ──────────────────────────────────────────────────────
        workers_created = 0
        for wd in WORKERS:
            if not db.query(Worker).filter(Worker.employee_id == wd["employee_id"]).first():
                w = Worker(
                    employee_id=wd["employee_id"],
                    name=wd["name"],
                    department=wd["department"],
                    shift=ShiftType(wd["shift"]),
                    contact_phone=wd["phone"],
                    contact_email=wd["email"],
                    status=WorkerStatus.offline,
                )
                db.add(w)
                workers_created += 1
        db.commit()
        print(f"✓ Workers: {workers_created} created (20 total)")

        # ── Assign helmets to workers ────────────────────────────────────
        all_workers = db.query(Worker).filter(Worker.is_active == True).order_by(Worker.id).all()
        all_helmets = db.query(Helmet).order_by(Helmet.id).all()
        assigned = 0
        for i, worker in enumerate(all_workers):
            if i < len(all_helmets) and not worker.assigned_helmet_id:
                helmet = all_helmets[i]
                worker.assigned_helmet_id = helmet.id
                worker.status = WorkerStatus.safe
                helmet.current_worker_id = worker.id
                helmet.status = HelmetStatus.active
                assigned += 1
        db.commit()
        print(f"✓ Assigned {assigned} helmets to workers")

        # ── Sample historical incidents (last 7 days) ────────────────────
        existing_incidents = db.query(Incident).count()
        if existing_incidents < 10:
            now = datetime.utcnow()
            incidents_added = 0
            for day_offset in range(7):
                num_incidents = random.randint(3, 8)
                for _ in range(num_incidents):
                    worker = random.choice(all_workers)
                    if not worker.assigned_helmet_id:
                        continue
                    template = random.choice(INCIDENT_TEMPLATES)
                    ts = now - timedelta(
                        days=day_offset,
                        hours=random.randint(0, 23),
                        minutes=random.randint(0, 59),
                    )
                    loc_idx = WORKERS.index(
                        next(w for w in WORKERS if w["employee_id"] == worker.employee_id)
                    ) % len(LOCATIONS)
                    inc = Incident(
                        worker_id=worker.id,
                        helmet_id=worker.assigned_helmet_id,
                        timestamp=ts,
                        incident_type=template[0],
                        severity=template[1],
                        description=template[2],
                        gas_level=round(random.uniform(80, 280), 1) if "gas" in template[0].value else None,
                        temperature=round(random.uniform(35, 55), 1) if "temp" in template[0].value else None,
                        location=LOCATIONS[loc_idx],
                        acknowledged=random.random() > 0.3,
                        resolved=random.random() > 0.5,
                    )
                    if inc.resolved:
                        inc.resolved_at = ts + timedelta(minutes=random.randint(5, 120))
                        inc.acknowledged = True
                    if inc.acknowledged:
                        admin_user = db.query(User).filter(User.role == UserRole.admin).first()
                        inc.acknowledged_by = admin_user.id if admin_user else None
                        inc.acknowledged_at = ts + timedelta(minutes=random.randint(1, 30))
                    db.add(inc)
                    incidents_added += 1
            db.commit()
            print(f"✓ Created {incidents_added} sample incidents")
        else:
            print(f"· {existing_incidents} incidents already exist, skipping")

        print("\n✅ Seed data complete!")

    finally:
        db.close()


if __name__ == "__main__":
    seed()
