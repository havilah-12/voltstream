import json
import logging
import os
from uuid import uuid4

from config import get_settings
from google.adk.agents import Agent
from google.adk.runners import Runner
from google.adk.sessions import InMemorySessionService
from google.genai.types import Content, Part
from prompts import (
    ADVISOR_AGENT_INSTRUCTION,
    ANALYST_AGENT_INSTRUCTION,
    ORCHESTRATOR_AGENT_INSTRUCTION,
)

from services.analytics_service import get_history
from services.chroma_service import retrieve_chroma_chunks
from utils.decorators import tool_annotation

logger = logging.getLogger(__name__)


# The analyst agent gets three separate tool annotations for better clarity and routing:
# - Home-level history and trends -> fetch_usage_history
# - Current per-device power draw -> fetch_device_power_usage
# - Past per-device consumption -> fetch_device_historical_usage


# Tool for the Analyst Agent to fetch historical energy data from the database
@tool_annotation(
    # metadata/documentation of the tool for understanding by LLM 
    name="fetch_usage_history",
    agent="analyst_agent",
    purpose="Fetch usage history (grid and solar data) for a given period.",
    when_to_use="When analyzing overall home energy trends, patterns, and peaks, or when asked about a specific past day like Friday.",
    parameters={"period": "Must be 'daily' (for specific days of week), 'weekly', or 'monthly'."},
    returns="JSON string containing historical energy usage data.",
)
def fetch_usage_history(period: str) -> str:
    """Fetch usage history (grid and solar data) for a given period.

    Args:
        period: Must be one of 'daily', 'weekly', or 'monthly'.
    """
    if period not in {"daily", "weekly", "monthly"}:
        period = "weekly"
    data = get_history(period)
    return json.dumps(data)


# Tool for the Analyst Agent to fetch real-time device power usage from the database
@tool_annotation(
    name="fetch_device_power_usage",
    agent="analyst_agent",
    purpose="Fetch the real-time power usage (in Watts) of all devices currently active in the home.",
    when_to_use="When checking current power consumption of individual active devices.",
    parameters={},
    returns="JSON string containing list of active devices and their power usage.",
)
def fetch_device_power_usage() -> str:
    """Fetch the real-time power usage (in Watts) of all devices currently active in the home."""
    from db import get_connection
    with get_connection() as conn:
        rows = conn.execute("SELECT name, location, status, power_usage_w FROM devices ORDER BY power_usage_w DESC").fetchall()
    return json.dumps([dict(r) for r in rows])


# Tool for the Analyst Agent to fetch historical energy consumption for specific devices
@tool_annotation(
    name="fetch_device_historical_usage",
    agent="analyst_agent",
    purpose="Fetch historical energy consumption (in kWh) for individual devices over a given period.",
    when_to_use="When analyzing past consumption of specific devices over a period or specific day.",
    parameters={"period": "Must be one of 'daily', 'weekly', or 'monthly'."},
    returns="JSON string containing historical device consumption data.",
)
def fetch_device_historical_usage(period: str) -> str:
    """Fetch historical energy consumption (in kWh) for individual devices over a given period.
    
    Args:
        period: Must be one of 'daily', 'weekly', or 'monthly'.
    """
    if period not in {"daily", "weekly", "monthly"}:
        period = "weekly"
    
    from db import get_connection
    with get_connection() as conn:
        rows = conn.execute(
            """
            SELECT device_name, label, consumption_kwh
            FROM device_analytics_history
            WHERE period = ?
            ORDER BY id
            """,
            (period,)
        ).fetchall()
        
    if not rows:
        return "No historical data found for individual devices."
        
    return json.dumps([dict(r) for r in rows])


#For usage-based advice, the orchestrator runs the analyst agent first, then pass that analysis as context to the advisor.

# Tool for the Advisor Agent to query the ChromaDB vector knowledge base
@tool_annotation(
    name="search_energy_knowledge_base",
    agent="advisor_agent",
    purpose="Search the VoltStream energy knowledge base for tips and advice.",
    when_to_use="When looking for relevant best practices or energy-saving tips based on user query or analysis context.",
    parameters={"query": "The topic or question to search for (e.g., 'reduce AC usage', 'solar basics')."},
    returns="String containing the retrieved advice chunks or a fallback message if none found.",
)
def search_energy_knowledge_base(query: str) -> str:
    """Search the VoltStream energy knowledge base for tips and advice.

    Args:
        query: The topic or question to search for (e.g., 'reduce AC usage', 'solar basics').
    """
    chunks = retrieve_chroma_chunks(query, limit=3)
    if not chunks:
        return "No relevant advice found in the knowledge base."
    return "\n".join(chunks)


settings = get_settings()
os.environ.setdefault("GOOGLE_GENAI_USE_VERTEXAI", "TRUE")
model_name = settings.gemini_model.removeprefix("models/")

analyst_agent = Agent(
    name="analyst_agent",
    model=model_name,
    description="Analyzes historical energy usage data (grid and solar).",
    instruction=ANALYST_AGENT_INSTRUCTION,
    # actual toolbox the agent is allowed to use
    tools=[fetch_usage_history, fetch_device_power_usage, fetch_device_historical_usage],
)

advisor_agent = Agent(
    name="advisor_agent",
    model=model_name,
    description="Provides actionable energy-saving advice using a knowledge base.",
    instruction=ADVISOR_AGENT_INSTRUCTION,
    tools=[search_energy_knowledge_base],
)

# Asynchronous wrapper to run the Analyst Agent independently
@tool_annotation(
    name="call_analyst_agent",
    agent="orchestrator_agent",
    purpose="Consult the Analyst Agent to analyze historical energy usage data.",
    when_to_use="When the user asks for past/current usage data.",
    parameters={"query": "What to ask the analyst agent (e.g. 'What was the peak grid usage last week?')."},
    returns="String containing the analysis result.",
)
async def call_analyst_agent(query: str) -> str:
    """Consult the Analyst Agent to analyze historical energy usage data.
    
    Args:
        query: What to ask the analyst agent (e.g. 'What was the peak grid usage last week?').
    """
    import asyncio
    for attempt in range(3):
        try:
            if attempt > 0:
                await asyncio.sleep(15)  # Longer backoff on retry
                
            session_id = uuid4().hex
            await _sessions.create_session(app_name="voltstream", user_id="user", session_id=session_id)
            runner = Runner(agent=analyst_agent, app_name="voltstream", session_service=_sessions)
            result = ""
            async for event in runner.run_async(
                user_id="user", 
                session_id=session_id, 
                new_message=Content(role="user", parts=[Part(text=query)])
            ):
                if event.is_final_response():
                    parts = event.content and event.content.parts
                    result = "".join(p.text for p in parts if getattr(p, "text", None)).strip() if parts else ""
            return result
        except Exception as e:
            if "429" in str(e) and attempt < 2:
                continue
            return f"Error: {str(e)}"

# Asynchronous wrapper to run the Advisor Agent independently
@tool_annotation(
    name="call_advisor_agent",
    agent="orchestrator_agent",
    purpose="Consult the Advisor Agent for actionable energy-saving tips based on the knowledge base.",
    when_to_use="When the user asks for general tips or advice to lower bills, optionally with context.",
    parameters={
        "query": "What to ask the advisor agent.",
        "usage_context": "Optional context from the Analyst Agent to help tailor the advice."
    },
    returns="String containing the advice or a fallback message.",
)
async def call_advisor_agent(query: str, usage_context: str = "") -> str:
    """Consult the Advisor Agent for actionable energy-saving tips based on the knowledge base.
    
    Args:
        query: What to ask the advisor agent.
        usage_context: Optional context from the Analyst Agent to help tailor the advice.
    """
    import asyncio
    full_query = f"Context: {usage_context}\n\nQuery: {query}" if usage_context else query
    for attempt in range(3):
        try:
            if attempt > 0:
                await asyncio.sleep(15)
                
            session_id = uuid4().hex
            await _sessions.create_session(app_name="voltstream", user_id="user", session_id=session_id)
            runner = Runner(agent=advisor_agent, app_name="voltstream", session_service=_sessions)
            result = ""
            async for event in runner.run_async(
                user_id="user", 
                session_id=session_id, 
                new_message=Content(role="user", parts=[Part(text=full_query)])
            ):
                if event.is_final_response():
                    parts = event.content and event.content.parts
                    result = "".join(p.text for p in parts if getattr(p, "text", None)).strip() if parts else ""
            return result
        except Exception as e:
            if "429" in str(e) and attempt < 2:
                continue
            return f"Error: {str(e)}"

orchestrator_agent = Agent(
    name="orchestrator_agent",
    model=model_name,
    description="Coordinates between the Analyst and Advisor to answer user queries.",
    instruction=ORCHESTRATOR_AGENT_INSTRUCTION,
    tools=[call_analyst_agent, call_advisor_agent],
)

_sessions = InMemorySessionService()
_runner = Runner(agent=orchestrator_agent, app_name="voltstream", session_service=_sessions)


# Helper function to format Server-Sent Events (SSE) for the frontend
def _sse(event_type: str, data: dict) -> str:
    return f"event: {event_type}\ndata: {json.dumps(data)}\n\n"


# Main entry point that runs the Orchestrator Agent and streams events to the UI
async def stream_orchestrator_agent(message: str, session_id: str | None = None):
    if not session_id:
        session_id = f"session-{uuid4().hex}"
        
    try:
        # In memory sessions are lost on restart, so we always try to create it if we need to.
        # If it exists, this might raise an error, which we just ignore.
        await _sessions.create_session(app_name="voltstream", user_id="user", session_id=session_id)
    except Exception:
        pass

    yield _sse("session", {"session_id": session_id})
    yield _sse("status", {"message": "Orchestrator started."})

    try:
        async for event in _runner.run_async(
            user_id="user",
            session_id=session_id,
            new_message=Content(role="user", parts=[Part(text=message)]),
        ):
            for call in event.get_function_calls():
                yield _sse("tool_call", {"name": call.name, "args": call.args})
            for resp in event.get_function_responses():
                yield _sse("tool_response", {"name": resp.name})

            if event.is_final_response():
                parts = event.content and event.content.parts
                text = "".join(p.text for p in parts if getattr(p, "text", None)).strip() if parts else ""
                if text:
                    yield _sse("answer", {"answer": text})
    except Exception as exc:
        logger.exception("Orchestrator error: %s", exc)
        yield _sse("error", {"message": "Something went wrong. Please try again."})
        return

    yield _sse("done", {"message": "Orchestrator finished."})
