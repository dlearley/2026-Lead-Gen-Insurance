from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.database import init_db
from app.api.v1.ml import ml_router


def create_app() -> FastAPI:
    """Create and configure the FastAPI application."""
    app = FastAPI(
        title=settings.app_name,
        description=settings.description,
        version=settings.version,
        docs_url="/api/docs",
        redoc_url="/api/redoc",
        openapi_url="/api/openapi.json"
    )
    
    # CORS middleware
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    
    # Include routers
    app.include_router(ml_router, prefix=f"{settings.api_v1_prefix}/ml")
    
    # Health check endpoint
    @app.get("/health")
    async def health_check():
        return {"status": "healthy", "version": settings.version}
    
    # Startup event
    @app.on_event("startup")
    async def startup_event():
        await init_db()
    
    return app


app = create_app()
