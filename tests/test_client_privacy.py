from datetime import date, timedelta


def create_client(client, headers, **overrides):
    payload = {
        "first_name": "Privacy",
        "last_name": "Test",
        "email": "privacy.test@example.com",
    }
    payload.update(overrides)
    response = client.post("/api/v1/clients/", json=payload, headers=headers)
    assert response.status_code == 201
    return response.json()


def create_reservation(client, admin_headers, reception_headers, client_id, status="confirmed"):
    room_type_response = client.post(
        "/api/v1/room-types/",
        headers=admin_headers,
        json={
            "name": "Privacy Room Type",
            "description": "Privacy tests",
            "price_per_night": "100.00",
            "max_occupancy": 2,
        },
    )
    assert room_type_response.status_code == 201
    room_type = room_type_response.json()

    room_response = client.post(
        "/api/v1/rooms/",
        headers=admin_headers,
        json={
            "number": "PRIV01",
            "floor": 1,
            "room_type_id": room_type["id"],
            "status": "available",
        },
    )
    assert room_response.status_code == 201
    room = room_response.json()

    today = date.today()
    reservation_response = client.post(
        "/api/v1/reservations/",
        headers=reception_headers,
        json={
            "client_id": client_id,
            "room_id": room["id"],
            "check_in_date": str(today + timedelta(days=2)),
            "check_out_date": str(today + timedelta(days=4)),
            "adults": 1,
            "children": 0,
            "status": status,
        },
    )
    assert reservation_response.status_code == 201
    return reservation_response.json()


def test_create_without_marketing_consent_and_without_identity_document(
    client, admin_token, reception_token, auth_headers
):
    admin_headers = auth_headers(admin_token)
    reception_headers = auth_headers(reception_token)
    created = create_client(client, reception_headers, email=None)

    assert created["consent_marketing"] is False
    assert created["consent_marketing_at"] is None
    assert created["id_document"] is None

    reservation = create_reservation(
        client, admin_headers, reception_headers, created["id"]
    )
    assert reservation["client_id"] == created["id"]
    assert reservation["room_id"] is not None


def test_create_with_marketing_consent_records_timestamp(
    client, reception_token, auth_headers
):
    created = create_client(
        client,
        auth_headers(reception_token),
        consent_marketing=True,
    )

    assert created["consent_marketing"] is True
    assert created["consent_marketing_at"] is not None


def test_withdrawing_marketing_consent_clears_timestamp(
    client, reception_token, auth_headers
):
    headers = auth_headers(reception_token)
    created = create_client(client, headers, consent_marketing=True)
    original_timestamp = created["consent_marketing_at"]

    unchanged_response = client.patch(
        f"/api/v1/clients/{created['id']}",
        headers=headers,
        json={"consent_marketing": True},
    )
    assert unchanged_response.status_code == 200
    assert unchanged_response.json()["consent_marketing_at"] == original_timestamp

    response = client.patch(
        f"/api/v1/clients/{created['id']}",
        headers=headers,
        json={"consent_marketing": False},
    )

    assert response.status_code == 200
    assert response.json()["consent_marketing"] is False
    assert response.json()["consent_marketing_at"] is None


def test_client_export_contains_only_requested_client_history(
    client, admin_token, reception_token, auth_headers
):
    admin_headers = auth_headers(admin_token)
    reception_headers = auth_headers(reception_token)
    exported_client = create_client(
        client,
        reception_headers,
        id_document="OPTIONAL-DOCUMENT",
        consent_marketing=True,
    )
    other_client = create_client(
        client,
        reception_headers,
        email="other-client@example.com",
        first_name="Other",
    )
    reservation = create_reservation(
        client,
        admin_headers,
        reception_headers,
        exported_client["id"],
        status="checked_out",
    )
    invoice_response = client.post(
        "/api/v1/invoices/",
        headers=reception_headers,
        json={"reservation_id": reservation["id"], "payment_status": "paid"},
    )
    assert invoice_response.status_code == 201

    response = client.get(
        f"/api/v1/clients/{exported_client['id']}/export",
        headers=reception_headers,
    )

    assert response.status_code == 200
    data = response.json()
    assert data["client"]["id"] == exported_client["id"]
    assert data["client"]["id_document"] == "OPTIONAL-DOCUMENT"
    assert data["reservations"][0]["id"] == reservation["id"]
    assert data["invoices"][0]["reservation_id"] == reservation["id"]
    serialized = response.text
    assert other_client["email"] not in serialized
    for forbidden in ("password_hash", "access_token", "JWT_SECRET", "secret"):
        assert forbidden not in serialized


def test_client_export_requires_authentication(client, reception_token, auth_headers):
    created = create_client(client, auth_headers(reception_token))

    response = client.get(f"/api/v1/clients/{created['id']}/export")

    assert response.status_code in (401, 403)


def test_admin_anonymization_preserves_relations_and_blocks_email(
    client, admin_token, reception_token, auth_headers
):
    admin_headers = auth_headers(admin_token)
    reception_headers = auth_headers(reception_token)
    created = create_client(
        client,
        reception_headers,
        phone="+33102030405",
        nationality="France",
        id_document="DOCUMENT-TO-REMOVE",
        consent_marketing=True,
    )
    reservation = create_reservation(
        client,
        admin_headers,
        reception_headers,
        created["id"],
        status="checked_out",
    )
    invoice_response = client.post(
        "/api/v1/invoices/",
        headers=reception_headers,
        json={"reservation_id": reservation["id"]},
    )
    assert invoice_response.status_code == 201
    invoice = invoice_response.json()

    response = client.post(
        f"/api/v1/clients/{created['id']}/anonymize", headers=admin_headers
    )

    assert response.status_code == 200
    anonymized = response.json()
    assert anonymized["first_name"] == "Client"
    assert anonymized["last_name"] == "Anonymisé"
    assert anonymized["email"] == f"anonymized-{created['id']}@invalid.local"
    assert anonymized["phone"] is None
    assert anonymized["nationality"] is None
    assert anonymized["id_document"] is None
    assert anonymized["consent_marketing"] is False
    assert anonymized["consent_marketing_at"] is None
    assert anonymized["anonymized_at"] is not None

    stored_reservation = client.get(
        f"/api/v1/reservations/{reservation['id']}", headers=reception_headers
    )
    assert stored_reservation.status_code == 200
    assert stored_reservation.json()["client_id"] == created["id"]

    email_response = client.post(
        f"/api/v1/invoices/{invoice['id']}/send-email",
        headers=reception_headers,
        json={"email": "recipient@example.com"},
    )
    assert email_response.status_code == 409
    assert "client anonymisé" in email_response.json()["detail"]


def test_receptionist_cannot_anonymize(client, reception_token, auth_headers):
    headers = auth_headers(reception_token)
    created = create_client(client, headers)

    response = client.post(
        f"/api/v1/clients/{created['id']}/anonymize", headers=headers
    )

    assert response.status_code == 403


def test_client_without_history_can_be_physically_deleted(
    client, reception_token, auth_headers
):
    headers = auth_headers(reception_token)
    created = create_client(client, headers)

    delete_response = client.delete(
        f"/api/v1/clients/{created['id']}", headers=headers
    )
    get_response = client.get(
        f"/api/v1/clients/{created['id']}", headers=headers
    )

    assert delete_response.status_code == 204
    assert get_response.status_code == 404


def test_client_field_lengths_are_validated_server_side(
    client, reception_token, auth_headers
):
    response = client.post(
        "/api/v1/clients/",
        headers=auth_headers(reception_token),
        json={"first_name": "A" * 101, "last_name": "Valid"},
    )

    assert response.status_code == 422
