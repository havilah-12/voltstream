import logging

from google import genai
from google.genai.types import GenerateContentConfig

from config import get_settings

logger = logging.getLogger("voltstream")

# Configure once at startup — not on every request
_settings = get_settings()

# When GOOGLE_GENAI_USE_VERTEXAI="1", this automatically uses Vertex AI via GOOGLE_APPLICATION_CREDENTIALS
_client = genai.Client(http_options={'timeout': 10000})

def ask_gemini(
    question: str,
    chunks: list[str],
    prompt_template: str,
    *,
    out_of_scope_answer: str = "",
) -> str | None:
    import time
    prompt = prompt_template.format(
        out_of_scope_answer=out_of_scope_answer,
        question=question,
        context="\n".join(chunks),
    )
    model_name = _settings.gemini_model.removeprefix("models/")
    
    max_retries = 3
    base_delay = 2
    
    for attempt in range(max_retries):
        try:
            response = _client.models.generate_content(
                model=model_name,
                contents=prompt,
                config=GenerateContentConfig(max_output_tokens=2000),
            )
            return (response.text or "").strip() or None
        except Exception as exc:
            err_str = str(exc).lower()
            if "429" in err_str or "resource_exhausted" in err_str or "timeout" in err_str:
                if attempt < max_retries - 1:
                    sleep_time = base_delay * (2 ** attempt)
                    logger.warning(f"Vertex AI rate limited or timed out. Retrying in {sleep_time}s... (Attempt {attempt + 1}/{max_retries})")
                    time.sleep(sleep_time)
                    continue
            logger.warning("Vertex AI request failed: %s", exc)
            return None
