def test_register_success(client):
    """Test successful user registration"""
    user_data = {
        "email": "newuser@test.com",
        "password": "password123",
        "full_name": "New User",
        "role": "receptionist"
    }
    
    response = client.post("/api/v1/auth/register", json=user_data)
    
    assert response.status_code == 201
    data = response.json()
    assert data["email"] == user_data["email"]
    assert data["full_name"] == user_data["full_name"]
    assert data["role"] == user_data["role"]
    assert data["is_active"] is True
    assert "password_hash" not in data  # Password should not be in response
    assert "id" in data
    assert "created_at" in data


def test_register_duplicate_email(client):
    """Test registration with duplicate email returns 400"""
    user_data = {
        "email": "duplicate@test.com",
        "password": "password123",
        "full_name": "First User",
        "role": "receptionist"
    }
    
    # Register first user
    response1 = client.post("/api/v1/auth/register", json=user_data)
    assert response1.status_code == 201
    
    # Try to register same email again
    user_data2 = {
        "email": "duplicate@test.com",  # Same email
        "password": "different123",
        "full_name": "Second User",
        "role": "admin"
    }
    
    response2 = client.post("/api/v1/auth/register", json=user_data2)
    assert response2.status_code == 400
    assert "existe déjà" in response2.json()["detail"]


def test_login_success(client):
    """Test successful login with correct credentials"""
    # First register a user
    user_data = {
        "email": "logintest@test.com",
        "password": "password123",
        "full_name": "Login Test",
        "role": "receptionist"
    }
    
    register_response = client.post("/api/v1/auth/register", json=user_data)
    assert register_response.status_code == 201
    
    # Now login
    login_data = {
        "email": "logintest@test.com",
        "password": "password123"
    }
    
    response = client.post("/api/v1/auth/login", json=login_data)
    
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"


def test_login_wrong_password(client):
    """Test login with wrong password returns 401"""
    # First register a user
    user_data = {
        "email": "wrongpassword@test.com",
        "password": "correctpassword",
        "full_name": "Wrong Password Test",
        "role": "receptionist"
    }
    
    register_response = client.post("/api/v1/auth/register", json=user_data)
    assert register_response.status_code == 201
    
    # Try login with wrong password
    login_data = {
        "email": "wrongpassword@test.com",
        "password": "wrongpassword"
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