import logging
from datetime import datetime
from database.db import get_firestore_client
from google import genai
from config import get_settings
from prompts.templates import CHAT_TITLE_PROMPT
from google.cloud.firestore_v1.base_query import FieldFilter

logger = logging.getLogger("voltstream")

async def get_all_sessions(mode: str) -> list[dict]:
    db = get_firestore_client()
    try:
        docs = await db.collection("chat_sessions").where(filter=FieldFilter("mode", "==", mode)).get()
        sessions = [doc.to_dict() for doc in docs]
        return sorted(sessions, key=lambda x: x.get("updated_at", ""), reverse=True)
    except Exception as e:
        logger.error(f"Failed to fetch sessions: {e}")
        return []


async def get_session(session_id: str) -> dict | None:
    db = get_firestore_client()
    doc = await db.collection("chat_sessions").document(session_id).get()
    if doc.exists:
        return doc.to_dict()
    return None

async def save_message(session_id: str, mode: str, role: str, text: str, sources: list[str] = None):
    if not session_id:
        return
    if sources is None:
        sources = []
    
    db = get_firestore_client()
    doc_ref = db.collection("chat_sessions").document(session_id)
    doc = await doc_ref.get()
    
    now = datetime.utcnow().isoformat() + "Z"
    new_message = {
        "role": role,
        "text": text,
        "sources": sources,
        "timestamp": now
    }
    
    if not doc.exists:
        # Create new session
        title = await _generate_title(text) if role == "user" else "New Chat"
        data = {
            "session_id": session_id,
            "mode": mode,
            "topic_label": title,
            "created_at": now,
            "updated_at": now,
            "messages": [new_message]
        }
        await doc_ref.set(data)
    else:
        # Update existing session
        data = doc.to_dict()
        messages = data.get("messages", [])
        messages.append(new_message)
        await doc_ref.update({
            "messages": messages,
            "updated_at": now
        })

async def _generate_title(message: str) -> str:
    settings = get_settings()
    client = genai.Client(http_options={'timeout': 10000})
    model_name = settings.gemini_model.removeprefix("models/")
    prompt = CHAT_TITLE_PROMPT.format(message=message)
    try:
        response = client.models.generate_content(
            model=model_name,
            contents=prompt,
        )
        return (response.text or "General Inquiry").strip()
    except Exception as e:
        logger.error(f"Failed to generate title: {e}")
        return "General Inquiry"
