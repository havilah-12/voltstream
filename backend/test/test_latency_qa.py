import os
import sys

sys.path.append(r"c:\Users\HAVILAH\Documents\TACHYON\Voltstream\voltstream\backend")
os.environ.setdefault("GOOGLE_GENAI_USE_VERTEXAI", "TRUE")

from services.rag_service import answer_qa, ChatRequest
from services.chroma_service import retrieve_chroma_chunks

chunks = retrieve_chroma_chunks("How can I reduce my cooling costs?")
print("CHROMA CHUNKS:", chunks)

res = answer_qa(ChatRequest(question="How can I reduce my cooling costs?"))
print("ANSWER QA:", res.answer)
print("SOURCES:", res.sources)
