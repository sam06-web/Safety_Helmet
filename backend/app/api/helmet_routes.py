"""
Helmet CRUD + assign/unassign routes.
"""
from typing import Optional, List

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Helmet, HelmetStatus, Worker, WorkerStatus
from app.schemas import HelmetCreate, HelmetUpdate, HelmetOut, HelmetAssign
from app.auth import get_current_user, User

router = APIRouter(prefix="/api/helmets", tags=["Helmets"])


def _helmet_to_out(h: Helmet) -> HelmetOut:
    return HelmetOut(
        id=h.id,
        helmet_id=h.helmet_id,
        battery_pct=h.battery_pct,
        last_service_date=h.last_service_date,
        firmware_version=h.firmware_version,
        status=h.status.value,
        current_worker_id=h.current_worker_id,
        created_at=h.created_at,
        updated_at=h.updated_at,
    )


@router.get("", response_model=List[HelmetOut])
def list_helmets(
    status_filter: Optional[str] = Query(None, alias="status"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    q = db.query(Helmet)
    if status_filter:
        q = q.filter(Helmet.status == status_filter)
    helmets = q.order_by(Helmet.helmet_id).all()
    return [_helmet_to_out(h) for h in helmets]


@router.post("", response_model=HelmetOut, status_code=status.HTTP_201_CREATED)
def create_helmet(
    body: HelmetCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if db.query(Helmet).filter(Helmet.helmet_id == body.helmet_id).first():
        raise HTTPException(status_code=400, detail="Helmet ID already exists")
    try:
        status_enum = HelmetStatus(body.status)
    except ValueError:
        raise HTTPException(status_code=400, detail=f"Invalid status: {body.status}")

    helmet = Helmet(
        helmet_id=body.helmet_id,
        battery_pct=body.battery_pct,
        firmware_version=body.firmware_version,
        status=status_enum,
    )
    db.add(helmet)
    db.commit()
    db.refresh(helmet)
    return _helmet_to_out(helmet)


@router.get("/{helmet_id}", response_model=HelmetOut)
def get_helmet(
    helmet_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    helmet = db.query(Helmet).filter(Helmet.id == helmet_id).first()
    if not helmet:
        raise HTTPException(status_code=404, detail="Helmet not found")
    return _helmet_to_out(helmet)


@router.put("/{helmet_id}", response_model=HelmetOut)
def update_helmet(
    helmet_id: int,
    body: HelmetUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    helmet = db.query(Helmet).filter(Helmet.id == helmet_id).first()
    if not helmet:
        raise HTTPException(status_code=404, detail="Helmet not found")

    update_data = body.model_dump(exclude_unset=True)
    if "status" in update_data:
        try:
            update_data["status"] = HelmetStatus(update_data["status"])
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid status value")

    for key, value in update_data.items():
        setattr(helmet, key, value)
    db.commit()
    db.refresh(helmet)
    return _helmet_to_out(helmet)


@router.put("/{helmet_id}/assign", response_model=HelmetOut)
def assign_helmet(
    helmet_id: int,
    body: HelmetAssign,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    helmet = db.query(Helmet).filter(Helmet.id == helmet_id).first()
    if not helmet:
        raise HTTPException(status_code=404, detail="Helmet not found")

    worker = db.query(Worker).filter(Worker.id == body.worker_id, Worker.is_active == True).first()
    if not worker:
        raise HTTPException(status_code=404, detail="Worker not found")

    if worker.assigned_helmet_id and worker.assigned_helmet_id != helmet.id:
        raise HTTPException(status_code=400, detail="Worker already has a helmet assigned")

    helmet.current_worker_id = worker.id
    helmet.status = HelmetStatus.active
    worker.assigned_helmet_id = helmet.id
    worker.status = WorkerStatus.safe
    db.commit()
    db.refresh(helmet)
    return _helmet_to_out(helmet)


@router.put("/{helmet_id}/unassign", response_model=HelmetOut)
def unassign_helmet(
    helmet_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    helmet = db.query(Helmet).filter(Helmet.id == helmet_id).first()
    if not helmet:
        raise HTTPException(status_code=404, detail="Helmet not found")

    if helmet.current_worker_id:
        worker = db.query(Worker).filter(Worker.id == helmet.current_worker_id).first()
        if worker:
            worker.assigned_helmet_id = None
            worker.status = WorkerStatus.offline

    helmet.current_worker_id = None
    helmet.status = HelmetStatus.inactive
    db.commit()
    db.refresh(helmet)
    return _helmet_to_out(helmet)
