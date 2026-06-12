from datetime import date, timedelta


def test_create_reservation(client, admin_token, reception_token, auth_headers):
    """Test creating a valid reservation"""
    admin_headers = auth_headers(admin_token)
    reception_headers = auth_headers(reception_token)
    
    # Create room type and room
    room_type_data = {
        "name": "Test Type",
        "description": "Test room type",
        "price_per_night": "100.00",
        "max_occupancy": 2
    }
    
    room_type_response = client.post("/api/v1/room-types/", json=room_type_data, headers=admin_headers)
    room_type = room_type_response.json()
    
    room_data = {
        "number": "RES01",
        "floor": 1,
        "room_type_id": room_type["id"],
        "status": "available"
    }
    
    room_response = client.post("/api/v1/rooms/", json=room_data, headers=admin_headers)
    room = room_response.json()
    
    # Create client
    client_data = {
        "first_name": "Reservation",
        "last_name": "Test",
        "email": "reservation.test@test.com",
    }
    
    client_response = client.post("/api/v1/clients/", json=client_data, headers=reception_headers)
    test_client = client_response.json()
    
    # Create reservation
    today = date.today()
    reservation_data = {
        "client_id": test_client["id"],
        "room_id": room["id"],
        "check_in_date": str(today + timedelta(days=1)),
        "check_out_date": str(today + timedelta(days=3)),
        "adults": 2,
        "children": 0,
        "total_amount": "200.00",
        "status": "confirmed",
        "notes": "Test reservation"
    }
    
    response = client.post("/api/v1/reservations/", json=reservation_data, headers=reception_headers)
    
    assert response.status_code == 201
    data = response.json()
    assert data["client_id"] == test_client["id"]
    assert data["room_id"] == room["id"]
    assert data["check_in_date"] == str(today + timedelta(days=1))
    assert data["check_out_date"] == str(today + timedelta(days=3))
    assert data["adults"] == 2
    assert data["children"] == 0
    assert data["total_amount"] == "200.00"
    assert data["status"] == "confirmed"
    assert data["notes"] == "Test reservation"
    assert "id" in data
    assert "created_at" in data


def test_create_reservation_invalid_dates(client, admin_token, reception_token, auth_headers):
    """Test creating reservation with check_out <= check_in returns 400"""
    admin_headers = auth_headers(admin_token)
    reception_headers = auth_headers(reception_token)
    
    # Create room type, room, and client
    room_type_data = {
        "name": "Invalid Dates Type",
        "description": "Test room type",
        "price_per_night": "100.00",
        "max_occupancy": 2
    }
    
    room_type_response = client.post("/api/v1/room-types/", json=room_type_data, headers=admin_headers)
    room_type = room_type_response.json()
    
    room_data = {
        "number": "INVALID01",
        "floor": 1,
        "room_type_id": room_type["id"],
        "status": "available"
    }
    
    room_response = client.post("/api/v1/rooms/", json=room_data, headers=admin_headers)
    room = room_response.json()
    
    client_data = {
        "first_name": "Invalid",
        "last_name": "Dates",
        "email": "invalid.dates@test.com",
    }
    
    client_response = client.post("/api/v1/clients/", json=client_data, headers=reception_headers)
    test_client = client_response.json()
    
    # Try to create reservation with same check-in and check-out dates
    today = date.today()
    reservation_data = {
        "client_id": test_client["id"],
        "room_id": room["id"],
        "check_in_date": str(today + timedelta(days=1)),
        "check_out_date": str(today + timedelta(days=1)),  # Same date!
        "adults": 1,
        "children": 0,
        "total_amount": "100.00",
        "status": "confirmed"
    }
    
    response = client.post("/api/v1/reservations/", json=reservation_data, headers=reception_headers)
    
    assert response.status_code == 400
    assert "date de départ doit être postérieure" in response.json()["detail"]


def test_create_reservation_conflict(client, admin_token, reception_token, auth_headers):
    """Test creating overlapping reservations returns 409"""
    admin_headers = auth_headers(admin_token)
    reception_headers = auth_headers(reception_token)
    
    # Create room type, room, and clients
    room_type_data = {
        "name": "Conflict Type",
        "description": "Test room type",
        "price_per_night": "100.00",
        "max_occupancy": 2
    }
    
    room_type_response = client.post("/api/v1/room-types/", json=room_type_data, headers=admin_headers)
    room_type = room_type_response.json()
    
    room_data = {
        "number": "CONFLICT01",
        "floor": 1,
        "room_type_id": room_type["id"],
        "status": "available"
    }
    
    room_response = client.post("/api/v1/rooms/", json=room_data, headers=admin_headers)
    room = room_response.json()
    
    client1_data = {
        "first_name": "First",
        "last_name": "Client",
        "email": "first.client@test.com",
    }
    
    client2_data = {
        "first_name": "Second",
        "last_name": "Client",
        "email": "second.client@test.com",
    }
    
    client1_response = client.post("/api/v1/clients/", json=client1_data, headers=reception_headers)
    client2_response = client.post("/api/v1/clients/", json=client2_data, headers=reception_headers)
    test_client1 = client1_response.json()
    test_client2 = client2_response.json()
    
    # Create first reservation
    today = date.today()
    reservation1_data = {
        "client_id": test_client1["id"],
        "room_id": room["id"],
        "check_in_date": str(today + timedelta(days=1)),
        "check_out_date": str(today + timedelta(days=3)),
        "adults": 1,
        "children": 0,
        "total_amount": "200.00",
        "status": "confirmed"
    }
    
    response1 = client.post("/api/v1/reservations/", json=reservation1_data, headers=reception_headers)
    assert response1.status_code == 201
    
    # Try to create overlapping reservation
    reservation2_data = {
        "client_id": test_client2["id"],
        "room_id": room["id"],  # Same room
        "check_in_date": str(today + timedelta(days=2)),  # Overlaps with first reservation
        "check_out_date": str(today + timedelta(days=4)),
        "adults": 1,
        "children": 0,
        "total_amount": "200.00",
        "status": "confirmed"
    }
    
    response2 = client.post("/api/v1/reservations/", json=reservation2_data, headers=reception_headers)
    
    assert response2.status_code == 409
    assert "chambre est déjà réservée" in response2.json()["detail"]


def test_list_reservations_with_nested(client, admin_token, reception_token, auth_headers):
    """Test listing reservations includes client and room nested data"""
    admin_headers = auth_headers(admin_token)
    reception_headers = auth_headers(reception_token)
    
    # Create room type, room, and client
    room_type_data = {
        "name": "Nested Type",
        "description": "Test room type",
        "price_per_night": "100.00",
        "max_occupancy": 2
    }
    
    room_type_response = client.post("/api/v1/room-types/", json=room_type_data, headers=admin_headers)
    room_type = room_type_response.json()
    
    room_data = {
        "number": "NESTED01",
        "floor": 1,
        "room_type_id": room_type["id"],
        "status": "available"
    }
    
    room_response = client.post("/api/v1/rooms/", json=room_data, headers=admin_headers)
    room = room_response.json()
    
    client_data = {
        "first_name": "Nested",
        "last_name": "Test",
        "email": "nested.test@test.com",
    }
    
    client_response = client.post("/api/v1/clients/", json=client_data, headers=reception_headers)
    test_client = client_response.json()
    
    # Create reservation
    today = date.today()
    reservation_data = {
        "client_id": test_client["id"],
        "room_id": room["id"],
        "check_in_date": str(today + timedelta(days=1)),
        "check_out_date": str(today + timedelta(days=3)),
        "adults": 1,
        "children": 0,
        "total_amount": "200.00",
        "status": "confirmed"
    }
    
    reservation_response = client.post("/api/v1/reservations/", json=reservation_data, headers=reception_headers)
    assert reservation_response.status_code == 201
    
    # List reservations
    response = client.get("/api/v1/reservations/", headers=reception_headers)
    
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    
    # Find our created reservation
    created_reservation = next((r for r in data if r["room_id"] == room["id"]), None)
    assert created_reservation is not None
    
    # Check nested data
    assert "client" in created_reservation
    assert created_reservation["client"]["first_name"] == "Nested"
    assert created_reservation["client"]["last_name"] == "Test"
    
    assert "room" in created_reservation
    assert created_reservation["room"]["number"] == "NESTED01"


def test_filter_by_status(client, admin_token, reception_token, auth_headers):
    """Test filtering reservations by status"""
    admin_headers = auth_headers(admin_token)
    reception_headers = auth_headers(reception_token)
    
    # Create room type, rooms, and client
    room_type_data = {
        "name": "Filter Type",
        "description": "Test room type",
        "price_per_night": "100.00",
        "max_occupancy": 2
    }
    
    room_type_response = client.post("/api/v1/room-types/", json=room_type_data, headers=admin_headers)
    room_type = room_type_response.json()
    
    # Create two rooms
    room1_data = {
        "number": "FILTER01",
        "floor": 1,
        "room_type_id": room_type["id"],
        "status": "available"
    }
    
    room2_data = {
        "number": "FILTER02",
        "floor": 1,
        "room_type_id": room_type["id"],
        "status": "available"
    }
    
    room1_response = client.post("/api/v1/rooms/", json=room1_data, headers=admin_headers)
    room2_response = client.post("/api/v1/rooms/", json=room2_data, headers=admin_headers)
    room1 = room1_response.json()
    room2 = room2_response.json()
    
    client_data = {
        "first_name": "Filter",
        "last_name": "Test",
        "email": "filter.test@test.com",
    }
    
    client_response = client.post("/api/v1/clients/", json=client_data, headers=reception_headers)
    test_client = client_response.json()
    
    # Create reservations with different statuses
    today = date.today()
    
    reservation1_data = {
        "client_id": test_client["id"],
        "room_id": room1["id"],
        "check_in_date": str(today + timedelta(days=1)),
        "check_out_date": str(today + timedelta(days=3)),
        "adults": 1,
        "children": 0,
        "total_amount": "200.00",
        "status": "confirmed"
    }
    
    reservation2_data = {
        "client_id": test_client["id"],
        "room_id": room2["id"],
        "check_in_date": str(today + timedelta(days=5)),
        "check_out_date": str(today + timedelta(days=7)),
        "adults": 1,
        "children": 0,
        "total_amount": "200.00",
        "status": "checked_in"
    }
    
    client.post("/api/v1/reservations/", json=reservation1_data, headers=reception_headers)
    client.post("/api/v1/reservations/", json=reservation2_data, headers=reception_headers)
    
    # Filter by confirmed status
    response = client.get("/api/v1/reservations/?status=confirmed", headers=reception_headers)
    
    assert response.status_code == 200
    data = response.json()
    
    # All returned reservations should be confirmed
    for reservation in data:
        assert reservation["status"] == "confirmed"
    
    # Should include room FILTER01 but not FILTER02
    room_numbers = [r["room"]["number"] for r in data]
    assert "FILTER01" in room_numbers
    assert "FILTER02" not in room_numbers