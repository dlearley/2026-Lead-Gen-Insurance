from fastapi import APIRouter

from app.api.v1 import health, leads

api_router = APIRouter()

api_router.include_router(health.router, tags=["health"])
api_router.include_router(leads.router, prefix="/api/v1", tags=["leads"])
