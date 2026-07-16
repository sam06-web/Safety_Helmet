"""
FastAPI application entry point.
Registers all routers, CORS, WebSocket, and starts the simulator on startup.
"""
import asyncio
import logging

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.database import create_tables
from app.api.auth_routes import router as auth_router
from app.api.worker_routes import router as worker_router
from app.api.helmet_routes import router as helmet_router
from app.api.monitor_routes import router as monitor_router
from app.api.incident_routes import router as incident_router
from app.api.analytics_routes import router as analytics_router
from app.api.report_routes import router as report_router
from app.websocket.manager import manager
from app.services.simulator import run_simulator

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s │ %(levelname)-8s │ %(name)s │ %(message)s",
    datefmt="%H:%M:%S",
)
logger = logging.getLogger(__name__)

# ── App ──────────────────────────────────────────────────────────────────────

app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="Backend API for monitoring industrial safety helmets in real-time.",
)

# ── CORS ─────────────────────────────────────────────────────────────────────

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Routers ──────────────────────────────────────────────────────────────────

app.include_router(auth_router)
app.include_router(worker_router)
app.include_router(helmet_router)
app.include_router(monitor_router)
app.include_router(incident_router)
app.include_router(analytics_router)
app.include_router(report_router)


# ── WebSocket ────────────────────────────────────────────────────────────────

@app.websocket("/ws/monitor")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            # Keep connection alive; we can receive pings or commands
            data = await websocket.receive_text()
            # Echo pong for keepalive
            if data == "ping":
                await websocket.send_text("pong")
    except WebSocketDisconnect:
        manager.disconnect(websocket)
    except Exception:
        manager.disconnect(websocket)


# ── Startup / Shutdown ───────────────────────────────────────────────────────

@app.on_event("startup")
async def on_startup():
    logger.info("Creating database tables…")
    create_tables()
    logger.info("Tables ready.")

    logger.info("Starting sensor simulator…")
    asyncio.create_task(run_simulator())
    logger.info("Simulator task launched.")


@app.get("/", tags=["Health"])
def root():
    return {
        "app": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "status": "running",
    }


@app.get("/health", tags=["Health"])
def health():
    return {"status": "ok"}
