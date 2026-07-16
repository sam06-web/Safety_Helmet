"""
Monitor/Dashboard routes: real-time dashboard, worker list with sensors, worker detail.
"""
from datetime import datetime, timedelta
from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Worker, WorkerStatus, Helmet, SensorReading, Incident
from app.schemas import (
    DashboardResponse, MonitorWorkerResponse, WorkerDetailResponse,
    WorkerOut, HelmetOut, SensorReadingOut, IncidentOut,
)
from app.auth import get_current_user, User

router = APIRouter(prefix="/api/monitor", tags=["Monitor"])


def _worker_out(w: Worker) -> WorkerOut:
    return WorkerOut(
        id=w.id, employee_id=w.employee_id, name=w.name,
        department=w.department, shift=w.shift.value,
        contact_phone=w.contact_phone, contact_email=w.contact_email,
        photo_url=w.photo_url, status=w.status.value,
        assigned_helmet_id=w.assigned_helmet_id, is_active=w.is_active,
        created_at=w.created_at, updated_at=w.updated_at,
    )


def _incident_out(inc: Incident, db: Session) -> IncidentOut:
    worker = db.query(Worker).filter(Worker.id == inc.worker_id).first()
    helmet = db.query(Helmet).filter(Helmet.id == inc.helmet_id).first()
    return IncidentOut(
        id=inc.id, worker_id=inc.worker_id, helmet_id=inc.helmet_id,
        timestamp=inc.timestamp, incident_type=inc.incident_type.value,
        severity=inc.severity.value, description=inc.description,
        gas_level=inc.gas_level, temperature=inc.temperature,
        location=inc.location, acknowledged=inc.acknowledged,
        acknowledged_by=inc.acknowledged_by,
        acknowledged_at=inc.acknowledged_at,
        resolved=inc.resolved, resolved_at=inc.resolved_at,
        worker_name=worker.name if worker else None,
        helmet_code=helmet.helmet_id if helmet else None,
    )


@router.get("/dashboard", response_model=DashboardResponse)
def get_dashboard(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    active_workers = db.query(Worker).filter(Worker.is_active == True).all()
    workers_online = sum(1 for w in active_workers if w.status != WorkerStatus.offline)
    workers_safe = sum(1 for w in active_workers if w.status == WorkerStatus.safe)
    workers_warning = sum(1 for w in active_workers if w.status == WorkerStatus.warning)
    workers_emergency = sum(1 for w in active_workers if w.status == WorkerStatus.emergency)

    active_alerts = (
        db.query(Incident)
        .filter(Incident.resolved == False)
        .count()
    )

    recent = (
        db.query(Incident)
        .order_by(Incident.timestamp.desc())
        .limit(20)
        .all()
    )

    return DashboardResponse(
        workers_online=workers_online,
        workers_safe=workers_safe,
        workers_warning=workers_warning,
        workers_emergency=workers_emergency,
        active_alerts_count=active_alerts,
        recent_alerts=[_incident_out(inc, db) for inc in recent],
    )


@router.get("/workers", response_model=List[MonitorWorkerResponse])
def get_monitor_workers(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    workers = db.query(Worker).filter(Worker.is_active == True).order_by(Worker.name).all()
    results = []
    for w in workers:
        latest = (
            db.query(SensorReading)
            .filter(SensorReading.worker_id == w.id)
            .order_by(SensorReading.timestamp.desc())
            .first()
        )
        helmet = db.query(Helmet).filter(Helmet.id == w.assigned_helmet_id).first() if w.assigned_helmet_id else None
        results.append(MonitorWorkerResponse(
            worker=_worker_out(w),
            latest_sensor=SensorReadingOut.model_validate(latest) if latest else None,
            helmet=HelmetOut.model_validate(helmet) if helmet else None,
        ))
    return results


@router.get("/worker/{worker_id}", response_model=WorkerDetailResponse)
def get_monitor_worker_detail(
    worker_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    worker = db.query(Worker).filter(Worker.id == worker_id, Worker.is_active == True).first()
    if not worker:
        raise HTTPException(status_code=404, detail="Worker not found")

    one_hour_ago = datetime.utcnow() - timedelta(hours=1)
    sensor_history = (
        db.query(SensorReading)
        .filter(SensorReading.worker_id == worker.id, SensorReading.timestamp >= one_hour_ago)
        .order_by(SensorReading.timestamp.desc())
        .all()
    )

    recent_incidents = (
        db.query(Incident)
        .filter(Incident.worker_id == worker.id)
        .order_by(Incident.timestamp.desc())
        .limit(20)
        .all()
    )

    helmet = db.query(Helmet).filter(Helmet.id == worker.assigned_helmet_id).first() if worker.assigned_helmet_id else None

    return WorkerDetailResponse(
        worker=_worker_out(worker),
        helmet=HelmetOut.model_validate(helmet) if helmet else None,
        sensor_history=[SensorReadingOut.model_validate(s) for s in sensor_history],
        recent_incidents=[_incident_out(inc, db) for inc in recent_incidents],
    )
