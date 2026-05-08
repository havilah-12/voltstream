import logging

from fastapi import APIRouter, Query
from typing import Optional
from mock_data import mock_db

logger = logging.getLogger("voltstream")
router = APIRouter()

@router.get("/history")
def get_analytics_history(period: Optional[str] = Query("daily", description="daily, weekly, or monthly")):
    logger.info(f"Analytics history requested for period={period}")
    if period in mock_db["analytics_history"]:
        return mock_db["analytics_history"][period]
    return []
