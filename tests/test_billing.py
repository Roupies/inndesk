"""
Tests — Facturation et modes de paiement
Couvre : Literal payment_method, calcul TVA, statut paid_at auto.
"""
from datetime import date, timedelta
from decimal import Decimal


# ── Helpers ────────────────────────────────────────────────────────────────────

def _make_reservation(client, admin_headers, reception_headers, room_suffix, days_offset=0, nights=2):
    """Crée room_type + room + client + réservation checked_out (prête à facturer)."""
    rt = client.post("/api/v1/room-types/", json={
        "name": f"Type {room_suffix}",
        "description": "",
        "price_per_night": "100.00",
        "max_occupancy": 2
    }, headers=admin_headers).json()

    room = client.post("/api/v1/rooms/", json={
        "number": room_suffix,
        "floor": 1,
        "room_type_id": rt["id"],
        "status": "available"
    }, headers=admin_headers).json()

    cli = client.post("/api/v1/clients/", json={
        "first_name": "Test",
        "last_name": room_suffix,
        "email": f"test.{room_suffix.lower()}@billing.com"
    }, headers=reception_headers).json()

    today = date.today()
    res = client.post("/api/v1/reservations/", json={
        "client_id": cli["id"],
        "room_id": room["id"],
        "check_in_date": str(today + timedelta(days=days_offset)),
        "check_out_date": str(today + timedelta(days=days_offset + nights)),
        "adults": 1,
        "children": 0,
        "status": "confirmed"
    }, headers=reception_headers)
    assert res.status_code == 201, res.text
    data = res.json()
    client.patch(f"/api/v1/reservations/{data['id']}", json={"status": "checked_in"}, headers=reception_headers)
    client.patch(f"/api/v1/reservations/{data['id']}", json={"status": "checked_out"}, headers=reception_headers)
    return data


def _create_invoice(client, reception_headers, reservation_id, payment_status="pending"):
    r = client.post("/api/v1/invoices/", json={
        "reservation_id": reservation_id,
        "payment_status": payment_status
    }, headers=reception_headers)
    assert r.status_code == 201, r.text
    return r.json()


# ── Tests modes de paiement ────────────────────────────────────────────────────

VALID_PAYMENT_METHODS = ["espèces", "visa", "mastercard", "amex", "chèques vacances", "virement"]


def test_payment_method_especes(client, admin_token, reception_token, auth_headers):
    """Paiement en espèces accepté"""
    ah = auth_headers(admin_token)
    rh = auth_headers(reception_token)
    res = _make_reservation(client, ah, rh, "B001")
    inv = _create_invoice(client, rh, res["id"])

    r = client.patch(f"/api/v1/invoices/{inv['id']}", json={
        "payment_method": "espèces",
        "payment_status": "paid"
    }, headers=rh)
    assert r.status_code == 200
    assert r.json()["payment_method"] == "espèces"
    assert r.json()["payment_status"] == "paid"


def test_payment_method_visa(client, admin_token, reception_token, auth_headers):
    ah = auth_headers(admin_token)
    rh = auth_headers(reception_token)
    res = _make_reservation(client, ah, rh, "B002")
    inv = _create_invoice(client, rh, res["id"])

    r = client.patch(f"/api/v1/invoices/{inv['id']}", json={
        "payment_method": "visa",
        "payment_status": "paid"
    }, headers=rh)
    assert r.status_code == 200
    assert r.json()["payment_method"] == "visa"


def test_payment_method_mastercard(client, admin_token, reception_token, auth_headers):
    ah = auth_headers(admin_token)
    rh = auth_headers(reception_token)
    res = _make_reservation(client, ah, rh, "B003")
    inv = _create_invoice(client, rh, res["id"])

    r = client.patch(f"/api/v1/invoices/{inv['id']}", json={
        "payment_method": "mastercard",
        "payment_status": "paid"
    }, headers=rh)
    assert r.status_code == 200
    assert r.json()["payment_method"] == "mastercard"


def test_payment_method_amex(client, admin_token, reception_token, auth_headers):
    ah = auth_headers(admin_token)
    rh = auth_headers(reception_token)
    res = _make_reservation(client, ah, rh, "B004")
    inv = _create_invoice(client, rh, res["id"])

    r = client.patch(f"/api/v1/invoices/{inv['id']}", json={
        "payment_method": "amex",
        "payment_status": "paid"
    }, headers=rh)
    assert r.status_code == 200
    assert r.json()["payment_method"] == "amex"


def test_payment_method_cheques_vacances(client, admin_token, reception_token, auth_headers):
    ah = auth_headers(admin_token)
    rh = auth_headers(reception_token)
    res = _make_reservation(client, ah, rh, "B005")
    inv = _create_invoice(client, rh, res["id"])

    r = client.patch(f"/api/v1/invoices/{inv['id']}", json={
        "payment_method": "chèques vacances",
        "payment_status": "paid"
    }, headers=rh)
    assert r.status_code == 200
    assert r.json()["payment_method"] == "chèques vacances"


def test_payment_method_virement(client, admin_token, reception_token, auth_headers):
    ah = auth_headers(admin_token)
    rh = auth_headers(reception_token)
    res = _make_reservation(client, ah, rh, "B006")
    inv = _create_invoice(client, rh, res["id"])

    r = client.patch(f"/api/v1/invoices/{inv['id']}", json={
        "payment_method": "virement",
        "payment_status": "paid"
    }, headers=rh)
    assert r.status_code == 200
    assert r.json()["payment_method"] == "virement"


def test_payment_method_invalid_rejected(client, admin_token, reception_token, auth_headers):
    """Un mode de paiement inconnu retourne 422"""
    ah = auth_headers(admin_token)
    rh = auth_headers(reception_token)
    res = _make_reservation(client, ah, rh, "B007")
    inv = _create_invoice(client, rh, res["id"])

    r = client.patch(f"/api/v1/invoices/{inv['id']}", json={
        "payment_method": "bitcoin"
    }, headers=rh)
    assert r.status_code == 422


def test_payment_method_card_legacy_rejected(client, admin_token, reception_token, auth_headers):
    """L'ancienne valeur 'card' n'est plus valide"""
    ah = auth_headers(admin_token)
    rh = auth_headers(reception_token)
    res = _make_reservation(client, ah, rh, "B008")
    inv = _create_invoice(client, rh, res["id"])

    r = client.patch(f"/api/v1/invoices/{inv['id']}", json={
        "payment_method": "card"
    }, headers=rh)
    assert r.status_code == 422


# ── Tests paid_at auto-set ─────────────────────────────────────────────────────

def test_paid_at_set_when_status_becomes_paid(client, admin_token, reception_token, auth_headers):
    """paid_at doit être renseigné automatiquement au passage à paid"""
    ah = auth_headers(admin_token)
    rh = auth_headers(reception_token)
    res = _make_reservation(client, ah, rh, "B009")
    inv = _create_invoice(client, rh, res["id"], payment_status="pending")
    assert inv["paid_at"] is None

    r = client.patch(f"/api/v1/invoices/{inv['id']}", json={
        "payment_status": "paid",
        "payment_method": "visa"
    }, headers=rh)
    assert r.status_code == 200
    assert r.json()["paid_at"] is not None


def test_paid_at_none_for_pending_invoice(client, admin_token, reception_token, auth_headers):
    """paid_at est None pour une facture pending"""
    ah = auth_headers(admin_token)
    rh = auth_headers(reception_token)
    res = _make_reservation(client, ah, rh, "B010")
    inv = _create_invoice(client, rh, res["id"], payment_status="pending")
    assert inv["paid_at"] is None


# ── Tests calcul montant ───────────────────────────────────────────────────────

def test_invoice_total_amount_2_nights(client, admin_token, reception_token, auth_headers):
    """2 nuits × 100€ = 200€ HT sur la facture"""
    ah = auth_headers(admin_token)
    rh = auth_headers(reception_token)
    res = _make_reservation(client, ah, rh, "B011", nights=2)
    inv = _create_invoice(client, rh, res["id"])

    assert Decimal(str(inv["total_amount"])) == Decimal("200.00")
    assert inv["nights_count"] == 2


def test_invoice_total_amount_3_nights(client, admin_token, reception_token, auth_headers):
    """3 nuits × 100€ = 300€ HT"""
    ah = auth_headers(admin_token)
    rh = auth_headers(reception_token)
    res = _make_reservation(client, ah, rh, "B012", nights=3)
    inv = _create_invoice(client, rh, res["id"])

    assert Decimal(str(inv["total_amount"])) == Decimal("300.00")
    assert inv["nights_count"] == 3


def test_invoice_fields_present(client, admin_token, reception_token, auth_headers):
    """La réponse facture contient tous les champs attendus"""
    ah = auth_headers(admin_token)
    rh = auth_headers(reception_token)
    res = _make_reservation(client, ah, rh, "B013")
    inv = _create_invoice(client, rh, res["id"])

    for field in ("id", "reservation_id", "nights_count", "room_rate",
                  "total_amount", "payment_status", "paid_at", "created_at"):
        assert field in inv, f"Champ manquant : {field}"
