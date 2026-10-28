from fastapi import APIRouter
from app.models.chat import ChatRequest, ChatResponse
from app.agent.orchestrator import AgentOrchestrator

router = APIRouter()

@router.post("/chat", response_model=ChatResponse, summary="Natural language AI agent chat endpoint")
def chat_endpoint(payload: ChatRequest) -> ChatResponse:
    """
    Accepts natural language patient queries, invokes navigation and estimation tools,
    and returns structured hospital listings, cost estimates, or scheme records.
    """
    return AgentOrchestrator.process_message(
        message=payload.message,
        session_id=payload.session_id
    )
