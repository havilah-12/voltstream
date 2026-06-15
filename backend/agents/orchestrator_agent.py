import json
import logging
import os
from uuid import uuid4


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
    advisor_query = None
    judge_task = None

    try:
        async for event in _runner.run_async(
            user_id="user",
            session_id=session_id,
            new_message=Content(role="user", parts=[Part(text=message)]),
        ):
            # ---- SPY LOOP 1: Function Calls ----
            # The LLM has already decided to call a tool completely independently.
            # This loop just "spies" on that decision as it flies by so we can print it to the terminal
            # and push a Server-Sent Event (SSE) to the frontend UI.
            for call in event.get_function_calls():
                yield _sse("tool_call", {"name": call.name, "args": call.args})
                if call.name == "call_advisor_agent":
                    advisor_query = call.args.get("query", "")
                    logger.info(f"[AGENT TRACE] Orchestrator routing query to Advisor Agent: '{advisor_query}'")
            
            # ---- SPY LOOP 2: Function Responses ----
            # The sub-agent has finished its job and returned a response back to the Orchestrator.
            # Again, this loop just spies on that returned data.
            for resp in event.get_function_responses():
                yield _sse("tool_response", {"name": resp.name})
                
                # If the response came specifically from the Advisor Agent, we do some extra logic
                # to extract the text and trigger the background LLM-as-a-Judge evaluation.
                if resp.name == "call_advisor_agent":
                    if isinstance(resp.response, dict) and "result" in resp.response:
                        resp_str = str(resp.response["result"])
                        try:
                            data = json.loads(resp_str)
                            if "answer" in data:
                                resp.response["result"] = data["answer"]
                                
                                if advisor_query and data["answer"] != "I don't have that information.":
                                    from services.chroma_service import retrieve_chroma_chunks_with_sources
                                    from prompts import JUDGE_PROMPT
                                    from google import genai
                                    
                                    async def run_judge(q, ans):
                                        logger.info(f"[AGENT TRACE] Starting LLM Judge evaluation for query: '{q}'")
                                        try:
                                            client = genai.Client(http_options={'timeout': 10000})
                                            chunks, sources = await asyncio.to_thread(retrieve_chroma_chunks_with_sources, q, 5)
                                            context = "\n".join(chunks) if chunks else "No context retrieved."
                                            judge_prompt_text = JUDGE_PROMPT.format(question=q, context=context, answer=ans)
                                            response = await client.aio.models.generate_content(
                                                model=model_name,
                                                contents=judge_prompt_text
                                            )
                                            result_text = response.text.replace("```json", "").replace("```", "").strip()
                                            score = json.loads(result_text)
                                            sources_str = ",".join(sources) if sources else "unknown"
                                            logger.info(f"[AGENT TRACE] LLM Judge completed evaluation. Score: {score}")
                                            return {
                                                "faithfulness": int(score.get("faithfulness", 0)),
                                                "relevance": int(score.get("relevance", 0)),
                                                "sources": sources_str.split(",") if sources_str and sources_str != "unknown" else []
                                            }
                                        except Exception as e:
                                            logger.warning("Judge failed: %s", e)
                                            return None
                                            
                                    judge_task = asyncio.create_task(run_judge(advisor_query, data["answer"]))
                        except json.JSONDecodeError:
                            pass

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

        if judge_task:
            judge_result = await judge_task
            if judge_result:
                yield _sse("eval_score", judge_result)


    except Exception as exc:
        logger.exception("Orchestrator error: %s", exc)
        yield _sse("error", {"message": "Something went wrong. Please try again."})
        return

    yield _sse("done", {"message": "Orchestrator finished."})
