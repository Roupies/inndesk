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


def test_refresh_token_valid(client, admin_token, auth_headers):
    """Test refresh token with valid token returns new token"""
    # First create a user via admin endpoint
    headers = auth_headers(admin_token)
    user_data = {
        "email": "refreshtest@test.com",
        "password": "Password123",
        "full_name": "Refresh Test",
        "role": "receptionist"
    }
    
    register_response = client.post("/api/v1/users/", json=user_data, headers=headers)
    assert register_response.status_code == 201
    
    # Login to get initial token
    login_data = {
        "email": "refreshtest@test.com", 
        "password": "Password123"
    }
    
    login_response = client.post("/api/v1/auth/login", json=login_data)
    assert login_response.status_code == 200
    initial_token = login_response.json()["access_token"]
    
    # Use refresh endpoint with valid token
    refresh_headers = {"Authorization": f"Bearer {initial_token}"}
    refresh_response = client.post("/api/v1/auth/refresh", headers=refresh_headers)
    
    assert refresh_response.status_code == 200
    refresh_data = refresh_response.json()
    assert "access_token" in refresh_data
    assert refresh_data["token_type"] == "bearer"
    # Verify the refreshed token works by making an authenticated request
    test_headers = {"Authorization": f"Bearer {refresh_data['access_token']}"}
    me_response = client.get("/api/v1/users/me", headers=test_headers)
    assert me_response.status_code == 200
    assert me_response.json()["email"] == "refreshtest@test.com"


def test_refresh_token_invalid(client):
    """Test refresh token with invalid token returns 401"""
    # Use invalid token
    invalid_headers = {"Authorization": "Bearer invalid_token_12345"}
    refresh_response = client.post("/api/v1/auth/refresh", headers=invalid_headers)
    
    assert refresh_response.status_code == 401
    assert "Token invalide" in refresh_response.json()["detail"]