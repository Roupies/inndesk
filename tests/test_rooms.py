from decimal import Decimal
from datetime import date, timedelta


def test_create_room_type(client, admin_token, auth_headers):
    """Test admin can create room type"""
    headers = auth_headers(admin_token)
    
    room_type_data = {
        "name": "Standard Test",
        "description": "Test room type",
        "price_per_night": "89.00",
        "max_occupancy": 2
    }
    
    response = client.post("/api/v1/room-types/", json=room_type_data, headers=headers)
    
    assert response.status_code == 201
    data = response.json()
    assert data["name"] == room_type_data["name"]
    assert data["description"] == room_type_data["description"]
    assert Decimal(data["price_per_night"]) == Decimal("89.00")
    assert data["max_occupancy"] == 2
    assert "id" in data


def test_create_room_type_receptionist(client, reception_token, auth_headers):
    """Test receptionist cannot create room type (403)"""
    headers = auth_headers(reception_token)
    
    room_type_data = {
        "name": "Standard Test",
        "description": "Test room type",
        "price_per_night": "89.00",
        "max_occupancy": 2
    }
    
    response = client.post("/api/v1/room-types/", json=room_type_data, headers=headers)
    
    assert response.status_code == 403


def test_create_room(client, admin_token, auth_headers):
    """Test admin can create room"""
    headers = auth_headers(admin_token)
    
    # First create a room type
    room_type_data = {
        "name": "Test Type",
        "description": "Test room type",
        "price_per_night": "100.00",
        "max_occupancy": 2
    }
    
    room_type_response = client.post("/api/v1/room-types/", json=room_type_data, headers=headers)
    assert room_type_response.status_code == 201
    room_type = room_type_response.json()
    room_type_id = room_type["id"]
    
    # Now create a room
    room_data = {
        "number": "101",
        "floor": 1,
        "room_type_id": room_type_id,
        "status": "available"
    }
    
    response = client.post("/api/v1/rooms/", json=room_data, headers=headers)
    
    assert response.status_code == 201
    data = response.json()
    assert data["number"] == "101"
    assert data["floor"] == 1
    assert data["room_type_id"] == room_type_id
    assert data["status"] == "available"
    assert "id" in data


def test_create_room_duplicate_number(client, admin_token, auth_headers):
    """Test creating room with duplicate number returns 400"""
    headers = auth_headers(admin_token)
    
    # First create a room type
    room_type_data = {
        "name": "Test Type",
        "description": "Test room type",
        "price_per_night": "100.00",
        "max_occupancy": 2
    }
    
    room_type_response = client.post("/api/v1/room-types/", json=room_type_data, headers=headers)
    room_type = room_type_response.json()
    room_type_id = room_type["id"]
    
    # Create first room
    room_data = {
        "number": "102",
        "floor": 1,
        "room_type_id": room_type_id,
        "status": "available"
    }
    
    response1 = client.post("/api/v1/rooms/", json=room_data, headers=headers)
    assert response1.status_code == 201
    
    # Try to create room with same number
    room_data2 = {
        "number": "102",  # Same number
        "floor": 2,
        "room_type_id": room_type_id,
        "status": "available"
    }
    
    response2 = client.post("/api/v1/rooms/", json=room_data2, headers=headers)
    assert response2.status_code == 400
    assert "numéro existe déjà" in response2.json()["detail"]


def test_list_rooms(client, admin_token, auth_headers):
    """Test listing rooms includes room_type nested"""
    headers = auth_headers(admin_token)
    
    # Create room type and room
    room_type_data = {
        "name": "Deluxe Test",
        "description": "Test deluxe room",
        "price_per_night": "150.00",
        "max_occupancy": 3
    }
    
    room_type_response = client.post("/api/v1/room-types/", json=room_type_data, headers=headers)
    room_type = room_type_response.json()
    
    room_data = {
        "number": "201",
        "floor": 2,
        "room_type_id": room_type["id"],
        "status": "available"
    }
    
    room_response = client.post("/api/v1/rooms/", json=room_data, headers=headers)
    assert room_response.status_code == 201
    
    # List rooms
    response = client.get("/api/v1/rooms/", headers=headers)
    
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    
    # Find our created room
    created_room = next((r for r in data if r["number"] == "201"), None)
    assert created_room is not None
    assert "room_type" in created_room
    assert created_room["room_type"]["name"] == "Deluxe Test"


def test_filter_rooms_by_status(client, admin_token, auth_headers):
    """Test filtering rooms by status"""
    headers = auth_headers(admin_token)
    
    # Create room type
    room_type_data = {
        "name": "Filter Test Type",
        "description": "Test room type for filtering",
        "price_per_night": "80.00",
        "max_occupancy": 2
    }
    
    room_type_response = client.post("/api/v1/room-types/", json=room_type_data, headers=headers)
    room_type = room_type_response.json()
    
    # Create rooms with different statuses
    room1_data = {
        "number": "301",
        "floor": 3,
        "room_type_id": room_type["id"],
        "status": "available"
    }
    
    room2_data = {
        "number": "302",
        "floor": 3,
        "room_type_id": room_type["id"],
        "status": "maintenance"
    }
    
    client.post("/api/v1/rooms/", json=room1_data, headers=headers)
    client.post("/api/v1/rooms/", json=room2_data, headers=headers)
    
    # Filter by available status
    response = client.get("/api/v1/rooms/?status=available", headers=headers)
    
    assert response.status_code == 200
    data = response.json()
    
    # All returned rooms should have available status
    for room in data:
        assert room["status"] == "available"
    
    # Should include room 301
    room_numbers = [room["number"] for room in data]
    assert "301" in room_numbers
    assert "302" not in room_numbers


def test_future_availability_ignores_current_housekeeping_status(
    client, admin_token, reception_token, auth_headers
):
    """Dirty/occupied rooms remain sellable; maintenance rooms do not."""
    admin_headers = auth_headers(admin_token)
    reception_headers = auth_headers(reception_token)

    room_type = client.post(
        "/api/v1/room-types/",
        headers=admin_headers,
        json={
            "name": "Future Availability Type",
            "description": "Current condition must not block future sales",
            "price_per_night": "100.00",
            "max_occupancy": 2,
        },
    ).json()

    expected_numbers = {"FUT-DIRTY", "FUT-CLEAN", "FUT-OCC"}
    for number, room_status in (
        ("FUT-DIRTY", "dirty"),
        ("FUT-CLEAN", "cleaning"),
        ("FUT-OCC", "occupied"),
        ("FUT-MAINT", "maintenance"),
    ):
        response = client.post(
            "/api/v1/rooms/",
            headers=admin_headers,
            json={
                "number": number,
                "floor": 1,
                "room_type_id": room_type["id"],
                "status": room_status,
            },
        )
        assert response.status_code == 201

    check_in = date.today() + timedelta(days=30)
    check_out = check_in + timedelta(days=2)
    response = client.get(
        "/api/v1/rooms/available/",
        headers=reception_headers,
        params={
            "room_type_id": room_type["id"],
            "check_in": str(check_in),
            "check_out": str(check_out),
        },
    )

    assert response.status_code == 200
    assert {room["number"] for room in response.json()} == expected_numbers


def test_delete_room_type_with_rooms(client, admin_token, auth_headers):
    """Test deleting room type that has rooms returns 400"""
    headers = auth_headers(admin_token)
    
    # Create room type
    room_type_data = {
        "name": "To Delete Type",
        "description": "Room type to be deleted",
        "price_per_night": "120.00",
        "max_occupancy": 2
    }
    
    room_type_response = client.post("/api/v1/room-types/", json=room_type_data, headers=headers)
    room_type = room_type_response.json()
    room_type_id = room_type["id"]
    
    # Create a room using this room type
    room_data = {
        "number": "999",
        "floor": 9,
        "room_type_id": room_type_id,
        "status": "available"
    }
    
    room_response = client.post("/api/v1/rooms/", json=room_data, headers=headers)
    assert room_response.status_code == 201
    
    # Try to delete the room type
    response = client.delete(f"/api/v1/room-types/{room_type_id}", headers=headers)
    
    assert response.status_code == 400
    assert "utilisé par des chambres" in response.json()["detail"]
