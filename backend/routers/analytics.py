from fastapi import APIRouter, Query
from typing import Optional
from services.analytics_service import get_history

router = APIRouter()

@router.get("/history")
def get_analytics_history(period: Optional[str] = Query("daily", description="daily, weekly, or monthly")):
    return get_history(period)
