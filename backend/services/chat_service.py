import re

from schemas.chat import ChatRequest, ChatResponse
from services.gemini_service import ask_gemini

CHAT_FALLBACK_ANSWER = (
    "I can still help with general questions about energy, solar savings, grid usage, device usage, and simple terms. "
    "Try asking your question in a slightly different way, and I will do my best to explain it clearly."
)
CHAT_PROMPT_TEMPLATE = """You are the VoltStream Chat Bot for a household smart energy monitoring platform.

Answer style:
- Be friendly, clear, and concise.
- Answer normal conversational questions naturally, like a direct Gemini assistant.
- Focus on general energy questions, solar usage, grid usage, bill savings, household devices, and simple explanations of energy terms.
- Use general knowledge for normal conversational help and energy concepts.
- When explaining abbreviations, include the full forms first when useful.
- For basic concept questions, answer the concept first in plain language and avoid sounding like internal documentation.
- For basic energy concept questions, do not mention VoltStream at all unless the user explicitly asks how the concept appears in VoltStream.
- If the user asks a VoltStream platform-specific question about pages, navigation, where to find a feature, or how a specific screen works, briefly guide them to use the Q&A Bot for platform-specific answers.
- If the user asks something broader or slightly outside the main energy topic, still reply naturally and helpfully instead of refusing.
- Do not say "I don't have that information." in Chat Bot mode. If you are unsure, give the best helpful explanation you can or gently ask the user to rephrase.

Examples of the desired style:
User: What is the difference between kW and kWh?
Assistant: kW means kilowatt, which measures power at a specific moment. kWh means kilowatt-hour, which measures how much energy is used or generated over time.

User: What is solar surplus?
Assistant: Solar surplus is extra solar power left over after your home's energy needs are already covered. Depending on the setup, that extra energy may be exported back to the grid.

User: Do you know about CO2 impact?
Assistant: Yes. CO2 impact means the environmental effect of your energy usage, especially how much carbon dioxide emissions can be reduced by cleaner energy choices. In VoltStream, you can see this as eco impact, which helps show the environmental benefit of things like using solar power.

User: Do you know about energy efficiency?
Assistant: Yes. Energy efficiency means using less energy to do the same work, so waste is reduced and bills stay lower. In VoltStream, you can understand this better by tracking grid usage, solar usage, device load, and savings across the dashboard, billing, and usage history views.

User: What can you help me with here?
Assistant: I can help with general energy questions, solar savings, grid usage, device usage, energy terms, and simple explanations related to home energy.

User question:
{question}

Final answer:"""
OUT_OF_SCOPE_ANSWER = "I don't have that information."
PLATFORM_TERMS = {
    "platform",
    "voltstream",
    "works",
    "working",
    "page",
    "pages",
    "screen",
    "screens",
    "dashboard",
    "billing",
    "invoice",
    "invoices",
    "smart",
    "control",
    "assistant",
    "navigate",
    "navigation",
    "open",
    "where",
    "find",
    "feature",
}
QUESTION_STOPWORDS = {
    "a",
    "about",
    "an",
    "and",
    "are",
    "can",
    "do",
    "does",
    "explain",
    "for",
    "how",
    "is",
    "me",
    "mean",
    "means",
    "of",
    "tell",
    "the",
    "this",
    "to",
    "what",
    "whats",
    "which",
    "where",
}


def _tokenize(text: str) -> set[str]:
    return set(re.findall(r"[a-z0-9]+", text.lower()))


def _content_terms(text: str) -> set[str]:
    return _tokenize(text) - QUESTION_STOPWORDS


def _match_all(question_terms: set[str], *terms: str) -> bool:
    return set(terms).issubset(question_terms)


def _is_platform_question(question: str) -> bool:
    question_terms = _tokenize(question)
    asks_where_to_go = "open" in question_terms or "page" in question_terms or "navigate" in question_terms
    references_platform = bool(question_terms.intersection(PLATFORM_TERMS))
    asks_about_platform = bool(question_terms.intersection({"platform", "voltstream", "app", "website"}))
    return asks_where_to_go or references_platform or asks_about_platform


def _is_platform_overview_question(question: str) -> bool:
    question_terms = _tokenize(question)
    mentions_platform = bool(question_terms.intersection({"platform", "voltstream", "app", "website"}))
    broad_terms = {"know", "about", "work", "works", "working", "overview", "tell", "else"}
    return mentions_platform and bool(question_terms.intersection(broad_terms))


def _platform_overview_answer() -> str:
    return (
        "VoltStream is a household smart energy monitoring platform. It helps you track live grid and solar power, "
        "see usage trends over time, manage smart devices, understand bill savings, and check eco impact in one place. "
        "If you want detailed help about a specific page or feature, the AI Assistant can guide you step by step."
    )


def _local_chat_answer(question: str) -> str:
    lowered = question.lower()
    question_terms = _content_terms(question)

    if _match_all(question_terms, "kw", "kwh"):
        return (
            "kW means kilowatt, which measures power at a specific moment. "
            "kWh means kilowatt-hour, which measures how much energy is used or generated over time."
        )

    if "surplus" in lowered:
        return (
            "Solar surplus is the extra solar power left over after your home has already used what it needs. "
            "Depending on your setup, that extra energy may be sent back to the grid or counted as excess generation."
        )

    if "solar" in lowered and "bill" in lowered:
        return (
            "Solar reduces your bill by letting your home use solar energy first instead of buying that same energy from the grid. "
            "The more of your home usage covered by solar, the less electricity you need to purchase."
        )

    if "co2" in question_terms or _match_all(question_terms, "eco", "impact"):
        return (
            "CO2 impact means the environmental effect of your energy usage, especially how much carbon dioxide emissions can be reduced by cleaner energy choices like solar power."
        )

    if "efficiency" in lowered:
        return "Energy efficiency means using less energy to do the same work, so waste is reduced and bills stay lower."

    if "grid" in lowered and "power" in lowered:
        return "Grid power is the electricity your home is currently taking from the main electricity grid."

    if "solar" in lowered:
        return "Solar power is the electricity generated by your solar panels and made available for home use."

    return CHAT_FALLBACK_ANSWER


def answer_chat(request: ChatRequest) -> ChatResponse:
    if _is_platform_overview_question(request.question):
        return ChatResponse(answer=_platform_overview_answer(), sources=[], used_gemini=False)

    if _is_platform_question(request.question):
        return ChatResponse(
            answer=(
                "For detailed VoltStream page or feature questions, please use the AI Assistant. "
                "It is better for platform-specific guidance about screens, navigation, billing views, and controls."
            ),
            sources=[],
            used_gemini=False,
        )

    gemini_answer = ask_gemini(
        request.question,
        [],
        CHAT_PROMPT_TEMPLATE,
        out_of_scope_answer=OUT_OF_SCOPE_ANSWER,
    )
    if gemini_answer:
        return ChatResponse(answer=gemini_answer, sources=[], used_gemini=True)

    return ChatResponse(answer=_local_chat_answer(request.question), sources=[], used_gemini=False)
