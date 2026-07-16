"""
Analytics routes: summary, trends, alert breakdown, gas trends.
"""
from datetime import datetime, timedelta
from typing import List, Optional
from collections import Counter

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.database import get_db
from app.models import Incident, SensorReading, Worker, Helmet, IncidentType, WorkerStatus
from app.schemas import AnalyticsSummary, TrendDataPoint, AlertBreakdown, GasTrendPoint
from app.auth import get_current_user, User

router = APIRouter(prefix="/api/analytics", tags=["Analytics"])


@router.get("/summary", response_model=AnalyticsSummary)
def get_analytics_summary(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    now = datetime.utcnow()
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    week_start = today_start - timedelta(days=7)

    incidents_today = db.query(Incident).filter(Incident.timestamp >= today_start).count()
    incidents_week = db.query(Incident).filter(Incident.timestamp >= week_start).count()

    # PPE compliance: % of latest sensor readings where ppe_status is True
    active_workers = db.query(Worker).filter(
        Worker.is_active == True,
        Worker.assigned_helmet_id.isnot(None),
    ).all()

    ppe_compliant = 0
    total_checked = 0
    battery_sum = 0
    battery_count = 0

    for w in active_workers:
        latest = (
            db.query(SensorReading)
            .filter(SensorReading.worker_id == w.id)
            .order_by(SensorReading.timestamp.desc())
            .first()
        )
        if latest:
            total_checked += 1
            if latest.ppe_status:
                ppe_compliant += 1
            battery_sum += latest.battery_pct
            battery_count += 1

    ppe_pct = (ppe_compliant / total_checked * 100) if total_checked > 0 else 100.0

    # Most common alert type this week
    week_incidents = (
        db.query(Incident.incident_type, func.count(Incident.id).label("cnt"))
        .filter(Incident.timestamp >= week_start)
        .group_by(Incident.incident_type)
        .order_by(func.count(Incident.id).desc())
        .first()
    )
    most_common = week_incidents[0].value if week_incidents else None

    battery_avg = (battery_sum / battery_count) if battery_count > 0 else 100.0

    # Average helmet usage: count of workers with helmets online
    online_count = db.query(Worker).filter(
        Worker.is_active == True,
        Worker.status != WorkerStatus.offline,
    ).count()
    avg_usage = round(online_count * 8.0 / max(len(active_workers), 1), 1)

    return AnalyticsSummary(
        total_incidents_today=incidents_today,
        total_incidents_week=incidents_week,
        ppe_compliance_pct=round(ppe_pct, 1),
        avg_helmet_usage_hours=avg_usage,
        most_common_alert=most_common,
        battery_health_avg=round(battery_avg, 1),
    )


@router.get("/trends", response_model=List[TrendDataPoint])
def get_incident_trends(
    days: int = Query(30, ge=1, le=90),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    now = datetime.utcnow()
    start = now - timedelta(days=days)

    incidents = (
        db.query(Incident)
        .filter(Incident.timestamp >= start)
        .all()
    )

    counts: Counter = Counter()
    for inc in incidents:
        day_str = inc.timestamp.strftime("%Y-%m-%d")
        counts[day_str] += 1

    result = []
    for i in range(days):
        day = (start + timedelta(days=i + 1)).strftime("%Y-%m-%d")
        result.append(TrendDataPoint(date=day, count=counts.get(day, 0)))

    return result


@router.get("/alerts", response_model=List[AlertBreakdown])
def get_alert_breakdown(
    days: int = Query(30, ge=1, le=90),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    start = datetime.utcnow() - timedelta(days=days)

    rows = (
        db.query(Incident.incident_type, func.count(Incident.id).label("cnt"))
        .filter(Incident.timestamp >= start)
        .group_by(Incident.incident_type)
        .all()
    )

    total = sum(r.cnt for r in rows) or 1
    return [
        AlertBreakdown(
            incident_type=r.incident_type.value,
            count=r.cnt,
            percentage=round(r.cnt / total * 100, 1),
        )
        for r in rows
    ]


@router.get("/gas-trends", response_model=List[GasTrendPoint])
def get_gas_trends(
    hours: int = Query(24, ge=1, le=168),
    location: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    start = datetime.utcnow() - timedelta(hours=hours)
    q = db.query(SensorReading).filter(SensorReading.timestamp >= start)
    if location:
        q = q.filter(SensorReading.location.ilike(f"%{location}%"))

    readings = q.order_by(SensorReading.timestamp).all()

    # Aggregate by hour and location
    buckets: dict = {}
    for r in readings:
        hour_key = r.timestamp.strftime("%Y-%m-%d %H:00")
        loc = r.location or "Unknown"
        key = (hour_key, loc)
        if key not in buckets:
            buckets[key] = {"total": 0.0, "count": 0}
        buckets[key]["total"] += r.gas_level
        buckets[key]["count"] += 1

    result = []
    for (ts, loc), data in sorted(buckets.items()):
        result.append(GasTrendPoint(
            timestamp=ts,
            location=loc,
            avg_gas_level=round(data["total"] / data["count"], 2),
        ))
    return result
