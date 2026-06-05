import asyncio
import json
import logging
import os
from uuid import uuid4

from config import get_settings
from google import genai
from google.adk.agents import Agent
from google.adk.runners import Runner
from google.adk.sessions import InMemorySessionService
from google.genai.types import Content, Part
from prompts import ADVISOR_AGENT_INSTRUCTION, JUDGE_PROMPT

from services.chroma_service import retrieve_chroma_chunks, retrieve_chroma_chunks_with_sources
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
    chunks = retrieve_chroma_chunks(query, limit=3)
    if not chunks:
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
                await asyncio.sleep(15)
                
            client = genai.Client()
            
            # Retrieve context from ChromaDB and database in parallel
            def _fetch_chroma():
                return retrieve_chroma_chunks_with_sources(query, limit=5)
                
            def _fetch_db_usage():
                try:
                    from database.db import get_connection
                    from services.analytics_service import get_history
                    history = get_history("weekly")
                    with get_connection() as conn:
                        devices = conn.execute("SELECT name, power_usage_w FROM devices WHERE status='ON'").fetchall()
                    dev_str = ", ".join([f"{d['name']} ({d['power_usage_w']}W)" for d in devices])
                    return f"Weekly History: {json.dumps(history)}. Active Devices: {dev_str}"
                except Exception:
                    return ""

            chroma_task = asyncio.to_thread(_fetch_chroma)
            db_task = asyncio.to_thread(_fetch_db_usage)
            
            chroma_result, usage_context = await asyncio.gather(chroma_task, db_task)
            chunks, sources = chroma_result
            context = "\n".join(chunks) if chunks else "No context retrieved."
            
            if not chunks:
                result = "I don't have that information."
            else:
                # Generate answer directly using system instruction and context
                prompt_text = f"Knowledge Base Context:\n{context}\n\n"
                if usage_context:
                    prompt_text += f"Usage Context:\n{usage_context}\n\n"
                prompt_text += f"User Query:\n{query}"
                
                response = await client.aio.models.generate_content(
                    model=model_name,
                    contents=[Content(role="user", parts=[Part(text=prompt_text)])],
                    config={"system_instruction": ADVISOR_AGENT_INSTRUCTION}
                )
                result = response.text.strip()
            
            # --- LLM-AS-A-JUDGE UI INTEGRATION ---
            if result and result != "I don't have that information.":
                import base64
                sources_str = ",".join(sources) if sources else "unknown"
                query_b64 = base64.b64encode(query.encode("utf-8")).decode("utf-8")
                context_b64 = base64.b64encode(context.encode("utf-8")).decode("utf-8")
                result += f" ___JUDGE_DATA:{query_b64}:{sources_str}:{context_b64}___"
            # ---------------------------------------------
            
            return result
        except Exception as e:
            if "429" in str(e) and attempt < 2:
                continue
            return f"Error: {str(e)}"
