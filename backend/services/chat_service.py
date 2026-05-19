from schemas.chat import ChatRequest, ChatResponse
from services.gemini_service import ask_gemini

GEMINI_EMPTY_ANSWER = "Gemini did not return a response right now. Please try again."
HELP_ANSWER = (
    "I'm the VoltStream Bot. I can help with general energy-related questions and simple terms like kW, kWh, "
    "solar savings, grid usage, solar surplus, energy efficiency, and home appliance energy use."
)

CHAT_PROMPT_TEMPLATE = """You are a normal general-purpose Gemini-style assistant.

Answer the user's question directly.
Keep answers short, usually 2 to 4 sentences.
Use plain text only.
Do not use Markdown formatting such as **bold**, *italics*, headings, or bullet points unless the user asks for a list.

User question:
{question}

Answer:"""


def _plain_text(answer: str) -> str:
    return (
        answer.replace("**", "")
        .replace("*   ", "")
        .replace("* ", "")
        .replace("### ", "")
        .replace("## ", "")
        .replace("# ", "")
        .strip()
    )


def _is_help_question(question: str) -> bool:
    normalized = question.lower().strip()
    return "what can you help" in normalized or "what do you help" in normalized


def answer_chat(request: ChatRequest) -> ChatResponse:
    if _is_help_question(request.question):
        return ChatResponse(answer=HELP_ANSWER, sources=[], used_gemini=False)

    answer = ask_gemini(
        request.question,
        [],
        CHAT_PROMPT_TEMPLATE,
        out_of_scope_answer="",
    )
    if answer:
        return ChatResponse(answer=_plain_text(answer), sources=[], used_gemini=True)

    return ChatResponse(answer=GEMINI_EMPTY_ANSWER, sources=[], used_gemini=False)
