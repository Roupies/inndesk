import os
os.environ["TESTING"] = "true"  # Must be BEFORE any backend imports

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
import psycopg2
from psycopg2.extensions import ISOLATION_LEVEL_AUTOCOMMIT

from backend.main import app
from backend.core.database import get_db, Base
from backend.core.config import settings
from backend.core.rate_limit import limiter


def get_test_db_url():
    url = settings.DATABASE_URL
    if '?' in url:
        path_part, query_part = url.split('?', 1)
        return f"{path_part}_test?{query_part}"
    return url + "_test"


TEST_DATABASE_URL = get_test_db_url()


@pytest.fixture(autouse=True)
def reset_rate_limiter():
    """Keep SlowAPI's in-memory counters isolated between tests."""
    limiter.reset()
    yield
    limiter.reset()


def create_test_database():
    """Create test database if it doesn't exist"""
    try:
        conn = psycopg2.connect(settings.DATABASE_URL)
        conn.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
        cur = conn.cursor()

        import urllib.parse as urlparse
        parsed = urlparse.urlparse(TEST_DATABASE_URL)
        db_name = parsed.path.lstrip('/')

        cur.execute("SELECT 1 FROM pg_database WHERE datname = %s", (db_name,))
        if not cur.fetchone():
            cur.execute(f'CREATE DATABASE "{db_name}"')

        cur.close()
        conn.close()
    except Exception as e:
        print(f"Warning: Could not create test database: {e}")


@pytest.fixture(scope="session", autouse=True)
def setup_test_db():
    """Create test database and tables before tests, clean up after"""
    create_test_database()
    
    # Create engine and tables
    engine = create_engine(TEST_DATABASE_URL)
    Base.metadata.create_all(bind=engine)
    
    yield
    
    # Clean up - drop all tables
    Base.metadata.drop_all(bind=engine)


@pytest.fixture
def db_session():
    """Create a fresh database session for each test"""
    engine = create_engine(TEST_DATABASE_URL)
    TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    
    session = TestingSessionLocal()
    try:
        yield session
    finally:
        session.close()


@pytest.fixture
def client(db_session):
    """Create a test client with overridden database dependency"""
    # Truncate all tables before each test to ensure clean state
    from sqlalchemy import text
    engine = create_engine(TEST_DATABASE_URL)
    with engine.connect() as conn:
        conn.execute(text("TRUNCATE TABLE invoices, reservations, clients, rooms, room_types, users RESTART IDENTITY CASCADE"))
        conn.commit()
    
    def override_get_db():
        try:
            yield db_session
        finally:
            pass
    
    app.dependency_overrides[get_db] = override_get_db
    
    with TestClient(app) as test_client:
        yield test_client
    
    # Clean up
    app.dependency_overrides.clear()


@pytest.fixture
def admin_token(client, db_session):
    """Create an admin user in the database and login, return Bearer token"""
    from backend.models.user import User
    from backend.core.security import hash_password
    
    # Create admin user directly in database
    admin_user = User(
        email="admin@test.com",
        password_hash=hash_password("admin123"),
        full_name="Test Admin",
        role="admin",
        is_active=True
    )
    
    db_session.add(admin_user)
    db_session.commit()
    
    # Login to get token
    login_data = {
        "email": "admin@test.com",
        "password": "admin123"
    }
    
    login_response = client.post("/api/v1/auth/login", json=login_data)
    assert login_response.status_code == 200
    
    token_data = login_response.json()
    return token_data["access_token"]


@pytest.fixture
def reception_token(client, db_session):
    """Create a receptionist user in the database and login, return Bearer token"""
    from backend.models.user import User
    from backend.core.security import hash_password
    
    # Create receptionist user directly in database
    reception_user = User(
        email="reception@test.com",
        password_hash=hash_password("reception123"),
        full_name="Test Receptionist",
        role="receptionist",
        is_active=True
    )
    
    db_session.add(reception_user)
    db_session.commit()
    
    # Login to get token
    login_data = {
        "email": "reception@test.com",
        "password": "reception123"
    }
    
    login_response = client.post("/api/v1/auth/login", json=login_data)
    assert login_response.status_code == 200
    
    token_data = login_response.json()
    return token_data["access_token"]


@pytest.fixture
def auth_headers():
    """Helper to create authorization headers from token"""
    def _auth_headers(token: str):
        return {"Authorization": f"Bearer {token}"}
    return _auth_headers
