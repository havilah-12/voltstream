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

    import asyncio
    judge_task = None

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
                    if isinstance(resp.response, dict) and "result" in resp.response:
                        resp_str = str(resp.response["result"])
                        match = re.search(r' ___JUDGE_DATA:(.*?):(.*?):(.*?)(?:___|$)', resp_str)
                        if match:
                            query_b64, sources_str, context_b64 = match.groups()
                            
                            # strip the judge data from the string so the Orchestrator LLM doesn't see it
                            resp.response["result"] = resp_str.replace(match.group(0), "").strip()
                            advisor_answer = str(resp.response["result"])
                            
                            # Start judge task in background
                            import base64
                            from google import genai
                            from prompts import JUDGE_PROMPT
                            
                            query = base64.b64decode(query_b64).decode("utf-8")
                            context = base64.b64decode(context_b64).decode("utf-8")
                            
                            async def run_judge(q, ctx, ans, srcs):
                                try:
                                    client = genai.Client()
                                    judge_prompt_text = JUDGE_PROMPT.format(question=q, context=ctx, answer=ans)
                                    response = await client.aio.models.generate_content(
                                        model=model_name,
                                        contents=judge_prompt_text
                                    )
                                    result_text = response.text.replace("```json", "").replace("```", "").strip()
                                    score = json.loads(result_text)
                                    return {
                                        "faithfulness": int(score.get("faithfulness", 0)),
                                        "relevance": int(score.get("relevance", 0)),
                                        "sources": srcs.split(",") if srcs and srcs != "unknown" else []
                                    }
                                except Exception as e:
                                    logger.warning("Judge failed: %s", e)
                                    return None
                                    
                            judge_task = asyncio.create_task(run_judge(query, context, advisor_answer, sources_str))

            # Stream intermediate text chunks
            if not event.is_final_response() and not event.get_function_calls() and not event.get_function_responses():
                parts = event.content and event.content.parts
                text = "".join(p.text for p in parts if getattr(p, "text", None)) if parts else ""
                if text:
                    yield _sse("answer_chunk", {"chunk": text})

            if event.is_final_response():
                parts = event.content and event.content.parts
                text = "".join(p.text for p in parts if getattr(p, "text", None)).strip() if parts else ""
                if text:
                    yield _sse("answer", {"answer": text})
                    
        # After stream finishes, await judge_task if it exists so we can yield eval_score
        if judge_task:
            judge_result = await judge_task
            if judge_result:
                yield _sse("eval_score", judge_result)

    except Exception as exc:
        logger.exception("Orchestrator error: %s", exc)
        yield _sse("error", {"message": "Something went wrong. Please try again."})
        return

    yield _sse("done", {"message": "Orchestrator finished."})
