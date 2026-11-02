from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.api import api_router
from app.services.llm_service import LLMService

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="Full-stack AI healthcare care and cost navigation agent backend."
)

# CORS configuration for frontend local dev origins
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include core /api routes
app.include_router(api_router, prefix=settings.API_PREFIX)

@app.get("/api/health", tags=["Health"])
@app.get("/health", tags=["Health"])
def health_check():
    llm_info = LLMService.get_status()
    return {
        "status": "healthy",
        "service": "healthcare-agent-backend",
        "version": settings.VERSION,
        "llm_provider": llm_info["active_provider"],
        "model_id": llm_info["model_id"],
        "is_live_llm": llm_info["is_live_llm"],
        "mock_mode": not llm_info["is_live_llm"]
    }

@app.get("/", tags=["Root"])
def root():
    return {
        "message": "Healthcare Cost and Care Navigation Agent API",
        "docs_url": "/docs",
        "health_url": "/api/health"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
