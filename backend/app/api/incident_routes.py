"""
Incident routes: list, detail, acknowledge, resolve.
"""
from datetime import datetime
from typing import Optional, List

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Incident, Worker, Helmet
from app.schemas import IncidentOut
from app.auth import get_current_user, User

router = APIRouter(prefix="/api/incidents", tags=["Incidents"])


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


@router.get("", response_model=List[IncidentOut])
def list_incidents(
    incident_type: Optional[str] = Query(None, alias="type"),
    severity: Optional[str] = Query(None),
    date_from: Optional[str] = Query(None),
    date_to: Optional[str] = Query(None),
    acknowledged: Optional[bool] = Query(None),
    resolved: Optional[bool] = Query(None),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    q = db.query(Incident)
    if incident_type:
        q = q.filter(Incident.incident_type == incident_type)
    if severity:
        q = q.filter(Incident.severity == severity)
    if date_from:
        try:
            dt_from = datetime.strptime(date_from, "%Y-%m-%d")
            q = q.filter(Incident.timestamp >= dt_from)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid date_from format. Use YYYY-MM-DD")
    if date_to:
        try:
            dt_to = datetime.strptime(date_to, "%Y-%m-%d").replace(hour=23, minute=59, second=59)
            q = q.filter(Incident.timestamp <= dt_to)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid date_to format. Use YYYY-MM-DD")
    if acknowledged is not None:
        q = q.filter(Incident.acknowledged == acknowledged)
    if resolved is not None:
        q = q.filter(Incident.resolved == resolved)

    incidents = q.order_by(Incident.timestamp.desc()).offset(offset).limit(limit).all()
    return [_incident_out(inc, db) for inc in incidents]


@router.get("/{incident_id}", response_model=IncidentOut)
def get_incident(
    incident_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    inc = db.query(Incident).filter(Incident.id == incident_id).first()
    if not inc:
        raise HTTPException(status_code=404, detail="Incident not found")
    return _incident_out(inc, db)


@router.put("/{incident_id}/acknowledge", response_model=IncidentOut)
def acknowledge_incident(
    incident_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    inc = db.query(Incident).filter(Incident.id == incident_id).first()
    if not inc:
        raise HTTPException(status_code=404, detail="Incident not found")
    if inc.acknowledged:
        raise HTTPException(status_code=400, detail="Incident already acknowledged")

    inc.acknowledged = True
    inc.acknowledged_by = current_user.id
    inc.acknowledged_at = datetime.utcnow()
    db.commit()
    db.refresh(inc)
    return _incident_out(inc, db)


@router.put("/{incident_id}/resolve", response_model=IncidentOut)
def resolve_incident(
    incident_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    inc = db.query(Incident).filter(Incident.id == incident_id).first()
    if not inc:
        raise HTTPException(status_code=404, detail="Incident not found")
    if inc.resolved:
        raise HTTPException(status_code=400, detail="Incident already resolved")

    inc.resolved = True
    inc.resolved_at = datetime.utcnow()
    if not inc.acknowledged:
        inc.acknowledged = True
        inc.acknowledged_by = current_user.id
        inc.acknowledged_at = datetime.utcnow()
    db.commit()
    db.refresh(inc)
    return _incident_out(inc, db)
