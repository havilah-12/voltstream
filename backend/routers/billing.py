from fastapi import APIRouter
from services.billing_service import get_billing_summary as get_billing_summary_data

router = APIRouter()

@router.get("/summary")
async def get_billing_summary():
    return await get_billing_summary_data()
