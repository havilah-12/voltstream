from fastapi import APIRouter
from services.dashboard_service import get_live_dashboard as get_live_dashboard_data

router = APIRouter()

@router.get("/live")
async def get_live_dashboard():
    return await get_live_dashboard_data()
