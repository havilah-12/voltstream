from schemas.chat import ChatRequest, ChatResponse
from services.gemini_service import ask_gemini

CHAT_FALLBACK_ANSWER = "Gemini did not return a response right now. Please try again."

CHAT_PROMPT_TEMPLATE = """You are a normal general-purpose Gemini-style assistant.

Answer the user's question directly.

User question:
{question}

Answer:"""


def answer_chat(request: ChatRequest) -> ChatResponse:
    answer = ask_gemini(
        request.question,
        [],
        CHAT_PROMPT_TEMPLATE,
        out_of_scope_answer="",
    )
    if answer:
        return ChatResponse(answer=answer, sources=[], used_gemini=True)

    return ChatResponse(answer=CHAT_FALLBACK_ANSWER, sources=[], used_gemini=False)
