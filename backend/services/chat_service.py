from schemas.chat import ChatRequest, ChatResponse
from prompts import CHAT_PROMPT_TEMPLATE
from services.gemini_service import ask_gemini
import logging

logger = logging.getLogger("voltstream")

GEMINI_EMPTY_ANSWER = "Something went wrong. Please try again."


def answer_chat(request: ChatRequest) -> ChatResponse:
    logger.info(f"[AGENT TRACE] Basic Chat processing query: '{request.question}'")
    logger.info("[AGENT TRACE] Basic Chat invoking Gemini without RAG context...")
    answer = ask_gemini(
        request.question,
        [],
        CHAT_PROMPT_TEMPLATE,
        out_of_scope_answer="",
    )
    if answer:
        logger.info("[AGENT TRACE] Gemini returned successfully generated answer.")
        return ChatResponse(answer=answer, sources=[], used_gemini=True)

    logger.info("[AGENT TRACE] Gemini returned empty answer.")
    return ChatResponse(answer=GEMINI_EMPTY_ANSWER, sources=[], used_gemini=False)
