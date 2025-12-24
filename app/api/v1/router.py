from fastapi import APIRouter

from app.api.v1 import health, leads, auth, users, organizations, teams

api_router = APIRouter()

api_router.include_router(health.router, prefix="/health", tags=["health"])
api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(users.router, prefix="/users", tags=["users"])
api_router.include_router(organizations.router, prefix="/organizations", tags=["organizations"])
api_router.include_router(teams.router, prefix="/teams", tags=["teams"])
api_router.include_router(leads.router, prefix="/leads", tags=["leads"])
