import json
import logging
import os
from uuid import uuid4
import re

from config import get_settings
from google.adk.agents import Agent
from google.adk.runners import Runner
from google.adk.sessions import InMemorySessionService
from google.genai.types import Content, Part
from prompts import ORCHESTRATOR_AGENT_INSTRUCTION

from agents.analyst_agent import call_analyst_agent
from agents.advisor_agent import call_advisor_agent

logger = logging.getLogger(__name__)

settings = get_settings()
os.environ.setdefault("GOOGLE_GENAI_USE_VERTEXAI", "TRUE")
model_name = settings.gemini_model.removeprefix("models/")

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
                if resp.name == "call_advisor_agent":
                    match = re.search(r'___EVAL:(\d+),(\d+)___', str(resp.response))
                    if match:
                        yield _sse("eval_score", {"faithfulness": int(match.group(1)), "relevance": int(match.group(2))})

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
