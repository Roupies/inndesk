from fastapi import APIRouter, Depends
from sqlalchemy import text
from sqlalchemy.orm import Session

from backend.core.database import get_db


router = APIRouter(prefix="/health", tags=["Health"])


@router.get("")
def healthcheck(db: Session = Depends(get_db)) -> dict[str, str]:
    """Verify that the API process can reach its database."""
    db.execute(text("SELECT 1"))
    return {"status": "healthy", "database": "reachable"}
