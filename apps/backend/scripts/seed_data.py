import asyncio
from datetime import datetime, timedelta

from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import AsyncSessionLocal
from app.models.organization import Organization
from app.models.user import User
from app.models.lead_source import LeadSource
from app.models.campaign import Campaign
from app.models.insurance_product import InsuranceProduct
from app.models.lead import Lead
from app.core.logging import setup_logging, get_logger

setup_logging()
logger = get_logger(__name__)


async def seed_database():
    async with AsyncSessionLocal() as db:
        try:
            logger.info("Starting database seeding...")
            
            org1 = Organization(
                name="Acme Insurance Corp",
                slug="acme-insurance",
                description="Leading insurance provider",
                website="https://acme-insurance.example.com",
                email="info@acme-insurance.example.com",
                phone="555-0100",
                is_active=True
            )
            db.add(org1)
            await db.flush()
            
            org2 = Organization(
                name="Premier Insurance Group",
                slug="premier-insurance",
                description="Trusted insurance solutions",
                website="https://premier-insurance.example.com",
                email="contact@premier-insurance.example.com",
                phone="555-0200",
                is_active=True
            )
            db.add(org2)
            await db.flush()
            
            logger.info("Created organizations")
            
            user1 = User(
                email="admin@acme-insurance.example.com",
                hashed_password="$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5aeRZJ3rBiyCa",
                first_name="John",
                last_name="Admin",
                is_active=True,
                is_superuser=True,
                organization_id=org1.id
            )
            db.add(user1)
            
            user2 = User(
                email="agent@acme-insurance.example.com",
                hashed_password="$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5aeRZJ3rBiyCa",
                first_name="Jane",
                last_name="Agent",
                is_active=True,
                is_superuser=False,
                organization_id=org1.id
            )
            db.add(user2)
            await db.flush()
            
            logger.info("Created users")
            
            sources = [
                LeadSource(
                    name="Website Form",
                    slug="website-form",
                    description="Leads from website contact form",
                    source_type="web",
                    is_active=True
                ),
                LeadSource(
                    name="Facebook Ads",
                    slug="facebook-ads",
                    description="Leads from Facebook advertising",
                    source_type="social_media",
                    is_active=True
                ),
                LeadSource(
                    name="Google Ads",
                    slug="google-ads",
                    description="Leads from Google advertising",
                    source_type="ppc",
                    is_active=True
                ),
                LeadSource(
                    name="Referral",
                    slug="referral",
                    description="Leads from customer referrals",
                    source_type="referral",
                    is_active=True
                )
            ]
            for source in sources:
                db.add(source)
            await db.flush()
            
            logger.info("Created lead sources")
            
            products = [
                InsuranceProduct(
                    name="Auto Insurance Standard",
                    slug="auto-standard",
                    description="Standard auto insurance coverage",
                    product_type="auto",
                    coverage_amount=50000.00,
                    premium_range_min=500.00,
                    premium_range_max=2000.00,
                    is_active=True
                ),
                InsuranceProduct(
                    name="Home Insurance Premium",
                    slug="home-premium",
                    description="Premium home insurance coverage",
                    product_type="home",
                    coverage_amount=500000.00,
                    premium_range_min=1000.00,
                    premium_range_max=5000.00,
                    is_active=True
                ),
                InsuranceProduct(
                    name="Life Insurance Term",
                    slug="life-term",
                    description="Term life insurance coverage",
                    product_type="life",
                    coverage_amount=1000000.00,
                    premium_range_min=300.00,
                    premium_range_max=1500.00,
                    is_active=True
                ),
                InsuranceProduct(
                    name="Health Insurance Family",
                    slug="health-family",
                    description="Family health insurance plan",
                    product_type="health",
                    coverage_amount=100000.00,
                    premium_range_min=800.00,
                    premium_range_max=3000.00,
                    is_active=True
                )
            ]
            for product in products:
                db.add(product)
            await db.flush()
            
            logger.info("Created insurance products")
            
            campaign1 = Campaign(
                name="Spring Auto Insurance Campaign",
                slug="spring-auto-2026",
                description="Spring promotion for auto insurance",
                campaign_type="seasonal",
                status="active",
                budget=50000.00,
                start_date=datetime.now(),
                end_date=datetime.now() + timedelta(days=90),
                is_active=True,
                organization_id=org1.id
            )
            db.add(campaign1)
            
            campaign2 = Campaign(
                name="Summer Home Insurance Drive",
                slug="summer-home-2026",
                description="Summer campaign for home insurance",
                campaign_type="promotional",
                status="active",
                budget=75000.00,
                start_date=datetime.now(),
                end_date=datetime.now() + timedelta(days=120),
                is_active=True,
                organization_id=org1.id
            )
            db.add(campaign2)
            await db.flush()
            
            logger.info("Created campaigns")
            
            leads_data = [
                {
                    "first_name": "Michael",
                    "last_name": "Johnson",
                    "email": "mjohnson@example.com",
                    "phone": "555-1001",
                    "city": "New York",
                    "state": "NY",
                    "zip_code": "10001",
                    "status": "new",
                    "priority": "high",
                    "score": 85,
                    "estimated_value": 2500.00,
                    "organization_id": org1.id,
                    "lead_source_id": sources[0].id,
                    "campaign_id": campaign1.id,
                    "insurance_product_id": products[0].id
                },
                {
                    "first_name": "Sarah",
                    "last_name": "Williams",
                    "email": "swilliams@example.com",
                    "phone": "555-1002",
                    "city": "Los Angeles",
                    "state": "CA",
                    "zip_code": "90001",
                    "status": "contacted",
                    "priority": "high",
                    "score": 90,
                    "estimated_value": 5000.00,
                    "organization_id": org1.id,
                    "lead_source_id": sources[1].id,
                    "campaign_id": campaign2.id,
                    "insurance_product_id": products[1].id
                },
                {
                    "first_name": "David",
                    "last_name": "Brown",
                    "email": "dbrown@example.com",
                    "phone": "555-1003",
                    "city": "Chicago",
                    "state": "IL",
                    "zip_code": "60601",
                    "status": "qualified",
                    "priority": "medium",
                    "score": 75,
                    "estimated_value": 1500.00,
                    "organization_id": org1.id,
                    "lead_source_id": sources[2].id,
                    "insurance_product_id": products[2].id
                },
                {
                    "first_name": "Emily",
                    "last_name": "Davis",
                    "email": "edavis@example.com",
                    "phone": "555-1004",
                    "city": "Houston",
                    "state": "TX",
                    "zip_code": "77001",
                    "status": "new",
                    "priority": "low",
                    "score": 60,
                    "estimated_value": 1200.00,
                    "organization_id": org1.id,
                    "lead_source_id": sources[3].id,
                    "insurance_product_id": products[3].id
                },
                {
                    "first_name": "Robert",
                    "last_name": "Miller",
                    "email": "rmiller@example.com",
                    "phone": "555-1005",
                    "city": "Phoenix",
                    "state": "AZ",
                    "zip_code": "85001",
                    "status": "contacted",
                    "priority": "medium",
                    "score": 70,
                    "estimated_value": 1800.00,
                    "organization_id": org2.id,
                    "lead_source_id": sources[0].id,
                    "insurance_product_id": products[0].id
                }
            ]
            
            for lead_data in leads_data:
                lead = Lead(**lead_data)
                db.add(lead)
            
            await db.commit()
            logger.info(f"Created {len(leads_data)} sample leads")
            logger.info("Database seeding completed successfully!")
            
        except Exception as e:
            await db.rollback()
            logger.error(f"Error seeding database: {str(e)}")
            raise


if __name__ == "__main__":
    asyncio.run(seed_database())
