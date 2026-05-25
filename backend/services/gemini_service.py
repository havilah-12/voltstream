import logging

import google.generativeai as genai

from config import get_settings

logger = logging.getLogger("voltstream")

# Configure once at startup — not on every request
_settings = get_settings()
genai.configure(api_key=_settings.gemini_api_key)
_model = genai.GenerativeModel(_settings.gemini_model)


def ask_gemini(
    question: str,
    chunks: list[str],
    prompt_template: str,
    *,
    out_of_scope_answer: str = "",
) -> str | None:
    if not _settings.gemini_api_key:
        return None
    try:
        prompt = prompt_template.format(
            out_of_scope_answer=out_of_scope_answer,
            question=question,
            context="\n".join(chunks),
        )
        response = _model.generate_content(prompt)
        return (response.text or "").strip() or None
    except Exception as exc:
        logger.warning("Gemini request failed: %s", exc)
        return None
