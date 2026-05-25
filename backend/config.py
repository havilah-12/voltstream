import os
from functools import lru_cache
from pathlib import Path

from pydantic import BaseModel


def _load_env_file(path: Path) -> None:
    if not path.exists():
        return

    for line in path.read_text(encoding="utf-8").splitlines():
        clean_line = line.strip()
        if not clean_line or clean_line.startswith("#") or "=" not in clean_line:
            continue

        key, value = clean_line.split("=", 1)
        os.environ[key.strip()] = value.strip().strip('"').strip("'")


class Settings(BaseModel):
    gemini_api_key: str = ""
    gemini_model: str = "models/gemini-2.0-flash"
    gemini_embedding_model: str = "models/gemini-embedding-001"
    chroma_collection_name: str = "voltstream_guide"
    chroma_path: str = "chroma_data"


@lru_cache
def get_settings() -> Settings:
    backend_dir = Path(__file__).resolve().parent
    project_root = backend_dir.parent
    _load_env_file(project_root / ".env")
    _load_env_file(backend_dir / ".env")

    return Settings(
        gemini_api_key=os.getenv("GEMINI_API_KEY", ""),
        gemini_model=os.getenv("GEMINI_MODEL", "") or "models/gemini-2.0-flash",
        gemini_embedding_model=os.getenv("GEMINI_EMBEDDING_MODEL", "") or "models/gemini-embedding-001",
        chroma_collection_name=os.getenv("CHROMA_COLLECTION_NAME", "") or "voltstream_guide",
        chroma_path=os.getenv("CHROMA_PATH", "") or "chroma_data",
    )
