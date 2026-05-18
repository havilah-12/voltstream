import re

from db import get_connection
from schemas.chat import ChatRequest, ChatResponse
from services.chroma_service import retrieve_chroma_chunks
from services.gemini_service import ask_gemini

OUT_OF_SCOPE_ANSWER = "I don't have that information."
BILLING_TERMS = {
    "amount",
    "bill",
    "billing",
    "budget",
    "cost",
    "estimate",
    "estimated",
    "invoice",
    "month",
    "payable",
    "pay",
    "price",
    "projected",
    "rs",
    "saving",
    "savings",
    "total",
    "value",
}
DEVICE_TERMS = {"appliance", "appliances", "control", "device", "devices", "load", "smart"}
LIVE_TERMS = {
    "current",
    "dashboard",
    "draw",
    "generation",
    "grid",
    "live",
    "net",
    "now",
    "power",
    "solar",
    "usage",
}
NAVIGATION_TERMS = {"find", "navigate", "navigation", "open", "page", "where"}
PERSONAL_IDENTITY_TERMS = {"anme", "name"}
GUIDE_CHUNK_LIMIT = 5

QA_PROMPT_TEMPLATE = """You are the VoltStream AI Assistant.

Answer using only the provided document context and SQL context.
If the answer is not in the context, say exactly: {out_of_scope_answer}
If the context is only related but does not contain the exact requested fact, number, estimate, or instruction, say exactly: {out_of_scope_answer}
Do not answer with a general definition when the user asks for a specific estimate or value.
For page/navigation questions, name the page from the document context.
For billing or bill-savings navigation questions, prefer the Billing page context when it is present.
For current usage, device, billing, budget, savings, or estimate questions, use SQL context when available.
If both document context and SQL context are present, combine them naturally.

Question:
{question}

Context:
{context}

Answer:"""


def _question_terms(question: str) -> set[str]:
    return set(re.findall(r"[a-z0-9]+", question.lower()))


def _needs_numeric_context(terms: set[str]) -> bool:
    asks_value = bool(terms.intersection({"amount", "cost", "estimate", "estimated", "next", "pay", "price", "total", "value", "will"}))
    asks_billing = bool(terms.intersection({"bill", "billing", "savings"}))
    return asks_value and asks_billing


def _has_numeric_context(chunks: list[str]) -> bool:
    return any(char.isdigit() for char in " ".join(chunks))


def _is_personal_identity_question(question: str) -> bool:
    terms = _question_terms(question)
    return "my" in terms and bool(terms.intersection(PERSONAL_IDENTITY_TERMS))


def _fetch_billing_context(connection) -> str | None:
    row = connection.execute(
        """
        SELECT current_balance, projected_bill, budget_limit, current_grid_data_usage, solar_energy_usage
        FROM billing_summary
        WHERE id = 1
        """
    ).fetchone()
    if not row:
        return None

    billing = dict(row)
    grid_usage = float(billing["current_grid_data_usage"])
    projected_bill = float(billing["projected_bill"])
    solar_usage = float(billing["solar_energy_usage"])
    unit_rate = projected_bill / grid_usage if grid_usage else 0
    solar_savings = solar_usage * unit_rate
    payable_bill = max(projected_bill - solar_savings, 0)

    return (
        "SQL billing context: "
        f"current generated bill is Rs.{billing['current_balance']:.0f}, "
        f"projected grid bill is Rs.{projected_bill:.0f}, "
        f"budget limit is Rs.{billing['budget_limit']:.0f}, "
        f"grid usage is {grid_usage:.0f} kWh, "
        f"solar usage is {solar_usage:.0f} kWh, "
        f"estimated solar savings are Rs.{solar_savings:.0f}, "
        f"estimated payable bill after solar savings is Rs.{payable_bill:.0f}."
    )


def _fetch_live_context(connection) -> str | None:
    row = connection.execute(
        """
        SELECT grid_draw_kw, solar_generation_kw, net_usage_kw
        FROM dashboard_live
        WHERE id = 1
        """
    ).fetchone()
    if not row:
        return None

    live = dict(row)
    return (
        "SQL live energy context: "
        f"grid draw is {live['grid_draw_kw']:.1f} kW, "
        f"solar generation is {live['solar_generation_kw']:.1f} kW, "
        f"net usage is {live['net_usage_kw']:.1f} kW."
    )


def _fetch_device_context(connection) -> str | None:
    rows = connection.execute(
        """
        SELECT name, location, status, power_usage_w
        FROM devices
        ORDER BY power_usage_w DESC, name
        LIMIT 5
        """
    ).fetchall()
    if not rows:
        return None

    devices = [
        f"{row['name']} in {row['location']} is {row['status']} at {row['power_usage_w']} W"
        for row in rows
    ]
    return "SQL device context: " + "; ".join(devices) + "."


def _get_sql_context(terms: set[str]) -> list[str]:
    needs_billing = bool(terms.intersection(BILLING_TERMS))
    is_navigation_question = bool(terms.intersection(NAVIGATION_TERMS))
    needs_devices = bool(terms.intersection(DEVICE_TERMS)) and not is_navigation_question
    needs_live = bool(terms.intersection(LIVE_TERMS))
    if not (needs_billing or needs_devices or needs_live):
        return []

    with get_connection() as connection:
        context = [
            _fetch_billing_context(connection) if needs_billing else None,
            _fetch_live_context(connection) if needs_live else None,
            _fetch_device_context(connection) if needs_devices else None,
        ]

    return [item for item in context if item]


def answer_qa(request: ChatRequest) -> ChatResponse:
    if _is_personal_identity_question(request.question):
        return ChatResponse(answer=OUT_OF_SCOPE_ANSWER, sources=[], used_gemini=False)

    terms = _question_terms(request.question)
    guide_chunks = retrieve_chroma_chunks(request.question, limit=GUIDE_CHUNK_LIMIT)
    sql_chunks = _get_sql_context(terms)
    context_chunks = guide_chunks + sql_chunks
    if not context_chunks:
        return ChatResponse(answer=OUT_OF_SCOPE_ANSWER, sources=[], used_gemini=False)
    if _needs_numeric_context(terms) and not _has_numeric_context(context_chunks):
        return ChatResponse(answer=OUT_OF_SCOPE_ANSWER, sources=context_chunks, used_gemini=False)

    answer = ask_gemini(
        request.question,
        context_chunks,
        QA_PROMPT_TEMPLATE,
        out_of_scope_answer=OUT_OF_SCOPE_ANSWER,
    )
    if not answer:
        return ChatResponse(answer=OUT_OF_SCOPE_ANSWER, sources=context_chunks, used_gemini=False)

    return ChatResponse(answer=answer, sources=context_chunks, used_gemini=True)
