import pytest
from fastapi.testclient import TestClient
from httpx import AsyncClient, ASGITransport
import pytest_asyncio
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.main import app
from app.database import Base, get_db
from app.models import Lead, LeadSource, Campaign, User, Team


# Create in-memory SQLite database for testing
SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)

TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def override_get_db():
    database = TestingSessionLocal()
    try:
        yield database
    finally:
        database.close()


app.dependency_overrides[get_db] = override_get_db


@pytest.fixture(scope="session")
def anyio_backend():
    return "asyncio"


@pytest_asyncio.fixture
async def client():
    """Create a test client."""
    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test"
    ) as ac:
        yield ac


@pytest_asyncio.fixture
async def db_session():
    """Create a fresh database session for each test."""
    Base.metadata.create_all(bind=engine)
    session = TestingSessionLocal()
    try:
        yield session
    finally:
        session.close()
        Base.metadata.drop_all(bind=engine)


@pytest_asyncio.fixture
async def test_lead_source(db_session):
    """Create a test lead source."""
    source = LeadSource(
        name="Test Source",
        type="web_form",
        description="Test lead source"
    )
    db_session.add(source)
    db_session.commit()
    db_session.refresh(source)
    return source


@pytest_asyncio.fixture
async def test_campaign(db_session, test_lead_source):
    """Create a test campaign."""
    campaign = Campaign(
        name="Test Campaign",
        description="Test campaign",
        source_id=test_lead_source.id
    )
    db_session.add(campaign)
    db_session.commit()
    db_session.refresh(campaign)
    return campaign


@pytest_asyncio.fixture
async def test_lead(db_session, test_lead_source):
    """Create a test lead."""
    lead = Lead(
        first_name="John",
        last_name="Doe",
        email="john.doe@example.com",
        phone="+1234567890",
        company="Test Company",
        source_id=test_lead_source.id,
        status="new",
        priority="medium"
    )
    db_session.add(lead)
    db_session.commit()
    db_session.refresh(lead)
    return lead


class TestLeadEndpoints:
    """Test cases for lead API endpoints."""
    
    @pytest.mark.asyncio
    async def test_create_lead(self, client, test_lead_source):
        """Test creating a new lead."""
        lead_data = {
            "first_name": "Jane",
            "last_name": "Smith",
            "email": "jane.smith@example.com",
            "phone": "+1987654321",
            "company": "Acme Inc",
            "source_id": test_lead_source.id,
            "status": "new",
            "priority": "high"
        }
        
        response = await client.post("/api/v1/leads", json=lead_data)
        
        assert response.status_code == 201
        data = response.json()
        assert data["first_name"] == "Jane"
        assert data["last_name"] == "Smith"
        assert data["email"] == "jane.smith@example.com"
        assert data["status"] == "new"
        assert data["priority"] == "high"
    
    @pytest.mark.asyncio
    async def test_create_lead_validation_error(self, client):
        """Test creating a lead with invalid data."""
        lead_data = {
            "first_name": "",  # Empty first name should fail
            "last_name": "Doe",
            "email": "invalid-email"  # Invalid email format
        }
        
        response = await client.post("/api/v1/leads", json=lead_data)
        
        assert response.status_code == 422
    
    @pytest.mark.asyncio
    async def test_get_leads(self, client, test_lead):
        """Test getting all leads."""
        response = await client.get("/api/v1/leads")
        
        assert response.status_code == 200
        data = response.json()
        assert "items" in data
        assert "total" in data
        assert isinstance(data["items"], list)
    
    @pytest.mark.asyncio
    async def test_get_leads_with_pagination(self, client, test_lead):
        """Test getting leads with pagination."""
        response = await client.get("/api/v1/leads?page=1&page_size=10")
        
        assert response.status_code == 200
        data = response.json()
        assert data["page"] == 1
        assert data["page_size"] == 10
    
    @pytest.mark.asyncio
    async def test_get_leads_with_filters(self, client, test_lead):
        """Test getting leads with status filter."""
        response = await client.get("/api/v1/leads?status=new")
        
        assert response.status_code == 200
        data = response.json()
        for lead in data["items"]:
            assert lead["status"] == "new"
    
    @pytest.mark.asyncio
    async def test_get_lead_by_id(self, client, test_lead):
        """Test getting a single lead by ID."""
        response = await client.get(f"/api/v1/leads/{test_lead.id}")
        
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == test_lead.id
        assert data["first_name"] == test_lead.first_name
        assert data["last_name"] == test_lead.last_name
    
    @pytest.mark.asyncio
    async def test_get_lead_not_found(self, client):
        """Test getting a non-existent lead."""
        response = await client.get("/api/v1/leads/99999")
        
        assert response.status_code == 404
        assert "Lead not found" in response.json()["detail"]
    
    @pytest.mark.asyncio
    async def test_update_lead(self, client, test_lead):
        """Test updating a lead."""
        update_data = {
            "first_name": "John Updated",
            "priority": "high"
        }
        
        response = await client.put(f"/api/v1/leads/{test_lead.id}", json=update_data)
        
        assert response.status_code == 200
        data = response.json()
        assert data["first_name"] == "John Updated"
        assert data["priority"] == "high"
    
    @pytest.mark.asyncio
    async def test_delete_lead(self, client, test_lead, db_session):
        """Test deleting a lead."""
        response = await client.delete(f"/api/v1/leads/{test_lead.id}")
        
        assert response.status_code == 200
        assert "Lead deleted successfully" in response.json()["message"]
        
        # Verify lead is deleted
        get_response = await client.get(f"/api/v1/leads/{test_lead.id}")
        assert get_response.status_code == 404
    
    @pytest.mark.asyncio
    async def test_update_lead_status(self, client, test_lead):
        """Test updating lead status."""
        status_data = {
            "status": "contacted",
            "reason": "Initial call completed"
        }
        
        response = await client.put(f"/api/v1/leads/{test_lead.id}/status", json=status_data)
        
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "contacted"


class TestLeadSearch:
    """Test cases for lead search functionality."""
    
    @pytest.mark.asyncio
    async def test_search_leads(self, client, test_lead):
        """Test searching leads by query."""
        response = await client.get("/api/v1/leads/search?q=John")
        
        assert response.status_code == 200
        data = response.json()
        assert "items" in data
        for lead in data["items"]:
            assert "John" in lead["first_name"].lower() or "John" in lead["last_name"].lower()
    
    @pytest.mark.asyncio
    async def test_search_leads_by_email(self, client, test_lead):
        """Test searching leads by email."""
        response = await client.get("/api/v1/leads/search?q=john.doe@example.com")
        
        assert response.status_code == 200
        data = response.json()
        assert len(data["items"]) > 0


class TestBulkOperations:
    """Test cases for bulk operations."""
    
    @pytest.mark.asyncio
    async def test_bulk_delete_leads(self, client, test_lead, db_session):
        """Test bulk deleting leads."""
        # Create another lead
        lead2 = Lead(
            first_name="Bob",
            last_name="Wilson",
            email="bob@example.com",
            status="new"
        )
        db_session.add(lead2)
        db_session.commit()
        
        bulk_data = {
            "lead_ids": [test_lead.id, lead2.id]
        }
        
        response = await client.post("/api/v1/leads/bulk/delete", json=bulk_data)
        
        assert response.status_code == 200
        data = response.json()
        assert len(data["success"]) == 2


class TestLeadExport:
    """Test cases for lead export functionality."""
    
    @pytest.mark.asyncio
    async def test_export_leads_csv(self, client, test_lead):
        """Test exporting leads to CSV."""
        response = await client.post(
            "/api/v1/leads/export",
            json={"format": "csv"}
        )
        
        assert response.status_code == 200
        assert "data" in response.json()
    
    @pytest.mark.asyncio
    async def test_export_leads_json(self, client, test_lead):
        """Test exporting leads to JSON."""
        response = await client.post(
            "/api/v1/leads/export",
            json={"format": "json"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "data" in data


class TestLeadStats:
    """Test cases for lead statistics."""
    
    @pytest.mark.asyncio
    async def test_get_lead_stats(self, client, test_lead):
        """Test getting lead statistics."""
        response = await client.get("/api/v1/leads/stats")
        
        assert response.status_code == 200
        data = response.json()
        assert "total" in data
        assert "by_status" in data
        assert "by_priority" in data


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
