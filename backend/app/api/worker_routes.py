"""
Worker CRUD routes.
"""
from typing import Optional, List

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Worker, WorkerStatus, ShiftType, SensorReading, Helmet
from app.schemas import WorkerCreate, WorkerUpdate, WorkerOut, WorkerWithSensor, SensorReadingOut, HelmetOut
from app.auth import get_current_user, User

router = APIRouter(prefix="/api/workers", tags=["Workers"])


def _worker_to_out(w: Worker) -> WorkerOut:
    return WorkerOut(
        id=w.id,
        employee_id=w.employee_id,
        name=w.name,
        department=w.department,
        shift=w.shift.value,
        contact_phone=w.contact_phone,
        contact_email=w.contact_email,
        photo_url=w.photo_url,
        status=w.status.value,
        assigned_helmet_id=w.assigned_helmet_id,
        is_active=w.is_active,
        created_at=w.created_at,
        updated_at=w.updated_at,
    )


@router.get("", response_model=List[WorkerWithSensor])
def list_workers(
    search: Optional[str] = Query(None),
    department: Optional[str] = Query(None),
    status_filter: Optional[str] = Query(None, alias="status"),
    shift: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    q = db.query(Worker).filter(Worker.is_active == True)
    if search:
        q = q.filter(Worker.name.ilike(f"%{search}%"))
    if department:
        q = q.filter(Worker.department == department)
    if status_filter:
        q = q.filter(Worker.status == status_filter)
    if shift:
        q = q.filter(Worker.shift == shift)
    workers = q.order_by(Worker.name).all()

    results = []
    for w in workers:
        latest = (
            db.query(SensorReading)
            .filter(SensorReading.worker_id == w.id)
            .order_by(SensorReading.timestamp.desc())
            .first()
        )
        helmet = db.query(Helmet).filter(Helmet.id == w.assigned_helmet_id).first() if w.assigned_helmet_id else None
        results.append(
            WorkerWithSensor(
                **_worker_to_out(w).model_dump(),
                latest_sensor=SensorReadingOut.model_validate(latest) if latest else None,
                helmet=HelmetOut.model_validate(helmet) if helmet else None,
            )
        )
    return results


@router.post("", response_model=WorkerOut, status_code=status.HTTP_201_CREATED)
def create_worker(
    body: WorkerCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if db.query(Worker).filter(Worker.employee_id == body.employee_id).first():
        raise HTTPException(status_code=400, detail="Employee ID already exists")
    try:
        shift_enum = ShiftType(body.shift)
    except ValueError:
        raise HTTPException(status_code=400, detail=f"Invalid shift: {body.shift}")

    worker = Worker(
        employee_id=body.employee_id,
        name=body.name,
        department=body.department,
        shift=shift_enum,
        contact_phone=body.contact_phone,
        contact_email=body.contact_email,
        photo_url=body.photo_url,
    )
    db.add(worker)
    db.commit()
    db.refresh(worker)
    return _worker_to_out(worker)


@router.get("/{worker_id}", response_model=WorkerWithSensor)
def get_worker(
    worker_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    worker = db.query(Worker).filter(Worker.id == worker_id, Worker.is_active == True).first()
    if not worker:
        raise HTTPException(status_code=404, detail="Worker not found")
    latest = (
        db.query(SensorReading)
        .filter(SensorReading.worker_id == worker.id)
        .order_by(SensorReading.timestamp.desc())
        .first()
    )
    helmet = db.query(Helmet).filter(Helmet.id == worker.assigned_helmet_id).first() if worker.assigned_helmet_id else None
    return WorkerWithSensor(
        **_worker_to_out(worker).model_dump(),
        latest_sensor=SensorReadingOut.model_validate(latest) if latest else None,
        helmet=HelmetOut.model_validate(helmet) if helmet else None,
    )


@router.put("/{worker_id}", response_model=WorkerOut)
def update_worker(
    worker_id: int,
    body: WorkerUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    worker = db.query(Worker).filter(Worker.id == worker_id).first()
    if not worker:
        raise HTTPException(status_code=404, detail="Worker not found")

    update_data = body.model_dump(exclude_unset=True)
    if "shift" in update_data:
        try:
            update_data["shift"] = ShiftType(update_data["shift"])
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid shift value")
    if "status" in update_data:
        try:
            update_data["status"] = WorkerStatus(update_data["status"])
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid status value")

    for key, value in update_data.items():
        setattr(worker, key, value)
    db.commit()
    db.refresh(worker)
    return _worker_to_out(worker)


@router.delete("/{worker_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_worker(
    worker_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    worker = db.query(Worker).filter(Worker.id == worker_id).first()
    if not worker:
        raise HTTPException(status_code=404, detail="Worker not found")
    worker.is_active = False
    worker.status = WorkerStatus.offline
    db.commit()
    return None
