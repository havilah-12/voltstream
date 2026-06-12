import asyncio
import json
import logging
import os
from uuid import uuid4

from config import get_settings
from google.adk.agents import Agent
from google.adk.runners import Runner
from google.adk.sessions import InMemorySessionService
from google.genai.types import Content, Part
from prompts import ANALYST_AGENT_INSTRUCTION

from services.analytics_service import get_history
from utils.decorators import tool_annotation
from opentelemetry import trace

tracer = trace.get_tracer(__name__)
logger = logging.getLogger(__name__)

# The analyst agent gets three separate tool annotations for better clarity and routing:
# - Home-level history and trends -> fetch_usage_history
# - Current per-device power draw -> fetch_device_power_usage
# - Past per-device consumption -> fetch_device_historical_usage

@tool_annotation(
    name="fetch_usage_history",
    agent="analyst_agent",
    purpose="Fetch usage history (grid and solar data) for a given period.",
    when_to_use="When analyzing overall home energy trends, patterns, and peaks, or when asked about a specific past day like Friday.",
    parameters={"period": "Must be 'daily' (for specific days of week), 'weekly', or 'monthly'."},
    returns="JSON string containing historical energy usage data.",
)
@tracer.start_as_current_span("fetch_usage_history")
def fetch_usage_history(period: str) -> str:
    """Fetch usage history (grid and solar data) for a given period."""
    if period not in {"daily", "weekly", "monthly"}:
        period = "weekly"
    data = get_history(period)
    return json.dumps(data)


@tool_annotation(
    name="fetch_device_power_usage",
    agent="analyst_agent",
    purpose="Fetch the real-time power usage (in Watts) of all devices currently active in the home.",
    when_to_use="When checking current power consumption of individual active devices.",
    parameters={},
    returns="JSON string containing list of active devices and their power usage.",
)
@tracer.start_as_current_span("fetch_device_power_usage")
def fetch_device_power_usage() -> str:
    """Fetch the real-time power usage (in Watts) of all devices currently active in the home."""
    from database.db import get_connection
    with get_connection() as conn:
        rows = conn.execute("SELECT name, location, status, power_usage_w FROM devices ORDER BY power_usage_w DESC").fetchall()
    return json.dumps([dict(r) for r in rows])


@tool_annotation(
    name="fetch_device_historical_usage",
    agent="analyst_agent",
    purpose="Fetch historical energy consumption (in kWh) for individual devices over a given period.",
    when_to_use="When analyzing past consumption of specific devices over a period or specific day.",
    parameters={"period": "Must be one of 'daily', 'weekly', or 'monthly'."},
    returns="JSON string containing historical device consumption data.",
)
@tracer.start_as_current_span("fetch_device_historical_usage")
def fetch_device_historical_usage(period: str) -> str:
    """Fetch historical energy consumption (in kWh) for individual devices over a given period."""
    if period not in {"daily", "weekly", "monthly"}:
        period = "weekly"
    
    from database.db import get_connection
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


settings = get_settings()
os.environ.setdefault("GOOGLE_GENAI_USE_VERTEXAI", "TRUE")
model_name = settings.gemini_model.removeprefix("models/")

analyst_agent = Agent(
    name="analyst_agent",
    model=model_name,
    description="Analyzes historical energy usage data (grid and solar).",
    instruction=ANALYST_AGENT_INSTRUCTION,
    tools=[fetch_usage_history, fetch_device_power_usage, fetch_device_historical_usage],
)

_sessions = InMemorySessionService()

@tool_annotation(
    name="call_analyst_agent",
    agent="orchestrator_agent",
    purpose="Consult the Analyst Agent to analyze historical energy usage data.",
    when_to_use="When the user asks for past/current usage data.",
    parameters={"query": "What to ask the analyst agent (e.g. 'What was the peak grid usage last week?')."},
    returns="String containing the analysis result.",
)
@tracer.start_as_current_span("call_analyst_agent")
async def call_analyst_agent(query: str) -> str:
    """Consult the Analyst Agent to analyze historical energy usage data."""
    for attempt in range(3):
        try:
            if attempt > 0:
                await asyncio.sleep(2) # OPTIMIZED from 15s to 2s
                
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
