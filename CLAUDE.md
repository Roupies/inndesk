# CLAUDE.md — InnDesk PMS
> Read this file completely before writing a single line of code.
> This is your single source of truth for architecture and conventions.
> When in doubt, re-read this file — then ask if still unclear.

---

## 0. How to Read This File

This file has two purposes:
1. Give you the invariants you must never violate (marked **HARD**)
2. Give you the reasoning behind decisions so you can adapt intelligently

You are not a compiler executing a spec.
You are a skilled developer who understands WHY these decisions were made
and can make good local judgment calls within these boundaries.

**When something is ambiguous and the decision impacts architecture:
stop, state the ambiguity, and ask before generating.**

Do not invent behavior. Do not assume. Do not "fill gaps" silently.

---

## 1. Project Identity

**Name:** InnDesk
**Type:** Web-based Property Management System (PMS) for small independent hotels
**Developer:** Solo candidate preparing a RNCP Level 5 certification (French national exam)
**Interface language:** French
**Code language:** English (all variables, functions, comments, README, commits)

### What this project is
A realistic MVP that a hotel receptionist can actually use:
check guests in and out, manage reservations, track room status, record payments.

### What this project is not
- An enterprise system
- A microservices architecture
- A showcase of every possible pattern

**The primary quality criterion is: can the developer explain every significant
decision out loud to an examiner in under 2 minutes?**
Simplicity that enables explanation beats elegance that obscures it.

---

## 2. Hard Constraints

**HARD = never violate without explicit developer instruction.**

### Technology
```
HARD: No React, Vue, Angular, Svelte, or any JS framework
HARD: No TypeScript — plain JavaScript ES6 modules only
HARD: No build tools (Webpack, Vite, Rollup, Parcel, esbuild)
HARD: No SQLite in production code — PostgreSQL only
      (SQLite allowed in tests/conftest.py only)
HARD: No Alembic — use Base.metadata.create_all() at startup
HARD: No async SQLAlchemy — use Session, never AsyncSession
HARD: No async def routes — all FastAPI route functions use def
HARD: No SELECT * — always specify columns or use ORM attributes explicitly
HARD: No Stripe, PayPal, or any payment gateway
HARD: No OTA integration
HARD: No Docker in Phase 1 (weeks 1-3) — Docker added in Phase 2 only
```

### Code quality
```
HARD: No inline fetch() outside api.js
HARD: No password_hash in any API response
HARD: No id_document in list endpoints (only in single client detail)
HARD: No console.log in committed code
HARD: response_model on every FastAPI endpoint — no exceptions
HARD: Every <input> and <select> has a matching <label for="...">
HARD: outline: none is forbidden without an explicit :focus-visible replacement
```

Note: localStorage is permitted in local dev (not sandboxed).
The sandbox restriction applies to iframe-embedded deployments only.
Token and user data use localStorage intentionally.

### Generation discipline
```
HARD: Do not rewrite working code unless explicitly asked
HARD: Do not refactor stable modules — minimal targeted changes only
HARD: Do not touch files unrelated to the current task
HARD: Preserve existing naming conventions when modifying files
HARD: Preserve existing code style when modifying files
HARD: If api.js exceeds 250 lines, split by domain (authAPI, roomsAPI etc.)
      into separate files imported by a single api/index.js
```

---

## 3. Tech Stack

### Backend
| Layer | Technology |
|---|---|
| Framework | FastAPI (latest stable) — sync routes only (`def`, not `async def`) |
| ORM | SQLAlchemy 2.x — synchronous only (`Session`, not `AsyncSession`) |
| Database | PostgreSQL 15+ (Postgres.app on macOS for local dev) |
| Auth | python-jose[cryptography] + passlib[bcrypt] |
| Validation | Pydantic v2 — `response_model` on ALL endpoints |
| Server | Uvicorn with `--reload` in dev |
| Python | 3.11+ |
| Testing | pytest + httpx (in-memory SQLite for test isolation only) |
| Env | python-dotenv — `.env` file, never committed |

**Why sync SQLAlchemy with async FastAPI:**
FastAPI supports sync route functions natively (runs them in a thread pool).
Sync SQLAlchemy transactions are simpler to reason about and explain:
explicit `db.commit()`, `db.rollback()`, no event loop concerns.
For a PMS handling tens of concurrent users, sync is entirely sufficient.

### Frontend
| Layer | Technology |
|---|---|
| Markup | HTML5 semantic elements |
| Styling | CSS3 custom properties — mobile-first |
| Logic | Vanilla JavaScript ES6 modules |
| Planning grid | Custom HTML/CSS/JS (see Section 8) |
| Icons | Lucide Icons (CDN) |
| Fonts | Inter (Google Fonts CDN) |

### Infrastructure
| Concern | Solution |
|---|---|
| Frontend serving | FastAPI `StaticFiles` at `/app` — same origin, zero CORS |
| Root | `GET /` redirects to `/app/index.html` |
| Environment | `.env` + `.env.example` |
| Phase 2 only | `docker-compose.yml` + `Dockerfile` |

---

## 4. Project Structure

Use this as the baseline architecture.
You may split a file if it genuinely becomes too large to navigate (> ~200 lines).
You may not merge files, rename directories, or introduce new layers
without explicit developer instruction.

```
inndesk/
├── CLAUDE.md
├── WORKFLOW.md                      ← Developer's session discipline guide
├── README.md                        ← English. Full setup + deployment instructions.
├── .env.example
├── .gitignore
├── requirements.txt                 ← Pinned versions
│
├── database/
│   └── schema.sql                   ← Generated on first startup. Human-readable DDL.
│                                       For documentation and dossier — not for execution.
│
├── backend/
│   ├── main.py                      ← App factory, routers, StaticFiles, create_all,
│   │                                   schema.sql dump, CORS (none needed — same origin)
│   ├── seed.py                      ← Standalone script. Idempotent. French test data.
│   │
│   ├── core/
│   │   ├── __init__.py
│   │   ├── config.py                ← Pydantic BaseSettings reading from .env
│   │   ├── database.py              ← engine, SessionLocal, Base, get_db
│   │   └── security.py             ← JWT create/decode, bcrypt, get_current_user,
│   │                                   require_admin dependencies
│   │
│   ├── models/
│   │   ├── __init__.py              ← Import all models — required for create_all
│   │   ├── user.py
│   │   ├── room_type.py
│   │   ├── room.py
│   │   ├── client.py
│   │   ├── reservation.py
│   │   └── invoice.py
│   │
│   ├── schemas/                     ← Pydantic v2. Separate Create / Update / Response.
│   │   ├── __init__.py
│   │   ├── auth.py
│   │   ├── room.py
│   │   ├── client.py
│   │   ├── reservation.py
│   │   └── invoice.py
│   │
│   ├── api/
│   │   ├── __init__.py
│   │   └── v1/
│   │       ├── __init__.py
│   │       ├── auth.py
│   │       ├── rooms.py
│   │       ├── clients.py
│   │       ├── reservations.py
│   │       ├── housekeeping.py
│   │       ├── invoices.py
│   │       └── dashboard.py
│   │
│   ├── services/
│   │   ├── __init__.py
│   │   ├── reservation_service.py   ← Most important file. See Section 6.
│   │   ├── billing_service.py
│   │   └── housekeeping_service.py
│   │
│   └── tests/
│       ├── __init__.py
│       ├── conftest.py
│       └── test_reservations.py
│
└── frontend/
    ├── index.html                   ← Login
    ├── dashboard.html
    ├── planning.html
    ├── reservations.html
    ├── clients.html
    ├── housekeeping.html
    ├── invoices.html
    │
    ├── css/
    │   ├── base.css                 ← Reset, design tokens, typography, focus rules
    │   ├── components.css           ← Buttons, forms, cards, badges, tables, modals, toasts
    │   ├── layout.css               ← Sidebar, topbar, content area, responsive nav
    │   └── planning.css             ← Planning grid
    │
    └── js/
        ├── api.js                   ← All fetch calls. Split if > 250 lines.
        ├── auth.js                  ← Token storage, page protection, role checks
        ├── planning.js              ← Planning grid logic
        ├── dashboard.js
        ├── reservations.js
        ├── clients.js
        ├── housekeeping.js
        ├── invoices.js
        └── utils.js                 ← Date formatting, badges, toast, modal helpers
```

---

## 5. Database Schema

These 6 tables are the required minimum.
Do not add tables without a clear business justification that you state explicitly.
Use `NUMERIC(10,2)` for money. Never `FLOAT` for money.
All `TIMESTAMP` columns use `TIMESTAMP WITH TIME ZONE`.

### users
```sql
id            SERIAL PRIMARY KEY
email         VARCHAR(255) UNIQUE NOT NULL
password_hash VARCHAR(255) NOT NULL
full_name     VARCHAR(255) NOT NULL
role          VARCHAR(20) NOT NULL CHECK (role IN ('admin', 'receptionist'))
is_active     BOOLEAN DEFAULT TRUE NOT NULL
created_at    TIMESTAMP WITH TIME ZONE DEFAULT NOW()
```

### room_types
```sql
id              SERIAL PRIMARY KEY
name            VARCHAR(100) NOT NULL
description     TEXT
price_per_night NUMERIC(10,2) NOT NULL CHECK (price_per_night > 0)
max_occupancy   INTEGER NOT NULL CHECK (max_occupancy > 0)
```

### rooms
```sql
id           SERIAL PRIMARY KEY
number       VARCHAR(10) UNIQUE NOT NULL
floor        INTEGER NOT NULL
room_type_id INTEGER NOT NULL REFERENCES room_types(id)
status       VARCHAR(20) NOT NULL DEFAULT 'available'
             CHECK (status IN ('available','occupied','dirty','cleaning','maintenance'))
notes        TEXT
```

### clients
```sql
id               SERIAL PRIMARY KEY
first_name       VARCHAR(100) NOT NULL
last_name        VARCHAR(100) NOT NULL
email            VARCHAR(255) UNIQUE NOT NULL
phone            VARCHAR(30)
nationality      VARCHAR(100)
id_document      VARCHAR(100)
gdpr_consent     BOOLEAN NOT NULL DEFAULT FALSE
gdpr_consent_at  TIMESTAMP WITH TIME ZONE
created_at       TIMESTAMP WITH TIME ZONE DEFAULT NOW()
```

### reservations
```sql
id             SERIAL PRIMARY KEY
client_id      INTEGER NOT NULL REFERENCES clients(id)
room_id        INTEGER NOT NULL REFERENCES rooms(id)
created_by     INTEGER NOT NULL REFERENCES users(id)
check_in_date  DATE NOT NULL
check_out_date DATE NOT NULL
status         VARCHAR(20) NOT NULL DEFAULT 'confirmed'
               CHECK (status IN ('confirmed','checked_in','checked_out','cancelled','no_show'))
adults         INTEGER NOT NULL DEFAULT 1 CHECK (adults > 0)
children       INTEGER NOT NULL DEFAULT 0 CHECK (children >= 0)
notes          TEXT
total_amount   NUMERIC(10,2)
created_at     TIMESTAMP WITH TIME ZONE DEFAULT NOW()
updated_at     TIMESTAMP WITH TIME ZONE DEFAULT NOW()
CONSTRAINT chk_dates CHECK (check_out_date > check_in_date)
```

### invoices
```sql
id             SERIAL PRIMARY KEY
reservation_id INTEGER NOT NULL UNIQUE REFERENCES reservations(id)
nights_count   INTEGER NOT NULL CHECK (nights_count > 0)
room_rate      NUMERIC(10,2) NOT NULL
total_amount   NUMERIC(10,2) NOT NULL
payment_method VARCHAR(50) DEFAULT 'TPE'
payment_status VARCHAR(20) NOT NULL DEFAULT 'pending'
               CHECK (payment_status IN ('pending', 'paid'))
paid_at        TIMESTAMP WITH TIME ZONE
notes          TEXT
created_at     TIMESTAMP WITH TIME ZONE DEFAULT NOW()
```

---

## 6. Critical Business Logic

### reservation_service.py

This is the most examined file. Write it to be read aloud, not just executed.

#### Availability check — the core algorithm
```python
def check_availability(
    db: Session,
    room_id: int,
    check_in: date,
    check_out: date,
    exclude_reservation_id: int | None = None
) -> bool:
    """
    Returns True if the room is available for the given date range.

    Two reservations overlap when:
        existing.check_in_date  < new check_out
        AND existing.check_out_date > new check_in
    This single condition handles all overlap cases:
    partial overlap, full containment, and identical dates.
    """
    query = db.query(Reservation).filter(
        Reservation.room_id == room_id,
        Reservation.status.notin_(["cancelled", "no_show"]),
        Reservation.check_in_date < check_out,
        Reservation.check_out_date > check_in,
    )
    if exclude_reservation_id:
        # Allow modifying a reservation without conflicting with itself
        query = query.filter(Reservation.id != exclude_reservation_id)

    return query.first() is None
```

#### Atomic operations — commit or rollback, never partial
These operations touch multiple tables and must succeed or fail together:

| Operation | Tables modified |
|---|---|
| Create reservation | reservations + invoices |
| Check-in | reservations.status + rooms.status |
| Check-out | reservations.status + rooms.status + invoices (finalize) |
| Cancel | reservations.status + rooms.status (if was checked_in) |

```python
# Standard pattern for every service function:
def create_reservation(db: Session, data: ReservationCreate, user_id: int):
    try:
        # 1. Validate business rules first
        if not check_availability(db, data.room_id, data.check_in_date, data.check_out_date):
            raise HTTPException(status_code=409,
                detail="Cette chambre est déjà réservée pour ces dates.")

        # 2. Create all objects
        reservation = Reservation(**data.model_dump(), created_by=user_id)
        db.add(reservation)
        db.flush()  # get reservation.id without committing

        invoice = billing_service.create_invoice(db, reservation)
        db.add(invoice)

        # 3. Single commit
        db.commit()
        db.refresh(reservation)
        return reservation

    except HTTPException:
        db.rollback()
        raise
    except Exception:
        db.rollback()
        raise
```

#### billing_service.py
```python
def calculate_total(check_in: date, check_out: date, price_per_night: Decimal) -> Decimal:
    # (check_out - check_in).days is always positive — guaranteed by DB constraint
    nights = (check_out - check_in).days
    return Decimal(nights) * price_per_night
```

#### Room status state machine
```
[available] ---(check-in)-----------> [occupied]
[occupied]  ---(check-out)----------> [dirty]
[dirty]     ---(staff marks clean)--> [available]
[any]       ---(admin: maintenance)-> [maintenance]
[maintenance]---(admin: resolved)---> [available]
```
Room status and reservation status are independent values.
They are synchronized within the same transaction at check-in and check-out.

#### GDPR enforcement in clients.py route
```python
if not data.gdpr_consent:
    raise HTTPException(status_code=400,
        detail="Le consentement RGPD est obligatoire pour créer une fiche client.")
client.gdpr_consent_at = datetime.now(timezone.utc)
```

#### Client deletion protection
```python
# Block deletion if client has any active reservation
active_statuses = ["confirmed", "checked_in"]
has_active = db.query(Reservation).filter(
    Reservation.client_id == client_id,
    Reservation.status.in_(active_statuses)
).first()
if has_active:
    raise HTTPException(status_code=409,
        detail="Impossible de supprimer un client avec des réservations actives.")
```

---

## 7. Authentication & Authorization

### JWT configuration
```python
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_HOURS = 8  # one hotel shift

# Token payload:
# { "sub": user.email, "user_id": user.id, "role": user.role, "exp": ... }
```

### Route protection
```python
# Two reusable FastAPI dependencies in core/security.py:
get_current_user    # valid JWT required — returns User object
require_admin       # valid JWT + role == "admin" — raises 403 otherwise
```

### Admin-only routes
POST /auth/register, POST+DELETE /rooms, POST /room-types,
PATCH /housekeeping/{id} for maintenance status, DELETE /clients/{id}

### Datetime rules
```python
# Always timezone-aware:
datetime.now(timezone.utc)     # correct
datetime.utcnow()              # forbidden — deprecated in Python 3.12

# Business dates are plain DATE — no timezone needed:
check_in_date: date
check_out_date: date

# API responses serialize datetimes to ISO 8601 with UTC offset:
# "2026-05-25T10:30:00+00:00"
```

---

## 8. API Contracts

### Standard response shapes
```python
# Success list:    list[XxxResponse]
# Success single:  XxxResponse
# Error:           {"detail": "Message in French for end-user errors"}
# HTTP codes:
#   200 GET/PATCH success
#   201 POST success
#   204 DELETE success
#   400 Validation / GDPR not consented
#   401 Missing or invalid JWT
#   403 Insufficient role
#   404 Resource not found
#   409 Double booking / active reservation blocks action
#   422 Pydantic validation failure (FastAPI automatic)
```

### Pagination — all list endpoints
```python
# Query params: ?limit=50&offset=0
# Default limit: 50 — max limit: 100
# Validate: raise 400 if limit > 100 or offset < 0
```

### Endpoints
```
# Auth
POST  /api/v1/auth/login           {email, password} → {access_token, token_type, user}
POST  /api/v1/auth/register        [admin] → UserResponse
GET   /api/v1/auth/me              → UserResponse

# Rooms
GET   /api/v1/rooms                → list[RoomResponse]
GET   /api/v1/rooms/{id}           → RoomResponse
POST  /api/v1/rooms                [admin]
PATCH /api/v1/rooms/{id}           [admin]
GET   /api/v1/rooms/types          → list[RoomTypeResponse]
POST  /api/v1/rooms/types          [admin]

# Clients
GET   /api/v1/clients              → list[ClientListResponse]   ← no id_document
GET   /api/v1/clients/{id}         → ClientDetailResponse       ← includes id_document
POST  /api/v1/clients              → ClientDetailResponse
PATCH /api/v1/clients/{id}
DELETE /api/v1/clients/{id}        [admin] → 204 or 409
GET   /api/v1/clients/{id}/reservations → list[ReservationResponse]

# Reservations
GET   /api/v1/reservations         ?start=&end=&status=&room_id=&client_id=
GET   /api/v1/reservations/{id}
POST  /api/v1/reservations
PATCH /api/v1/reservations/{id}    ← re-runs availability if dates or room change
POST  /api/v1/reservations/{id}/checkin
POST  /api/v1/reservations/{id}/checkout
POST  /api/v1/reservations/{id}/cancel

# Housekeeping
GET   /api/v1/housekeeping         → rooms grouped by floor
PATCH /api/v1/housekeeping/{id}    {status}

# Invoices
GET   /api/v1/invoices/{reservation_id}
PATCH /api/v1/invoices/{id}/pay    {notes} → records TPE payment

# Dashboard
GET   /api/v1/dashboard → {
    occupancy_rate, arrivals_today, departures_today,
    rooms_available, rooms_dirty, revenue_today,
    upcoming_arrivals[5], upcoming_departures[5]
}
```

---

## 9. Frontend Architecture

### Same-origin serving (no CORS required)
```python
# main.py
app.mount("/app", StaticFiles(directory="frontend", html=True), name="frontend")

@app.get("/")
def root():
    return RedirectResponse(url="/app/index.html")
```

### api.js — all fetch calls live here
No other file may call `fetch()` directly.
Keep each domain group clearly separated.
If the file exceeds 250 lines, split into `api/auth.js`, `api/rooms.js`, etc.,
and re-export everything from `api/index.js`.

```javascript
const API_BASE = '/api/v1';

async function request(method, endpoint, body = null) {
    const token = localStorage.getItem('inndesk_token');
    const options = {
        method,
        headers: {
            'Content-Type': 'application/json',
            ...(token && { 'Authorization': `Bearer ${token}` })
        },
        ...(body !== null && { body: JSON.stringify(body) })
    };

    const response = await fetch(`${API_BASE}${endpoint}`, options);

    // Redirect to login on any 401 — centralized here, not in individual pages
    if (response.status === 401) {
        localStorage.removeItem('inndesk_token');
        localStorage.removeItem('inndesk_user');
        window.location.href = '/app/index.html';
        return;
    }

    if (!response.ok) {
        const error = await response.json().catch(() => ({ detail: 'Erreur réseau' }));
        throw { status: response.status, detail: error.detail };
    }

    if (response.status === 204) return null;
    return response.json();
}

export const authAPI = { ... };
export const roomsAPI = { ... };
export const clientsAPI = { ... };
export const reservationsAPI = { ... };
export const housekeepingAPI = { ... };
export const invoicesAPI = { ... };
export const dashboardAPI = { ... };
```

### auth.js — token management
```javascript
// Storage keys — never use different key names elsewhere
const TOKEN_KEY = 'inndesk_token';
const USER_KEY  = 'inndesk_user';

export function saveAuth(token, user) { ... }
export function getToken() { ... }
export function getCurrentUser() { ... }  // parses JSON from localStorage
export function logout() { ... }          // clears both keys, redirects to login

// Call at top of every protected page script
export function redirectIfNotAuth() {
    if (!localStorage.getItem(TOKEN_KEY)) {
        window.location.href = '/app/index.html';
    }
}

// Call on admin-only pages
export function requireRole(role) {
    const user = getCurrentUser();
    if (!user || user.role !== role) window.location.href = '/app/dashboard.html';
}
```

### utils.js — shared helpers only
Keep this file focused. Do not accumulate unrelated logic here.
```javascript
export function formatDate(iso) { ... }       // "26/05/2026"
export function formatDateTime(iso) { ... }   // "26/05/2026 14:30"
export function nightsCount(in, out) { ... }  // integer

export function statusBadge(status) {
    // Returns <span class="badge badge--{status}">{French label}</span>
    // Color is NEVER the only indicator — always paired with text
}

export function showToast(message, type = 'info') { ... }  // info | success | error
export function openModal(id) { ... }
export function closeModal(id) { ... }
export function showFieldError(fieldId, message) { ... }
export function clearFieldErrors(formId) { ... }
```

### Every protected page script starts with:
```javascript
import { redirectIfNotAuth } from './auth.js';
redirectIfNotAuth();
```

---

## 10. Planning Grid

Do not use FullCalendar or any calendar library.
Build a custom grid — it is simpler to build and far simpler to explain to the examiner.

```
Layout:
  Rows    = rooms, sorted by floor then number
  Columns = 14 days from selected start date (default: today)
  Cells   = empty or reservation block

Reservation block:
  - Background color = reservation status color (from CSS custom properties)
  - Text = client last name, truncated
  - Click → open reservation detail popover

Empty cell:
  - Click → open new reservation modal, pre-filled with room_id + date

Navigation:
  [← Prev week] [date range label] [Next week →]
  Shifts the 14-day window by 7 days
  Re-fetches only the new window from reservationsAPI

Accessibility:
  role="grid" on container
  role="row" on each room row
  role="gridcell" on each cell
  aria-label on each reservation block: "{client name}, {room}, {check-in} to {check-out}"
```

---

## 11. CSS System

### Design tokens (base.css)
```css
:root {
  /* Brand */
  --color-primary:        #1a5f7a;
  --color-primary-hover:  #14496b;
  --color-primary-light:  #e8f4f8;

  /* Status — used in planning, badges, housekeeping. Color always paired with text. */
  --color-available:    #22c55e;
  --color-occupied:     #3b82f6;
  --color-dirty:        #f97316;
  --color-cleaning:     #a855f7;
  --color-maintenance:  #ef4444;
  --color-confirmed:    #60a5fa;
  --color-checked-in:   #22c55e;
  --color-checked-out:  #94a3b8;
  --color-cancelled:    #f87171;

  /* Neutrals */
  --color-bg:           #f1f5f9;
  --color-surface:      #ffffff;
  --color-border:       #e2e8f0;
  --color-text:         #1e293b;
  --color-text-muted:   #64748b;

  /* Spacing (4px base grid) */
  --space-1: 0.25rem; --space-2: 0.5rem;  --space-3: 0.75rem;
  --space-4: 1rem;    --space-6: 1.5rem;  --space-8: 2rem;

  /* Type */
  --font-body: 'Inter', system-ui, sans-serif;
  --text-sm:   0.875rem;  /* minimum — never go below */
  --text-base: 1rem;
  --text-lg:   1.125rem;
  --text-xl:   1.25rem;
  --text-2xl:  1.5rem;

  /* Radii / Shadows */
  --radius-sm: 0.25rem; --radius-md: 0.5rem; --radius-lg: 0.75rem;
  --shadow-sm: 0 1px 3px rgba(0,0,0,0.08);
  --shadow-md: 0 4px 12px rgba(0,0,0,0.10);
}
```

### Mobile-first — hard rule
Base styles target screens < 768px.
Desktop enhancements use `@media (min-width: 768px)`.
Sidebar becomes bottom navigation on mobile.
Wide tables use `overflow-x: auto` — never break layout.
Touch targets minimum 44×44px.

### Accessibility rules (RGAA — examiner will check)
```
✓ <label for="id"> on every <input> and <select> — no exceptions
✓ aria-label on every icon-only button
✓ Color never the only status indicator — always pair with text or icon
✓ :focus-visible outline always visible — never outline: none without replacement
✓ WCAG AA contrast: 4.5:1 for body text, 3:1 for large text and UI components
✓ <html lang="fr"> on all pages
✓ Semantic elements only — no <div> where <button>, <nav>, <main>, etc. exist
✓ role="alert" on all error messages
✓ Planning grid uses role="grid", "row", "gridcell", aria-label on events
```

---

## 12. Tests (backend/tests/)

Exactly 5 tests. Focused on critical business logic. No more needed for RNCP 5.

```python
# conftest.py
# - In-memory SQLite for test isolation (only exception to the PostgreSQL rule)
# - Fixtures: db session, async test client (httpx), admin_headers, receptionist_headers
# - Minimal seed: 1 room_type, 2 rooms, 2 users, 2 clients

# test_reservations.py — the 5 tests:

def test_create_reservation_success():
    """Valid reservation creates both a reservation and an invoice."""

def test_double_booking_rejected():
    """Overlapping reservation on same room returns HTTP 409."""

def test_login_wrong_password():
    """Wrong credentials return HTTP 401."""

def test_protected_route_without_token():
    """Request without JWT returns HTTP 401."""

def test_billing_calculation():
    """3 nights × 95.00€ = 285.00€ on the invoice."""
```

---

## 13. Seed Data (backend/seed.py)

Idempotent — get-or-create pattern throughout. Running twice changes nothing.

```
Users (2):
  admin@inndesk.com     / admin123  / Admin
  reception@inndesk.com / reception123  / Receptionist

Room types (3):
  Simple  65.00€/night  max 1
  Double  95.00€/night  max 2
  Suite  180.00€/night  max 4

Rooms (12):
  Floor 1: 101 102 103 104 (Simple), 105 106 (Double)
  Floor 2: 201 202 (Double), 203 204 (Suite)
  Floor 3: 301 302 303 304 (Simple)

Clients (15):
  French names. Realistic emails. gdpr_consent=True. Varied nationalities.

Reservations (20):
  Spread: -7 days to +14 days from today
  Statuses: 4 checked_out, 3 checked_in, 8 confirmed, 3 cancelled, 2 no_show

Rooms post-seed:
  Checked-in rooms   → status = 'occupied'
  Checked-out rooms  → status = 'dirty'
  Others             → status = 'available'

Invoices:
  All reservations have an invoice.
  checked_out → payment_status='paid', paid_at set
  others      → payment_status='pending'
```

---

## 14. Docker — Phase 2 Only

Do not generate Docker files until explicitly asked.
When asked, generate:

```yaml
# docker-compose.yml
version: '3.9'
services:
  db:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: inndesk
      POSTGRES_USER: inndesk
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
    ports: ["5432:5432"]
    volumes: [postgres_data:/var/lib/postgresql/data]

  api:
    build: .
    ports: ["8000:8000"]
    environment:
      DATABASE_URL: postgresql://inndesk:${POSTGRES_PASSWORD}@db:5432/inndesk
      JWT_SECRET: ${JWT_SECRET}
    depends_on: [db]
    command: uvicorn backend.main:app --host 0.0.0.0 --port 8000

volumes:
  postgres_data:
```

```dockerfile
FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
EXPOSE 8000
CMD ["uvicorn", "backend.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

---

## 15. Definition of Done

The project is complete when the developer can run through all 9 scenarios
with real seed data, no errors, in under 10 minutes:

1. `http://localhost:8000` → login page loads
2. Login as admin@inndesk.com → dashboard shows today's stats
3. Create a new client with GDPR consent checkbox → client saved
4. Create a reservation → invoice auto-created, total correct
5. Attempt conflicting reservation same room/dates → HTTP 409, French error message
6. Check-in → room status becomes "occupied" in housekeeping view
7. Check-out → room status becomes "dirty", invoice finalized
8. Record TPE payment → invoice status becomes "paid"
9. Planning view → 14-day grid with color-coded reservations, navigation works

Every line of code should exist to serve one of these 9 scenarios.
If a piece of code serves none of them, question whether it belongs.
