import os
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from slowapi import Limiter
from slowapi.util import get_remote_address

from backend.core.database import get_db
from backend.core.security import create_access_token, get_current_user, hash_password, verify_password
from backend.models.user import User
from backend.schemas.auth import LoginRequest, TokenResponse

router = APIRouter(prefix="/auth", tags=["Auth"])
limiter = Limiter(key_func=get_remote_address)
_TESTING = os.getenv("TESTING", "false").lower() == "true"


@router.post("/login", response_model=TokenResponse)
def login(login_data: LoginRequest, db: Session = Depends(get_db), request: Request = None):
    user = db.query(User).filter(User.email == login_data.email).first()
    
    if not user or not verify_password(login_data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email ou mot de passe incorrect"
        )
    
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Compte désactivé"
        )
    
    access_token = create_access_token(data={"sub": str(user.id), "role": user.role})
    
    return TokenResponse(access_token=access_token)


@router.post("/refresh", response_model=TokenResponse)
def refresh_token(current_user: User = Depends(get_current_user)):
    """
    Refresh an existing access token.
    Takes the current token via Bearer Authorization header,
    validates it via get_current_user, and returns a new token.
    """
    access_token = create_access_token(data={"sub": str(current_user.id), "role": current_user.role})
    return TokenResponse(access_token=access_token)


# Only apply rate limit decorator in production
if not _TESTING:
    login = limiter.limit("5/minute")(login)