from fastapi import APIRouter
from services.dashboard_service import get_live_dashboard as get_live_dashboard_data

router = APIRouter()

@router.get("/live")
def get_live_dashboard():
    return get_live_dashboard_data()
