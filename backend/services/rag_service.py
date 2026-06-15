from database.db import get_firestore_client
from prompts import QA_PROMPT_TEMPLATE
from schemas.chat import ChatRequest, ChatResponse
from services.chroma_service import retrieve_chroma_chunks
from services.gemini_service import ask_gemini
import logging

logger = logging.getLogger("voltstream")

OUT_OF_SCOPE_ANSWER = "I don't have that information."
GUIDE_CHUNK_LIMIT = 5


async def _fetch_billing_context() -> str | None:
    db = get_firestore_client()
    doc = await db.collection("billing_summary").document("1").get()
    if not doc.exists:
        return None
    billing = doc.to_dict()
    grid_usage = float(billing.get("current_grid_data_usage", 0))
    projected_bill = float(billing.get("projected_bill", 0))
    solar_usage = float(billing.get("solar_energy_usage", 0))
    unit_rate = projected_bill / grid_usage if grid_usage else 0
    solar_savings = solar_usage * unit_rate
    payable_bill = max(projected_bill - solar_savings, 0)

    return (
        f"Current generated bill is Rs.{billing.get('current_balance', 0):.0f}, "
        f"projected grid bill is Rs.{projected_bill:.0f}, "
        f"budget limit is Rs.{billing.get('budget_limit', 0):.0f}, "
        f"grid usage is {grid_usage:.0f} kWh, "
        f"solar usage is {solar_usage:.0f} kWh, "
        f"estimated solar savings are Rs.{solar_savings:.0f}, "
        f"estimated payable bill after solar savings is Rs.{payable_bill:.0f}."
    )


async def _fetch_invoice_history_context() -> str | None:
    db = get_firestore_client()
    docs = await db.collection("invoice_history").get()
    if not docs:
        return None
    
    rows = [doc.to_dict() for doc in docs]
    # Simple manual sort for mock data to simulate ID descending
    rows.reverse()
    rows = rows[:6]

    amounts = [float(row.get("amount", 0)) for row in rows]
    if not amounts:
        return None
    average_amount = sum(amounts) / len(amounts)
    latest_amount = amounts[0]
    estimated_next_bill = round((latest_amount + average_amount) / 2)
    invoice_text = "; ".join(
        f"{row.get('month', '')} {row.get('invoice_number', '')} was Rs.{float(row.get('amount', 0)):.0f} and {row.get('status', '')}"
        for row in rows
    )
    return (
        f"{invoice_text}. "
        f"Average historical bill is Rs.{average_amount:.0f}. "
        f"Estimated next bill from invoice history is Rs.{estimated_next_bill:.0f}."
    )


async def _fetch_live_context() -> str | None:
    db = get_firestore_client()
    doc = await db.collection("dashboard_live").document("1").get()
    if not doc.exists:
        return None
    live = doc.to_dict()
    return (
        f"Grid draw is {live.get('grid_draw_kw', 0):.1f} kW, "
        f"solar generation is {live.get('solar_generation_kw', 0):.1f} kW, "
        f"net usage is {live.get('net_usage_kw', 0):.1f} kW."
    )


async def _fetch_device_context() -> str | None:
    db = get_firestore_client()
    docs = await db.collection("devices").get()
    if not docs:
        return None
    rows = [doc.to_dict() for doc in docs]
    rows.sort(key=lambda x: x.get("power_usage_w", 0), reverse=True)
    rows = rows[:5]
    
    devices = [
        f"{row.get('name', '')} in {row.get('location', '')} is {row.get('status', '')} at {row.get('power_usage_w', 0)} W"
        for row in rows
    ]
    return "; ".join(devices) + "."


async def _get_sql_context(query: str = "") -> list[str]:
    """Fetch relevant SQL contexts based on keywords to save LLM tokens and lower latency."""
    q = query.lower()
    
    needs_billing = any(w in q for w in ["bill", "budget", "save", "money", "cost", "pay"])
    needs_history = any(w in q for w in ["history", "past", "previous", "invoice", "last month", "average"])
    needs_live = any(w in q for w in ["live", "now", "current", "dashboard", "generating", "drawing", "net", "today"])
    needs_devices = any(w in q for w in ["device", "appliance", "ac", "fan", "power", "watt", "status"])
    
    if not any([needs_billing, needs_history, needs_live, needs_devices]):
        needs_billing = needs_history = needs_live = needs_devices = True
        
    context = []
    if needs_billing:
        res = await _fetch_billing_context()
        if res: context.append(res)
    if needs_history:
        res = await _fetch_invoice_history_context()
        if res: context.append(res)
    if needs_live:
        res = await _fetch_live_context()
        if res: context.append(res)
    if needs_devices:
        res = await _fetch_device_context()
        if res: context.append(res)
            
    return context


async def answer_qa(request: ChatRequest) -> ChatResponse:
    logger.info(f"[AGENT TRACE] Basic RAG processing query: '{request.question}'")
    guide_chunks = retrieve_chroma_chunks(request.question, GUIDE_CHUNK_LIMIT)
    sql_chunks = await _get_sql_context(request.question)
    
    logger.info(f"[AGENT TRACE] Basic RAG retrieved {len(guide_chunks)} guide chunks and {len(sql_chunks)} SQL chunks.")
    context_chunks = guide_chunks + sql_chunks
    
    if not context_chunks:
        logger.info(f"[AGENT TRACE] Basic RAG found no context. Returning out-of-scope.")
        return ChatResponse(answer=OUT_OF_SCOPE_ANSWER, sources=[], used_gemini=False)

    logger.info(f"[AGENT TRACE] Basic RAG invoking Gemini with combined context...")
    answer = ask_gemini(
        request.question,
        context_chunks,
        QA_PROMPT_TEMPLATE,
        out_of_scope_answer=OUT_OF_SCOPE_ANSWER,
    )
    if not answer:
        logger.info(f"[AGENT TRACE] Gemini returned empty answer.")
        return ChatResponse(answer=OUT_OF_SCOPE_ANSWER, sources=context_chunks, used_gemini=False)

    logger.info(f"[AGENT TRACE] Gemini returned successfully generated answer.")
    return ChatResponse(answer=answer, sources=context_chunks, used_gemini=True)
