import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.organization import Organization


@pytest.fixture
async def test_organization(db_session: AsyncSession) -> Organization:
    org = Organization(
        name="Test Organization",
        slug="test-org",
        description="Test organization for testing",
        is_active=True
    )
    db_session.add(org)
    await db_session.commit()
    await db_session.refresh(org)
    return org


@pytest.mark.asyncio
async def test_create_lead(client: AsyncClient, test_organization: Organization):
    lead_data = {
        "first_name": "John",
        "last_name": "Doe",
        "email": "john.doe@example.com",
        "phone": "555-1234",
        "city": "New York",
        "state": "NY",
        "zip_code": "10001",
        "status": "new",
        "priority": "high",
        "organization_id": test_organization.id
    }
    
    response = await client.post("/api/v1/leads", json=lead_data)
    assert response.status_code == 201
    data = response.json()
    assert data["first_name"] == "John"
    assert data["last_name"] == "Doe"
    assert data["email"] == "john.doe@example.com"
    assert "id" in data
    assert "created_at" in data


@pytest.mark.asyncio
async def test_get_lead(client: AsyncClient, test_organization: Organization):
    lead_data = {
        "first_name": "Jane",
        "last_name": "Smith",
        "email": "jane.smith@example.com",
        "organization_id": test_organization.id
    }
    
    create_response = await client.post("/api/v1/leads", json=lead_data)
    assert create_response.status_code == 201
    lead_id = create_response.json()["id"]
    
    response = await client.get(f"/api/v1/leads/{lead_id}")
    assert response.status_code == 200
    data = response.json()
    assert data["id"] == lead_id
    assert data["first_name"] == "Jane"
    assert data["last_name"] == "Smith"


@pytest.mark.asyncio
async def test_get_lead_not_found(client: AsyncClient):
    response = await client.get("/api/v1/leads/99999")
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_list_leads(client: AsyncClient, test_organization: Organization):
    leads_data = [
        {
            "first_name": f"User{i}",
            "last_name": "Test",
            "email": f"user{i}@example.com",
            "organization_id": test_organization.id
        }
        for i in range(3)
    ]
    
    for lead_data in leads_data:
        await client.post("/api/v1/leads", json=lead_data)
    
    response = await client.get("/api/v1/leads")
    assert response.status_code == 200
    data = response.json()
    assert data["total"] >= 3
    assert len(data["leads"]) >= 3
    assert "page" in data
    assert "page_size" in data


@pytest.mark.asyncio
async def test_update_lead(client: AsyncClient, test_organization: Organization):
    lead_data = {
        "first_name": "Original",
        "last_name": "Name",
        "email": "original@example.com",
        "organization_id": test_organization.id
    }
    
    create_response = await client.post("/api/v1/leads", json=lead_data)
    lead_id = create_response.json()["id"]
    
    update_data = {
        "first_name": "Updated",
        "status": "contacted"
    }
    
    response = await client.put(f"/api/v1/leads/{lead_id}", json=update_data)
    assert response.status_code == 200
    data = response.json()
    assert data["first_name"] == "Updated"
    assert data["status"] == "contacted"
    assert data["last_name"] == "Name"


@pytest.mark.asyncio
async def test_delete_lead(client: AsyncClient, test_organization: Organization):
    lead_data = {
        "first_name": "Delete",
        "last_name": "Me",
        "email": "delete@example.com",
        "organization_id": test_organization.id
    }
    
    create_response = await client.post("/api/v1/leads", json=lead_data)
    lead_id = create_response.json()["id"]
    
    response = await client.delete(f"/api/v1/leads/{lead_id}")
    assert response.status_code == 204
    
    get_response = await client.get(f"/api/v1/leads/{lead_id}")
    assert get_response.status_code == 404
