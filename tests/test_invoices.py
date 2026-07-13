from datetime import date, timedelta
from decimal import Decimal


def test_create_invoice_pending(client, admin_token, reception_token, auth_headers):
    """Test creating invoice with pending status - paid_at should be None"""
    admin_headers = auth_headers(admin_token)
    reception_headers = auth_headers(reception_token)
    
    # Create room type, room, client, and reservation first
    room_type_data = {
        "name": "Invoice Type",
        "description": "Test room type",
        "price_per_night": "100.00",
        "max_occupancy": 2
    }
    
    room_type_response = client.post("/api/v1/room-types/", json=room_type_data, headers=admin_headers)
    room_type = room_type_response.json()
    
    room_data = {
        "number": "INV01",
        "floor": 1,
        "room_type_id": room_type["id"],
        "status": "available"
    }
    
    room_response = client.post("/api/v1/rooms/", json=room_data, headers=admin_headers)
    room = room_response.json()
    
    client_data = {
        "first_name": "Invoice",
        "last_name": "Test",
        "email": "invoice.test@test.com",
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
    reservation = reservation_response.json()
    
    # Change reservation status to checked_out so we can create invoice
    checkout_response = client.patch(f"/api/v1/reservations/{reservation['id']}", 
                                   json={"status": "checked_out"}, 
                                   headers=reception_headers)
    assert checkout_response.status_code == 200
    
    # Create invoice with pending status
    invoice_data = {
        "reservation_id": reservation["id"],
        "nights_count": 2,
        "room_rate": "100.00",
        "total_amount": "200.00",
        "payment_method": "TPE",
        "payment_status": "pending"
    }
    
    response = client.post("/api/v1/invoices/", json=invoice_data, headers=reception_headers)
    
    assert response.status_code == 201
    data = response.json()
    assert data["reservation_id"] == reservation["id"]
    assert data["nights_count"] == 2
    assert Decimal(data["room_rate"]) == Decimal("100.00")
    assert Decimal(data["total_amount"]) == Decimal("200.00")
    assert data["payment_method"] == "TPE"
    assert data["payment_status"] == "pending"
    assert data["paid_at"] is None  # Should be None for pending
    assert "id" in data
    assert "created_at" in data


def test_create_invoice_paid(client, admin_token, reception_token, auth_headers):
    """Test creating invoice with paid status - paid_at should be set automatically"""
    admin_headers = auth_headers(admin_token)
    reception_headers = auth_headers(reception_token)
    
    # Create room type, room, client, and reservation first
    room_type_data = {
        "name": "Paid Invoice Type",
        "description": "Test room type",
        "price_per_night": "150.00",
        "max_occupancy": 2
    }
    
    room_type_response = client.post("/api/v1/room-types/", json=room_type_data, headers=admin_headers)
    room_type = room_type_response.json()
    
    room_data = {
        "number": "PAID01",
        "floor": 1,
        "room_type_id": room_type["id"],
        "status": "available"
    }
    
    room_response = client.post("/api/v1/rooms/", json=room_data, headers=admin_headers)
    room = room_response.json()
    
    client_data = {
        "first_name": "Paid",
        "last_name": "Invoice",
        "email": "paid.invoice@test.com",
    }
    
    client_response = client.post("/api/v1/clients/", json=client_data, headers=reception_headers)
    test_client = client_response.json()
    
    # Create reservation
    today = date.today()
    reservation_data = {
        "client_id": test_client["id"],
        "room_id": room["id"],
        "check_in_date": str(today + timedelta(days=1)),
        "check_out_date": str(today + timedelta(days=4)),
        "adults": 1,
        "children": 0,
        "total_amount": "450.00",
        "status": "confirmed"
    }
    
    reservation_response = client.post("/api/v1/reservations/", json=reservation_data, headers=reception_headers)
    reservation = reservation_response.json()
    
    # Change reservation status to checked_out so we can create invoice
    checkout_response = client.patch(f"/api/v1/reservations/{reservation['id']}", 
                                   json={"status": "checked_out"}, 
                                   headers=reception_headers)
    assert checkout_response.status_code == 200
    
    # Create invoice with paid status
    invoice_data = {
        "reservation_id": reservation["id"],
        "nights_count": 3,
        "room_rate": "150.00",
        "total_amount": "450.00",
        "payment_method": "TPE",
        "payment_status": "paid"
    }
    
    response = client.post("/api/v1/invoices/", json=invoice_data, headers=reception_headers)
    
    assert response.status_code == 201
    data = response.json()
    assert data["reservation_id"] == reservation["id"]
    assert data["payment_status"] == "paid"
    assert data["paid_at"] is not None  # Should be set automatically for paid status


def test_update_invoice_to_paid(client, admin_token, reception_token, auth_headers):
    """Test updating invoice status to paid auto-sets paid_at"""
    admin_headers = auth_headers(admin_token)
    reception_headers = auth_headers(reception_token)
    
    # Create room type, room, client, and reservation
    room_type_data = {
        "name": "Update Type",
        "description": "Test room type",
        "price_per_night": "120.00",
        "max_occupancy": 2
    }
    
    room_type_response = client.post("/api/v1/room-types/", json=room_type_data, headers=admin_headers)
    room_type = room_type_response.json()
    
    room_data = {
        "number": "UPDATE01",
        "floor": 1,
        "room_type_id": room_type["id"],
        "status": "available"
    }
    
    room_response = client.post("/api/v1/rooms/", json=room_data, headers=admin_headers)
    room = room_response.json()
    
    client_data = {
        "first_name": "Update",
        "last_name": "Invoice",
        "email": "update.invoice@test.com",
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
        "total_amount": "240.00",
        "status": "confirmed"
    }
    
    reservation_response = client.post("/api/v1/reservations/", json=reservation_data, headers=reception_headers)
    reservation = reservation_response.json()
    
    # Change reservation status to checked_out so we can create invoice
    checkout_response = client.patch(f"/api/v1/reservations/{reservation['id']}", 
                                   json={"status": "checked_out"}, 
                                   headers=reception_headers)
    assert checkout_response.status_code == 200
    
    # Create pending invoice
    invoice_data = {
        "reservation_id": reservation["id"],
        "nights_count": 2,
        "room_rate": "120.00",
        "total_amount": "240.00",
        "payment_method": "TPE",
        "payment_status": "pending"
    }
    
    invoice_response = client.post("/api/v1/invoices/", json=invoice_data, headers=reception_headers)
    invoice = invoice_response.json()
    
    # Verify initially pending with no paid_at
    assert invoice["payment_status"] == "pending"
    assert invoice["paid_at"] is None
    
    # Update to paid status
    update_data = {
        "payment_status": "paid",
        "notes": "Paid with card"
    }
    
    response = client.patch(f"/api/v1/invoices/{invoice['id']}", json=update_data, headers=reception_headers)
    
    assert response.status_code == 200
    data = response.json()
    assert data["payment_status"] == "paid"
    assert data["paid_at"] is not None  # Should be auto-set
    assert data["notes"] == "Paid with card"


def test_create_invoice_duplicate_reservation(client, admin_token, reception_token, auth_headers):
    """Test creating invoice for reservation that already has one returns 400"""
    admin_headers = auth_headers(admin_token)
    reception_headers = auth_headers(reception_token)
    
    # Create room type, room, client, and reservation
    room_type_data = {
        "name": "Duplicate Type",
        "description": "Test room type",
        "price_per_night": "100.00",
        "max_occupancy": 2
    }
    
    room_type_response = client.post("/api/v1/room-types/", json=room_type_data, headers=admin_headers)
    room_type = room_type_response.json()
    
    room_data = {
        "number": "DUP01",
        "floor": 1,
        "room_type_id": room_type["id"],
        "status": "available"
    }
    
    room_response = client.post("/api/v1/rooms/", json=room_data, headers=admin_headers)
    room = room_response.json()
    
    client_data = {
        "first_name": "Duplicate",
        "last_name": "Invoice",
        "email": "duplicate.invoice@test.com",
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
    reservation = reservation_response.json()
    
    # Change reservation status to checked_out so we can create invoice
    checkout_response = client.patch(f"/api/v1/reservations/{reservation['id']}", 
                                   json={"status": "checked_out"}, 
                                   headers=reception_headers)
    assert checkout_response.status_code == 200
    
    # Create first invoice
    invoice_data = {
        "reservation_id": reservation["id"],
        "nights_count": 2,
        "room_rate": "100.00",
        "total_amount": "200.00",
        "payment_method": "TPE",
        "payment_status": "pending"
    }
    
    response1 = client.post("/api/v1/invoices/", json=invoice_data, headers=reception_headers)
    assert response1.status_code == 201
    
    # Try to create second invoice for same reservation
    response2 = client.post("/api/v1/invoices/", json=invoice_data, headers=reception_headers)
    
    assert response2.status_code == 409
    assert "facture existe déjà" in response2.json()["detail"]


def test_delete_invoice_admin(client, admin_token, reception_token, auth_headers):
    """Test admin can delete invoice (204)"""
    admin_headers = auth_headers(admin_token)
    reception_headers = auth_headers(reception_token)
    
    # Create room type, room, client, and reservation
    room_type_data = {
        "name": "Delete Type",
        "description": "Test room type",
        "price_per_night": "100.00",
        "max_occupancy": 2
    }
    
    room_type_response = client.post("/api/v1/room-types/", json=room_type_data, headers=admin_headers)
    room_type = room_type_response.json()
    
    room_data = {
        "number": "DEL01",
        "floor": 1,
        "room_type_id": room_type["id"],
        "status": "available"
    }
    
    room_response = client.post("/api/v1/rooms/", json=room_data, headers=admin_headers)
    room = room_response.json()
    
    client_data = {
        "first_name": "Delete",
        "last_name": "Invoice",
        "email": "delete.invoice@test.com",
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
    reservation = reservation_response.json()
    
    # Change reservation status to checked_out so we can create invoice
    checkout_response = client.patch(f"/api/v1/reservations/{reservation['id']}", 
                                   json={"status": "checked_out"}, 
                                   headers=reception_headers)
    assert checkout_response.status_code == 200
    
    # Create invoice
    invoice_data = {
        "reservation_id": reservation["id"],
        "nights_count": 2,
        "room_rate": "100.00",
        "total_amount": "200.00",
        "payment_method": "TPE",
        "payment_status": "pending"
    }
    
    invoice_response = client.post("/api/v1/invoices/", json=invoice_data, headers=reception_headers)
    invoice = invoice_response.json()
    
    # Delete as admin
    response = client.delete(f"/api/v1/invoices/{invoice['id']}", headers=admin_headers)
    
    assert response.status_code == 204


def test_delete_invoice_receptionist(client, admin_token, reception_token, auth_headers):
    """Test receptionist cannot delete invoice (403)"""
    admin_headers = auth_headers(admin_token)
    reception_headers = auth_headers(reception_token)
    
    # Create room type, room, client, and reservation
    room_type_data = {
        "name": "No Delete Type",
        "description": "Test room type",
        "price_per_night": "100.00",
        "max_occupancy": 2
    }
    
    room_type_response = client.post("/api/v1/room-types/", json=room_type_data, headers=admin_headers)
    room_type = room_type_response.json()
    
    room_data = {
        "number": "NODEL01",
        "floor": 1,
        "room_type_id": room_type["id"],
        "status": "available"
    }
    
    room_response = client.post("/api/v1/rooms/", json=room_data, headers=admin_headers)
    room = room_response.json()
    
    client_data = {
        "first_name": "NoDelete",
        "last_name": "Invoice",
        "email": "nodelete.invoice@test.com",
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
    reservation = reservation_response.json()
    
    # Change reservation status to checked_out so we can create invoice
    checkout_response = client.patch(f"/api/v1/reservations/{reservation['id']}", 
                                   json={"status": "checked_out"}, 
                                   headers=reception_headers)
    assert checkout_response.status_code == 200
    
    # Create invoice
    invoice_data = {
        "reservation_id": reservation["id"],
        "nights_count": 2,
        "room_rate": "100.00",
        "total_amount": "200.00",
        "payment_method": "TPE",
        "payment_status": "pending"
    }
    
    invoice_response = client.post("/api/v1/invoices/", json=invoice_data, headers=reception_headers)
    invoice = invoice_response.json()
    
    # Try to delete as receptionist
    response = client.delete(f"/api/v1/invoices/{invoice['id']}", headers=reception_headers)
    
    assert response.status_code == 403


def test_invoices_list_has_total_count(client, admin_token, reception_token, auth_headers):
    """Test that GET /invoices/ returns paginated response with total, items, limit, offset"""
    admin_headers = auth_headers(admin_token)
    reception_headers = auth_headers(reception_token)
    
    # Create minimal test data (room type, room, client, reservation, invoice)
    room_type_data = {
        "name": "Count Type",
        "description": "Test room type",
        "price_per_night": "100.00",
        "max_occupancy": 2
    }
    
    room_type_response = client.post("/api/v1/room-types/", json=room_type_data, headers=admin_headers)
    room_type = room_type_response.json()
    
    room_data = {
        "number": "COUNT01",
        "floor": 1,
        "room_type_id": room_type["id"],
        "status": "available"
    }
    
    room_response = client.post("/api/v1/rooms/", json=room_data, headers=admin_headers)
    room = room_response.json()
    
    client_data = {
        "first_name": "Count",
        "last_name": "Test",
        "email": "count.test@test.com",
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
    reservation = reservation_response.json()
    
    # Change reservation status to checked_out
    checkout_response = client.patch(f"/api/v1/reservations/{reservation['id']}", 
                                   json={"status": "checked_out"}, 
                                   headers=reception_headers)
    assert checkout_response.status_code == 200
    
    # Create invoice
    invoice_data = {
        "reservation_id": reservation["id"],
        "payment_status": "pending"
    }
    
    invoice_response = client.post("/api/v1/invoices/", json=invoice_data, headers=reception_headers)
    assert invoice_response.status_code == 201
    
    # Test GET /invoices/ response format
    response = client.get("/api/v1/invoices/", headers=reception_headers)
    
    assert response.status_code == 200
    data = response.json()
    
    # Check that response has all required pagination fields
    assert "items" in data
    assert "total" in data
    assert "limit" in data
    assert "offset" in data
    
    # Check data types
    assert isinstance(data["items"], list)
    assert isinstance(data["total"], int)
    assert isinstance(data["limit"], int)
    assert isinstance(data["offset"], int)
    
    # Check that total is at least 1 (our created invoice)
    assert data["total"] >= 1
    assert len(data["items"]) >= 1
    assert data["limit"] == 50  # Default limit
    assert data["offset"] == 0  # Default offset


def test_invoices_total_with_filter(client, admin_token, reception_token, auth_headers):
    """Test that total count changes correctly with payment_status filter"""
    admin_headers = auth_headers(admin_token)
    reception_headers = auth_headers(reception_token)
    
    # Create minimal test data for two invoices with different statuses
    room_type_data = {
        "name": "Filter Type",
        "description": "Test room type",
        "price_per_night": "100.00",
        "max_occupancy": 2
    }
    
    room_type_response = client.post("/api/v1/room-types/", json=room_type_data, headers=admin_headers)
    room_type = room_type_response.json()
    
    # Create two rooms
    room_data_1 = {
        "number": "FILTER01",
        "floor": 1,
        "room_type_id": room_type["id"],
        "status": "available"
    }
    
    room_data_2 = {
        "number": "FILTER02",
        "floor": 1,
        "room_type_id": room_type["id"],
        "status": "available"
    }
    
    room_response_1 = client.post("/api/v1/rooms/", json=room_data_1, headers=admin_headers)
    room_1 = room_response_1.json()
    
    room_response_2 = client.post("/api/v1/rooms/", json=room_data_2, headers=admin_headers)
    room_2 = room_response_2.json()
    
    # Create two clients
    client_data_1 = {
        "first_name": "Pending",
        "last_name": "Client",
        "email": "pending.client@test.com",
    }
    
    client_data_2 = {
        "first_name": "Paid",
        "last_name": "Client",
        "email": "paid.client@test.com",
    }
    
    client_response_1 = client.post("/api/v1/clients/", json=client_data_1, headers=reception_headers)
    test_client_1 = client_response_1.json()
    
    client_response_2 = client.post("/api/v1/clients/", json=client_data_2, headers=reception_headers)
    test_client_2 = client_response_2.json()
    
    # Create two reservations
    today = date.today()
    reservation_data_1 = {
        "client_id": test_client_1["id"],
        "room_id": room_1["id"],
        "check_in_date": str(today + timedelta(days=1)),
        "check_out_date": str(today + timedelta(days=3)),
        "adults": 1,
        "children": 0,
        "total_amount": "200.00",
        "status": "confirmed"
    }
    
    reservation_data_2 = {
        "client_id": test_client_2["id"],
        "room_id": room_2["id"],
        "check_in_date": str(today + timedelta(days=4)),
        "check_out_date": str(today + timedelta(days=6)),
        "adults": 1,
        "children": 0,
        "total_amount": "200.00",
        "status": "confirmed"
    }
    
    reservation_response_1 = client.post("/api/v1/reservations/", json=reservation_data_1, headers=reception_headers)
    reservation_1 = reservation_response_1.json()
    
    reservation_response_2 = client.post("/api/v1/reservations/", json=reservation_data_2, headers=reception_headers)
    reservation_2 = reservation_response_2.json()
    
    # Check out both reservations
    client.patch(f"/api/v1/reservations/{reservation_1['id']}", 
                json={"status": "checked_out"}, 
                headers=reception_headers)
    
    client.patch(f"/api/v1/reservations/{reservation_2['id']}", 
                json={"status": "checked_out"}, 
                headers=reception_headers)
    
    # Create one pending invoice
    invoice_data_1 = {
        "reservation_id": reservation_1["id"],
        "payment_status": "pending"
    }
    
    client.post("/api/v1/invoices/", json=invoice_data_1, headers=reception_headers)
    
    # Create one paid invoice
    invoice_data_2 = {
        "reservation_id": reservation_2["id"],
        "payment_status": "paid"
    }
    
    client.post("/api/v1/invoices/", json=invoice_data_2, headers=reception_headers)
    
    # Test filter: all invoices (no filter)
    response_all = client.get("/api/v1/invoices/", headers=reception_headers)
    assert response_all.status_code == 200
    data_all = response_all.json()
    total_all = data_all["total"]
    
    # Test filter: pending only
    response_pending = client.get("/api/v1/invoices/?payment_status=pending", headers=reception_headers)
    assert response_pending.status_code == 200
    data_pending = response_pending.json()
    total_pending = data_pending["total"]
    
    # Test filter: paid only
    response_paid = client.get("/api/v1/invoices/?payment_status=paid", headers=reception_headers)
    assert response_paid.status_code == 200
    data_paid = response_paid.json()
    total_paid = data_paid["total"]
    
    # Verify that filtered totals are less than or equal to total all
    assert total_pending <= total_all
    assert total_paid <= total_all
    
    # Verify that at least one pending and one paid invoice exist
    assert total_pending >= 1
    assert total_paid >= 1