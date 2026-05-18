import logging
import re
from pathlib import Path

from db import get_connection
from schemas.chat import ChatRequest, ChatResponse
from services.chat_service import _is_platform_question
from services.chroma_service import retrieve_chroma_chunks
from services.gemini_service import ask_gemini

logger = logging.getLogger("voltstream")

KNOWLEDGE_PATH = Path(__file__).resolve().parent.parent / "data" / "energy_guide.txt"
OUT_OF_SCOPE_ANSWER = "I don't have that information."
QA_PROMPT_TEMPLATE = """You are the VoltStream Q&A Bot for a household smart energy monitoring platform.

Answer style:
- Be friendly, clear, and concise.
- Explain platform pages and energy terms in simple language.
- Use the provided VoltStream context as the source of truth for energy, billing, devices, solar, and platform questions.
- For complex questions, reason internally first, then give only the final helpful answer. Do not reveal hidden reasoning or chain-of-thought.
- If the user asks a normal small-talk question, answer naturally.
- If the answer is not covered by VoltStream context and is not basic small talk, say exactly: {out_of_scope_answer}

Few-shot examples:
User: What is grid power?
Assistant: Grid power is the live power your home is currently taking from the electricity grid. In VoltStream, it helps you understand how much electricity still comes from the grid compared with solar generation.

User: How does solar reduce my bill?
Assistant: Solar reduces your bill when your home uses solar energy first instead of buying that energy from the grid. VoltStream estimates savings by comparing solar usage with the grid unit rate.

User: Which page should I open to control devices?
Assistant: Open Smart Control. It shows your household devices, their ON/OFF status, current load, and controls for selected appliances.

User: What is the difference between kW and kWh?
Assistant: kW means kilowatt, which is live power at a moment in time. kWh means kilowatt-hour, which is total energy used or generated over time. In VoltStream, grid power and solar power cards use kW, while usage history and total energy values use kWh.

User: Do you know about CO2 impact?
Assistant: CO2 impact means the environmental effect of your energy usage, especially how much carbon dioxide emissions can be reduced by using cleaner energy. In VoltStream, this appears as eco impact on the Dashboard to help you understand the environmental benefit of choices like using solar power.

User: What else do you know about this platform?
Assistant: VoltStream is a household smart energy monitoring platform. It brings together live energy flow, usage history, smart device control, billing insights, and assistant help in one place so users can understand and manage home energy better.

User question:
{question}

VoltStream context:
{context}

Final answer:"""
ENERGY_KEYWORDS = {
    "voltstream",
    "platform",
    "work",
    "works",
    "working",
    "energy",
    "power",
    "grid",
    "solar",
    "panel",
    "angle",
    "generation",
    "usage",
    "device",
    "bill",
    "billing",
    "saving",
    "savings",
    "kwh",
    "kw",
    "appliance",
    "co2",
    "surplus",
    "dashboard",
    "history",
    "historical",
    "smart",
    "control",
    "assistant",
    "app",
    "website",
    "page",
    "navigation",
    "navigate",
    "invoice",
    "budget",
    "credit",
    "metric",
    "metrics",
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
GREETING_TERMS = {"hi", "hello", "hey", "hii", "hai"}
GREETING_ANSWER = (
    "Hello, I'm the VoltStream AI Assistant. I can help you understand the VoltStream platform better, "
    "explain your energy usage, and answer questions about solar, grid power, devices, and bills. "
    "What do you want to know about today?"
)
SMALL_TALK_PATTERNS = (
    ({"what", "your", "name"}, "I'm the VoltStream AI assistant. How can I help you today?"),
    ({"whats", "your", "name"}, "I'm the VoltStream AI assistant. How can I help you today?"),
    ({"who", "are", "you"}, "I'm the VoltStream AI assistant. I can help you understand the platform, your energy usage, solar, grid power, devices, and bills."),
    (
        {"what", "can", "you", "help", "me", "with"},
        "I can help you understand VoltStream, explain energy terms like grid power or solar surplus, guide you to the right page, and answer questions about your usage, devices, and billing.",
    ),
    (
        {"what", "can", "you", "help", "me", "with", "here"},
        "I can help you understand VoltStream, explain energy terms like grid power or solar surplus, guide you to the right page, and answer questions about your usage, devices, and billing.",
    ),
    ({"how", "are", "you"}, "I'm doing well, thanks for asking. How's your day going?"),
    ({"how", "r", "u"}, "I'm doing well, thanks for asking. How's your day going?"),
    ({"how", "is", "your", "day"}, "My day is going well. I'm here and ready to help you with VoltStream or anything you want to ask."),
    ({"thank", "you"}, "You're welcome. What would you like to check next?"),
    ({"thanks"}, "You're welcome. What would you like to check next?"),
)
LIVE_USAGE_TERMS = {"right", "now", "current", "live", "status"}

def _tokenize(text: str) -> set[str]:
    return set(re.findall(r"[a-z0-9]+", text.lower()))


def _content_terms(text: str) -> set[str]:
    return _tokenize(text) - QUESTION_STOPWORDS


def _match_all(question_terms: set[str], *terms: str) -> bool:
    return set(terms).issubset(question_terms)


def _load_document() -> str:
    return KNOWLEDGE_PATH.read_text(encoding="utf-8")


def _is_platform_overview_question(question: str) -> bool:
    question_terms = _tokenize(question)
    mentions_platform = bool(question_terms.intersection({"platform", "voltstream", "app", "website"}))
    broad_terms = {"know", "about", "work", "works", "working", "overview", "tell", "else"}
    return mentions_platform and bool(question_terms.intersection(broad_terms))


def _chunk_document(text: str) -> list[str]:
    return [chunk.strip() for chunk in text.split("\n\n") if chunk.strip()]


def _retrieve_keyword_chunks(question: str, limit: int = 3) -> list[str]:
    question_terms = _tokenize(question)
    if not question_terms.intersection(ENERGY_KEYWORDS):
        return []

    chunks = _chunk_document(_load_document())
    ranked = sorted(
        chunks,
        key=lambda chunk: len(question_terms.intersection(_tokenize(chunk))),
        reverse=True,
    )
    return [chunk for chunk in ranked[:limit] if question_terms.intersection(_tokenize(chunk))]


def retrieve_chunks(question: str, limit: int = 3) -> list[str]:
    question_terms = _tokenize(question)
    if not question_terms.intersection(ENERGY_KEYWORDS):
        return []

    chroma_chunks = retrieve_chroma_chunks(question, limit=limit)
    if chroma_chunks:
        return chroma_chunks

    return _retrieve_keyword_chunks(question, limit=limit)


def _local_grounded_answer(question: str, chunks: list[str]) -> str:
    lowered = question.lower()
    context = " ".join(chunks)
    question_terms = _content_terms(question)

    if not chunks:
        return OUT_OF_SCOPE_ANSWER

    if _is_platform_overview_question(question):
        return (
            "VoltStream is a household smart energy monitoring platform. It helps you track live energy flow, "
            "compare grid and solar usage, manage home devices, understand bill savings, and see eco impact in one place. "
            "You can use it to check live power on the dashboard, review usage history, control devices, and understand your billing better."
        )

    if "dashboard" in question_terms and ("explain" in question_terms or "simple" in question_terms):
        return (
            "The Dashboard is the main overview page in VoltStream. It gives you a quick live picture of your home energy, "
            "including grid power, solar power, energy balance, bill savings, eco impact, and your top energy consumers."
        )

    if ("control" in question_terms and "device" in question_terms) or (
        "open" in question_terms and {"page", "devices"}.intersection(question_terms)
    ):
        return (
            "Open the Smart Control page. That is where you can see your household devices, check whether they are ON or OFF, "
            "view their load, and manage them by room or device type."
        )

    if "billing" in question_terms and ("show" in question_terms or "page" in question_terms):
        return (
            "Open the Billing page to check generated bill, payable bill, solar credit, budget status, and recent invoices. "
            "It helps you understand how solar savings are affecting what you need to pay."
        )

    if _match_all(question_terms, "usage", "history") or (
        "history" in question_terms and ("check" in question_terms or "see" in question_terms or "view" in question_terms)
    ):
        return (
            "You can check usage history on the Usage History page. It shows your past grid usage and solar generation, "
            "and you can switch between daily, weekly, and monthly views to compare trends over time. "
            "If you want a quick explanation of what changed, you can also open the AI Summary on that page."
        )

    if _match_all(question_terms, "kw", "kwh"):
        return (
            "kW means kilowatt, which is live power at a moment in time. "
            "kWh means kilowatt-hour, which is total energy used or generated over time. "
            "In VoltStream, grid power and solar power cards use kW, while usage history and total energy values use kWh."
        )

    if "kw" in question_terms:
        return (
            "kW means kilowatt. It is a live power value at one moment in time, such as the current grid draw or solar power shown on the dashboard."
        )

    if "kwh" in question_terms:
        return (
            "kWh means kilowatt-hour. It is total energy used or generated over time, such as daily, weekly, or monthly usage shown in VoltStream history and source totals."
        )

    if _match_all(question_terms, "energy", "balance") or _match_all(question_terms, "net", "usage"):
        return (
            "Energy Balance or Net Usage means the difference between grid draw and solar generation. "
            "If solar is higher than demand, VoltStream shows extra solar sent back. If demand is higher, it shows extra grid power needed."
        )

    if _match_all(question_terms, "grounded", "answer"):
        return (
            "A grounded answer is an answer generated only from the provided VoltStream context. "
            "It should stay within the energy guide and not invent information outside that context."
        )

    if "rag" in question_terms:
        return (
            "RAG means Retrieval-Augmented Generation. VoltStream first retrieves relevant context from the energy guide, then uses that context to answer the question."
        )

    if _match_all(question_terms, "embedding", "vector"):
        return (
            "An embedding vector is a numerical representation of text meaning. It is used to compare how similar a user question is to document content."
        )

    if "chunk" in question_terms:
        return (
            "A chunk is a smaller section of the source document used for retrieval. VoltStream can search these chunks to find the most relevant context for a question."
        )

    if _match_all(question_terms, "solar", "coverage"):
        return (
            "Solar Coverage means the percentage of grid usage that solar generation helped offset in the selected period. "
            "It helps show how much grid dependence was reduced by solar."
        )

    if _match_all(question_terms, "bill", "savings"):
        return (
            "Bill Savings means estimated money saved because solar energy reduced grid energy purchase. "
            "In VoltStream, it reflects how solar usage lowers the amount of electricity bought from the grid."
        )

    if "co2" in question_terms or _match_all(question_terms, "eco", "impact"):
        return (
            "CO2 impact means the environmental effect of your energy usage, especially how much carbon dioxide emissions can be reduced by using cleaner energy. "
            "In VoltStream, this appears as eco impact on the Dashboard to help you understand the environmental benefit of choices like using solar power."
        )

    if _match_all(question_terms, "peak", "grid", "period"):
        return (
            "Peak Grid Period means the day, week, or month where grid usage was highest in the selected history view. "
            "It helps identify when your household relied most on grid power."
        )

    if "angle" in lowered or "tilt" in lowered or "panel" in lowered:
        return (
            "For stronger solar performance in VoltStream, the recommended fixed panel angle is about 15 to 20 degrees, "
            "facing south where possible. A practical rule is to keep the tilt close to the local latitude and make sure "
            "the panels stay clear of shade during peak sunlight hours."
        )

    if "surplus" in lowered:
        return "Solar surplus means extra solar power left after home usage is covered. Depending on the meter setup, this extra solar can be sent back to the grid or counted as excess generation."

    if "saving" in lowered or "bill" in lowered:
        return "Solar savings are estimated by using solar power in the home first. Every solar kWh used reduces grid energy purchase, so savings can be calculated as solar energy used multiplied by the grid unit rate."

    if "grid" in lowered and "solar" in lowered:
        return "Grid power is the live power drawn from the electricity grid. VoltStream tracks the grid power your household is using, the devices contributing to grid usage, and the billing impact of that grid usage."

    if "device" in lowered or "appliance" in lowered:
        return "High-wattage devices like water heaters, AC units, washing machines, microwaves, and cookers are common energy consumers. Turning them off when not required helps reduce grid draw."

    sentences = [sentence.strip() for sentence in re.split(r"(?<=\.)\s+", context) if sentence.strip()]
    if not sentences:
        return OUT_OF_SCOPE_ANSWER

    ranked_sentences = sorted(
        sentences,
        key=lambda sentence: len(question_terms.intersection(_content_terms(sentence))),
        reverse=True,
    )
    answer_sentences = [ranked_sentences[0]]
    platform_candidates = [sentence for sentence in sentences if "voltstream" in sentence.lower()]
    platform_sentence = ""
    if platform_candidates:
        platform_sentence = sorted(
            platform_candidates,
            key=lambda sentence: len(question_terms.intersection(_content_terms(sentence))),
            reverse=True,
        )[0]
    if platform_sentence and platform_sentence not in answer_sentences:
        answer_sentences.append(platform_sentence)

    return " ".join(answer_sentences)


def _live_usage_answer() -> str:
    with get_connection() as connection:
        row = connection.execute(
            """
            SELECT grid_draw_kw, solar_generation_kw, net_usage_kw
            FROM dashboard_live
            WHERE id = 1
            """
        ).fetchone()
    live = dict(row) if row else {}
    grid = NumberLike(live.get("grid_draw_kw"))
    solar = NumberLike(live.get("solar_generation_kw"))
    net = NumberLike(live.get("net_usage_kw"))
    if net < 0:
        balance = f"Solar is ahead by {abs(net):.1f} kW, so extra solar is available as surplus."
    elif net > 0:
        balance = f"Your home still needs {net:.1f} kW from the grid after solar contribution."
    else:
        balance = "Solar generation and grid draw are currently balanced."

    return f"Right now your home is drawing {grid:.1f} kW from the grid and solar is generating {solar:.1f} kW. {balance}"


def NumberLike(value) -> float:
    try:
        return float(value)
    except (TypeError, ValueError):
        return 0.0


def _shared_small_talk_or_live_response(request: ChatRequest) -> ChatResponse | None:
    lowered = request.question.lower().strip()
    if "what can you help me with" in lowered:
        return ChatResponse(
            answer=(
                "I can help you understand VoltStream, explain energy terms like grid power or solar surplus, "
                "guide you to the right page, and answer questions about your usage, devices, and billing."
            ),
            sources=[],
            used_gemini=False,
        )

    question_terms = _tokenize(request.question)
    for required_terms, answer in SMALL_TALK_PATTERNS:
        if required_terms.issubset(question_terms):
            return ChatResponse(answer=answer, sources=[], used_gemini=False)

    if question_terms.intersection(GREETING_TERMS):
        return ChatResponse(answer=GREETING_ANSWER, sources=[], used_gemini=False)

    asks_live_status = bool(question_terms.intersection(LIVE_USAGE_TERMS)) or (
        {"my", "usage"}.issubset(question_terms) and not {"history", "historical"}.intersection(question_terms)
    )
    if asks_live_status:
        return ChatResponse(answer=_live_usage_answer(), sources=[], used_gemini=False)

    return None

def answer_qa(request: ChatRequest) -> ChatResponse:
    shortcut_response = _shared_small_talk_or_live_response(request)
    if shortcut_response:
        return shortcut_response

    chunks = retrieve_chunks(request.question)
    context_chunks = chunks

    if not _is_platform_question(request.question) and not context_chunks:
        return ChatResponse(
            answer=(
                "For general energy or terminology questions, please use the Chat Bot. "
                "The Q&A Bot is best for VoltStream guidance and answers that come from the VoltStream guide."
            ),
            sources=[],
            used_gemini=False,
        )

    if not context_chunks:
        return ChatResponse(answer=OUT_OF_SCOPE_ANSWER, sources=[], used_gemini=False)

    gemini_answer = ask_gemini(
        request.question,
        context_chunks,
        QA_PROMPT_TEMPLATE,
        out_of_scope_answer=OUT_OF_SCOPE_ANSWER,
    )
    if gemini_answer:
        return ChatResponse(answer=gemini_answer, sources=context_chunks, used_gemini=True)

    return ChatResponse(
        answer=_local_grounded_answer(request.question, context_chunks),
        sources=context_chunks,
        used_gemini=False,
    )
