from fastapi import APIRouter, Body
from fastapi.responses import StreamingResponse
from schemas.agent import AgentRequest
from agents.orchestrator_agent import stream_orchestrator_agent

router = APIRouter()

@router.post("")
async def run_orchestrator_agent(
    request: AgentRequest = Body(
        ...,
        # examples populate the Swagger UI (/docs) for testing the different routing paths:
        examples=[
            {"message": "Show my last week electricity usage."}, # Tests routing to the Analyst Agent
            {"message": "How can I reduce my energy bill?"}, # Tests routing to the Advisor Agent
            {"message": "Give me energy-saving advice based on last week's usage."}, # Tests the  route requiring both agents
        ],
    )
):
    return StreamingResponse(
        stream_orchestrator_agent(request.message, request.session_id),
        media_type="text/event-stream",
    )
