from schemas.chat import ChatRequest, ChatResponse
from services.gemini_service import ask_gemini

GEMINI_EMPTY_ANSWER = "Something went wrong. Please try again."

CHAT_PROMPT_TEMPLATE = """You are a helpful general energy dictionary for VoltStream.

Answer general energy questions, solar basics, grid concepts, and define simple energy terms. 
CRITICAL RULE: You DO NOT have access to the user's VoltStream account, billing data, live dashboard, or smart devices. 
If the user asks about their specific account, bill, live usage, or VoltStream features, politely tell them to switch to the "AI Assistant" tab for personalized account help.

Keep answers short (2-4 sentences).
Use plain text only, no markdown formatting.

Question: {question}

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

    return ChatResponse(answer=GEMINI_EMPTY_ANSWER, sources=[], used_gemini=False)
