from fastapi import APIRouter, Body
from fastapi.responses import StreamingResponse
from schemas.agent import AgentRequest
from services.agent import stream_device_agent

router = APIRouter()

# Router: The main entry point that receives the HTTP POST request from the frontend React app and opens the SSE stream.
@router.post("")
async def run_device_agent(
    request: AgentRequest = Body(
        ...,
        examples=[
            {"message": "Turn off the AC"},
            {"message": "Turn off the fan in 5 minutes"},
            {"message": "Turn on the fan"},
        ],
    )
):
    return StreamingResponse(
        stream_device_agent(request.message),
        media_type="text/event-stream",
    )
