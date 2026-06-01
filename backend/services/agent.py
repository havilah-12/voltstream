import json  # Formats SSE data for frontend.
import logging  # Debug and error logging.
import os  # Environment variables (API keys, timezone).
import threading  # Non-blocking background worker for schedules.
from datetime import datetime  # Time math for scheduling.
from uuid import uuid4  # Unique IDs for sessions and jobs.
from zoneinfo import ZoneInfo  # Local timezone support.

from config import get_settings  # Loads app configuration.
from google.adk.agents import Agent  # Defines AI tools and instructions.
from google.adk.runners import Runner  # Engine that processes prompts.
from google.adk.sessions import InMemorySessionService  # Stores conversation memory in RAM.
from google.genai.types import Content, Part  # Formatting for Google AI API.
from schemas.device import DeviceStatusUpdate  # Pydantic schema validation.
from services import device_service  # DB layer for physical device updates.
from utils.certificates import verify_token  # Certificate verification
from utils.decorators import tool_annotation

logger = logging.getLogger(__name__)


# Saves Gemini tokens by acting as a local search engine so the AI doesn't need to fetch the entire database via list_all_devices()
def _find(query: str) -> dict | None:
    q = query.lower().strip()
    return next(
        (d for d in device_service.list_devices()
         if q in (d["id"].lower(), d["name"].lower(), d["type"].lower())
         or q in d["name"].lower() or q in d["type"].lower()),
        None,
    )


# Tool: Acts as the AI's database lookup to fetch the exact device ID and its current ON/OFF status.
@tool_annotation(
    name="get_device_status",
    agent="voltstream_device_agent",
    purpose="Fetch exact device ID and its current ON/OFF status.",
    when_to_use="When checking the current status of a device or validating its ID.",
    parameters={"device_id": "Device id, name, or type — e.g. 'AC', 'Air Conditioning', 'fan'."},
    returns="Dictionary containing status, exact device_id, name, and current_status.",
)
def get_device_status(device_id: str) -> dict:
    """Get the current status of a VoltStream device.

    Args:
        device_id: Device id, name, or type — e.g. 'AC', 'Air Conditioning', 'fan'.
    """
    d = _find(device_id)
    if not d:
        return {"status": "error", "message": f"No device matched '{device_id}'."}
    return {"status": "success", "device_id": d["id"], "name": d["name"], "current_status": d["status"]}



# Tool: Instantly updates the database to turn a device ON or OFF.
@tool_annotation(
    name="toggle_device",
    agent="voltstream_device_agent",
    purpose="Turn a VoltStream device ON or OFF immediately.",
    when_to_use="When the user requests an immediate command like 'turn on' or 'turn off'.",
    parameters={
        "device_id": "Exact device id from get_device_status — e.g. 'ac-1'.",
        "state": "'ON' or 'OFF'."
    },
    returns="Dictionary containing the result of the toggle operation.",
)
def toggle_device(device_id: str, state: str) -> dict:
    """Turn a VoltStream device ON or OFF immediately.

    Args:
        device_id: Exact device id from get_device_status — e.g. 'ac-1'.
        state: 'ON' or 'OFF'.
    """
    if state not in {"ON", "OFF"}:
        return {"status": "error", "message": "State must be 'ON' or 'OFF'."}
    d = _find(device_id)
    if not d:
        return {"status": "error", "message": f"No device found: '{device_id}'."}
    if d["status"] == state:
        return {"status": "success", "device_id": d["id"], "name": d["name"], "updated_status": state, "message": f"{d['name']} is already {state}."}
    updated = device_service.update_device_status(d["id"], DeviceStatusUpdate(status=state))
    if not updated:
        return {"status": "error", "message": f"Failed to update {d['name']}."}
    return {"status": "success", "device_id": updated["id"], "name": updated["name"], "updated_status": updated["status"], "message": f"{updated['name']} turned {updated['status']}."}

# Tool: Turns all VoltStream devices ON or OFF
@tool_annotation(
    name="toggle_all_devices",
    agent="voltstream_device_agent",
    purpose="Turn ALL VoltStream devices ON or OFF.",
    when_to_use="When the user wants to turn all devices on or off at once.",
    parameters={"state": "'ON' or 'OFF'."},
    returns="Dictionary containing the result and number of devices updated.",
)
def toggle_all_devices(state: str) -> dict:
    """Turn ALL VoltStream devices ON or OFF.
    
    Args:
        state: 'ON' or 'OFF'.
    """
    if state not in {"ON", "OFF"}:
        return {"status": "error", "message": "State must be 'ON' or 'OFF'."}
    
    devices = device_service.list_devices()
    updated_count = 0
    for d in devices:
        if d["status"] != state:
            device_service.update_device_status(d["id"], DeviceStatusUpdate(status=state))
            updated_count += 1
            
    return {
        "status": "success",
        "message": f"Successfully turned {state} all devices. {updated_count} devices updated."
    }

_SCHEDULED_TIMERS: dict[str, threading.Timer] = {}
_TZ = ZoneInfo(os.getenv("TZ", "Asia/Kolkata"))

# Internal: Uses a Python background thread to wait silently and update the device at a specific future time.
def _schedule_device_internal(device_id: str, state: str, scheduled_time_iso: str) -> dict:
    """Internal scheduling logic. Do not expose this directly to the LLM."""
    if state not in {"ON", "OFF"}:
        return {"status": "error", "message": "State must be 'ON' or 'OFF'."}
    d = _find(device_id)
    if not d:
        return {"status": "error", "message": f"No device found: '{device_id}'."}
    try:
        scheduled_at = datetime.fromisoformat(scheduled_time_iso)
        if scheduled_at.tzinfo is None:
            scheduled_at = scheduled_at.replace(tzinfo=_TZ)
    except (ValueError, TypeError):
        return {"status": "error", "message": f"Invalid datetime: '{scheduled_time_iso}'. Use YYYY-MM-DDTHH:MM:SS."}

    delay = max(0, (scheduled_at - datetime.now(_TZ)).total_seconds())
    job_id = f"schedule-{uuid4().hex[:8]}"

    def _run():
        try:
            device_service.update_device_status(d["id"], DeviceStatusUpdate(status=state))
            logger.info("Scheduled toggle done: %s → %s", d["id"], state)
        except Exception as exc:
            logger.exception("Scheduled toggle failed for %s: %s", d["id"], exc)
        finally:
            _SCHEDULED_TIMERS.pop(job_id, None)

    timer = threading.Timer(delay, _run)
    timer.daemon = True
    _SCHEDULED_TIMERS[job_id] = timer
    timer.start()

    return {
        "status": "success",
        "job_id": job_id,
        "name": d["name"],
        "scheduled_state": state,
        "scheduled_for": scheduled_at.strftime("%I:%M %p on %Y-%m-%d"),
        "scheduled_for_iso": scheduled_at.isoformat(),
        "message": f"{d['name']} will turn {state} at {scheduled_at.strftime('%I:%M %p on %Y-%m-%d')}.",
    }

# Tool: Validates the dev certificate and then schedules the device toggle.
@tool_annotation(
    name="schedule_device",
    agent="voltstream_device_agent",
    purpose="Schedule a VoltStream device to turn ON or OFF at a future time using a valid certificate.",
    when_to_use="For timed commands like 'in X minutes' or 'at HH:MM'.",
    parameters={
        "device_id": "Exact device id from get_device_status — e.g. 'ac-1'.",
        "state": "'ON' or 'OFF'.",
        "scheduled_time_iso": "Future datetime in ISO 8601 format e.g. 2025-05-21T22:00:00.",
        "cert": "Base64-encoded client certificate or token that authorizes this specific action."
    },
    returns="Dictionary containing the scheduled job details.",
)
def schedule_device(device_id: str, state: str, scheduled_time_iso: str, cert: str) -> dict:
    """Schedule a VoltStream device to turn ON or OFF at a future time using a valid certificate.

    Args:
        device_id: Exact device id from get_device_status — e.g. 'ac-1'.
        state: 'ON' or 'OFF'.
        scheduled_time_iso: Future datetime in ISO 8601 format e.g. 2025-05-21T22:00:00.
        cert: Base64-encoded client certificate or token that authorizes this specific action.
    """
    try:
        verify_token(cert, device_id, state, scheduled_time_iso)
    except PermissionError as e:
        return {"status": "error", "message": f"Certificate verification failed: {e}"}
        
    return _schedule_device_internal(device_id, state, scheduled_time_iso)


# ── Agent ─────────────────────────────────────────────────────────────────────

settings = get_settings()
os.environ.setdefault("GOOGLE_GENAI_USE_VERTEXAI", "TRUE")

_agent = Agent(
    name="voltstream_device_agent",
    model=settings.gemini_model.removeprefix("models/"),
    description="Controls VoltStream smart home devices.",
    instruction=(
        "Control VoltStream smart home devices using the provided tools.\n\n"
        "The current device context (names, IDs, and statuses) is provided in the prompt.\n"
        "Use this context to directly find the correct 'device_id'.\n"
        "Step 1 — Decide which tool to use:\n"
        "  • Immediate command ('turn on', 'turn off') → call toggle_device(device_id, state)\n"
        "  • Timed command ('in X minutes', 'in X seconds', 'at HH:MM') → call schedule_device(device_id, state, scheduled_time_iso, cert)\n"
        "    Convert the timing to ISO 8601 using Asia/Kolkata timezone based on the current time provided in the prompt.\n"
        "    You MUST use the provided 'client_certificate' from the prompt as the 'cert' parameter.\n\n"
        "Intent mapping:\n"
        "  turn on / start / enable → ON\n"
        "  turn off / stop / disable / shut down → OFF\n\n"
        "Reply in one line. Use correct grammar based on the action.\n"
        "Immediate example: 'AC 1 was turned ON.'\n"
        "Scheduled example: 'AC 1 will be turned ON in 10 seconds.'\n"
        "Already in state example: 'AC 1 is already OFF.'"
    ),
    tools=[get_device_status, toggle_device, schedule_device, toggle_all_devices],
)

_sessions = InMemorySessionService()
_runner = Runner(agent=_agent, app_name="voltstream", session_service=_sessions)


# ── SSE stream ────────────────────────────────────────────────────────────────

def _sse(event_type: str, data: dict) -> str:
    return f"event: {event_type}\ndata: {json.dumps(data)}\n\n"

# Streamer: The main engine that bridges Python and Gemini, executing tools and sending real-time updates back to the router.
async def stream_device_agent(message: str):
    session_id = f"session-{uuid4().hex}"
    await _sessions.create_session(app_name="voltstream", user_id="user", session_id=session_id)
    yield _sse("status", {"message": "Agent started."})

    try:
        now_iso = datetime.now(_TZ).isoformat()

        # We removed the regex fast path entirely.
        # Now we parse a potential schedule token passed from the frontend, or just prompt.
        
        # In a real app, the token would be sent in headers or a separate field.
        # For simplicity, if the frontend sends a structured JSON with "message" and "token", we can extract it.
        # If it's a simple string, we will assume the token is embedded or we fall back.
        
        # First try parsing message as JSON to see if token is there.
        client_cert = "none"
        user_text = message
        try:
            payload = json.loads(message)
            if isinstance(payload, dict):
                user_text = payload.get("message", message)
                client_cert = payload.get("token", "none")
        except Exception:
            pass
            
        from services.device_service import list_devices
        devices = list_devices()
        devices_list_str = ", ".join([f"{d['name']} (id: {d['id']}, status: {d['status']})" for d in devices])
        
        prompt_with_time = f"Current Time (Asia/Kolkata): {now_iso}\nClient Certificate: {client_cert}\nDevices Context: {devices_list_str}\nUser Command: {user_text}"
        
        async for event in _runner.run_async(
            user_id="user",
            session_id=session_id,
            new_message=Content(role="user", parts=[Part(text=prompt_with_time)]),
        ):
            for call in event.get_function_calls():
                yield _sse("tool_call", {"name": call.name, "args": call.args})
            for resp in event.get_function_responses():
                yield _sse("tool_response", {"name": resp.name, "response": resp.response})
            if event.is_final_response():
                parts = event.content and event.content.parts
                text = "".join(p.text for p in parts if getattr(p, "text", None)).strip() if parts else ""
                if text:
                    yield _sse("answer", {"answer": text})
    except Exception as exc:
        logger.exception("Agent error: %s", exc)
        yield _sse("error", {"message": "Something went wrong. Please try again."})
        return

    yield _sse("done", {"message": "Agent finished."})
