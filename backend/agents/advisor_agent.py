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
    when_to_use="When the user asks for general tips or advice to lower bills, optionally with context.",
    parameters={
        "query": "What to ask the advisor agent.",
        "usage_context": "Optional context from the Analyst Agent to help tailor the advice."
    },
    returns="String containing the advice or a fallback message.",
)
async def call_advisor_agent(query: str, usage_context: str = "") -> str:
    """Consult the Advisor Agent for actionable energy-saving tips based on the knowledge base."""
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
            
            # --- LLM-AS-A-JUDGE UI INTEGRATION ---
            if result:
                try:
                    client = genai.Client()
                    chunks = retrieve_chroma_chunks(query, limit=3)
                    context = "\n".join(chunks) if chunks else "No context retrieved."
                    
                    judge_prompt_text = JUDGE_PROMPT.format(
                        question=query,
                        context=context,
                        answer=result
                    )
                    
                    response = client.models.generate_content(
                        model=model_name,
                        contents=judge_prompt_text
                    )
                    
                    result_text = response.text.replace("```json", "").replace("```", "").strip()
                    score = json.loads(result_text)
                    f_score = score.get("faithfulness", 0)
                    r_score = score.get("relevance", 0)
                    
                    result += f" ___EVAL:{f_score},{r_score}___"
                except Exception as eval_err:
                    logger.warning("Judge evaluation failed: %s", eval_err)
            # ---------------------------------------------
            
            return result
        except Exception as e:
            if "429" in str(e) and attempt < 2:
                continue
            return f"Error: {str(e)}"
