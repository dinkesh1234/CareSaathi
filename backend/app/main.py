"""CareSaathi Backend API.

Family Health & Care Coordination Platform.
Entry point for the FastAPI application with health check and error handling.
"""

from datetime import datetime, timezone
import logging
from typing import Any, Dict

from fastapi import FastAPI, HTTPException, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.routers import ai, auth, integrations, profiles

# Setup basic logging for observability
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("caresathi")

# Initialize FastAPI application with informative metadata
app = FastAPI(
    title="CareSaathi API",
    description="Backend services for the CareSaathi Family Health & Care Coordination Platform.",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

# Configure Cross-Origin Resource Sharing (CORS)
# This allows the frontend (HTML/JS) running on local dev servers to interact with this API.
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost",
        "http://localhost:3000",
        "http://localhost:5500",
        "http://localhost:8080",
        "http://127.0.0.1",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:5500",
        "http://127.0.0.1:8080",
        "null",  # Supports opening index.html directly from file:// in local browsers
    ],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)


# --- Schemas ---
class HealthResponse(BaseModel):
    """Schema for system health check response."""

    status: str = Field(default="healthy", description="Current service health state")
    service: str = Field(default="CareSaathi API", description="Name of the service")
    version: str = Field(default="1.0.0", description="API version")
    timestamp: str = Field(..., description="UTC ISO-8601 timestamp of response")


# --- Exception Handlers ---
@app.exception_handler(StarletteHTTPException)
async def http_exception_handler(request: Request, exc: StarletteHTTPException) -> JSONResponse:
    """Handle known HTTP exceptions (including 404, 405) with consistent JSON response structure."""
    logger.warning("HTTPException [%s] on path %s: %s", exc.status_code, request.url.path, exc.detail)
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "success": False,
            "error": {
                "code": exc.status_code,
                "message": exc.detail,
            },
        },
    )


@app.exception_handler(Exception)
async def generic_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    """Catch-all error handler for unexpected server errors.

    Prevents raw stack traces from leaking to clients while logging full details.
    """
    logger.exception("Unhandled server error on %s: %s", request.url.path, exc)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "success": False,
            "error": {
                "code": 500,
                "message": "An internal server error occurred. Please try again later.",
            },
        },
    )


# --- Endpoints ---
@app.get("/", summary="API Root", tags=["Health"])
async def root_info() -> Dict[str, Any]:
    """Root metadata endpoint directing clients to documentation and health check."""
    return {
        "service": "CareSaathi API",
        "version": "1.0.0",
        "status": "operational",
        "health_check": "/api/health",
        "documentation": "/docs",
    }


@app.get(
    "/api/health",
    response_model=HealthResponse,
    status_code=status.HTTP_200_OK,
    summary="System Health Check",
    tags=["Health"],
)
async def health_check() -> Dict[str, Any]:
    """Check the health and operational status of the CareSaathi API.

    Returns:
        JSON object containing service name, version, status, and UTC timestamp.
    """
    return {
        "status": "healthy",
        "service": "CareSaathi API",
        "version": "1.0.0",
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }


# Register Application Routers
app.include_router(auth.router)
app.include_router(profiles.router)
app.include_router(ai.router)
app.include_router(integrations.router)
