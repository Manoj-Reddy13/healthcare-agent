import os
import json
import logging
from pathlib import Path
from typing import Optional
from fastapi import APIRouter, HTTPException
import httpx
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

def parse_gemini_error(status_code: int, err_text: str, model_id: str) -> str:
    """Map raw Google Gemini API errors to clear, actionable diagnostics without leaking keys."""
    try:
        err_data = json.loads(err_text)
        error_obj = err_data.get("error", {})
        msg = error_obj.get("message", "")
        status = error_obj.get("status", "")
        reason = ""
        for d in error_obj.get("details", []):
            if isinstance(d, dict) and "reason" in d:
                reason = d["reason"]

        if reason == "API_KEY_INVALID" or "API key not valid" in msg or "API_KEY_INVALID" in err_text:
            return "Invalid Gemini API key. Please check your key at Google AI Studio (aistudio.google.com/app/apikey)."
        if status == "PERMISSION_DENIED" or status_code == 403:
            return f"Permission denied for model '{model_id}'. Your project or key does not have access to this model."
        if status == "NOT_FOUND" or status_code == 404 or "not found" in msg.lower():
            return f"Model '{model_id}' was not found. Try 'gemini-1.5-flash' or verify available models in Google AI Studio."
        if status == "RESOURCE_EXHAUSTED" or status_code == 429:
            return "Google Gemini API quota exceeded or rate limit reached for this account."
        if msg:
            return f"Google Gemini Error: {msg}"
    except Exception:
        pass
    return f"Google Gemini Error ({status_code}): {err_text[:160]}"

def parse_openai_error(status_code: int, err_text: str, provider: str, model_id: str) -> str:
    """Map raw OpenAI/Groq errors to clear diagnostics."""
    try:
        err_data = json.loads(err_text)
        error_obj = err_data.get("error", {})
        msg = error_obj.get("message", "")
        code = error_obj.get("code", "")
        if code == "invalid_api_key" or "invalid api key" in msg.lower() or status_code == 401:
            return f"Invalid {provider.title()} API key. Please verify your credentials."
        if status_code == 404 or "model_not_found" in code or "does not exist" in msg.lower():
            return f"Model '{model_id}' does not exist or is not enabled on {provider.title()}."
        if status_code == 429 or "rate_limit_exceeded" in code or "quota" in msg.lower():
            return f"{provider.title()} rate limit or quota exceeded."
        if msg:
            return f"{provider.title()} Error: {msg}"
    except Exception:
        pass
    return f"{provider.title()} Error ({status_code}): {err_text[:160]}"


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

    # Mask key for safe logging
    masked_key = (api_key[:4] + "..." + api_key[-4:]) if len(api_key) > 8 else "configured"
    logger.info(f"Configuring LLM provider '{provider}' with model '{model_id}' (key: {masked_key})")

    actual_model = model_id

    # 1. Validate with Live Test Probe
    if provider == "gemini":
        test_model = model_id or "gemini-2.5-flash"
        gemini_url = f"https://generativelanguage.googleapis.com/v1beta/models/{test_model}:generateContent?key={api_key}"

        try:
            with httpx.Client(timeout=12.0) as http_client:
                res = http_client.post(
                    gemini_url,
                    headers={"Content-Type": "application/json"},
                    json={"contents": [{"parts": [{"text": "Hello, ping."}]}]}
                )
                if res.status_code != 200:
                    err_text = res.text
                    # If model not found, try gemini-1.5-flash automatically
                    if res.status_code == 404 and test_model != "gemini-1.5-flash":
                        fb_url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={api_key}"
                        fb_res = http_client.post(
                            fb_url,
                            headers={"Content-Type": "application/json"},
                            json={"contents": [{"parts": [{"text": "Hello, ping."}]}]}
                        )
                        if fb_res.status_code == 200:
                            test_model = "gemini-1.5-flash"
                        else:
                            raise HTTPException(status_code=400, detail=parse_gemini_error(res.status_code, err_text, test_model))
                    else:
                        raise HTTPException(status_code=400, detail=parse_gemini_error(res.status_code, err_text, test_model))

        except httpx.ConnectTimeout:
            raise HTTPException(status_code=504, detail="Connection to Google Gemini API timed out (12s). Please verify your internet connection.")
        except httpx.ConnectError:
            raise HTTPException(status_code=502, detail="Unable to reach Google Gemini services. Please verify your network connection or firewall.")
        except HTTPException:
            raise
        except Exception as e:
            sanitized = str(e).replace(api_key, "[REDACTED]")
            raise HTTPException(status_code=400, detail=f"Google Gemini connection check failed: {sanitized}")

        # Initialize official google-genai Client
        try:
            from google import genai
            client = genai.Client(api_key=api_key)
        except Exception as e:
            logger.warning(f"google.genai client initialization notice: {e}")

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
        try:
            with httpx.Client(timeout=12.0) as client:
                res = client.post(
                    f"{base_url.rstrip('/')}/chat/completions",
                    headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
                    json={"model": test_model, "messages": [{"role": "user", "content": "ping"}], "max_tokens": 5}
                )
                if res.status_code != 200:
                    err_msg = parse_openai_error(res.status_code, res.text, provider, test_model)
                    raise HTTPException(status_code=400, detail=err_msg)
        except httpx.ConnectTimeout:
            raise HTTPException(status_code=504, detail=f"Connection to {provider.title()} API timed out (12s).")
        except httpx.ConnectError:
            raise HTTPException(status_code=502, detail=f"Unable to reach {provider.title()} API endpoint at {base_url}.")
        except HTTPException:
            raise
        except Exception as e:
            sanitized = str(e).replace(api_key, "[REDACTED]")
            raise HTTPException(status_code=400, detail=f"{provider.title()} key validation failed: {sanitized}")

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

    provider_label = "Google Gemini" if provider == "gemini" else provider.upper()
    return {
        "success": True,
        "message": f"Successfully connected to {provider_label} ({actual_model})!",
        "provider": provider,
        "model_id": actual_model,
        "is_live_llm": True
    }
