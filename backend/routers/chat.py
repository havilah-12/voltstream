from fastapi import APIRouter, Body

from schemas.chat import ChatRequest, ChatResponse
from services.chat_service import answer_chat
from services.rag_service import answer_qa

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
def chat(
    request: ChatRequest = Body(
        ...,
        examples=[{"question": "How does solar reduce my bill?"}],
    )
):
    return answer_chat(request)


@router.post(
    "/qa",
    response_model=ChatResponse,
    responses={200: {"content": {"application/json": {"example": QA_RESPONSE_EXAMPLE}}}},
)
def qa(
    request: ChatRequest = Body(
        ...,
        examples=[{"question": "Explain the dashboard in simple terms."}],
    )
):
    return answer_qa(request)
