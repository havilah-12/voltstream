from pydantic import BaseModel, Field


class ChatRequest(BaseModel):
    question: str = Field(..., min_length=2, description="User question about energy, solar, billing, or VoltStream")

    model_config = {
        "json_schema_extra": {
            "examples": [
                {"question": "How does solar reduce my bill?"},
                {"question": "Explain the dashboard in simple terms."},
            ]
        }
    }


class ChatResponse(BaseModel):
    answer: str
    sources: list[str] = []
    used_gemini: bool = False

    model_config = {
        "json_schema_extra": {
            "example": {
                "answer": (
                    "Solar panels generate electricity from sunlight, so your home can use that energy first "
                    "instead of buying the same amount from the grid. That lowers the amount you pay to the "
                    "utility company, and any extra solar power may also earn credits depending on your setup."
                ),
                "sources": [],
                "used_gemini": True,
            }
        }
    }
