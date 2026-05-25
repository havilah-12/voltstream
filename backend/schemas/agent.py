from pydantic import BaseModel, Field

# Schema: Validates the incoming JSON text request from the frontend before it reaches the router.
class AgentRequest(BaseModel):
    message: str = Field(..., min_length=2, description="Device-control instruction for the ADK agent")
