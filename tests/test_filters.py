"""
Tests — Filtres API et champs de réponse
Couvre : filtrage par statut, date, room_id, client_id, présence des champs clés.
"""
from datetime import date, timedelta
from decimal import Decimal


def _setup(client, admin_headers, reception_headers, suffix):
    rt = client.post("/api/v1/room-types/", json={
        "name": f"Type {suffix}",
        "description": "",
        "price_per_night": "80.00",
        "max_occupancy": 2
    }, headers=admin_headers).json()

    room = client.post("/api/v1/rooms/", json={
        "number": suffix,
        "floor": 1,
        "room_type_id": rt["id"],
        "status": "available"
    }, headers=admin_headers).json()

    cli = client.post("/api/v1/clients/", json={
        "first_name": "Filter",
        "last_name": suffix,
        "email": f"filter.{suffix.lower()}@test.com"
    }, headers=reception_headers).json()

    return room, cli["id"]


def _reserve(client, headers, room_id, client_id, offset, nights, status="confirmed"):
    today = date.today()
    r = client.post("/api/v1/reservations/", json={
        "client_id": client_id,
        "room_id": room_id,
        "check_in_date": str(today + timedelta(days=offset)),
        "check_out_date": str(today + timedelta(days=offset + nights)),
        "adults": 1,
        "children": 0,
        "status": status
    }, headers=headers)
    assert r.status_code == 201, r.text
    return r.json()


# ── Filtrage par statut ────────────────────────────────────────────────────────

def test_filter_by_status_confirmed(client, admin_token, reception_token, auth_headers):
    """?reservation_status=confirmed ne retourne que des réservations confirmées"""
    ah = auth_headers(admin_token)
    rh = auth_headers(reception_token)
    room, client_id = _setup(client, ah, rh, "F001")

    _reserve(client, rh, room["id"], client_id, offset=5, nights=2, status="confirmed")

    r = client.get("/api/v1/reservations/?reservation_status=confirmed", headers=rh)
    assert r.status_code == 200
    data = r.json()
    assert all(res["status"] == "confirmed" for res in data)


def test_filter_by_status_cancelled(client, admin_token, reception_token, auth_headers):
    """?reservation_status=cancelled ne retourne que des réservations annulées"""
    ah = auth_headers(admin_token)
    rh = auth_headers(reception_token)
    room, client_id = _setup(client, ah, rh, "F002")

    res = _reserve(client, rh, room["id"], client_id, offset=10, nights=2)
    client.patch(f"/api/v1/reservations/{res['id']}", json={"status": "cancelled"}, headers=rh)

    r = client.get("/api/v1/reservations/?reservation_status=cancelled", headers=rh)
    assert r.status_code == 200
    data = r.json()
    assert all(res["status"] == "cancelled" for res in data)
    assert any(res["id"] == res["id"] for res in data)


def test_filter_status_returns_empty_for_no_match(client, admin_token, reception_token, auth_headers):
    """?reservation_status=no_show retourne liste vide si aucune réservation de ce type"""
    ah = auth_headers(admin_token)
    rh = auth_headers(reception_token)
    _setup(client, ah, rh, "F003")

    r = client.get("/api/v1/reservations/?reservation_status=no_show", headers=rh)
    assert r.status_code == 200
    assert r.json() == []


# ── Filtrage par date ──────────────────────────────────────────────────────────

def test_filter_by_start_date(client, admin_token, reception_token, auth_headers):
    """?start= filtre les réservations dont check_in_date >= start"""
    ah = auth_headers(admin_token)
    rh = auth_headers(reception_token)
    room, client_id = _setup(client, ah, rh, "F004")

    today = date.today()
    far_future = today + timedelta(days=30)

    _reserve(client, rh, room["id"], client_id, offset=30, nights=2)

    start_param = str(far_future)
    r = client.get(f"/api/v1/reservations/?start={start_param}", headers=rh)
    assert r.status_code == 200
    for res in r.json():
        assert res["check_in_date"] >= start_param


def test_filter_by_end_date(client, admin_token, reception_token, auth_headers):
    """?end= filtre les réservations dont check_out_date <= end"""
    ah = auth_headers(admin_token)
    rh = auth_headers(reception_token)
    room, client_id = _setup(client, ah, rh, "F005")

    today = date.today()
    end_param = str(today + timedelta(days=5))

    _reserve(client, rh, room["id"], client_id, offset=1, nights=2)

    r = client.get(f"/api/v1/reservations/?end={end_param}", headers=rh)
    assert r.status_code == 200
    for res in r.json():
        assert res["check_out_date"] <= end_param


def test_filter_by_date_range_excludes_outside(client, admin_token, reception_token, auth_headers):
    """Une réservation hors de la plage [start, end] n'apparaît pas dans les résultats"""
    ah = auth_headers(admin_token)
    rh = auth_headers(reception_token)
    room, client_id = _setup(client, ah, rh, "F006")

    today = date.today()
    _reserve(client, rh, room["id"], client_id, offset=50, nights=2)

    start = str(today + timedelta(days=1))
    end = str(today + timedelta(days=10))

    r = client.get(f"/api/v1/reservations/?start={start}&end={end}", headers=rh)
    assert r.status_code == 200
    for res in r.json():
        assert res["check_in_date"] >= start
        assert res["check_out_date"] <= end


# ── Filtrage par room_id ───────────────────────────────────────────────────────

def test_filter_by_room_id(client, admin_token, reception_token, auth_headers):
    """?room_id= ne retourne que les réservations de cette chambre"""
    ah = auth_headers(admin_token)
    rh = auth_headers(reception_token)
    room, client_id = _setup(client, ah, rh, "F007")

    _reserve(client, rh, room["id"], client_id, offset=1, nights=2)

    r = client.get(f"/api/v1/reservations/?room_id={room['id']}", headers=rh)
    assert r.status_code == 200
    data = r.json()
    assert len(data) >= 1
    assert all(res["room_id"] == room["id"] for res in data)


# ── Filtrage par client_id ─────────────────────────────────────────────────────

def test_filter_by_client_id(client, admin_token, reception_token, auth_headers):
    """?client_id= ne retourne que les réservations de ce client"""
    ah = auth_headers(admin_token)
    rh = auth_headers(reception_token)
    room, client_id = _setup(client, ah, rh, "F008")

    _reserve(client, rh, room["id"], client_id, offset=1, nights=2)

    r = client.get(f"/api/v1/reservations/?client_id={client_id}", headers=rh)
    assert r.status_code == 200
    data = r.json()
    assert len(data) >= 1
    assert all(res["client_id"] == client_id for res in data)


# ── Champs de réponse réservation ──────────────────────────────────────────────

def test_reservation_response_fields_present(client, admin_token, reception_token, auth_headers):
    """La réponse d'une réservation contient tous les champs nécessaires à l'export CSV"""
    ah = auth_headers(admin_token)
    rh = auth_headers(reception_token)
    room, client_id = _setup(client, ah, rh, "F009")

    res = _reserve(client, rh, room["id"], client_id, offset=1, nights=2)

    r = client.get(f"/api/v1/reservations/{res['id']}", headers=rh)
    assert r.status_code == 200
    data = r.json()

    required_fields = ["id", "check_in_date", "check_out_date", "adults", "children", "status", "room_id", "client_id"]
    for field in required_fields:
        assert field in data, f"Champ manquant : {field}"


def test_reservation_total_amount_is_numeric(client, admin_token, reception_token, auth_headers):
    """total_amount est numérique (non nul, non string)"""
    ah = auth_headers(admin_token)
    rh = auth_headers(reception_token)
    room, client_id = _setup(client, ah, rh, "F010")

    res = _reserve(client, rh, room["id"], client_id, offset=0, nights=2)
    client.patch(f"/api/v1/reservations/{res['id']}", json={"status": "checked_in"}, headers=rh)
    client.patch(f"/api/v1/reservations/{res['id']}", json={"status": "checked_out"}, headers=rh)
    inv_r = client.post("/api/v1/invoices/", json={
        "reservation_id": res["id"],
        "payment_status": "pending"
    }, headers=rh)
    assert inv_r.status_code == 201, inv_r.text
    inv = inv_r.json()

    amount = Decimal(str(inv["total_amount"]))
    assert amount > Decimal("0")


# ── Champs de réponse client ───────────────────────────────────────────────────

def test_client_response_fields_present(client, admin_token, reception_token, auth_headers):
    """La réponse client liste contient tous les champs nécessaires à l'export CSV"""
    ah = auth_headers(admin_token)
    rh = auth_headers(reception_token)

    r = client.post("/api/v1/clients/", json={
        "first_name": "Export",
        "last_name": "Fields",
        "email": "export.fields@test.com"
    }, headers=rh)
    assert r.status_code == 201

    r = client.get("/api/v1/clients/", headers=rh)
    assert r.status_code == 200
    data = r.json()
    assert len(data) >= 1

    required_fields = ["id", "first_name", "last_name", "email"]
    for field in required_fields:
        assert field in data[0], f"Champ manquant : {field}"


def test_client_list_excludes_id_document(client, admin_token, reception_token, auth_headers):
    """La liste clients ne doit pas exposer id_document (RGPD)"""
    ah = auth_headers(admin_token)
    rh = auth_headers(reception_token)

    client.post("/api/v1/clients/", json={
        "first_name": "GDPR",
        "last_name": "Check",
        "email": "gdpr.check@test.com"
    }, headers=rh)

    r = client.get("/api/v1/clients/", headers=rh)
    assert r.status_code == 200
    for c in r.json():
        assert "id_document" not in c, "id_document ne doit pas apparaître dans la liste"


# ── Rooms list ─────────────────────────────────────────────────────────────────

def test_rooms_list_non_empty_after_creation(client, admin_token, auth_headers):
    """GET /rooms/ retourne la chambre créée"""
    ah = auth_headers(admin_token)

    rt = client.post("/api/v1/room-types/", json={
        "name": "Type F011",
        "description": "",
        "price_per_night": "75.00",
        "max_occupancy": 2
    }, headers=ah).json()

    client.post("/api/v1/rooms/", json={
        "number": "F011",
        "floor": 1,
        "room_type_id": rt["id"],
        "status": "available"
    }, headers=ah)

    r = client.get("/api/v1/rooms/", headers=ah)
    assert r.status_code == 200
    numbers = [room["number"] for room in r.json()]
    assert "F011" in numbers
