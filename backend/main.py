from contextlib import asynccontextmanager
import os
from pathlib import Path

from fastapi import FastAPI, Request, HTTPException
from fastapi.responses import RedirectResponse
from fastapi.staticfiles import StaticFiles
from slowapi.errors import RateLimitExceeded
from sqlalchemy import create_engine
from sqlalchemy.schema import CreateTable
from sqlalchemy.dialects import postgresql as pg_dialect

from backend.core.database import Base, engine
from backend.core.rate_limit import limiter
from backend.models import User, RoomType, Room, Client, Reservation, Invoice, HotelSetting

def rate_limit_handler(request: Request, exc: RateLimitExceeded):
    from fastapi.responses import JSONResponse
    return JSONResponse(
        status_code=429,
        content={"detail": "Trop de tentatives de connexion. Veuillez réessayer dans quelques instants."}
    )


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    Base.metadata.create_all(bind=engine)
    
    # Generate schema.sql
    schema_dir = Path("database")
    schema_dir.mkdir(exist_ok=True)
    schema_file = schema_dir / "schema.sql"
    
    with open(schema_file, "w") as f:
        f.write("-- Generated SQL schema for InnDesk PMS\n\n")
        dialect = pg_dialect.dialect()
        for table in Base.metadata.sorted_tables:
            ddl = str(CreateTable(table).compile(dialect=dialect))
            f.write(f"{ddl.strip()};\n\n")
    
    yield
    
    # Shutdown (nothing needed)


app = FastAPI(
    title="InnDesk",
    description="Property Management System for small independent hotels",
    version="1.0.0",
    lifespan=lifespan
)

# Configure rate limiter
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, rate_limit_handler)

# Register routers
from backend.routers import auth, users, room_types, rooms, clients, reservations, invoices, settings, housekeeping, health
app.include_router(health.router, prefix="/api/v1")
app.include_router(auth.router, prefix="/api/v1")
app.include_router(users.router, prefix="/api/v1")
app.include_router(room_types.router, prefix="/api/v1")
app.include_router(rooms.router, prefix="/api/v1")
app.include_router(clients.router, prefix="/api/v1")
app.include_router(reservations.router, prefix="/api/v1")
app.include_router(invoices.router, prefix="/api/v1")
app.include_router(settings.router, prefix="/api/v1")
app.include_router(housekeeping.router, prefix="/api/v1")

# Mount static files
frontend_dir = Path(__file__).parent.parent / "frontend"
if frontend_dir.exists():
    app.mount("/app", StaticFiles(directory=str(frontend_dir), html=True), name="frontend")


@app.get("/")
def root():
    return RedirectResponse(url="/app/index.html", status_code=302)
