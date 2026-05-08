from fastapi import APIRouter
from mock_data import mock_db

router = APIRouter()

@router.get("/summary")
def get_billing_summary():
    return mock_db["billing"]
