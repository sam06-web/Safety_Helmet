"""
Pydantic request/response schemas for all endpoints.
"""
from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, Field


# ── Auth ─────────────────────────────────────────────────────────────────────

class LoginRequest(BaseModel):
    username: str
    password: str


class RegisterRequest(BaseModel):
    username: str
    email: str
    password: str
    role: str = "supervisor"


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: "UserOut"


class UserOut(BaseModel):
    id: int
    username: str
    email: str
    role: str
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True


# ── Worker ───────────────────────────────────────────────────────────────────

class WorkerCreate(BaseModel):
    employee_id: str
    name: str
    department: str
    shift: str = "general"
    contact_phone: Optional[str] = None
    contact_email: Optional[str] = None
    photo_url: Optional[str] = None


class WorkerUpdate(BaseModel):
    name: Optional[str] = None
    department: Optional[str] = None
    shift: Optional[str] = None
    contact_phone: Optional[str] = None
    contact_email: Optional[str] = None
    photo_url: Optional[str] = None
    status: Optional[str] = None


class WorkerOut(BaseModel):
    id: int
    employee_id: str
    name: str
    department: str
    shift: str
    contact_phone: Optional[str] = None
    contact_email: Optional[str] = None
    photo_url: Optional[str] = None
    status: str
    assigned_helmet_id: Optional[int] = None
    is_active: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class WorkerWithSensor(WorkerOut):
    latest_sensor: Optional["SensorReadingOut"] = None
    helmet: Optional["HelmetOut"] = None


# ── Helmet ───────────────────────────────────────────────────────────────────

class HelmetCreate(BaseModel):
    helmet_id: str
    battery_pct: int = 100
    firmware_version: str = "1.0.0"
    status: str = "inactive"


class HelmetUpdate(BaseModel):
    battery_pct: Optional[int] = None
    firmware_version: Optional[str] = None
    status: Optional[str] = None


class HelmetOut(BaseModel):
    id: int
    helmet_id: str
    battery_pct: int
    last_service_date: Optional[datetime] = None
    firmware_version: str
    status: str
    current_worker_id: Optional[int] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class HelmetAssign(BaseModel):
    worker_id: int


# ── SensorReading ────────────────────────────────────────────────────────────

class SensorReadingOut(BaseModel):
    id: int
    helmet_id: int
    worker_id: int
    timestamp: datetime
    temperature: float
    gas_level: float
    ppe_status: bool
    buckle_status: bool
    emergency_button: bool
    battery_pct: int
    signal_strength: int
    location: Optional[str] = None

    class Config:
        from_attributes = True


# ── Incident ─────────────────────────────────────────────────────────────────

class IncidentOut(BaseModel):
    id: int
    worker_id: int
    helmet_id: int
    timestamp: datetime
    incident_type: str
    severity: str
    description: str
    gas_level: Optional[float] = None
    temperature: Optional[float] = None
    location: Optional[str] = None
    acknowledged: bool
    acknowledged_by: Optional[int] = None
    acknowledged_at: Optional[datetime] = None
    resolved: bool
    resolved_at: Optional[datetime] = None
    worker_name: Optional[str] = None
    helmet_code: Optional[str] = None

    class Config:
        from_attributes = True


# ── Dashboard / Monitor ─────────────────────────────────────────────────────

class DashboardResponse(BaseModel):
    workers_online: int
    workers_safe: int
    workers_warning: int
    workers_emergency: int
    active_alerts_count: int
    recent_alerts: List[IncidentOut]


class MonitorWorkerResponse(BaseModel):
    worker: WorkerOut
    latest_sensor: Optional[SensorReadingOut] = None
    helmet: Optional[HelmetOut] = None


class WorkerDetailResponse(BaseModel):
    worker: WorkerOut
    helmet: Optional[HelmetOut] = None
    sensor_history: List[SensorReadingOut]
    recent_incidents: List[IncidentOut]


# ── Analytics ────────────────────────────────────────────────────────────────

class AnalyticsSummary(BaseModel):
    total_incidents_today: int
    total_incidents_week: int
    ppe_compliance_pct: float
    avg_helmet_usage_hours: float
    most_common_alert: Optional[str] = None
    battery_health_avg: float


class TrendDataPoint(BaseModel):
    date: str
    count: int


class AlertBreakdown(BaseModel):
    incident_type: str
    count: int
    percentage: float


class GasTrendPoint(BaseModel):
    timestamp: str
    location: str
    avg_gas_level: float


# ── Reports ──────────────────────────────────────────────────────────────────

class ReportMeta(BaseModel):
    filename: str
    generated_at: datetime
    report_type: str


# Rebuild forward refs
TokenResponse.model_rebuild()
WorkerWithSensor.model_rebuild()
