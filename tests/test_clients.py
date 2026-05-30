def test_create_client(client, reception_token, auth_headers):
    """Test creating a client with GDPR consent"""
    headers = auth_headers(reception_token)
    
    client_data = {
        "first_name": "Jean",
        "last_name": "Martin",
        "email": "jean.martin@test.com",
        "phone": "+33612345678",
        "nationality": "France",
        "id_document": "1234567890",
        "gdpr_consent": True
    }
    
    response = client.post("/api/v1/clients/", json=client_data, headers=headers)
    
    assert response.status_code == 201
    data = response.json()
    assert data["first_name"] == "Jean"
    assert data["last_name"] == "Martin"
    assert data["email"] == "jean.martin@test.com"
    assert data["phone"] == "+33612345678"
    assert data["nationality"] == "France"
    assert data["id_document"] == "1234567890"
    assert data["gdpr_consent"] is True
    assert "gdpr_consent_at" in data
    assert "id" in data
    assert "created_at" in data


def test_create_client_no_gdpr_consent(client, reception_token, auth_headers):
    """Test creating client without GDPR consent returns 400"""
    headers = auth_headers(reception_token)
    
    client_data = {
        "first_name": "Jean",
        "last_name": "Martin",
        "email": "jean.nogdpr@test.com",
        "phone": "+33612345678",
        "nationality": "France",
        "gdpr_consent": False  # No consent
    }
    
    response = client.post("/api/v1/clients/", json=client_data, headers=headers)
    
    assert response.status_code == 400
    assert "consentement RGPD est obligatoire" in response.json()["detail"]


def test_create_client_duplicate_email(client, reception_token, auth_headers):
    """Test creating client with duplicate email returns 400"""
    headers = auth_headers(reception_token)
    
    client_data1 = {
        "first_name": "Jean",
        "last_name": "Martin",
        "email": "duplicate@test.com",
        "gdpr_consent": True
    }
    
    # Create first client
    response1 = client.post("/api/v1/clients/", json=client_data1, headers=headers)
    assert response1.status_code == 201
    
    # Try to create second client with same email
    client_data2 = {
        "first_name": "Marie",
        "last_name": "Dupont",
        "email": "duplicate@test.com",  # Same email
        "gdpr_consent": True
    }
    
    response2 = client.post("/api/v1/clients/", json=client_data2, headers=headers)
    assert response2.status_code == 400
    assert "client avec cet email existe déjà" in response2.json()["detail"]


def test_search_clients(client, reception_token, auth_headers):
    """Test searching clients by name or email"""
    headers = auth_headers(reception_token)
    
    # Create test clients
    client1_data = {
        "first_name": "Martin",
        "last_name": "Dubois",
        "email": "martin.dubois@test.com",
        "gdpr_consent": True
    }
    
    client2_data = {
        "first_name": "Sophie",
        "last_name": "Martin",
        "email": "sophie.martin@test.com",
        "gdpr_consent": True
    }
    
    client3_data = {
        "first_name": "Pierre",
        "last_name": "Bernard",
        "email": "pierre.bernard@test.com",
        "gdpr_consent": True
    }
    
    client.post("/api/v1/clients/", json=client1_data, headers=headers)
    client.post("/api/v1/clients/", json=client2_data, headers=headers)
    client.post("/api/v1/clients/", json=client3_data, headers=headers)
    
    # Search for "Martin" - should match both first name and last name
    response = client.get("/api/v1/clients/?search=Martin", headers=headers)
    
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 2
    
    # Check that both Martin clients are returned
    names = [(c["first_name"], c["last_name"]) for c in data]
    assert ("Martin", "Dubois") in names
    assert ("Sophie", "Martin") in names
    assert ("Pierre", "Bernard") not in names


def test_delete_client_with_reservation(client, admin_token, reception_token, auth_headers):
    """Test deleting client with reservations returns 400"""
    admin_headers = auth_headers(admin_token)
    reception_headers = auth_headers(reception_token)
    
    # Create room type and room first
    room_type_data = {
        "name": "Test Type",
        "description": "Test room type",
        "price_per_night": "100.00",
        "max_occupancy": 2
    }
    
    room_type_response = client.post("/api/v1/room-types/", json=room_type_data, headers=admin_headers)
    room_type = room_type_response.json()
    
    room_data = {
        "number": "TEST01",
        "floor": 1,
        "room_type_id": room_type["id"],
        "status": "available"
    }
    
    room_response = client.post("/api/v1/rooms/", json=room_data, headers=admin_headers)
    room = room_response.json()
    
    # Create client
    client_data = {
        "first_name": "Client",
        "last_name": "WithReservation",
        "email": "client.reservation@test.com",
        "gdpr_consent": True
    }
    
    client_response = client.post("/api/v1/clients/", json=client_data, headers=reception_headers)
    test_client = client_response.json()
    
    # Create reservation for this client
    from datetime import date, timedelta
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
    
    # Try to delete client with reservation
    response = client.delete(f"/api/v1/clients/{test_client['id']}", headers=reception_headers)
    
    assert response.status_code == 400
    assert "réservations" in response.json()["detail"]


def test_list_clients(client, reception_token, auth_headers):
    """Test listing clients without id_document in list view"""
    headers = auth_headers(reception_token)
    
    # Create a client with id_document
    client_data = {
        "first_name": "Test",
        "last_name": "Client",
        "email": "test.client@test.com",
        "id_document": "SECRET123",
        "gdpr_consent": True
    }
    
    create_response = client.post("/api/v1/clients/", json=client_data, headers=headers)
    assert create_response.status_code == 201
    
    # List clients - should not include id_document
    response = client.get("/api/v1/clients/", headers=headers)
    
    assert response.status_code == 200
    data = response.json()
    
    # Find our created client
    test_client = next((c for c in data if c["email"] == "test.client@test.com"), None)
    assert test_client is not None
    assert test_client["first_name"] == "Test"
    assert test_client["last_name"] == "Client"


def test_get_single_client_includes_id_document(client, reception_token, auth_headers):
    """Test getting single client includes id_document"""
    headers = auth_headers(reception_token)
    
    # Create a client with id_document
    client_data = {
        "first_name": "Single",
        "last_name": "ClientTest",
        "email": "single.client@test.com",
        "id_document": "INCLUDED123",
        "gdpr_consent": True
    }
    
    create_response = client.post("/api/v1/clients/", json=client_data, headers=headers)
    created_client = create_response.json()
    
    # Get single client - should include id_document
    response = client.get(f"/api/v1/clients/{created_client['id']}", headers=headers)
    
    assert response.status_code == 200
    data = response.json()
    assert data["first_name"] == "Single"
    assert data["last_name"] == "ClientTest"
    assert data["id_document"] == "INCLUDED123"