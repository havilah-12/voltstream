from pydantic import BaseModel, Field


class ChatAttachment(BaseModel):
    name: str
    content: str


class ChatRequest(BaseModel):
    question: str = Field(..., min_length=2, description="User question about energy, solar, billing, or VoltStream")
    attachments: list[ChatAttachment] = []


class ChatResponse(BaseModel):
    answer: str
    sources: list[str] = []
    used_gemini: bool = False


class ChatStatusResponse(BaseModel):
    configured: bool
    available: bool
    collection_name: str
    persist_path: str
    document_path: str
    chunk_count: int
    error: str | None = None
