from schemas.chat import ChatRequest, ChatResponse
from prompts import CHAT_PROMPT_TEMPLATE
from services.gemini_service import ask_gemini

GEMINI_EMPTY_ANSWER = "Something went wrong. Please try again."


def answer_chat(request: ChatRequest) -> ChatResponse:
    answer = ask_gemini(
        request.question,
        [],
        CHAT_PROMPT_TEMPLATE,
        out_of_scope_answer="",
    )
    if answer:
        return ChatResponse(answer=answer, sources=[], used_gemini=True)

    return ChatResponse(answer=GEMINI_EMPTY_ANSWER, sources=[], used_gemini=False)
