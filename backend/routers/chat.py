from fastapi import APIRouter, Body

from schemas.chat import ChatRequest, ChatResponse
from services.chat_service import answer_chat
from services.rag_service import answer_qa
from services.session_service import save_message

router = APIRouter()

CHAT_RESPONSE_EXAMPLE = {
    "answer": (
        "Solar panels generate electricity from sunlight, so your home can use that energy first instead of "
        "buying the same amount from the grid. That lowers the amount you pay to the utility company, and any "
        "extra solar power may also earn credits depending on your setup."
    ),
    "sources": [],
    "used_gemini": True,
}

QA_RESPONSE_EXAMPLE = {
    "answer": (
        "The Dashboard is your main overview in VoltStream. It shows live grid and solar power, highlights key "
        "usage metrics, and helps you quickly understand how your home is using energy right now."
    ),
    "sources": [
        "Dashboard page: The Dashboard page shows live grid power, live solar power, energy balance, bill savings, eco impact, usage by source, and top energy consumers."
    ],
    "used_gemini": True,
}

@router.post(
    "/chat",
    response_model=ChatResponse,
    responses={200: {"content": {"application/json": {"example": CHAT_RESPONSE_EXAMPLE}}}},
)
async def chat(
    request: ChatRequest = Body(
        ...,
        examples=[{"question": "How does solar reduce my bill?"}],
    )
):
    if request.session_id:
        await save_message(request.session_id, request.mode, "user", request.question)
        
    response = answer_chat(request)
    
    if request.session_id:
        await save_message(request.session_id, request.mode, "assistant", response.answer, response.sources)
        
    return response


@router.post(
    "/qa",
    response_model=ChatResponse,
    responses={200: {"content": {"application/json": {"example": QA_RESPONSE_EXAMPLE}}}},
)
async def qa(
    request: ChatRequest = Body(
        ...,
        examples=[{"question": "Explain the dashboard in simple terms."}],
    )
):
    if request.session_id:
        await save_message(request.session_id, request.mode, "user", request.question)
        
    response = await answer_qa(request)
    
    if request.session_id:
        await save_message(request.session_id, request.mode, "assistant", response.answer, response.sources)
        
    return response
