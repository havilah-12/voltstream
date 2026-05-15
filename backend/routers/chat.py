from fastapi import APIRouter, HTTPException, Request, UploadFile
from starlette.datastructures import UploadFile as StarletteUploadFile

from schemas.chat import ChatRequest, ChatResponse, ChatStatusResponse
from services.attachment_service import extract_attachments
from services.chroma_service import get_chroma_status
from services.rag_service import answer_chat, answer_qa

router = APIRouter()


async def _build_chat_request(request: Request) -> ChatRequest:
    content_type = request.headers.get("content-type", "")

    if "multipart/form-data" in content_type:
        form = await request.form()
        question = str(form.get("question", "")).strip()
        files = [
            value
            for value in form.getlist("files")
            if isinstance(value, (UploadFile, StarletteUploadFile))
        ]
        attachments = await extract_attachments(files)
        if len(question) < 2:
            raise HTTPException(status_code=422, detail="Question must be at least 2 characters long.")
        return ChatRequest(question=question, attachments=attachments)

    payload = await request.json()
    return ChatRequest(**payload)


@router.post("/chat", response_model=ChatResponse)
async def chat(request: Request):
    return answer_chat(await _build_chat_request(request))


@router.post("/qa", response_model=ChatResponse)
async def qa(request: Request):
    return answer_qa(await _build_chat_request(request))


@router.get("/chat/status", response_model=ChatStatusResponse)
def chat_status():
    return get_chroma_status()
