import logging

from google import genai
from google.genai.types import GenerateContentConfig

from config import get_settings

logger = logging.getLogger("voltstream")

# Configure once at startup — not on every request
_settings = get_settings()

# When GOOGLE_GENAI_USE_VERTEXAI="1", this automatically uses Vertex AI via GOOGLE_APPLICATION_CREDENTIALS
_client = genai.Client()

def ask_gemini(
    question: str,
    chunks: list[str],
    prompt_template: str,
    *,
    out_of_scope_answer: str = "",
) -> str | None:
    try:
        prompt = prompt_template.format(
            out_of_scope_answer=out_of_scope_answer,
            question=question,
            context="\n".join(chunks),
        )
        model_name = _settings.gemini_model.removeprefix("models/")
        response = _client.models.generate_content(
            model=model_name,
            contents=prompt,
            config=GenerateContentConfig(max_output_tokens=300),
        )
        return (response.text or "").strip() or None
    except Exception as exc:
        logger.warning("Vertex AI request failed: %s", exc)
        return None
