"""
Tests — Cycle de vie complet d'une réservation
Couvre : confirmed → checked_in → checked_out + facture + paiement
"""
from datetime import date, timedelta
from decimal import Decimal


def _setup(client, admin_headers, reception_headers, suffix):
    """Crée les entités de base, retourne (room, client_id)."""
    rt = client.post("/api/v1/room-types/", json={
        "name": f"Type {suffix}",
        "description": "",
        "price_per_night": "95.00",
        "max_occupancy": 2
    }, headers=admin_headers).json()

    room = client.post("/api/v1/rooms/", json={
        "number": suffix,
        "floor": 1,
        "room_type_id": rt["id"],
        "status": "available"
    }, headers=admin_headers).json()

    cli = client.post("/api/v1/clients/", json={
        "first_name": "Cycle",
        "last_name": suffix,
        "email": f"cycle.{suffix.lower()}@test.com"
    }, headers=reception_headers).json()

    return room, cli["id"]


# ── E2E cycle complet ──────────────────────────────────────────────────────────

def test_full_reservation_lifecycle(client, admin_token, reception_token, auth_headers):
    """
    confirmed → checked_in → checked_out → facture → paid
    Vérifie chaque transition de statut et que la facture est correcte.
    """
    ah = auth_headers(admin_token)
    rh = auth_headers(reception_token)
    room, client_id = _setup(client, ah, rh, "L001")

    today = date.today()
    # Création
    r = client.post("/api/v1/reservations/", json={
        "client_id": client_id,
        "room_id": room["id"],
        "check_in_date": str(today),
        "check_out_date": str(today + timedelta(days=3)),
        "adults": 2,
        "children": 0,
        "status": "confirmed"
    }, headers=rh)
    assert r.status_code == 201
    res_id = r.json()["id"]
    assert r.json()["status"] == "confirmed"

    # Check-in
    r = client.patch(f"/api/v1/reservations/{res_id}", json={"status": "checked_in"}, headers=rh)
    assert r.status_code == 200
    assert r.json()["status"] == "checked_in"

    # Check-out
    r = client.patch(f"/api/v1/reservations/{res_id}", json={"status": "checked_out"}, headers=rh)
    assert r.status_code == 200
    assert r.json()["status"] == "checked_out"

    # Facture (créée automatiquement ou manuellement selon l'implémentation)
    inv_r = client.get(f"/api/v1/invoices/?reservation_id={res_id}", headers=rh)
    assert inv_r.status_code == 200

    # Si la facture n'est pas auto-créée, on la crée manuellement
    invoices = inv_r.json()
    if isinstance(invoices, dict):
        invoices = invoices.get("items", [])
    if not invoices:
        inv_r2 = client.post("/api/v1/invoices/", json={
            "reservation_id": res_id,
            "payment_status": "pending"
        }, headers=rh)
        assert inv_r2.status_code == 201
        inv_id = inv_r2.json()["id"]
        inv_amount = Decimal(str(inv_r2.json()["total_amount"]))
    else:
        inv_id = invoices[0]["id"]
        inv_amount = Decimal(str(invoices[0]["total_amount"]))

    # 3 nuits × 95€ = 285€
    assert inv_amount == Decimal("285.00"), f"Montant attendu 285.00, reçu {inv_amount}"

    # Paiement
    r = client.patch(f"/api/v1/invoices/{inv_id}", json={
        "payment_method": "visa",
        "payment_status": "paid"
    }, headers=rh)
    assert r.status_code == 200
    assert r.json()["payment_status"] == "paid"
    assert r.json()["paid_at"] is not None


def test_reservation_cancel_flow(client, admin_token, reception_token, auth_headers):
    """Annulation d'une réservation confirmée"""
    ah = auth_headers(admin_token)
    rh = auth_headers(reception_token)
    room, client_id = _setup(client, ah, rh, "L002")

    today = date.today()
    r = client.post("/api/v1/reservations/", json={
        "client_id": client_id,
        "room_id": room["id"],
        "check_in_date": str(today + timedelta(days=5)),
        "check_out_date": str(today + timedelta(days=7)),
        "adults": 1,
        "children": 0,
        "status": "confirmed"
    }, headers=rh)
    assert r.status_code == 201
    res_id = r.json()["id"]

    r = client.patch(f"/api/v1/reservations/{res_id}", json={"status": "cancelled"}, headers=rh)
    assert r.status_code == 200
    assert r.json()["status"] == "cancelled"


def test_invalid_status_transition_rejected(client, admin_token, reception_token, auth_headers):
    """Un statut invalide retourne 422"""
    ah = auth_headers(admin_token)
    rh = auth_headers(reception_token)
    room, client_id = _setup(client, ah, rh, "L003")

    today = date.today()
    r = client.post("/api/v1/reservations/", json={
        "client_id": client_id,
        "room_id": room["id"],
        "check_in_date": str(today + timedelta(days=1)),
        "check_out_date": str(today + timedelta(days=3)),
        "adults": 1,
        "children": 0,
        "status": "confirmed"
    }, headers=rh)
    res_id = r.json()["id"]

    r = client.patch(f"/api/v1/reservations/{res_id}", json={"status": "flying"}, headers=rh)
    assert r.status_code == 422


def test_double_booking_same_room_rejected(client, admin_token, reception_token, auth_headers):
    """Deux réservations sur la même chambre aux mêmes dates → 409"""
    ah = auth_headers(admin_token)
    rh = auth_headers(reception_token)
    room, client_id = _setup(client, ah, rh, "L004")

    cli2 = client.post("/api/v1/clients/", json={
        "first_name": "Second",
        "last_name": "Guest",
        "email": "second.l004@test.com"
    }, headers=rh).json()

    today = date.today()
    payload = {
        "room_id": room["id"],
        "check_in_date": str(today + timedelta(days=2)),
        "check_out_date": str(today + timedelta(days=5)),
        "adults": 1,
        "children": 0,
        "status": "confirmed"
    }

    r1 = client.post("/api/v1/reservations/", json={**payload, "client_id": client_id}, headers=rh)
    assert r1.status_code == 201

    r2 = client.post("/api/v1/reservations/", json={**payload, "client_id": cli2["id"]}, headers=rh)
    assert r2.status_code == 409
    assert "déjà réservée" in r2.json()["detail"]


def test_billing_calculation_3_nights(client, admin_token, reception_token, auth_headers):
    """3 nuits × 95€ = 285€ — cas de référence RNCP"""
    ah = auth_headers(admin_token)
    rh = auth_headers(reception_token)
    room, client_id = _setup(client, ah, rh, "L005")

    today = date.today()
    r = client.post("/api/v1/reservations/", json={
        "client_id": client_id,
        "room_id": room["id"],
        "check_in_date": str(today),
        "check_out_date": str(today + timedelta(days=3)),
        "adults": 1,
        "children": 0,
        "status": "confirmed"
    }, headers=rh)
    assert r.status_code == 201
    res_id = r.json()["id"]

    client.patch(f"/api/v1/reservations/{res_id}", json={"status": "checked_in"}, headers=rh)
    client.patch(f"/api/v1/reservations/{res_id}", json={"status": "checked_out"}, headers=rh)

    inv_r = client.post("/api/v1/invoices/", json={
        "reservation_id": res_id,
        "payment_status": "pending"
    }, headers=rh)
    assert inv_r.status_code == 201, inv_r.text
    inv = inv_r.json()

    assert Decimal(str(inv["total_amount"])) == Decimal("285.00")
    assert inv["nights_count"] == 3
    assert Decimal(str(inv["room_rate"])) == Decimal("95.00")


def test_reservation_detail_no_auth(client, admin_token, reception_token, auth_headers):
    """GET /reservations/{id} sans token → 403"""
    ah = auth_headers(admin_token)
    rh = auth_headers(reception_token)
    room, client_id = _setup(client, ah, rh, "L006")

    today = date.today()
    r = client.post("/api/v1/reservations/", json={
        "client_id": client_id,
        "room_id": room["id"],
        "check_in_date": str(today + timedelta(days=1)),
        "check_out_date": str(today + timedelta(days=2)),
        "adults": 1,
        "children": 0,
        "status": "confirmed"
    }, headers=rh)
    res_id = r.json()["id"]

    r = client.get(f"/api/v1/reservations/{res_id}")
    assert r.status_code == 403


def test_reservation_not_found(client, reception_token, auth_headers):
    """GET /reservations/999999 → 404 avec detail string"""
    rh = auth_headers(reception_token)
    r = client.get("/api/v1/reservations/999999", headers=rh)
    assert r.status_code == 404
    body = r.json()
    assert "detail" in body
    assert isinstance(body["detail"], str)


def test_reservation_nested_client_and_room(client, admin_token, reception_token, auth_headers):
    """La liste des réservations inclut client et room imbriqués"""
    ah = auth_headers(admin_token)
    rh = auth_headers(reception_token)
    room, client_id = _setup(client, ah, rh, "L007")

    today = date.today()
    client.post("/api/v1/reservations/", json={
        "client_id": client_id,
        "room_id": room["id"],
        "check_in_date": str(today + timedelta(days=1)),
        "check_out_date": str(today + timedelta(days=2)),
        "adults": 1,
        "children": 0,
        "status": "confirmed"
    }, headers=rh)

    r = client.get("/api/v1/reservations/", headers=rh)
    assert r.status_code == 200
    data = r.json()
    res = next((x for x in data if x["room_id"] == room["id"]), None)
    assert res is not None
    assert "client" in res
    assert res["client"]["last_name"] == "L007"
    assert "room" in res
    assert res["room"]["number"] == "L007"
