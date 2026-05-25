from fastapi import APIRouter, Query, Body
from services.analytics_service import get_history
from schemas.chat import ChatRequest, ChatResponse
from services.gemini_service import ask_gemini

router = APIRouter()

@router.get("/history")
def get_analytics_history(period: str | None = Query("daily", description="daily, weekly, or monthly")):
    return get_history(period)

@router.post("/summary", response_model=ChatResponse)
def get_analytics_summary(request: ChatRequest = Body(...)):
    answer = ask_gemini(
        question=request.question,
        chunks=[],
        prompt_template="{question}",
        out_of_scope_answer=""
    )
    if answer:
        return ChatResponse(answer=answer, sources=[], used_gemini=True)
    return ChatResponse(answer="Could not generate summary. Please try again.", sources=[], used_gemini=False)
