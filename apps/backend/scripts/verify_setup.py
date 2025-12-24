import asyncio
import sys
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

sys.path.insert(0, '/home/engine/project')

from app.db.session import AsyncSessionLocal
from app.core.logging import setup_logging, get_logger

setup_logging()
logger = get_logger(__name__)


async def verify_database_connection():
    logger.info("Testing database connection...")
    try:
        async with AsyncSessionLocal() as db:
            result = await db.execute(text("SELECT 1"))
            assert result.scalar_one() == 1
        logger.info("✓ Database connection successful")
        return True
    except Exception as e:
        logger.error(f"✗ Database connection failed: {str(e)}")
        return False


async def verify_tables_exist():
    logger.info("Checking if tables exist...")
    tables = [
        "organizations",
        "users",
        "leads",
        "lead_sources",
        "campaigns",
        "insurance_products"
    ]
    
    try:
        async with AsyncSessionLocal() as db:
            for table in tables:
                result = await db.execute(
                    text(f"SELECT COUNT(*) FROM {table}")
                )
                count = result.scalar_one()
                logger.info(f"  ✓ Table '{table}' exists with {count} records")
        logger.info("✓ All tables exist")
        return True
    except Exception as e:
        logger.error(f"✗ Table verification failed: {str(e)}")
        return False


async def verify_sample_data():
    logger.info("Verifying sample data...")
    try:
        async with AsyncSessionLocal() as db:
            result = await db.execute(text("SELECT COUNT(*) FROM leads"))
            lead_count = result.scalar_one()
            
            if lead_count > 0:
                logger.info(f"✓ Found {lead_count} sample leads")
                return True
            else:
                logger.warning("⚠ No sample leads found. Run 'make seed' to create sample data.")
                return True
    except Exception as e:
        logger.error(f"✗ Sample data verification failed: {str(e)}")
        return False


async def main():
    logger.info("=" * 60)
    logger.info("Lead Generation Insurance Platform - Setup Verification")
    logger.info("=" * 60)
    
    results = []
    
    results.append(await verify_database_connection())
    results.append(await verify_tables_exist())
    results.append(await verify_sample_data())
    
    logger.info("=" * 60)
    if all(results):
        logger.info("✓ All verification checks passed!")
        logger.info("=" * 60)
        logger.info("")
        logger.info("Your backend is ready! You can now:")
        logger.info("  1. Run the API: make run")
        logger.info("  2. View docs: http://localhost:8000/docs")
        logger.info("  3. Run tests: make test")
        logger.info("")
        return 0
    else:
        logger.error("✗ Some verification checks failed")
        logger.info("=" * 60)
        return 1


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
