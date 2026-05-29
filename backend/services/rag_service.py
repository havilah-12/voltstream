
from db import get_connection
from schemas.chat import ChatRequest, ChatResponse
from services.chroma_service import retrieve_chroma_chunks
from services.gemini_service import ask_gemini

OUT_OF_SCOPE_ANSWER = "I don't have that information."
GUIDE_CHUNK_LIMIT = 3

QA_PROMPT_TEMPLATE = """You are the VoltStream AI Assistant. Answer using ONLY the provided context below.

Rules:
- If the answer is not in the context, reply: {out_of_scope_answer}
- For navigation questions, name the page from context
- For billing estimates, use SQL invoice history if available
- Combine document and SQL context naturally
- Keep answers concise

Question: {question}

Context:
{context}

Answer:"""


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
        f"Current generated bill is Rs.{billing['current_balance']:.0f}, "
        f"projected grid bill is Rs.{projected_bill:.0f}, "
        f"budget limit is Rs.{billing['budget_limit']:.0f}, "
        f"grid usage is {grid_usage:.0f} kWh, "
        f"solar usage is {solar_usage:.0f} kWh, "
        f"estimated solar savings are Rs.{solar_savings:.0f}, "
        f"estimated payable bill after solar savings is Rs.{payable_bill:.0f}."
    )


def _fetch_invoice_history_context(connection) -> str | None:
    rows = connection.execute(
        """
        SELECT month, amount, status, invoice_number
        FROM invoice_history
        ORDER BY id DESC
        LIMIT 6
        """
    ).fetchall()
    if not rows:
        return None

    amounts = [float(row["amount"]) for row in rows]
    average_amount = sum(amounts) / len(amounts)
    latest_amount = amounts[0]
    estimated_next_bill = round((latest_amount + average_amount) / 2)
    invoice_text = "; ".join(
        f"{row['month']} {row['invoice_number']} was Rs.{float(row['amount']):.0f} and {row['status']}"
        for row in rows
    )
    return (
        f"{invoice_text}. "
        f"Average historical bill is Rs.{average_amount:.0f}. "
        f"Estimated next bill from invoice history is Rs.{estimated_next_bill:.0f}."
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
        f"Grid draw is {live['grid_draw_kw']:.1f} kW, "
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
    return "; ".join(devices) + "."


def _get_sql_context() -> list[str]:
    """Fetch all SQL contexts. LLM will use only relevant ones."""
    with get_connection() as connection:
        context = [
            _fetch_billing_context(connection),
            _fetch_invoice_history_context(connection),
            _fetch_live_context(connection),
            _fetch_device_context(connection),
        ]
    return [item for item in context if item]


def answer_qa(request: ChatRequest) -> ChatResponse:
    from concurrent.futures import ThreadPoolExecutor
    # Run Chroma retrieval and SQL context fetching in parallel to save time
    with ThreadPoolExecutor(max_workers=2) as executor:
        future_chroma = executor.submit(retrieve_chroma_chunks, request.question, GUIDE_CHUNK_LIMIT)
        future_sql = executor.submit(_get_sql_context)
        guide_chunks = future_chroma.result()
        sql_chunks = future_sql.result()
    
    context_chunks = guide_chunks + sql_chunks
    
    if not context_chunks:
        return ChatResponse(answer=OUT_OF_SCOPE_ANSWER, sources=[], used_gemini=False)

    answer = ask_gemini(
        request.question,
        context_chunks,
        QA_PROMPT_TEMPLATE,
        out_of_scope_answer=OUT_OF_SCOPE_ANSWER,
    )
    if not answer:
        return ChatResponse(answer=OUT_OF_SCOPE_ANSWER, sources=context_chunks, used_gemini=False)

    return ChatResponse(answer=answer, sources=context_chunks, used_gemini=True)
