from fastapi import APIRouter, HTTPException
from services.session_service import get_all_sessions, get_session

router = APIRouter()

@router.get("")
async def fetch_all_sessions(mode: str = "chat"):
    return await get_all_sessions(mode)

@router.get("/{session_id}")
async def fetch_session(session_id: str):
    session = await get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    return session
