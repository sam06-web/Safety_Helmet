"""
Sensor data simulator: generates realistic helmet data for demo purposes.
Runs as an asyncio background task.
"""
import asyncio
import logging
import random
from datetime import datetime

from app.database import SessionLocal
from app.models import Worker, Helmet, SensorReading, WorkerStatus
from app.services.alert_engine import check_thresholds_and_create_incidents, build_alert_message
from app.websocket.manager import manager

logger = logging.getLogger(__name__)

LOCATIONS = [
    "Zone A - Assembly Line",
    "Zone B - Welding Shop",
    "Zone C - Boiler Room",
    "Zone D - Chemical Storage",
    "Zone E - Warehouse",
    "Zone F - Maintenance Bay",
    "Zone G - Loading Dock",
    "Zone H - Control Room",
]

# Track per-worker state for realistic simulation
_worker_state: dict = {}


def _init_worker_state(worker_id: int, department: str):
    """Initialise simulated state for a worker."""
    location_map = {
        "Assembly Line": "Zone A - Assembly Line",
        "Welding Shop": "Zone B - Welding Shop",
        "Boiler Room": "Zone C - Boiler Room",
        "Chemical Storage": "Zone D - Chemical Storage",
        "Warehouse": "Zone E - Warehouse",
        "Maintenance": "Zone F - Maintenance Bay",
    }
    _worker_state[worker_id] = {
        "temperature": round(random.uniform(28, 35), 1),
        "gas_level": round(random.uniform(5, 40), 1),
        "ppe_status": True,
        "buckle_status": True,
        "emergency_button": False,
        "battery_pct": random.randint(60, 100),
        "signal_strength": random.randint(70, 100),
        "location": location_map.get(department, random.choice(LOCATIONS)),
    }


def _generate_reading(worker_id: int) -> dict:
    """Generate the next sensor reading with realistic fluctuations."""
    s = _worker_state[worker_id]

    # Normal fluctuation
    s["temperature"] = max(20.0, min(60.0, s["temperature"] + random.uniform(-0.5, 0.5)))
    s["gas_level"] = max(0.0, min(350.0, s["gas_level"] + random.uniform(-3, 3)))
    s["signal_strength"] = max(0, min(100, s["signal_strength"] + random.randint(-2, 2)))

    # Battery slowly drains
    if random.random() < 0.05:
        s["battery_pct"] = max(0, s["battery_pct"] - 1)

    # Reset transient events
    s["ppe_status"] = True
    s["buckle_status"] = True
    s["emergency_button"] = False

    return dict(s)


def _trigger_gas_spike(worker_id: int):
    s = _worker_state[worker_id]
    severity = random.choice(["warning", "danger"])
    if severity == "warning":
        s["gas_level"] = round(random.uniform(110, 180), 1)
    else:
        s["gas_level"] = round(random.uniform(210, 320), 1)


def _trigger_temperature_spike(worker_id: int):
    s = _worker_state[worker_id]
    severity = random.choice(["warning", "danger"])
    if severity == "warning":
        s["temperature"] = round(random.uniform(41, 48), 1)
    else:
        s["temperature"] = round(random.uniform(51, 58), 1)


def _trigger_helmet_removal(worker_id: int):
    _worker_state[worker_id]["ppe_status"] = False


def _trigger_emergency_button(worker_id: int):
    _worker_state[worker_id]["emergency_button"] = True


def _trigger_buckle_open(worker_id: int):
    _worker_state[worker_id]["buckle_status"] = False


async def run_simulator():
    """
    Main simulator loop. Runs forever, broadcasting sensor data every ~3 seconds.
    """
    logger.info("Sensor simulator starting...")
    await asyncio.sleep(3)  # Wait for app startup

    cycle = 0
    while True:
        try:
            db = SessionLocal()
            try:
                workers = (
                    db.query(Worker)
                    .filter(Worker.is_active == True, Worker.assigned_helmet_id.isnot(None))
                    .all()
                )

                if not workers:
                    await asyncio.sleep(5)
                    continue

                # Initialise state for new workers
                for w in workers:
                    if w.id not in _worker_state:
                        _init_worker_state(w.id, w.department)

                # Random events
                cycle += 1
                if cycle % 20 == 0 and workers:  # ~every 60s
                    target = random.choice(workers)
                    _trigger_gas_spike(target.id)
                    logger.info(f"SIM: Gas spike triggered for {target.name}")

                if cycle % 30 == 0 and workers:  # ~every 90s
                    target = random.choice(workers)
                    _trigger_helmet_removal(target.id)
                    logger.info(f"SIM: Helmet removal triggered for {target.name}")

                if cycle % 40 == 0 and workers:  # ~every 120s
                    target = random.choice(workers)
                    _trigger_emergency_button(target.id)
                    logger.info(f"SIM: Emergency button triggered for {target.name}")

                if cycle % 27 == 0 and workers:  # ~every 80s
                    target = random.choice(workers)
                    _trigger_temperature_spike(target.id)
                    logger.info(f"SIM: Temperature spike triggered for {target.name}")

                if cycle % 15 == 0 and workers:  # ~every 45s
                    target = random.choice(workers)
                    _trigger_buckle_open(target.id)
                    logger.info(f"SIM: Buckle open triggered for {target.name}")

                # Generate and broadcast readings for every active worker
                for worker in workers:
                    data = _generate_reading(worker.id)

                    reading = SensorReading(
                        helmet_id=worker.assigned_helmet_id,
                        worker_id=worker.id,
                        timestamp=datetime.utcnow(),
                        temperature=data["temperature"],
                        gas_level=data["gas_level"],
                        ppe_status=data["ppe_status"],
                        buckle_status=data["buckle_status"],
                        emergency_button=data["emergency_button"],
                        battery_pct=data["battery_pct"],
                        signal_strength=data["signal_strength"],
                        location=data["location"],
                    )
                    db.add(reading)
                    db.commit()
                    db.refresh(reading)

                    # Update helmet battery
                    helmet = db.query(Helmet).filter(Helmet.id == worker.assigned_helmet_id).first()
                    if helmet:
                        helmet.battery_pct = data["battery_pct"]
                        db.commit()

                    # Check thresholds and create incidents
                    incidents = check_thresholds_and_create_incidents(db, reading, worker)

                    # Determine status
                    status_val = worker.status.value if worker.status else "safe"

                    # Broadcast sensor update
                    sensor_msg = {
                        "type": "sensor_update",
                        "data": {
                            "worker_id": worker.id,
                            "worker_name": worker.name,
                            "employee_id": worker.employee_id,
                            "department": worker.department,
                            "temperature": round(data["temperature"], 1),
                            "gas_level": round(data["gas_level"], 1),
                            "ppe_status": data["ppe_status"],
                            "buckle_status": data["buckle_status"],
                            "emergency_button": data["emergency_button"],
                            "battery_pct": data["battery_pct"],
                            "signal_strength": data["signal_strength"],
                            "status": status_val,
                            "location": data["location"],
                            "timestamp": datetime.utcnow().isoformat(),
                        },
                    }
                    await manager.broadcast(sensor_msg)

                    # Broadcast alerts
                    for incident in incidents:
                        alert_msg = build_alert_message(incident, worker)
                        await manager.broadcast(alert_msg)

                    # If status changed, broadcast status_change
                    if incidents:
                        status_msg = {
                            "type": "status_change",
                            "data": {
                                "worker_id": worker.id,
                                "worker_name": worker.name,
                                "new_status": status_val,
                                "timestamp": datetime.utcnow().isoformat(),
                            },
                        }
                        await manager.broadcast(status_msg)

            finally:
                db.close()

        except Exception as e:
            logger.error(f"Simulator error: {e}", exc_info=True)

        await asyncio.sleep(3)
