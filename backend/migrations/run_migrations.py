"""Lead Management Database Migration

This migration creates the complete database schema for the lead management system.
Run this to create all necessary tables.
"""

from datetime import datetime
from app.database import async_engine, Base
from app.models import (
    User, Team, LeadSource, Campaign, Lead, 
    LeadActivity, LeadAssignment, LeadStatusHistory
)


async def create_tables():
    """Create all tables in the database."""
    async with async_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)


async def drop_tables():
    """Drop all tables (use with caution)."""
    async with async_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


if __name__ == "__main__":
    import asyncio
    
    async def run_migration():
        print("Creating database tables...")
        await create_tables()
        print("Tables created successfully!")
    
    asyncio.run(run_migration())
