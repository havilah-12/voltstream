from fastapi import APIRouter
from services.billing_service import get_billing_summary as get_billing_summary_data

router = APIRouter()

@router.get("/summary")
def get_billing_summary():
    return get_billing_summary_data()
