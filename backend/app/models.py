"""
SQLAlchemy ORM models for all database tables.
"""
import enum
from datetime import datetime

from sqlalchemy import (
    Column, Integer, String, Float, Boolean, DateTime, Enum, ForeignKey, Text
)
from sqlalchemy.orm import relationship

from app.database import Base


# ── Enums ────────────────────────────────────────────────────────────────────

class UserRole(str, enum.Enum):
    admin = "admin"
    supervisor = "supervisor"
    safety_officer = "safety_officer"


class WorkerStatus(str, enum.Enum):
    safe = "safe"
    warning = "warning"
    emergency = "emergency"
    offline = "offline"


class HelmetStatus(str, enum.Enum):
    active = "active"
    inactive = "inactive"
    maintenance = "maintenance"


class IncidentType(str, enum.Enum):
    high_gas = "high_gas"
    helmet_removed = "helmet_removed"
    emergency_button = "emergency_button"
    high_temperature = "high_temperature"
    low_battery = "low_battery"
    buckle_open = "buckle_open"
    signal_lost = "signal_lost"


class Severity(str, enum.Enum):
    low = "low"
    medium = "medium"
    high = "high"
    critical = "critical"


class ShiftType(str, enum.Enum):
    day = "day"
    night = "night"
    general = "general"


# ── Models ───────────────────────────────────────────────────────────────────

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, nullable=False, index=True)
    email = Column(String(120), unique=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    role = Column(Enum(UserRole), default=UserRole.supervisor, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    acknowledged_incidents = relationship(
        "Incident", back_populates="acknowledger", foreign_keys="Incident.acknowledged_by"
    )


class Worker(Base):
    __tablename__ = "workers"

    id = Column(Integer, primary_key=True, index=True)
    employee_id = Column(String(20), unique=True, nullable=False, index=True)
    name = Column(String(100), nullable=False)
    department = Column(String(60), nullable=False)
    shift = Column(Enum(ShiftType), default=ShiftType.general, nullable=False)
    contact_phone = Column(String(20), nullable=True)
    contact_email = Column(String(120), nullable=True)
    photo_url = Column(String(255), nullable=True)
    status = Column(Enum(WorkerStatus), default=WorkerStatus.offline, nullable=False)
    assigned_helmet_id = Column(Integer, ForeignKey("helmets.id"), nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    helmet = relationship("Helmet", back_populates="worker", foreign_keys=[assigned_helmet_id])
    sensor_readings = relationship("SensorReading", back_populates="worker")
    incidents = relationship("Incident", back_populates="worker")


class Helmet(Base):
    __tablename__ = "helmets"

    id = Column(Integer, primary_key=True, index=True)
    helmet_id = Column(String(20), unique=True, nullable=False, index=True)
    battery_pct = Column(Integer, default=100, nullable=False)
    last_service_date = Column(DateTime, nullable=True)
    firmware_version = Column(String(20), default="1.0.0", nullable=False)
    status = Column(Enum(HelmetStatus), default=HelmetStatus.inactive, nullable=False)
    current_worker_id = Column(Integer, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    worker = relationship("Worker", back_populates="helmet", foreign_keys=[Worker.assigned_helmet_id])
    sensor_readings = relationship("SensorReading", back_populates="helmet")
    incidents = relationship("Incident", back_populates="helmet")


class SensorReading(Base):
    __tablename__ = "sensor_readings"

    id = Column(Integer, primary_key=True, index=True)
    helmet_id = Column(Integer, ForeignKey("helmets.id"), nullable=False)
    worker_id = Column(Integer, ForeignKey("workers.id"), nullable=False)
    timestamp = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)
    temperature = Column(Float, default=25.0, nullable=False)
    gas_level = Column(Float, default=0.0, nullable=False)
    ppe_status = Column(Boolean, default=True, nullable=False)
    buckle_status = Column(Boolean, default=True, nullable=False)
    emergency_button = Column(Boolean, default=False, nullable=False)
    battery_pct = Column(Integer, default=100, nullable=False)
    signal_strength = Column(Integer, default=100, nullable=False)
    location = Column(String(100), nullable=True)

    helmet = relationship("Helmet", back_populates="sensor_readings")
    worker = relationship("Worker", back_populates="sensor_readings")


class Incident(Base):
    __tablename__ = "incidents"

    id = Column(Integer, primary_key=True, index=True)
    worker_id = Column(Integer, ForeignKey("workers.id"), nullable=False)
    helmet_id = Column(Integer, ForeignKey("helmets.id"), nullable=False)
    timestamp = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)
    incident_type = Column(Enum(IncidentType), nullable=False)
    severity = Column(Enum(Severity), nullable=False)
    description = Column(Text, nullable=False)
    gas_level = Column(Float, nullable=True)
    temperature = Column(Float, nullable=True)
    location = Column(String(100), nullable=True)
    acknowledged = Column(Boolean, default=False, nullable=False)
    acknowledged_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    acknowledged_at = Column(DateTime, nullable=True)
    resolved = Column(Boolean, default=False, nullable=False)
    resolved_at = Column(DateTime, nullable=True)

    worker = relationship("Worker", back_populates="incidents")
    helmet = relationship("Helmet", back_populates="incidents")
    acknowledger = relationship("User", back_populates="acknowledged_incidents", foreign_keys=[acknowledged_by])
