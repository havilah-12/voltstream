import logging

from fastapi import APIRouter
from mock_data import mock_db

logger = logging.getLogger("voltstream")
router = APIRouter()

@router.get("/live")
def get_live_dashboard():
    logger.info("Dashboard live data requested")
    return mock_db["dashboard_live"]
