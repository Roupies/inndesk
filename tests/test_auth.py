def test_login_success(client, admin_token, auth_headers):
    """Test successful login with correct credentials"""
    # First create a user via admin endpoint
    headers = auth_headers(admin_token)
    user_data = {
        "email": "logintest@test.com",
        "password": "Password123",  # Must meet new validation requirements
        "full_name": "Login Test",
        "role": "receptionist"
    }
    
    register_response = client.post("/api/v1/users/", json=user_data, headers=headers)
    assert register_response.status_code == 201
    
    # Now login
    login_data = {
        "email": "logintest@test.com",
        "password": "Password123"  # Must match the password above
    }
    
    response = client.post("/api/v1/auth/login", json=login_data)
    
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"


def test_login_wrong_password(client, admin_token, auth_headers):
    """Test login with wrong password returns 401"""
    # First create a user via admin endpoint
    headers = auth_headers(admin_token)
    user_data = {
        "email": "wrongpassword@test.com",
        "password": "CorrectPassword123",  # Must meet validation requirements
        "full_name": "Wrong Password Test",
        "role": "receptionist"
    }
    
    register_response = client.post("/api/v1/users/", json=user_data, headers=headers)
    assert register_response.status_code == 201
    
    # Try login with wrong password
    login_data = {
        "email": "wrongpassword@test.com",
        "password": "WrongPassword123"
    }
    
    response = client.post("/api/v1/auth/login", json=login_data)
    
    assert response.status_code == 401
    assert "Email ou mot de passe incorrect" in response.json()["detail"]


def test_login_unknown_email(client):
    """Test login with unknown email returns 401"""
    login_data = {
        "email": "nonexistent@test.com",
        "password": "anypassword"
    }
    
    response = client.post("/api/v1/auth/login", json=login_data)
    
    assert response.status_code == 401
    assert "Email ou mot de passe incorrect" in response.json()["detail"]