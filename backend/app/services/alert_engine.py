"""
Alert engine: checks sensor readings against thresholds and creates incidents.
"""
import logging
from datetime import datetime
from typing import Optional, Dict

from sqlalchemy.orm import Session

from app.config import thresholds
from app.models import (
    Incident, IncidentType, Severity, Worker, WorkerStatus, SensorReading
)

logger = logging.getLogger(__name__)


RECOMMENDED_ACTIONS = {
    IncidentType.high_gas: "Evacuate the area immediately and ventilate",
    IncidentType.high_temperature: "Move worker to cooler area, provide hydration",
    IncidentType.helmet_removed: "Instruct worker to wear helmet immediately",
    IncidentType.emergency_button: "Dispatch emergency response team immediately",
    IncidentType.low_battery: "Replace or recharge helmet battery",
    IncidentType.buckle_open: "Instruct worker to secure helmet buckle",
    IncidentType.signal_lost: "Check helmet connectivity, locate worker",
}


def check_thresholds_and_create_incidents(
    db: Session,
    reading: SensorReading,
    worker: Worker,
) -> list:
    """
    Evaluate a sensor reading against thresholds.
    Returns a list of newly created Incident objects (may be empty).
    """
    created_incidents = []
    worst_status = WorkerStatus.safe

    # ── Gas level ────────────────────────────────────────────────────────
    if reading.gas_level >= thresholds.gas_danger_ppm:
        inc = _create_incident(
            db, worker, reading,
            IncidentType.high_gas, Severity.critical,
            f"Gas level {reading.gas_level:.0f} ppm exceeded critical threshold ({thresholds.gas_danger_ppm} ppm)",
        )
        created_incidents.append(inc)
        worst_status = WorkerStatus.emergency
    elif reading.gas_level >= thresholds.gas_warning_ppm:
        inc = _create_incident(
            db, worker, reading,
            IncidentType.high_gas, Severity.high,
            f"Gas level {reading.gas_level:.0f} ppm exceeded warning threshold ({thresholds.gas_warning_ppm} ppm)",
        )
        created_incidents.append(inc)
        if worst_status != WorkerStatus.emergency:
            worst_status = WorkerStatus.warning

    # ── Temperature ──────────────────────────────────────────────────────
    if reading.temperature >= thresholds.temperature_danger_c:
        inc = _create_incident(
            db, worker, reading,
            IncidentType.high_temperature, Severity.critical,
            f"Temperature {reading.temperature:.1f}°C exceeded critical threshold ({thresholds.temperature_danger_c}°C)",
        )
        created_incidents.append(inc)
        worst_status = WorkerStatus.emergency
    elif reading.temperature >= thresholds.temperature_warning_c:
        inc = _create_incident(
            db, worker, reading,
            IncidentType.high_temperature, Severity.medium,
            f"Temperature {reading.temperature:.1f}°C exceeded warning threshold ({thresholds.temperature_warning_c}°C)",
        )
        created_incidents.append(inc)
        if worst_status != WorkerStatus.emergency:
            worst_status = WorkerStatus.warning

    # ── Helmet removed (PPE status False) ────────────────────────────────
    if not reading.ppe_status:
        inc = _create_incident(
            db, worker, reading,
            IncidentType.helmet_removed, Severity.high,
            f"Worker {worker.name} removed safety helmet",
        )
        created_incidents.append(inc)
        if worst_status != WorkerStatus.emergency:
            worst_status = WorkerStatus.warning

    # ── Buckle open ──────────────────────────────────────────────────────
    if not reading.buckle_status:
        inc = _create_incident(
            db, worker, reading,
            IncidentType.buckle_open, Severity.medium,
            f"Helmet buckle is open for worker {worker.name}",
        )
        created_incidents.append(inc)
        if worst_status == WorkerStatus.safe:
            worst_status = WorkerStatus.warning

    # ── Emergency button ─────────────────────────────────────────────────
    if reading.emergency_button:
        inc = _create_incident(
            db, worker, reading,
            IncidentType.emergency_button, Severity.critical,
            f"Emergency button pressed by worker {worker.name}",
        )
        created_incidents.append(inc)
        worst_status = WorkerStatus.emergency

    # ── Low battery ──────────────────────────────────────────────────────
    if reading.battery_pct <= thresholds.battery_critical_pct:
        inc = _create_incident(
            db, worker, reading,
            IncidentType.low_battery, Severity.high,
            f"Helmet battery critically low at {reading.battery_pct}%",
        )
        created_incidents.append(inc)
        if worst_status == WorkerStatus.safe:
            worst_status = WorkerStatus.warning
    elif reading.battery_pct <= thresholds.battery_warning_pct:
        inc = _create_incident(
            db, worker, reading,
            IncidentType.low_battery, Severity.low,
            f"Helmet battery low at {reading.battery_pct}%",
        )
        created_incidents.append(inc)

    # ── Signal lost ──────────────────────────────────────────────────────
    if reading.signal_strength <= thresholds.signal_critical_pct:
        inc = _create_incident(
            db, worker, reading,
            IncidentType.signal_lost, Severity.high,
            f"Signal strength critically low at {reading.signal_strength}%",
        )
        created_incidents.append(inc)
        if worst_status == WorkerStatus.safe:
            worst_status = WorkerStatus.warning
    elif reading.signal_strength <= thresholds.signal_warning_pct:
        inc = _create_incident(
            db, worker, reading,
            IncidentType.signal_lost, Severity.medium,
            f"Signal strength low at {reading.signal_strength}%",
        )
        created_incidents.append(inc)

    # Update worker status
    worker.status = worst_status
    db.commit()

    return created_incidents


def _create_incident(
    db: Session,
    worker: Worker,
    reading: SensorReading,
    incident_type: IncidentType,
    severity: Severity,
    description: str,
) -> Incident:
    incident = Incident(
        worker_id=worker.id,
        helmet_id=reading.helmet_id,
        timestamp=datetime.utcnow(),
        incident_type=incident_type,
        severity=severity,
        description=description,
        gas_level=reading.gas_level,
        temperature=reading.temperature,
        location=reading.location,
    )
    db.add(incident)
    db.commit()
    db.refresh(incident)
    logger.info(
        f"INCIDENT [{severity.value.upper()}] {incident_type.value}: "
        f"Worker={worker.name}, Location={reading.location}"
    )
    return incident


def build_alert_message(incident: Incident, worker: Worker) -> dict:
    """Build the WebSocket alert message for a new incident."""
    return {
        "type": "alert",
        "data": {
            "incident_id": incident.id,
            "worker_id": worker.id,
            "worker_name": worker.name,
            "incident_type": incident.incident_type.value,
            "severity": incident.severity.value,
            "description": incident.description,
            "gas_level": incident.gas_level,
            "temperature": incident.temperature,
            "location": incident.location,
            "recommended_action": RECOMMENDED_ACTIONS.get(incident.incident_type, "Investigate immediately"),
            "timestamp": incident.timestamp.isoformat(),
        },
    }
