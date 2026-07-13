import pytest
from pydantic import ValidationError

from backend.schemas.settings import PasswordChangeRequest as SettingsPasswordChangeRequest
from backend.schemas.user import PasswordChangeRequest, UserCreate, UserResetPassword


def test_password_confirmation_matching_is_valid():
    data = PasswordChangeRequest(
        current_password="CurrentPassword1",
        new_password="NewPassword2",
        confirm_password="NewPassword2",
    )

    assert data.confirm_password == data.new_password
    assert SettingsPasswordChangeRequest is PasswordChangeRequest


def test_password_confirmation_mismatch_is_rejected():
    with pytest.raises(ValidationError, match="Les mots de passe ne correspondent pas"):
        PasswordChangeRequest(
            current_password="CurrentPassword1",
            new_password="NewPassword2",
            confirm_password="DifferentPassword3",
        )


@pytest.mark.parametrize(
    ("password", "message"),
    [
        ("Short1", "au moins 8 caractères"),
        ("password1", "au moins une lettre majuscule"),
        ("Password", "au moins un chiffre"),
    ],
)
def test_password_change_preserves_strength_rules(password, message):
    with pytest.raises(ValidationError, match=message):
        PasswordChangeRequest(
            current_password="CurrentPassword1",
            new_password=password,
            confirm_password=password,
        )


@pytest.mark.parametrize(
    ("schema", "payload"),
    [
        (
            UserCreate,
            {
                "email": "schema-user@test.com",
                "password": "weak",
                "full_name": "Schema User",
            },
        ),
        (UserResetPassword, {"new_password": "weak"}),
    ],
)
def test_all_user_password_schemas_share_strength_rules(schema, payload):
    with pytest.raises(ValidationError, match="au moins 8 caractères"):
        schema(**payload)


def test_change_password_success(client, reception_token, auth_headers):
    headers = auth_headers(reception_token)
    response = client.post(
        "/api/v1/users/me/change-password",
        headers=headers,
        json={
            "current_password": "reception123",
            "new_password": "ChangedPassword2",
            "confirm_password": "ChangedPassword2",
        },
    )

    assert response.status_code == 204

    login_response = client.post(
        "/api/v1/auth/login",
        json={"email": "reception@test.com", "password": "ChangedPassword2"},
    )
    assert login_response.status_code == 200


def test_get_me(client, reception_token, auth_headers):
    """Test GET /users/me returns current user info"""
    headers = auth_headers(reception_token)
    
    response = client.get("/api/v1/users/me", headers=headers)
    
    assert response.status_code == 200
    data = response.json()
    assert data["email"] == "reception@test.com"
    assert data["full_name"] == "Test Receptionist"
    assert data["role"] == "receptionist"
    assert data["is_active"] is True
    assert "password_hash" not in data


def test_get_me_no_token(client):
    """Test GET /users/me without token returns 403"""
    response = client.get("/api/v1/users/me")
    
    assert response.status_code == 403


def test_list_users_admin(client, admin_token, reception_token, auth_headers):
    """Test admin can list all users"""
    headers = auth_headers(admin_token)
    
    response = client.get("/api/v1/users/", headers=headers)
    
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert len(data) >= 2  # At least admin and reception users from fixtures
    
    # Check that password_hash is not included in any user
    for user in data:
        assert "password_hash" not in user
        assert "email" in user
        assert "role" in user


def test_list_users_receptionist(client, reception_token, auth_headers):
    """Test receptionist cannot list users (403)"""
    headers = auth_headers(reception_token)
    
    response = client.get("/api/v1/users/", headers=headers)
    
    assert response.status_code == 403


def test_update_user(client, admin_token, reception_token, auth_headers):
    """Test admin can update user details"""
    admin_headers = auth_headers(admin_token)
    
    # First get the reception user ID
    me_response = client.get("/api/v1/users/me", headers=auth_headers(reception_token))
    reception_user = me_response.json()
    reception_user_id = reception_user["id"]
    
    # Update the reception user
    update_data = {
        "full_name": "Updated Receptionist Name",
        "is_active": False
    }
    
    response = client.patch(f"/api/v1/users/{reception_user_id}", json=update_data, headers=admin_headers)
    
    assert response.status_code == 200
    data = response.json()
    assert data["full_name"] == "Updated Receptionist Name"
    assert data["is_active"] is False
    assert data["email"] == "reception@test.com"  # Email unchanged
    assert data["role"] == "receptionist"  # Role unchanged


def test_delete_self_blocked(client, admin_token, auth_headers):
    """Test user cannot delete their own account"""
    headers = auth_headers(admin_token)
    
    # Get admin user ID
    me_response = client.get("/api/v1/users/me", headers=headers)
    admin_user = me_response.json()
    admin_user_id = admin_user["id"]
    
    # Try to delete own account
    response = client.delete(f"/api/v1/users/{admin_user_id}", headers=headers)
    
    assert response.status_code == 400
    assert "propre compte" in response.json()["detail"]
