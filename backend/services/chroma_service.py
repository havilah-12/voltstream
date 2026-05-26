import hashlib
import logging
from functools import lru_cache
from pathlib import Path

from config import get_settings

logger = logging.getLogger("voltstream")
KNOWLEDGE_PATH = Path(__file__).resolve().parent.parent / "data" / "energy_guide.txt"
APP_ROOT = Path(__file__).resolve().parent.parent


def _chunk_document(text: str) -> list[str]:
    return [chunk.strip() for chunk in text.split("\n\n") if chunk.strip()]


def _load_document() -> str:
    return KNOWLEDGE_PATH.read_text(encoding="utf-8")


class GeminiEmbeddingFunction:
    def __init__(self, model_name: str):
        from google import genai

        self._client = genai.Client()
        self._model_name = model_name.removeprefix("models/")

    def __call__(self, input):
        texts = [input] if isinstance(input, str) else list(input)
        embeddings = []
        for text in texts:
            result = self._client.models.embed_content(
                model=self._model_name,
                contents=text,
            )
            embeddings.append(result.embeddings[0].values)
        return embeddings


@lru_cache
def _get_collection():
    settings = get_settings()

    try:
        import chromadb
    except ImportError:
        logger.warning("ChromaDB is not installed. RAG retrieval is unavailable.")
        return None

    persist_path = Path(settings.chroma_path)
    if not persist_path.is_absolute():
        persist_path = APP_ROOT / persist_path
    persist_path.mkdir(parents=True, exist_ok=True)

    embedding_function = GeminiEmbeddingFunction(
        model_name=settings.gemini_embedding_model,
    )
    client = chromadb.PersistentClient(path=str(persist_path))

    collection = client.get_or_create_collection(
        name=settings.chroma_collection_name,
        embedding_function=embedding_function,
        metadata={"source": "voltstream_energy_guide"},
    )

    chunks = _chunk_document(_load_document())
    documents = []
    ids = []
    metadatas = []
    for index, chunk in enumerate(chunks):
        chunk_id = hashlib.sha1(chunk.encode("utf-8")).hexdigest()
        documents.append(chunk)
        ids.append(f"chunk-{index}-{chunk_id[:12]}")
        metadatas.append({"chunk_index": index, "source": "energy_guide"})

    if collection.count() == 0:
        collection.add(documents=documents, ids=ids, metadatas=metadatas)
        logger.info("Initialized Chroma collection with %s chunks", len(documents))
    else:
        logger.info("Using existing Chroma collection with %s chunks", collection.count())

    return collection


def retrieve_chroma_chunks(question: str, limit: int = 3) -> list[str]:
    collection = _get_collection()
    if collection is None:
        return []

    try:
        result = collection.query(query_texts=[question], n_results=limit)
    except Exception as exc:
        logger.warning("Chroma query failed: %s", exc)
        return []

    documents = result.get("documents", [])
    if not documents:
        return []
    return [chunk for chunk in documents[0] if chunk]
