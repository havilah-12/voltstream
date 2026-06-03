import hashlib
import logging
from functools import lru_cache
from pathlib import Path

from config import get_settings

logger = logging.getLogger("voltstream")
DATA_DIR = Path(__file__).resolve().parent.parent / "data" / "knowledge_base"
APP_ROOT = Path(__file__).resolve().parent.parent

def _chunk_text(text: str) -> list[str]:
    # Basic chunking: split by double newlines or single newlines if they are long enough
    return [chunk.strip() for chunk in text.split("\n") if len(chunk.strip()) > 50]

def _load_documents() -> list[dict]:
    import pypdf
    docs = []
    for pdf_file in DATA_DIR.glob("*.pdf"):
        try:
            reader = pypdf.PdfReader(str(pdf_file))
            text = ""
            for page in reader.pages:
                text += page.extract_text() + "\n"
            docs.append({"filename": pdf_file.name, "content": text})
        except Exception as e:
            logger.error(f"Error reading {pdf_file.name}: {e}")
            
    for txt_file in DATA_DIR.glob("*.txt"):
        try:
            with open(txt_file, "r", encoding="utf-8") as f:
                docs.append({"filename": txt_file.name, "content": f.read()})
        except Exception as e:
            logger.error(f"Error reading {txt_file.name}: {e}")
            
    return docs

import chromadb
from chromadb.api.types import Documents, Embeddings

class GeminiEmbeddingFunction(chromadb.EmbeddingFunction):
    def __init__(self, model_name: str):
        from google import genai
        self._client = genai.Client()
        self._model_name = model_name.removeprefix("models/")

    def __call__(self, input: Documents) -> Embeddings:
        try:
            texts = [input] if isinstance(input, str) else list(input)
            result = self._client.models.embed_content(
                model=self._model_name,
                contents=texts,
            )
            return [list(e.values) for e in result.embeddings]
        except Exception as e:
            logger.error(f"Embedding failed: {e}")
            raise

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
    from chromadb.config import Settings
    client = chromadb.PersistentClient(
        path=str(persist_path),
        settings=Settings(anonymized_telemetry=False)
    )
    
    # Recreate the collection to ensure fresh PDF data is indexed
    try:
        client.delete_collection(name=settings.chroma_collection_name)
    except Exception:
        pass

    collection = client.create_collection(
        name=settings.chroma_collection_name,
        metadata={"source": "voltstream_energy_guide"},
    )

    docs = _load_documents()
    documents = []
    ids = []
    metadatas = []
    
    global_index = 0
    for doc in docs:
        chunks = _chunk_text(doc["content"])
        for chunk in chunks:
            chunk_id = hashlib.sha1(chunk.encode("utf-8")).hexdigest()
            documents.append(chunk)
            ids.append(f"chunk-{global_index}-{chunk_id[:12]}")
            metadatas.append({"chunk_index": global_index, "source": doc["filename"]})
            global_index += 1

    if documents:
        # Add in batches to avoid payload size issues
        batch_size = 100
        for i in range(0, len(documents), batch_size):
            batch_docs = documents[i:i+batch_size]
            batch_embeddings = embedding_function(batch_docs)
            collection.add(
                documents=batch_docs, 
                ids=ids[i:i+batch_size], 
                metadatas=metadatas[i:i+batch_size],
                embeddings=batch_embeddings
            )
        logger.info("Initialized Chroma collection with %s chunks from %s documents", len(documents), len(docs))
    else:
        logger.warning("No PDF or TXT documents found or chunks generated.")

    return collection


def retrieve_chroma_chunks(question: str, limit: int = 3) -> list[str]:
    collection = _get_collection()
    if collection is None:
        return []

    try:
        settings = get_settings()
        embedding_function = GeminiEmbeddingFunction(
            model_name=settings.gemini_embedding_model,
        )
        query_embeddings = embedding_function([question])
        result = collection.query(query_embeddings=query_embeddings, n_results=limit)
    except Exception as exc:
        logger.warning("Chroma query failed: %s", exc)
        return []

    documents = result.get("documents", [])
    if not documents:
        return []
    return [chunk for chunk in documents[0] if chunk]
