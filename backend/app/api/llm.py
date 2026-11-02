import os
import json
import logging
from pathlib import Path
from typing import Optional
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.services.llm_service import LLMService, GeminiLLMProvider, OpenAICompatibleLLMProvider
from app.config import settings

logger = logging.getLogger(__name__)

router = APIRouter()

class LLMConfigRequest(BaseModel):
    provider: str  # "gemini", "groq", "openai", "ollama"
    api_key: str
    model_id: Optional[str] = None
    base_url: Optional[str] = None

@router.get("/llm/status", summary="Check active LLM provider, model ID, and API key configuration")
def get_llm_status():
    """
    Returns true status of conversational LLM:
    - Provider (google-gemini, groq, openai, or offline-rule-agent)
    - Model ID (e.g. gemini-2.5-flash, llama-3.3-70b-versatile, gpt-4o-mini)
    - Whether actual live LLM inference is enabled
    """
    return LLMService.get_status()

@router.post("/llm/configure", summary="Dynamically validate and connect an LLM provider at runtime")
def configure_llm(req: LLMConfigRequest):
    """
    Validates the supplied API key against the target provider with a live test probe.
    If validation succeeds, updates runtime settings and persists to backend/.env.
    """
    provider = req.provider.lower().strip()
    api_key = req.api_key.strip()
    model_id = (req.model_id or "").strip()

    if not api_key and provider != "ollama":
        raise HTTPException(status_code=400, detail="API key cannot be empty.")

    # 1. Validate with Live Test Probe
    if provider == "gemini":
        test_model = model_id or "gemini-2.5-flash"
        try:
            from google import genai
            client = genai.Client(api_key=api_key)
            test_resp = client.models.generate_content(
                model=test_model,
                contents="Hello, ping."
            )
            if not test_resp:
                raise ValueError("Empty response received from Gemini API.")
        except Exception as e:
            logger.error(f"Gemini API validation failed: {e}")
            raise HTTPException(status_code=400, detail=f"Google Gemini key validation failed: {str(e)}")

        # Update in-memory settings
        settings.LLM_PROVIDER = "gemini"
        settings.GEMINI_API_KEY = api_key
        settings.GEMINI_MODEL_ID = test_model
        os.environ["GEMINI_API_KEY"] = api_key
        os.environ["GEMINI_MODEL_ID"] = test_model
        actual_model = test_model

    elif provider in ("groq", "openai", "openrouter", "ollama"):
        base_url = (req.base_url or "").strip() or (
            "https://api.groq.com/openai/v1" if provider == "groq"
            else ("https://api.openai.com/v1" if provider == "openai" else "http://localhost:11434/v1")
        )
        test_model = model_id or (
            "llama-3.3-70b-versatile" if provider == "groq"
            else ("gpt-4o-mini" if provider == "openai" else "llama3")
        )
        import httpx
        try:
            with httpx.Client(timeout=15.0) as client:
                res = client.post(
                    f"{base_url.rstrip('/')}/chat/completions",
                    headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
                    json={"model": test_model, "messages": [{"role": "user", "content": "ping"}], "max_tokens": 5}
                )
                if res.status_code != 200:
                    err_body = res.text
                    try:
                        err_json = res.json()
                        err_body = err_json.get("error", {}).get("message", res.text)
                    except Exception:
                        pass
                    raise ValueError(f"{res.status_code} - {err_body}")
        except Exception as e:
            logger.error(f"{provider.title()} API validation failed: {e}")
            raise HTTPException(status_code=400, detail=f"{provider.title()} key validation failed: {str(e)}")

        settings.LLM_PROVIDER = provider
        if provider == "groq":
            os.environ["GROQ_API_KEY"] = api_key
            os.environ["GROQ_MODEL_ID"] = test_model
            settings.GEMINI_API_KEY = api_key
        elif provider == "openai":
            settings.OPENAI_API_KEY = api_key
            settings.OPENAI_MODEL_ID = test_model
            os.environ["OPENAI_API_KEY"] = api_key
        actual_model = test_model

    else:
        raise HTTPException(status_code=400, detail=f"Unsupported provider: '{provider}'. Choose 'gemini', 'groq', or 'openai'.")

    # 2. Persist configuration to backend/.env
    env_path = Path(__file__).resolve().parent.parent.parent / ".env"
    try:
        env_lines = []
        if env_path.is_file():
            env_lines = env_path.read_text(encoding="utf-8").splitlines()

        updated = {
            "LLM_PROVIDER": provider,
            "GEMINI_API_KEY": api_key if provider == "gemini" else "",
            "GEMINI_MODEL_ID": actual_model if provider == "gemini" else "",
            "GROQ_API_KEY": api_key if provider == "groq" else "",
            "GROQ_MODEL_ID": actual_model if provider == "groq" else "",
            "OPENAI_API_KEY": api_key if provider == "openai" else "",
            "OPENAI_MODEL_ID": actual_model if provider == "openai" else "",
        }

        new_lines = []
        seen = set()
        for line in env_lines:
            if "=" in line and not line.strip().startswith("#"):
                k = line.split("=", 1)[0].strip()
                if k in updated:
                    new_lines.append(f'{k}="{updated[k]}"')
                    seen.add(k)
                    continue
            new_lines.append(line)
        for k, v in updated.items():
            if k not in seen and v:
                new_lines.append(f'{k}="{v}"')

        env_path.write_text("\n".join(new_lines) + "\n", encoding="utf-8")
    except Exception as ex:
        logger.warning(f"Could not persist .env file: {ex}")

    return {
        "success": True,
        "message": f"Successfully connected to {provider.upper()} ({actual_model})!",
        "provider": provider,
        "model_id": actual_model,
        "is_live_llm": True
    }
