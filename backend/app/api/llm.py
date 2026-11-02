from fastapi import APIRouter
from app.services.llm_service import LLMService

router = APIRouter()

@router.get("/llm/status", summary="Check active LLM provider, model ID, and API key configuration")
def get_llm_status():
    """
    Returns true status of conversational LLM:
    - Provider (google-gemini or offline-rule-agent)
    - Model ID (e.g. gemini-2.5-flash)
    - Whether actual live LLM inference is enabled
    """
    return LLMService.get_status()

