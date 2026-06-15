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
from prompts import ADVISOR_AGENT_INSTRUCTION

from services.chroma_service import retrieve_chroma_chunks
from utils.decorators import tool_annotation

logger = logging.getLogger(__name__)

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
    """Search the VoltStream energy knowledge base for tips and advice."""
    logger.info(f"[AGENT TRACE] Advisor Agent searching knowledge base for: '{query}'")
    chunks = retrieve_chroma_chunks(query, limit=5)
    if not chunks:
        logger.info(f"[AGENT TRACE] No chunks found for query: '{query}'")
        return "No relevant advice found in the knowledge base."
    return "\n".join(chunks)


settings = get_settings()
os.environ.setdefault("GOOGLE_GENAI_USE_VERTEXAI", "TRUE")
model_name = settings.gemini_model.removeprefix("models/")

advisor_agent = Agent(
    name="advisor_agent",
    model=model_name,
    description="Provides actionable energy-saving advice using a knowledge base.",
    instruction=ADVISOR_AGENT_INSTRUCTION,
    tools=[search_energy_knowledge_base],
)

_sessions = InMemorySessionService()

@tool_annotation(
    name="call_advisor_agent",
    agent="orchestrator_agent",
    purpose="Consult the Advisor Agent for actionable energy-saving tips based on the knowledge base.",
    when_to_use="When the user asks for general tips or advice to lower bills. This agent will automatically fetch usage data in parallel, so do not pass usage context.",
    parameters={
        "query": "What to ask the advisor agent."
    },
    returns="String containing the advice or a fallback message.",
)
async def call_advisor_agent(query: str) -> str:
    """Consult the Advisor Agent for actionable energy-saving tips based on the knowledge base."""
    for attempt in range(3):
        try:
            if attempt > 0:
                await asyncio.sleep(2)
                
            async def _fetch_db_usage_async():
                try:
                    from database.db import get_firestore_client
                    from services.analytics_service import get_history
                    history = await get_history("weekly")
                    db = get_firestore_client()
                    docs = await db.collection("devices").where("status", "==", "ON").get()
                    devices = [d.to_dict() for d in docs]
                    dev_str = ", ".join([f"{d.get('name', '')} ({d.get('power_usage_w', 0)}W)" for d in devices])
                    return f"Weekly History: {json.dumps(history)}. Active Devices: {dev_str}"
                except Exception:
                    return ""

            usage_context = await _fetch_db_usage_async()
            
            prompt_text = ""
            if usage_context:
                prompt_text += f"Usage Context:\n{usage_context}\n\n"
            prompt_text += f"User Query:\n{query}"

            session_id = uuid4().hex
            await _sessions.create_session(app_name="voltstream", user_id="user", session_id=session_id)
            logger.info(f"[AGENT TRACE] Advisor Agent invoking model '{model_name}' with prompt:\n{prompt_text}")
            runner = Runner(agent=advisor_agent, app_name="voltstream", session_service=_sessions)
            
            result = ""
            async for event in runner.run_async(
                user_id="user", 
                session_id=session_id, 
                new_message=Content(role="user", parts=[Part(text=prompt_text)])
            ):
                if event.is_final_response():
                    parts = event.content and event.content.parts
                    result = "".join(p.text for p in parts if getattr(p, "text", None)).strip() if parts else ""

            if not result:
                result = "I don't have that information."
            
            return json.dumps({
                "answer": result
            })
            
        except Exception as e:
            if "429" in str(e) and attempt < 2:
                continue
            return json.dumps({"answer": f"Error: {str(e)}"})
