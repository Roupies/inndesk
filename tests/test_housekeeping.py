import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from backend.models.room import Room
from backend.models.room_type import RoomType


def test_get_housekeeping_returns_rooms(client: TestClient, db_session: Session, admin_token: str, auth_headers):
    """Test that authenticated GET returns list with room data"""
    # Create a room type and room
    room_type = RoomType(
        name="Test Suite",
        description="Test room type",
        price_per_night=150.00,
        max_occupancy=2
    )
    db_session.add(room_type)
    db_session.commit()
    db_session.refresh(room_type)
    
    room = Room(
        number="101",
        floor=1,
        room_type_id=room_type.id,
        status="available",
        notes="Test room"
    )
    db_session.add(room)
    db_session.commit()
    
    response = client.get("/api/v1/housekeeping/", headers=auth_headers(admin_token))
    
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert len(data) >= 1
    
    room_data = data[0]
    assert room_data["number"] == "101"
    assert room_data["floor"] == 1
    assert room_data["status"] == "available"
    assert room_data["notes"] == "Test room"
    assert room_data["room_type_name"] == "Test Suite"


def test_update_room_status_success(client: TestClient, db_session: Session, admin_token: str, auth_headers):
    """Test that PATCH with valid status updates the room"""
    # Create a room type and room
    room_type = RoomType(
        name="Test Suite",
        description="Test room type", 
        price_per_night=150.00,
        max_occupancy=2
    )
    db_session.add(room_type)
    db_session.commit()
    db_session.refresh(room_type)
    
    room = Room(
        number="102",
        floor=1,
        room_type_id=room_type.id,
        status="available"
    )
    db_session.add(room)
    db_session.commit()
    db_session.refresh(room)
    
    # Update status to dirty
    response = client.patch(
        f"/api/v1/housekeeping/{room.id}",
        json={"status": "dirty"},
        headers=auth_headers(admin_token)
    )
    
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "dirty"
    
    # Verify room was actually updated in database
    db_session.refresh(room)
    assert room.status == "dirty"


def test_update_room_status_invalid_value(client: TestClient, db_session: Session, admin_token: str, auth_headers):
    """Test that PATCH with 'occupied' or unknown value returns 400"""
    # Create a room type and room
    room_type = RoomType(
        name="Test Suite",
        description="Test room type",
        price_per_night=150.00,
        max_occupancy=2
    )
    db_session.add(room_type)
    db_session.commit()
    db_session.refresh(room_type)
    
    room = Room(
        number="103",
        floor=1,
        room_type_id=room_type.id,
        status="available"
    )
    db_session.add(room)
    db_session.commit()
    db_session.refresh(room)
    
    # Try to set invalid status 'occupied'
    response = client.patch(
        f"/api/v1/housekeeping/{room.id}",
        json={"status": "occupied"},
        headers=auth_headers(admin_token)
    )
    
    assert response.status_code == 422  # Pydantic validation error
    
    # Try to set unknown status
    response = client.patch(
        f"/api/v1/housekeeping/{room.id}",
        json={"status": "unknown_status"},
        headers=auth_headers(admin_token)
    )
    
    assert response.status_code == 422  # Pydantic validation error


def test_housekeeping_requires_auth(client: TestClient):
    """Test that GET without token returns 403"""
    response = client.get("/api/v1/housekeeping/")
    
    assert response.status_code == 403
    data = response.json()
    assert "detail" in data


def test_maintenance_status_requires_admin(client: TestClient, db_session: Session, reception_token: str, auth_headers):
    """Test that setting maintenance status requires admin role"""
    # Create a room type and room
    room_type = RoomType(
        name="Test Suite",
        description="Test room type",
        price_per_night=150.00,
        max_occupancy=2
    )
    db_session.add(room_type)
    db_session.commit()
    db_session.refresh(room_type)
    
    room = Room(
        number="104",
        floor=1,
        room_type_id=room_type.id,
        status="available"
    )
    db_session.add(room)
    db_session.commit()
    db_session.refresh(room)
    
    # Try to set maintenance status as non-admin (receptionist)
    response = client.patch(
        f"/api/v1/housekeeping/{room.id}",
        json={"status": "maintenance"},
        headers=auth_headers(reception_token)  # This is receptionist, not admin
    )
    
    assert response.status_code == 403
    data = response.json()
    assert "administrateur" in data["detail"].lower()


def test_update_room_status_room_not_found(client: TestClient, admin_token: str, auth_headers):
    """Test updating status for non-existent room returns 404"""
    response = client.patch(
        "/api/v1/housekeeping/99999",
        json={"status": "dirty"},
        headers=auth_headers(admin_token)
    )
    
    assert response.status_code == 404
    data = response.json()
    assert "non trouvée" in data["detail"]