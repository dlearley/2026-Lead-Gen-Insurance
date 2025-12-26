import pytest
from datetime import datetime
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.organization import Organization
from app.models.user import User
from app.models.lead import Lead
from app.models.lead_source import LeadSource
from app.models.insurance_product import InsuranceProduct


@pytest.mark.asyncio
async def test_create_organization(db_session: AsyncSession):
    org = Organization(
        name="Test Company",
        slug="test-company",
        description="A test company",
        is_active=True
    )
    db_session.add(org)
    await db_session.commit()
    await db_session.refresh(org)
    
    assert org.id is not None
    assert org.name == "Test Company"
    assert org.slug == "test-company"
    assert org.is_active is True
    assert isinstance(org.created_at, datetime)
    assert isinstance(org.updated_at, datetime)


@pytest.mark.asyncio
async def test_create_user(db_session: AsyncSession):
    org = Organization(name="Test Org", slug="test-org", is_active=True)
    db_session.add(org)
    await db_session.commit()
    await db_session.refresh(org)
    
    user = User(
        email="test@example.com",
        hashed_password="hashedpassword123",
        first_name="Test",
        last_name="User",
        is_active=True,
        organization_id=org.id
    )
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)
    
    assert user.id is not None
    assert user.email == "test@example.com"
    assert user.first_name == "Test"
    assert user.organization_id == org.id


@pytest.mark.asyncio
async def test_create_lead(db_session: AsyncSession):
    org = Organization(name="Test Org", slug="test-org", is_active=True)
    db_session.add(org)
    await db_session.commit()
    await db_session.refresh(org)
    
    lead = Lead(
        first_name="John",
        last_name="Doe",
        email="john@example.com",
        phone="555-1234",
        city="New York",
        state="NY",
        zip_code="10001",
        status="new",
        priority="high",
        organization_id=org.id
    )
    db_session.add(lead)
    await db_session.commit()
    await db_session.refresh(lead)
    
    assert lead.id is not None
    assert lead.first_name == "John"
    assert lead.email == "john@example.com"
    assert lead.organization_id == org.id


@pytest.mark.asyncio
async def test_lead_source(db_session: AsyncSession):
    source = LeadSource(
        name="Website",
        slug="website",
        description="Website leads",
        source_type="web",
        is_active=True
    )
    db_session.add(source)
    await db_session.commit()
    await db_session.refresh(source)
    
    assert source.id is not None
    assert source.name == "Website"
    assert source.source_type == "web"


@pytest.mark.asyncio
async def test_insurance_product(db_session: AsyncSession):
    product = InsuranceProduct(
        name="Auto Insurance",
        slug="auto-insurance",
        description="Standard auto insurance",
        product_type="auto",
        coverage_amount=50000.00,
        is_active=True
    )
    db_session.add(product)
    await db_session.commit()
    await db_session.refresh(product)
    
    assert product.id is not None
    assert product.name == "Auto Insurance"
    assert product.product_type == "auto"
    assert float(product.coverage_amount) == 50000.00
