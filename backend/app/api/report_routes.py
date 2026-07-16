"""
Report routes: daily PDF, weekly PDF, Excel export.
"""
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from app.database import get_db
from app.auth import get_current_user, User
from app.services.report_service import (
    generate_daily_pdf,
    generate_weekly_pdf,
    generate_excel_export,
)

router = APIRouter(prefix="/api/reports", tags=["Reports"])


@router.get("/daily")
def daily_report(
    date: Optional[str] = Query(None, description="Date in YYYY-MM-DD format"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if date:
        try:
            report_date = datetime.strptime(date, "%Y-%m-%d")
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD")
    else:
        report_date = datetime.utcnow()

    buffer = generate_daily_pdf(db, report_date)
    filename = f"daily_safety_report_{report_date.strftime('%Y-%m-%d')}.pdf"
    return StreamingResponse(
        buffer,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.get("/weekly")
def weekly_report(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    buffer = generate_weekly_pdf(db)
    filename = f"weekly_safety_report_{datetime.utcnow().strftime('%Y-%m-%d')}.pdf"
    return StreamingResponse(
        buffer,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.get("/export")
def export_data(
    type: str = Query("incidents", description="Data type: incidents, workers, sensors"),
    format: str = Query("excel", description="Export format: excel"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if format != "excel":
        raise HTTPException(status_code=400, detail="Only 'excel' format is supported")

    buffer = generate_excel_export(db, data_type=type)
    filename = f"{type}_export_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}.xlsx"
    return StreamingResponse(
        buffer,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
