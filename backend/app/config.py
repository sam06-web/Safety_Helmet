"""
Application configuration and settings.
"""
from pydantic import BaseModel


class AlertThresholds(BaseModel):
    """Alert threshold configuration."""
    gas_warning_ppm: float = 100.0
    gas_danger_ppm: float = 200.0
    temperature_warning_c: float = 40.0
    temperature_danger_c: float = 50.0
    battery_warning_pct: int = 20
    battery_critical_pct: int = 10
    signal_warning_pct: int = 30
    signal_critical_pct: int = 10


class Settings(BaseModel):
    """Application settings."""
    APP_NAME: str = "Safety Helmet Monitoring System"
    APP_VERSION: str = "1.0.0"
    DATABASE_URL: str = "mysql+pymysql://root:Test12345@127.0.0.1:3306/safety_helmet"
    SECRET_KEY: str = "a3f8c9e1b2d4567890abcdef12345678deadbeefcafebabe"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 480
    CORS_ORIGINS: list = ["http://localhost:5173", "http://localhost:3000", "http://127.0.0.1:5173"]
    SENSOR_BROADCAST_INTERVAL_SECONDS: float = 3.0
    ALERT_THRESHOLDS: AlertThresholds = AlertThresholds()


settings = Settings()
thresholds = settings.ALERT_THRESHOLDS
