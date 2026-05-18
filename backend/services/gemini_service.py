import logging

from config import get_settings

logger = logging.getLogger("voltstream")


def ask_gemini(
    question: str,
    chunks: list[str],
    prompt_template: str,
    *,
    out_of_scope_answer: str,
) -> str | None:
    settings = get_settings()
    if not settings.gemini_api_key:
        return None

    try:
        import google.generativeai as genai

        genai.configure(api_key=settings.gemini_api_key)
        model = genai.GenerativeModel(settings.gemini_model)
        prompt = prompt_template.format(
            out_of_scope_answer=out_of_scope_answer,
            question=question,
            context=chr(10).join(chunks),
        )
        response = model.generate_content(prompt)
        return (response.text or "").strip() or None
    except Exception as exc:
        logger.warning("Gemini request failed, using local grounded answer: %s", exc)
        return None
